import type { DrinkType } from '@/domain/beverages';

export const MEAL_LABEL = { breakfast: 'فطور', lunch: 'غداء', dinner: 'عشاء', snack: 'وجبة خفيفة' } as const;

export const DRINK_LABEL: Record<DrinkType, string> = {
  coffee_brewed: 'قهوة مقطّرة', coffee_turkish: 'قهوة تركية/عربية', coffee_instant: 'قهوة سريعة التحضير',
  espresso: 'إسبريسو', tea_black: 'شاي أسود', tea_green: 'شاي أخضر',
  water: 'ماء', soda_zero: 'مشروب غازي بلا سكر', herbal: 'أعشاب',
};

export const MILK_LABEL = { none: 'بدون', whole: 'كامل الدسم', semi_skimmed: 'نصف دسم', skimmed: 'خالي الدسم' } as const;

export const BASIS_LABEL = { per_100g: 'لكل 100 غ', per_100ml: 'لكل 100 مل', per_unit: 'لكل حبة' } as const;

export const SEVERITY_LABEL = { info: 'معلومة', warning: 'تحذير', critical: 'حرج' } as const;

export const GENDER_LABEL = { male: 'ذكر', female: 'أنثى' } as const;
