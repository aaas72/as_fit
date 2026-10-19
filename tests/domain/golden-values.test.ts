import { describe, expect, it } from 'vitest';
import { ageInYears } from '@/domain/age';
import { bodyFatCategory, navyBodyFat, whr, whrRisk, whtr, whtrRisk } from '@/domain/anthropometry';
import { beverageMetrics } from '@/domain/beverages';
import { caffeineLevel, latestDoseTime, residualCaffeineMg } from '@/domain/caffeine-kinetics';
import { exerciseKcal } from '@/domain/exercise';
import { clockDriftMin, driftTone } from '@/domain/meal-timing';
import { baseTdee, bmrMifflin, dailyTargets, dynamicTdee, maxSafeDeficit } from '@/domain/metabolism';
import { portionNutrition } from '@/domain/nutrition';
import { sleepMetrics, socialJetLagH } from '@/domain/sleep';
import { protocolCompliance } from '@/domain/weigh-in';
import { blendBeta, blendedTdee, dayNumber, emaTrend, expectedLossKg, linearSlope, observedTdee } from '@/domain/weight-trend';

const at = (iso: string) => new Date(iso);

describe('metabolism', () => {
  it('BMR male = 1780', () => expect(bmrMifflin({ weightKg: 80, heightCm: 180, ageYears: 30, gender: 'male' })).toBe(1780));
  it('BMR female = 1370.25', () => expect(bmrMifflin({ weightKg: 65, heightCm: 165, ageYears: 30, gender: 'female' })).toBeCloseTo(1370.25));
  it('Base TDEE = 2136', () => expect(baseTdee(1780)).toBeCloseTo(2136));
  it('Dynamic TDEE adds exercise', () => expect(dynamicTdee(2136, 207.9)).toBeCloseTo(2343.9));
  it('floor applied', () => {
    const t = dailyTargets({ tdee: 1900, bmr: 1500, deficit: 500, gender: 'male', weightKg: 80, proteinPerKg: 1.8 });
    expect(t.calories).toBe(1500);
    expect(t.floorApplied).toBe(true);
    expect(t.proteinG).toBeCloseTo(144);
  });
  it('deficit capped at 1%/week (A7): 60 kg → 660', () => {
    expect(maxSafeDeficit(60)).toBeCloseTo(660);
    const t = dailyTargets({ tdee: 2200, bmr: 1300, deficit: 1000, gender: 'female', weightKg: 60, proteinPerKg: 1.8 });
    expect(t.deficitApplied).toBeCloseTo(660);
    expect(t.deficitCapped).toBe(true);
    expect(t.calories).toBeCloseTo(1540);
  });
  it('age', () => expect(ageInYears(at('1996-10-20'), at('2026-10-19'))).toBe(29));
});

describe('exercise (Net MET)', () => {
  it('gross 270.9 / net 207.9', () => {
    const k = exerciseKcal(4.3, 80, 45);
    expect(k.gross).toBeCloseTo(270.9, 1);
    expect(k.net).toBeCloseTo(207.9, 1);
  });
  it('net never negative', () => expect(exerciseKcal(0.9, 80, 10).net).toBe(0));
});

describe('meal timing (matches the DB generated column)', () => {
  it('23:30 → 00:30 = +60, late 90, early −30', () => {
    expect(clockDriftMin('23:30', '00:30')).toBe(60);
    expect(clockDriftMin('13:00', '14:30')).toBe(90);
    expect(clockDriftMin('08:00', '07:30')).toBe(-30);
  });
  it('tones: ≤30 brand, ≤90 warning, >90 danger', () =>
    expect([driftTone(-30), driftTone(90), driftTone(91)]).toEqual(['brand', 'warning', 'danger']));
});

describe('nutrition', () => {
  it('per_100g', () => expect(portionNutrition({ basis: 'per_100g', calories: 165, protein: 31 }, 150)).toMatchObject({ calories: 247.5, protein: 46.5, carbs: null }));
  it('per_unit', () => expect(portionNutrition({ basis: 'per_unit', calories: 72, protein: 6.3, fat: 5 }, 2)).toMatchObject({ calories: 144, protein: 12.6, fat: 10 }));
});

