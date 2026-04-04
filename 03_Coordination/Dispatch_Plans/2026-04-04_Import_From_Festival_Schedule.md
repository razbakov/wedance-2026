# Master Dispatch Plan: Import from festival-schedule Repo

**Created:** 2026-04-04
**Status:** Approved, awaiting dispatch
**Delegator:** Alex

## Context

The working Nuxt app, design assets, and product docs currently live in a separate repo (`~/Projects/WeDance`, remote: `razbakov/festival-schedule`). The new governance monorepo (`wedance-2026`) has an `app/` placeholder but no code or design assets. Two Ready board items (O-006, O-007) authorize importing this content. Both can run in parallel with zero file overlap.

**Source commit:** `c6d9491` (festival-schedule `main`)

---

## Pre-Dispatch (Coordinator, on `main`)

1. Update Work Board — move O-006 and O-007 from Ready → In Progress
2. Commit board update directly to `main` before dispatching agents

---

## O-006: Import Nuxt App Code — Engineer Agent

**Branch:** `import/nuxt-app-code`

| Step | Action |
|------|--------|
| 1 | `rsync -av` from `~/Projects/WeDance/engineering/nuxt-app/` → `app/`, excluding `node_modules/`, `.env*` (keep `.env.example`), `.nuxt/`, `.output/`, `.vercel/`, `playwright-report/`, `.features-gen/`, `.DS_Store` |
| 2 | Create root `.gitignore` (Nuxt patterns: `.output`, `.nuxt`, `node_modules`, `.env*`, `!.env.example`, `playwright-report`, `.DS_Store`, etc.) |
| 3 | Create `vercel.json` at repo root with `app/`-relative paths |
| 4 | Create `.claude/launch.json` with dev server config pointing to `app/` |
| 5 | Verify: `cd app && bun install && bun run build` |
| 6 | Commit referencing source repo + commit hash, open PR |

**Files touched:** `app/**`, `.gitignore`, `vercel.json`, `.claude/launch.json`

---

## O-007: Import Design Assets & Docs — Designer + Ops Manager

**Branch:** `import/design-assets-docs`

| Step | Action |
|------|--------|
| 1 | Create dirs: `01_Domains/Festival_Experience/{Design,Product/festival-schedule,Operations/Stories}` |
| 2 | `rsync -av` `design/` → `Design/` (brand.md, assets/logos, styles, ux) |
| 3 | `rsync -av` `product/festival-schedule/` → `Product/festival-schedule/` (strategy.md, user-journey.md) |
| 4 | Copy `docs/festival-pipeline-2026-Q2.md` → `Operations/` |
| 5 | `rsync -av` `issues/` → `Operations/Stories/` (10 YAML story files) |
| 6 | Copy `engineering/sprint-1.md` → `Operations/sprint-1.md` |
| 7 | Skip: `product/meetup-planner/`, `marketing/meetup-planner/`, `engineering/qa/` |
| 8 | Verify file counts, no `.DS_Store`, commit + open PR |

**Files touched:** `01_Domains/Festival_Experience/{Design,Product,Operations}/**`

---

## Parallel Safety

| Directory | O-006 | O-007 |
|-----------|-------|-------|
| `app/` | WRITE | — |
| `.gitignore`, `vercel.json`, `.claude/launch.json` | WRITE | — |
| `01_Domains/Festival_Experience/Design/` | — | WRITE |
| `01_Domains/Festival_Experience/Product/` | — | WRITE |
| `01_Domains/Festival_Experience/Operations/` | — | WRITE |

Zero overlap. Both agents run simultaneously.

---

## Key Decisions

- **No git history preservation** — source repo stays intact, PR references commit `c6d9491`
- **rsync** over cp/git-subtree — clean exclusion, idempotent
- **Import story YAMLs** (`issues/`) as `Operations/Stories/`
- **Import sprint-1.md** as historical record
- **Skip dormant domains** (meetup-planner content)
- **Build may warn** about missing `DATABASE_URL` — acceptable, document in PR

---

## Post-Merge (Coordinator)

1. Move O-006 + O-007 to Done on Work Board
2. Verify `main` builds: `cd app && bun install && bun run build`
3. Delete feature branches
4. Fill "What I Learned" in both backlog items
5. Note O-001/O-005 are now unblocked from the app-code dependency

---

## Verification

- `app/nuxt.config.ts` exists and is valid
- `bun install` + `bun run build` in `app/` succeeds (or fails only on missing env vars)
- `01_Domains/Festival_Experience/Design/brand.md` exists
- `01_Domains/Festival_Experience/Design/assets/logos/` has 13+ files
- No `node_modules/`, `.env`, `.DS_Store` in committed files
- No meetup-planner content anywhere
