import { beforeAll, describe, expect, it } from 'vitest';

// Mock mode is read from the environment at import time, so set it before loading the modules.
process.env.USE_MOCK_DATA = 'true';
process.env.DATABASE_URL ??= 'postgres://unused:unused@localhost:1/unused'; // never connected in mock mode

type MockModule = typeof import('@/server/mock/mock-data');
let mock: MockModule;
beforeAll(async () => { mock = await import('@/server/mock/mock-data'); });

describe('mock dataset', () => {
  it('covers 90 days ending today and is deterministic', () => {
    const a = mock.mockDataset();
    expect(a.screens).toHaveLength(mock.MOCK_DAYS);
    expect(a.screens.at(-1)!.date).toBe(a.today);
    expect(mock.mockDataset()).toBe(a); // cached for the same day
  });

  it('daily totals match the individual entries (same rules as v_daily_intake)', () => {
    const ds = mock.mockDataset();
    const day = ds.meals[10]!.date;
    const row = mock.mockIntake(day, day).get(day)!;
    const food = ds.meals.filter((m) => m.date === day).reduce((s, m) => s + m.kcal, 0);
    const bev = ds.beverages.filter((b) => b.date === day).reduce((s, b) => s + b.kcal, 0);
    expect(row.foodKcal).toBeCloseTo(food);
    expect(row.totalKcal).toBeCloseTo(food + bev);
    expect(row.intakeComplete).toBe(ds.complete.has(day));
  });

  it('weight trends down like a real ~0.5 kg/week loss', () => {
    const w = mock.mockDataset().weighIns.filter((x) => x.compliant);
    const first = w.slice(0, 7).reduce((s, x) => s + x.weight, 0) / 7;
    const last = w.slice(-7).reduce((s, x) => s + x.weight, 0) / 7;
    expect(first - last).toBeGreaterThan(4);
    expect(first - last).toBeLessThan(8);
  });

  it('mock mode reads go to the mock data and the real rules produce insights', async () => {
    const { getProfileAndSettings } = await import('@/server/queries/profile');
    expect((await getProfileAndSettings(1))?.profile.displayName).toBe('مستخدم تجريبي');
    const { mockInsights } = await import('@/server/mock/insights');
    const list = await mockInsights(1);
    expect(list.some((i) => i.ruleCode === 'LUNCH_DRIFT')).toBe(true);
    expect(new Set(list.map((i) => `${i.ruleCode}|${i.periodStart}|${i.periodEnd}`)).size).toBe(list.length);
  });
});
