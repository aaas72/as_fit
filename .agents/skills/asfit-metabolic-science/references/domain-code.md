# التنفيذ المرجعي لـ src/domain — AS_FIT

## constants.ts
```ts
export const KCAL_PER_KG_FAT_DEFAULT = 7700;
export const SUGAR_GRAMS_PER_TSP = 4.2;
export const KCAL_PER_GRAM_CARB = 4;
export const MILK_KCAL_PER_ML = { none: 0, whole: 0.62, semi_skimmed: 0.46, skimmed: 0.35 } as const;
export const MILK_PROTEIN_G_PER_ML = 0.033; // USDA FoodData Central: ~3.3 g/100 ml لكل أنواع حليب البقر
export const AGGRESSIVE_DEFICIT_GRACE_DAYS = 14; // فقدان جلايكوجين + ماء في البداية (S5)
export const MIN_INTAKE_KCAL = { male: 1500, female: 1200 } as const;
export const SAFE_WEEKLY_LOSS_PCT = { min: 0.005, max: 0.01 } as const;
```

## age.ts
```ts
import { differenceInYears } from 'date-fns';
export const ageInYears = (birthDate: Date, on: Date) => differenceInYears(on, birthDate);
```

## metabolism.ts
```ts
import { SAFE_WEEKLY_LOSS_PCT } from './constants';

export type Gender = 'male' | 'female';

export function bmrMifflin(p: { weightKg: number; heightCm: number; ageYears: number; gender: Gender }) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears;
  return p.gender === 'male' ? base + 5 : base - 161;
}

export const baseTdee = (bmr: number, activityFactor = 1.2) => bmr * activityFactor;
export const dynamicTdee = (base: number, exerciseKcal: number) => base + exerciseKcal;

// أقصى عجز يومي يحقق نزولاً ≤ 1% من وزن الجسم أسبوعياً (S11)
export const maxSafeDeficit = (weightKg: number, kcalPerKg = 7700) =>
  (SAFE_WEEKLY_LOSS_PCT.max * weightKg * kcalPerKg) / 7;

export function dailyTargets(p: { tdee: number; bmr: number; deficit: number; gender: Gender; weightKg: number; proteinPerKg: number; kcalPerKg?: number }) {
  const floor = Math.max(p.bmr, p.gender === 'male' ? 1500 : 1200);
  const deficit = Math.min(p.deficit, maxSafeDeficit(p.weightKg, p.kcalPerKg));
  return {
    calories: Math.max(p.tdee - deficit, floor),
    proteinG: p.proteinPerKg * p.weightKg,
    deficitApplied: deficit,
    deficitCapped: deficit < p.deficit,
    floorApplied: p.tdee - deficit < floor,
  };
}
```

## exercise.ts
```ts
export function exerciseKcal(met: number, weightKg: number, minutes: number) {
  const perMinute = (m: number) => (m * 3.5 * weightKg) / 200;
  return {
    gross: perMinute(met) * minutes,
    net: perMinute(Math.max(met - 1, 0)) * minutes,
  };
}
```

## nutrition.ts
```ts
export type Basis = 'per_100g' | 'per_100ml' | 'per_unit';
export function portionNutrition(food: { basis: Basis; calories: number; protein: number }, quantity: number) {
  const factor = food.basis === 'per_unit' ? quantity : quantity / 100;
  return { calories: food.calories * factor, protein: food.protein * factor };
}
```

## beverages.ts
```ts
import { MILK_KCAL_PER_ML, MILK_PROTEIN_G_PER_ML, SUGAR_GRAMS_PER_TSP, KCAL_PER_GRAM_CARB } from './constants';

const CAFFEINE_MG_PER_ML: Record<string, number> = {
  coffee_brewed: 0.40, coffee_turkish: 0.40, coffee_instant: 0.27, espresso: 2.10,
  tea_black: 0.20, tea_green: 0.12, soda_zero: 0.10, water: 0, herbal: 0,
};
const COFFEE_TYPES = new Set(['coffee_brewed', 'coffee_turkish', 'espresso']);

export function beverageMetrics(b: {
  drinkType: string; volumeMl: number; dryCoffeeG?: number | null;
  milkType: keyof typeof MILK_KCAL_PER_ML; milkMl: number; sugarTsp: number;
}, caffeineMgPerG = 11) {
  const caffeine = COFFEE_TYPES.has(b.drinkType) && b.dryCoffeeG
    ? b.dryCoffeeG * caffeineMgPerG
    : b.volumeMl * (CAFFEINE_MG_PER_ML[b.drinkType] ?? 0);
  const milkKcal = b.milkMl * MILK_KCAL_PER_ML[b.milkType];
  const milkProteinG = b.milkType === 'none' ? 0 : b.milkMl * MILK_PROTEIN_G_PER_ML;
  const sugarKcal = b.sugarTsp * SUGAR_GRAMS_PER_TSP * KCAL_PER_GRAM_CARB;
  return { caffeineMg: caffeine, milkKcal, milkProteinG, sugarKcal, totalKcal: milkKcal + sugarKcal };
}
```

