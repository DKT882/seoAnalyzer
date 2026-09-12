import 'server-only';
import { chromium, Browser, BrowserContext } from 'playwright';
import { validateHostnameSsrf } from '../utils/ssrfGuard';
import { validateAndNormalizeUrl } from '../utils/urlUtils';
import { config } from '../config';
import { BrowserPerformanceMetrics, BrowserRenderResult } from '@/types';
import { logger } from '../utils/logger';

export interface RenderPageOptions {
  timeoutMs?: number;
  waitForSelector?: string;
  userAgent?: string;
}

// Global browser instance management with concurrency semaphore control
let sharedBrowser: Browser | null = null;
let activeContexts = 0;
let browserIdleTimer: NodeJS.Timeout | null = null;

export const MAX_CONCURRENT_CONTEXTS = 3;
export const MAX_RENDER_QUEUE_SIZE = 20;

type QueueResolver = () => void;
const renderQueue: QueueResolver[] = [];

/**
 * Returns the current count of active browser contexts.
 */
export function getActiveContextsCount(): number {
  return activeContexts;
}

/**
 * Returns the current count of requests waiting in the concurrency queue.
 */
export function getRenderQueueLength(): number {
  return renderQueue.length;
}

/**
 * Acquires a slot in the concurrency semaphore, queueing if currently at capacity.
 */
async function acquireContextSlot(): Promise<void> {
  if (activeContexts < MAX_CONCURRENT_CONTEXTS) {
    activeContexts++;
    return;
  }

  if (renderQueue.length >= MAX_RENDER_QUEUE_SIZE) {
    throw new Error(
      'CONCURRENCY_LIMIT_EXCEEDED: Server browser rendering capacity exceeded. Maximum queue depth reached.'
    );
  }

  return new Promise<void>((resolve) => {
    renderQueue.push(() => {
      activeContexts++;
      resolve();
    });
  });
}

/**
 * Releases a concurrency slot and immediately dispatches the next queued request in FIFO order.
 */
function releaseContextSlot(): void {
  activeContexts = Math.max(0, activeContexts - 1);
  if (renderQueue.length > 0) {
    const next = renderQueue.shift();
    if (next) {
      next();
    }
  } else {
    scheduleBrowserIdleClose();
  }
}

function scheduleBrowserIdleClose() {
  if (browserIdleTimer) clearTimeout(browserIdleTimer);
  browserIdleTimer = setTimeout(async () => {
    if (activeContexts === 0 && renderQueue.length === 0 && sharedBrowser) {
      try {
        await sharedBrowser.close();
      } catch {}
      sharedBrowser = null;
    }
  }, 1000);
  if (typeof browserIdleTimer.unref === 'function') {
    browserIdleTimer.unref();
  }
}

/**
 * Gets or initializes a shared headless Chromium browser instance.
 */
async function getBrowser(): Promise<Browser> {
  if (browserIdleTimer) {
    clearTimeout(browserIdleTimer);
    browserIdleTimer = null;
  }

  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    logger.info('[BrowserRenderer] Launching new Chromium browser instance...');
    sharedBrowser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ],
    });
  }
  return sharedBrowser;
}

/**
 * Checks whether Playwright and Chromium are available in the current environment.
 */
export async function isPlaywrightAvailable(): Promise<boolean> {
  try {
    const browser = await getBrowser();
    const available = Boolean(browser && browser.isConnected());
    scheduleBrowserIdleClose();
    return available;
  } catch {
    return false;
  }
}

/**
 * Safely renders a public webpage using Playwright/Chromium with SSRF protection,
 * bounded timeouts, isolated ephemeral contexts, and synthetic performance telemetry.
 */
