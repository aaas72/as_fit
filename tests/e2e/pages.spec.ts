import { expect, test } from '@playwright/test';

// Visual smoke test: every page renders without console errors or horizontal overflow, at desktop and phone width.
// Screenshots land in test-results/screens for review. Runs after flows.spec.ts so pages have data.
const PAGES = ['/', '/log/meals', '/log/beverages', '/log/activity', '/log/screen', '/log/sleep', '/weigh-in', '/measurements', '/trends', '/insights', '/foods', '/drinks', '/settings'];
const VIEWPORTS = [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'phone', width: 390, height: 844 }];

for (const vp of VIEWPORTS) {
  test(`all pages render cleanly (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows horizontally at ${vp.width}px`).toBeLessThanOrEqual(0);
      const name = path === '/' ? 'dashboard' : path.slice(1).replaceAll('/', '-');
      await page.screenshot({ path: `test-results/screens/${vp.name}-${name}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
