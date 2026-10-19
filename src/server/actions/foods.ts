'use server';

import { eq } from 'drizzle-orm';
import { foodSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { foodDictionary } from '@/server/db/schema';
import { failure, invalid, refreshAll, toNumStr } from '@/server/services/action-helpers';

// Editing a food never changes past meals: meal_items keep their nutrition snapshot.
export async function saveFood(input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const values = {
    itemNameAr: v.itemNameAr, itemNameEn: v.itemNameEn || null, nutritionBasis: v.nutritionBasis,
    gramsPerUnit: toNumStr(v.gramsPerUnit, 1), calories: v.calories.toFixed(2), proteinG: v.proteinG.toFixed(2),
    carbsG: toNumStr(v.carbsG), fatG: toNumStr(v.fatG),
  };
  try {
    if (v.id) {
      await db.update(foodDictionary).set(values).where(eq(foodDictionary.id, v.id));
      refreshAll();
      return { ok: true, id: v.id };
    }
    const [row] = await db.insert(foodDictionary).values(values).returning({ id: foodDictionary.id });
    refreshAll();
    return { ok: true, id: row!.id };
  } catch (err) {
    if (err instanceof Error && /unique|duplicate/i.test(err.message + String((err as { cause?: unknown }).cause ?? ''))) {
      return { ok: false, errors: { itemNameAr: ['يوجد صنف بنفس الاسم'] } };
    }
    throw err;
  }
}

// Foods referenced by meals cannot be deleted; they are deactivated instead.
export async function setFoodActive(id: number, active: boolean): Promise<ActionResult> {
  const [row] = await db.update(foodDictionary).set({ isActive: active }).where(eq(foodDictionary.id, id)).returning({ id: foodDictionary.id });
  if (!row) return failure('الصنف غير موجود');
  refreshAll();
  return { ok: true };
}
