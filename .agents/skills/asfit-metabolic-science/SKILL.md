---
name: asfit-metabolic-science
description: >-
  المحرك العلمي لمشروع AS_FIT: معادلات BMR (Mifflin-St Jeor)، TDEE، MET الصافي، التغذية،
  الكافيين ونصف عمره، WHR/WHtR/نسبة الدهون (US Navy)، مقاييس النوم، خط اتجاه الوزن EMA،
  النزول المتوقع (7700)، TDEE المرصود والأهداف اليومية. Use when implementing or reviewing
  anything in src/domain/ (except insights rules), or answering scientific questions about AS_FIT calculations.
---

# AS_FIT — المحرك العلمي

> كل الدوال في `src/domain/` **نقية**. التقريب عند العرض فقط. التنفيذ المرجعي الكامل:
> [domain-code.md](./references/domain-code.md) — الجداول والمراجع: [tables-and-citations.md](./references/tables-and-citations.md)

## 1. قرارات علمية ملزمة (تصحيحات على المواصفة الأولى)

| # | القرار | السبب |
|---|---|---|
| S1 | BMR للإناث: `-161` بدل `+5` | Mifflin-St Jeor بثابتين حسب الجنس. |
| S2 | **Net MET = (MET − 1)** افتراضياً (مفتاح `use_net_met`) | معامل 1.2 يغطي الراحة طوال اليوم؛ MET الإجمالي يحسب 1 MET مرتين. |
| S3 | ثابت الكافيين قابل للتعديل (افتراضي 11 mg/g) + جدول قيم لكل مشروب | البن 1.0–1.4% كافيين (أرابيكا ~12، روبوستا ~22 mg/g) والاستخلاص يختلف. |
| S4 | نموذج نصف العمر (T½ = 5h) للكافيين المتبقي وقت النوم | حركية من الدرجة الأولى، T½ ≈ 3–7h. |
| S5 | 7700 للتوقع فقط + **TDEE المرصود** بعد 14 يوماً | جلايكوجين/ماء في البداية، تكيّف أيضي لاحقاً. |
| S6 | خط اتجاه EMA بدل القراءة المفردة | تقلبات الماء ±0.5–1.5 كغ يومياً. |
| S7 | إضافة `neck_cm` لنسبة الدهون + WHtR | WHR وحده لا يعكس الدهون. |
| S8 | **لا سعرات إضافية لساعات الشاشة** | العمل الذهني ≈ +5 kcal/ساعة فقط؛ تأثيره سلوكي (شهية) لا أيضي. |
| S9 | سعرات الحليب والسكر تُحسب آلياً | تقليل أخطاء الإدخال. |
| S10 | WASO + كفاءة/كمون/منتصف النوم | معايير نوم معتمدة. |
| S11 | حد أدنى للسعرات `max(BMR, 1500♂/1200♀)` ونزول آمن 0.5–1%/أسبوع | حماية الكتلة العضلية. |

## 2. المعادلات

### 2.1 BMR (Mifflin-St Jeor, 1990)
$$\text{BMR}_{\text{male}} = 10W + 6.25H - 5A + 5 \qquad \text{BMR}_{\text{female}} = 10W + 6.25H - 5A - 161$$
$W$ = **وزن خط الاتجاه EMA الأحدث** (كغ)، $H$ سم، $A$ سنوات (من `birth_date` بـ `differenceInYears`).

### 2.2 TDEE
$$\text{Base TDEE} = \text{BMR} \times \text{AF}\ (1.2) \qquad \text{Dynamic TDEE} = \text{Base} + \sum \text{Exercise}_{\text{net}}$$

### 2.3 التمارين (MET)
$$\text{kcal}_{\text{gross}} = \text{MET} \times 3.5 \times \tfrac{W}{200} \times t \qquad \text{kcal}_{\text{net}} = (\text{MET}-1) \times 3.5 \times \tfrac{W}{200} \times t$$
(1 MET = 3.5 ml O₂/kg/min؛ 1 L O₂ ≈ 5 kcal).

### 2.4 التغذية
`per_100g / per_100ml`: `kcal = calories × q/100` — `per_unit`: `kcal = calories × q`.

### 2.5 المشروبات (قائمة يدخلها المستخدم)
- كل مشروب في `beverage_catalog` بقيمه لكل 100 مل: كافيين، سعرات، بروتين، و`by_coffee_weight`.
- قهوة ببن موزون (`by_coffee_weight` + وزن البن): `caffeine = dry_g × k` (k من الإعدادات، 11 افتراضياً).
- غير ذلك: `caffeine = ml × caffeine_mg_per_100ml / 100`. السعرات والبروتين بنفس الطريقة.
- `milk_kcal = ml × {whole 0.62, semi 0.46, skimmed 0.35}` — `sugar_kcal = tsp × 4.2 × 4`.
- `CAFFEINE_REFERENCE` في `src/domain/beverages.ts` قيم مرجعية تُعرض للمستخدم فقط ولا تُخزَّن.

