# AS_FIT — Personal Metabolic Telemetry & Tracking System

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)

**AS_FIT** is a **local-first**, privacy-respecting **Personal Metabolic Telemetry & Closed-Loop Feedback Control System** built with Next.js (App Router), TypeScript, Drizzle ORM, and PostgreSQL.

Rather than acting as a simple calorie counter, AS_FIT models the body as a dynamic feedback system—combining nutrition, meal timing (chrono-nutrition), caffeine kinetics, MET-based activity, sleep, and cognitive screen load against a standardized fasted weigh-in protocol and EMA weight trend.

---

## ✨ Key Features

- **Closed-Loop Metabolic Modeling (`src/domain/`)**: Pure, IO-free domain functions for BMR (Mifflin-St Jeor), dynamic TDEE, expected vs. observed weight change, and EMA trend tracking.
- **Chrono-Nutrition & Caffeine Kinetics**: Tracks meal timing relative to custom meal schedules and models caffeine half-life impact on sleep readiness.
- **Standardized Weigh-In Protocol**: Fasted weigh-in wizard with noise-awareness flags (sodium, digestion, sleep) so single-day fluctuations aren't misread as stalls.
- **Explainable Insights Engine**: 8 deterministic rules (`lunchDrift`, `cognitiveLoad`, `falsePlateau`, `truePlateau`, `bedtimeCaffeine`, `lateEating`, `proteinShortfall`, `aggressiveDeficit`) that attach numerical payloads explaining why each insight triggered.
- **User-Defined Catalogs & Snapshot Integrity**: Custom foods and drinks with calculated values snapshotted at logging time so historical entries never drift when catalogs are edited.
- **Local-First & Zero Cloud Lock-in**: Runs completely locally with Docker Compose + PostgreSQL, or instantly without a database using `USE_MOCK_DATA=true`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5.9 |
| **Styling & UI** | Tailwind CSS v4, Recharts |
| **Validation & Forms** | Zod, React Hook Form |
| **Database & ORM** | PostgreSQL 16, Drizzle ORM & Drizzle Kit |
| **Testing & QA** | Vitest (with V8 coverage), Playwright E2E, ESLint |
| **Containerization** | Docker & Docker Compose (`db`, `migrate`, `app`) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** `>= 22`
- **pnpm** (`10.x`)
- **Docker** & **Docker Compose** (optional if using Mock Mode)

### Option A: Instant Preview with Mock Data (No Database Needed)

1. Clone the repository:
   ```bash
   git clone https://github.com/salims0110/as_fit.git
   cd as_fit
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create your `.env` file from `.env.example` and enable mock mode:
   ```bash
   cp .env.example .env
   ```
   Set `USE_MOCK_DATA=true` in `.env`.
4. Start the development server:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Option B: Local Development with PostgreSQL

1. Copy `.env.example` to `.env` (keep `USE_MOCK_DATA=false`).
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start PostgreSQL via Docker:
   ```bash
   pnpm db:up
   ```
4. Apply database migrations and seed initial data:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```
5. Start the development server:
   ```bash
   pnpm dev
   ```

### Option C: Full Stack with Docker Compose

```bash
docker compose up --build
```
This starts `db` (PostgreSQL 16), runs the one-shot `migrate` service (migrations + idempotent seed), and serves the standalone Next.js app on `http://127.0.0.1:3000`.

---

## 📂 Project Structure

```text
src/
├── app/            # Next.js App Router pages & client feature components
├── components/     # Shared UI, inputs, tables, charts, and form helpers
├── domain/         # Pure metabolic, nutritional, caffeine, and insight rules (no IO)
├── lib/            # Utilities, labels, time helpers, and Zod validation schemas
├── server/         # Server Actions, DB schema/migrations, queries, and mock mode
└── styles/         # Tailwind CSS v4 global theme
drizzle/            # SQL migrations and snapshots
tests/              # Vitest domain/mock tests and Playwright E2E specs
docs/               # Architecture & scientific specification (SRS_Metabolic_Telemetry.md)
scripts/            # Local PostgreSQL backup and restore scripts
```

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build production application |
| `pnpm typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `pnpm lint` | Run ESLint across the repository |
| `pnpm test` | Run Vitest unit & domain tests |
| `pnpm test:coverage` | Run Vitest with V8 coverage (`src/domain/**` >= 95% threshold) |
| `pnpm test:e2e` | Build and run Playwright end-to-end tests |
| `pnpm db:up` / `pnpm db:down` | Start / stop local PostgreSQL container |
| `pnpm db:migrate` / `pnpm db:seed` | Apply Drizzle migrations / seed database |

---

## 🤝 Contributing

Contributions are welcome from everyone! Whether you are fixing a bug, adding a new metabolic insight rule, improving accessibility/UI, or expanding test coverage, please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a Pull Request.

- 🐛 [Report a Bug](https://github.com/salims0110/as_fit/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/salims0110/as_fit/issues/new?template=feature_request.md)

---

## 📄 License

This project is open-source and licensed under the [MIT License](./LICENSE).
