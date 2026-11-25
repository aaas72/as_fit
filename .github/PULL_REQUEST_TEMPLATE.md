## Summary

<!-- Briefly describe what this PR changes and why (English or Arabic). -->

## Related Issue

<!-- e.g., Closes #12 -->

## Contribution Track

- [ ] Domain Science / Insight Rule (`src/domain/**`)
- [ ] UI / RTL / Accessibility (`src/app/**`, `src/components/**`)
- [ ] Backend / Database / Validation (`src/server/**`, `src/lib/validation/**`, `drizzle/**`)
- [ ] Testing & QA (`tests/**`)
- [ ] DevOps / CI / Scripts (`Docker`, `scripts/**`, `.github/**`)
- [ ] Documentation (`docs/**`, `README*`, `CONTRIBUTING*`)

## Pre-Merge Checklist

- [ ] I ran `pnpm check` (`lint` + `typecheck` + `check:conventions` + `test`) and `pnpm test:coverage` with zero errors.
- [ ] **Pure Domain:** `src/domain/**` remains 100% pure (zero IO, framework, or ORM imports) with `>= 95%` test coverage.
- [ ] **Snapshot & Mock Mode:** Historical records are never retroactively mutated, and any new query supports `MOCK_MODE`.
- [ ] **Design & RTL:** Uses semantic `@theme` tokens only (no yellow/orange/red or raw `#hex`), logical RTL classes (`ms-*`, `pe-*`, `text-start`), and Arabic UI units.
- [ ] No secrets, `.env` files, or personal database dumps are included.