describe('beverages (user-defined drinks)', () => {
  const coffee = { byCoffeeWeight: true, caffeineMgPer100ml: 40, kcalPer100ml: 0, proteinGPer100ml: 0 };
  const tea = { byCoffeeWeight: false, caffeineMgPer100ml: 20, kcalPer100ml: 0, proteinGPer100ml: 0 };
  const juice = { byCoffeeWeight: false, caffeineMgPer100ml: 0, kcalPer100ml: 45, proteinGPer100ml: 0.7 };
  it('caffeine by weight 18 g × 11 = 198', () =>
    expect(beverageMetrics({ drink: coffee, volumeMl: 200, dryCoffeeG: 18, milkType: 'none', milkMl: 0, sugarTsp: 0 }).caffeineMg).toBe(198));
  it('coffee without grams falls back to mg per 100 ml', () =>
    expect(beverageMetrics({ drink: coffee, volumeMl: 240, dryCoffeeG: null, milkType: 'none', milkMl: 0, sugarTsp: 0 }).caffeineMg).toBeCloseTo(96));
  it('caffeine by volume: 240 ml × 20/100 = 48', () =>
    expect(beverageMetrics({ drink: tea, volumeMl: 240, milkType: 'none', milkMl: 0, sugarTsp: 0 }).caffeineMg).toBeCloseTo(48));
  it('grams ignored for non-coffee drinks', () =>
    expect(beverageMetrics({ drink: tea, volumeMl: 100, dryCoffeeG: 18, milkType: 'none', milkMl: 0, sugarTsp: 0 }).caffeineMg).toBeCloseTo(20));
  it('drink own calories and protein: 250 ml juice = 112.5 kcal, 1.75 g', () => {
    const m = beverageMetrics({ drink: juice, volumeMl: 250, milkType: 'none', milkMl: 0, sugarTsp: 0 });
    expect(m.baseKcal).toBeCloseTo(112.5);
    expect(m.proteinG).toBeCloseTo(1.75);
  });
  it('sugar 2 tsp = 33.6 kcal', () =>
    expect(beverageMetrics({ drink: tea, volumeMl: 0, milkType: 'none', milkMl: 0, sugarTsp: 2 }).sugarKcal).toBeCloseTo(33.6));
  it('milk 200 ml whole: 124 kcal, 6.6 g protein (A9); totals add up', () => {
    const m = beverageMetrics({ drink: juice, volumeMl: 100, milkType: 'whole', milkMl: 200, sugarTsp: 1 });
    expect(m.milkKcal).toBeCloseTo(124);
    expect(m.milkProteinG).toBeCloseTo(6.6);
    expect(m.totalKcal).toBeCloseTo(45 + 124 + 16.8);
    expect(m.proteinG).toBeCloseTo(0.7 + 6.6);
  });
  it('milk ignored when type is none', () =>
    expect(beverageMetrics({ drink: tea, volumeMl: 30, milkType: 'none', milkMl: 100, sugarTsp: 0 }).milkProteinG).toBe(0));
});

describe('caffeine kinetics', () => {
  const bed = at('2026-01-01T23:00:00Z');
  it('200 mg after 10 h, T½ 5 → 50', () => expect(residualCaffeineMg([{ mg: 200, at: at('2026-01-01T13:00:00Z') }], bed, 5)).toBeCloseTo(50));
  it('ignores future doses', () => expect(residualCaffeineMg([{ mg: 200, at: at('2026-01-02T01:00:00Z') }], bed)).toBe(0));
  it('latest dose with prior dose: 15:39 (A11)', () => {
    const t = latestDoseTime({ doses: [{ mg: 198, at: at('2026-01-01T09:00:00Z') }], bedAt: bed, nextDoseMg: 198 });
    expect(t!.toISOString().slice(11, 16)).toBe('15:39');
  });
  it('latest dose without prior doses: 18:04', () => {
    const t = latestDoseTime({ doses: [], bedAt: bed, nextDoseMg: 198 });
    expect(t!.toISOString().slice(11, 16)).toBe('18:04');
  });
  it('small dose fits until bedtime', () => expect(latestDoseTime({ doses: [], bedAt: bed, nextDoseMg: 50 })).toEqual(bed));
  it('no room left → null', () => expect(latestDoseTime({ doses: [{ mg: 400, at: at('2026-01-01T20:00:00Z') }], bedAt: bed, nextDoseMg: 50 })).toBeNull());
  it('levels', () => expect([caffeineLevel(20), caffeineLevel(80), caffeineLevel(150)]).toEqual(['low', 'moderate', 'high']));
});

