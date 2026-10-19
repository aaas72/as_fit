export const KCAL_PER_KG_FAT_DEFAULT = 7700;
export const SUGAR_GRAMS_PER_TSP = 4.2;
export const KCAL_PER_GRAM_CARB = 4;
export const MILK_KCAL_PER_ML = { none: 0, whole: 0.62, semi_skimmed: 0.46, skimmed: 0.35 } as const;
export const MILK_PROTEIN_G_PER_ML = 0.033; // USDA FoodData Central: ~3.3 g/100 ml for cow's milk
export const MIN_INTAKE_KCAL = { male: 1500, female: 1200 } as const;
export const SAFE_WEEKLY_LOSS_PCT = { min: 0.005, max: 0.01 } as const; // 0.5%–1% of body weight
export const AGGRESSIVE_DEFICIT_GRACE_DAYS = 14; // early glycogen + water loss (S5)
export const OBSERVED_TDEE_MIN_DAYS = 14;
export const CAFFEINE_BEDTIME_LIMIT_MG = 100;
export const CAFFEINE_DAILY_SAFE_MG = 400; // EFSA 2015

export type Gender = 'male' | 'female';
export type MilkType = keyof typeof MILK_KCAL_PER_ML;
