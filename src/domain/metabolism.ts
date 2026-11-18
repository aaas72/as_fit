import { KCAL_PER_KG_FAT_DEFAULT, MIN_INTAKE_KCAL, SAFE_WEEKLY_LOSS_PCT, type Gender } from './constants';

// Mifflin-St Jeor (1990)
export function bmrMifflin(p: { weightKg: number; heightCm: number; ageYears: number; gender: Gender }) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears;
  return p.gender === 'male' ? base + 5 : base - 161;
}

// Lean body mass from total weight and body-fat percentage (e.g. navyBodyFat()).
// null when the percentage is outside a physiological 2–70 % range.
export function leanBodyMassKg(weightKg: number, bodyFatPct: number) {
  if (!(bodyFatPct >= 2 && bodyFatPct <= 70)) return null;
  return weightKg * (1 - bodyFatPct / 100);
}

// Katch-McArdle: BMR = 370 + 21.6 × LBM. Uses lean mass instead of total weight, so it is more
// accurate than Mifflin-St Jeor for very muscular or high-body-fat people when body fat is known.
export const bmrKatchMcArdle = (leanMassKg: number) => 370 + 21.6 * leanMassKg;

export type BmrFormula = 'mifflin' | 'katch_mcardle';

// Katch-McArdle only when the user opted in AND a plausible body-fat value is available;
// otherwise Mifflin-St Jeor, so a missing or stale measurement never breaks the daily targets.
export function selectBmr(p: {
  preferKatchMcArdle: boolean; bodyFatPct: number | null;
  weightKg: number; heightCm: number; ageYears: number; gender: Gender;
}): { bmr: number; formula: BmrFormula } {
  const lbm = p.preferKatchMcArdle && p.bodyFatPct != null ? leanBodyMassKg(p.weightKg, p.bodyFatPct) : null;
  if (lbm != null) return { bmr: bmrKatchMcArdle(lbm), formula: 'katch_mcardle' };
  return { bmr: bmrMifflin(p), formula: 'mifflin' };
}

// activityFactor = non-exercise activity only (logged exercise is added separately)
export const baseTdee = (bmr: number, activityFactor = 1.2) => bmr * activityFactor;
export const dynamicTdee = (base: number, exerciseKcal: number) => base + exerciseKcal;

// Largest daily deficit whose expected loss stays ≤ 1% of body weight per week (S11)
export const maxSafeDeficit = (weightKg: number, kcalPerKg = KCAL_PER_KG_FAT_DEFAULT) =>
  (SAFE_WEEKLY_LOSS_PCT.max * weightKg * kcalPerKg) / 7;

export function dailyTargets(p: {
  tdee: number; bmr: number; deficit: number; gender: Gender; weightKg: number; proteinPerKg: number; kcalPerKg?: number;
}) {
  const floor = Math.max(p.bmr, MIN_INTAKE_KCAL[p.gender]);
  const deficit = Math.min(p.deficit, maxSafeDeficit(p.weightKg, p.kcalPerKg));
  return {
    calories: Math.max(p.tdee - deficit, floor),
    proteinG: p.proteinPerKg * p.weightKg,
    deficitApplied: deficit,
    deficitCapped: deficit < p.deficit,
    floorApplied: p.tdee - deficit < floor,
  };
}
