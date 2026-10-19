---
name: asfit-local-devops
description: >-
  البيئة المحلية لمشروع AS_FIT: docker-compose (PostgreSQL 16)، Dockerfile (Next.js standalone)،
  ملف .env، سكربتات package.json، خطوات التشغيل، والنسخ الاحتياطي والاستعادة. Use when setting
  up the project, running the database, writing Docker/env/scripts, or performing backups/restores.
---

# AS_FIT — البيئة المحلية و Docker

## 1. docker-compose.yml

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
      TZ: ${APP_TIMEZONE:-Europe/Istanbul}
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
    profiles: ["full"]          # docker compose --profile full up
    build: .
    container_name: asfit-app
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-asfit}:${POSTGRES_PASSWORD:-asfit_local}@db:5432/${POSTGRES_DB:-asfit}
      APP_TIMEZONE: ${APP_TIMEZONE:-Europe/Istanbul}
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  asfit_pgdata:
```

## 2. .env.example

```dotenv
POSTGRES_USER=asfit
POSTGRES_PASSWORD=asfit_local
POSTGRES_DB=asfit
DATABASE_URL=postgres://asfit:asfit_local@localhost:5432/asfit
APP_TIMEZONE=Europe/Istanbul
```

`.env` في `.gitignore` دائماً.

## 3. Dockerfile (يتطلب `output: 'standalone'` في next.config.ts)

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

## 5. خطوات التشغيل (PowerShell)

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev        # http://localhost:3000
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
