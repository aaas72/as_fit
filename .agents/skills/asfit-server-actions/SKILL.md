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

```ts
// src/server/actions/exercise.ts
'use server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db/client';
import { exerciseLogs, exerciseCatalog } from '@/server/db/schema';
import { exerciseKcal } from '@/domain/exercise';
import { getCurrentTrendWeight } from '@/server/queries/weight';
import { runInsights } from '@/server/services/insights-runner';
import { USER_ID } from '@/server/session';

const schema = z.object({
  logDate: z.string().date(),
  exerciseId: z.coerce.number().int().positive(),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  metOverride: z.coerce.number().min(1.1).max(20).optional(),
});

export async function logExercise(_: unknown, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  const { logDate, exerciseId, durationMinutes, metOverride } = parsed.data;
  const [ex] = await db.select().from(exerciseCatalog).where(eq(exerciseCatalog.id, exerciseId));
  const met = metOverride ?? Number(ex.defaultMet);
  const weight = await getCurrentTrendWeight(USER_ID);
  const kcal = exerciseKcal(met, weight, durationMinutes);

  await db.insert(exerciseLogs).values({
    userId: USER_ID, logDate, exerciseId, durationMinutes,
    metValue: String(met), weightUsedKg: String(weight),
    grossBurnedKcal: String(kcal.gross), netBurnedKcal: String(kcal.net),
  });

  await runInsights(USER_ID, logDate);
  revalidatePath('/');
  return { ok: true, kcal };
}
```

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
