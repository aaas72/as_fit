import { sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { mockIntake } from '@/server/mock/mock-data';
import { MOCK_MODE } from '@/server/mock/mode';

export type IntakeRow = {
  date: string;
  foodKcal: number;
  beverageKcal: number;
  totalKcal: number;
  totalProteinG: number;
  caffeineMg: number;
  exerciseNetKcal: number;
  exerciseGrossKcal: number;
  intakeComplete: boolean;
};

type Raw = Record<string, string | boolean | null>;

export async function getIntake(userId: number, from: string, to: string): Promise<Map<string, IntakeRow>> {
  if (MOCK_MODE) return mockIntake(from, to);
  const rows = (await db.execute(sql`
    SELECT log_date::text AS date, food_kcal, beverage_kcal, total_intake_kcal, total_protein_g, caffeine_mg,
           exercise_net_kcal, exercise_gross_kcal, intake_complete
    FROM v_daily_intake
    WHERE user_id = ${userId} AND log_date BETWEEN ${from} AND ${to}
  `)) as unknown as Raw[];
  return new Map(rows.map((r) => [String(r.date), {
    date: String(r.date),
    foodKcal: Number(r.food_kcal),
    beverageKcal: Number(r.beverage_kcal),
    totalKcal: Number(r.total_intake_kcal),
    totalProteinG: Number(r.total_protein_g),
    caffeineMg: Number(r.caffeine_mg),
    exerciseNetKcal: Number(r.exercise_net_kcal),
    exerciseGrossKcal: Number(r.exercise_gross_kcal),
    intakeComplete: Boolean(r.intake_complete),
  }]));
}

export const emptyIntake = (date: string): IntakeRow => ({
  date, foodKcal: 0, beverageKcal: 0, totalKcal: 0, totalProteinG: 0, caffeineMg: 0, exerciseNetKcal: 0, exerciseGrossKcal: 0, intakeComplete: false,
});
