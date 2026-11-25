<div dir="rtl" align="right">

# بنك القضايا الجاهزة للمساهمين (Starter & Community Issue Backlog)

تضم هذه الوثيقة **8 قضايا حقيقية ومفصّلة النطاق** جاهزة ليتبناها المساهمون في مستودع **AS_FIT**، كما يمكن نسخ أي بطاقة منها مباشرة إلى تبويب `GitHub Issues`.

> **كيف تبدأ؟** اختر قضية تناسب اهتمامك، افتح قضية أو علّق برقمها في تبويب `Issues` لطلب التعيين، ثم اتبع الخطوات في [CONTRIBUTING.md](../CONTRIBUTING.md) أو [CONTRIBUTING.ar.md](../CONTRIBUTING.ar.md).

---

## المستوى الأول: قضايا البداية السريعة (`good first issue`)

### القضية #1: سكربتات نسخ احتياطي واستعادة عابرة لأنظمة التشغيل (`Linux` / `macOS` / `Windows`)
- **الوسوم:** `good first issue` · `area:devops` · `status:help-wanted`
- **السياق والمشكلة:** تتوفر حالياً سكربتات النسخ الاحتياطي والاستعادة بصيغة PowerShell فقط في [scripts/backup.ps1](../scripts/backup.ps1) و[scripts/restore.ps1](../scripts/restore.ps1)، مما يعيق مستخدمي `Linux` و`macOS`.
- **الملفات ذات الصلة:** `scripts/backup.ps1`، `scripts/restore.ps1`، `package.json`.
- **معايير القبول:**
  - كتابة سكربتين بـ TypeScript يعملان عبر `tsx` (`scripts/backup.ts` و`scripts/restore.ts`) يستخدمان `child_process.execFileSync` لتنفيذ `pg_dump` و`pg_restore` داخل حاوية `asfit-db` بأمان.
  - ربطهما في `package.json` عبر `pnpm db:backup` و`pnpm db:restore` مع خطوة تأكيد قبل الاستعادة (وخيار `--yes` للأتمتة).

---

### القضية #2: إعداد `docker-compose.test.yml` لتشغيل اختبارات Playwright بأمر واحد
- **الوسوم:** `good first issue` · `area:devops` · `area:testing` · `status:help-wanted`
- **السياق والمشكلة:** يتوقع [playwright.config.ts](../playwright.config.ts) وجود قاعدة بيانات اختبار مستقلة `asfit_test` على المنفذ `5433`. نريد تسهيل تشغيلها لأي مساهم بأمر واحد دون المساس بقاعدة البيانات الأساسية.
- **الملفات ذات الصلة:** `playwright.config.ts`، `tests/e2e/prepare-db.ts`، `package.json`.
- **معايير القبول:**
  - إنشاء ملف `docker-compose.test.yml` يشغّل حاوية `postgres:16-alpine` خفيفة (`tmpfs`) على المنفذ `127.0.0.1:5433` بقاعدة `asfit_test`.
  - إضافة سكربتات `test:db:up` و`test:db:down` في `package.json` وتوثيقها.

---

### القضية #3: تصدير البيانات الشخصية إلى ملفات CSV
- **الوسوم:** `good first issue` · `area:server` · `area:ui` · `status:help-wanted`
- **السياق والمشكلة:** استكمال ميزة ملكية البيانات في [SRS_Metabolic_Telemetry.md](./SRS_Metabolic_Telemetry.md) بإتاحة تصدير السجلات الشخصية إلى `CSV` للتحليل الخارجي.
- **الملفات ذات الصلة:** `src/app/settings/page.tsx`، `src/server/queries/`، ومسار قراءة في `src/app/api/export/`.
- **القيود ومعايير القبول:**
  - تضمين `UTF-8 BOM (\uFEFF)` لدعم العربية في برامج الجداول، وحماية الخلايا من `CSV Formula Injection` (`=`, `+`, `-`, `@`).
  - دعم التصدير في الوضع العادي وفي وضع `USE_MOCK_DATA=true`، مع اختبارات وحدات لمولّد الـ `CSV`.

---

## المستوى الثاني: قضايا متوسطة (`intermediate`)

