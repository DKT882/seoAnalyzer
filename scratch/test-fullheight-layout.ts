import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\kamle\\OneDrive\\Desktop\\KeywordExtractor\\..\\..\\..\\.gemini\\antigravity-ide\\brain\\c7b928d3-c9e7-4530-88ef-a752fdd01227';
const ABS_ARTIFACTS_DIR = path.resolve('C:\\Users\\kamle\\.gemini\\antigravity-ide\\brain\\c7b928d3-c9e7-4530-88ef-a752fdd01227');

async function testFullHeightLayoutAndNewCategories() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/#ai-content', { waitUntil: 'networkidle' });

  const aiContentLink = page.locator('a[href="/#ai-content"]');
  if (await aiContentLink.isVisible()) {
    await aiContentLink.click();
    await page.waitForTimeout(400);
  }

  // 1. Select Adult Profile
  const profileSelect = page.locator('select').first();
  await profileSelect.selectOption('adult');
  await page.waitForTimeout(300);

  // 2. Expand Advanced Controls to make the form tall
  const advancedBtn = page.locator('button:has-text("Advanced Strategic Inputs")');
  if (await advancedBtn.isVisible()) {
    await advancedBtn.click();
    await page.waitForTimeout(300);
  }

  // 3. Inspect left panel computed styles and scroll metrics
  const panelMetrics = await page.evaluate(() => {
    const el = document.querySelector('.ai-generator-left-panel') as HTMLElement;
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    return {
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      offsetHeight: el.offsetHeight,
      overflowY: computed.overflowY,
      position: computed.position,
      maxHeight: computed.maxHeight,
      hasInternalScrollbar: el.scrollHeight > el.clientHeight && (computed.overflowY === 'auto' || computed.overflowY === 'scroll'),
    };
  });

  console.log('Left Panel Metrics:', JSON.stringify(panelMetrics, null, 2));

  // 4. Verify Adult Subprofiles dropdown options
  const subprofileOptions = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const adultSubSelect = selects[1];
    if (!adultSubSelect) return [];
    return Array.from(adultSubSelect.options).map((opt) => ({
      value: opt.value,
      text: opt.text,
    }));
  });

  console.log('Adult Subprofile Options:', JSON.stringify(subprofileOptions, null, 2));

  // Screenshot of the full-height Generation Parameters panel with Adult profile & Advanced controls expanded
  await page.screenshot({
    path: path.join(ABS_ARTIFACTS_DIR, 'full_height_parameters_panel_desktop.png'),
    fullPage: true,
  });

  // 5. Test Selecting "Call Girl & Escort Services"
  const adultSubSelect = page.locator('select').nth(1);
  await adultSubSelect.selectOption('escort-services');
  await page.waitForTimeout(200);

  const topicInput = page.locator('input[placeholder*="Pro Runner"]');
  await topicInput.fill('VIP Social Companionship & Dinner Accompaniment Directory');

  const kwInput = page.locator('input[placeholder*="running shoes for beginners"]');
  await kwInput.fill('vip companion escort service guide');

  const presetBtn = page.locator('button:has-text("100w")');
  if (await presetBtn.isVisible()) await presetBtn.click();

  console.log('Generating content for Call Girl & Escort Services...');
  const generateBtn = page.locator('button:has-text("Generate SEO Content Package")');
  await generateBtn.click();

  await page.waitForResponse(
    (resp) => resp.url().includes('/api/ai-seo/content/generate') && resp.status() === 200,
    { timeout: 90000 }
  );
  await page.waitForTimeout(1000);

  // Take screenshot of generated results for Escort Services
  await page.screenshot({
    path: path.join(ABS_ARTIFACTS_DIR, 'escort_services_generated_results.png'),
    fullPage: false,
  });

  // Switch to Content Tab
  const contentTab = page.locator('button:has-text("Generated Content")');
  if (await contentTab.isVisible()) {
    await contentTab.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ABS_ARTIFACTS_DIR, 'escort_services_content_tab.png'),
    });
  }

  // 6. Test Adult Stories Subprofile
  console.log('Testing Adult Stories category...');
  await adultSubSelect.selectOption('adult-stories');
  await topicInput.fill('Sensual Romance Novel Chapter: Midnight Rendezvous');
  await kwInput.fill('sensual romance stories chapter');

  await generateBtn.click();
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/ai-seo/content/generate') && resp.status() === 200,
    { timeout: 90000 }
  );
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(ABS_ARTIFACTS_DIR, 'adult_stories_generated_results.png'),
    fullPage: false,
  });

  if (await contentTab.isVisible()) {
    await contentTab.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ABS_ARTIFACTS_DIR, 'adult_stories_content_tab.png'),
    });
  }

  console.log('All Playwright UI tests completed successfully!');
  await browser.close();
}

testFullHeightLayoutAndNewCategories().catch((err) => {
  console.error('Playwright Test Failed:', err);
  process.exit(1);
});
