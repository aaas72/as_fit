<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AS_FIT Repository & Contribution Context

Before modifying or adding files in **AS_FIT**, review and strictly follow:

- [CONTRIBUTING.md](./CONTRIBUTING.md) / [CONTRIBUTING.ar.md](./CONTRIBUTING.ar.md) — Contribution tracks, workflow, and non-negotiable rules (`pnpm check` must pass).
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Layer boundaries (`src/domain` zero-IO purity & >= 95% coverage, `Snapshot over Recompute`, `MOCK_MODE` parity).
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) — `Light & Green` tokens only (no yellow/orange/red/bright or raw hex colors; logical RTL classes only; Arabic units).
- [docs/SCIENTIFIC_MODEL.md](./docs/SCIENTIFIC_MODEL.md) — Metabolic equations (`Mifflin-St Jeor`, `Katch-McArdle`, `OLS Observed TDEE`), Insights rules, and Golden Values.
- `.agents/skills/asfit-*/SKILL.md` — Detailed task-specific engineering skills.
