# Test Reports — Output Paths & Commands

Reference for where each test suite writes its reports and artifacts.
All output directories are `.gitignore`d — they appear only after a test run.

## Quick reference

| Suite | Command | HTML report | Artifacts / screenshots |
|-------|---------|-------------|------------------------|
| **Unit + coverage** | `bun run test -- --coverage` | `coverage/index.html` | — |
| **BDD E2E** | `bun run test:e2e` | `playwright-report/index.html` | `e2e/test-results/` |
| **Design (contract + a11y)** | `bun run test:design` | `playwright-report/design/index.html` | `e2e/test-results/design/` |
| **Visual regression** | `bun run test:visual` | `playwright-report/design/index.html` (shared) | `e2e/design/__screenshots__/{platform}/` |
| **Argos (visual history)** | `bun run test:argos` | — (Argos CI uploads only) | `e2e/test-results/argos/` |

## Opening HTML reports

```sh
# Unit coverage
open coverage/index.html

# BDD E2E
npx playwright show-report

# Design
npx playwright show-report playwright-report/design
```

## Configuration files

| Suite | Config |
|-------|--------|
| Unit | `vitest.config.ts` |
| BDD E2E | `playwright.config.ts` |
| Design / Visual | `playwright.design.config.ts` |
| Argos | `playwright.argos.config.ts` |

## CI workflow

`.github/workflows/test.yml` runs three jobs on every PR and every push to `main`.
All three are **required checks** — branch protection on `main` refuses a merge
while any of them is red or still running (ADR-013):

1. **unit** — `bun run test -- --coverage` → uploads `coverage/` as artifact
2. **integration** — same vitest with a Postgres service container
3. **e2e-smoke / e2e** — BDD `@smoke` tests + design contract/a11y (reusable
   `.github/workflows/e2e.yml`) → uploads `playwright-report/` and `e2e/test-results/` as artifacts

`.github/workflows/nightly.yml` runs the **full** BDD suite through the same
`e2e.yml` at 03:00 Europe/Berlin (or by hand: Actions → Nightly E2E → Run workflow). Not a
merge gate.

## Notes

- **BDD E2E** tests require a running dev server and `DATABASE_URL` for seed data.
  The config auto-starts `bun run dev` locally when no `BASE_URL` is set.
  In CI, the workflow builds the app and starts a preview server.
- **Design** tests are read-only and can run against any live URL via `DESIGN_BASE_URL`.
- **Visual regression** baselines are per-OS (`e2e/design/__screenshots__/{platform}/`).
  Update baselines with `bun run test:visual:update`.
- **Argos** tests default to `https://2026.wedance.vip`. Override with `ARGOS_BASE_URL`.
