import { z } from 'zod';
import { bool, clockTime, int, isoDate, localDateTime, num, optionalNum } from './common';

const optionalClock = z.union([clockTime, z.literal('')]).optional();

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const MILK_TYPES = ['none', 'whole', 'semi_skimmed', 'skimmed'] as const;
export const BASES = ['per_100g', 'per_100ml', 'per_unit'] as const;

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'مطلوب').max(80),
  gender: z.enum(['male', 'female']),
  birthDate: isoDate,
  heightCm: num(100, 250),
  initialWeightKg: num(30, 300),
  targetWeightKg: num(30, 300),
  activityFactor: num(1, 2.5),
  timezone: z.string().min(1).max(64),
  plannedDeficit: int(0, 1200),
  proteinPerKg: num(0.8, 3),
  useNetMet: bool,
  caffeineMgPerG: num(5, 25),
  caffeineHalfLifeH: num(2, 10),
  requiredFastingHours: int(8, 24),
  kcalPerKg: int(5000, 9000),
  emaAlpha: num(0.01, 0.99),
  breakfastTime: optionalClock,
  lunchTime: optionalClock,
  dinnerTime: optionalClock,
});
export type ProfileInput = z.input<typeof profileSchema>;

export const mealSchema = z.object({
  logDate: isoDate,
  mealType: z.enum(MEAL_TYPES),
  actualTime: clockTime,
  notes: z.string().max(500).optional(),
  items: z.array(z.object({ foodId: int(1, 1e9), quantity: num(0.1, 5000) })).min(1, 'أضف صنفاً واحداً على الأقل'),
});
export type MealInput = z.input<typeof mealSchema>;

export const beverageSchema = z.object({
  logDate: isoDate,
  time: clockTime,
  beverageId: int(1, 1e9),
  volumeMl: num(0, 3000),
  dryCoffeeG: optionalNum(0, 100),
  milkType: z.enum(MILK_TYPES),
  milkMl: num(0, 1000),
  sugarTsp: num(0, 20),
});
export type BeverageInput = z.input<typeof beverageSchema>;

// A drink in the user's own list (values per 100 ml of the drink itself)
export const drinkSchema = z.object({
  id: optionalNum(1, 1e9),
  nameAr: z.string().trim().min(1, 'مطلوب').max(120),
  byCoffeeWeight: bool,
  caffeineMgPer100ml: num(0, 1000),
  kcalPer100ml: num(0, 1000),
  proteinGPer100ml: num(0, 100),
  defaultVolumeMl: num(1, 3000),
  defaultCoffeeG: optionalNum(0, 100),
});
export type DrinkInput = z.input<typeof drinkSchema>;

export const exerciseSchema = z.object({
  logDate: isoDate,
  exerciseId: int(1, 1e9),
  durationMinutes: int(1, 600),
  metOverride: optionalNum(1.1, 20),
  notes: z.string().max(500).optional(),
});
export type ExerciseInput = z.input<typeof exerciseSchema>;

export const screenSchema = z.object({
  logDate: isoDate,
  highFocusHours: num(0, 24),
  moderateAdminHours: num(0, 24),
  passiveMediaHours: num(0, 24),
}).refine((v) => v.highFocusHours + v.moderateAdminHours + v.passiveMediaHours <= 24, {
  message: 'مجموع الساعات لا يتجاوز 24', path: ['passiveMediaHours'],
});
export type ScreenInput = z.input<typeof screenSchema>;

export const sleepSchema = z.object({
  bedTime: localDateTime,
  sleepOnsetTime: localDateTime,
  wakeUpTime: localDateTime,
  nightInterruptions: int(0, 50),
  wasoMinutes: int(0, 600),
  freshness: int(1, 5),
}).refine((v) => v.bedTime <= v.sleepOnsetTime, { message: 'بدء النوم بعد وقت الدخول للفراش', path: ['sleepOnsetTime'] })
  .refine((v) => v.sleepOnsetTime < v.wakeUpTime, { message: 'الاستيقاظ بعد بدء النوم', path: ['wakeUpTime'] });
export type SleepInput = z.input<typeof sleepSchema>;

export const weighInSchema = z.object({
  measuredAt: localDateTime,
  lastMealAt: localDateTime,
  weightKg: num(30, 300),
  bathroomDone: bool,
  noFluidsBefore: bool,
  highSodiumYesterday: bool,
  normalDigestion: bool,
  isOfficialWeekly: bool,
});
export type WeighInInput = z.input<typeof weighInSchema>;

export const measurementsSchema = z.object({
  logDate: isoDate,
  neckCm: optionalNum(20, 70),
  chestCm: optionalNum(50, 200),
  waistCm: num(40, 250),
  hipCm: num(50, 250),
  thighCm: optionalNum(20, 120),
  bicepCm: optionalNum(15, 70),
});
export type MeasurementsInput = z.input<typeof measurementsSchema>;

export const foodSchema = z.object({
  id: optionalNum(1, 1e9),
  itemNameAr: z.string().trim().min(1, 'مطلوب').max(120),
  itemNameEn: z.string().trim().max(120).optional(),
  nutritionBasis: z.enum(BASES),
  gramsPerUnit: optionalNum(0.1, 5000),
  calories: num(0, 5000), // per_unit items (a whole dish) can exceed 1000
  proteinG: num(0, 500),
  carbsG: optionalNum(0, 1000),
  fatG: optionalNum(0, 500),
});
export type FoodInput = z.input<typeof foodSchema>;

export const dayCompleteSchema = z.object({ logDate: isoDate, complete: bool });

// Form-side shapes: the user enters clock times only; dates are inferred (src/lib/inputs.ts) before calling the action.
export const sleepClockSchema = z.object({
  wakeDate: isoDate,
  bedClock: clockTime,
  onsetClock: clockTime,
  wakeClock: clockTime,
  nightInterruptions: int(0, 50),
  wasoMinutes: int(0, 600),
  freshness: int(1, 5),
});

export const weighInClockSchema = z.object({
  date: isoDate,
  measuredClock: clockTime,
  lastMealClock: clockTime,
  weightKg: num(30, 300),
  bathroomDone: bool,
  noFluidsBefore: bool,
  highSodiumYesterday: bool,
  normalDigestion: bool,
  isOfficialWeekly: bool,
});
