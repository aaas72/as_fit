import { describe, expect, it } from 'vitest';
import { projectedGoalFromReadings } from '@/domain/weight-trend';

const reading = (date: string, weight: number, compliant = true) => ({ date, weight, compliant });

describe('projectedGoalFromReadings', () => {
  const readings = [
    reading('2026-09-01', 95), // older than the 42-day window: ignored
    reading('2026-10-14', 90),
    reading('2026-10-21', 89.5),
    reading('2026-10-28', 89.2, false), // non-compliant: ignored
    reading('2026-11-04', 89),
    reading('2026-11-11', 88.5),
  ];

  it('uses only compliant readings inside the recent window', () => {
    const r = projectedGoalFromReadings({ readings, asOf: '2026-11-18', currentWeightKg: 88.5, targetWeightKg: 80 });
    expect(r?.slopeKgPerDay).toBeCloseTo(-0.05, 6); // OLS over days 0, 7, 21, 28
    expect(r?.days).toBe(170); // 8.5 kg at 0.05 kg/day
  });

  it('ignores readings after the as-of date', () => {
    const future = [...readings, reading('2026-12-30', 70)];
    expect(projectedGoalFromReadings({ readings: future, asOf: '2026-11-18', currentWeightKg: 88.5, targetWeightKg: 80 })?.days).toBe(170);
  });

  it('returns null when the window has too little data', () => {
    expect(projectedGoalFromReadings({ readings, asOf: '2026-11-18', currentWeightKg: 88.5, targetWeightKg: 80, windowDays: 10 })).toBeNull();
  });
});
