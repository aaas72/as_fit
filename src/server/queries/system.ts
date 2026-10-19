import { count, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { exerciseCatalog, foodDictionary, userProfiles } from '@/server/db/schema';
import { USER_ID } from '@/server/session';

export type SystemStatus =
  | { ok: true; foods: number; exercises: number; profileName: string | null }
  | { ok: false; error: string };

export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    const [[foods], [exercises], [profile]] = await Promise.all([
      db.select({ n: count() }).from(foodDictionary),
      db.select({ n: count() }).from(exerciseCatalog),
      db.select({ name: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.id, USER_ID)),
    ]);
    return { ok: true, foods: foods?.n ?? 0, exercises: exercises?.n ?? 0, profileName: profile?.name ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
