---
name: asfit-architecture
description: >-
  الهندسة المعمارية لمشروع AS_FIT: الطبقات، هيكل المجلدات، قواعد الاستيراد، وتدفق الكتابة.
  Use when creating new files/folders, deciding where code belongs (domain vs server vs app),
  or reviewing imports and layering in the AS_FIT Next.js project.
---

# AS_FIT — الهندسة المعمارية

## 1. الطبقات

```mermaid
flowchart TB
    UI["Presentation - src/app (RSC + Client Components)"]
    ACT["Application - src/server/actions (Server Actions + Zod)"]
    SVC["Services - src/server/services (orchestration)"]
    DOM["Domain - src/domain (Pure functions + rules)"]
    REPO["Data Access - src/server/db + src/server/queries (Drizzle)"]
    PG[("PostgreSQL 16")]
    UI --> ACT --> SVC
    SVC --> DOM
    SVC --> REPO --> PG
    UI -.read.-> REPO
```

## 2. قواعد الاستيراد (Hard Rules)

1. `src/domain/**` **لا يستورد** من `src/server/**` أو `next/*` أو `drizzle-orm` أو أي IO. رياضيات خالصة + أنواع.
2. `src/app/**` لا يكتب لقاعدة البيانات مباشرة؛ الكتابة عبر `src/server/actions/**` فقط. القراءة مسموحة عبر `src/server/queries/**`.
3. كل Server Action يبدأ بـ `'use server'` ويتحقق بـ Zod قبل أي منطق.
4. المنطق المشترك بين عدة Actions يوضع في `src/server/services/**`.
5. مخططات Zod في `src/lib/validation/**` وتُستخدم في النموذج والـ Action معاً.
6. Alias الاستيراد: `@/` → `src/`.

## 3. هيكل المجلدات

```
AS_FIT/
├─ docker-compose.yml, Dockerfile, .env.example, drizzle.config.ts, postcss.config.mjs, package.json
├─ scripts/ (backup.ps1, restore.ps1)
├─ drizzle/                         # migrations مولدة
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # dir="rtl", fonts, theme
│  │  ├─ page.tsx                   # Dashboard
│  │  ├─ log/{meals,beverages,activity,screen,sleep}/page.tsx
│  │  ├─ weigh-in/ measurements/ trends/ insights/ foods/ settings/
│  ├─ components/
│  ├─ styles/globals.css            # Tailwind v4 + @theme tokens
│  ├─ domain/                       # ⚠ Pure only
│  │  ├─ constants.ts age.ts metabolism.ts exercise.ts nutrition.ts
│  │  ├─ beverages.ts caffeine-kinetics.ts anthropometry.ts sleep.ts weight-trend.ts
│  │  └─ insights/ (types.ts, engine.ts, rules/*.ts)
│  ├─ server/
│  │  ├─ db/ (client.ts, schema.ts, seed.ts)
│  │  ├─ queries/
│  │  ├─ services/ (daily-summary.ts, insights-runner.ts)
│  │  └─ actions/ (meals, beverages, exercise, screen, sleep, weigh-in, measurements, profile)
│  └─ lib/ (validation/, time.ts, cn.ts)
└─ tests/ (domain/, e2e/)
```

## 4. تدفق كتابة نموذجي (تسجيل تمرين)

```mermaid
sequenceDiagram
    participant F as Form
    participant A as Server Action
    participant D as domain/exercise.ts
    participant DB as PostgreSQL
    F->>A: logExercise(formData)
    A->>A: Zod.safeParse
    A->>DB: وزن خط الاتجاه الحالي
    A->>D: exerciseKcal(met, weight, minutes)
    D-->>A: {gross, net}
    A->>DB: INSERT (snapshot)
    A->>A: runInsights(date)
    A-->>F: revalidatePath('/')
```

## 5. التحقق

- ابحث عن أي استيراد مخالف: `grep -r "from '@/server\|from 'next\|drizzle" src/domain` يجب أن يُرجع لا شيء.
- `pnpm tsc --noEmit` بلا أخطاء.
