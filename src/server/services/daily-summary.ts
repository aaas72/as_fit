import { residualCaffeineMg } from '@/domain/caffeine-kinetics';
import { addDaysIso, todayIn, zonedDateTime } from '@/lib/time';
import { getBeveragesBetween, getDayComplete, getExercisesBetween, getInsights, getMealsBetween } from '@/server/queries/logs';
import { getTimezone } from '@/server/queries/profile';
import { loadModel } from './metabolic-model';

// Everything the dashboard needs for one local day. TDEE and deficit are computed on demand, never stored.
export async function getDailySummary(userId: number, date?: string) {
  const tz = await getTimezone(userId);
  const today = date ?? todayIn(tz);
  const yesterday = addDaysIso(today, -1);

  const [model, bevs, todaysMeals, exercises, complete, latestInsights] = await Promise.all([
    loadModel(userId, addDaysIso(today, -6), today),
    getBeveragesBetween(userId, yesterday, today),
    getMealsBetween(userId, yesterday, today),
    getExercisesBetween(userId, today, today),
    getDayComplete(userId, today),
    getInsights(userId, { limit: 3 }),
  ]);
  if (!model) return null;

  const day = model.days[model.days.length - 1]!;
  const now = new Date();
  const caffeineNowMg = residualCaffeineMg(bevs.map((b) => ({ mg: b.caffeineMg, at: b.consumedAt })), now, model.settings.caffeineHalfLifeH);

  // Fasting progress: hours since the latest logged meal (yesterday or today)
  const mealInstants = todaysMeals.map((m) => zonedDateTime(m.date, m.actualTime, tz)).filter((d) => d <= now);
  const lastMealAt = mealInstants.sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const fastingH = lastMealAt ? (now.getTime() - lastMealAt.getTime()) / 3.6e6 : null;

  const lastWeighIn = [...model.weighIns].reverse()[0] ?? null;
  const prevTrend = [...model.weighIns].reverse().find((w) => w.trend != null && lastWeighIn && w.date < lastWeighIn.date)?.trend ?? null;

  return {
    date: today,
    timezone: tz,
    profile: model.profile,
    settings: model.settings,
    day,
    week: model.days,
    observed: model.observed,
    currentWeightKg: model.currentWeightKg,
    caffeineTodayMg: bevs.filter((b) => b.date === today).reduce((s, b) => s + b.caffeineMg, 0),
    caffeineNowMg,
    fastingH,
    lastMealAt,
    lastWeighIn,
    trendDeltaKg: lastWeighIn?.trend != null && prevTrend != null ? lastWeighIn.trend - prevTrend : null,
    exercisesToday: exercises,
    mealsToday: todaysMeals.filter((m) => m.date === today),
    intakeComplete: complete,
    latestInsights,
  };
}
export type DailySummary = NonNullable<Awaited<ReturnType<typeof getDailySummary>>>;
