export type Basis = 'per_100g' | 'per_100ml' | 'per_unit';

export type FoodNutrition = { basis: Basis; calories: number; protein: number; carbs?: number | null; fat?: number | null };

// quantity: grams (per_100g), ml (per_100ml) or number of units (per_unit)
export function portionNutrition(food: FoodNutrition, quantity: number) {
  const factor = food.basis === 'per_unit' ? quantity : quantity / 100;
  const scale = (v: number | null | undefined) => (v == null ? null : v * factor);
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: scale(food.carbs),
    fat: scale(food.fat),
  };
}

export const QUANTITY_UNIT: Record<Basis, string> = { per_100g: 'غ', per_100ml: 'مل', per_unit: 'حبة' };