### 2.6 الكافيين المتبقي
$$C(t_{\text{bed}}) = \sum_i D_i \times 0.5^{(t_{\text{bed}} - t_i)/T_{1/2}}$$
< 50 mg ضئيل — 50–100 قد يؤثر — **> 100 تنبيه**. الحد اليومي الآمن ≤ 400 mg.

### 2.7 شكل الجسم
- `WHR = waist / hip` — خطر: ♂ ≥ 0.90، ♀ ≥ 0.85 (WHO 2008).
- `WHtR = waist / height` — هدف < 0.50.
- US Navy (سم):
  - ♂: `495 / (1.0324 − 0.19077·log10(waist−neck) + 0.15456·log10(height)) − 450`
  - ♀: `495 / (1.29579 − 0.35004·log10(waist+hip−neck) + 0.22100·log10(height)) − 450`

### 2.8 النوم
| المقياس | المعادلة | الهدف |
|---|---|---|
| TIB | wake − bed | — |
| Latency | onset − bed | ≤ 20 د |
| TST | wake − onset − WASO | 7–9 س |
| Efficiency | TST / TIB × 100 | ≥ 85% |
| Midpoint | onset + (wake − onset)/2 | ثبات ±30 د |
| Social Jet Lag | \|mid_weekend − mid_weekday\| | < 1 س |

### 2.9 الوزن وحلقة التغذية الراجعة
- **EMA مرتبط بالزمن (للعرض وقواعد الضوضاء):** $T_t = T_{t-1} + \alpha_{eff}(W_t - T_{t-1})$، $\alpha_{eff} = 1 - (1-\alpha)^{\Delta d}$، α=0.10 لكل يوم. للقراءات الأسبوعية فقط يعطي تلقائياً α_eff ≈ 0.52. القراءات غير الملتزمة بالبروتوكول تُستبعد.
- **الأيام المكتملة فقط:** يوم بلا `day_status.intake_complete = true` لا يدخل في العجز ولا في النزول المتوقع ولا في الـ TDEE المرصود (الوجبة غير المسجلة ليست عجزاً).
- **العجز:** `Deficit = TDEE − Intake` — **المتوقع:** `Σ Deficit / 7700` على الأيام المكتملة.
- **TDEE المرصود (≥ 14 يوماً):** $\overline{\text{Intake}}_{complete} - s \times 7700$، حيث $s$ = **ميل الانحدار الخطي (OLS)** للقراءات الخام الملتزمة بالكغ/يوم. **لا يُحسب من فرق قيمتي EMA**: الـ EMA متأخر ~ (1−α)/α = 9 أيام، فيُظهر نصف النزول فقط في أول 14 يوماً (انحياز −273 kcal في مثال 0.5 كغ/أسبوع).
- **المعايرة:** $\text{TDEE}_{used} = (1-\beta)\text{TDEE}_{formula} + \beta\,\text{TDEE}_{obs}$، $\beta = \min((N-14)/28,\ 0.7)$.

### 2.10 الأهداف
- `deficitApplied = min(plannedDeficit, 0.01 × W × 7700 / 7)` — تطبيق حد النزول الآمن 1%/أسبوع (S11): 60كغ → 660، 80كغ → 880.
- `calorieTarget = max(TDEE_used − deficitApplied, max(BMR, 1500♂ | 1200♀))`
- `proteinTarget = protein_g_per_kg (افتراضي 1.8؛ نطاق 1.6–2.2) × W_trend` — بروتين الحليب في المشروبات يُحتسب (≈ 3.3 غ/100 مل، USDA).
- **معامل النشاط (AF)** يمثّل النشاط **بدون** التمارين المسجلة؛ التمارين تُضاف منفصلة. AF يشمل الرياضة + تسجيلها = حساب مزدوج.

### 2.11 قرارات المراجعة التحليلية (v1.1)
طُبّق فقط ما يستند إلى برهان رياضي أو منطقي أو مصدر قطعي: OLS للـ TDEE المرصود، الأيام المكتملة، EMA الزمني، تقييد العجز بـ S11، بروتين الحليب، `navyBodyFat` يعيد `null` عند نقص القياس، آخر وقت للقهوة يحتسب الجرعات السابقة.
**لم يُغيَّر (لا دليل قاطع):** تصحيح MET بالـ RMR الشخصي، البروتين على الوزن المستهدف، موضع قياس الخصر (Ross et al., Obes Rev 2008: الموضع لا يغيّر جوهرياً علاقة المحيط بالخطر)، كافيين القهوة التركية، مدة الصيام 14 س.

## 3. التحقق

شغّل `pnpm test tests/domain` وتأكد من مطابقة الـ Golden Values في مهارة `asfit-testing-qa`.
