import { describe, expect, it } from 'vitest';
import { bmrKatchMcArdle, bmrMifflin, selectBmr } from '@/domain/metabolism';

const person = { weightKg: 80, heightCm: 180, ageYears: 30, gender: 'male' as const };

describe('selectBmr', () => {
  it('uses Mifflin-St Jeor by default', () => {
    expect(selectBmr({ ...person, preferKatchMcArdle: false, bodyFatPct: 20 })).toEqual({ bmr: bmrMifflin(person), formula: 'mifflin' });
  });

  it('uses Katch-McArdle when opted in and body fat is known', () => {
    expect(selectBmr({ ...person, preferKatchMcArdle: true, bodyFatPct: 20 })).toEqual({ bmr: bmrKatchMcArdle(64), formula: 'katch_mcardle' });
  });

  it('falls back to Mifflin when opted in but there is no recent measurement', () => {
    expect(selectBmr({ ...person, preferKatchMcArdle: true, bodyFatPct: null }).formula).toBe('mifflin');
  });

  it('falls back to Mifflin when the body-fat value is implausible', () => {
    expect(selectBmr({ ...person, preferKatchMcArdle: true, bodyFatPct: 85 }).formula).toBe('mifflin');
  });
});