export async function renderPageWithBrowser(
  targetUrl: string,
  options: RenderPageOptions = {}
): Promise<BrowserRenderResult> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const userAgent = options.userAgent ?? config.crawlerUserAgent;
  const startTime = Date.now();

  // 1. Initial URL validation
  const urlValidation = validateAndNormalizeUrl(targetUrl);
  if (!urlValidation.isValid || !urlValidation.parsedUrl) {
    return {
      success: false,
      errorCode: 'INVALID_URL',
      error: `Invalid URL format: ${urlValidation.error || 'Cannot parse URL'}`,
    };
  }

  const parsedUrl = urlValidation.parsedUrl;

  // 2. Strict SSRF check before opening browser
  const ssrfCheck = await validateHostnameSsrf(parsedUrl.hostname);
  if (!ssrfCheck.isSafe) {
    logger.warn(`[BrowserRenderer] SSRF check blocked target: ${parsedUrl.hostname} (${ssrfCheck.reason})`);
    return {
      success: false,
      errorCode: 'SSRF_BLOCKED',
      error: `SSRF Protection Blocked: The target address is within a private, loopback, or reserved network range (${ssrfCheck.reason})`,
    };
  }

  // 3. Acquire concurrency slot (bounded to MAX_CONCURRENT_CONTEXTS)
  let slotAcquired = false;
  let context: BrowserContext | null = null;

  try {
    await acquireContextSlot();
    slotAcquired = true;

    const browser = await getBrowser();

    // 4. Create isolated, ephemeral browser context (ensures zero cross-request cookie/storage leakage)
    context = await browser.newContext({
      userAgent,
      viewport: { width: 1280, height: 800 },
      ignoreHTTPSErrors: false,
      javaScriptEnabled: true,
      bypassCSP: false,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);

    // 5. SSRF & Protocol Route Guard on all outgoing network requests / subresources
    await context.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      try {
        // Allow harmless inline data/blob URLs (e.g. data:image/..., blob:...) without network egress
        if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:')) {
          return route.continue();
        }

        const reqParsed = new URL(requestUrl);
        const protocol = reqParsed.protocol.toLowerCase();

        // Strictly disallow non-http/https protocols (file:, javascript:, chrome:, devtools:, ws:, wss:, ftp:)
        if (!['http:', 'https:'].includes(protocol)) {
          logger.warn(`[BrowserRenderer] Blocked unsafe protocol request: ${requestUrl}`);
          return route.abort('blockedbyclient');
        }

        // Validate destination hostname for SSRF
        const reqSsrf = await validateHostnameSsrf(reqParsed.hostname);
        if (!reqSsrf.isSafe) {
          logger.warn(`[BrowserRenderer] Blocked SSRF subrequest to ${reqParsed.hostname} (${reqSsrf.reason})`);
          return route.abort('blockedbyclient');
        }

        return route.continue();
      } catch {
        return route.abort('blockedbyclient');
      }
    });

    let statusCode = 200;
    let finalUrl = targetUrl;

    // 6. Navigate to target URL
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });

    if (response) {
      statusCode = response.status();
      finalUrl = response.url();
    }

    // Allow a brief stabilization window for hydration/SPA render
    try {
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 2000 });
      } else {
        await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {
          // Networkidle timeout is non-fatal; proceed with DOM state at domcontentloaded
        });
      }
    } catch {
      // Non-fatal stabilization timeout
    }

    // 7. Collect Rendered HTML and Synthetic Performance Telemetry
    const renderedHtml = await page.content();

    // Collect synthetic browser timing metrics via Performance Navigation Timing
    const performanceMetrics: BrowserPerformanceMetrics = await page
      .evaluate(() => {
        try {
          const navEntries = window.performance.getEntriesByType('navigation');
          if (navEntries.length > 0) {
            const nav = navEntries[0] as PerformanceNavigationTiming;
            return {
              syntheticMeasurement: true as const,
              navigationTimingMs: Math.round(nav.duration || 0),
              domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime || 0),
              loadEventMs: Math.round(nav.loadEventEnd - nav.startTime || 0),
              syntheticLcpMs: 'NOT_MEASURED' as const,
              syntheticClsScore: 'NOT_MEASURED' as const,
              cruxNotice:
                'Synthetic single-run browser measurement. This is not Google Chrome User Experience (CrUX) field data.',
            };
          }
        } catch {
          // Ignore evaluation errors
        }
        return {
          syntheticMeasurement: true as const,
          syntheticLcpMs: 'NOT_MEASURED' as const,
          syntheticClsScore: 'NOT_MEASURED' as const,
          cruxNotice:
            'Synthetic single-run browser measurement. This is not Google Chrome User Experience (CrUX) field data.',
        };
      })
      .catch(() => ({
        syntheticMeasurement: true as const,
        syntheticLcpMs: 'NOT_MEASURED' as const,
        syntheticClsScore: 'NOT_MEASURED' as const,
        cruxNotice:
          'Synthetic single-run browser measurement. This is not Google Chrome User Experience (CrUX) field data.',
      }));

    const renderDurationMs = Date.now() - startTime;
    logger.info(
      `[BrowserRenderer] Successfully rendered "${targetUrl}" in ${renderDurationMs}ms (HTTP ${statusCode})`
    );

    return {
      success: true,
      html: renderedHtml,
      finalUrl,
      statusCode,
      performance: performanceMetrics,
      renderDurationMs,
    };
  } catch (err: any) {
    const renderDurationMs = Date.now() - startTime;
    const rawError = err?.message || String(err);
    const sanitizedError = rawError
      .replace(/[a-zA-Z]:\\[^:\n\r]+/g, '[redacted_path]')
      .replace(/\/home\/[^:\n\r]+/g, '[redacted_path]')
      .replace(/\/var\/[^:\n\r]+/g, '[redacted_path]');

    logger.warn(
      `[BrowserRenderer] Browser rendering failed for "${targetUrl}" after ${renderDurationMs}ms: ${sanitizedError}`
    );

    let errorCode = 'BROWSER_RENDER_FAILED';
    if (sanitizedError.includes('Timeout') || sanitizedError.includes('timed out')) {
      errorCode = 'BROWSER_TIMEOUT';
    } else if (sanitizedError.includes('SSRF') || sanitizedError.includes('blockedbyclient')) {
      errorCode = 'SSRF_BLOCKED';
    } else if (sanitizedError.includes('CONCURRENCY_LIMIT_EXCEEDED')) {
      errorCode = 'CONCURRENCY_LIMIT_REACHED';
    }

    return {
      success: false,
      errorCode,
      error: `Browser rendering failed: ${sanitizedError}`,
      renderDurationMs,
    };
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore context close errors
      }
    }
    if (slotAcquired) {
      releaseContextSlot();
    }
  }
}

/**
 * Gracefully shuts down the shared browser instance on process termination.
 */
export async function closeSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch {
      // Ignore
    } finally {
      sharedBrowser = null;
    }
  }
}
