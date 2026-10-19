'use server';

import { and, eq } from 'drizzle-orm';
import { beverageMetrics } from '@/domain/beverages';
import { zonedDateTime } from '@/lib/time';
import { beverageSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { beverageCatalog, beverageLogs } from '@/server/db/schema';
import { getProfileAndSettings } from '@/server/queries/profile';
import { failure, invalid, refreshAll } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { USER_ID } from '@/server/session';

export async function logBeverage(input: unknown): Promise<ActionResult<{ caffeineMg: number; kcal: number }>> {
  const parsed = beverageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const ps = await getProfileAndSettings(USER_ID);
  if (!ps) return failure('أنشئ الملف الشخصي أولاً من الإعدادات');
  const [drink] = await db.select().from(beverageCatalog)
    .where(and(eq(beverageCatalog.id, v.beverageId), eq(beverageCatalog.userId, USER_ID)));
  if (!drink) return { ok: false, errors: { beverageId: ['اختر مشروباً من قائمتك'] } };

  // Snapshot: values are computed now from the drink as it is today
  const m = beverageMetrics({
    drink: {
      byCoffeeWeight: drink.byCoffeeWeight, caffeineMgPer100ml: Number(drink.caffeineMgPer100ml),
      kcalPer100ml: Number(drink.kcalPer100ml), proteinGPer100ml: Number(drink.proteinGPer100ml),
    },
    volumeMl: v.volumeMl, dryCoffeeG: drink.byCoffeeWeight ? v.dryCoffeeG ?? null : null,
    milkType: v.milkType, milkMl: v.milkMl, sugarTsp: v.sugarTsp,
  }, ps.settings.caffeineMgPerG);

  await db.insert(beverageLogs).values({
    userId: USER_ID, logDate: v.logDate, consumedAt: zonedDateTime(v.logDate, v.time, ps.settings.timezone),
    beverageId: drink.id, drinkName: drink.nameAr,
    liquidVolumeMl: v.volumeMl.toFixed(1), dryCoffeeGrams: drink.byCoffeeWeight && v.dryCoffeeG != null ? v.dryCoffeeG.toFixed(1) : null,
    milkType: v.milkType, milkAddedMl: (v.milkType === 'none' ? 0 : v.milkMl).toFixed(1), sugarTeaspoons: v.sugarTsp.toFixed(1),
    caffeineMg: m.caffeineMg.toFixed(1), baseCalories: m.baseKcal.toFixed(1), baseProteinG: m.baseProteinG.toFixed(1),
    milkCalories: m.milkKcal.toFixed(1), milkProteinG: m.milkProteinG.toFixed(1), sugarCalories: m.sugarKcal.toFixed(1),
  });

  await runInsights(USER_ID, v.logDate);
  refreshAll();
  return { ok: true, caffeineMg: m.caffeineMg, kcal: m.totalKcal };
}

export async function deleteBeverage(id: number): Promise<ActionResult> {
  await db.delete(beverageLogs).where(and(eq(beverageLogs.id, id), eq(beverageLogs.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
