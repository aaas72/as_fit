'use server';

import { and, eq } from 'drizzle-orm';
import { measurementsSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { bodyMeasurements } from '@/server/db/schema';
import { invalid, refreshAll, toNumStr } from '@/server/services/action-helpers';
import { USER_ID } from '@/server/session';

export async function logMeasurements(input: unknown): Promise<ActionResult> {
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
  await db.delete(bodyMeasurements).where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
