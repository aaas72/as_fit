import { KCAL_PER_GRAM_CARB, MILK_KCAL_PER_ML, MILK_PROTEIN_G_PER_ML, SUGAR_GRAMS_PER_TSP, type MilkType } from './constants';

export const DRINK_TYPES = [
  'coffee_brewed', 'coffee_turkish', 'coffee_instant', 'espresso',
  'tea_black', 'tea_green', 'water', 'soda_zero', 'herbal',
] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

// Used only when ground-coffee weight is not given
export const CAFFEINE_MG_PER_ML: Record<DrinkType, number> = {
  coffee_brewed: 0.40, coffee_turkish: 0.40, coffee_instant: 0.27, espresso: 2.10,
  tea_black: 0.20, tea_green: 0.12, soda_zero: 0.10, water: 0, herbal: 0,
};

export const COFFEE_BY_WEIGHT = new Set<DrinkType>(['coffee_brewed', 'coffee_turkish', 'espresso']);

export function beverageMetrics(b: {
  drinkType: DrinkType; volumeMl: number; dryCoffeeG?: number | null;
  milkType: MilkType; milkMl: number; sugarTsp: number;
}, caffeineMgPerG = 11) {
  const caffeineMg = COFFEE_BY_WEIGHT.has(b.drinkType) && b.dryCoffeeG
    ? b.dryCoffeeG * caffeineMgPerG
    : b.volumeMl * CAFFEINE_MG_PER_ML[b.drinkType];
  const milkMl = b.milkType === 'none' ? 0 : b.milkMl;
  const milkKcal = milkMl * MILK_KCAL_PER_ML[b.milkType];
  const milkProteinG = milkMl * MILK_PROTEIN_G_PER_ML;
  const sugarKcal = b.sugarTsp * SUGAR_GRAMS_PER_TSP * KCAL_PER_GRAM_CARB;
  return { caffeineMg, milkKcal, milkProteinG, sugarKcal, totalKcal: milkKcal + sugarKcal };
}
