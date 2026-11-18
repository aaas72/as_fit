import { describe, expect, it } from 'vitest';
import { projectedGoal, type WeightPoint } from '@/domain/weight-trend';

// Weekly readings losing 0.5 kg/week from 90 kg
const losing: WeightPoint[] = [0, 7, 14, 21, 28].map((day, i) => ({ day, weight: 90 - 0.5 * i }));

describe('projectedGoal', () => {
  it('extrapolates the OLS slope from the current weight to the target', () => {
    const r = projectedGoal({ points: losing, currentWeightKg: 88, targetWeightKg: 80 });
    expect(r?.slopeKgPerDay).toBeCloseTo(-0.5 / 7);
    expect(r?.days).toBe(112); // 8 kg at 0.5 kg/week = 16 weeks
  });

  it('works for a weight-gain goal', () => {
    const gaining = losing.map((p) => ({ day: p.day, weight: 180 - p.weight }));
    const r = projectedGoal({ points: gaining, currentWeightKg: 92, targetWeightKg: 95 });
    expect(r?.days).toBe(42);
  });

  it('returns 0 when the target is already reached', () => {
    expect(projectedGoal({ points: [], currentWeightKg: 80, targetWeightKg: 80 })?.days).toBe(0);
  });

  it('returns null when the trend moves away from the target', () => {
    expect(projectedGoal({ points: losing, currentWeightKg: 88, targetWeightKg: 95 })).toBeNull();
  });

  it('returns null for a flat trend', () => {
    const flat = losing.map((p) => ({ ...p, weight: 88 }));
    expect(projectedGoal({ points: flat, currentWeightKg: 88, targetWeightKg: 80 })).toBeNull();
  });

  it('returns null with too few readings or too short a span', () => {
    expect(projectedGoal({ points: losing.slice(0, 2), currentWeightKg: 88, targetWeightKg: 80 })).toBeNull();
    const shortSpan = [0, 3, 6].map((day, i) => ({ day, weight: 90 - 0.3 * i }));
    expect(projectedGoal({ points: shortSpan, currentWeightKg: 89.4, targetWeightKg: 80 })).toBeNull();
    expect(projectedGoal({ points: [], currentWeightKg: 88, targetWeightKg: 80 })).toBeNull();
  });

  it('respects custom thresholds', () => {
    const shortSpan = [0, 3, 6].map((day, i) => ({ day, weight: 90 - 0.3 * i }));
    expect(projectedGoal({ points: shortSpan, currentWeightKg: 89.4, targetWeightKg: 89, minSpanDays: 5 })?.days).toBe(4);
  });
});
