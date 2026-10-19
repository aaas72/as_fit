---
name: asfit-server-actions
description: >-
  طبقة الخادم في AS_FIT: عقود Server Actions (الوجبات، المشروبات، التمارين، الشاشات، النوم،
  الوزن، القياسات، الملف)، نمط الكتابة مع Zod و Snapshot، وخدمة الملخص اليومي (TDEE/العجز/الأهداف).
  Use when writing src/server/actions/**, src/server/services/**, or src/server/queries/**.
---

# AS_FIT — Server Actions & Services

## 1. عقود الـ Actions

| Action | المدخلات (Zod) | المنطق | بعد الحفظ |
|---|---|---|---|
| `upsertProfile` | بيانات الملف + الإعدادات | تحقق النطاقات | `revalidatePath('/')` |
| `createMeal` | `logDate, mealType, scheduledTime?, actualTime, items[{foodId, quantity}]` | `portionNutrition` لكل صنف (Snapshot) داخل **Transaction** | `runInsights` |
| `logBeverage` | النوع، الحجم، البن؟، الحليب، السكر، الوقت | `beverageMetrics` بثابت `caffeine_mg_per_g_coffee` (Snapshot يشمل `milk_protein_g`) | `runInsights` |
| `logExercise` | `exerciseId, durationMinutes, metOverride?` | وزن الاتجاه + `exerciseKcal` | `runInsights` |
| `upsertScreenTime` | الساعات الثلاث | المجموع ≤ 24؛ Upsert على `(user_id, log_date)` | `runInsights` |
| `logSleep` | الأوقات + WASO + الانتعاش | `bed ≤ onset < wake` | `runInsights` |
| `logWeighIn` | انظر `asfit-weigh-in-protocol` | `protocolCompliance` | تحديث EMA + `runInsights(range)` |
| `logMeasurements` | المحيطات | — | WHR/WHtR/BF% تُحسب عند العرض (`navyBodyFat` قد تعيد `null`) |
| `setDayComplete` | `logDate, complete` | Upsert على `day_status`؛ `closed_at = now()` عند الإغلاق | `runInsights(range)` + `revalidatePath('/')` |
| `dismissInsight` | `id` | `dismissed_at = now()` | — |

## 2. قواعد ملزمة

- `'use server'` + `safeParse` أولاً؛ أعد `{ ok: false, errors }` بدل رمي استثناء لأخطاء الإدخال.
- النتيجة الناجحة `{ ok: true, ...data }`.
- حوّل `NUMERIC` (string) إلى `number` قبل `src/domain`، وأعده `String()` عند الإدخال.
- الوزن المستخدم في الحسابات = **آخر قيمة EMA ملتزمة**؛ إن لم توجد ← `initial_weight_kg`.
- `log_date` يُشتق بالمنطقة الزمنية `user_settings.timezone` (date-fns-tz)، لا بتوقيت الخادم.
- `USER_ID` ثابت من `src/server/session.ts` (مستخدم واحد محلي) — لا تكتبه حرفياً في كل ملف.

## 3. النمط المرجعي

التنفيذ الفعلي: [src/server/actions/exercise.ts](../../../src/server/actions/exercise.ts).

- الـ Action يستقبل **كائناً عادياً** (`input: unknown`) لا `FormData`، ويتحقق بنفس مخطط Zod الموجود في `src/lib/validation/schemas.ts` الذي يستخدمه النموذج.
- يعيد `ActionResult` من `src/lib/validation/common.ts`: `{ ok: true, ...data }` أو `{ ok: false, errors?, message? }`.
- بعد الكتابة: `runInsights(USER_ID, logDate)` ثم `refreshAll()` (= `revalidatePath('/', 'layout')`) من `src/server/services/action-helpers.ts`، لأن كل الصفحات تقرأ أرقاماً مشتقة.
- في الواجهة: `useActionForm` في `src/components/forms/useActionForm.ts` (React Hook Form + `zodResolver` + `useTransition`) يربط النموذج بالـ Action ويعرض أخطاء الحقول القادمة من الخادم.
- الحذف: `DeleteButton` بخطوتين (طلب ثم تأكيد) دون نوافذ المتصفح.

## 4. خدمة الملخص اليومي

```ts
// src/server/services/daily-summary.ts (pseudo)
export async function getDailySummary(userId: number, date: string) {
  const [profile, settings, intake, trendW, observed] = await Promise.all([/* queries */]);
  const age = ageInYears(profile.birthDate, new Date(date));
  const bmr = bmrMifflin({ weightKg: trendW, heightCm: profile.heightCm, ageYears: age, gender: profile.gender });
  const base = baseTdee(bmr, profile.activityFactor);
  const exKcal = settings.useNetMet ? intake.exerciseNetKcal : intake.exerciseGrossKcal;
  const formulaTdee = dynamicTdee(base, exKcal);
  const tdee = blendedTdee(formulaTdee, observed.tdee, observed.days);
  const targets = dailyTargets({ tdee, bmr, deficit: settings.plannedDeficit, gender: profile.gender, weightKg: trendW, proteinPerKg: settings.proteinPerKg, kcalPerKg: settings.kcalPerKg });
  return {
    bmr, base, formulaTdee, tdee, intake: intake.totalKcal, intakeComplete: intake.intakeComplete,
    deficit: tdee - intake.totalKcal, formulaDeficit: formulaTdee - intake.totalKcal,
    targets, proteinG: intake.totalProteinG, caffeineMg: intake.caffeineMg,
  };
}
```

- `intake` من `v_daily_intake` (يشمل `total_protein_g` و`intake_complete`).
- `observed`: على آخر 14–42 يوماً: `slope = linearSlope(القراءات الخام الملتزمة)`، `avgIntake` = متوسط الأيام المكتملة فقط، ثم `observedTdee({ avgIntake, slopeKgPerDay: slope })`. `null` إن كانت البيانات أقل من 14 يوماً أو لا توجد أيام مكتملة. **لا تستخدم فرق قيمتي EMA.**
- الوزن الحالي `trendW` = آخر قيمة من `emaTrend` الزمني على القراءات الملتزمة.
- TDEE والعجز **لا يُخزَّنان**؛ يُحسبان عند الطلب.

## 5. التحقق

- `pnpm tsc --noEmit`.
- E2E: وجبة ← مشروب ← تمرين ← الأرقام في الـ Dashboard تطابق الحساب اليدوي.
