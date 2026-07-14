# WeDance → wedance-2026 Data Migration Plan

_Status: DRAFT for review · Last updated: 2026-07-13_

Migrating real users and content into **wedance-2026** (Neon Postgres / Drizzle),
replacing the current mock data (`app/data/mock-*.ts`) with production data.

---

## 0. TL;DR

- **Users migrate with zero password resets.** v4's `User.salt`/`User.hash` are already
  in the Firebase-scrypt format that 2026's auth verifies (same
  `FIREBASE_SALT_SEPARATOR` / `FIREBASE_SIGNER_KEY`). It's a field copy, not a re-hash.
- **v4 (Postgres/Prisma) is the primary source** — it's already relational and mirrors
  the shapes 2026 needs. **v3 Firestore** (`wedance-4abe3`) is the fallback/enrichment
  source, and the authoritative source for user auth hashes if v4 is found incomplete.
- **Phased, idempotent, dry-run-first.** Every phase is a re-runnable upsert keyed on a
  stable natural key, with a `source_ref` recorded on each row so re-runs and incremental
  sync are safe.
- **Users first (highest value, lowest risk), content last** (replaces mocks gradually,
  page by page).

**One open decision up front (Section 8):** full migration (users + all content) vs.
users-only for now. This plan assumes full, phased.

---

## 1. Sources & target

| | System | Store | Role in migration |
|---|---|---|---|
| **v3** | wedance.vip | Firebase / Firestore `wedance-4abe3` | Origin of everything. Events source-of-truth historically; **authoritative for auth hashes** (Firebase Auth scrypt). Access: `~/Secrets/wedance.json`. |
| **v4** | v4.wedance.vip | PostgreSQL (Prisma) | **Primary source.** Already relational; `User`, `Profile`, `Event`, `City`, `DanceStyle`, `Video`, etc. Carries `firebaseId` back-refs to v3. |
| **2026** | 2026.wedance.vip | Neon Postgres (Drizzle) | **Target.** Tables: `dancers`, `profiles`, `festivals`, `events`(via bookings), `reviews`, `community_groups`, `city_videos`, `giveaways`, … |

Lineage: **v3 → (imported into) v4 → (migrating into) 2026.** Because v4 already did the
Firestore→Postgres flattening, we lean on v4 and only reach into v3 for gaps.

---

## 2. Guiding principles

1. **Idempotent.** Every writer is an upsert on a natural key (email for users, `username`
   for profiles, `slug` for events). Re-running never duplicates.
2. **Traceable.** Add a nullable `source_ref` (or a `migration_map` table) recording
   `{source: 'v4'|'v3', id}` on each migrated row. Enables re-run, incremental sync, and audit.
3. **Dry-run first.** Every script runs `--dry-run` (counts + samples + diff, no writes)
   before any write. Prod write only after staging passes.
4. **Staging before prod.** Run the full pipeline against a Neon **branch** (throwaway copy)
   first; verify; then run against prod.
5. **Non-destructive.** Migration only inserts/updates. Mock data is removed from the app
   in a *separate* code change once the DB-backed path is verified — never both at once.
6. **GDPR-safe.** Skip `isDeleted` users/profiles. Preserve `emailConsent` +
   `emailConsentAt` exactly — never opt anyone in by default. Don't copy soft-deleted PII.

---

## 3. Schema prerequisites (target side)

Before any data moves, land these on the 2026 schema (one migration):

