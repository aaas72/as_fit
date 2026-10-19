'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { portionNutrition } from '@/domain/nutrition';
import { mealSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { foodDictionary, mealItems, meals } from '@/server/db/schema';
import { getProfileAndSettings } from '@/server/queries/profile';
import { failure, invalid, refreshAll, toNumStr } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { MOCK_MODE, MOCK_READ_ONLY_MESSAGE } from '@/server/mock/mode';
import { USER_ID } from '@/server/session';

export async function createMeal(input: unknown): Promise<ActionResult<{ kcal: number; protein: number }>> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const parsed = mealSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  // Scheduled time comes from the user's meal schedule (settings) and is stored with the meal as a snapshot
  const ps = await getProfileAndSettings(USER_ID);
  if (!ps) return failure('أنشئ الملف الشخصي أولاً من الإعدادات');
  const scheduledTime = v.mealType === 'snack' ? null : ps.settings.mealSchedule[v.mealType];

  const foods = await db.select().from(foodDictionary).where(inArray(foodDictionary.id, v.items.map((i) => i.foodId)));
  const byId = new Map(foods.map((f) => [f.id, f]));
  if (v.items.some((i) => !byId.has(i.foodId))) return failure('صنف غير موجود في القاموس');

  // Snapshot: nutrition is computed now and never recomputed if the dictionary changes later
  const items = v.items.map((i) => {
    const f = byId.get(i.foodId)!;
    const p = portionNutrition({ basis: f.nutritionBasis, calories: Number(f.calories), protein: Number(f.proteinG), carbs: f.carbsG == null ? null : Number(f.carbsG), fat: f.fatG == null ? null : Number(f.fatG) }, i.quantity);
    return { foodItemId: f.id, quantity: i.quantity, p };
  });

  await db.transaction(async (tx) => {
    const [meal] = await tx.insert(meals).values({
      userId: USER_ID, logDate: v.logDate, mealType: v.mealType,
      scheduledTime, actualTime: v.actualTime, notes: v.notes || null,
    }).returning({ id: meals.id });
    await tx.insert(mealItems).values(items.map(({ foodItemId, quantity, p }) => ({
      mealId: meal!.id, foodItemId, quantity: quantity.toFixed(2),
      calculatedCalories: p.calories.toFixed(2), calculatedProtein: p.protein.toFixed(2),
      calculatedCarbs: toNumStr(p.carbs), calculatedFat: toNumStr(p.fat),
    })));
  });

  await runInsights(USER_ID, v.logDate);
  refreshAll();
  return { ok: true, kcal: items.reduce((s, i) => s + i.p.calories, 0), protein: items.reduce((s, i) => s + i.p.protein, 0) };
}

export async function deleteMeal(id: number): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  await db.delete(meals).where(and(eq(meals.id, id), eq(meals.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
