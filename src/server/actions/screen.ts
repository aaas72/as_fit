'use server';

import { screenSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { screenTimeLogs } from '@/server/db/schema';
import { invalid, refreshAll, failure } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { MOCK_MODE, MOCK_READ_ONLY_MESSAGE } from '@/server/mock/mode';
import { USER_ID } from '@/server/session';

export async function upsertScreenTime(input: unknown): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const parsed = screenSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const values = {
    highFocusHours: v.highFocusHours.toFixed(2),
    moderateAdminHours: v.moderateAdminHours.toFixed(2),
    passiveMediaHours: v.passiveMediaHours.toFixed(2),
  };
  await db.insert(screenTimeLogs).values({ userId: USER_ID, logDate: v.logDate, ...values })
    .onConflictDoUpdate({ target: [screenTimeLogs.userId, screenTimeLogs.logDate], set: values });

  await runInsights(USER_ID, v.logDate);
  refreshAll();
  return { ok: true };
}
