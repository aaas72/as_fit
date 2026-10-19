// Read-model shapes returned by src/server/queries (from the database or, in mock mode, from src/server/mock).
import type { MilkType } from '@/domain/constants';
import type { Basis } from '@/domain/nutrition';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealView = {
  id: number; date: string; type: MealType; scheduledTime: string | null; actualTime: string; driftMin: number | null; notes: string | null;
  items: { id: number; foodId: number; nameAr: string; basis: Basis; quantity: number; kcal: number; protein: number }[];
  kcal: number; protein: number;
};

export type BeverageView = {
  id: number; date: string; consumedAt: Date; beverageId: number | null; drinkName: string; volumeMl: number; dryCoffeeG: number | null;
  milkType: MilkType; milkMl: number; sugarTsp: number; caffeineMg: number; kcal: number; proteinG: number;
};

export type DrinkView = {
  id: number; nameAr: string; byCoffeeWeight: boolean; caffeineMgPer100ml: number; kcalPer100ml: number; proteinGPer100ml: number;
  defaultVolumeMl: number; defaultCoffeeG: number | null; isActive: boolean;
};

export type ExerciseCatalogRow = { id: number; code: string; nameAr: string; defaultMet: string; compendiumRef: string | null };

export type ExerciseView = {
  id: number; date: string; nameAr: string; minutes: number; met: number; weightKg: number; grossKcal: number; netKcal: number; notes: string | null;
};

export type ScreenView = { date: string; highFocusH: number; moderateAdminH: number; passiveMediaH: number; totalH: number };

export type SleepView = {
  id: number; date: string; bedAt: Date; onsetAt: Date; wakeAt: Date; interruptions: number; wasoMin: number; freshness: number;
  tibMin: number; latencyMin: number; tstMin: number;
};

export type MeasurementView = {
  id: number; date: string; neckCm: number | null; chestCm: number | null; waistCm: number; hipCm: number;
  thighCm: number | null; bicepCm: number | null; whr: number;
};

export type FoodView = {
  id: number; nameAr: string; nameEn: string | null; basis: Basis; gramsPerUnit: number | null;
  calories: number; protein: number; carbs: number | null; fat: number | null; isActive: boolean;
};

export type InsightView = {
  id: number; ruleCode: string; severity: 'info' | 'warning' | 'critical'; title: string; message: string; payload: Record<string, unknown>;
  periodStart: string; periodEnd: string; createdAt: Date; dismissedAt: Date | null;
};
