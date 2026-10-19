import { test, type Page } from '@playwright/test';

// Visual review of interactive states (open pickers, inline forms, filled rows) at desktop and phone width.
// Runs after flows.spec.ts so the dictionary and drink list have data. Screenshots: test-results/states.
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/states/${name}.png`, fullPage: false });

for (const vp of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'phone', width: 390, height: 844 }]) {
  test(`interactive states (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const p = vp.name;

    await page.goto('/log/meals');
    await page.waitForLoadState('networkidle');
    await page.fill('#food-search-add', 'بيضة');
    await shot(page, `${p}-meal-search-open`);
    await page.keyboard.press('Enter');
    await page.locator('#item-0-qty').scrollIntoViewIfNeeded();
    await shot(page, `${p}-meal-item-row`);
    await page.click('#new-food-inline');
    await page.locator('#food-new-ar').scrollIntoViewIfNeeded();
    await shot(page, `${p}-meal-inline-food`);
    await page.locator('#actualTime').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'اختيار الوقت' }).first().click();
    await shot(page, `${p}-time-picker`);

    await page.goto('/log/beverages');
    await page.waitForLoadState('networkidle');
    await page.locator('[id^="drink-chip-"]').first().click();
    await page.click('#milkType');
    await shot(page, `${p}-beverage-select-open`);
    await page.keyboard.press('Escape');
    await page.click('#new-drink-inline');
    await page.locator('#drink-new-name').scrollIntoViewIfNeeded();
    await shot(page, `${p}-beverage-inline-drink`);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'اختيار التاريخ' }).first().click();
    await shot(page, `${p}-date-picker`);

    await page.goto('/foods');
    await page.waitForLoadState('networkidle');
    await shot(page, `${p}-foods`);

    await page.goto('/log/activity');
    await page.waitForLoadState('networkidle');
    await shot(page, `${p}-activity`);

    await page.goto('/weigh-in');
    await page.waitForLoadState('networkidle');
    await shot(page, `${p}-weigh-in`);
  });
}
