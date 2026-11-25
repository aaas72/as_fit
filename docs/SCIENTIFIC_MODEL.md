<div dir="rtl" align="right">

# النموذج العلمي ومحرك التنبيهات (Scientific Model & Insights)

توثّق هذه الوثيقة الأساس العلمي والرياضي المنفَّذ في `src/domain/` لتمكين الباحثين والمطورين من مراجعة المعادلات أو إضافة قواعد استنتاجية جديدة بدقة.

---

## 1. ملخص المعادلات الرياضية الأساسية

### 1.1 معدل الأيض الأساسي (`BMR` — `metabolism.ts`)
يدعم النظام معادلتين مع التراجع الآمن التلقائي (`selectBmr`):
1. **`Mifflin-St Jeor` (الافتراضية):**
   $$\text{BMR}_{\text{male}} = 10W + 6.25H - 5A + 5 \qquad \text{BMR}_{\text{female}} = 10W + 6.25H - 5A - 161$$
2. **`Katch-McArdle` (اختيارية عند تفعيلها وتوفر نسبة دهون صالحة $2\% \le \text{BF} \le 70\%$):**
   $$\text{LBM} = W \times \left(1 - \frac{\text{BF}\%}{100}\right), \qquad \text{BMR}_{\text{KM}} = 370 + 21.6 \times \text{LBM}$$

### 1.2 الحرق اليومي والتمارين (`Net MET` — `exercise.ts`)
- معامل النشاط (`AF = 1.2`) يغطي استهلاك الراحة طوال اليوم؛ لذلك يُعتمد **الحرق الصافي `Net MET = (MET - 1)`** افتراضياً لمنع الحساب المزدوج للراحة:
  $$\text{kcal}_{\text{net}} = (\text{MET} - 1) \times 3.5 \times \frac{W}{200} \times t_{\text{min}}$$

### 1.3 حركية الكافيين ومتوسط النوم الدائري (`caffeine-kinetics.ts` & `sleep.ts`)
- **الكافيين المتبقي عند النوم $t_{\text{bed}}$:**
  $$C(t_{\text{bed}}) = \sum_{i} D_i \times 0.5^{\frac{t_{\text{bed}} - t_i}{T_{1/2}}}$$
- **منتصف النوم واضطراب الساعة البيولوجية (`Social Jetlag`):** يُحسب متوسط منتصف النوم عبر **المتوسط الدائري (`Circular Mean` بـ `sin` و`cos` على دائرة 24 ساعة)** حتى لا ينكسر الحساب عند عبور منتصف الليل (مثال: متوسط `23:30` و`00:30` هو `00:00` وليس `12:00` ظهراً).

### 1.4 خط اتجاه الوزن، معايرة `Observed TDEE`، وتوقع الهدف (`weight-trend.ts`)
- **خط الاتجاه الأسي المراعي للفجوات الزمنية ($\Delta d$ أيام):**
  $$\alpha_{\text{eff}} = 1 - (1 - \alpha)^{\Delta d}, \qquad T_t = T_{t-1} + \alpha_{\text{eff}}(W_t - T_{t-1})$$
- **الحرق المرصود (`Observed TDEE` بعد $\ge 14$ يوماً) عبر الانحدار الخطي (`OLS`):**
  $$\text{TDEE}_{\text{obs}} = \overline{\text{Intake}}_{\text{complete}} - (s_{\text{OLS}} \times 7700)$$
- **المزج التدريجي (`Blended TDEE`):** $\beta = \min((N - 14)/28,\ 0.70)$ لدمج المعادلة مع الحرق المرصود.
- **توقع الوصول للوزن المستهدف (`projectedGoalFromReadings`):** يحسب الأيام المتبقية انطلاقاً من ميل `OLS` للقراءات الملتزمة خلال آخر 42 يوماً، ويعيد `null` إن كانت البيانات غير كافية أو كان الاتجاه معاكساً للهدف.

---

## 2. محرك التنبيهات الذكية وكيفية إضافة قاعدة جديدة

تعيش القواعد الثماني الحالية في `src/domain/insights/rules/`:
`LUNCH_DRIFT` · `COGNITIVE_LOAD` · `FALSE_PLATEAU` · `TRUE_PLATEAU` · `BEDTIME_CAFFEINE` · `LATE_EATING` · `PROTEIN_SHORT` · `AGGRESSIVE_DEFICIT`.

### خطوات إضافة قاعدة جديدة للمساهمين:
1. أنشئ ملفاً في `src/domain/insights/rules/<rule-name>.ts` يصدّر كائناً يطبق الواجهة `InsightRule` من [types.ts](../src/domain/insights/types.ts).
2. التزم بدالة `evaluate(ctx: PeriodContext)` نقية تماماً، وبصياغة عربية غير تشخيصية، مع إرفاق جميع الأرقام المسببة داخل `payload`. (استخدم `formulaDeficit` لا `deficit` المعاير في قواعد الثبات لتجنب الدائرية).
3. سجّل القاعدة في `RULES` داخل [engine.ts](../src/domain/insights/engine.ts).
4. أضف اختبارات وحدات في [tests/domain/insights.test.ts](../tests/domain/insights.test.ts) تغطي الإطلاق والعتبة الحدّية ونقص البيانات.

---

## 3. المراجع العلمية المعتمدة

1. Mifflin MD, St Jeor ST, et al. *Am J Clin Nutr.* 1990;51(2):241–247.
2. Katch FI, McArdle WD. *Nutrition, Weight Control, and Exercise.* 1996.
3. Ainsworth BE, et al. *Compendium of Physical Activities.* Med Sci Sports Exerc. 2011 / 2024.
4. Hall KD, et al. *Lancet.* 2011;378:826–837.
5. World Health Organization. *Waist Circumference and Waist–Hip Ratio.* 2008.
6. Ashwell M, Gibson S. *BMJ Open.* 2016 (`WHtR`).
7. Hodgdon JA, Beckett MB. *NHRC.* 1984 (`US Navy Body Fat`).
8. Jäger R, et al. *ISSN Position Stand: Protein and Exercise.* 2017.
9. Drake C, et al. *J Clin Sleep Med.* 2013 (`Caffeine & Sleep`).
10. Walker J. *The Hacker's Diet.* 1991 (`EMA Weight Trend`).

</div>
