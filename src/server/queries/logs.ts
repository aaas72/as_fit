import { and, asc, between, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { mockDataset, mockDrinks, mockExerciseCatalog, mockFoods } from '@/server/mock/mock-data';
import { MOCK_MODE } from '@/server/mock/mode';
import type { BeverageView, DrinkView, ExerciseCatalogRow, ExerciseView, FoodView, InsightView, MealView, MeasurementView, ScreenView, SleepView } from './views';

export type { BeverageView, DrinkView, ExerciseCatalogRow, ExerciseView, FoodView, InsightView, MealView, MeasurementView, ScreenView, SleepView } from './views';
import {
  beverageCatalog, beverageLogs, bodyMeasurements, dayStatus, exerciseCatalog, exerciseLogs, foodDictionary, insights,
  mealItems, meals, screenTimeLogs, sleepLogs,
} from '@/server/db/schema';

const n = (v: string | null) => (v == null ? null : Number(v));

// ───────── Meals ─────────
export async function getMealsBetween(userId: number, from: string, to: string): Promise<MealView[]> {
  if (MOCK_MODE) return mockDataset().meals.filter((x) => x.date >= from && x.date <= to);
  const ms = await db.select().from(meals)
    .where(and(eq(meals.userId, userId), between(meals.logDate, from, to)))
    .orderBy(asc(meals.logDate), asc(meals.actualTime));
  if (ms.length === 0) return [];
  const items = await db
    .select({ item: mealItems, food: { nameAr: foodDictionary.itemNameAr, basis: foodDictionary.nutritionBasis } })
    .from(mealItems)
    .innerJoin(foodDictionary, eq(foodDictionary.id, mealItems.foodItemId))
    .where(inArray(mealItems.mealId, ms.map((m) => m.id)));
  return ms.map((m) => {
    const its = items.filter((i) => i.item.mealId === m.id).map((i) => ({
      id: i.item.id,
      foodId: i.item.foodItemId,
      nameAr: i.food.nameAr,
      basis: i.food.basis,
      quantity: Number(i.item.quantity),
      kcal: Number(i.item.calculatedCalories),
      protein: Number(i.item.calculatedProtein),
    }));
    return {
      id: m.id,
      date: m.logDate,
      type: m.mealType,
      scheduledTime: m.scheduledTime?.slice(0, 5) ?? null,
      actualTime: m.actualTime.slice(0, 5),
      driftMin: m.timeDriftMinutes,
      notes: m.notes,
      items: its,
      kcal: its.reduce((s, i) => s + i.kcal, 0),
      protein: its.reduce((s, i) => s + i.protein, 0),
    };
  });
}

// ───────── Beverages ─────────
export async function getBeveragesBetween(userId: number, from: string, to: string): Promise<BeverageView[]> {
  if (MOCK_MODE) return mockDataset().beverages.filter((x) => x.date >= from && x.date <= to);
  const rows = await db.select().from(beverageLogs)
    .where(and(eq(beverageLogs.userId, userId), between(beverageLogs.logDate, from, to)))
    .orderBy(asc(beverageLogs.consumedAt));
  return rows.map((b) => ({
    id: b.id,
    date: b.logDate,
    consumedAt: b.consumedAt,
    beverageId: b.beverageId,
    drinkName: b.drinkName,
    volumeMl: Number(b.liquidVolumeMl),
    dryCoffeeG: n(b.dryCoffeeGrams),
    milkType: b.milkType,
    milkMl: Number(b.milkAddedMl),
    sugarTsp: Number(b.sugarTeaspoons),
    caffeineMg: Number(b.caffeineMg),
    kcal: Number(b.totalCalories),
    proteinG: Number(b.milkProteinG) + Number(b.baseProteinG),
  }));
}

// The user's own drink list (starts empty)
export async function getDrinks(userId: number, opts: { activeOnly?: boolean } = {}): Promise<DrinkView[]> {
  if (MOCK_MODE) return mockDrinks;
  const rows = await db.select().from(beverageCatalog)
    .where(and(eq(beverageCatalog.userId, userId), opts.activeOnly ? eq(beverageCatalog.isActive, true) : undefined))
    .orderBy(asc(beverageCatalog.nameAr));
  return rows.map((d) => ({
    id: d.id, nameAr: d.nameAr, byCoffeeWeight: d.byCoffeeWeight,
    caffeineMgPer100ml: Number(d.caffeineMgPer100ml), kcalPer100ml: Number(d.kcalPer100ml), proteinGPer100ml: Number(d.proteinGPer100ml),
    defaultVolumeMl: Number(d.defaultVolumeMl), defaultCoffeeG: n(d.defaultCoffeeG), isActive: d.isActive,
  }));
}

// ───────── Exercise ─────────
export const getExerciseCatalog = async (): Promise<ExerciseCatalogRow[]> => (MOCK_MODE ? mockExerciseCatalog : db.select().from(exerciseCatalog).orderBy(asc(exerciseCatalog.defaultMet)));

export async function getExercisesBetween(userId: number, from: string, to: string): Promise<ExerciseView[]> {
  if (MOCK_MODE) return mockDataset().exercises.filter((x) => x.date >= from && x.date <= to);
  const rows = await db.select({ log: exerciseLogs, nameAr: exerciseCatalog.nameAr })
    .from(exerciseLogs).innerJoin(exerciseCatalog, eq(exerciseCatalog.id, exerciseLogs.exerciseId))
    .where(and(eq(exerciseLogs.userId, userId), between(exerciseLogs.logDate, from, to)))
    .orderBy(asc(exerciseLogs.logDate), asc(exerciseLogs.id));
  return rows.map(({ log, nameAr }) => ({
    id: log.id, date: log.logDate, nameAr, minutes: log.durationMinutes, met: Number(log.metValue),
    weightKg: Number(log.weightUsedKg), grossKcal: Number(log.grossBurnedKcal), netKcal: Number(log.netBurnedKcal), notes: log.notes,
  }));
}

// ───────── Screen ─────────
export async function getScreenBetween(userId: number, from: string, to: string): Promise<ScreenView[]> {
  if (MOCK_MODE) return mockDataset().screens.filter((x) => x.date >= from && x.date <= to);
  const rows = await db.select().from(screenTimeLogs)
    .where(and(eq(screenTimeLogs.userId, userId), between(screenTimeLogs.logDate, from, to)))
    .orderBy(asc(screenTimeLogs.logDate));
  return rows.map((s) => ({
    date: s.logDate, highFocusH: Number(s.highFocusHours), moderateAdminH: Number(s.moderateAdminHours),
    passiveMediaH: Number(s.passiveMediaHours), totalH: Number(s.totalScreenHours),
  }));
}

// ───────── Sleep (log_date = wake-up date) ─────────
export async function getSleepBetween(userId: number, from: string, to: string): Promise<SleepView[]> {
  if (MOCK_MODE) return mockDataset().sleeps.filter((x) => x.date >= from && x.date <= to);
  const rows = await db.select().from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), between(sleepLogs.logDate, from, to)))
    .orderBy(asc(sleepLogs.logDate));
  return rows.map((s) => ({
    id: s.id, date: s.logDate, bedAt: s.bedTime, onsetAt: s.sleepOnsetTime, wakeAt: s.wakeUpTime,
    interruptions: s.nightInterruptionsCount, wasoMin: s.wasoMinutes, freshness: s.wakeFreshnessScore,
    tibMin: s.timeInBedMin ?? 0, latencyMin: s.sleepLatencyMin ?? 0, tstMin: s.totalSleepMin ?? 0,
  }));
}

