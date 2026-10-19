---
name: asfit-ui-design
description: >-
  الواجهة والهوية البصرية لمشروع AS_FIT (Fitness Telemetry UI — Light & Green): Tailwind CSS v4،
  Design Tokens عبر @theme، لوحة الألوان الخضراء، RTL، الخطوط (Cairo + Monospace للأرقام)،
  المكونات (Card، Progress، Badge)، وخريطة الصفحات ومحتواها. Use when building or styling any
  page/component under src/app or src/components, or choosing colors, fonts, or status styling.
---

# AS_FIT — الواجهة والهوية البصرية (Fitness Telemetry UI — Light & Green)

## 1. فلسفة التصميم

- **الروح:** لوحة تحكم رياضية وصحية تمنح شعوراً بالطاقة والنقاء والنظام.
- **Clean & Minimalist:** مساحات واسعة، بطاقة واحدة = فكرة واحدة، لا زخارف ولا Glassmorphism ولا تدرجات لونية.
- **لا خلفيات بيضاء ولا ظلال للمكونات** (بطاقات، جداول، تنبيهات، أزرار، حقول): الفصل بحدّ `border-line` فقط. الاستثناء الوحيد: العناصر التي تطفو فوق المحتوى (القائمة المنسدلة، الشريط السفلي في الجوال) تحتفظ بـ `bg-surface` كي تبقى مقروءة.
- **وضع فاتح فقط** (Light). الوضع الداكن خارج النطاق حالياً.
- `<html lang="ar" dir="rtl">`.
- انتقالات 150–250ms، مع احترام `motion-reduce:`.

## 2. لوحة الألوان (Fitness Green Palette)

| الدور | Token | القيمة | الاستخدام |
|---|---|---|---|
| خلفية التطبيق | `canvas` | `#F4FBF7` | `<body>` |
| خلفية البطاقات | `surface` | `#FFFFFF` | Cards، النماذج |
| الحدود | `line` | `#E2E8F0` | حدود البطاقات والحقول |
| النص الأساسي | `ink` | `#0F172A` | العناوين والنصوص والأرقام |
| النص الثانوي | `ink-muted` | `#64748B` | التسميات والوحدات والتوضيحات |
| الأساسي (تعبئة) | `brand` | `#10B981` | Progress Bars، الحلقات، نسب الإنجاز |
| الأساسي (أزرار) | `brand-strong` | `#059669` | الأزرار الرئيسية، الحالة النشطة |
| أخضر للنص | `brand-ink` | `#047857` | نص أخضر على أبيض (تباين كافٍ) |
| أخضر باهت | `brand-soft` | `#ECFDF5` | خلفية الوسوم والتحديد |
| تحذير | `warning` / `warning-ink` / `warning-soft` | `#F59E0B` / `#B45309` / `#FFFBEB` | Time Drift، صيام غير مكتمل |
| خطر | `danger` / `danger-ink` / `danger-soft` | `#EF4444` / `#B91C1C` / `#FEF2F2` | تجاوز السعرات، عدم التزام |

> ⚠ `#10B981` و `#F59E0B` و `#EF4444` للتعبئة والأيقونات والأشرطة فقط، **لا للنص الصغير على الأبيض** (تباين غير كافٍ). للنص استخدم نسخة `-ink`.

### ربط الحالات بالألوان

| الحالة | اللون |
|---|---|
| إنجاز الهدف / عجز محقق / صيام مكتمل / قراءة ملتزمة | `brand` |
| Drift ≤ 30 د | `brand` — ≤ 90 د `warning` — > 90 د `danger` |
| السعرات ≤ الهدف | `brand` — تجاوز الهدف `danger` |
| الكافيين المتبقي وقت النوم < 50 `brand` — 50–100 `warning` — > 100 `danger` |
| قراءة وزن غير ملتزمة بالبروتوكول | `ink-muted` (نقطة مفرغة في الرسم) + وسم `danger-soft` |

## 3. Tailwind CSS v4 — الإعداد

