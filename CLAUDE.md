# WeDance 2026 — Code Repository

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

- `cd app && bun install` — install deps
- `cd app && bun run dev` — dev server
- `cd app && bun run build` — production build
- `cd app && bun run test` — unit tests (vitest)
- `cd app && bun run test:e2e` — e2e tests (playwright)

## Deployment

Vercel with prebuilt output:
```
cd app && bun install && cd .. && npx vercel build --prod && npx vercel deploy --prebuilt --prod --scope wedance --archive=tgz
```

## Conventions

- All agent work delivered via PRs
- Code ownership: Engineer agent (dispatched from `~/Orgs/WeDance/`)
- Work items tracked on org work board: `~/Orgs/WeDance/03_Coordination/Work_Board.md`
