---
name: asfit-testing-qa
description: >-
  الاختبارات وضمان الجودة في AS_FIT: Golden Values للمعادلات العلمية، أمثلة Vitest، اختبارات
  القواعد الذكية، سيناريوهات Playwright، ومعايير القبول. Use when writing tests, verifying
  domain calculations, or checking whether a feature/phase meets acceptance criteria.
---

# AS_FIT — الاختبارات وضمان الجودة

## 1. Golden Values (يجب أن تنجح كلها)

| الحالة | المدخلات | المتوقع |
|---|---|---|
| BMR ذكر | 80 كغ، 180 سم، 30 سنة | **1780.0** |
| BMR أنثى | 65 كغ، 165 سم، 30 سنة | **1370.25** |
| Base TDEE | 1780 × 1.2 | **2136.0** |
| MET Gross | MET 4.3، 80 كغ، 45 د | **270.9** |
| MET Net | نفس المدخلات | **207.9** |
| الكافيين | 18 غ × 11 | **198** mg |
| الكافيين المتبقي | 200 mg قبل 10 س، T½=5 | **50** mg |
| السكر | 2 ملعقة صغيرة | **33.6** kcal |
| WHR | 90 / 100 | **0.90** ← `high` (ذكر) |
| WHtR | 90 / 180 | **0.50** |
| النزول المتوقع | 7 × 500 | **0.4545** كغ |
| EMA | [80, 79, 79.5], α=0.1 | **[80, 79.9, 79.86]** |
| الحد الأدنى | TDEE 1900، عجز 500، BMR 1500، ذكر | calories = **1500**, `floorApplied=true` |
| Blended TDEE | formula 2200، observed 2400، days 28 | β=0.5 ← **2300** |
| EMA بفجوة زمنية | `[{day 0, 80}, {day 7, 79}]`, α=0.1 | α_eff = 0.5217 ← **79.478** |
| ميل OLS | 15 قراءة يومية، نزول خطي 0.5 كغ/أسبوع | **−0.071429** كغ/يوم |
| TDEE المرصود (OLS) | avgIntake 2000، الميل أعلاه | **2550** (وليس 2277 عبر EMA) |
| Drift عبر منتصف الليل | مجدول 23:30، فعلي 00:30 | **+60** (وليس −1380) |
| Drift عادي | تأخير 90 / تبكير 30 | **90** / **−30** |
| تقييد العجز | وزن 60 كغ، عجز مخطط 1000 | `deficitApplied` = **660**, `deficitCapped=true` |
| بروتين الحليب | 200 مل حليب كامل | **6.6** غ |
| آخر وقت للقهوة (جرعة سابقة) | 198 mg الساعة 09:00، نوم 23:00، جرعة تالية 198 | **15:39** (15:39:35، يُقرَّب للأبكر) (7.34 س قبل النوم) |
| آخر وقت للقهوة (بلا جرعات) | نوم 23:00، جرعة 198 | **18:04** (4.93 س قبل النوم) |
| Navy بلا رقبة | `neckCm = null` | **null** |

## 2. نموذج Vitest

