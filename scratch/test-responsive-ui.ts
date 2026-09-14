import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\kamle\\.gemini\\antigravity-ide\\brain\\c7b928d3-c9e7-4530-88ef-a752fdd01227';

async function runVisualTests() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/#ai-content', { waitUntil: 'networkidle' });

  const aiContentLink = page.locator('a[href="/#ai-content"]');
  if (await aiContentLink.isVisible()) {
    await aiContentLink.click();
    await page.waitForTimeout(300);
  }

  const profileSelect = page.locator('select').first();
  await profileSelect.selectOption('adult');

  const topicInput = page.locator('input[placeholder*="Pro Runner"]');
  await topicInput.fill('Body-Safe Silicone Adult Novelties Guide');

  const kwInput = page.locator('input[placeholder*="running shoes for beginners"]');
  await kwInput.fill('body-safe adult novelties');

  const presetBtn = page.locator('button:has-text("100w")');
  if (await presetBtn.isVisible()) await presetBtn.click();

  const generateBtn = page.locator('button:has-text("Generate SEO Content Package")');
  await generateBtn.click();

  await page.waitForResponse(
    (resp) => resp.url().includes('/api/ai-seo/content/generate') && resp.status() === 200,
    { timeout: 90000 }
  );
  await page.waitForTimeout(800);

  // Capture Mobile Scrolled to Results
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('.ai-generator-right-panel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'responsive_mobile_results_375x667.png') });

  // Switch to Content Tab on mobile
  const contentTab = page.locator('button:has-text("Generated Content")');
  if (await contentTab.isVisible()) {
    await contentTab.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'responsive_mobile_content_tab_375x667.png') });
  }

  // Capture Tablet Scrolled to Results
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.locator('.ai-generator-right-panel').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'responsive_tablet_results_768x1024.png') });

  await browser.close();
  console.log('[SUCCESS] Captured mobile and tablet results views.');
}

runVisualTests().catch(console.error);