// ───────── Measurements ─────────
export async function getMeasurements(userId: number): Promise<MeasurementView[]> {
  if (MOCK_MODE) return mockDataset().measurements; // already latest-first, like the query below
  const rows = await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, userId)).orderBy(desc(bodyMeasurements.logDate));
  return rows.map((m) => ({
    id: m.id, date: m.logDate, neckCm: n(m.neckCm), chestCm: n(m.chestCm), waistCm: Number(m.waistCm), hipCm: Number(m.hipCm),
    thighCm: n(m.thighCm), bicepCm: n(m.bicepCm), whr: Number(m.whr),
  }));
}

// ───────── Foods ─────────
export async function getFoods(opts: { activeOnly?: boolean } = {}): Promise<FoodView[]> {
  if (MOCK_MODE) return mockFoods;
  const rows = await db.select().from(foodDictionary)
    .where(opts.activeOnly ? eq(foodDictionary.isActive, true) : undefined)
    .orderBy(asc(foodDictionary.itemNameAr));
  return rows.map((f) => ({
    id: f.id, nameAr: f.itemNameAr, nameEn: f.itemNameEn, basis: f.nutritionBasis, gramsPerUnit: n(f.gramsPerUnit),
    calories: Number(f.calories), protein: Number(f.proteinG), carbs: n(f.carbsG), fat: n(f.fatG), isActive: f.isActive,
  }));
}

// ───────── Day status ─────────
export async function getDayComplete(userId: number, date: string) {
  if (MOCK_MODE) return mockDataset().complete.has(date);
  const [row] = await db.select().from(dayStatus).where(and(eq(dayStatus.userId, userId), eq(dayStatus.logDate, date)));
  return row?.intakeComplete ?? false;
}

// ───────── Insights ─────────
export async function getInsights(userId: number, opts: { includeDismissed?: boolean; limit?: number } = {}): Promise<InsightView[]> {
  if (MOCK_MODE) return (await import('@/server/mock/insights')).mockInsights(userId, opts.limit);
  const rows = await db.select().from(insights)
    .where(and(eq(insights.userId, userId), opts.includeDismissed ? undefined : isNull(insights.dismissedAt)))
    .orderBy(desc(insights.periodEnd), desc(insights.createdAt))
    .limit(opts.limit ?? 200);
  return rows.map((r) => ({
    id: r.id, ruleCode: r.ruleCode, severity: r.severity, title: r.title, message: r.message,
    payload: r.payload as Record<string, unknown>, periodStart: r.periodStart, periodEnd: r.periodEnd,
    createdAt: r.createdAt, dismissedAt: r.dismissedAt,
  }));
}
