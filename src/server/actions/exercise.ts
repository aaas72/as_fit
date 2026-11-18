'use server';

import { and, eq } from 'drizzle-orm';
import { INVALID_ID_MESSAGE, parseRecordId } from '@/lib/validation/common';
import { exerciseKcal } from '@/domain/exercise';
import { exerciseSchema } from '@/lib/validation/schemas';
import type { ActionResult } from '@/lib/validation/common';
import { db } from '@/server/db/client';
import { exerciseCatalog, exerciseLogs } from '@/server/db/schema';
import { getProfileAndSettings } from '@/server/queries/profile';
import { getWeighIns, trendWeightAt } from '@/server/queries/weight';
import { failure, invalid, refreshAll } from '@/server/services/action-helpers';
import { runInsights } from '@/server/services/insights-runner';
import { MOCK_MODE, MOCK_READ_ONLY_MESSAGE } from '@/server/mock/mode';
import { USER_ID } from '@/server/session';

export async function logExercise(input: unknown): Promise<ActionResult<{ gross: number; net: number }>> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;

  const [ex] = await db.select().from(exerciseCatalog).where(eq(exerciseCatalog.id, v.exerciseId));
  if (!ex) return failure('التمرين غير موجود في الكتالوج');
  const ps = await getProfileAndSettings(USER_ID);
  if (!ps) return failure('أنشئ الملف الشخصي أولاً من الإعدادات');

  const met = v.metOverride ?? Number(ex.defaultMet);
  const weight = trendWeightAt(await getWeighIns(USER_ID, ps.settings.emaAlpha), v.logDate, ps.profile.initialWeightKg);
  const kcal = exerciseKcal(met, weight, v.durationMinutes);

  await db.insert(exerciseLogs).values({
    userId: USER_ID, logDate: v.logDate, exerciseId: ex.id, durationMinutes: v.durationMinutes,
    metValue: met.toFixed(1), weightUsedKg: weight.toFixed(2),
    grossBurnedKcal: kcal.gross.toFixed(1), netBurnedKcal: kcal.net.toFixed(1), notes: v.notes || null,
  });

  await runInsights(USER_ID, v.logDate);
  refreshAll();
  return { ok: true, ...kcal };
}

export async function deleteExercise(id: number): Promise<ActionResult> {
  if (MOCK_MODE) return failure(MOCK_READ_ONLY_MESSAGE);
  const recordId = parseRecordId(id);
  if (recordId == null) return failure(INVALID_ID_MESSAGE);
  await db.delete(exerciseLogs).where(and(eq(exerciseLogs.id, recordId), eq(exerciseLogs.userId, USER_ID)));
  refreshAll();
  return { ok: true };
}