- `dancers.source_ref` (jsonb, nullable) — `{v4Id, firebaseId}`.
- `profiles.source_ref` (jsonb, nullable).
- `festivals.source_ref` / events equivalent (jsonb, nullable).
- Confirm `dancers` already has: `email` (unique), `salt`, `hash`, `username`, `name`,
  `emailVerified`/consent fields. (Auth port added `salt`/`hash`; verify the rest exist,
  add what's missing.)
- Unique indexes that the upserts rely on: `dancers.email`, `profiles.username`,
  `festivals.slug`. Add if absent (a duplicate slug in source must be caught, not silently
  merged).

_Alternative to per-table `source_ref`: a single `migration_map(source, source_id,
target_table, target_id, migrated_at)` table. Cleaner if we don't want to touch every
table — recommended._

---

## 4. Phases (in order)

Each phase = one idempotent script, dry-run → staging → prod, with a verification gate.

### Phase 1 — Reference data
- **Cities**: v4 `City` (+ `Country`) → 2026 city list. Today cities are mock
  (`mock-city-*.ts`); decide whether cities become a DB table or stay a curated constant
  seeded from v4. **Recommend**: seed a `cities` table from v4, keep slugs stable.
- **Dance styles**: v4 `DanceStyle` → 2026 style vocabulary. Normalize casing to match the
  existing style-color maps.
- Gate: counts match expected; every style/city referenced later resolves.

### Phase 2 — Users → `dancers`  ⭐ the crown jewel
- Source: v4 `User` (fallback: v3 Firebase Auth `listUsers()` export).
- Map: `email→email`, `salt→salt`, `hash→hash`, `name/firstName/lastName→name`,
  `emailVerified`, `emailConsent`/`emailConsentAt`, `createdAt`, `firebaseId→source_ref`.
- **Skip** `isDeleted=true`.
- Upsert on `email`. On conflict: update profile fields, **never overwrite a hash the user
  has already changed in 2026** (guard: only set salt/hash when the 2026 row's hash is empty).
- **Auth continuity test (blocking):** pick 3 known v4 accounts, migrate to staging, log in
  on the staging app with their real passwords. Must pass before prod. Forgot-password
  (magic link) remains the fallback for anyone whose hash is missing/legacy.
- Gate: `count(dancers) ≈ count(User where not isDeleted)`; 3/3 login test passes; 0 hash
  collisions overwritten.

### Phase 3 — Profiles → `profiles` (+ link to `dancers`)
- Source: v4 `Profile` (polymorphic `type`: dancer/venue/artist/organizer). Maps almost 1:1
  to 2026 `profiles` (`username, name, bio, type, photo, city, instagram, youtube, website,
  facebook, mapUrl, placeId/lat/lng, claimed, visibility→profilePublic`).
- Link `Profile.createdById`/owner → the migrated `dancer`.
- Skip `isDeleted`. Upsert on `username`.
- Venue profiles carry the booking fields (address, floorType, map) — map where present;
  leave 2026-specific booking config (bookable spaces, moderator) for the venue owner to fill.
- Gate: every non-deleted profile present; usernames unique; owner links resolve.

### Phase 4 — Events & festivals
- Source: v4 `Event` (+ `Ticket`) and/or v3 Firestore `events`.
- Decision needed: 2026 models **festivals** (rich, currently mock) separately from
  **events** (bookings). Map v4 `Event.type` → festival vs. single event:
  - multi-day / has workshops+tickets → `festivals` (+ schedule later),
  - single social/class → an `event` row.
- Map `slug, name, startDate, endDate, description, cover→logo, ticketUrl, venueId→venue
  profile, styles`. Preserve `slug` (deep links + SEO).
- **This is where mocks get replaced** — migrate all cities' events in one pass (big-bang,
  per decision 5), verify pages, then delete the `mock-*.ts` data in one code change gated on
  DB verification.
- Gate: festival/event pages render from DB; `/festivals/<slug>` for every migrated slug
  resolves (no 404, no fallback); counts match per city.

### Phase 5 — Engagement & relationships
- `ProfileFollower` → friend/follow graph. Per decision 4, **build the backend first**
  (`follows` table + follow/unfollow mutations), then migrate `ProfileFollower` into it. This
  also unblocks the "add as friend" flow (currently routed to sign-up as an interim).
- `Vote` → `city_videos`/`video_votes` where applicable.
- Reviews: v4 has no direct equivalent → skip or seed empty.
- `TicketPurchase` → out of scope unless ticketing goes live.
- Gate: referential integrity (no follower pointing at a missing profile).

### Phase 6 — Media
- v4 `Video` / `MuxVideo` → `city_videos` (competition/city video features). Map source URLs;
  do **not** re-host. Skip broken/expired Mux assets.

---

## 5. Tooling

A single `scripts/migrate/` toolkit (bun + TypeScript), one file per phase:

```
scripts/migrate/
  lib/sources.ts      # v4 Prisma client (DATABASE_URL_V4) + v3 firebase-admin (wedance.json)
  lib/target.ts       # 2026 Drizzle client (DATABASE_URL) + upsert helpers + migration_map
  01-reference.ts
  02-users.ts
  03-profiles.ts
  04-events.ts
  05-engagement.ts
  06-media.ts
  verify.ts           # cross-source count + integrity report
```

- Every script: `--dry-run` (default), `--commit`, `--limit N`, `--only <slug/email>`.
- Reads never touch prod-2026; writes go to the Neon branch until explicitly `--prod`.
- `verify.ts` prints a source-vs-target reconciliation table after each phase.

Env needed: `DATABASE_URL` (2026 target), `DATABASE_URL_V4` (v4 source, read-only role),
`GOOGLE_APPLICATION_CREDENTIALS`→`~/Secrets/wedance.json` (v3), plus the existing
`FIREBASE_SALT_SEPARATOR`/`FIREBASE_SIGNER_KEY` (already set — used only to *validate* hashes,
not to migrate them).

---

## 6. Rollout sequence

1. Land schema prereqs (`source_ref` / `migration_map`) — one Drizzle migration, applied to Neon.
2. Build toolkit + `verify.ts`.
3. Spin a **Neon branch** of prod-2026 = staging target.
4. Run Phases 1→2→3 against staging, dry-run then commit, gate after each.
5. **Auth continuity test** on the staging app (real logins). Blocking.
6. Run Phase 4 for **all cities** against staging; verify pages; delete mocks in a branch;
   verify again.
7. Review with Alex → go/no-go for prod.
8. Repeat 4–6 against **prod-2026** in a low-traffic window (all cities, one window).
   Snapshot (Neon PITR) taken first.
9. Run Phases 5–6 (follow graph, media) after the core cutover is verified.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Password hashes don't verify (param drift v3↔v4↔2026) | 3-account login test on staging **before** prod. Magic-link fallback always available. |
| Duplicate emails / usernames across sources | Upsert on natural key; `verify.ts` flags collisions pre-commit; manual reconcile list. |
| Slug collisions between mock + real → wrong page | Unique index on `slug`; migrate then delete mock in the same review; 404 (already shipped) instead of silent fallback. |
| Overwriting a hash a user changed in 2026 | Only set salt/hash when target hash is empty. |
| GDPR: migrating deleted users / non-consented email | Skip `isDeleted`; copy consent flags verbatim; never default-opt-in. |
| Half-migrated state confuses the app | Mock removal is a separate, city-scoped code change gated on DB verification. |
| Re-run creates duplicates | `migration_map` + upserts make every script idempotent. |

---

## 8. Decisions (locked 2026-07-13)

1. **Scope:** ✅ **Full** — users + all content, phased (users first).
2. **Cities:** ✅ **Promote to a DB table**, seeded from v4 `City`/`Country` (Phase 1). Keep
   slugs stable so existing `/cities/<slug>` deep links don't break.
3. **Events vs festivals split:** ✅ decided — heuristic: an `Event` becomes a **festival**
   when it is multi-day (`endDate` ≥ `startDate` + 1 day) **or** has tickets/workshops;
   otherwise it becomes a single **event**. Edge cases (a 1-day festival with a full
   lineup) resolve to festival. Reviewed case-by-case only where the heuristic is ambiguous.
4. **Follow graph (Phase 5):** ✅ **Build the backend now** — a `follows` table +
   follow/unfollow tRPC mutations. This unblocks the "add as friend" flow (currently routed
   to sign-up as an interim) and lets `ProfileFollower` migrate into a real graph.
5. **Cutover:** ✅ **All cities at once** (big-bang), not a Munich pilot. Still run the full
   pipeline on the Neon **staging branch** first and gate on `verify.ts` before prod; the
   difference is prod cutover covers every city in one window rather than rolling per-city.

---

## 9. Success metrics (migration KPIs)

- **Users migrated** = non-deleted v4 users, ± 0 unexplained.
- **Auth continuity** = 100% of test logins pass; password-reset requests post-cutover < X%
  baseline (spike = hash problem).
- **Profiles/events migrated** vs. source counts (per city) = match, 0 orphans.
- **Slug resolution** = 100% of migrated `/festivals/<slug>` and `/@<handle>` resolve (0 404).
- **Zero data-loss** = `verify.ts` reconciliation clean after each phase.
- **Rollback readiness** = Neon PITR snapshot taken before each prod phase.
