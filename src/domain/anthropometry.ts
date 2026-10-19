import type { Gender } from './constants';

export const whr = (waist: number, hip: number) => waist / hip;
export const whtr = (waist: number, height: number) => waist / height;

// WHO 2008
export const whrRisk = (value: number, gender: Gender) => (value >= (gender === 'male' ? 0.9 : 0.85) ? 'high' : 'normal');

// Ashwell & Gibson 2016: < 0.5 healthy, 0.5–0.6 increased, ≥ 0.6 high
export const whtrRisk = (value: number) => (value < 0.5 ? 'healthy' : value < 0.6 ? 'increased' : 'high');

// US Navy (Hodgdon & Beckett 1984), cm. null = missing measurement (neck_cm is optional) or invalid log input.
export function navyBodyFat(p: { gender: Gender; heightCm: number; waistCm: number; neckCm?: number | null; hipCm?: number | null }) {
  const { log10 } = Math;
  if (p.neckCm == null) return null;
  if (p.gender === 'male') {
    const d = p.waistCm - p.neckCm;
    return d > 0 ? 495 / (1.0324 - 0.19077 * log10(d) + 0.15456 * log10(p.heightCm)) - 450 : null;
  }
  if (p.hipCm == null) return null;
  const d = p.waistCm + p.hipCm - p.neckCm;
  return d > 0 ? 495 / (1.29579 - 0.35004 * log10(d) + 0.221 * log10(p.heightCm)) - 450 : null;
}

// ACE body-fat categories
export type BodyFatCategory = 'essential' | 'athlete' | 'fitness' | 'average' | 'obese';
export function bodyFatCategory(pct: number, gender: Gender): BodyFatCategory {
  const [ess, ath, fit, avg] = gender === 'male' ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (pct < ess) return 'essential';
  if (pct < ath) return 'athlete';
  if (pct < fit) return 'fitness';
  if (pct < avg) return 'average';
  return 'obese';
}
