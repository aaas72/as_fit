import { eq } from 'drizzle-orm';
import type { Gender } from '@/domain/constants';
import { db } from '@/server/db/client';
import { userProfiles, userSettings } from '@/server/db/schema';

export type Profile = {
  id: number;
  displayName: string;
  gender: Gender;
  birthDate: string;
  heightCm: number;
  initialWeightKg: number;
  targetWeightKg: number;
  activityFactor: number;
  createdAt: Date;
};

export type Settings = {
  timezone: string;
  plannedDeficit: number;
  proteinPerKg: number;
  useNetMet: boolean;
  caffeineMgPerG: number;
  caffeineHalfLifeH: number;
  requiredFastingHours: number;
  kcalPerKg: number;
  emaAlpha: number;
};

export const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE ?? 'Asia/Riyadh';

export async function getProfileAndSettings(userId: number): Promise<{ profile: Profile; settings: Settings } | null> {
  const [row] = await db
    .select()
    .from(userProfiles)
    .leftJoin(userSettings, eq(userSettings.userId, userProfiles.id))
    .where(eq(userProfiles.id, userId));
  if (!row) return null;
  const p = row.user_profiles;
  const s = row.user_settings;
  return {
    profile: {
      id: p.id,
      displayName: p.displayName,
      gender: p.gender,
      birthDate: p.birthDate,
      heightCm: Number(p.currentHeightCm),
      initialWeightKg: Number(p.initialWeightKg),
      targetWeightKg: Number(p.targetWeightKg),
      activityFactor: Number(p.defaultActivityFactor),
      createdAt: p.createdAt,
    },
    settings: {
      timezone: s?.timezone ?? DEFAULT_TIMEZONE,
      plannedDeficit: s?.plannedDailyDeficitKcal ?? 500,
      proteinPerKg: Number(s?.proteinGPerKg ?? 1.8),
      useNetMet: s?.useNetMet ?? true,
      caffeineMgPerG: Number(s?.caffeineMgPerGCoffee ?? 11),
      caffeineHalfLifeH: Number(s?.caffeineHalfLifeHours ?? 5),
      requiredFastingHours: s?.requiredFastingHours ?? 14,
      kcalPerKg: s?.kcalPerKgFat ?? 7700,
      emaAlpha: Number(s?.emaAlphaDaily ?? 0.1),
    },
  };
}

// Timezone without loading everything (for actions that only need log_date)
export async function getTimezone(userId: number) {
  const [s] = await db.select({ tz: userSettings.timezone }).from(userSettings).where(eq(userSettings.userId, userId));
  return s?.tz ?? DEFAULT_TIMEZONE;
}
