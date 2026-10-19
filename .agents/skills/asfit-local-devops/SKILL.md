---
name: asfit-local-devops
description: >-
  البيئة المحلية لمشروع AS_FIT: docker-compose (PostgreSQL 16)، Dockerfile (Next.js standalone)،
  ملف .env، سكربتات package.json، خطوات التشغيل، والنسخ الاحتياطي والاستعادة. Use when setting
  up the project, running the database, writing Docker/env/scripts, or performing backups/restores.
---

# AS_FIT — البيئة المحلية و Docker

## 1. docker-compose.yml و Dockerfile

المرجع الفعلي: [docker-compose.yml](../../../docker-compose.yml) و [Dockerfile](../../../Dockerfile). ثلاث خدمات:

| الخدمة | الدور |
|---|---|
| `db` | PostgreSQL 16، المنفذ `127.0.0.1:${POSTGRES_PORT}` (5433 على جهاز المستخدم لأن 5432 مشغول بـ PostgreSQL محلي)، volume دائم `asfit_pgdata` |
| `migrate` | مرحلة `migrator`: تشغّل `drizzle-kit migrate` ثم الـ seed (idempotent) وتخرج. لا يبدأ `app` إلا إذا انتهت بنجاح |
| `app` | مرحلة `run`: خادم Next.js standalone (`node server.js`) بمستخدم غير root، `HOSTNAME=0.0.0.0`، على `127.0.0.1:${APP_PORT:-3000}` |

قرارات ملزمة:
- `output: 'standalone'` يُفعَّل فقط عبر `NEXT_OUTPUT=standalone` (يضبطه الـ Dockerfile)، لأن `next start` المحلي والاختبارات تحتاج البناء العادي.
- مرحلة البناء تضع `DATABASE_URL` وهمياً كي تُحمَّل الوحدات وقت البناء؛ القيمة الحقيقية تأتي وقت التشغيل من compose.
- `.env` لا يدخل الصورة (`.dockerignore`).

## 2. .env.example

```dotenv
POSTGRES_USER=asfit
POSTGRES_PASSWORD=asfit_local
POSTGRES_DB=asfit
# Change to 5433 if a local PostgreSQL already listens on 5432 (update DATABASE_URL too)
POSTGRES_PORT=5432
DATABASE_URL=postgres://asfit:asfit_local@localhost:5432/asfit
APP_TIMEZONE=Europe/Istanbul
```

`.env` في `.gitignore` دائماً.

## 3. وضعا التشغيل

| الوضع | الأوامر | متى |
|---|---|---|
| **نشر محلي كامل في Docker** | `docker compose up -d --build` ← http://localhost:3000 | الاستخدام اليومي |
| **تطوير** | `pnpm db:up` ثم `pnpm dev` | تعديل الكود (أوقف `asfit-app` أولاً لتحرير المنفذ 3000: `docker compose stop app`) |

بعد أي تعديل في الكود: `docker compose up -d --build` يعيد بناء الصورة، ويطبق الـ migrations الجديدة تلقائياً عبر `migrate`.

## 3.1 وضع بيانات المحاكاة (USE_MOCK_DATA)

| القيمة | السلوك |
|---|---|
| `USE_MOCK_DATA=true` | كل القراءات من `src/server/mock/mock-data.ts` (90 يوماً حتى اليوم، حتمية، محسوبة بنفس دوال `src/domain`). التنبيهات تُولَّد عند القراءة بالقواعد الحقيقية (`src/server/mock/insights.ts`). **كل الكتابات مرفوضة** برسالة واضحة، وشريط تنبيه يظهر في كل صفحة. |
| `false` أو غير موجود | قاعدة البيانات كالمعتاد. |

- التبديل: في `.env` (للتطوير) أو `USE_MOCK_DATA=true docker compose up -d` (لـ Docker). يُقرأ وقت التشغيل، فلا يحتاج إعادة بناء.
- نقطة التحويل الوحيدة هي طبقة القراءة: `src/server/queries/*` (فرع `if (MOCK_MODE)`) + حارس في بداية كل Server Action. لا تضف قراءة من قاعدة البيانات خارج `src/server/queries` وإلا فلن تتبع الوضع.
- أنواع القراءة الصريحة في `src/server/queries/views.ts` يستخدمها الطرفان.

## 4. سكربتات package.json

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

## 5. أول تشغيل (PowerShell)

```powershell
pnpm install
Copy-Item .env.example .env      # عدّل POSTGRES_PORT إن كان 5432 مشغولاً
docker compose up -d --build     # db + migrate + app
```

## 6. النسخ الاحتياطي والاستعادة

```powershell
# scripts/backup.ps1
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
New-Item -ItemType Directory -Force -Path backups | Out-Null
docker exec asfit-db pg_dump -U asfit -d asfit -Fc -f /tmp/asfit.dump
docker cp asfit-db:/tmp/asfit.dump "backups/asfit_$stamp.dump"
```

```powershell
# scripts/restore.ps1 — يستبدل البيانات الحالية
param([Parameter(Mandatory)][string]$File)
docker cp $File asfit-db:/tmp/restore.dump
docker exec asfit-db pg_restore -U asfit -d asfit --clean --if-exists /tmp/restore.dump
```

> ⚠ **قبل** تشغيل `restore.ps1` أو `docker compose down -v` أو أي حذف للـ volume: اطلب موافقة صريحة من المستخدم وخذ نسخة احتياطية أولاً.

## 7. التحقق

```powershell
docker compose ps                     # asfit-db = healthy
docker exec asfit-db pg_isready -U asfit
```
