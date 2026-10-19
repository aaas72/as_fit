import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function pickFood(page: Page, index: number, query: string) {
  await page.locator(`#item-${index}-food`).click();
  await page.locator(`#item-${index}-food`).fill(query);
  await page.keyboard.press('Enter');
}

const status = (page: Page) => page.getByRole('status').filter({ hasText: /حُفظ|أُضيف/ });

test('1. profile → meal → coffee with milk → walk → dashboard matches manual calculation', async ({ page }) => {
  // Male, 30 y (born 1996-01-01), 180 cm, 80 kg → BMR 1780, base TDEE 2136
  await page.goto('/settings');
  await page.fill('#displayName', 'اختبار');
  await page.selectOption('#gender', 'male');
  await page.fill('#birthDate', '1996-01-01');
  await page.fill('#heightCm', '180');
  await page.fill('#initialWeightKg', '80');
  await page.fill('#targetWeightKg', '75');
  await page.fill('#activityFactor', '1.2');
  await page.fill('#plannedDeficit', '500');
  await page.fill('#proteinPerKg', '1.8');
  await page.click('#save-settings');
  await expect(page.getByRole('status')).toContainText('حُفظت الإعدادات');

  // Meal: 2 eggs (144 kcal, 12.6 g) + 150 g chicken (247.5 kcal, 46.5 g) = 391.5 kcal
  await page.goto('/log/meals');
  await page.locator('#meal-type-lunch').check({ force: true });
  await page.fill('#scheduledTime', '12:00');
  await page.fill('#actualTime', '14:00'); // +120 min → LUNCH_DRIFT
  await pickFood(page, 0, 'بيضة');
  await page.fill('#item-0-qty', '2');
  await page.click('#add-item');
  await pickFood(page, 1, 'صدر دجاج');
  await page.fill('#item-1-qty', '150');
  await page.click('#save-meal');
  await expect(status(page)).toContainText('392 kcal');

  // Coffee: brewed 15 g + 100 ml whole milk (62 kcal, 3.3 g) + 1 tsp sugar (16.8) = 78.8 kcal
  await page.goto('/log/beverages');
  await page.selectOption('#drinkType', 'coffee_brewed');
  await page.fill('#time', '09:00');
  await page.fill('#volumeMl', '240');
  await page.fill('#dryCoffeeG', '15');
  await page.selectOption('#milkType', 'whole');
  await page.fill('#milkMl', '100');
  await page.fill('#sugarTsp', '1');
  await page.click('#save-beverage');
  await expect(status(page)).toContainText('165 mg');

  // Brisk walk 45 min, MET 4.3, 80 kg → net 207.9 kcal
  await page.goto('/log/activity');
  const walkId = await page.locator('#exerciseId option', { hasText: 'مشي سريع' }).getAttribute('value');
  await page.selectOption('#exerciseId', walkId!);
  await page.fill('#durationMinutes', '45');
  await page.click('#save-exercise');
  await expect(status(page)).toContainText('208 kcal');

  // Dashboard: intake 470.3 → 470; TDEE 2136 + 207.9 = 2343.9 → target 1843.9 → 1,844; protein 62.4 → 62
  await page.goto('/');
  const ring = page.getByRole('img', { name: /المستهلك/ });
  await expect(ring).toHaveAttribute('aria-label', 'المستهلك 470 من 1844 kcal');
  await expect(page.getByText('2,344').first()).toBeVisible();
  await expect(page.getByText('تمارين نشطة')).toBeVisible();
  await expect(page.locator('main')).toContainText('62');
});

test('2. weigh-in with 12 h fast is saved and flagged non-compliant', async ({ page }) => {
  await page.goto('/weigh-in');
  const measured = await page.inputValue('#measuredAt');
  const d = new Date(`${measured}:00Z`);
  d.setUTCHours(d.getUTCHours() - 12);
  await page.fill('#lastMealAt', d.toISOString().slice(0, 16));
  await expect(page.getByText('القراءة الآن ستُحفظ كغير ملتزمة')).toBeVisible();
  await page.click('#wizard-next');
  await page.check('#bathroomDone');
  await page.check('#noFluidsBefore');
  await page.click('#wizard-next');
  await page.click('#wizard-next');
  await page.fill('#weightKg', '79.6');
  await page.click('#save-weigh-in');
  await expect(page.getByRole('status')).toContainText('غير ملتزمة');
  await expect(page.locator('main').getByText('غير ملتزمة', { exact: true }).first()).toBeVisible();
});

test('3. editing a food does not change a past meal (snapshot)', async ({ page }) => {
  await page.goto('/foods');
  const row = page.locator('tr', { hasText: 'بيضة كاملة' });
  await row.getByRole('button', { name: 'تعديل' }).click();
  const editor = page.locator('tbody tr', { has: page.getByRole('button', { name: 'حفظ التعديل' }) });
  await editor.locator('input[id$="-calories"]').fill('999');
  await editor.getByRole('button', { name: 'حفظ التعديل' }).click();
  await expect(page.locator('tr', { hasText: 'بيضة كاملة' })).toContainText('999');

  await page.goto('/log/meals');
  const meal = page.locator('section').filter({ hasText: 'وجبات اليوم' });
  await expect(meal.getByText('بيضة كاملة')).toBeVisible();
  await expect(meal).toContainText('144'); // still the original 2 × 72
  await expect(meal).not.toContainText('1,998');
});

test('4. dismissed insight disappears and does not return', async ({ page }) => {
  await page.goto('/insights');
  const card = page.locator('article', { hasText: 'غداء متأخر' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'تجاهل' }).click();
  await expect(page.locator('article', { hasText: 'غداء متأخر' })).toHaveCount(0);
  await page.click('#refresh-insights');
  await expect(page.getByRole('status')).toBeVisible();
  await page.reload();
  await expect(page.locator('article', { hasText: 'غداء متأخر' })).toHaveCount(0);
});

test('5. day completeness toggle persists', async ({ page }) => {
  await page.goto('/log/meals');
  const toggle = page.locator('#day-complete-toggle');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.locator('#day-complete-toggle')).toHaveAttribute('aria-checked', 'true');
  await page.goto('/');
  await expect(page.getByText('عجز محقق')).toBeVisible();
});
