'use server';

import { dayCompleteSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { dayStatus } from '@/server/db/schema';
import { invalid, refreshAll, failure } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { MOCK_MODE, MOCK_READ_ONLY_MESSAGE } from '@/server/mock/mode';
import { USER_ID } from '@/server/session';

// Only complete days enter deficit, expected loss and observed TDEE (A2).
export async function setDayComplete(input: unknown): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const parsed = dayCompleteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { logDate, complete } = parsed.data;
  const values = { intakeComplete: complete, closedAt: complete ? new Date() : null };
  await db.insert(dayStatus).values({ userId: USER_ID, logDate, ...values })
    .onConflictDoUpdate({ target: [dayStatus.userId, dayStatus.logDate], set: values });
  await runInsights(USER_ID, logDate);
  refreshAll();
  return { ok: true };
}
