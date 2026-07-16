# WeDance 2026 — Code Repository

## Framework

@/Users/razbakov/Projects/ikigai-team/CLAUDE.md

---

Dance community platform. Nuxt 4 + tRPC + Drizzle ORM + Neon (PostgreSQL).

## Links

- **Live:** https://2026.wedance.vip
- **Vercel project:** `wedance-2026` (team: `wedance`)
- **Org governance:** `~/Orgs/WeDance/`
- **GitHub:** `razbakov/wedance-2026`

## Structure

```
app/                  # Nuxt app (pages, components, composables)
server/               # Backend (tRPC, database, API routes)
e2e/                  # Playwright tests
public/               # Static assets
```

## Commands

- `bun install` — install deps
- `bun run dev` — dev server
- `bun run build` — production build
- `bun run test` — unit tests (vitest)
- `bun run test:e2e` — e2e tests (playwright)

## Deployment

Auto-deploys on push to `main` via Vercel + GitHub integration.

## Conventions

- All agent work delivered via PRs
- Code ownership: Engineer agent (dispatched from `~/Orgs/WeDance/`)
- Work items tracked on org work board: `~/Orgs/WeDance/03_Coordination/Work_Board.md`

## Data (migrated from v4 — 2026-07-15)

Real production data lives in Neon (replacing the old mock-only state). Migrated
from wedance-v4 (Postgres) via `scripts/migrate/`, idempotent + reversible
(every row carries `source_ref`; rollback = `DELETE … WHERE source_ref IS NOT NULL`):
- **3,910 users → `dancers`** (2,339 with passwords; auth continuity verified —
  v4's Firebase-scrypt hashes verify unchanged in 2026).
- **6,426 profiles → `profiles`** (venue/artist/organizer; v4 "FanPage" → organizer).
- **9,580 events → `events`** — all `archived=true`/hidden. NOTE: the source is a
  historical snapshot (newest ~2026-04); there are **no upcoming events** in any
  source (v3 Firestore ends 2022), so "this week"/upcoming feeds have no real data
  until organizers create events going forward.
- **667 follow edges → `follows`**.
Live DB-backed surfaces: sign-in, `/@handle` profiles, `/cities` + `/cities/[city]`,
`/artists`, `/venues`, city video vote, ask-locals, community groups, festival
submit-draft. Festivals list + my-plan/my-year remain partly mock/preview.

## Product backlog (landing-promise audit — 2026-07-16)

125 user stories derived from every landing-page promise/feature/use-case, each
linking **P-id · CUJ (journey) · JTBD · status (built/partial/not-built) · WSJF**.
Kept in sync across three surfaces:
- **Repo:** `docs/issues/<Pxxx>-*.md` (source of truth for story content; taxonomy
  in `docs/issues/_reference-cuj-jtbd.md`).
- **Linear:** team **WED** — 125 issues, 8 CUJ projects (C1–C8), label taxonomy
  (`status:*`, `cuj:C#`, `jtbd:J#`, `aud:*`, `landing-audit`), WSJF-based priority,
  cycle 1 loaded. Titles are short handles (e.g. "Who's Going"), detail in the body.
- **Sheet:** "WeDance 2026 UX" (`12YiUIcBd02hIIj2ua1w2bMFJSJSuIf8a64CQP7E60mg`) →
  "Landing Promises" tab (index + a Linear-link column per row).
Split: 43 built · 60 partial (Todo) · 22 not-built (Backlog). Biggest gap = the
flagship "see who's going / real faces" attendee roster (not built).
