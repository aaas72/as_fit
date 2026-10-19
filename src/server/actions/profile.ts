'use server';

import { eq } from 'drizzle-orm';
import { profileSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { userProfiles, userSettings } from '@/server/db/schema';
import { invalid, refreshAll } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { USER_ID } from '@/server/session';

export async function upsertProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const profile = {
    displayName: v.displayName, gender: v.gender, birthDate: v.birthDate,
    currentHeightCm: v.heightCm.toFixed(1), initialWeightKg: v.initialWeightKg.toFixed(2),
    targetWeightKg: v.targetWeightKg.toFixed(2), defaultActivityFactor: v.activityFactor.toFixed(3),
  };
  const settings = {
    timezone: v.timezone, plannedDailyDeficitKcal: v.plannedDeficit, proteinGPerKg: v.proteinPerKg.toFixed(2),
    useNetMet: v.useNetMet, caffeineMgPerGCoffee: v.caffeineMgPerG.toFixed(1), caffeineHalfLifeHours: v.caffeineHalfLifeH.toFixed(1),
    requiredFastingHours: v.requiredFastingHours, kcalPerKgFat: v.kcalPerKg, emaAlphaDaily: v.emaAlpha.toFixed(2),
    breakfastTime: v.breakfastTime || null, lunchTime: v.lunchTime || null, dinnerTime: v.dinnerTime || null,
  };

  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: userProfiles.id }).from(userProfiles).where(eq(userProfiles.id, USER_ID));
    if (existing) {
      await tx.update(userProfiles).set({ ...profile, updatedAt: new Date() }).where(eq(userProfiles.id, USER_ID));
    } else {
      await tx.insert(userProfiles).values({ id: USER_ID, ...profile });
    }
    await tx.insert(userSettings).values({ userId: USER_ID, ...settings })
      .onConflictDoUpdate({ target: userSettings.userId, set: settings });
  });

  await runInsights(USER_ID);
  refreshAll();
  return { ok: true };
}
