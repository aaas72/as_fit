'use server';

import { and, eq, lt } from 'drizzle-orm';
import { protocolCompliance } from '@/domain/weigh-in';
import { localDateOf, zonedToDate } from '@/lib/time';
import { weighInSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { beverageLogs, weighIns } from '@/server/db/schema';
import { getProfileAndSettings } from '@/server/queries/profile';
import { failure, invalid, refreshAll } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { USER_ID } from '@/server/session';

// Non-compliant readings are SAVED (never rejected) with is_protocol_compliant = false.
export async function logWeighIn(input: unknown): Promise<ActionResult<{ compliant: boolean; violations: string[]; fastingH: number }>> {
  const parsed = weighInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const ps = await getProfileAndSettings(USER_ID);
  if (!ps) return failure('أنشئ الملف الشخصي أولاً من الإعدادات');
  const tz = ps.settings.timezone;

  const measuredAt = zonedToDate(v.measuredAt, tz);
  const lastMealAt = zonedToDate(v.lastMealAt, tz);
  if (lastMealAt >= measuredAt) return failure('آخر وجبة يجب أن تكون قبل وقت القياس');
  const logDate = localDateOf(measuredAt, tz);

  const result = protocolCompliance({ measuredAt, lastMealAt, bathroomDone: v.bathroomDone, noFluidsBefore: v.noFluidsBefore }, ps.settings.requiredFastingHours);
  // Gate 3: any beverage logged earlier the same day contradicts "no fluids before"
  const [drink] = await db.select({ id: beverageLogs.id }).from(beverageLogs)
    .where(and(eq(beverageLogs.userId, USER_ID), eq(beverageLogs.logDate, logDate), lt(beverageLogs.consumedAt, measuredAt))).limit(1);
  const violations = drink && v.noFluidsBefore ? [...result.violations, 'يوجد مشروب مسجّل قبل وقت القياس'] : result.violations;
  const compliant = violations.length === 0;

  const values = {
    measuredAt, lastMealAt, dryFastedWeightKg: v.weightKg.toFixed(2),
    bathroomDone: v.bathroomDone, noFluidsBefore: v.noFluidsBefore,
    highSodiumYesterday: v.highSodiumYesterday, normalDigestion: v.normalDigestion,
    isOfficialWeekly: v.isOfficialWeekly, isProtocolCompliant: compliant,
  };
  await db.insert(weighIns).values({ userId: USER_ID, logDate, ...values })
    .onConflictDoUpdate({ target: [weighIns.userId, weighIns.logDate], set: values });

  await runInsights(USER_ID, logDate);
  refreshAll();
  return { ok: true, compliant, violations, fastingH: result.fastingH };
}

export async function deleteWeighIn(id: number): Promise<ActionResult> {
  await db.delete(weighIns).where(and(eq(weighIns.id, id), eq(weighIns.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
