import { describe, expect, it } from 'vitest';
import { navyBodyFat } from '@/domain/anthropometry';
import { bmrKatchMcArdle, bmrMifflin, leanBodyMassKg } from '@/domain/metabolism';

describe('leanBodyMassKg', () => {
  it('removes the fat fraction from total weight', () => {
    expect(leanBodyMassKg(80, 20)).toBeCloseTo(64);
    expect(leanBodyMassKg(65, 30)).toBeCloseTo(45.5);
  });

  it.each([1.9, 70.1, -5, Number.NaN])('returns null for an implausible body-fat %s%', (pct) => {
    expect(leanBodyMassKg(80, pct)).toBeNull();
  });
});

describe('bmrKatchMcArdle', () => {
  it('matches the published formula 370 + 21.6 × LBM', () => {
    expect(bmrKatchMcArdle(64)).toBeCloseTo(1752.4);
    expect(bmrKatchMcArdle(45.5)).toBeCloseTo(1352.8);
  });

  it('stays close to Mifflin-St Jeor for an average adult', () => {
    const mifflin = bmrMifflin({ weightKg: 80, heightCm: 180, ageYears: 30, gender: 'male' }); // 1780
    const katch = bmrKatchMcArdle(leanBodyMassKg(80, 20)!);
    expect(Math.abs(katch - mifflin) / mifflin).toBeLessThan(0.1);
  });

  it('is higher than Mifflin for a lean, muscular person of the same weight', () => {
    const mifflin = bmrMifflin({ weightKg: 90, heightCm: 180, ageYears: 30, gender: 'male' });
    expect(bmrKatchMcArdle(leanBodyMassKg(90, 10)!)).toBeGreaterThan(mifflin);
  });

  it('chains with the US Navy body-fat estimate', () => {
    const bf = navyBodyFat({ gender: 'male', heightCm: 180, waistCm: 86, neckCm: 39 });
    expect(bf).not.toBeNull();
    const lbm = leanBodyMassKg(82, bf!);
    expect(lbm).not.toBeNull();
    expect(bmrKatchMcArdle(lbm!)).toBeGreaterThan(1500);
    expect(bmrKatchMcArdle(lbm!)).toBeLessThan(2100);
  });
});
