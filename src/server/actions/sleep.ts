'use server';

import { and, eq } from 'drizzle-orm';
import { localDateOf, zonedToDate } from '@/lib/time';
import { sleepSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { sleepLogs } from '@/server/db/schema';
import { getTimezone } from '@/server/queries/profile';
import { failure, invalid, refreshAll } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { MOCK_MODE, MOCK_READ_ONLY_MESSAGE } from '@/server/mock/mode';
import { USER_ID } from '@/server/session';

export async function logSleep(input: unknown): Promise<ActionResult<{ tstMin: number }>> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const parsed = sleepSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const tz = await getTimezone(USER_ID);

  const bed = zonedToDate(v.bedTime, tz);
  const onset = zonedToDate(v.sleepOnsetTime, tz);
  const wake = zonedToDate(v.wakeUpTime, tz);
  const tstMin = (wake.getTime() - onset.getTime()) / 60000 - v.wasoMinutes;
  if (tstMin <= 0) return failure('الاستيقاظ الليلي أطول من مدة النوم');

  const logDate = localDateOf(wake, tz); // a night belongs to its wake-up date
  const values = {
    bedTime: bed, sleepOnsetTime: onset, wakeUpTime: wake,
    nightInterruptionsCount: v.nightInterruptions, wasoMinutes: v.wasoMinutes, wakeFreshnessScore: v.freshness,
  };
  await db.insert(sleepLogs).values({ userId: USER_ID, logDate, ...values })
    .onConflictDoUpdate({ target: [sleepLogs.userId, sleepLogs.logDate], set: values });

  await runInsights(USER_ID, logDate);
  refreshAll();
  return { ok: true, tstMin };
}

export async function deleteSleep(id: number): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  await db.delete(sleepLogs).where(and(eq(sleepLogs.id, id), eq(sleepLogs.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
