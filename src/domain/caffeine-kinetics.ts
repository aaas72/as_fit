import { CAFFEINE_BEDTIME_LIMIT_MG } from './constants';

export type CaffeineDose = { mg: number; at: Date };

const HOUR_MS = 3.6e6;

// First-order elimination: C(t) = Σ D_i × 0.5^((t − t_i) / T½)
export function residualCaffeineMg(doses: CaffeineDose[], at: Date, halfLifeH = 5) {
  return doses
    .filter((d) => d.at <= at)
    .reduce((sum, d) => sum + d.mg * Math.pow(0.5, (at.getTime() - d.at.getTime()) / HOUR_MS / halfLifeH), 0);
}

// Latest time for a new dose so that the total at bedtime stays ≤ limitMg, counting earlier doses.
// null = earlier doses alone already reach the limit: no more caffeine today.
export function latestDoseTime(p: {
  doses: CaffeineDose[]; bedAt: Date; nextDoseMg: number; limitMg?: number; halfLifeH?: number;
}) {
  const limit = p.limitMg ?? CAFFEINE_BEDTIME_LIMIT_MG;
  const halfLife = p.halfLifeH ?? 5;
  const room = limit - residualCaffeineMg(p.doses, p.bedAt, halfLife);
  if (room <= 0) return null;
  if (p.nextDoseMg <= room) return p.bedAt;
  const hoursBefore = halfLife * Math.log2(p.nextDoseMg / room);
  return new Date(p.bedAt.getTime() - hoursBefore * HOUR_MS);
}

export type CaffeineLevel = 'low' | 'moderate' | 'high';
export const caffeineLevel = (mg: number): CaffeineLevel => (mg < 50 ? 'low' : mg <= CAFFEINE_BEDTIME_LIMIT_MG ? 'moderate' : 'high');
