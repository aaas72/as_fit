import { ageInYears } from '@/domain/age';
import { navyBodyFat } from '@/domain/anthropometry';
import { OBSERVED_TDEE_MIN_DAYS } from '@/domain/constants';
import { baseTdee, dailyTargets, dynamicTdee, selectBmr } from '@/domain/metabolism';
import { blendBeta, blendedTdee, dayNumber, linearSlope, observedTdee } from '@/domain/weight-trend';
import { addDaysIso, isoDateRange } from '@/lib/time';
import { emptyIntake, getIntake, type IntakeRow } from '@/server/queries/intake';
import { getMeasurements } from '@/server/queries/logs';
import { getProfileAndSettings, type Profile, type Settings } from '@/server/queries/profile';
import { getWeighIns, trendWeightAt, type WeighInRow } from '@/server/queries/weight';

const OBSERVED_WINDOW_DAYS = 42;
const BODY_FAT_MAX_AGE_DAYS = 30;

export type Observed = { tdee: number; days: number; slopeKgPerDay: number; completeDays: number; beta: number } | null;

export type DayModel = {
  date: string;
  weightKg: number;
  bmr: number;
  baseTdee: number;
  exerciseKcal: number;
  formulaTdee: number;
  tdee: number;
  intake: IntakeRow;
  deficit: number;
  formulaDeficit: number;
  targets: ReturnType<typeof dailyTargets>;
};

export type Model = {
  profile: Profile;
  settings: Settings;
  weighIns: WeighInRow[];
  currentWeightKg: number;
  observed: Observed;
  days: DayModel[];
};

// Observed TDEE (A1, A2): OLS slope of raw compliant readings + mean intake of complete days in the same span.
export function computeObserved(weighIns: WeighInRow[], intake: Map<string, IntakeRow>, asOf: string, kcalPerKg: number): Observed {
  const from = addDaysIso(asOf, -OBSERVED_WINDOW_DAYS);
  const pts = weighIns.filter((w) => w.compliant && w.date >= from && w.date <= asOf);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return null;
  const span = dayNumber(last.date) - dayNumber(first.date);
  if (span < OBSERVED_TDEE_MIN_DAYS) return null;
  const slope = linearSlope(pts.map((w) => ({ day: dayNumber(w.date), weight: w.weight })));
  const complete = [...intake.values()].filter((r) => r.intakeComplete && r.date >= first.date && r.date <= last.date);
  if (slope == null || complete.length === 0) return null;
  const avgIntake = complete.reduce((s, r) => s + r.totalKcal, 0) / complete.length;
  return { tdee: observedTdee({ avgIntake, slopeKgPerDay: slope, kcalPerKg }), days: span, slopeKgPerDay: slope, completeDays: complete.length, beta: blendBeta(span) };
}

export async function loadModel(userId: number, from: string, to: string): Promise<Model | null> {
  const ps = await getProfileAndSettings(userId);
  if (!ps) return null;
  const { profile, settings } = ps;

  const [weighIns, intake, measurements] = await Promise.all([
    getWeighIns(userId, settings.emaAlpha),
    getIntake(userId, addDaysIso(to, -OBSERVED_WINDOW_DAYS) < from ? addDaysIso(to, -OBSERVED_WINDOW_DAYS) : from, to),
    settings.useKatchMcArdle ? getMeasurements(userId) : Promise.resolve([]),
  ]);
  // US Navy body fat from the latest measurement in the 30 days up to `date` (measurements are latest-first)
  const bodyFatOn = (date: string) => {
    const m = measurements.find((x) => x.date <= date && x.date > addDaysIso(date, -BODY_FAT_MAX_AGE_DAYS));
    return m ? navyBodyFat({ gender: profile.gender, heightCm: profile.heightCm, waistCm: m.waistCm, neckCm: m.neckCm, hipCm: m.hipCm }) : null;
  };
  const observed = computeObserved(weighIns, intake, to, settings.kcalPerKg);
  const birth = new Date(`${profile.birthDate}T00:00:00`);

  const days = isoDateRange(from, to).map((date): DayModel => {
    const weightKg = trendWeightAt(weighIns, date, profile.initialWeightKg);
    const { bmr } = selectBmr({
      preferKatchMcArdle: settings.useKatchMcArdle, bodyFatPct: settings.useKatchMcArdle ? bodyFatOn(date) : null,
      weightKg, heightCm: profile.heightCm, ageYears: ageInYears(birth, new Date(`${date}T12:00:00`)), gender: profile.gender,
    });
    const base = baseTdee(bmr, profile.activityFactor);
    const day = intake.get(date) ?? emptyIntake(date);
    const exerciseKcal = settings.useNetMet ? day.exerciseNetKcal : day.exerciseGrossKcal;
    const formulaTdee = dynamicTdee(base, exerciseKcal);
    const tdee = observed ? blendedTdee(formulaTdee, observed.tdee, observed.days) : formulaTdee;
    return {
      date, weightKg, bmr, baseTdee: base, exerciseKcal, formulaTdee, tdee, intake: day,
      deficit: tdee - day.totalKcal,
      formulaDeficit: formulaTdee - day.totalKcal,
      targets: dailyTargets({ tdee, bmr, deficit: settings.plannedDeficit, gender: profile.gender, weightKg, proteinPerKg: settings.proteinPerKg, kcalPerKg: settings.kcalPerKg }),
    };
  });

  return {
    profile, settings, weighIns, observed, days,
    currentWeightKg: trendWeightAt(weighIns, to, profile.initialWeightKg),
  };
}
