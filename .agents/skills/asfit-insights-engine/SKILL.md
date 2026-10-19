---
name: asfit-insights-engine
description: >-
  محرك التحليل الذكي في AS_FIT: واجهة InsightRule، بناء السياق، والقواعد الثماني (LUNCH_DRIFT،
  COGNITIVE_LOAD، FALSE_PLATEAU، TRUE_PLATEAU، BEDTIME_CAFFEINE، LATE_EATING، PROTEIN_SHORT،
  AGGRESSIVE_DEFICIT). Use when adding, modifying or debugging automated insights/alerts,
  src/domain/insights/**, or src/server/services/insights-runner.ts.
---

# AS_FIT — محرك التحليل الذكي

## 1. التصميم

- كل قاعدة وحدة مستقلة في `src/domain/insights/rules/<kebab-code>.ts` تنفذ `InsightRule` (دالة نقية).
- `src/server/services/insights-runner.ts` يبني `PeriodContext` من قاعدة البيانات **مرة واحدة** ثم يمرره لكل القواعد.
- الكتابة: `INSERT ... ON CONFLICT (user_id, rule_code, period_start, period_end) DO NOTHING`.
- التشغيل: بعد كل Server Action كتابي + عند فتح الـ Dashboard.
- الرسائل بالعربية، غير تشخيصية، وتتضمن الأرقام. `payload` يحمل كل القيم المسببة.

## 2. الأنواع

```ts
// src/domain/insights/types.ts
export interface DayContext {
  date: string;
  meals: { type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; driftMin: number | null; kcal: number; protein: number; actualAt: Date }[];
  intakeKcal: number;
  proteinG: number;
  proteinTargetG: number;
  intakeComplete: boolean;   // day_status.intake_complete
  tdee: number;              // TDEE_used (blended) — للعرض
  deficit: number;           // TDEE_used − intake
  formulaDeficit: number;    // TDEE_formula − intake — تستخدمه قواعد الثبات (تجنّب الدائرية)
  highFocusH: number;
  sleep?: { tstMin: number; efficiencyPct: number; bedAt: Date };
  caffeineDoses: { mg: number; at: Date }[];
}

export interface PeriodContext {
  days: DayContext[];
  weighIns: { date: string; weight: number; trend: number; highSodium: boolean; normalDigestion: boolean; compliant: boolean }[];
  settings: { caffeineHalfLifeH: number; kcalPerKg: number };
  trackingDay: number;       // عدد الأيام منذ أول قراءة وزن
}

export interface InsightResult {
  ruleCode: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  payload: Record<string, unknown>;
  periodStart: string;
  periodEnd: string;
}

export interface InsightRule {
  code: string;
  evaluate(ctx: PeriodContext): InsightResult[];
}
```

## 3. القواعد المعتمدة

| الكود | الشرط | النتيجة | الأساس |
|---|---|---|---|
| `LUNCH_DRIFT` | `drift(lunch) > +90 min` | warning: احتمال زيادة سعرات الوجبة؛ قارن سعرات الغداء المتأخر بمتوسط الغداء المنتظم | Chrono-nutrition. صِغ السبب كـ"جوع متراكم" لا "هبوط سكر" (أدلة محدودة لدى الأصحاء). |
| `COGNITIVE_LOAD` | `high_focus_hours > 5` | info: وجبة خفيفة بروتينية 20–30غ قبل نهاية العمل + رفع هدف البروتين المعروض +0.2 g/kg لليوم | قاعدة **سلوكية** — لا تضف سعرات للـ TDEE. |
| `FALSE_PLATEAU` | نافذة 7–14 يوماً (≥ 7 أيام **مكتملة**): `expected ≥ 0.4 kg` من **`formulaDeficit`** و `Δtrend < 0.1 kg` و (صوديوم أو `avgTST < 6h` أو هضم غير طبيعي) | info: احتباس سوائل محتمل، الدهون تُحرق | الصوديوم وقلة النوم (كورتيزول) ← احتباس ماء. |
| `TRUE_PLATEAU` | نفس الثبات ≥ 21 يوماً **بلا** أعلام ضوضاء (أيام مكتملة، `formulaDeficit`) | warning: راجع دقة التسجيل؛ اعرض TDEE المرصود مقابل النظري | تكيّف أيضي أو Under-reporting (20–40%). |
| `BEDTIME_CAFFEINE` | `residualCaffeineMg(bed_time) > 100` | warning + آخر وقت مقترح للقهوة عبر `latestDoseTime` (يحتسب الجرعات السابقة) | T½ ≈ 5h. |
| `LATE_EATING` | آخر وجبة < 3 ساعات قبل `bed_time` | info: تأثير محتمل على النوم والهضم | Chrono-nutrition. |
| `PROTEIN_SHORT` | `proteinG < 0.8 × target` في 3 من آخر 5 أيام | warning: خطر فقدان كتلة عضلية | ISSN. |
| `AGGRESSIVE_DEFICIT` | نزول الاتجاه > 1% من الوزن أسبوعياً لأسبوعين، و`trackingDay ≥ 14 + 14` (لا تُقيَّم الأسابيع الأولى) | warning: خفّض العجز | حماية الكتلة العضلية. أول 14 يوماً فقدان جلايكوجين + ماء (S5) يظهر كنزول سريع زائف. |

**لماذا `formulaDeficit` في قواعد الثبات؟** بعد المعايرة يأتي حتى 70% من `TDEE_used` من بيانات الوزن نفسها، فيقترب المتوقع من الفعلي بالتصميم وتفقد القاعدة قدرتها على الكشف. ضع `formulaDeficit` و`deficit` كليهما في `payload`.

**آخر وقت للقهوة:** `latestDoseTime({ doses, bedAt, nextDoseMg })` — المساحة المتبقية `room = 100 − residual(bed)`؛ إن كانت ≤ 0 فلا قهوة أخرى اليوم، وإلا `t_last = bed − T½ × log2(nextDose / room)`.

## 4. مثال كامل

```ts
// src/domain/insights/rules/false-plateau.ts
import type { InsightRule } from '../types';
import { expectedLossKg } from '../../weight-trend';

export const falsePlateau: InsightRule = {
  code: 'FALSE_PLATEAU',
  evaluate(ctx) {
    const w = ctx.weighIns.filter(x => x.compliant);
    const complete = ctx.days.filter(d => d.intakeComplete);
    if (w.length < 2 || complete.length < 7) return [];
    const first = w[0], last = w[w.length - 1];
    const expected = expectedLossKg(complete.map(d => d.formulaDeficit), ctx.settings.kcalPerKg);
    const actual = first.trend - last.trend;
    if (!(expected >= 0.4 && actual < 0.1)) return [];

    const slept = ctx.days.filter(d => d.sleep).map(d => d.sleep!.tstMin);
    const avgSleepH = slept.length ? slept.reduce((a, b) => a + b, 0) / slept.length / 60 : null;
    const reasons = [
      last.highSodium && 'صوديوم مرتفع أمس',
      !last.normalDigestion && 'هضم غير طبيعي',
      avgSleepH != null && avgSleepH < 6 && `متوسط نوم ${avgSleepH.toFixed(1)} ساعة`,
    ].filter(Boolean) as string[];
    if (reasons.length === 0) return [];

    return [{
      ruleCode: this.code,
      severity: 'info',
      title: 'ثبات وزن مؤقت (احتباس سوائل محتمل)',
      message: `العجز المتراكم يعادل ${expected.toFixed(2)} كغ، لكن الاتجاه نزل ${actual.toFixed(2)} كغ فقط. الأسباب المرجحة: ${reasons.join('، ')}.`,
      payload: { expectedKg: expected, actualKg: actual, reasons, avgSleepH, completeDays: complete.length, totalDays: ctx.days.length },
      periodStart: ctx.days[0].date,
      periodEnd: ctx.days[ctx.days.length - 1].date,
    }];
  },
};
```

```ts
// src/domain/insights/engine.ts
import type { InsightRule, PeriodContext, InsightResult } from './types';
import { falsePlateau } from './rules/false-plateau';
export const RULES: InsightRule[] = [falsePlateau /*, lunchDrift, cognitiveLoad, ... */];
export const runRules = (ctx: PeriodContext): InsightResult[] => RULES.flatMap(r => r.evaluate(ctx));
```

## 5. إضافة قاعدة جديدة

1. أنشئ الملف في `rules/` بكود SCREAMING_SNAKE فريد.
2. سجّلها في `RULES`.
3. أضف إليها اختبار Vitest بسياق مصطنع: حالة تُطلق التنبيه + حالة لا تُطلقه.
4. أضفها لجدول القواعد أعلاه.