- التثبيت: `tailwindcss` + `@tailwindcss/postcss`، و`postcss.config.mjs` بالمكوّن `@tailwindcss/postcss`. **لا يوجد `tailwind.config.js`** — الـ Tokens في `@theme`.
- **الألوان الافتراضية لـ Tailwind معطّلة** (`--color-*: initial`) لإجبار استخدام الـ Tokens الدلالية فقط (`bg-surface` لا `bg-emerald-500`).

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  --color-*: initial;
  --color-white: #FFFFFF;

  --color-canvas: #F4FBF7;
  --color-surface: #FFFFFF;
  --color-line: #E2E8F0;
  --color-ink: #0F172A;
  --color-ink-muted: #64748B;

  --color-brand: #10B981;
  --color-brand-strong: #059669;
  --color-brand-ink: #047857;
  --color-brand-soft: #ECFDF5;

  --color-warning: #F59E0B;
  --color-warning-ink: #B45309;
  --color-warning-soft: #FFFBEB;

  --color-danger: #EF4444;
  --color-danger-ink: #B91C1C;
  --color-danger-soft: #FEF2F2;

  --font-sans: var(--font-cairo), system-ui, sans-serif;
  --font-mono: var(--font-mono-num), ui-monospace, monospace;
}

@layer base {
  body { @apply bg-canvas text-ink font-sans antialiased; }
}
```

## 4. الخطوط والأرقام

- **النصوص والعناوين:** Cairo (عربي + لاتيني) عبر `next/font/google` ← المتغير `--font-cairo`.
- **الأرقام** (السعرات، الأوزان، الغرامات، النسب، الأوقات): JetBrains Mono عبر `next/font/google` ← المتغير `--font-mono-num`، بالأصناف `font-mono tabular-nums`، لتبدو كلوحة قياس رياضية.
- `next/font` يستضيف الخطوط محلياً وقت البناء ← يعمل بلا إنترنت (Local-first).
- الأرقام والوحدات داخل نص عربي تُغلَّف بـ `<bdi>` (أو `dir="ltr"`) حتى لا تنقلب الإشارة: `−500 kcal`.
- الأرقام لاتينية (0–9) دائماً.

```tsx
// src/app/layout.tsx
import { Cairo, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-num' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

## 5. المكونات (Fitness UI Components)

مكونات مشتركة في `src/components/`: `Card`, `Stat`, `Num`, `ProgressRing`, `ProgressBar`, `Badge`, `Field`, `Combobox`, `ChartCard`, `InsightItem`, `Wizard`.

| المكوّن | الأصناف المرجعية |
|---|---|
| `Card` | `rounded-xl border border-line p-6` — **بلا خلفية بيضاء وبلا ظل**؛ تظهر البطاقة على خلفية التطبيق بحدّ رفيع فقط |
| `Stat` | تسمية `text-sm text-ink-muted` + قيمة `font-mono tabular-nums text-3xl font-semibold` + وحدة `text-sm text-ink-muted` |
| `ProgressBar` | مسار `h-2 rounded-full bg-brand-soft` + تعبئة `h-full rounded-full bg-brand transition-[width]` (`warning`/`danger` حسب الحالة) |
| `ProgressRing` | SVG دائري: المسار `stroke-brand-soft`، التعبئة `stroke-brand`، الرقم في المنتصف `font-mono` |
| `Badge` | `inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium bg-brand-soft text-brand-ink` (أو `warning-soft/warning-ink`، `danger-soft/danger-ink`) |
| زر رئيسي | `rounded-lg bg-brand-strong px-4 py-2 font-semibold text-white hover:bg-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand` |
| حقل | `rounded-lg border border-line px-3 py-2 focus:border-brand focus:outline-none` (شفاف) |

**الاستخدامات الرئيسية للتقدم:** هدف السعرات اليومي (Ring)، البروتين (Bar)، ساعات الصيام نحو 14 ساعة (Bar، يتحول `brand` عند الاكتمال).

**وسوم الحالة (Fitness Badges)** في أعلى الـ Dashboard لقراءة سريعة ومحفزة: `تمارين نشطة`، `عجز محقق −500`، `صيام مكتمل 14س`، `بروتين مكتمل`. الوسوم تُشتق من بيانات `getDailySummary` ولا تُخزَّن.

### قواعد

- **Tailwind فقط** داخل JSX. لا CSS Modules، لا `style={{}}` للألوان، لا ألوان حرفية ولا قيم اعتباطية للألوان (`bg-[#...]`).
- **RTL:** الأصناف المنطقية فقط: `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s border-e rounded-s rounded-e`. ممنوع `ml-* mr-* pl-* pr-* left-* right-* text-left text-right`.
- دمج الأصناف الشرطية عبر `cn()` بسيط في `src/lib/cn.ts` (`filter(Boolean).join(' ')`) — لا مكتبات إضافية دون موافقة.
- Whitespace واسع: `gap-6` بين البطاقات، `p-6` داخلها، شبكة `grid gap-6 sm:grid-cols-2 lg:grid-cols-3`.
- النماذج: React Hook Form + Zod (نفس مخطط الـ Action) عبر `useActionForm` (`src/components/forms/useActionForm.ts`).
- الأسماء الفعلية للمكونات: `ui.tsx` (Button، ButtonLink، PageHeader، SectionTitle، Stat، EmptyState، Field، FormStatus، inputClass)، `Card`، `Badge`، `Num`، `ProgressBar`، `ProgressRing`، `Icon`، `NavLinks` (SideNav + BottomNav للجوال)، `DateNav`، `InsightItem`، `charts.tsx`، و`forms/` (FoodCombobox، DeleteButton، DayCompleteToggle).
- لون السلسلة الثانية في الرسوم: `--color-series-2: #4F46E5` (متحقق منه مع الأخضر للتباين وعمى الألوان).
- الرسوم بـ Recharts داخل Client Components فقط؛ `ResponsiveContainer`، المحور السيني `reversed` (RTL)، والألوان عبر متغيرات الـ Tokens: `stroke="var(--color-brand)"`، الشبكة `var(--color-line)`، المحاور `var(--color-ink-muted)`. خط EMA بـ `brand`، القراءات الخام نقاط `ink-muted`.
- كل عنصر تفاعلي يحمل `id` وصفياً فريداً (لـ Playwright).
- SEO: `metadata` لكل صفحة (title + description) و `<h1>` واحد.
- النصوص التحذيرية غير تشخيصية؛ تذييل ثابت: "أداة تتبع شخصية وليست جهازاً طبياً".

## 6. خريطة الصفحات

| المسار | المحتوى |
|---|---|
| `/` Dashboard | وسوم الحالة، حلقة السعرات (مستهلك/هدف)، شريط البروتين، شريط الصيام، عجز اليوم، الكافيين الحالي في الدم، آخر وزن + اتجاه، أحدث 3 تنبيهات |
| `/log/meals` | نوع الوجبة ← المجدول/الفعلي ← Combobox بحث في القاموس ← الكمية؛ Drift كوسم ملوّن (§2) |
| `/log/beverages` | أزرار Presets للمشروبات الشائعة + حقول البن/الحليب/السكر؛ معاينة فورية للكافيين والسعرات |
| `/log/activity` | التمرين من الكتالوج + المدة؛ عرض Gross/Net |
| `/log/screen` | ثلاث Sliders للساعات (`accent-brand`) مع مجموع حي |
| `/log/sleep` | الأوقات + WASO + الانتعاش (1–5)؛ الكفاءة والكمون |
| `/weigh-in` | Wizard من 4 خطوات (انظر `asfit-weigh-in-protocol`) مع شريط تقدم الصيام |
| `/measurements` | المحيطات + WHR/WHtR/BF% بوسوم خطر ملونة + مقارنة بالشهر السابق |
| `/trends` | الوزن الخام مقابل EMA، العجز التراكمي مقابل النزول الفعلي، TDEE النظري مقابل المرصود، النوم، الكافيين |
| `/insights` | قائمة التنبيهات + تفاصيل `payload` + زر تجاهل |
| `/foods` | CRUD لقاموس الأغذية |
| `/settings` | الملف الشخصي + كل ثوابت `user_settings` |

## 7. التحقق

- افحص كل صفحة بعرض 375px و 1440px.
- لا ألوان حرفية خارج `globals.css`: `grep -rE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(" src/app src/components` يجب أن يكون فارغاً.
- لا أصناف اتجاهية فيزيائية: `grep -rE "\b(ml|mr|pl|pr|left|right)-|text-(left|right)" src/app src/components` يجب أن يكون فارغاً.
- لا CSS Modules: `find src -name "*.module.css"` يجب أن يكون فارغاً.
