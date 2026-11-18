// Property-based tests: invariants that must hold for every input, not only for the golden values.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { residualCaffeineMg } from '@/domain/caffeine-kinetics';
import { MIN_INTAKE_KCAL } from '@/domain/constants';
import { clockDriftMin } from '@/domain/meal-timing';
import { bmrKatchMcArdle, dailyTargets, leanBodyMassKg, maxSafeDeficit } from '@/domain/metabolism';
import { portionNutrition } from '@/domain/nutrition';
import { circularMeanMin, clockDistanceMin } from '@/domain/sleep';
import { emaTrend, linearSlope, projectedGoal } from '@/domain/weight-trend';

const weight = fc.double({ min: 30, max: 300, noNaN: true });
const clock = fc.integer({ min: 0, max: 23 * 60 + 59 });
const hhmm = clock.map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);

// Strictly increasing day numbers with a weight on each
const weighIns = fc
  .array(fc.tuple(fc.integer({ min: 1, max: 14 }), weight), { minLength: 1, maxLength: 40 })
  .map((steps) => {
    let day = 0;
    return steps.map(([gap, w]) => ({ day: (day += gap), weight: w }));
  });

describe('weight trend', () => {
  it('EMA never leaves the range of the readings', () => {
    fc.assert(fc.property(weighIns, fc.double({ min: 0.01, max: 0.99, noNaN: true }), (points, alpha) => {
      const ws = points.map((p) => p.weight);
      const lo = Math.min(...ws) - 1e-9;
      const hi = Math.max(...ws) + 1e-9;
      return emaTrend(points, alpha).every((t) => t >= lo && t <= hi);
    }));
  });

  it('OLS recovers the exact slope of perfectly linear data', () => {
    fc.assert(fc.property(weighIns, fc.double({ min: -0.5, max: 0.5, noNaN: true }), (points, slope) => {
      fc.pre(points.length >= 2);
      const line = points.map((p) => ({ day: p.day, weight: 80 + slope * p.day }));
      expect(linearSlope(line)).toBeCloseTo(slope, 6);
    }));
  });
});

describe('caffeine kinetics', () => {
  it('residual caffeine never rises over time without a new dose', () => {
    const dose = fc.record({ mg: fc.double({ min: 0, max: 500, noNaN: true }), offsetMin: fc.integer({ min: 0, max: 600 }) });
    fc.assert(fc.property(fc.array(dose, { maxLength: 6 }), fc.integer({ min: 0, max: 1440 }), (doses, waitMin) => {
      const start = Date.UTC(2026, 0, 1, 6);
      const ds = doses.map((d) => ({ mg: d.mg, at: new Date(start + d.offsetMin * 60_000) }));
      const lastDose = start + 600 * 60_000;
      const t1 = new Date(lastDose);
      const t2 = new Date(lastDose + waitMin * 60_000);
      return residualCaffeineMg(ds, t2) <= residualCaffeineMg(ds, t1) + 1e-9;
    }));
  });
});

describe('meal timing', () => {
  it('clock drift always lies in [-720, 720)', () => {
    fc.assert(fc.property(hhmm, hhmm, (scheduled, actual) => {
      const d = clockDriftMin(scheduled, actual);
      return d >= -720 && d < 720;
    }));
  });
});

describe('circular clock math', () => {
  it('the circular mean is a valid clock time', () => {
    fc.assert(fc.property(fc.array(clock, { minLength: 1, maxLength: 20 }), (times) => {
      const m = circularMeanMin(times);
      return m == null || (m >= 0 && m < 1440);
    }));
  });

  it('clock distance is symmetric and at most 12 hours', () => {
    fc.assert(fc.property(clock, clock, (a, b) => {
      const d = clockDistanceMin(a, b);
      return d === clockDistanceMin(b, a) && d >= 0 && d <= 720;
    }));
  });
});

describe('daily targets', () => {
  it('never go below the safe floor or above the safe deficit', () => {
    const input = fc.record({
      tdee: fc.double({ min: 1000, max: 5000, noNaN: true }),
      bmr: fc.double({ min: 800, max: 3000, noNaN: true }),
      deficit: fc.double({ min: 0, max: 1200, noNaN: true }),
      gender: fc.constantFrom('male' as const, 'female' as const),
      weightKg: weight,
      proteinPerKg: fc.double({ min: 0.8, max: 3, noNaN: true }),
    });
    fc.assert(fc.property(input, (p) => {
      const t = dailyTargets(p);
      const floor = Math.max(p.bmr, MIN_INTAKE_KCAL[p.gender]);
      return t.calories >= floor - 1e-9 && t.deficitApplied <= maxSafeDeficit(p.weightKg) + 1e-9;
    }));
  });
});

describe('portion nutrition', () => {
  it('scales linearly with quantity', () => {
    const food = fc.record({
      basis: fc.constantFrom('per_100g' as const, 'per_100ml' as const, 'per_unit' as const),
      calories: fc.double({ min: 0, max: 900, noNaN: true }),
      protein: fc.double({ min: 0, max: 100, noNaN: true }),
    });
    fc.assert(fc.property(food, fc.double({ min: 0.1, max: 2500, noNaN: true }), (f, q) => {
      const one = portionNutrition(f, q);
      const two = portionNutrition(f, 2 * q);
      expect(two.calories).toBeCloseTo(2 * one.calories, 6);
      expect(two.protein).toBeCloseTo(2 * one.protein, 6);
    }));
  });
});

describe('lean mass and Katch-McArdle', () => {
  it('lean mass is positive and never exceeds total weight', () => {
    fc.assert(fc.property(weight, fc.double({ min: -10, max: 100, noNaN: true }), (w, bf) => {
      const lbm = leanBodyMassKg(w, bf);
      return lbm == null || (lbm > 0 && lbm <= w);
    }));
  });

  it('BMR rises strictly with lean mass', () => {
    fc.assert(fc.property(fc.double({ min: 10, max: 150, noNaN: true }), fc.double({ min: 0.01, max: 50, noNaN: true }), (lbm, extra) =>
      bmrKatchMcArdle(lbm + extra) > bmrKatchMcArdle(lbm)));
  });
});

describe('goal projection', () => {
  it('when an estimate exists, following the slope for that many days reaches the target', () => {
    fc.assert(fc.property(weighIns, weight, weight, (points, current, target) => {
      const r = projectedGoal({ points, currentWeightKg: current, targetWeightKg: target });
      if (r == null || r.days === 0) return true;
      const projected = current + r.slopeKgPerDay * r.days;
      const before = current + r.slopeKgPerDay * (r.days - 1);
      const passed = (x: number) => (target < current ? x <= target + 1e-6 : x >= target - 1e-6);
      return r.days >= 1 && passed(projected) && (r.days === 1 || !passed(before - Math.sign(r.slopeKgPerDay) * 1e-6));
    }));
  });
});
