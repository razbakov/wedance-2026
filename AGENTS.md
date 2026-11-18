# WeDance 2026 — Code Repository

Dance community platform. Nuxt 4 + tRPC + Drizzle ORM + Neon (PostgreSQL), Bun.

This file is the one set of instructions for every coding agent (Claude Code reads it through `CLAUDE.md`, Cursor
and others read it directly). Agent context lives in the repo so cloud agents get it too:

- `.claude/rules/*.md` — path-scoped feature notes (source). `.cursor/rules/*.mdc` is generated from them:
  `bun scripts/ci/agent-context.ts`; the `unit` job fails when the two differ. Never edit the `.mdc` files.
- `.claude/skills/` — skills both Claude Code and Cursor load. The shared ones are copies from
  `razbakov/skills` (and `obra/superpowers`): edit them there, then `bun scripts/ci/agent-context.ts --skills`.

## Links

- **Live:** https://2026.wedance.vip · **Vercel project:** `wedance-2026` (team `wedance`)
- **GitHub:** `razbakov/wedance-2026` — open source, **AGPL-3.0-only** (`LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`)
- **Org governance:** `~/Orgs/WeDance/` · work board `~/Orgs/WeDance/03_Coordination/Work_Board.md`
- **Docs (public, indexed):** https://2026.wedance.vip/docs — hub + quick start (`app/pages/docs/`), design system
  `/docs/design/**`, generated architecture `/docs/architecture/**` (ADR-000). Old `/design/**`, `/architecture/**`,
  `/styleguide` 301 there (`nuxt.config.ts` routeRules). Shell/nav: `app/components/docs/Shell.vue`,
  `app/lib/docs-nav.ts`; pages use `layout: 'docs'`.

## Commands

- `bun install` — install deps · `bun run dev` — dev server · `bun run build` — production build
- `bun run test` — unit tests (vitest; CI job `unit`). One file: `bunx vitest run path/to/file.test.ts`
- `*.db.test.ts` / `*.integration.test.ts` skip unless `DATABASE_URL` is localhost (`server/test-setup.ts` drops a
  remote one). Run them against the local Postgres below (`NEON_FETCH_ENDPOINT` set); CI job `integration` does the
  same against a throwaway Postgres (`.github/workflows/test.yml`)
- `bun run test:e2e` — e2e (playwright-bdd; the full BDD suite runs nightly, PRs run `e2e-smoke`)

## Deployment and merging

- Auto-deploys on push to `main` via Vercel + GitHub. All agent work is delivered via PRs; code ownership: Engineer
  agent (dispatched from `~/Orgs/WeDance/`).
- **Merge gate (ADR-013, `docs/architecture/adr/013-merge-gate.md`):** `main` is protected — a PR merges only when
  the required checks `unit`, `integration` and `e2e-smoke / e2e` are green (admins included, branch need not be up
  to date, no reviews). Wait, then merge:
  `gh pr checks <pr> --watch --fail-fast && gh pr merge <pr> --squash --delete-branch`.
  Renaming a required job blocks every PR until branch protection is updated; never put an `if:` on a required job
  (skipped counts as passed).
- **PR previews run on the Hetzner dev server, not Vercel (RAZ-886).** Vercel builds only `main` (`vercel.json`
  `ignoreCommand` → `scripts/vercel-ignore-build.sh`; `[preview]` in a commit message still forces a Vercel preview,
  which shares the production database). Every PR gets `https://pr-<n>.dev.wedance.vip`: `.github/workflows/preview.yml`
  builds `Dockerfile` on GitHub and runs it via Dokploy (`ops/hetzner/wedance-preview`) with **its own database**
  `pr_<n>`, cloned from a nightly copy of production (sessions/tokens left out, every dancer's email, phone and
  password scrubbed — sign up fresh; no emails sent). The branch's migrations run on that copy only. Closing the PR
  removes it. Not a merge gate. Box (Brievcase runs there too), TLS, commands: `ops/hetzner/README.md`.
- **Pre-PR checklist (RAZ-1073):** before a pull request is ready for review, load
  `.claude/skills/pr-checklist/SKILL.md` and run `bun scripts/ci/pr-checklist.ts`.
  The script flags and blocks review until every demo path is clickable, covered by BDD,
  the preview has uploads and data, the UI is one language, blueprints match the code,
  and desktop, mobile and a video walkthrough are attached. No user-visible screen → the
  demo checks do not apply. Leave the PR in draft while a check fails.

## Database — there is only one, and it is production

