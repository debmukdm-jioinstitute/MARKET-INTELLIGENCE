import { test, expect } from '@playwright/test';

const CHART_ROUTES = [
  '/Home',
  '/markets/india',
  '/markets/breadth',
  '/markets/derivatives',
  '/macro/global',
  '/macro/currency',
  '/macro/stress',
  '/macro/yields',
  '/valuation',
  '/activity',
  '/indicators/us10y',
  '/indicators/nifty50_pe',
  '/data/status',
  '/funds',
  '/fear-and-greed',
  '/macro',
  '/macro/india',
  '/macro/rbi',
  '/intelligence/credit',
  '/intelligence/institutional',
  '/intelligence/promoters',
  '/leverage',
  '/leverage/mtf',
  '/research/ipo',
];

for (const route of CHART_ROUTES) {
  test(`route ${route} loads cleanly without horizontal overflow`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore non-fatal third-party analytics / favicon drops
        if (!text.includes('favicon.ico') && !text.includes('googletagmanager')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBe(200);

    // Wait for client chart hydration / fetch
    await page.waitForTimeout(2000);

    // If route contains .ts-chart, verify svg path or fallback
    const chartLocator = page.locator('.ts-chart');
    const chartCount = await chartLocator.count();
    if (chartCount > 0) {
      const paths = page.locator('.ts-chart svg path, .ts-chart svg rect, .ts-chart svg line');
      const emptyState = page.getByText(/Source unavailable/i);
      const hasShape = (await paths.count()) > 0;
      const hasEmpty = (await emptyState.count()) > 0;
      expect(hasShape || hasEmpty).toBe(true);
    }

    // Verify responsiveness: scrollWidth <= innerWidth
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBe(false);

    // Verify zero fatal page errors
    expect(pageErrors).toHaveLength(0);
  });
}