## caffeine-kinetics.ts
```ts
export function residualCaffeineMg(doses: { mg: number; at: Date }[], at: Date, halfLifeH = 5) {
  return doses
    .filter(d => d.at <= at)
    .reduce((sum, d) => sum + d.mg * Math.pow(0.5, (at.getTime() - d.at.getTime()) / 3.6e6 / halfLifeH), 0);
}

// آخر وقت لجرعة جديدة بحيث يبقى المجموع عند النوم ≤ limitMg، مع احتساب الجرعات السابقة.
// null = المتبقي من الجرعات السابقة وحده يبلغ الحد، فلا جرعة أخرى اليوم.
export function latestDoseTime(p: { doses: { mg: number; at: Date }[]; bedAt: Date; nextDoseMg: number; limitMg?: number; halfLifeH?: number }) {
  const limit = p.limitMg ?? 100, T = p.halfLifeH ?? 5;
  const room = limit - residualCaffeineMg(p.doses, p.bedAt, T);
  if (room <= 0) return null;
  if (p.nextDoseMg <= room) return p.bedAt;
  const hoursBefore = T * Math.log2(p.nextDoseMg / room);
  return new Date(p.bedAt.getTime() - hoursBefore * 3.6e6);
}
```

## anthropometry.ts
```ts
export const whr = (waist: number, hip: number) => waist / hip;
export const whtr = (waist: number, height: number) => waist / height;

// null = قياس ناقص (neck_cm اختياري في الجدول) أو قيم غير صالحة للوغاريتم؛ الواجهة تعرض "يتطلب محيط الرقبة".
export function navyBodyFat(p: { gender: 'male' | 'female'; heightCm: number; waistCm: number; neckCm?: number | null; hipCm?: number | null }) {
  const { log10 } = Math;
  if (p.neckCm == null) return null;
  if (p.gender === 'male') {
    const d = p.waistCm - p.neckCm;
    return d > 0 ? 495 / (1.0324 - 0.19077 * log10(d) + 0.15456 * log10(p.heightCm)) - 450 : null;
  }
  if (p.hipCm == null) return null;
  const d = p.waistCm + p.hipCm - p.neckCm;
  return d > 0 ? 495 / (1.29579 - 0.35004 * log10(d) + 0.221 * log10(p.heightCm)) - 450 : null;
}

export const whrRisk = (value: number, gender: 'male' | 'female') =>
  value >= (gender === 'male' ? 0.90 : 0.85) ? 'high' : 'normal';
```

## sleep.ts
```ts
export function sleepMetrics(s: { bed: Date; onset: Date; wake: Date; wasoMin: number }) {
  const min = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60000;
  const tib = min(s.bed, s.wake);
  const tst = min(s.onset, s.wake) - s.wasoMin;
  const midpoint = new Date(s.onset.getTime() + (s.wake.getTime() - s.onset.getTime()) / 2);
  return { tibMin: tib, latencyMin: min(s.bed, s.onset), tstMin: tst, efficiencyPct: (tst / tib) * 100, midpoint };
}
```

## weight-trend.ts
```ts
export type WeightPoint = { day: number; weight: number }; // day = رقم اليوم منذ بداية التتبع

// EMA مرتبط بالزمن: α لكل يوم، والفجوة Δ أيام تعطي α_eff = 1 − (1 − α)^Δ.
// للقراءات اليومية المتتالية = EMA العادي؛ للأسبوعية (Δ=7, α=0.1) → α_eff ≈ 0.52.
// للعرض وقواعد الضوضاء فقط — لا يُستخدم لحساب الـ TDEE المرصود (متأخر ~ (1−α)/α يوماً).
export function emaTrend(points: WeightPoint[], alpha = 0.1) {
  const out: number[] = [];
  points.forEach((p, i) => {
    if (i === 0) { out.push(p.weight); return; }
    const a = 1 - Math.pow(1 - alpha, p.day - points[i - 1].day);
    out.push(out[i - 1] + a * (p.weight - out[i - 1]));
  });
  return out;
}

// ميل الانحدار الخطي (OLS) بالكغ/يوم. null إذا كانت النقاط < 2 أو كلها في نفس اليوم.
export function linearSlope(points: WeightPoint[]) {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.day, 0) / n;
  const my = points.reduce((s, p) => s + p.weight, 0) / n;
  let num = 0, den = 0;
  for (const p of points) { num += (p.day - mx) * (p.weight - my); den += (p.day - mx) ** 2; }
  return den === 0 ? null : num / den;
}

export const expectedLossKg = (deficits: number[], kcalPerKg = 7700) =>
  deficits.reduce((a, b) => a + b, 0) / kcalPerKg;

// avgIntake = متوسط الأيام المكتملة فقط؛ slope من القراءات الخام الملتزمة (سالب عند النزول).
export function observedTdee(p: { avgIntake: number; slopeKgPerDay: number; kcalPerKg?: number }) {
  return p.avgIntake - p.slopeKgPerDay * (p.kcalPerKg ?? 7700);
}

export function blendedTdee(formula: number, observed: number | null, days: number) {
  if (observed == null || days < 14) return formula;
  const beta = Math.min((days - 14) / 28, 0.7);
  return (1 - beta) * formula + beta * observed;
}
```
