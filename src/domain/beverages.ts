import { KCAL_PER_GRAM_CARB, MILK_KCAL_PER_ML, MILK_PROTEIN_G_PER_ML, SUGAR_GRAMS_PER_TSP, type MilkType } from './constants';

// A user-defined drink. Values are per 100 ml of the drink itself, before milk and sugar.
export type DrinkDefinition = {
  byCoffeeWeight: boolean;      // caffeine from ground-coffee grams × mg/g when grams are given
  caffeineMgPer100ml: number;   // used when grams are not given (or the drink isn't coffee)
  kcalPer100ml: number;
  proteinGPer100ml: number;
};

export function beverageMetrics(b: {
  drink: DrinkDefinition; volumeMl: number; dryCoffeeG?: number | null;
  milkType: MilkType; milkMl: number; sugarTsp: number;
}, caffeineMgPerG = 11) {
  const caffeineMg = b.drink.byCoffeeWeight && b.dryCoffeeG
    ? b.dryCoffeeG * caffeineMgPerG
    : (b.volumeMl * b.drink.caffeineMgPer100ml) / 100;
  const baseKcal = (b.volumeMl * b.drink.kcalPer100ml) / 100;
  const baseProteinG = (b.volumeMl * b.drink.proteinGPer100ml) / 100;
  const milkMl = b.milkType === 'none' ? 0 : b.milkMl;
  const milkKcal = milkMl * MILK_KCAL_PER_ML[b.milkType];
  const milkProteinG = milkMl * MILK_PROTEIN_G_PER_ML;
  const sugarKcal = b.sugarTsp * SUGAR_GRAMS_PER_TSP * KCAL_PER_GRAM_CARB;
  return { caffeineMg, baseKcal, baseProteinG, milkKcal, milkProteinG, sugarKcal, totalKcal: baseKcal + milkKcal + sugarKcal, proteinG: baseProteinG + milkProteinG };
}

// Reference values shown next to the drink form (approximate, per 100 ml). Not stored: the user decides.
export const CAFFEINE_REFERENCE: { name: string; mgPer100ml: number; note: string }[] = [
  { name: 'قهوة مقطّرة', mgPer100ml: 40, note: '~95 mg / 240 ml' },
  { name: 'قهوة سريعة التحضير', mgPer100ml: 27, note: '~65 mg / 240 ml' },
  { name: 'إسبريسو', mgPer100ml: 210, note: '~63 mg / 30 ml' },
  { name: 'شاي أسود', mgPer100ml: 20, note: '~47 mg / 240 ml' },
  { name: 'شاي أخضر', mgPer100ml: 12, note: '~28 mg / 240 ml' },
  { name: 'كولا', mgPer100ml: 10, note: '~34 mg / 330 ml' },
];
