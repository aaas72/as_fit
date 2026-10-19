import { KCAL_PER_KG_FAT_DEFAULT, OBSERVED_TDEE_MIN_DAYS } from './constants';

export type WeightPoint = { day: number; weight: number }; // day = days since a fixed origin

const DAY_MS = 86_400_000;
export const dayNumber = (isoDate: string) => Math.round(Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS);

// Time-aware EMA: α per day, a gap of Δ days gives α_eff = 1 − (1 − α)^Δ.
// Weekly readings with α = 0.1 → α_eff ≈ 0.52. For display and noise rules only (lags ~ (1−α)/α days).
export function emaTrend(points: WeightPoint[], alpha = 0.1) {
  const out: number[] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    const prevTrend = out[i - 1];
    if (prev === undefined || prevTrend === undefined) { out.push(p.weight); return; }
    const a = 1 - Math.pow(1 - alpha, p.day - prev.day);
    out.push(prevTrend + a * (p.weight - prevTrend));
  });
  return out;
}

// Ordinary least squares slope in kg/day. null for < 2 points or all points on one day.
export function linearSlope(points: WeightPoint[]) {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.day, 0) / n;
  const my = points.reduce((s, p) => s + p.weight, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.day - mx) * (p.weight - my);
    den += (p.day - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export const expectedLossKg = (deficits: number[], kcalPerKg = KCAL_PER_KG_FAT_DEFAULT) =>
  deficits.reduce((a, b) => a + b, 0) / kcalPerKg;

// avgIntake = mean of complete days only; slope from raw compliant readings (negative when losing)
export const observedTdee = (p: { avgIntake: number; slopeKgPerDay: number; kcalPerKg?: number }) =>
  p.avgIntake - p.slopeKgPerDay * (p.kcalPerKg ?? KCAL_PER_KG_FAT_DEFAULT);

// β ramps 0 → 0.7 between day 14 and day 42, keeping 30% of the formula as an anchor
export const blendBeta = (days: number) => (days < OBSERVED_TDEE_MIN_DAYS ? 0 : Math.min((days - OBSERVED_TDEE_MIN_DAYS) / 28, 0.7));

export function blendedTdee(formula: number, observed: number | null, days: number) {
  if (observed == null || days < OBSERVED_TDEE_MIN_DAYS) return formula;
  const beta = blendBeta(days);
  return (1 - beta) * formula + beta * observed;
}
