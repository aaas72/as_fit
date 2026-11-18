# Contributing to AS_FIT

Thank you for your interest in contributing to **AS_FIT**! This repository is open for public contributions, bug reports, scientific/domain improvements, documentation updates, and UI refinements.

---

## 🛠️ Setting Up Your Development Environment

1. **Fork** this repository on GitHub and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/as_fit.git
   cd as_fit
   ```
2. **Install dependencies** using `pnpm` (Node.js `>= 22` required):
   ```bash
   pnpm install
   ```
3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   - For fast UI/domain iteration without running PostgreSQL, set `USE_MOCK_DATA=true` in `.env`.
   - For full database/server action development, keep `USE_MOCK_DATA=false` and run:
     ```bash
     pnpm db:up
     pnpm db:migrate
     pnpm db:seed
     ```
4. **Start the dev server**:
   ```bash
   pnpm dev
   ```

---

## 🧭 Architectural Guidelines

To keep the codebase clean, testable, and maintainable, please follow these core boundaries:

1. **Pure Domain Logic (`src/domain/`)**:
   - Functions inside `src/domain/` must remain **pure** (no database calls, no network IO, no `Date.now()` side effects without explicit parameters).
   - Every new rule or formula in `src/domain/` must include unit tests under `tests/domain/`.
   - Vitest enforces a **95% coverage threshold** (lines, functions, statements) on `src/domain/**`.
2. **Validation & Server Layer (`src/lib/validation/`, `src/server/`)**:
   - Validate all user inputs with Zod schemas before persisting or running calculations.
   - Preserve snapshot-at-log-time semantics when modifying food, beverage, or exercise logging.
3. **Database Changes (`src/server/db/`, `drizzle/`)**:
   - Update `src/server/db/schema.ts` and generate SQL migrations via `pnpm db:generate` rather than editing historical migration files manually.
4. **Documentation**:
   - See `docs/SRS_Metabolic_Telemetry.md` for full scientific equations, architectural decisions, and system rules.

---

## ✅ Pre-PR Verification Checklist

Before opening a Pull Request, please run the relevant checks locally:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
```

If your change touches database queries, server actions, or page flows, also verify:

```bash
pnpm build
pnpm test:e2e
```

---

## 📬 Submitting a Pull Request

1. Create a descriptive branch from `main` (e.g., `feat/sleep-insight-rule` or `fix/weigh-in-validation`).
2. Keep commits focused and clear.
3. Fill out the [Pull Request template](./.github/PULL_REQUEST_TEMPLATE.md), including what changed, why, and which tests you ran.
4. Never commit `.env` files, personal health exports, or `backups/`.

---

## 💬 Reporting Issues or Proposing Features

- Use the **Bug Report** template for reproducible bugs (include steps, expected vs. actual behavior, and whether `USE_MOCK_DATA` was `true` or `false`).
- Use the **Feature Request** template for new domain rules, visualizations, or workflow enhancements.

Thank you for helping improve AS_FIT!