describe('anthropometry', () => {
  it('WHR 0.90 → high (male)', () => {
    expect(whr(90, 100)).toBeCloseTo(0.9);
    expect(whrRisk(0.9, 'male')).toBe('high');
    expect(whrRisk(0.84, 'female')).toBe('normal');
  });
  it('WHtR 0.50', () => {
    expect(whtr(90, 180)).toBeCloseTo(0.5);
    expect([whtrRisk(0.45), whtrRisk(0.5), whtrRisk(0.65)]).toEqual(['healthy', 'increased', 'high']);
  });
  it('Navy male ≈ 19.9%', () => expect(navyBodyFat({ gender: 'male', heightCm: 180, waistCm: 90, neckCm: 38 })!).toBeCloseTo(19.9, 0));
  it('Navy female', () => expect(navyBodyFat({ gender: 'female', heightCm: 165, waistCm: 75, hipCm: 100, neckCm: 33 })!).toBeGreaterThan(20));
  it('Navy without neck → null (A10)', () => expect(navyBodyFat({ gender: 'male', heightCm: 180, waistCm: 90, neckCm: null })).toBeNull());
  it('Navy female without hip → null', () => expect(navyBodyFat({ gender: 'female', heightCm: 165, waistCm: 75, neckCm: 33 })).toBeNull());
  it('Navy invalid log input → null', () => expect(navyBodyFat({ gender: 'male', heightCm: 180, waistCm: 30, neckCm: 38 })).toBeNull());
  it('ACE categories', () => {
    expect(bodyFatCategory(16, 'male')).toBe('fitness');
    expect(bodyFatCategory(26, 'male')).toBe('obese');
    expect(bodyFatCategory(12, 'female')).toBe('essential');
    expect(bodyFatCategory(10, 'male')).toBe('athlete');
    expect(bodyFatCategory(28, 'female')).toBe('average');
  });
});

describe('sleep', () => {
  it('metrics', () => {
    const m = sleepMetrics({ bed: at('2026-01-01T23:00:00Z'), onset: at('2026-01-01T23:20:00Z'), wake: at('2026-01-02T07:00:00Z'), wasoMin: 20 });
    expect(m).toMatchObject({ tibMin: 480, latencyMin: 20, tstMin: 440 });
    expect(m.efficiencyPct).toBeCloseTo(91.67, 1);
  });
  it('social jet lag across midnight', () => {
    expect(socialJetLagH([180, 180], [300])).toBeCloseTo(2);
    expect(socialJetLagH([1430], [10])).toBeCloseTo(1 / 3);
    expect(socialJetLagH([], [10])).toBeNull();
  });
});

describe('weigh-in protocol', () => {
  const base = { measuredAt: at('2026-01-02T07:00:00Z'), bathroomDone: true, noFluidsBefore: true };
  it('12 h fast → non-compliant', () => {
    const r = protocolCompliance({ ...base, lastMealAt: at('2026-01-01T19:00:00Z') }, 14);
    expect(r.compliant).toBe(false);
    expect(r.fastingH).toBeCloseTo(12);
    expect(r.violations).toHaveLength(1);
  });
  it('all conditions met → compliant', () =>
    expect(protocolCompliance({ ...base, lastMealAt: at('2026-01-01T16:00:00Z') }, 14)).toMatchObject({ compliant: true, violations: [] }));
  it('bathroom / fluids violations', () =>
    expect(protocolCompliance({ ...base, bathroomDone: false, noFluidsBefore: false, lastMealAt: at('2026-01-01T16:00:00Z') }).violations).toHaveLength(2));
});

describe('weight trend & feedback loop', () => {
  it('EMA consecutive days [80, 79.9, 79.86]', () => {
    const t = emaTrend([{ day: 0, weight: 80 }, { day: 1, weight: 79 }, { day: 2, weight: 79.5 }], 0.1);
    expect(t[1]).toBeCloseTo(79.9);
    expect(t[2]).toBeCloseTo(79.86);
  });
  it('time-aware EMA with 7-day gap → 79.478 (A5)', () =>
    expect(emaTrend([{ day: 0, weight: 80 }, { day: 7, weight: 79 }], 0.1)[1]).toBeCloseTo(79.478, 3));
  it('expected loss 7 × 500 = 0.4545', () => expect(expectedLossKg(Array(7).fill(500))).toBeCloseTo(0.4545, 4));
  it('OLS slope and observed TDEE = 2550 (A1)', () => {
    const pts = Array.from({ length: 15 }, (_, d) => ({ day: d, weight: 80 - (0.5 / 7) * d }));
    const s = linearSlope(pts)!;
    expect(s).toBeCloseTo(-0.071429, 5);
    expect(observedTdee({ avgIntake: 2000, slopeKgPerDay: s })).toBeCloseTo(2550);
  });
  it('OLS degenerate inputs', () => {
    expect(linearSlope([{ day: 0, weight: 80 }])).toBeNull();
    expect(linearSlope([{ day: 3, weight: 80 }, { day: 3, weight: 79 }])).toBeNull();
  });
  it('blended TDEE β=0.5 → 2300', () => expect(blendedTdee(2200, 2400, 28)).toBeCloseTo(2300));
  it('observed TDEE ignored before 14 days', () => {
    expect(blendedTdee(2200, 2400, 10)).toBe(2200);
    expect(blendedTdee(2200, null, 30)).toBe(2200);
    expect(blendBeta(100)).toBe(0.7);
    expect(blendBeta(5)).toBe(0);
  });
  it('dayNumber difference', () => expect(dayNumber('2026-10-19') - dayNumber('2026-10-12')).toBe(7));
});
