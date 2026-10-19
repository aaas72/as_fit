---
name: asfit-weigh-in-protocol
description: >-
  بروتوكول الوزن المعياري في AS_FIT: شروط الصيام 14 ساعة، الحمام، بلا سوائل، أعلام الضوضاء
  (صوديوم/هضم)، منطق الالتزام، و Wizard الواجهة. Use when building the /weigh-in page, the
  logWeighIn server action, weigh-in validation, or deciding how non-compliant readings are treated.
---

# AS_FIT — بروتوكول الوزن المعياري

## 1. الشروط (Gate Checks)

| # | الشرط | التحقق |
|---|---|---|
| 1 | صيام ≥ `required_fasting_hours` (14) | `measured_at − last_meal_at`. يُقترح `last_meal_at` آلياً من آخر `meals.actual_time` لليوم السابق. |
| 2 | بعد دخول الحمام | Checkbox إلزامي `bathroom_done` |
| 3 | قبل أي ماء/قهوة | Checkbox `no_fluids_before` + لا يوجد `beverage_logs` في نفس اليوم قبل `measured_at` |
| 4 | مؤشرات الضوضاء | `high_sodium_yesterday`, `normal_digestion` — الإجابة إلزامية |
| 5 | نفس الميزان/المكان، ملابس خفيفة | نص إرشادي |

## 2. التحقق والالتزام

```ts
// src/lib/validation/weigh-in.ts
import { z } from 'zod';

export const weighInSchema = z.object({
  measuredAt: z.coerce.date(),
  lastMealAt: z.coerce.date(),
  weightKg: z.coerce.number().min(30).max(300),
  bathroomDone: z.boolean(),
  noFluidsBefore: z.boolean(),
  highSodiumYesterday: z.boolean(),
  normalDigestion: z.boolean(),
  isOfficialWeekly: z.boolean().default(true),
});

export function protocolCompliance(input: z.infer<typeof weighInSchema>, requiredFastingH = 14) {
  const fastingH = (input.measuredAt.getTime() - input.lastMealAt.getTime()) / 3.6e6;
  const violations: string[] = [];
  if (fastingH < requiredFastingH) violations.push(`مدة الصيام ${fastingH.toFixed(1)} ساعة < ${requiredFastingH}`);
  if (!input.bathroomDone) violations.push('لم يتم دخول الحمام قبل القياس');
  if (!input.noFluidsBefore) violations.push('تم تناول سوائل قبل القياس');
  return { compliant: violations.length === 0, fastingH, violations };
}
```

## 3. قواعد المعالجة

- القراءة غير الملتزمة **تُحفظ ولا تُرفض**، مع `is_protocol_compliant = false`.
- تظهر بتمييز بصري في الرسوم، **ولا تدخل** في EMA الرسمي ولا في الـ TDEE المرصود.
- `is_official_weekly = false` للأوزان اليومية الاختيارية. كل القراءات الملتزمة (يومية وأسبوعية) تغذي EMA **الزمني** (α=0.10 لكل يوم، `α_eff = 1 − 0.9^Δأيام`) وميل OLS للـ TDEE المرصود.
- قيد `UNIQUE(user_id, log_date)`: قراءة واحدة يومياً؛ إعادة الإدخال = تحديث مع تأكيد.
- بعد الحفظ: تحديث خط الاتجاه ثم `runInsights` على نافذة 7–21 يوماً (لقاعدتي `FALSE_PLATEAU` و `TRUE_PLATEAU`).

## 4. تدفق الواجهة (Wizard من 4 خطوات)

```mermaid
flowchart TD
    A["فتح شاشة الوزن"] --> B["عرض آخر وجبة مقترحة آلياً"]
    B --> C{"صيام >= 14 ساعة؟"}
    C -- لا --> C1["تحذير + الوقت المتبقي"]
    C -- نعم --> D["Checklist: الحمام / بلا سوائل"]
    C1 --> D
    D --> E["صوديوم أمس؟ هضم طبيعي؟"]
    E --> F["إدخال الوزن"]
    F --> G["حفظ + حساب الالتزام"]
    G --> H["تحديث EMA + التنبيهات"]
```

## 5. التحقق

- اختبار: صيام 12 ساعة ← `compliant=false` مع رسالة الصيام.
- اختبار: كل الشروط محققة ← `compliant=true`, `violations=[]`.