- Real production data lives in Neon (migrated from v4 on 2026-07-15, plus the live wedance.vip sync — see
  `.claude/rules/v3-sync.md`). **The Vercel-pulled `.env` is PRODUCTION**: check `DATABASE_URL` before any `--write`
  script, migration or write test. Scripts that write are dry-run by default; rows they create carry `source_ref` /
  `source` so they can be rolled back.
- Local work: restore a copy into Docker and point the Neon HTTP driver at a local stand-in:

```
docker run -d --name wedance-2026-dev-db -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=wedance -p 5441:5432 postgres:17-alpine
pg_dump "$PROD_DIRECT_URL" --no-owner --no-privileges --exclude-table-data=dancers \
  --exclude-table-data=sessions | psql postgresql://dev:dev@localhost:5441/wedance
bun run dev:db-proxy          # Neon-HTTP-compatible proxy on :4444
# .env: DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance
#       NEON_FETCH_ENDPOINT=http://localhost:4444/sql
```

## Conventions

- Client form validation uses **valibot**: add the form's schema to `shared/validation/forms.ts`
  (field builders in `fields.ts`, limits mirroring the tRPC zod input), then
  `const { errors, validate, fieldAttrs } = useFormValidation(schema, state)`. On submit,
  `const result = validate(); if (!result.success) return` and send `result.data`. Each input
  gets `v-bind="fieldAttrs('field', 'x-field-error')"` plus `<FieldError id="x-field-error" :message="errors.field" />`,
  so a failed submit flags every invalid field at once. `<form>`s get `novalidate`.
- Images: every `<img>` showing a stored photo/flyer/cover uses
  `:src="sizedImage(url, IMG.avatar|card|large|hero)"` (`shared/utils/image.ts`; `AvatarImage` does it
  itself). Raw Cloudinary originals (3.5 MB flyer PNGs) used 64 GB/month and got the account switched off
  (Nov 2026). Download buttons keep the original URL.
- Page handles follow Instagram's rules (`shared/utils/handle.ts` `handleError`); a page is never duplicated
  silently — see `.claude/rules/profiles.md`.
- Nothing reaches other people without a click: posting (Instagram, Telegram), emailing contacts and cancelling
  events are web-only or preview → `confirm_token` on MCP; MCP tokens can't publish or send.
- Personal data (emails, phones, group admin contacts) never goes to PostHog, MCP or public endpoints.
- A PR that changes a journey step updates the matching `app/lib/blueprint-*.ts` in the same PR and names the step ids (`meet-friends: match-them`). A step that is still missing, partial or gap must not cite a Done or Canceled issue in `refs`. See `.claude/rules/blueprints.md`.

## Analytics (PostHog)

- Client: `useTrack()` (`app/composables/useTrack.ts`) — never import posthog directly. Server:
  `trackServer(ctx, name, props)` from tRPC, `trackServerEvent(...)` from webhooks (`server/utils/posthog.ts`).
- Local dev never sends (the `.env` key is production; the plugin is off on dev builds and local hosts).
- Every event carries `app: 'wedance-2026'` (shared PostHog project with v4) — **always filter on `app = wedance-2026`**.
- Conversions fire twice: client `x` and server `server_x`. **Count conversions on `server_*`**; never mix the two.
- Props are non-PII only: never names, emails or raw search text.
- **Adding or renaming an event:** snake_case, one per user intent, and add a row to `docs/analytics/events.md`
  (setup details, identity, groups, revenue). `server/utils/posthog.catalogue.test.ts` fails otherwise.

## Feature notes (path-scoped rules)

Detail per feature lives in `.claude/rules/` (mirrored to `.cursor/rules/`) and loads automatically when you touch
matching files. Read the
relevant one before working on a feature from another entry point (MCP tools, scripts):

- `v3-sync.md` — v4 migration, wedance.vip → 2026 event / profile / user sync, page-owner suggestions
- `profiles.md` — duplicate profiles, merging, Instagram aliases, handles
- `city-channels.md` — city pages, weekly post, occasion plan, official channels, local groups
- `instagram.md` — Apify profile import, event from an Instagram post, Meta app connection
- `events.md` — new event flow, venue hints, signing up / booking, cancelling, reviews
- `contacts.md` — Who's coming, Contacts, audience, email to contacts
- `my-plan.md` — My plan tabs, Share my weekend, dance friends, year in dance
- `blueprints.md` — the seven service blueprints stay with the code; a closed issue cannot sit on an unfinished step
- `backlog.md` — landing-promise backlog (`docs/issues/`, Linear, sheet)
