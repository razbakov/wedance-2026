---
title: Production Postgres on our own Hetzner server instead of Neon
status: proposed
date: 2026-11-22
---

## Context

On 2026-11-22 from 18:28 CET, production stopped working: Neon answered every query with HTTP 402,
*"Your account or project has exceeded the quota"*. Sign-in failed with reference `b4040949`, and so did
every other page that reads the database. Nothing in our code was wrong. The database is small: the
preview copy, which leaves out sessions and tokens, is 45 MB.

What we have today:

- **One entry point for the app.** `server/utils/db.ts` uses `drizzle-orm/neon-http` (Neon's HTTP
  driver). The app uses two features that depend on the driver: `db.batch` in `auth.ts`, and
  `db.transaction` in `booking.ts`. The `db.transaction` call **always throws** on neon-http
  ("No transactions support in neon-http driver"), so saving a space's availability slots is broken
  today.
- **Migrations already use plain Postgres.** `scripts/db-migrate.ts` connects with `pg` during the
  Vercel build.
- **Tests and local dev** point the Neon driver at a plain Postgres through
  `scripts/dev/neon-http-proxy.ts`. About 20 one-off scripts in `scripts/` import the Neon driver
  directly.
- **Functions run in the wrong region.** Production responses carry `x-vercel-id: fra1::iad1::…`:
  requests come in at Frankfurt, functions run in Washington (`iad1`), and the database is in
  Frankfurt (`eu-central-1`). Every query crosses the Atlantic and back.
- **The Hetzner box** (`46.225.218.172`, 4 GB) already runs Brievcase production and up to five PR
  previews, all on one `dokploy-network`. The preview seed dumped production every night; from
  2026-11-22 it runs weekly (#691).

## Decision

Run production Postgres on a **separate small Hetzner server, `wedance-db`**, set up from files in
`ops/hetzner/wedance-db/`, and connect the app to it with a normal Postgres driver.

1. **Its own server, not the Dokploy box.** The database must not share a network with code from PR
   branches, or share memory with the previews. A CX22 in Nuremberg or Falkenstein is enough for a
   database this size.
2. **Postgres 17 + PgBouncer** (transaction pooling) so short-lived Vercel functions don't run out of
   connections.
3. **Reached over the internet, locked down.** Vercel has no fixed outgoing IPs on our plan, so the
   port has to be public. We allow only TLS (`hostssl`, Let's Encrypt certificate for
   `db.wedance.vip` through the Netlify DNS challenge we already use) and `scram-sha-256`, with a
   long generated password per role. The app role can't create roles or databases. The firewall
   leaves SSH open only to known IPs.
4. **Backups we have actually restored.** WAL-G sends WAL continuously to Hetzner Object Storage and
   takes a nightly base backup (point-in-time restore, about a minute of possible data loss). A daily
   `pg_dump` is kept for 30 days. We test a restore onto a throwaway server before the switch-over,
   and again every month.
5. **Driver: `drizzle-orm/node-postgres`** with a small `pg.Pool` in `server/utils/db.ts`. This also
   works against Neon, so the driver change ships *before* the move and can be tested on its own.
   `db.batch` becomes `db.transaction`, and the `booking.ts` transaction starts working.
6. **Functions run in `fra1`** (`"regions": ["fra1"]` in `vercel.json`). This change stands on its
   own, and we make it first.

## Plan

| Step | What | Size |
|---|---|---|
| 0 | Unlock Neon (raise the limit or upgrade for one month). We can't get the data out otherwise. | GUI, Alex |
| 1 | `vercel.json`: functions in `fra1`. | one line, PR |
| 2 | `server/utils/db.ts` → node-postgres + Pool; `auth.ts` batch → transaction; tests on `pg` directly, which retires the HTTP proxy for tests. Production keeps running on Neon. | ~1 day, PR |
| 3 | `ops/hetzner/wedance-db/`: provisioning script, `postgresql.conf`, `pg_hba.conf`, PgBouncer, WAL-G, certbot, unattended-upgrades, disk and backup alerts. Build the server, restore last night's dump, run a restore drill. | ~1 day |
| 4 | Switch-over, about 10 minutes: stop writes to Neon (`ALTER ROLE … NOLOGIN` on the app role), `pg_dump` → `pg_restore` into `wedance-db` (a 45 MB database takes seconds), compare row counts, set `DATABASE_URL` in Vercel, redeploy, smoke-test sign-in and booking. | ~1 h, announced |
| 5 | Point the preview seed (`/etc/wedance-preview/prod.url`) and `PROD_DIRECT_URL` at `wedance-db`. Move `scripts/` off the Neon driver as each one is next used. | small |
| 6 | Keep Neon for two weeks in read-only mode, then delete the project. | — |

**Rollback:** until step 6, set `DATABASE_URL` back to Neon and redeploy. Anything written to
`wedance-db` since the switch-over has to be copied back by hand. That is the reason to keep step 4 short
and announced.

## Consequences

- No more quota cliff: a busy day costs CPU, not an outage. The server plus object storage should come to
  around €10 a month.
- **We do the database operations ourselves:** security patches, Postgres upgrades, a full disk, a dead
  server. There is no standby. If the server dies, recovery means building a new one and restoring from
  WAL-G (target: under 30 minutes, following the runbook in `ops/hetzner/wedance-db/README.md`). That's
  acceptable at today's size. If WeDance needs high availability later, add a streaming replica on a
  second server.
- Neon's branching goes away. We don't use it: previews already get their own copies on the Dokploy box.
- The availability-slots save in `booking.ts` gets fixed as part of step 2.