```ts
// tests/domain/metabolism.test.ts
import { describe, it, expect } from 'vitest';
import { bmrMifflin, baseTdee } from '@/domain/metabolism';
import { exerciseKcal } from '@/domain/exercise';
import { residualCaffeineMg } from '@/domain/caffeine-kinetics';
import { emaTrend, blendedTdee, linearSlope, observedTdee } from '@/domain/weight-trend';

describe('metabolism', () => {
  it('BMR male', () => expect(bmrMifflin({ weightKg: 80, heightCm: 180, ageYears: 30, gender: 'male' })).toBe(1780));
  it('BMR female', () => expect(bmrMifflin({ weightKg: 65, heightCm: 165, ageYears: 30, gender: 'female' })).toBeCloseTo(1370.25));
  it('Base TDEE', () => expect(baseTdee(1780)).toBeCloseTo(2136));
  it('MET gross/net', () => {
    const k = exerciseKcal(4.3, 80, 45);
    expect(k.gross).toBeCloseTo(270.9, 1);
    expect(k.net).toBeCloseTo(207.9, 1);
  });
  it('caffeine half-life', () => {
    const bed = new Date('2026-01-01T23:00:00Z');
    const dose = { mg: 200, at: new Date('2026-01-01T13:00:00Z') };
    expect(residualCaffeineMg([dose], bed, 5)).toBeCloseTo(50);
  });
  it('EMA', () => {
    const t = emaTrend([{ day: 0, weight: 80 }, { day: 1, weight: 79 }, { day: 2, weight: 79.5 }], 0.1);
    expect(t[1]).toBeCloseTo(79.9);
    expect(t[2]).toBeCloseTo(79.86);
  });
  it('observed TDEE via OLS', () => {
    const pts = Array.from({ length: 15 }, (_, d) => ({ day: d, weight: 80 - (0.5 / 7) * d }));
    expect(observedTdee({ avgIntake: 2000, slopeKgPerDay: linearSlope(pts)! })).toBeCloseTo(2550);
  });
  it('blended TDEE', () => expect(blendedTdee(2200, 2400, 28)).toBeCloseTo(2300));
});
```

## 3. اختبارات القواعد الذكية

لكل قاعدة في `src/domain/insights/rules/`: اختبار يُطلقها + اختبار حدّي لا يُطلقها (مثلاً drift = 90 لا يُطلق `LUNCH_DRIFT`، 91 يُطلقه).

حالات إلزامية إضافية:
- `FALSE_PLATEAU`: 7 أيام منها 3 غير مكتملة ← لا يُطلق (أيام مكتملة < 7).
- `FALSE_PLATEAU`: `deficit` (المعاير) صغير لكن `formulaDeficit` كبير ← القرار يتبع `formulaDeficit`.
- `AGGRESSIVE_DEFICIT`: نزول 1.5%/أسبوع عند `trackingDay = 20` ← لا يُطلق؛ عند `trackingDay = 30` ← يُطلق.

## 4. سيناريوهات Playwright

1. إعداد الملف ← تسجيل وجبة (صنفان) ← مشروب قهوة بحليب ← تمرين مشي ← تطابق الـ Dashboard مع الحساب اليدوي.
2. وزن بصيام 12 ساعة ← يُحفظ مع شارة "غير ملتزم".
3. تعديل سعرات صنف في `/foods` ← سعرات الوجبة القديمة لا تتغير.
4. تجاهل تنبيه ← يختفي ولا يعود لنفس الفترة.

## 5. معايير القبول

- [ ] تغطية `src/domain/**` ≥ 95%.
- [ ] كل الـ Golden Values ناجحة.
- [ ] تعديل القاموس لا يغيّر الوجبات المسجلة سابقاً.
- [ ] `time_drift_minutes` يُحسب آلياً في قاعدة البيانات.
- [ ] قراءة وزن غير ملتزمة تُحفظ بـ `is_protocol_compliant=false` وتُميَّز بصرياً.
- [ ] لا تنبيه مكرر لنفس القاعدة والفترة.
- [ ] TDEE المرصود لا يُستخدم قبل 14 يوماً من البيانات الملتزمة، ويُحسب من ميل OLS لا من EMA.
- [ ] الأيام غير المكتملة لا تدخل في العجز ولا النزول المتوقع ولا TDEE المرصود.
- [ ] العجز المطبَّق لا يتجاوز 1% من وزن الجسم أسبوعياً.
- [ ] السعرات المستهدفة لا تنزل عن الحد الأدنى الآمن.
- [ ] التطبيق يعمل بلا إنترنت بعد التثبيت.

## 6. الأوامر

```powershell
pnpm test                          # Vitest
pnpm vitest run --coverage         # التغطية
pnpm test:e2e                      # Playwright (يتطلب db:up + dev)
```
