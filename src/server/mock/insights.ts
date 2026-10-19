// Insights in mock mode: the real rule engine runs on mock data at read time (nothing is stored).
import { runRules } from '@/domain/insights/engine';
import { addDaysIso } from '@/lib/time';
import type { InsightView } from '@/server/queries/views';
import { buildPeriodContext } from '@/server/services/insights-runner';
import { MOCK_DAYS, mockDataset } from './mock-data';

export async function mockInsights(userId: number, limit = 200): Promise<InsightView[]> {
  const { today } = mockDataset();
  const seen = new Map<string, InsightView>();
  // Evaluate weekly windows across the mock history, as if the app had been running all along
  for (let back = 0; back < MOCK_DAYS - 28; back += 7) {
    const ctx = await buildPeriodContext(userId, addDaysIso(today, -back));
    if (!ctx) continue;
    for (const r of runRules(ctx)) {
      const key = `${r.ruleCode}|${r.periodStart}|${r.periodEnd}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: seen.size + 1, ruleCode: r.ruleCode, severity: r.severity, title: r.title, message: r.message, payload: r.payload,
          periodStart: r.periodStart, periodEnd: r.periodEnd, createdAt: new Date(`${r.periodEnd}T08:00:00Z`), dismissedAt: null,
        });
      }
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || a.ruleCode.localeCompare(b.ruleCode))
    .slice(0, limit);
}
