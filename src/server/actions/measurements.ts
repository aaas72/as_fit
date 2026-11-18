'use server';

import { and, eq } from 'drizzle-orm';
import { INVALID_ID_MESSAGE, parseRecordId } from '@/lib/validation/common';
import { measurementsSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { bodyMeasurements } from '@/server/db/schema';
import { invalid, refreshAll, toNumStr, failure } from '@/server/services/action-helpers';
import { MOCK_MODE, MOCK_READ_ONLY_MESSAGE } from '@/server/mock/mode';
import { USER_ID } from '@/server/session';

export async function logMeasurements(input: unknown): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const parsed = measurementsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const values = {
    neckCm: toNumStr(v.neckCm, 1), chestCm: toNumStr(v.chestCm, 1), waistCm: v.waistCm.toFixed(1), hipCm: v.hipCm.toFixed(1),
    thighCm: toNumStr(v.thighCm, 1), bicepCm: toNumStr(v.bicepCm, 1),
  };
  await db.insert(bodyMeasurements).values({ userId: USER_ID, logDate: v.logDate, ...values })
    .onConflictDoUpdate({ target: [bodyMeasurements.userId, bodyMeasurements.logDate], set: values });
  refreshAll();
  return { ok: true };
}

export async function deleteMeasurement(id: number): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const recordId = parseRecordId(id);
  if (recordId == null) return failure(INVALID_ID_MESSAGE);
  await db.delete(bodyMeasurements).where(and(eq(bodyMeasurements.id, recordId), eq(bodyMeasurements.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
