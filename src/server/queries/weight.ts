import { asc, eq } from 'drizzle-orm';
import { dayNumber, emaTrend } from '@/domain/weight-trend';
import { db } from '@/server/db/client';
import { weighIns } from '@/server/db/schema';

export type WeighInRow = {
  id: number;
  date: string;
  measuredAt: Date;
  weight: number;
  fastingH: number;
  compliant: boolean;
  official: boolean;
  highSodium: boolean;
  normalDigestion: boolean;
  trend: number | null; // EMA of compliant readings up to this date (null before the first one)
};

// All readings with the time-aware EMA of compliant readings attached.
export async function getWeighIns(userId: number, alpha: number): Promise<WeighInRow[]> {
  const rows = await db.select().from(weighIns).where(eq(weighIns.userId, userId)).orderBy(asc(weighIns.logDate));
  const compliant = rows.filter((r) => r.isProtocolCompliant);
  const trend = emaTrend(compliant.map((r) => ({ day: dayNumber(r.logDate), weight: Number(r.dryFastedWeightKg) })), alpha);
  const trendByDate = new Map(compliant.map((r, i) => [r.logDate, trend[i]!]));

  let last: number | null = null;
  return rows.map((r) => {
    last = trendByDate.get(r.logDate) ?? last;
    return {
      id: r.id,
      date: r.logDate,
      measuredAt: r.measuredAt,
      weight: Number(r.dryFastedWeightKg),
      fastingH: Number(r.fastingHours),
      compliant: r.isProtocolCompliant,
      official: r.isOfficialWeekly,
      highSodium: r.highSodiumYesterday,
      normalDigestion: r.normalDigestion,
      trend: last,
    };
  });
}

// Weight used in calculations = latest compliant EMA; falls back to the initial weight
export function trendWeightAt(rows: WeighInRow[], date: string, fallback: number) {
  let w: number | null = null;
  for (const r of rows) {
    if (r.date > date) break;
    if (r.trend != null) w = r.trend;
  }
  return w ?? fallback;
}
