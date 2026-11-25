<div dir="rtl" align="right">

# سجل التغييرات (Changelog)

تُوثَّق هنا جميع التغييرات الجوهرية في مشروع **AS_FIT** وفق تنسيق [Keep a Changelog](https://keepachangelog.com/ar/1.1.0/) ومعيار [Semantic Versioning](https://semver.org/lang/ar/).

## [Unreleased]

### مضاف (Added)
- **منظومة التوثيق والحوكمة للمصدر المفتوح:** إضافة [README.ar.md](./README.ar.md)، [CONTRIBUTING.ar.md](./CONTRIBUTING.ar.md)، [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)، [SECURITY.md](./SECURITY.md)، [ROADMAP.md](./ROADMAP.md)، ولقطات الواجهة في `docs/assets/`.
- **الأدلة الهندسية والعلمية وبنك القضايا:** إضافة [ARCHITECTURE.md](./docs/ARCHITECTURE.md)، [DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)، [SCIENTIFIC_MODEL.md](./docs/SCIENTIFIC_MODEL.md)، و[GOOD_FIRST_ISSUES.md](./docs/GOOD_FIRST_ISSUES.md) (8 قضايا جاهزة للمساهمين).
- **قوالب GitHub التفاعلية وفاحص الهوية الآلي:** قوالب YAML للقضايا (`.github/ISSUE_TEMPLATE/*.yml`)، وسكربت [verify-conventions.ts](./scripts/verify-conventions.ts) المدمج في `pnpm check` و`CI` لمنع الألوان الخام وأصناف الاتجاه الفيزيائية ومخالفات الطبقات.

### مُصلَح (Fixed)
- إصلاح تكرار مفتاح `postcss` في `pnpm-lock.yaml` لضمان عمل `pnpm install --frozen-lockfile` لدى جميع المساهمين.

---

## [0.1.0] - 2026-11-25

### مضاف (Added)
- **المحرك العلمي النقي (`src/domain/`):**
  - معادلات `Mifflin-St Jeor` ومعادلة `Katch-McArdle` الاختيارية (`370 + 21.6 × LBM`) عند توفر نسبة الدهون.
  - الحرق الديناميكي و`Net MET`، حركية الكافيين ونصف العمر، ومؤشرات المحيطات (`WHR`، `WHtR`، `US Navy Body Fat`).
  - مقاييس النوم مع حساب اضطراب منتصف النوم بالمتوسط الدائري (`Circular Mean`).
  - خط اتجاه الوزن الزمني (`EMA`)، معايرة `Observed TDEE` عبر الانحدار الخطي (`OLS`)، وتوقع تاريخ الوصول للوزن المستهدف (`projectedGoal`).
- **محرك التنبيهات الذكية (`Insights Engine`):** 8 قواعد قابلة للتفسير مرفقة بـ `payload` رقمي.
- **الواجهة والبيانات (`Next.js 16.4` + `PostgreSQL 16` + `Drizzle` + `Zod 4`):** 12 شاشة بهوية `Light & Green RTL`، نمط اللقطة (`Snapshot`)، وضع المحاكاة (`USE_MOCK_DATA`)، وترويسات أمان HTTP في `next.config.ts`.
- **الاختبارات و CI:** اختبارات `Vitest` (Golden Values + اختبارات الخصائص `fast-check` بتغطية `>= 95%` للنطاق العلمي)، اختبارات `Playwright E2E`، وفحص `GitHub Actions` مع تدقيق التبعيات (`pnpm audit`).

</div>
