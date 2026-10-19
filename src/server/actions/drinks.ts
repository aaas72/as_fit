'use server';

import { and, eq } from 'drizzle-orm';
import { drinkSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { beverageCatalog } from '@/server/db/schema';
import { invalid, refreshAll, toNumStr } from '@/server/services/action-helpers';
import { USER_ID } from '@/server/session';

// Editing or deleting a drink never changes past logs: each log keeps its own name and values (snapshot).
export async function saveDrink(input: unknown): Promise<ActionResult<{ id: number }>> {
  const parsed = drinkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const values = {
    nameAr: v.nameAr, byCoffeeWeight: v.byCoffeeWeight,
    caffeineMgPer100ml: v.caffeineMgPer100ml.toFixed(1), kcalPer100ml: v.kcalPer100ml.toFixed(1),
    proteinGPer100ml: v.proteinGPer100ml.toFixed(1), defaultVolumeMl: v.defaultVolumeMl.toFixed(1),
    defaultCoffeeG: v.byCoffeeWeight ? toNumStr(v.defaultCoffeeG, 1) : null,
  };
  try {
    if (v.id) {
      await db.update(beverageCatalog).set(values).where(and(eq(beverageCatalog.id, v.id), eq(beverageCatalog.userId, USER_ID)));
      refreshAll();
      return { ok: true, id: v.id };
    }
    const [row] = await db.insert(beverageCatalog).values({ userId: USER_ID, ...values }).returning({ id: beverageCatalog.id });
    refreshAll();
    return { ok: true, id: row!.id };
  } catch (err) {
    if (err instanceof Error && /unique|duplicate/i.test(err.message + String((err as { cause?: unknown }).cause ?? ''))) {
      return { ok: false, errors: { nameAr: ['يوجد مشروب بنفس الاسم في قائمتك'] } };
    }
    throw err;
  }
}

export async function deleteDrink(id: number): Promise<ActionResult> {
  await db.delete(beverageCatalog).where(and(eq(beverageCatalog.id, id), eq(beverageCatalog.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
