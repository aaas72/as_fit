import { describe, expect, it } from 'vitest';
import { profileSchema } from '@/lib/validation/schemas';

const base = {
  displayName: 'سالم', gender: 'male', birthDate: '1995-05-10', heightCm: 178,
  initialWeightKg: 88, targetWeightKg: 78, activityFactor: 1.2, timezone: 'Europe/Istanbul',
  plannedDeficit: 500, proteinPerKg: 1.8, useNetMet: true, caffeineMgPerG: 11, caffeineHalfLifeH: 5,
  requiredFastingHours: 14, kcalPerKg: 7700, emaAlpha: 0.1,
};

describe('profileSchema: target weight vs planned deficit', () => {
  it('accepts a loss goal with a deficit', () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
  });

  it('accepts maintenance (target = start) with or without a deficit', () => {
    expect(profileSchema.safeParse({ ...base, targetWeightKg: 88 }).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, targetWeightKg: 88, plannedDeficit: 0 }).success).toBe(true);
  });

  it('accepts a gain goal with no deficit', () => {
    expect(profileSchema.safeParse({ ...base, targetWeightKg: 95, plannedDeficit: 0 }).success).toBe(true);
  });

  it('rejects a gain goal with a deficit, on the deficit field', () => {
    const result = profileSchema.safeParse({ ...base, targetWeightKg: 95, plannedDeficit: 300 });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.plannedDeficit?.[0]).toContain('اجعل العجز اليومي 0');
  });
});