### القضية #4: قاعدة تنبيه ذكية لاضطراب منتصف النوم (`SLEEP_MIDPOINT_DRIFT` / Social Jetlag)
- **الوسوم:** `intermediate` · `area:domain` · `area:insights` · `type:science` · `status:help-wanted`
- **السياق والمشكلة:** يحسب `src/domain/sleep.ts` بالفعل اضطراب منتصف النوم بالمتوسط الدائري (`socialJetLagMin`)، لكن محرك التنبيهات لا يحتوي بعد على قاعدة ترصد تجاوز الفارق عتبة 90 دقيقة بين أيام العمل ونهاية الأسبوع.
- **الملفات ذات الصلة:** `src/domain/sleep.ts`، `src/domain/insights/types.ts`، `src/domain/insights/engine.ts`، `src/server/services/insights-runner.ts`، `tests/domain/insights.test.ts`.
- **معايير القبول:**
  - دالة نقية في `src/domain/insights/rules/sleep-midpoint-drift.ts` بصياغة عربية غير تشخيصية و`payload` رقمي كامل، مع اختبارات `Vitest` لحالات الإطلاق وعدم الإطلاق ونقص الليالي المسجلة.

---

### القضية #5: استيراد وتصدير قاموس الأغذية والمشروبات الشخصي بصيغة JSON
- **الوسوم:** `intermediate` · `area:server` · `area:ui` · `status:help-wanted`
- **السياق والمشكلة:** تمكين المستخدمين من نسخ قاموس الأغذية والمشروبات الخاص بهم بين الأجهزة أو استيراد حزمة قياسية اختيارية.
- **الملفات ذات الصلة:** `src/app/foods/`، `src/app/drinks/`، `src/lib/validation/schemas.ts`، `src/server/actions/foods.ts`، `src/server/actions/drinks.ts`.
- **معايير القبول:**
  - التحقق الصارم بمخطط `Zod 4`، التعامل الآمن مع الأسماء المكررة دون المساس بالسجلات التاريخية (`Snapshot`)، والالتزام بهوية التصميم الخضراء والرمادية.

---

### القضية #6: قوالب الوجبات المعتادة (`Saved Meal Templates`)
- **الوسوم:** `intermediate` · `area:db` · `area:server` · `area:ui` · `status:help-wanted`
- **السياق والمشكلة:** توفير حفظ وجبة معتادة متعددة الأصناف وإعادة تعبئتها بنقرة واحدة لتقليل تكرار الإدخال اليومي.
- **الملفات ذات الصلة:** `src/server/db/schema.ts`، `drizzle/`، `src/app/log/meals/MealForm.tsx`، `src/server/actions/meals.ts`.
- **معايير القبول:**
  - ترحيل Drizzle نظيف يخزّن الأصناف وكمياتها في القالب، وعند تسجيل وجبة من القالب تُحسب اللقطة الغذائية (`Snapshot`) من القاموس الحالي لحظة التسجيل.

---

## المستوى الثالث: قضايا متقدمة (`deep-dive`)

### القضية #7: دعم تطبيق الويب التقدمي المحلي (`Local-Network PWA`)
- **الوسوم:** `deep-dive` · `area:ui` · `area:devops` · `status:help-wanted`
- **السياق والمشكلة:** إتاحة تثبيت التطبيق كأيقونة مستقلة على الهاتف المتصل بالشبكة المنزلية المحلية (`LAN`) دون أي خدمات سحابية خارجية.
- **الملفات ذات الصلة:** `src/app/manifest.ts`، `src/app/layout.tsx`، `public/`.

---

### القضية #8: البنية التحتية لتعدد اللغات (`i18n: العربية RTL / الإنجليزية LTR`)
- **الوسوم:** `deep-dive` · `area:ui` · `area:architecture` · `status:help-wanted`
- **السياق والمشكلة:** تصميم قواميس رسائل TypeScript محكومة الأنواع وخفيفة الوزن (بلا مكتبات خارجية متضخمة) للتبديل بين العربية (`RTL`) والإنجليزية (`LTR`). يتطلب فتح نقاش تصميمي في القضية قبل التنفيذ.

</div>
