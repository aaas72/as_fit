# AS_FIT — Personal Metabolic Telemetry & Tracking System
## وثيقة المتطلبات المعمارية والعلمية والتنفيذية (SRS + SAD)

| البند | القيمة |
|---|---|
| الإصدار | v1.2 (مراجعة تحليلية §2.3 + قوائم يدخلها المستخدم §2.4) |
| التاريخ | 2026-10-19 |
| نمط النشر | Local-first — Docker Compose |
| النمط المعماري | Next.js Full-Stack Monolith (App Router) + PostgreSQL |
| الجمهور المستهدف | المطوّر المنفّذ (Developer) |

---

## فهرس المحتويات

1. [نظرة عامة على النظام](#1-نظرة-عامة-على-النظام)
2. [المراجعة العلمية وتصحيحات المواصفة الأصلية](#2-المراجعة-العلمية-وتصحيحات-المواصفة-الأصلية)
3. [المكدس التقني (Tech Stack)](#3-المكدس-التقني-tech-stack)
4. [الهندسة المعمارية للتطبيق](#4-الهندسة-المعمارية-للتطبيق)
5. [قاعدة البيانات (PostgreSQL Schema)](#5-قاعدة-البيانات-postgresql-schema)
6. [المحرك العلمي — المعادلات والتنفيذ البرمجي](#6-المحرك-العلمي--المعادلات-والتنفيذ-البرمجي)
7. [بروتوكول الوزن المعياري](#7-بروتوكول-الوزن-المعياري)
8. [محرك التحليل الذكي (Insights Engine)](#8-محرك-التحليل-الذكي-insights-engine)
9. [طبقة الخادم: Server Actions & Queries](#9-طبقة-الخادم-server-actions--queries)
10. [واجهة المستخدم (UI / Pages)](#10-واجهة-المستخدم-ui--pages)
11. [البيئة المحلية و Docker](#11-البيئة-المحلية-و-docker)
12. [الاختبارات وضمان الجودة](#12-الاختبارات-وضمان-الجودة)
13. [خطة التنفيذ (Roadmap)](#13-خطة-التنفيذ-roadmap)
14. [الملاحق: جداول MET، الكافيين، المراجع](#14-الملاحق)

---

## 1. نظرة عامة على النظام

النظام **ليس حاسبة سعرات**، بل **نظام تحكم ذو تغذية راجعة (Closed-Loop Feedback Control System)** يعامل الجسم كنظام ديناميكي:

- **المدخلات (Inputs):** الطعام، المشروبات، الكافيين، التوقيت الزمني للوجبات (Chrono-Nutrition)، التمارين، الحمل الذهني للشاشات، النوم.
- **النموذج (Model):** معادلات الأيض (BMR/TDEE/MET) لتقدير الحرق.
- **المخرجات المقاسة (Measured Outputs):** الوزن المعياري الصائم، المحيطات الجسدية.
- **حلقة التغذية الراجعة:** مقارنة النزول **المتوقع** بالنزول **الفعلي** ← إعادة معايرة الـ TDEE ← تنبيهات ذكية.

```mermaid
flowchart LR
    subgraph Inputs["المدخلات اليومية"]
        F["الوجبات + التوقيت"]
        B["المشروبات + الكافيين"]
        A["التمارين (MET)"]
        S["الشاشات / الحمل الذهني"]
        SL["النوم"]
    end
    subgraph Model["النموذج الأيضي"]
        BMR["BMR - Mifflin-St Jeor"]
        TDEE["Dynamic TDEE"]
        DEF["العجز اليومي"]
        EXP["النزول المتوقع"]
    end
    subgraph Outputs["المخرجات المقاسة"]
        W["الوزن الصائم المعياري"]
        TR["خط الاتجاه EMA"]
        M["المحيطات الشهرية"]
    end
    subgraph Control["حلقة التحكم"]
        CMP["مقارنة المتوقع بالفعلي"]
        CAL["معايرة TDEE المرصود"]
        INS["محرك الاستنتاج"]
    end
    F --> DEF
    B --> DEF
    A --> TDEE
    BMR --> TDEE --> DEF --> EXP --> CMP
    W --> TR --> CMP
    CMP --> CAL --> TDEE
    CMP --> INS
    S --> INS
    SL --> INS
    M --> INS
```

### 1.1 المبادئ الحاكمة (Design Principles)

| المبدأ | التطبيق |
|---|---|
| **Local-first & Privacy** | لا خدمات سحابية، كل البيانات في PostgreSQL محلي داخل Docker volume. |
| **Pure Domain Logic** | كل المعادلات دوال نقية (Pure Functions) بلا IO، قابلة للاختبار 100%. |
| **Snapshot over Recompute** | القيم المحسوبة لحظة التسجيل (سعرات الوجبة، الوزن المستخدم في التمرين) تُخزَّن كلقطة حتى لا يتغير التاريخ إذا عُدّل القاموس. |
| **Derived via DB when deterministic** | الحقول المشتقة البسيطة (`time_drift_minutes`، مدة النوم) = `GENERATED ALWAYS AS` في PostgreSQL. |
| **Explainable Insights** | كل تنبيه يحمل `payload` يوضح الأرقام التي أدت إليه. |
| **Noise-aware** | الوزن يُفسَّر عبر خط اتجاه + أعلام ضوضاء (صوديوم/هضم/نوم)، لا عبر قراءة مفردة. |

---

## 2. المراجعة العلمية وتصحيحات المواصفة الأصلية

> [!IMPORTANT]
> هذا القسم يوثّق الثغرات العلمية والهندسية في المواصفة الأولى والقرار المعتمد لكل منها. **على المطور الالتزام بالقرار المعتمد.**

### 2.1 تصحيحات علمية

| # | المشكلة في المواصفة الأصلية | القرار المعتمد | السبب العلمي |
|---|---|---|---|
| S1 | معادلة BMR للذكور فقط | إضافة معادلة الإناث: `-161` بدل `+5` | Mifflin-St Jeor (1990) تحدد ثابتين حسب الجنس. |
| S2 | `Dynamic TDEE = BMR×1.2 + Exercise kcal (Gross)` | استخدام **Net MET = (MET − 1)** افتراضياً | معامل 1.2 يغطي استهلاك الراحة طوال اليوم، بما فيه دقائق التمرين؛ استخدام MET الإجمالي يحسب الـ 1 MET مرتين ويضخم الحرق (~20–25% في التمارين الخفيفة). يُتاح مفتاح إعداد `use_net_met`. |
| S3 | الكافيين = غرام البن × 11 ثابت | الثابت يصبح **إعداداً قابلاً للتعديل** (افتراضي 11 mg/g للبن المحمص غير الفوري) + جدول قيم افتراضية لكل نوع مشروب | محتوى الكافيين في البن ~1.0–1.4% (أرابيكا ~12 mg/g، روبوستا ~22 mg/g) ونسبة الاستخلاص تختلف حسب طريقة التحضير (القهوة التركية/العربية غير المصفاة تقترب من الاستخلاص الكامل). |
| S4 | لا يوجد نموذج لبقاء الكافيين في الدم | إضافة **نموذج نصف العمر** (افتراضي 5 ساعات) لحساب الكافيين المتبقي وقت النوم | الكافيين يتبع حركية من الدرجة الأولى؛ T½ ≈ 3–7 ساعات. ≥ 100 mg متبقية عند النوم ترتبط بتأخر بدء النوم. |
| S5 | `7700 kcal/kg` كنموذج وحيد | يبقى للتوقع، مع إضافة **TDEE المرصود (Observed TDEE)** بعد 14 يوماً من البيانات | الأسابيع الأولى تشهد فقدان جلايكوجين + ماء (كل 1غ جلايكوجين يحتبس ~3غ ماء) فيبدو النزول أكبر من المتوقع؛ ولاحقاً التكيّف الأيضي (Adaptive Thermogenesis) يجعله أقل. الحل الهندسي الصحيح لنظام "Feedback" هو حساب الحرق الفعلي من البيانات. |
| S6 | الوزن أسبوعياً كقراءة مفردة | الوزن المعياري أسبوعي (إلزامي) + **وزن يومي اختياري** يغذي خط اتجاه **EMA** | تقلبات الماء اليومية ±0.5–1.5 كغ تتجاوز النزول الأسبوعي الحقيقي للدهون؛ قراءة واحدة أسبوعياً ذات نسبة إشارة/ضوضاء منخفضة. |
| S7 | لا يوجد مؤشر دهون | إضافة **محيط الرقبة** لحساب نسبة الدهون بطريقة US Navy، وإضافة **WHtR** | WHR وحده لا يعكس نسبة الدهون؛ WHtR < 0.5 مؤشر معتمد للخطر القلبي الأيضي. |
| S8 | قاعدة "الإجهاد الذهني" تفترض حرقاً إضافياً | تُصنَّف كـ **قاعدة سلوكية (Behavioral Heuristic)** لا أيضية | الدماغ يستهلك ~20% من BMR بشكل شبه ثابت؛ العمل الذهني المكثف لا يرفع الحرق بشكل يُذكر (+~5 kcal/ساعة)، لكن الأدلة تربط الإجهاد المعرفي + الجلوس بزيادة الشهية الليلية والأكل العاطفي. **لا تُضاف سعرات للـ TDEE من ساعات الشاشة.** |
| S9 | سعرات الحليب والسكر تُدخل يدوياً | تُحسب آلياً: الحليب حسب النوع (kcal/ml)، السكر = ملعقة صغيرة × 4.2غ × 4 kcal ≈ 16.8 kcal | تقليل أخطاء الإدخال. |
| S10 | النوم: لا يوجد حساب لكفاءة النوم | إضافة `waso_minutes` (الاستيقاظ الليلي بالدقائق) وحساب **Sleep Efficiency** و **Sleep Latency** و **Sleep Midpoint** | كفاءة ≥ 85% معيار نوم جيد؛ منتصف النوم يقيس انتظام الساعة البيولوجية. |
| S11 | لا يوجد حد أمان للعجز | حد أدنى للسعرات المستهدفة = `max(BMR, 1500♂ / 1200♀)` ومعدل نزول آمن 0.5–1% من وزن الجسم أسبوعياً | منع فقدان الكتلة العضلية والتكيف الأيضي الحاد. |

### 2.2 تصحيحات هندسية (Schema)

| # | المشكلة | القرار |
|---|---|---|
| E1 | `daily_logs` و `meal_items` مدمجان في جدول واحد | فصل إلى `meals` (رأس الوجبة: النوع والتوقيت) و `meal_items` (أصناف الوجبة) — علاقة 1:N. |
| E2 | `activity_and_screen_logs` جدول واحد | فصل إلى `screen_time_logs` (صف واحد لكل يوم) و `exercise_logs` (عدة تمارين في اليوم). |
| E3 | غياب `user_id` من معظم الجداول | إضافته لكل الجداول (حتى لو كان المستخدم واحداً) لسلامة البنية وقابلية التوسع. |
| E4 | `base_unit` غامض (غرام/وحدة) | `nutrition_basis` ENUM (`per_100g`, `per_100ml`, `per_unit`) + `grams_per_unit` لتحويل "بيضة" إلى غرامات. |
| E5 | القياسات الشهرية داخل جدول الوزن | فصل إلى `body_measurements` (شهري) و `weigh_ins` (أسبوعي/يومي) لاختلاف التردد. |
| E6 | لا يوجد مكان لتخزين التنبيهات | جدول `insights` مع `rule_code` و `payload JSONB` و `dismissed_at`. |
| E7 | `MET` تُدخل يدوياً | جدول `exercise_catalog` بقيم افتراضية + إمكانية التعديل لكل جلسة. |
| E8 | تخزين `TIME` بلا منطقة زمنية | استخدام `TIMESTAMPTZ` للأحداث، و`DATE` لليوم المحلي، مع `APP_TIMEZONE` في الإعدادات. |

### 2.3 تصحيحات تحليلية (v1.1)

> [!IMPORTANT]
> طُبّق فقط ما يستند إلى **برهان رياضي/منطقي** أو **مصدر قطعي**. ما فيه خلاف علمي بقي كما هو (آخر الجدول).

| # | المشكلة | القرار المعتمد | الدليل |
|---|---|---|---|
| A1 | الـ TDEE المرصود يُحسب من فرق قيمتي EMA | **ميل انحدار خطي (OLS)** على القراءات الخام الملتزمة: `TDEE_obs = avgIntake − slope × 7700`. الـ EMA للعرض فقط | رياضي: EMA متأخر ~ (1−α)/α = 9 أيام؛ في محاكاة نزول 0.5 كغ/أسبوع يُظهر 0.50 من 1.00 كغ في 14 يوماً ← انحياز −273 kcal (−168 عند 28 يوماً). |
| A2 | اليوم غير المكتمل التسجيل يُحسب عجزاً | جدول `day_status.intake_complete`؛ فقط الأيام المكتملة تدخل العجز والمتوقع والمرصود | منطقي: وجبة غير مسجلة ≠ عجز. |
| A3 | قواعد الثبات تستخدم العجز المعاير | تستخدم `formulaDeficit = TDEE_formula − intake` | منطقي: بعد المعايرة يأتي حتى 70% من TDEE من بيانات الوزن نفسها ← المتوقع ≈ الفعلي بالتصميم. |
| A4 | `time_drift_minutes` لا يعالج منتصف الليل والعمود مولّد | لفّ الفرق داخل التعبير المولّد إلى `[-720, 720)` | حسابي: 23:30 ← 00:30 كان −1380 ويصبح +60. |
| A5 | α ثابت لكل قراءة رغم عدم انتظام الفترات | `α_eff = 1 − (1 − α)^Δأيام` | رياضي: يعادل تطبيق α يومياً؛ للأسبوعي يعطي 0.52 ≈ القيمة 0.5 الأصلية. |
| A6 | `AGGRESSIVE_DEFICIT` يُطلق في الأسابيع الأولى | لا يُقيَّم قبل 14 يوماً من بداية التتبع | S5 نفسه: فقدان جلايكوجين + ماء في البداية. |
| A7 | العجز المخطط غير مقيّد بالوزن | `deficitApplied = min(planned, 0.01 × W × 7700 / 7)` | تطبيق حد S11 (1%/أسبوع). |
| A8 | معامل النشاط قد يشمل الرياضة المسجلة | AF = نشاط بدون تمارين (تنبيه في الواجهة) | منطقي: منع الحساب المزدوج. |
| A9 | بروتين الحليب غير محسوب | `milk_protein_g = ml × 0.033` | USDA FoodData Central (~3.3 غ/100 مل). |
| A10 | `navyBodyFat` يفشل عند غياب `neck_cm` | يعيد `null` | `neck_cm` اختياري في الجدول. |
| A11 | آخر وقت للقهوة يفترض جرعة واحدة | `latestDoseTime` يحتسب المتبقي من الجرعات السابقة | رياضي: نموذج نصف العمر جمعي. |

**لم يُغيَّر (لا دليل قاطع):** تصحيح MET بمعدل الراحة الشخصي (اتجاه الخطأ غير محسوم)، البروتين على الوزن المستهدف (ممارسة سريرية لا إجماع)، موضع قياس الخصر (Ross et al., Obes Rev 2008: الموضع لا يغيّر جوهرياً علاقة المحيط بالخطر)، تركيز كافيين القهوة التركية (قيم منشورة متباينة)، مدة الصيام 14 س (اختيار بروتوكول المستخدم).

### 2.4 قوائم يدخلها المستخدم (v1.2)

| # | التغيير | القرار |
|---|---|---|
| U1 | أنواع المشروبات كانت قائمة ثابتة (`drink_type_t`) بقيم كافيين ثابتة | جدول `beverage_catalog` يدخله المستخدم بقيم لكل 100 مل (كافيين، سعرات، بروتين) وخيار "بن موزون". `beverage_logs` يحفظ `drink_name` والقيم المحسوبة كـ Snapshot. القائمة **تبدأ فارغة**. |
| U2 | قاموس الأغذية كان يُملأ ببيانات أولية | لا بيانات أولية؛ **يبدأ فارغاً** ويُضاف الصنف من القاموس أو مباشرة من نموذج الوجبة. |
| U3 | الموعد المجدول يُدخل مع كل وجبة | **جدول الوجبات** في الإعدادات (`breakfast_time`، `lunch_time`، `dinner_time`)؛ الوجبة تأخذ موعدها منه وتحفظه كـ Snapshot. الوجبة الخفيفة بلا موعد. |

> الأقسام 5 و 6 و 9 أدناه تصف التصميم الأصلي؛ عند التعارض تُعتمد قرارات هذا الجدول ومرجع `schema.sql` في مهارة `asfit-database`.

---

## 3. المكدس التقني (Tech Stack)

| الطبقة | التقنية | الإصدار | سبب الاختيار |
|---|---|---|---|
| Runtime | Node.js | 24 LTS | الإصدار LTS الحالي، يدعم Next.js 16. |
| Framework | **Next.js (App Router)** | 16.x (16.3.8) | RSC + Server Actions = Full-Stack في مشروع واحد بلا API منفصل. |
| اللغة | TypeScript | 5.x (`strict: true`) | أمان الأنواع عبر الطبقات (DB ← Domain ← UI). |
| قاعدة البيانات | **PostgreSQL** | 16 (`postgres:16-alpine`) | Generated Columns، ENUMs، JSONB، Window Functions للاتجاهات. |
| ORM / Migrations | **Drizzle ORM** + drizzle-kit | latest | قريب من SQL، يدعم Generated Columns و ENUMs، خفيف، Type-safe. |
| التحقق | Zod | 3.x | مخطط واحد للتحقق في النماذج والـ Server Actions. |
| النماذج | React Hook Form + `@hookform/resolvers/zod` | latest | أداء عالٍ وتكامل مع Zod. |
| الرسوم البيانية | Recharts | 2.x | خطوط اتجاه الوزن، العجز التراكمي، توزيع الماكروز. |
| التاريخ والوقت | date-fns + date-fns-tz | 3.x | حساب العمر، فرق التوقيت، المناطق الزمنية. |
| التنسيق | Tailwind CSS (`@tailwindcss/postcss`) + Design Tokens في `@theme` | 4.x | سرعة البناء، Tokens دلالية موحدة، أصناف منطقية لدعم RTL (`ms-*`, `pe-*`). |
| الخطوط | Cairo (نصوص) + JetBrains Mono (أرقام) عبر `next/font` | — | عربية + لاتينية نظيفة، وأرقام بعرض ثابت كلوحة قياس. |
| اختبار الوحدات | Vitest | latest | اختبار المعادلات النقية. |
| اختبار E2E | Playwright | latest | تدفقات الإدخال الأساسية. |
| جودة الكود | ESLint + Prettier (أو Biome) | — | توحيد الأسلوب. |
| مدير الحزم | pnpm | 10.x (10.34.6) | سرعة وتوفير مساحة. |
| الحاويات | Docker + Docker Compose | v2 | تشغيل Postgres (والتطبيق اختيارياً) محلياً. |

---

## 4. الهندسة المعمارية للتطبيق

### 4.1 الطبقات (Layered Architecture)

```mermaid
flowchart TB
    UI["Presentation - app/ (RSC + Client Components)"]
    ACT["Application - server/actions (Server Actions + Zod)"]
    SVC["Services - server/services (orchestration: daily summary, insights run)"]
    DOM["Domain - domain/ (Pure scientific functions + rules)"]
    REPO["Data Access - server/db + server/queries (Drizzle)"]
    PG[("PostgreSQL 16 - Docker")]
    UI --> ACT --> SVC
    SVC --> DOM
    SVC --> REPO --> PG
    UI -.read.-> REPO
```

**قاعدة صارمة:** مجلد `domain/` **لا يستورد** أي شيء من `server/` أو `next/*` أو Drizzle. هو رياضيات خالصة.

### 4.2 هيكل المجلدات

```
AS_FIT/
├─ docker-compose.yml
├─ Dockerfile
├─ .env.example
├─ drizzle.config.ts
├─ package.json
├─ scripts/
│  ├─ backup.ps1              # pg_dump محلي
│  └─ restore.ps1
├─ drizzle/                   # ملفات الـ migrations المولدة
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx           # dir="rtl", fonts, theme
│  │  ├─ page.tsx             # Dashboard
│  │  ├─ log/
│  │  │  ├─ meals/page.tsx
│  │  │  ├─ beverages/page.tsx
│  │  │  ├─ activity/page.tsx
│  │  │  ├─ screen/page.tsx
│  │  │  └─ sleep/page.tsx
│  │  ├─ weigh-in/page.tsx
│  │  ├─ measurements/page.tsx
│  │  ├─ trends/page.tsx
│  │  ├─ insights/page.tsx
│  │  ├─ foods/page.tsx       # إدارة قاموس الأغذية
│  │  └─ settings/page.tsx
│  ├─ components/             # UI مشتركة (Card, Stat, Chart, Form fields)
│  ├─ styles/
│  │  └─ globals.css          # Tailwind v4 + @theme tokens
│  ├─ domain/                 # ⚠ Pure functions only
│  │  ├─ constants.ts
│  │  ├─ age.ts
│  │  ├─ metabolism.ts        # BMR, TDEE, targets
│  │  ├─ exercise.ts          # MET
│  │  ├─ nutrition.ts         # food portion → kcal/protein
│  │  ├─ beverages.ts         # caffeine, milk, sugar
│  │  ├─ caffeine-kinetics.ts # half-life model
│  │  ├─ anthropometry.ts     # WHR, WHtR, Navy BF%
│  │  ├─ sleep.ts
│  │  ├─ weight-trend.ts      # EMA, expected vs actual, observed TDEE
│  │  └─ insights/
│  │     ├─ types.ts
│  │     ├─ engine.ts
│  │     └─ rules/
│  │        ├─ lunch-time-drift.ts
│  │        ├─ cognitive-load.ts
│  │        ├─ false-plateau.ts
│  │        ├─ bedtime-caffeine.ts
│  │        ├─ late-eating.ts
│  │        └─ protein-shortfall.ts
│  ├─ server/
│  │  ├─ db/
│  │  │  ├─ client.ts
│  │  │  ├─ schema.ts
│  │  │  └─ seed.ts           # food_dictionary + exercise_catalog
│  │  ├─ queries/             # read models
│  │  ├─ services/
│  │  │  ├─ daily-summary.ts
│  │  │  └─ insights-runner.ts
│  │  └─ actions/             # 'use server'
│  │     ├─ meals.ts
│  │     ├─ beverages.ts
│  │     ├─ exercise.ts
│  │     ├─ screen.ts
│  │     ├─ sleep.ts
│  │     ├─ weigh-in.ts
│  │     ├─ measurements.ts
│  │     └─ profile.ts
│  └─ lib/
│     ├─ validation/          # Zod schemas
│     └─ time.ts              # timezone helpers
└─ tests/
   ├─ domain/                 # Vitest
   └─ e2e/                    # Playwright
```

### 4.3 تدفق كتابة نموذجي (تسجيل تمرين)

```mermaid
sequenceDiagram
    participant U as المستخدم
    participant F as Form (Client)
    participant A as Server Action
    participant D as domain/exercise.ts
    participant DB as PostgreSQL
    U->>F: نوع التمرين + المدة
    F->>A: logExercise(formData)
    A->>A: Zod.parse()
    A->>DB: آخر وزن معياري/اتجاه
    A->>D: exerciseKcal(met, weight, minutes, useNet)
    D-->>A: {gross, net}
    A->>DB: INSERT exercise_logs (snapshot weight + kcal)
    A->>A: runInsights(date)
    A-->>F: revalidatePath('/') + نتيجة
```

---

## 5. قاعدة البيانات (PostgreSQL Schema)

> [!NOTE]
> الـ DDL أدناه هو **المرجع الدلالي**. التنفيذ الفعلي عبر `src/server/db/schema.ts` (Drizzle) مع توليد migrations بـ `drizzle-kit`. يجب أن تطابق النتيجة هذا الـ DDL.

### 5.1 مخطط العلاقات (ERD)

```mermaid
erDiagram
    user_profiles ||--|| user_settings : has
    user_profiles ||--o{ meals : logs
    meals ||--o{ meal_items : contains
    food_dictionary ||--o{ meal_items : referenced_by
    user_profiles ||--o{ beverage_logs : logs
    user_profiles ||--o{ screen_time_logs : logs
    user_profiles ||--o{ exercise_logs : logs
    exercise_catalog ||--o{ exercise_logs : typed_by
    user_profiles ||--o{ sleep_logs : logs
    user_profiles ||--o{ weigh_ins : logs
    user_profiles ||--o{ body_measurements : logs
    user_profiles ||--o{ insights : receives
```

### 5.2 الأنواع (ENUMs)

```sql
CREATE TYPE gender_t          AS ENUM ('male', 'female');
CREATE TYPE meal_type_t       AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE nutrition_basis_t AS ENUM ('per_100g', 'per_100ml', 'per_unit');
CREATE TYPE drink_type_t      AS ENUM ('coffee_brewed', 'coffee_turkish', 'coffee_instant',
                                       'espresso', 'tea_black', 'tea_green',
                                       'water', 'soda_zero', 'herbal');
CREATE TYPE milk_type_t       AS ENUM ('none', 'whole', 'semi_skimmed', 'skimmed');
CREATE TYPE insight_severity_t AS ENUM ('info', 'warning', 'critical');
```

### 5.3 الملف الشخصي والإعدادات

```sql
CREATE TABLE user_profiles (
  id                       SERIAL PRIMARY KEY,
  display_name             VARCHAR(80)  NOT NULL,
  gender                   gender_t     NOT NULL,
  birth_date               DATE         NOT NULL,
  current_height_cm        NUMERIC(5,1) NOT NULL CHECK (current_height_cm BETWEEN 100 AND 250),
  initial_weight_kg        NUMERIC(5,2) NOT NULL CHECK (initial_weight_kg BETWEEN 30 AND 300),
  target_weight_kg         NUMERIC(5,2) NOT NULL CHECK (target_weight_kg  BETWEEN 30 AND 300),
  default_activity_factor  NUMERIC(4,3) NOT NULL DEFAULT 1.200
                           CHECK (default_activity_factor BETWEEN 1.0 AND 2.5),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id                    INT PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  timezone                   VARCHAR(64)  NOT NULL DEFAULT 'Asia/Riyadh',
  planned_daily_deficit_kcal INT          NOT NULL DEFAULT 500 CHECK (planned_daily_deficit_kcal BETWEEN 0 AND 1200),
  protein_g_per_kg           NUMERIC(3,2) NOT NULL DEFAULT 1.80 CHECK (protein_g_per_kg BETWEEN 0.8 AND 3.0),
  use_net_met                BOOLEAN      NOT NULL DEFAULT TRUE,
  caffeine_mg_per_g_coffee   NUMERIC(4,1) NOT NULL DEFAULT 11.0,
  caffeine_half_life_hours   NUMERIC(3,1) NOT NULL DEFAULT 5.0,
  required_fasting_hours     INT          NOT NULL DEFAULT 14,
  kcal_per_kg_fat            INT          NOT NULL DEFAULT 7700,
  ema_alpha_daily            NUMERIC(3,2) NOT NULL DEFAULT 0.10
);
```

### 5.4 قاموس الأغذية

```sql
CREATE TABLE food_dictionary (
  id               SERIAL PRIMARY KEY,
  item_name_ar     VARCHAR(120) NOT NULL,
  item_name_en     VARCHAR(120),
  nutrition_basis  nutrition_basis_t NOT NULL,          -- per_100g | per_100ml | per_unit
  grams_per_unit   NUMERIC(6,1),                        -- مثال: بيضة = 50g (اختياري لـ per_unit)
  calories         NUMERIC(7,2) NOT NULL CHECK (calories >= 0),   -- لكل 100g / 100ml / وحدة
  protein_g        NUMERIC(6,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g          NUMERIC(6,2) CHECK (carbs_g >= 0),
  fat_g            NUMERIC(6,2) CHECK (fat_g >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_name_ar)
);
```

### 5.5 الوجبات وأصنافها

```sql
CREATE TABLE meals (
  id                  SERIAL PRIMARY KEY,
  user_id             INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date            DATE NOT NULL,
  meal_type           meal_type_t NOT NULL,
  scheduled_time      TIME,
  actual_time         TIME NOT NULL,
  -- موجب = تأخير، سالب = تبكير. ملفوف إلى [-720, 720) لعبور منتصف الليل (A4)
  time_drift_minutes  INT GENERATED ALWAYS AS (
                        CASE WHEN scheduled_time IS NULL THEN NULL
                             ELSE ((((EXTRACT(EPOCH FROM (actual_time - scheduled_time)) / 60)::INT + 720) % 1440 + 1440) % 1440) - 720
                        END) STORED,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meals_user_date ON meals(user_id, log_date);

CREATE TABLE meal_items (
  id                   SERIAL PRIMARY KEY,
  meal_id              INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_item_id         INT NOT NULL REFERENCES food_dictionary(id),
  quantity             NUMERIC(7,2) NOT NULL CHECK (quantity > 0),  -- غرام أو مل أو عدد وحدات حسب basis
  -- Snapshot: لا يتغير عند تعديل القاموس لاحقاً
  calculated_calories  NUMERIC(7,2) NOT NULL,
  calculated_protein   NUMERIC(6,2) NOT NULL,
  calculated_carbs     NUMERIC(6,2),
  calculated_fat       NUMERIC(6,2)
);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);
```

### 5.6 المشروبات والكافيين

```sql
CREATE TABLE beverage_logs (
  id                 SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date           DATE NOT NULL,
  consumed_at        TIMESTAMPTZ NOT NULL,
  drink_type         drink_type_t NOT NULL,
  liquid_volume_ml   NUMERIC(6,1) NOT NULL CHECK (liquid_volume_ml >= 0),
  dry_coffee_grams   NUMERIC(5,1) CHECK (dry_coffee_grams >= 0),     -- للقهوة فقط
  milk_type          milk_type_t  NOT NULL DEFAULT 'none',
  milk_added_ml      NUMERIC(5,1) NOT NULL DEFAULT 0,
  sugar_teaspoons    NUMERIC(3,1) NOT NULL DEFAULT 0,
  -- Snapshots محسوبة في domain/beverages.ts
  caffeine_mg        NUMERIC(6,1) NOT NULL DEFAULT 0,
  milk_calories      NUMERIC(6,1) NOT NULL DEFAULT 0,
  milk_protein_g     NUMERIC(5,1) NOT NULL DEFAULT 0,   -- A9
  sugar_calories     NUMERIC(6,1) NOT NULL DEFAULT 0,
  total_calories     NUMERIC(6,1) GENERATED ALWAYS AS (milk_calories + sugar_calories) STORED
);
CREATE INDEX idx_bev_user_date ON beverage_logs(user_id, log_date);
```

### 5.6.1 اكتمال اليوم (A2)

```sql
CREATE TABLE day_status (
  user_id          INT  NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  intake_complete  BOOLEAN NOT NULL DEFAULT FALSE,   -- "أغلقت تسجيل اليوم"
  closed_at        TIMESTAMPTZ,
  PRIMARY KEY (user_id, log_date)
);
```

### 5.7 الشاشات والحمل الذهني

```sql
CREATE TABLE screen_time_logs (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  high_focus_hours      NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (high_focus_hours BETWEEN 0 AND 24),
  moderate_admin_hours  NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (moderate_admin_hours BETWEEN 0 AND 24),
  passive_media_hours   NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (passive_media_hours BETWEEN 0 AND 24),
  total_screen_hours    NUMERIC(4,2) GENERATED ALWAYS AS
                          (high_focus_hours + moderate_admin_hours + passive_media_hours) STORED,
  UNIQUE (user_id, log_date),
  CHECK (high_focus_hours + moderate_admin_hours + passive_media_hours <= 24)
);
```

### 5.8 التمارين

```sql
CREATE TABLE exercise_catalog (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(40) UNIQUE NOT NULL,   -- walking_brisk, running_8kmh, football_gk, home_workout
  name_ar        VARCHAR(80) NOT NULL,
  default_met    NUMERIC(4,1) NOT NULL CHECK (default_met > 1),
  compendium_ref VARCHAR(20)                    -- رمز Compendium of Physical Activities
);

CREATE TABLE exercise_logs (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  exercise_id           INT NOT NULL REFERENCES exercise_catalog(id),
  duration_minutes      INT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 600),
  met_value             NUMERIC(4,1) NOT NULL,           -- قابل للتعديل عن الافتراضي
  weight_used_kg        NUMERIC(5,2) NOT NULL,           -- Snapshot
  gross_burned_kcal     NUMERIC(7,1) NOT NULL,
  net_burned_kcal       NUMERIC(7,1) NOT NULL,           -- (MET-1) — هذا ما يُضاف للـ TDEE افتراضياً
  notes                 TEXT
);
CREATE INDEX idx_ex_user_date ON exercise_logs(user_id, log_date);
```

### 5.9 النوم

```sql
CREATE TABLE sleep_logs (
  id                         SERIAL PRIMARY KEY,
  user_id                    INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date                   DATE NOT NULL,        -- = تاريخ الاستيقاظ
  bed_time                   TIMESTAMPTZ NOT NULL,
  sleep_onset_time           TIMESTAMPTZ NOT NULL,
  wake_up_time               TIMESTAMPTZ NOT NULL,
  night_interruptions_count  INT NOT NULL DEFAULT 0 CHECK (night_interruptions_count >= 0),
  waso_minutes               INT NOT NULL DEFAULT 0 CHECK (waso_minutes >= 0),  -- Wake After Sleep Onset
  wake_freshness_score       SMALLINT NOT NULL CHECK (wake_freshness_score BETWEEN 1 AND 5),
  time_in_bed_min            INT GENERATED ALWAYS AS
                               ((EXTRACT(EPOCH FROM (wake_up_time - bed_time)) / 60)::INT) STORED,
  sleep_latency_min          INT GENERATED ALWAYS AS
                               ((EXTRACT(EPOCH FROM (sleep_onset_time - bed_time)) / 60)::INT) STORED,
  total_sleep_min            INT GENERATED ALWAYS AS
                               ((EXTRACT(EPOCH FROM (wake_up_time - sleep_onset_time)) / 60)::INT
                                 - waso_minutes) STORED,
  UNIQUE (user_id, log_date),
  CHECK (bed_time <= sleep_onset_time AND sleep_onset_time < wake_up_time)
);
```

### 5.10 الوزن المعياري

```sql
CREATE TABLE weigh_ins (
  id                       SERIAL PRIMARY KEY,
  user_id                  INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date                 DATE NOT NULL,
  measured_at              TIMESTAMPTZ NOT NULL,
  dry_fasted_weight_kg     NUMERIC(5,2) NOT NULL CHECK (dry_fasted_weight_kg BETWEEN 30 AND 300),
  -- بروتوكول القياس
  last_meal_at             TIMESTAMPTZ NOT NULL,
  fasting_hours            NUMERIC(4,1) GENERATED ALWAYS AS
                             (EXTRACT(EPOCH FROM (measured_at - last_meal_at)) / 3600) STORED,
  bathroom_done            BOOLEAN NOT NULL,
  no_fluids_before         BOOLEAN NOT NULL,
  -- فلاتر الضوضاء
  high_sodium_yesterday    BOOLEAN NOT NULL DEFAULT FALSE,
  normal_digestion         BOOLEAN NOT NULL DEFAULT TRUE,
  is_official_weekly       BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = وزن يومي اختياري
  is_protocol_compliant    BOOLEAN NOT NULL,                -- يُحسب في الـ Action مقابل required_fasting_hours
  UNIQUE (user_id, log_date)
);
```

### 5.11 القياسات الشهرية

```sql
CREATE TABLE body_measurements (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL,
  neck_cm     NUMERIC(5,1),
  chest_cm    NUMERIC(5,1),
  waist_cm    NUMERIC(5,1) NOT NULL,   -- عند مستوى السرة، نهاية الزفير
  hip_cm      NUMERIC(5,1) NOT NULL,   -- أعرض نقطة في الأرداف
  thigh_cm    NUMERIC(5,1),
  bicep_cm    NUMERIC(5,1),
  whr         NUMERIC(4,3) GENERATED ALWAYS AS (waist_cm / NULLIF(hip_cm, 0)) STORED,
  UNIQUE (user_id, log_date)
);
```

### 5.12 التنبيهات

```sql
CREATE TABLE insights (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rule_code     VARCHAR(40) NOT NULL,
  severity      insight_severity_t NOT NULL,
  title         VARCHAR(160) NOT NULL,
  message       TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- الأرقام التي أدت للتنبيه
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at  TIMESTAMPTZ,
  UNIQUE (user_id, rule_code, period_start, period_end)  -- منع التكرار
);
```

### 5.13 عرض الملخص اليومي (Read Model)

```sql
CREATE OR REPLACE VIEW v_daily_intake AS
SELECT d.user_id, d.log_date,
       COALESCE(f.food_kcal, 0)    AS food_kcal,
       COALESCE(f.food_protein, 0) AS food_protein_g,
       COALESCE(b.bev_kcal, 0)     AS beverage_kcal,
       COALESCE(b.bev_protein, 0)  AS beverage_protein_g,
       COALESCE(b.caffeine_mg, 0)  AS caffeine_mg,
       COALESCE(e.net_kcal, 0)     AS exercise_net_kcal,
       COALESCE(e.gross_kcal, 0)   AS exercise_gross_kcal,
       COALESCE(f.food_kcal, 0) + COALESCE(b.bev_kcal, 0)       AS total_intake_kcal,
       COALESCE(f.food_protein, 0) + COALESCE(b.bev_protein, 0) AS total_protein_g,
       COALESCE(ds.intake_complete, FALSE)                      AS intake_complete
FROM (
  SELECT user_id, log_date FROM meals
  UNION SELECT user_id, log_date FROM beverage_logs
  UNION SELECT user_id, log_date FROM exercise_logs
) d
LEFT JOIN (
  SELECT m.user_id, m.log_date,
         SUM(mi.calculated_calories) AS food_kcal,
         SUM(mi.calculated_protein)  AS food_protein
  FROM meals m JOIN meal_items mi ON mi.meal_id = m.id
  GROUP BY m.user_id, m.log_date
) f USING (user_id, log_date)
LEFT JOIN (
  SELECT user_id, log_date, SUM(total_calories) AS bev_kcal, SUM(milk_protein_g) AS bev_protein,
         SUM(caffeine_mg) AS caffeine_mg
  FROM beverage_logs GROUP BY user_id, log_date
) b USING (user_id, log_date)
LEFT JOIN (
  SELECT user_id, log_date, SUM(net_burned_kcal) AS net_kcal, SUM(gross_burned_kcal) AS gross_kcal
  FROM exercise_logs GROUP BY user_id, log_date
) e USING (user_id, log_date)
LEFT JOIN day_status ds USING (user_id, log_date);
```

> [!TIP]
> الـ TDEE والعجز **لا يُحسبان في SQL** لأنهما يعتمدان على العمر والوزن الحالي والإعدادات؛ يُحسبان في `server/services/daily-summary.ts` باستدعاء دوال `domain/`.

### 5.14 بيانات أولية (Seed)

**`exercise_catalog`:**

| code | الاسم | MET افتراضي |
|---|---|---|
| `walking_moderate` | مشي معتدل (~5 كم/س) | 3.5 |
| `walking_brisk` | مشي سريع (~5.6–6.4 كم/س) | 4.3 |
| `running_8kmh` | جري (8 كم/س) | 8.3 |
| `running_10kmh` | جري (10 كم/س) | 9.8 |
| `football_gk_training` | كرة قدم — حارس مرمى/تدريب | 5.0 |
| `football_casual` | كرة قدم — لعب عام | 7.0 |
| `football_competitive` | كرة قدم — مباراة تنافسية | 10.0 |
| `home_workout_moderate` | تمارين منزلية (وزن الجسم) معتدلة | 3.8 |
| `home_workout_vigorous` | تمارين منزلية مكثفة / دائرية | 8.0 |

**`food_dictionary` (أمثلة — قيم تقريبية USDA):**

| الصنف | basis | grams_per_unit | kcal | protein (g) |
|---|---|---|---|---|
| بيضة كاملة | per_unit | 50 | 72 | 6.3 |
| صدر دجاج مطبوخ (مشوي) | per_100g | — | 165 | 31.0 |
| رز أبيض مطبوخ | per_100g | — | 130 | 2.7 |
| خبز أسمر (قمح كامل) | per_100g | — | 247 | 13.0 |
| زبادي يوناني قليل الدسم | per_100g | — | 73 | 10.0 |
| تونة معلبة بالماء (مصفاة) | per_100g | — | 116 | 26.0 |
| شوفان جاف | per_100g | — | 389 | 16.9 |
| زيت زيتون | per_100g | — | 884 | 0 |

---

## 6. المحرك العلمي — المعادلات والتنفيذ البرمجي

> كل الدوال التالية تُكتب في `src/domain/` كدوال نقية. الأرقام تُقرَّب **فقط عند العرض**، لا أثناء الحساب.

### 6.1 الثوابت

```ts
// src/domain/constants.ts
export const KCAL_PER_KG_FAT_DEFAULT = 7700;
export const SUGAR_GRAMS_PER_TSP = 4.2;
export const KCAL_PER_GRAM_CARB = 4;
export const MILK_KCAL_PER_ML = { none: 0, whole: 0.62, semi_skimmed: 0.46, skimmed: 0.35 } as const;
export const MIN_INTAKE_KCAL = { male: 1500, female: 1200 } as const;
export const SAFE_WEEKLY_LOSS_PCT = { min: 0.005, max: 0.01 } as const; // 0.5%–1% من وزن الجسم
```

### 6.2 العمر

$$\text{Age} = \left\lfloor \frac{\text{today} - \text{birth\_date}}{\text{years}} \right\rfloor$$

```ts
// src/domain/age.ts
import { differenceInYears } from 'date-fns';
export const ageInYears = (birthDate: Date, on: Date) => differenceInYears(on, birthDate);
```

### 6.3 معدل الأيض الأساسي (BMR — Mifflin-St Jeor, 1990)

$$\text{BMR}_{\text{male}} = 10W + 6.25H - 5A + 5$$
$$\text{BMR}_{\text{female}} = 10W + 6.25H - 5A - 161$$

حيث: $W$ = الوزن (كغ) — **يُستخدم وزن خط الاتجاه (EMA) الأحدث** وليس آخر قراءة مفردة، $H$ = الطول (سم)، $A$ = العمر (سنة).

```ts
// src/domain/metabolism.ts
export type Gender = 'male' | 'female';

export function bmrMifflin(p: { weightKg: number; heightCm: number; ageYears: number; gender: Gender }) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears;
  return p.gender === 'male' ? base + 5 : base - 161;
}
```

### 6.4 الحرق اليومي الديناميكي (Dynamic TDEE)

$$\text{Base TDEE} = \text{BMR} \times \text{AF} \qquad (\text{AF}=1.2 \text{ للجلوس الطويل})$$

$$\text{Dynamic TDEE} = \text{Base TDEE} + \sum \text{Exercise}_{\text{net}}$$

> [!WARNING]
> **لا تُضاف أي سعرات لساعات الشاشة أو الإجهاد الذهني** (انظر S8).
> **AF يمثّل النشاط بدون التمارين المسجلة** (A8)؛ رفعه لـ 1.55 مع تسجيل التمارين = حساب مزدوج.

```ts
export function baseTdee(bmr: number, activityFactor = 1.2) {
  return bmr * activityFactor;
}

export function dynamicTdee(base: number, exerciseKcal: number) {
  return base + exerciseKcal;
}
```

### 6.5 سعرات التمرين (MET)

**الإجمالي (Gross):**
$$\text{kcal}_{\text{gross}} = \text{MET} \times 3.5 \times \frac{W}{200} \times t_{\text{min}}$$

**الصافي (Net) — الافتراضي المضاف للـ TDEE:**
$$\text{kcal}_{\text{net}} = (\text{MET} - 1) \times 3.5 \times \frac{W}{200} \times t_{\text{min}}$$

> الأساس: 1 MET = 3.5 مل O₂/كغ/دقيقة، و 1 لتر O₂ ≈ 5 kcal ← القسمة على 200 = (1000 مل ÷ 5 kcal).

```ts
// src/domain/exercise.ts
export function exerciseKcal(met: number, weightKg: number, minutes: number) {
  const perMinute = (m: number) => (m * 3.5 * weightKg) / 200;
  return {
    gross: perMinute(met) * minutes,
    net: perMinute(Math.max(met - 1, 0)) * minutes,
  };
}
```

### 6.6 التغذية — تحويل الكمية إلى سعرات

$$
\text{kcal} =
\begin{cases}
\text{calories} \times \dfrac{q}{100} & \text{per\_100g / per\_100ml} \\[6pt]
\text{calories} \times q & \text{per\_unit}
\end{cases}
$$

```ts
// src/domain/nutrition.ts
export type Basis = 'per_100g' | 'per_100ml' | 'per_unit';
export function portionNutrition(food: { basis: Basis; calories: number; protein: number }, quantity: number) {
  const factor = food.basis === 'per_unit' ? quantity : quantity / 100;
  return { calories: food.calories * factor, protein: food.protein * factor };
}
```

### 6.7 المشروبات: الكافيين، الحليب، السكر

**قهوة مُحضَّرة من بن مطحون:**
$$\text{Caffeine (mg)} = \text{Dry Coffee (g)} \times k \qquad (k = 11 \text{ mg/g افتراضياً، قابل للتعديل})$$

**باقي المشروبات (عند غياب وزن البن):**
$$\text{Caffeine (mg)} = \text{Volume (ml)} \times c_{\text{type}}$$

| النوع | $c_{\text{type}}$ (mg/ml) | ملاحظة |
|---|---|---|
| coffee_brewed (بدون وزن بن) | 0.40 | ~95 mg / 240 ml |
| coffee_instant | 0.27 | ~65 mg / 240 ml |
| espresso | 2.10 | ~63 mg / 30 ml |
| tea_black | 0.20 | ~47 mg / 240 ml |
| tea_green | 0.12 | ~28 mg / 240 ml |
| soda_zero (كولا) | 0.10 | ~34 mg / 330 ml |
| water / herbal | 0 | — |

**السعرات:**
$$\text{Milk kcal} = \text{ml} \times \rho_{\text{milk type}} \qquad \text{Sugar kcal} = \text{tsp} \times 4.2 \times 4$$

```ts
// src/domain/beverages.ts
import { MILK_KCAL_PER_ML, SUGAR_GRAMS_PER_TSP, KCAL_PER_GRAM_CARB } from './constants';

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
  const sugarKcal = b.sugarTsp * SUGAR_GRAMS_PER_TSP * KCAL_PER_GRAM_CARB;
  return { caffeineMg: caffeine, milkKcal, sugarKcal, totalKcal: milkKcal + sugarKcal };
}
```

### 6.8 حركية الكافيين (Half-life Model)

$$C_{\text{residual}}(t_{\text{bed}}) = \sum_{i} D_i \times 0.5^{\frac{t_{\text{bed}} - t_i}{T_{1/2}}}$$

```ts
// src/domain/caffeine-kinetics.ts
export function residualCaffeineMg(doses: { mg: number; at: Date }[], at: Date, halfLifeH = 5) {
  return doses
    .filter(d => d.at <= at)
    .reduce((sum, d) => sum + d.mg * Math.pow(0.5, (at.getTime() - d.at.getTime()) / 3.6e6 / halfLifeH), 0);
}
```

| الكافيين المتبقي وقت النوم | التفسير |
|---|---|
| < 50 mg | تأثير ضئيل |
| 50–100 mg | قد يؤخر بدء النوم لدى الحساسين |
| > 100 mg | تأثير محتمل على الكمون والنوم العميق ← تنبيه |

> المرجع العام: الحد الآمن اليومي للبالغين ≤ 400 mg (EFSA / FDA).

### 6.9 مؤشرات شكل الجسم (Anthropometry)

**نسبة الخصر إلى الورك (WHR):**
$$\text{WHR} = \frac{\text{Waist}}{\text{Hip}}$$

**نسبة الخصر إلى الطول (WHtR):**
$$\text{WHtR} = \frac{\text{Waist}}{\text{Height}}$$

**نسبة الدهون — US Navy (بالسنتيمتر):**
$$\%BF_{\text{male}} = \frac{495}{1.0324 - 0.19077\log_{10}(\text{waist} - \text{neck}) + 0.15456\log_{10}(\text{height})} - 450$$
$$\%BF_{\text{female}} = \frac{495}{1.29579 - 0.35004\log_{10}(\text{waist} + \text{hip} - \text{neck}) + 0.22100\log_{10}(\text{height})} - 450$$

| المؤشر | ذكور | إناث | المرجع |
|---|---|---|---|
| WHR — خطر مرتفع | ≥ 0.90 | ≥ 0.85 | WHO (2008) |
| WHtR — هدف صحي | < 0.50 | < 0.50 | Ashwell et al. |

```ts
// src/domain/anthropometry.ts
export const whr = (waist: number, hip: number) => waist / hip;
export const whtr = (waist: number, height: number) => waist / height;

// null = قياس ناقص أو قيم غير صالحة للوغاريتم (A10)
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

export function whrRisk(value: number, gender: 'male' | 'female') {
  return value >= (gender === 'male' ? 0.90 : 0.85) ? 'high' : 'normal';
}
```

### 6.10 مقاييس النوم

| المقياس | المعادلة | الهدف |
|---|---|---|
| Time in Bed (TIB) | `wake − bed` | — |
| Sleep Latency (SOL) | `onset − bed` | ≤ 20 دقيقة |
| Total Sleep Time (TST) | `wake − onset − WASO` | 7–9 ساعات |
| Sleep Efficiency (SE) | `TST / TIB × 100` | ≥ 85% |
| Sleep Midpoint | `onset + (wake − onset)/2` | ثبات ±30 دقيقة يومياً |
| Social Jet Lag | `|midpoint_weekend − midpoint_weekday|` | < 1 ساعة |

```ts
// src/domain/sleep.ts
export function sleepMetrics(s: { bed: Date; onset: Date; wake: Date; wasoMin: number }) {
  const min = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 60000;
  const tib = min(s.bed, s.wake);
  const tst = min(s.onset, s.wake) - s.wasoMin;
  const midpoint = new Date(s.onset.getTime() + (s.wake.getTime() - s.onset.getTime()) / 2);
  return { tibMin: tib, latencyMin: min(s.bed, s.onset), tstMin: tst, efficiencyPct: (tst / tib) * 100, midpoint };
}
```

### 6.11 الوزن: خط الاتجاه، المتوقع مقابل الفعلي، والـ TDEE المرصود

**أ. خط الاتجاه (EMA مرتبط بالزمن — A5) — للعرض وقواعد الضوضاء:**
$$T_t = T_{t-1} + \alpha_{\text{eff}}\,(W_t - T_{t-1}), \qquad \alpha_{\text{eff}} = 1 - (1-\alpha)^{\Delta d}$$
- $\alpha = 0.10$ لكل يوم (طريقة Hacker's Diet). للقراءات الأسبوعية ($\Delta d = 7$) يعطي تلقائياً $\alpha_{\text{eff}} \approx 0.52$.
- تُستبعد من الحساب القراءات غير الملتزمة بالبروتوكول (`is_protocol_compliant = false`).

**ب. العجز والنزول المتوقع (الأيام المكتملة فقط — A2):**
$$\text{Deficit}_d = \text{Dynamic TDEE}_d - \text{Intake}_d$$
$$\text{Expected Loss (kg)} = \frac{\sum_{d \in \text{complete}} \text{Deficit}_d}{7700}$$

**ج. الـ TDEE المرصود (قلب حلقة التغذية الراجعة) — بعد ≥ 14 يوماً (A1):**
$$\text{TDEE}_{\text{observed}} = \overline{\text{Intake}}_{\text{complete}} - s \times 7700$$
حيث $s$ = ميل الانحدار الخطي (OLS) للقراءات الخام الملتزمة بالكغ/يوم (سالب عند النزول). **لا يُحسب من فرق قيمتي EMA**: تأخر الـ EMA ~9 أيام يُظهر نصف النزول فقط في أول 14 يوماً.

**د. المعايرة (Blending):**
$$\text{TDEE}_{\text{used}} = (1 - \beta)\,\text{TDEE}_{\text{formula}} + \beta\,\text{TDEE}_{\text{observed}}, \quad \beta = \min\!\left(\frac{N_{\text{days}} - 14}{28},\ 0.7\right)$$

> يبدأ $\beta$ من 0 عند اليوم 14 ويصل 0.7 عند اليوم 42، فيبقى للمعادلة النظرية 30% كمرساة ضد أخطاء التسجيل.

```ts
// src/domain/weight-trend.ts
export type WeightPoint = { day: number; weight: number };

export function emaTrend(points: WeightPoint[], alpha = 0.1) {
  const out: number[] = [];
  points.forEach((p, i) => {
    if (i === 0) { out.push(p.weight); return; }
    const a = 1 - Math.pow(1 - alpha, p.day - points[i - 1].day);
    out.push(out[i - 1] + a * (p.weight - out[i - 1]));
  });
  return out;
}

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

export function observedTdee(p: { avgIntake: number; slopeKgPerDay: number; kcalPerKg?: number }) {
  return p.avgIntake - p.slopeKgPerDay * (p.kcalPerKg ?? 7700);
}

export function blendedTdee(formula: number, observed: number | null, days: number) {
  if (observed == null || days < 14) return formula;
  const beta = Math.min((days - 14) / 28, 0.7);
  return (1 - beta) * formula + beta * observed;
}
```

### 6.12 الأهداف اليومية

$$\text{Deficit}_{\text{applied}} = \min\left(\text{Planned Deficit},\ \frac{0.01 \times W \times 7700}{7}\right) \qquad (\text{A7})$$
$$\text{Calorie Target} = \max\left(\text{TDEE}_{\text{used}} - \text{Deficit}_{\text{applied}},\ \max(\text{BMR},\ \text{MIN}_{\text{gender}})\right)$$
$$\text{Protein Target (g)} = \text{protein\_g\_per\_kg} \times W_{\text{trend}} \qquad (1.6–2.2 \text{ g/kg أثناء العجز})$$

```ts
export const maxSafeDeficit = (weightKg: number, kcalPerKg = 7700) => (0.01 * weightKg * kcalPerKg) / 7;

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

---

## 7. بروتوكول الوزن المعياري

### 7.1 الشروط الإلزامية (Gate Checks)

| # | الشرط | التحقق البرمجي |
|---|---|---|
| 1 | صيام ≥ 14 ساعة منذ آخر وجبة | `measured_at − last_meal_at ≥ required_fasting_hours`. يُقترح `last_meal_at` آلياً من آخر `meals.actual_time` لليوم السابق. |
| 2 | بعد دخول الحمام | Checkbox إلزامي `bathroom_done = true` |
| 3 | قبل شرب أي ماء/قهوة | Checkbox إلزامي `no_fluids_before = true` + تحقق: لا يوجد `beverage_logs` قبل `measured_at` في نفس اليوم |
| 4 | مؤشرات الضوضاء | `high_sodium_yesterday`, `normal_digestion` (إلزامية الإجابة) |
| 5 | نفس الميزان، نفس المكان، ملابس خفيفة/بدون | نص إرشادي في الواجهة |

### 7.2 منطق التحقق

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

> [!NOTE]
> القراءة غير الملتزمة **تُحفظ** (لا تُرفض) لكن تُعلَّم `is_protocol_compliant = false`، وتظهر بلون مختلف في الرسم، ولا تدخل في حساب الـ TDEE المرصود.

### 7.3 تدفق واجهة الوزن

```mermaid
flowchart TD
    A["فتح شاشة الوزن الأسبوعي"] --> B["عرض آخر وجبة مقترحة آلياً"]
    B --> C{"صيام >= 14 ساعة؟"}
    C -- لا --> C1["تحذير + عرض الوقت المتبقي"]
    C -- نعم --> D["Checklist: الحمام / بلا سوائل"]
    C1 --> D
    D --> E["أسئلة الضوضاء: صوديوم أمس؟ هضم طبيعي؟"]
    E --> F["إدخال الوزن"]
    F --> G["حفظ + حساب الالتزام"]
    G --> H["تحديث EMA + تشغيل محرك التنبيهات"]
```

---

## 8. محرك التحليل الذكي (Insights Engine)

### 8.1 التصميم

- كل قاعدة = وحدة مستقلة تنفذ واجهة `InsightRule`.
- المحرك يبني **سياق (Context)** للفترة المطلوبة مرة واحدة من قاعدة البيانات، ثم يمرره لكل القواعد (دوال نقية).
- النتائج تُكتب بـ `INSERT ... ON CONFLICT DO NOTHING` لمنع التكرار.
- يُشغَّل بعد كل عملية حفظ (`runInsights(date)`) + عند فتح الـ Dashboard.

```ts
// src/domain/insights/types.ts
export interface DayContext {
  date: string;
  meals: { type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; driftMin: number | null; kcal: number; protein: number; actualAt: Date }[];
  intakeKcal: number;
  proteinG: number;
  proteinTargetG: number;
  intakeComplete: boolean;
  tdee: number;
  deficit: number;
  formulaDeficit: number;   // TDEE_formula − intake — لقواعد الثبات (A3)
  highFocusH: number;
  sleep?: { tstMin: number; efficiencyPct: number; bedAt: Date };
  caffeineDoses: { mg: number; at: Date }[];
}

export interface PeriodContext {
  days: DayContext[];
  weighIns: { date: string; weight: number; trend: number; highSodium: boolean; normalDigestion: boolean; compliant: boolean }[];
  settings: { caffeineHalfLifeH: number; kcalPerKg: number };
  trackingDay: number;
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

### 8.2 القواعد المعتمدة

| الكود | القاعدة | الشرط | النتيجة | الأساس |
|---|---|---|---|---|
| `LUNCH_DRIFT` | الانحراف الزمني للغداء | `drift(lunch) > +90 min` | تحذير: احتمال زيادة سعرات الوجبة؛ يُعرض مقارنة سعرات الغداء المتأخر بمتوسط الغداء المنتظم | ارتباط تأخر الوجبات بالجوع الشديد والإفراط اللاحق (Chrono-nutrition). ملاحظة: الأدلة على "هبوط السكر" لدى الأصحاء محدودة، فتُصاغ الرسالة كـ"جوع متراكم". |
| `COGNITIVE_LOAD` | الإجهاد الذهني | `high_focus_hours > 5` | اقتراح وجبة خفيفة بروتينية (20–30غ) قبل نهاية العمل + رفع هدف البروتين المعروض لليوم +0.2 g/kg | قاعدة سلوكية لمنع النهم الليلي (S8). |
| `FALSE_PLATEAU` | ثبات الوزن الكاذب | نافذة 7–14 يوم (≥ 7 أيام مكتملة، `expectedLoss` من `formulaDeficit`): `expectedLoss ≥ 0.4 kg` و `Δtrend > −0.1 kg` و (`highSodium` أو `avgTST < 6h` أو `!normalDigestion`) | معلومة: الثبات على الأرجح احتباس سوائل لا توقف حرق الدهون | الصوديوم وقلة النوم (ارتفاع الكورتيزول) يسببان احتباس الماء. |
| `TRUE_PLATEAU` | ثبات حقيقي محتمل | نفس شرط الثبات ≥ 21 يوماً **بدون** أعلام ضوضاء | تحذير: راجع دقة تسجيل الوجبات؛ عرض الـ TDEE المرصود مقابل النظري | تكيّف أيضي أو أخطاء تسجيل (Under-reporting شائع 20–40%). |
| `BEDTIME_CAFFEINE` | كافيين وقت النوم | `residualCaffeine(bed_time) > 100 mg` | تحذير مع آخر وقت مقترح للقهوة (`latestDoseTime`، يحتسب الجرعات السابقة — A11) | T½ ≈ 5h. |
| `LATE_EATING` | الأكل المتأخر | آخر وجبة < 3 ساعات قبل `bed_time` | معلومة: تأثير محتمل على جودة النوم والهضم | Chrono-nutrition. |
| `PROTEIN_SHORT` | نقص البروتين | `proteinG < 0.8 × proteinTarget` لـ 3 أيام من آخر 5 | تحذير: خطر فقدان كتلة عضلية أثناء العجز | توصيات ISSN. |
| `AGGRESSIVE_DEFICIT` | عجز مفرط | نزول الاتجاه > 1% من الوزن أسبوعياً لأسبوعين، بعد أول 14 يوماً من التتبع (A6) | تحذير: خفّض العجز | حماية الكتلة العضلية. |

### 8.3 مثال تنفيذ قاعدة

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
    const stalled = expected >= 0.4 && actual < 0.1;
    if (!stalled) return [];

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
      message: `العجز المتراكم يعادل ${expected.toFixed(2)} كغ، لكن الاتجاه نزل ${actual.toFixed(2)} كغ فقط. الأسباب المرجحة: ${reasons.join('، ')}. الدهون على الأرجح تُحرق والماء يحجب النتيجة.`,
      payload: { expectedKg: expected, actualKg: actual, reasons, avgSleepH },
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
// ... باقي القواعد
export const RULES: InsightRule[] = [falsePlateau /*, lunchDrift, cognitiveLoad, ... */];
export const runRules = (ctx: PeriodContext): InsightResult[] => RULES.flatMap(r => r.evaluate(ctx));
```

---

## 9. طبقة الخادم: Server Actions & Queries

### 9.1 عقود الـ Actions

| Action | المدخلات (Zod) | المنطق | التأثيرات |
|---|---|---|---|
| `upsertProfile` | بيانات الملف | تحقق النطاقات | `revalidatePath('/')` |
| `createMeal` | `logDate, mealType, scheduledTime?, actualTime, items[{foodId, quantity}]` | `portionNutrition` لكل صنف (Snapshot) داخل **Transaction** | `runInsights(date)` |
| `logBeverage` | نوع، حجم، بن؟، حليب، سكر، وقت | `beverageMetrics` | `runInsights(date)` |
| `logExercise` | `exerciseId, minutes, metOverride?` | جلب وزن الاتجاه + `exerciseKcal` | `runInsights(date)` |
| `upsertScreenTime` | الساعات الثلاث | تحقق المجموع ≤ 24 | `runInsights(date)` |
| `logSleep` | الأوقات + WASO + الانتعاش | تحقق الترتيب الزمني | `runInsights(date)` |
| `logWeighIn` | انظر §7 | `protocolCompliance` | تحديث EMA + `runInsights(range)` |
| `logMeasurements` | المحيطات | — | حساب WHR/WHtR/BF% عند العرض |
| `dismissInsight` | `id` | `dismissed_at = now()` | — |
| `setDayComplete` | `logDate, complete` | Upsert على `day_status` (A2) | `runInsights(range)` |

### 9.2 نمط الـ Action

> [!NOTE]
> المثال أدناه هو التصميم الأولي. التنفيذ الفعلي يستقبل كائناً عادياً بدل `FormData`، ويستخدم مخططات `src/lib/validation/schemas.ts` المشتركة مع النماذج، ويحدّث كل الصفحات بـ `revalidatePath('/', 'layout')`. انظر `src/server/actions/` ومهارة `asfit-server-actions`.

```ts
// src/server/actions/exercise.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/server/db/client';
import { exerciseLogs, exerciseCatalog } from '@/server/db/schema';
import { exerciseKcal } from '@/domain/exercise';
import { getCurrentTrendWeight } from '@/server/queries/weight';
import { runInsights } from '@/server/services/insights-runner';
import { eq } from 'drizzle-orm';

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

### 9.3 خدمة الملخص اليومي

```ts
// src/server/services/daily-summary.ts  (pseudo)
export async function getDailySummary(userId: number, date: string) {
  const [profile, settings, intake, trendW, observed] = await Promise.all([...]);
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

> `observed`: `linearSlope` على القراءات الخام الملتزمة في آخر 14–42 يوماً + متوسط Intake للأيام المكتملة فقط ← `observedTdee` (A1, A2).

---

## 10. واجهة المستخدم (UI / Pages)

### 10.1 الهوية البصرية

**Fitness Telemetry UI — Light & Green:** لوحة تحكم رياضية نظيفة (Clean & Minimalist) تمنح شعوراً بالطاقة والنقاء والنظام. وضع فاتح فقط، اتجاه **RTL** كامل، والتنفيذ بـ **Tailwind CSS v4** مع Tokens دلالية في `@theme` (الألوان الافتراضية لـ Tailwind معطلة).

| الدور | اللون |
|---|---|
| خلفية التطبيق | `#F4FBF7` |
| البطاقات | بلا خلفية وبلا ظل، حدّ `#E2E8F0` و `rounded-xl` |
| الأساسي | `#10B981` (تعبئة/تقدم) — `#059669` (أزرار) — `#047857` (نص أخضر) |
| تحذير / خطر | `#F59E0B` / `#EF4444` (مع نسخ `-ink` داكنة للنص و `-soft` باهتة للخلفيات) |
| النص | `#0F172A` أساسي — `#64748B` ثانوي |

- الخطوط: Cairo للنصوص، و JetBrains Mono (`tabular-nums`) لكل الأرقام: السعرات، الأوزان، الغرامات، النسب.
- المكونات: بطاقات بيضاء ناعمة بمسافات واسعة، مؤشرات تقدم دائرية وخطية خضراء (هدف السعرات، البروتين، الصيام 14س)، ووسوم حالة بخلفية خضراء باهتة (`تمارين نشطة`، `عجز محقق −500`، `صيام مكتمل 14س`).
- التفاصيل الكاملة (Tokens، أصناف المكونات، ربط الحالات بالألوان، قواعد RTL): مهارة `asfit-ui-design`.

### 10.2 الصفحات

| المسار | المحتوى |
|---|---|
| `/` Dashboard | حلقة السعرات (مستهلك/هدف)، شريط البروتين، العجز اليوم، الكافيين الحالي في الدم، آخر وزن + اتجاه، أحدث 3 تنبيهات. |
| `/log/meals` | إدخال سريع: نوع الوجبة ← الوقت المجدول/الفعلي ← بحث في القاموس (Combobox) ← الكمية؛ عرض Drift ملوّن. |
| `/log/beverages` | أزرار سريعة للمشروبات الشائعة (Presets) + حقول البن/الحليب/السكر. |
| `/log/activity` | اختيار التمرين من الكتالوج + المدة؛ عرض Gross/Net. |
| `/log/screen` | ثلاث Sliders للساعات. |
| `/log/sleep` | أوقات النوم + WASO + الانتعاش (1–5)؛ عرض الكفاءة والكمون. |
| `/weigh-in` | الواجهة الإلزامية حسب §7 (Wizard من 4 خطوات). |
| `/measurements` | المحيطات الشهرية + WHR/WHtR/BF% مع مؤشرات خطر ملونة + مقارنة بالشهر السابق. |
| `/trends` | رسوم: الوزن الخام مقابل EMA، العجز التراكمي مقابل النزول الفعلي، TDEE النظري مقابل المرصود، النوم، الكافيين. |
| `/insights` | قائمة التنبيهات مع التفاصيل (`payload`) وزر تجاهل. |
| `/foods` | CRUD لقاموس الأغذية. |
| `/settings` | الملف الشخصي + جميع ثوابت `user_settings`. |

---

## 11. البيئة المحلية و Docker

### 11.1 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: asfit-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-asfit}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-asfit_local}
      POSTGRES_DB: ${POSTGRES_DB:-asfit}
      TZ: ${APP_TIMEZONE:-Asia/Riyadh}
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - asfit_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-asfit} -d ${POSTGRES_DB:-asfit}"]
      interval: 5s
      timeout: 3s
      retries: 10

  app:
    profiles: ["full"]          # اختياري: docker compose --profile full up
    build: .
    container_name: asfit-app
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-asfit}:${POSTGRES_PASSWORD:-asfit_local}@db:5432/${POSTGRES_DB:-asfit}
      APP_TIMEZONE: ${APP_TIMEZONE:-Asia/Riyadh}
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  asfit_pgdata:
```

### 11.2 `.env.example`

```dotenv
POSTGRES_USER=asfit
POSTGRES_PASSWORD=asfit_local
POSTGRES_DB=asfit
DATABASE_URL=postgres://asfit:asfit_local@localhost:5432/asfit
APP_TIMEZONE=Asia/Riyadh
```

### 11.3 `Dockerfile` (إنتاج محلي — Next.js standalone)

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

> يتطلب `output: 'standalone'` في `next.config.ts`.

### 11.4 سكربتات `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:up": "docker compose up -d db",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/server/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint ."
  }
}
```

### 11.5 خطوات التشغيل

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev        # http://localhost:3000
```

### 11.6 النسخ الاحتياطي (Local-first = مسؤوليتك)

```powershell
# scripts/backup.ps1
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
New-Item -ItemType Directory -Force -Path backups | Out-Null
docker exec asfit-db pg_dump -U asfit -d asfit -Fc -f /tmp/asfit.dump
docker cp asfit-db:/tmp/asfit.dump "backups/asfit_$stamp.dump"
```

```powershell
# scripts/restore.ps1  (يستبدل البيانات الحالية — استخدم بحذر)
param([Parameter(Mandatory)][string]$File)
docker cp $File asfit-db:/tmp/restore.dump
docker exec asfit-db pg_restore -U asfit -d asfit --clean --if-exists /tmp/restore.dump
```

---

## 12. الاختبارات وضمان الجودة

### 12.1 اختبارات الوحدة للمعادلات (Golden Values)

| الحالة | المدخلات | القيمة المتوقعة |
|---|---|---|
| BMR ذكر | 80 كغ، 180 سم، 30 سنة | **1780.0** kcal |
| BMR أنثى | 65 كغ، 165 سم، 30 سنة | **1370.25** kcal |
| Base TDEE | BMR 1780 × 1.2 | **2136.0** kcal |
| MET Gross | MET 4.3، 80 كغ، 45 دقيقة | **270.9** kcal |
| MET Net | نفس المدخلات | **207.9** kcal |
| الكافيين | 18 غ بن × 11 | **198** mg |
| الكافيين المتبقي | 200 mg قبل 10 ساعات، T½=5 | **50** mg |
| السكر | 2 ملعقة صغيرة | **33.6** kcal |
| WHR | خصر 90، ورك 100 | **0.90** ← high (ذكر) |
| WHtR | خصر 90، طول 180 | **0.50** |
| النزول المتوقع | 7 أيام × 500 عجز | **0.4545** كغ |
| EMA | [80, 79, 79.5] أيام متتالية، α=0.1 | [80, 79.9, 79.86] |
| EMA بفجوة | يوم 0 = 80، يوم 7 = 79 | **79.478** (α_eff = 0.5217) |
| TDEE المرصود (OLS) | avgIntake 2000، نزول خطي 0.5 كغ/أسبوع | **2550** |
| Drift منتصف الليل | 23:30 ← 00:30 | **+60** |
| تقييد العجز | 60 كغ، عجز مخطط 1000 | **660** |
| آخر وقت للقهوة | 198 mg الساعة 09:00، نوم 23:00، جرعة 198 | **15:39** (15:39:35، يُقرَّب للأبكر) |

```ts
// tests/domain/metabolism.test.ts
import { describe, it, expect } from 'vitest';
import { bmrMifflin, baseTdee } from '@/domain/metabolism';
import { exerciseKcal } from '@/domain/exercise';

describe('metabolism', () => {
  it('BMR male', () => expect(bmrMifflin({ weightKg: 80, heightCm: 180, ageYears: 30, gender: 'male' })).toBe(1780));
  it('BMR female', () => expect(bmrMifflin({ weightKg: 65, heightCm: 165, ageYears: 30, gender: 'female' })).toBeCloseTo(1370.25));
  it('Base TDEE', () => expect(baseTdee(1780)).toBeCloseTo(2136));
  it('MET gross/net', () => {
    const k = exerciseKcal(4.3, 80, 45);
    expect(k.gross).toBeCloseTo(270.9, 1);
    expect(k.net).toBeCloseTo(207.9, 1);
  });
});
```

### 12.2 معايير القبول (Acceptance Criteria)

- [ ] تغطية اختبارات `src/domain/**` ≥ 95%.
- [ ] جميع الـ Golden Values أعلاه ناجحة.
- [ ] تعديل سعرات صنف في القاموس **لا يغيّر** سعرات الوجبات المسجلة سابقاً.
- [ ] `time_drift_minutes` يُحسب آلياً بدقة في قاعدة البيانات.
- [ ] قراءة وزن بصيام 12 ساعة تُحفظ مع `is_protocol_compliant = false` وتظهر بتمييز بصري.
- [ ] لا يظهر تنبيه مكرر لنفس القاعدة والفترة.
- [ ] الـ TDEE المرصود لا يُستخدم قبل 14 يوماً من البيانات الملتزمة، ويُحسب من ميل OLS لا من EMA.
- [ ] الأيام غير المكتملة لا تدخل في العجز ولا النزول المتوقع ولا الـ TDEE المرصود.
- [ ] العجز المطبَّق لا يتجاوز 1% من وزن الجسم أسبوعياً.
- [ ] السعرات المستهدفة لا تنزل عن الحد الأدنى الآمن.
- [ ] التطبيق يعمل بالكامل بدون إنترنت بعد التثبيت.
- [ ] E2E: تسجيل وجبة ← مشروب ← تمرين ← ظهور الملخص الصحيح في الـ Dashboard.

---

## 13. خطة التنفيذ (Roadmap)

| المرحلة | المخرجات | التقدير |
|---|---|---|
| **P0 — الأساس** | Next.js + TS + Docker Postgres + Drizzle schema + migrations + seed + Design Tokens + Layout RTL | 2–3 أيام |
| **P1 — المحرك العلمي** | كل `src/domain/*` + اختبارات Vitest (Golden Values) | 2 أيام |
| **P2 — الإدخال اليومي** | الملف الشخصي، القاموس، الوجبات، المشروبات، التمارين، الشاشات، النوم | 4–5 أيام |
| **P3 — القياس** | Wizard الوزن المعياري، القياسات الشهرية، EMA | 2 أيام |
| **P4 — الملخص والاتجاهات** | Dashboard + `/trends` (Recharts) + TDEE المرصود والمعايرة | 3 أيام |
| **P5 — الذكاء** | Insights Engine + 8 قواعد + صفحة التنبيهات | 2–3 أيام |
| **P6 — الصقل** | E2E، النسخ الاحتياطي، تحسين الأداء، تصدير CSV | 2 أيام |

**توسعات مستقبلية (خارج النطاق الحالي):** PWA للإدخال من الجوال على الشبكة المحلية، استيراد بيانات الخطوات/النوم من الساعة الذكية، مسح الباركود، قوالب وجبات متكررة.

---

## 14. الملاحق

### 14.1 مرجع قيم MET (Compendium of Physical Activities, 2011/2024)

| النشاط | MET |
|---|---|
| الجلوس الهادئ / مشاهدة | 1.3 |
| العمل المكتبي على الحاسوب | 1.5 |
| الوقوف الخفيف | 2.0 |
| المشي 4 كم/س | 3.0 |
| المشي 5.6 كم/س (سريع) | 4.3 |
| المشي صعوداً | 5.3–8.0 |
| الجري 8 كم/س | 8.3 |
| الجري 10 كم/س | 9.8 |
| كرة القدم — غير تنافسية | 7.0 |
| كرة القدم — تنافسية | 10.0 |
| تمارين وزن الجسم (معتدلة) | 3.8 |
| تمارين دائرية مكثفة | 8.0 |

### 14.2 المراجع العلمية

1. Mifflin MD, St Jeor ST, et al. *A new predictive equation for resting energy expenditure in healthy individuals.* Am J Clin Nutr. 1990;51(2):241–247.
2. Ainsworth BE, et al. *Compendium of Physical Activities.* Med Sci Sports Exerc. 2011 (+ تحديث 2024).
3. Hall KD, et al. *Quantification of the effect of energy imbalance on bodyweight.* Lancet. 2011;378:826–837. (حدود قاعدة 7700 kcal)
4. World Health Organization. *Waist Circumference and Waist–Hip Ratio: Report of a WHO Expert Consultation.* 2008.
5. Ashwell M, Gibson S. *Waist-to-height ratio as an indicator of early health risk.* BMJ Open. 2016.
6. Hodgdon JA, Beckett MB. *Prediction of percent body fat for U.S. Navy men and women from body circumferences and height.* Naval Health Research Center, 1984.
7. Jäger R, et al. *ISSN Position Stand: Protein and Exercise.* J Int Soc Sports Nutr. 2017.
8. EFSA Panel. *Scientific Opinion on the safety of caffeine.* EFSA Journal. 2015.
9. Drake C, et al. *Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed.* J Clin Sleep Med. 2013.
10. Walker J. *The Hacker's Diet* (EMA weight trend method). 1991.

> [!CAUTION]
> هذا النظام أداة تتبع شخصية وتعليمية وليس جهازاً طبياً. أي عجز سعرات كبير أو حالات صحية مزمنة تستوجب استشارة طبيب أو أخصائي تغذية.
