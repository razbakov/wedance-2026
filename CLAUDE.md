# WeDance 2026 — Code Repository

## Framework

@/Users/razbakov/Projects/ikigai-team/CLAUDE.md

---

Dance community platform. Nuxt 4 + tRPC + Drizzle ORM + Neon (PostgreSQL).

## Links

- **Live:** https://2026.wedance.vip
- **Vercel project:** `wedance-2026` (team: `wedance`)
- **Org governance:** `~/Orgs/WeDance/`
- **GitHub:** `razbakov/wedance-2026` — open source, **AGPL-3.0-only** (`LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`)
- **Docs (public, indexed):** https://2026.wedance.vip/docs — hub + quick start (`app/pages/docs/`),
  design system `/docs/design/**`, generated architecture `/docs/architecture/**` (ADR-000).
  Old `/design/**`, `/architecture/**`, `/styleguide` 301 there (`nuxt.config.ts` routeRules).
  Shell/nav: `app/components/docs/Shell.vue`, `app/lib/docs-nav.ts`; pages use `layout: 'docs'`.

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

**Merge gate (ADR-013, `docs/architecture/adr/013-merge-gate.md`):** `main` is protected — a PR merges
only when the required checks `unit`, `integration` and `e2e-smoke / e2e` are green (admins included,
branch need not be up to date, no reviews). Wait, then merge:
`gh pr checks <pr> --watch --fail-fast && gh pr merge <pr> --squash --delete-branch`. The full BDD suite
runs nightly (`.github/workflows/nightly.yml`), not on PRs. Renaming a required job blocks every PR until
branch protection is updated; never put an `if:` on a required job (skipped counts as passed).

## Conventions

- All agent work delivered via PRs
- Code ownership: Engineer agent (dispatched from `~/Orgs/WeDance/`)
- Work items tracked on org work board: `~/Orgs/WeDance/03_Coordination/Work_Board.md`
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
- **Page teams were NOT migrated** (only 8 of 6,426 v4 pages have one). Leads live in
  `profile_owner_suggestions` (0058), read from wedance.vip (v3, live — v4 was only the import
  snapshot) with v3's own edit rule (`use/auth.js` `can`): `v3-own` (the page is their account),
  `v3-team` (Team Members), `v3-creator` (created it, only if they created ≤5 pages — heavy
  creators list other people's venues). `scripts/import-page-owner-suggestions.ts` (dry-run default,
  `--write`, `:runQuery` only). Shown in Admin → Users ("Make owner" → `admin.addPageOwner`, emails
  "You now manage …"; "Not them" → `admin.dismissSuggestion`). Never in the claims queue.
**Update 2026-10-04:** the "no upcoming events" note above is obsolete — wedance.vip
(v3 Firestore `posts`, type `event`) is actively maintained (~1,300 upcoming events,
~1,000 of them in Munich). They are mirrored into `events` by the v3 sync below.

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

## wedance.vip → 2026 event sync

`bun run sync:v3-events` mirrors every **upcoming** wedance.vip event (Firestore
`posts` where `type == "event"`, `startDate >= now`, all cities) into the `events`
table. **Read-only against v3** — the only Firestore call is `:runQuery` (REST, no
firebase-admin). Code: `scripts/sync-v3-events.ts` (CLI) + `server/utils/v3EventSync.ts`
(mapping, Firestore client, upsert; unit-tested).

- **Dry-run is the default.** `--write` applies migration `0021_events_v3_sync.sql`
  (idempotent, additive) then upserts. `--json` prints a machine-readable summary.
- **Key:** `source='wedance-v3'`, `source_id=<v3 post id>`; rows go `archived=false,
  published=true`. Still-upcoming rows that v3 no longer lists → `archived=true`.
  Re-running is a no-op (reports `unchanged`). Rollback: `DELETE FROM events WHERE source='wedance-v3'`.
- **Mapping:** city = venue locality (→ 2026 `city_slug` via profiles + `city-images.json`
  altNames, e.g. München→munich); styles = v3 StyleKeys → 2026 labels (`STYLE_MAP`);
  times stored UTC + IANA `timezone`, always rendered in the event's zone
  (`shared/utils/eventTime.ts`). Festival/Congress/Weekender → `is_festival`.
- **Shown on:** `/cities/[city]` (this-week calendar, "Coming up", festivals) and
  `/events/[id]` via the `events` tRPC router.
- **Profiles (since 0022):** the same run also syncs **every visible v3 business page** — venues,
  organisers, fan pages (→ organizer), artists, in any city, with or without events
  (`--events-only` = just the pages behind events) — (`server/utils/v3ProfileSync.ts`) and links each event
  (`venue_username`, `organizer_username`, `artists[]`), which feeds the city page's
  "Who's on the floor" tabs and the schedule on `/@handle`. Dedupe order — people:
  v3 profile id (`source_ref.firebaseId` from the v4 migration) → handle → name+city;
  venues: Google place id (the v4 venue-handle convention) → name+city → contained
  name → street+number → the organiser's own profile when the school hosts its
  classes → ≤75 m from a venue this sync created. Unmatched venues are created
  (address-only ones are named after the street). Claimed profiles are never
  written; other unclaimed rows only get EMPTY fields filled; rows this sync created
  (`source_ref.source='wedance-v3'`) follow v3. As on wedance.vip, only `Members` /
  `Unlisted` hide a v3 page (no visibility = public); only public fields (name, handle, photo, bio, social links, city,
  styles, venue address) — never email/phone. Rollback:
  `DELETE FROM profiles WHERE source_ref->>'source'='wedance-v3'` (after clearing the
  event links: `UPDATE events SET venue_username=NULL, artists='[]' WHERE source='wedance-v3'`).
  Display check: `bun e2e/synced-profiles.check.ts <venueHandle> <organiserHandle>`.
  Instagram accounts (main in `socials` + `profiles.instagram_aliases`) also match people.

## wedance.vip → 2026 user sync

`bun run sync:v3-users` (dry-run default, `--write`, `--json`) mirrors wedance.vip accounts into
`dancers` — the v4 migration stopped ~April 2026. Code: `scripts/sync-v3-users.ts` +
`server/utils/v3UserSync.ts` (`planUsers`, unit-tested). Read only: Firebase Auth `accounts:batchGet`
+ Firestore `:runQuery`. Match by v3 id (`source_ref.firebaseId`) then email; new people get name /
photo / bio / city / Instagram from their v3 profile, their v3 sign-up date, no handle, and
`source_ref.source='wedance-v3'`; existing people only get EMPTY fields + their v3 id (never the
`source` tag, never a new name or password). **Passwords:** Google returns `REDACTED` hashes unless
the service account has the "Firebase Authentication Admin" role — until then new people sign in by
magic link; re-running fills hashes only where a dancer has none. Rollback (new people only):
`DELETE FROM dancers WHERE source_ref->>'source'='wedance-v3' AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.dancer_id=dancers.id)`.

## Duplicate profiles (#458)

- **Merge:** Business → a page → "Duplicates" (`BusinessDuplicates.vue`) or MCP `merge_profiles` →
  `business.merge` (owners of both pages, or admins). `server/utils/mergeProfiles.ts` `mergeProfile`
  moves every profile reference (`PROFILE_REFS` — a unit test fails when a new profile FK isn't listed;
  rows that would clash stay on the copy, nothing is deleted), handle refs (events venue/organizer/
  line-up, reviews), fills the kept page's empty fields, turns the copy's Instagram into an alias, and
  hides the copy with `source_ref.mergedInto` (`entity.movedTo` → `/@old` 301s to `/@kept`).
  Audit + undo: `profile_merges` (moved row ids, kept page before) → `business.undoMerge`.
- **Instagram aliases:** `profiles.instagram_aliases` (lowercased handles; main stays in `socials`).
  `linksInstagram()` (business.ts) matches both and skips merged copies — used by create,
  `addFromInstagram`, `addVenue`, search; the v3 sync indexes them too.
- **Duplicate warning:** `server/utils/profileDupes.ts` `findLikelyDuplicates` (same Instagram,
  handle, similar name in the same city — "Bar Buena Vista" ≈ "Buena Vista Bar" — same address or
  ≤75 m for venues) behind `business.findExisting` (Create form), `business.duplicates`, `addVenue`
  and MCP `create_my_page` (returns `possible_duplicates` unless `create_anyway`).
- Bulk clean-up of obvious copies: `scripts/merge-duplicate-profiles.ts` (dry-run default).
- **Handles = Instagram:** a chosen page handle follows `shared/utils/handle.ts` `handleError` — `[a-z0-9._-]`,
  3–40, no dot/dash at either end, no "..", not `RESERVED_HANDLES`, not ending like a file (`.png`, `.js`…). Used by
  `business.create` / `business.renameHandle` (zod) and the forms (valibot `optionalHandle` / `requiredHandle`).
  `handleFromInstagram` keeps the Instagram handle as is. Rename (Business → page → Handle, owners) keeps the old
  handle in `source_ref.oldHandles` (→ `entity.movedTo` redirect) and moves handle refs via `moveHandleRefs`.
- **Env:** `DATABASE_URL` (target — check it before `--write`; the Vercel-pulled `.env`
  is PRODUCTION), `WEDANCE_V3_SERVICE_ACCOUNT` (JSON) or `WEDANCE_V3_SERVICE_ACCOUNT_FILE`
  (default `~/Secrets/wedance.json`).
- **Display check:** `BASE_URL=http://localhost:3000 bun e2e/synced-events.check.ts <eventId:HH:MM>…`
  (asserts no digit-only style tags / epoch numbers / timezone shifts; screenshots →
  `docs/screenshots/v3-sync/`).

### Vercel Preview environment

Preview deployments share the production `DATABASE_URL` so that DB-backed pages
(e.g. `/gigs`, `/cities/[city]`, `/@handle`) render correctly on PR previews.
There is only one Neon database — Neon branching can be added later if write
isolation becomes necessary.

### Local Postgres (never test writes against prod)

There is only one Neon database (production). For local work, restore a copy into
Docker and point the Neon HTTP driver at a local stand-in:

```
docker run -d --name wedance-2026-dev-db -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=wedance -p 5441:5432 postgres:17-alpine
pg_dump "$PROD_DIRECT_URL" --no-owner --no-privileges --exclude-table-data=dancers \
  --exclude-table-data=sessions | psql postgresql://dev:dev@localhost:5441/wedance
bun run dev:db-proxy          # Neon-HTTP-compatible proxy on :4444
# .env: DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance
#       NEON_FETCH_ENDPOINT=http://localhost:4444/sql
```

## City channels — weekly post, official channels, local groups (0067)

A city's own WeDance accounts (e.g. Instagram @wedancemunich) are run from a **city page**: an ordinary
business page linked in `city_pages` (Admin → Cities, `/admin/cities`: "Create @wedance<city>" → `cityChannels.createCityPage` makes an organizer page "WeDance <City>" with the admin as owner and links it; or link an existing page → `cityChannels.setCityPage`). Its team
(`profile_members`) are the **city admins** (`server/utils/cityAccess.ts` `requireCityAdmin`; WeDance admins pass
everywhere). Tools: Business → the page → "WeDance <city>" → `/business/network/<handle>/city`.

- **Weekly post** (`citySchedule` router, `city_schedules`): the city's live events of a week (Mon 06:00 → Mon 06:00,
  city zone); nights out picked by default, weekly courses not (`shared/utils/citySchedule.ts`). Text is generated
  from the picks until edited by hand. Picture = SVG (`server/utils/scheduleImage.ts`) rasterised by Cloudinary
  (`wedance-2026/schedules/<city>-<week>`, JPEG). Post once per week per place: Instagram feed / story through the
  page's #501 connection; Telegram via the WeDance bot (`server/utils/telegram.ts`) to every official Telegram
  channel with a chat id. Nothing is posted without a click; MCP tokens can't publish.
- **Official channels** = `community_groups` with `kind='official'` (+ `telegram_chat_id` for the bot). Shown on the
  city page under the weekly calendar (`CityOfficialChannels`, `cityChannels.official`, which also adds the page's
  Instagram). "Check bot" = `getChat` + `getChatMember`.
- **Local groups grow with the community**: `communityGroup.submit` (any signed-in dancer, "Share a group" in
  `CommunityGroupsSection`) → `status='pending'` → city admins approve/decline (`pending` / `review`); listed with
  "added by <first name>". Dedupe on `invite_key` (`shared/utils/communityGroups.ts` `inviteKey`, unique index).
  `checkLinks` fetches only chat.whatsapp.com / t.me invite pages (`server/utils/groupLinkCheck.ts`): a dead link is
  hidden from the city page (`link_status='dead'`); a batch that comes back >80% dead changes nothing. WhatsApp is
  'dead' only when BOTH `og:title` and `invite_link_type_v2` are empty (any mix = 'unknown'); checked on real working
  invites in RAZ-862.
- **Organisers' group list** (RAZ-861): `bun scripts/import-community-groups.ts` (dry-run default, `--write`, `--json`,
  `--csv <file>`) reads the "Groups" tab of the "Outreach CRM" sheet (CSV export) → `community_groups` (`source='import'`,
  visible, unverified). Rules in `server/utils/communityGroupImport.ts`: link from the "Whatsapp" column (platform from
  the link), known cities only (first of a list; regions are reported, never guessed), rows marked private / invalid /
  inactive left out, insert-only, skips any `invite_key` already in the table. Rollback: `DELETE … WHERE source='import'`.
- **Env:** `TELEGRAM_BOT_TOKEN` (create the bot with @BotFather; add it to each channel as an admin allowed to post).
  Unset = Telegram posting is off, the UI says so. Instagram needs the page's #501 connection.

## Instagram profile import (Apify, #452)

Pages added from an Instagram handle (`businessEvents.addFromInstagram`, `addVenue` with
`instagram`, `business.create` / MCP `create_my_page`) are filled from that account's public
profile **after the response** (`ctx.waitUntil`): name (only while it is still the handle),
photo (re-hosted on Cloudinary `wedance-2026/profiles`, never hot-linked), bio, bio link as a
`website`/social link, city (when it matches `cities`) and, for venues, the business address.
Empty fields only; claimed/managed pages are never written (except the dancer's own new page from
`business.create`). Handles added within ~1.5 s share one actor run. Each attempt is stored in
`source_ref.instagram_import = { at, ok, handle, fields | error }`.

- Code: `server/utils/instagram/apify.ts` (generic `runActor(actorId, input)` + `fetchInstagramProfiles`,
  per-handle cache — reuse it for post imports), `server/utils/instagram/profileImport.ts`
  (fill rules, batching), `server/utils/rehostImage.ts` (Cloudinary, shared with `update_listed_profile`).
- **Env:** `APIFY_TOKEN` (Vercel production). Unset = silent no-op (logged once). Actor:
  `apify~instagram-profile-scraper` via `run-sync-get-dataset-items`.
- **Backfill:** `bun scripts/backfill-instagram-profiles.ts` (lists candidates) → `--fetch` (calls
  Apify, writes nothing) → `--write [--limit N] [--handles a,b]`. Needs `APIFY_TOKEN`, the Cloudinary
  keys and `DATABASE_URL` — check the target before `--write`.

## Event from an Instagram post (#453)

Paste the link of an organiser's post or reel → a complete DRAFT: MCP `import_from_instagram` and the
"Paste an Instagram post" field on `/business/events/new`, both → `eventImport.fromInstagram`
(`server/trpc/routers/eventImport.ts`). Post via Apify `apify~instagram-scraper`
(`server/utils/instagram/post.ts`, `APIFY_TOKEN`) → Gemini reads the caption into fields
(`server/utils/instagram/eventExtract.ts`, `GEMINI_API_KEY`) → line-up / venue through
`addFromInstagram` / `addVenue` (so #452 fills them) → `businessEvents.create`; cover = the post's
picture re-hosted. The caption is untrusted: quoted to the model as data, the answer bounded by a JSON
schema and checked again (handles must be in the post, links written in the caption). The post's
organisers are kept in `events.source_ref.instagram.organizers` — TODO(#456) link them as co-organisers.
The same post for the same page returns the existing draft. Missing env → a clear error, no crash.

## Connect Instagram — official Meta app (#501)

Meta app **WeDance** (`2207322860205270`, business portfolio WeDance — unverified) → developers.facebook.com/apps/2207322860205270.
New Meta apps get **Instagram API with Unified login** only (the plain "Instagram Login" setup is gone): a Facebook
Login for Business configuration **"Connect Instagram"** (`1134955742345614`) — system-user token, never expires,
asset Instagram account (required), permissions `instagram_basic`, `instagram_content_publish`,
`instagram_manage_comments`, `instagram_manage_messages`, `business_management` (without it
`/me/assigned_instagram_accounts` is empty). Dialog uses `config_id`, never `scope`. All calls on graph.facebook.com.

- Owners connect on Business → page → Instagram (`BusinessInstagram.vue`) → `instagram.connectUrl` (signed `state`,
  15 min — sessions are bearer tokens, so the redirect carries none) → `/api/meta/instagram/callback` (code →
  token → account picked by the page's Instagram link → `instagram_connections`, token AES-GCM, `server/utils/meta/`).
- Content plan "Post to feed" / "Add to story" → `instagram.publishPost({ to })`: the organiser picks, whatever shape
  the post was painted in. `server/utils/meta/image.ts` pads the kept flyer on a blurred copy of itself (feed: 4:5 —
  a 9:16 flyer would be refused; story: 9:16) as a Cloudinary JPEG. Feed = picture + caption (`ig_media_id`), story =
  picture only (`ig_story_media_id`, 0064); each goes once. Web only, one click each; posts from the host page, else
  organiser, else venue.
- `/api/meta/webhook` (GET verify, POST `X-Hub-Signature-256`) stores comments / messages for connected accounts in
  `instagram_webhook_events`. `/api/meta/data-deletion` answers Meta's `signed_request`.
- **Env:** `META_APP_SECRET` (required — App settings → Basic), `META_WEBHOOK_VERIFY_TOKEN`; optional `META_TOKEN_KEY`
  (else derived from `OAUTH_SIGNING_SECRET`), `META_APP_ID`, `META_INSTAGRAM_CONFIG_ID`, `META_GRAPH_VERSION` (v25.0).
- **Dev mode:** only people with a role on the app (and Instagram testers) can connect. Others need business
  verification + App Review (screencast per permission).

## Share my weekend (#527)

A dancer shares this week's parties as `/w/<code>` (`weekend_shares`, migration 0066 — a snapshot of event ids;
the same parties within 6 days reuse the link) plus a 1080×1920 Instagram story drawn on a canvas in the browser
(`app/lib/weekendStory.ts` — a bold poster, no photos (flyers are too busy): the first party's dance colour as the
background, Anton (Google Fonts, loaded only when used) for the type, each party a black band; a short line of
our own per style from `shared/utils/storyLines.ts`, which the sharer can shuffle or rewrite) and shared through the phone's share sheet, the link copied for the link sticker.
Friends tap "I'm in" per party (`weekend_share_joins`): signed in → it goes on their plan; signed out → a first
name + the RSVP guest token, mirrored as an unconfirmed "yes" on the event's poll. After a guest's tap the page offers an
optional email: a magic link back to `/w/<code>?confirm=<event>&guest=<token>`, which (signed in) folds that
browser's guest joins into the account — on their plan, confirmed "yes" on the poll, no second email to the
sharer. Signed-in joins also add a confirmed "yes" on the poll. The sharer gets `sendWeekendJoinEmail` per new join. Entry points: My plan → "Share my weekend", MCP `share_my_weekend`
(returns `storyUrl` = the link + `?story=1`, which shows the story maker to whoever opens it).
Code: `server/trpc/routers/weekend.ts`, `shared/utils/weekendShare.ts`, `app/pages/w/[code].vue`.
No auto-posting: Instagram's publishing API is Business/Creator-only and the Meta app is in dev mode.

## Analytics (PostHog)

**Setup.** Client: `app/plugins/03.posthog.client.ts` (posthog-js, EU host, manual `$pageview`
on route change, `person_profiles: 'identified_only'`). Call sites use `useTrack()`
(`app/composables/useTrack.ts`: `track`, `trackOnce`, `identify`, `reset`, `sessionReplayUrl`) —
never import posthog directly; everything is a no-op without `NUXT_PUBLIC_POSTHOG_KEY` (tests).
Server: `server/utils/posthog.ts` → `trackServer(ctx, name, props)` from tRPC procedures
(dependency-free `fetch` to `/i/v0/e/`, handed to `ctx.waitUntil`, never throws, off under vitest);
`trackServerEvent(h3Event, name, distinctId, props, { dedupeKey })` from webhooks / plain API routes
(no tRPC ctx: `distinctId` = the buyer's dancer id when known, else anonymous; `channel: 'webhook'`;
`dedupeKey` → deterministic event `uuid` so redeliveries collapse).
`server/utils/posthog.catalogue.test.ts` fails when a `server_*` event in code is missing from the table below.

**Local dev never sends.** The Vercel-pulled `.env` holds the PRODUCTION key. The client plugin is a
no-op on a dev build (`import.meta.dev`) and on local hosts (`app/lib/analytics-host.ts`: localhost,
127.x, ::1, `*.localhost`, `*.test`); the server helper is off under `nuxt dev`. To debug PostHog
locally, use a separate test project key, and still expect nothing from localhost — test on a preview.

**The `app` filter rule.** 2026 shares the WeDance v4 PostHog project (EU free plan = one project).
Every event — client super-property and server payload — carries `app: 'wedance-2026'`.
**Always filter insights/funnels on `app = wedance-2026`.**

**Identity.** `identify(dancerId)` runs on sign-in (`setSession`) and on every session restore
(`auth.me` → `_applyMe`), idempotently (skipped when `get_distinct_id()` already is the dancer; only
person props are refreshed). Person props are non-PII only: `city`, `is_admin`, `role`, `intent`,
`onboarded`, `dance_styles_count`, `has_username`. Never send names, emails or raw search text.
`reset()` on sign-out. Server events use `distinct_id = dancerId`; anonymous server calls get a random
id + `$process_person_profile: false`.

**Client vs server convention.** Conversions fire twice: the client event (in-session context:
pageviews, replay, UTM) and a `server_<same name>` copy from the router (survives ad blockers).
**Count conversions on `server_*`**; use the un-prefixed client event for in-session funnels. Never
mix the two in one count. Server events also carry `$lib: 'wedance-server'` and `channel: web|mcp`.

### Client events (`useTrack().track`)

| Event | Fired in | Props |
|---|---|---|
| `$pageview` | `plugins/03.posthog.client.ts` (route change) | `path` |
| `signup_completed` | `useAuth.register`, `useAuth.verifyMagicLink` (server says `isNew`, rule below), `useAuth.confirmInviteEmail` | `method` (password / magic_link / invite_email) |
| `login_completed` | `useAuth.login`, `useAuth.verifyMagicLink` | `method` |
| `onboarding_completed` | `useAuth.completeOnboarding` | `intent` |
| `profile_updated` | `useAuth.updateProfile` | `fields_changed` (field NAMES only, `app/lib/changed-fields.ts`) |
| `onboarding_step_completed` | `onboarding.vue` (intent picked · details saved · skipped) | `step` (intent / details / skip), `intent`, `repeat` (already onboarded), `has_details` · `has_city`, `styles_count`, `has_role` |
| `landing_cta_click` | `index.vue` | `cta` (find_festival / seeker … / see_attendees / private_events / festival_organizers), `section` (hero / journey / proof / business / footer) |
| `find_your_dance_started` / `find_your_dance_completed` | `find-your-dance.vue` (first video watched or choice · a style or the taster chosen; not a quiz) | `style`, `via` · `style_chosen`, `taster`, `answers_count` (videos watched), `styles_suggested` |
| `profile_viewed` | `/@handle` (business profiles, `trackOnce`), `/u/<handle>` (dancers — no handle sent) | `profile` (business only), `profile_type`, `city`, `claimed`, `own`, `surface` |
| `outbound_click` | delegated listener `plugins/06.outbound-click.client.ts` (every external link) | `kind` (ticket / website / instagram / map / whatsapp / telegram / community_group / email / phone / ai_app / …; `data-outbound-kind` overrides), `platform`, `host` (never path/query), `object_type`, `object_id` (`data-object-*` or the page's `useTrackContext`), `city`, `surface` (route name) |
| `plan_shared` | `SharePlanModal` (festival workshop plan), `ShareYearPlanModal` (year) | `object` (festival / year), `method` (copy / native), `festival` / `workshops` / `festivals`, `surface` |
| `shared_plan_viewed` | `FestivalView` (`?invite=` / `?plan=shared`), `my-year?user=` | `object`, `festival`, `signed_in`, `workshops` / `festivals`, `has_referral` |
| `referral_link_shared` | `SharePlanModal` referral link copy | `method`, `festival`, `surface` |
| `tracked_link_visit` | `plugins/05.tracked-link.client.ts` (`?via=` promoter link) | `code_type`, `referral_code` (promoter link code), `counted`, `landing` |
| `organizer_insights_viewed` | `organizers/insights.vue` (once per festival per 30 min) | `festival`, `profile_type`, `festivals` |
| `venue_cta_click` | `for-venues.vue` | `surface`, `cta` (list_venue / for_organizers / booking_terms) |
| `city_viewed` | `pages/cities/[city]/index.vue` (once per mount) | `city`, `style` |
| `event_viewed` | `pages/events/[id].vue` (non-festival, once per mount) | `event_id`, `city`, `style`, `event_type`, `synced`, `is_festival` |
| `festival_viewed` | `pages/events/[id].vue` (festival) | same as `event_viewed` |
| `filter_used` | city page style chip | `surface`, `city`, `filter_keys`, `style` |
| `search_used` | `/festivals`, `/artists`, `/gigs` (`useTrackSearch`, debounced) | `surface`, `query_length`, `filter_keys`, `results` |
| `week_plan_add` / `week_plan_remove` | `useWeekPlan` (Going! toggle), `my-plan` enroll / course X | `event_id`, `week_count` or `source`; add: `event_type`, `city`, `surface` |
| `year_plan_add` / `year_plan_remove` | `useYearPlan` | `festival_slug`, `year_count`; add: `festival`, `surface` |
| `workshop_plan_add` / `workshop_plan_remove` | `festival/FestivalView.vue` | `festival`, `workshop_id`, `workshop_type`, `partner_status` |
| `discover_swipe` | `my-plan` discover deck | `direction`, `card_kind`, `added_festival`, `added_event` |
| `goal_added` | `useGoals.addGoal` | `style` |
| `follow` / `unfollow` | `/@handle`, `PromoterProfile` (profiles); `FestivalView` shared plan (dancer) | `target`, `profile`, `profile_type`, `surface` |
| `whos_going_profile_opened` | `GoingSection` face tap | `item_type`, `item_id` |
| `going_visibility_changed` | `GoingSection` share toggle | `share`, `item_type`, `item_id` |
| `wave_sent` / `wave_retracted` | `GoingSection`, `DiscoverDancers`, `EventRsvpPoll` pairing (sent only) | `festival`, `surface` |
| `rsvp_answered` | `EventRsvpPoll` (event poll tap — signed out it's saved unconfirmed) | `answer` (partner / needLeader / needFollower / yes / next), `signed_in`, `surface`, `event_id` |
| `discover_deck_joined` | `DiscoverDancers` "show me" | `item_type`, `item_id`, `was_going` |
| `hangout_created` | `FestivalView`, `my-plan` | `kind`, `surface`, `event_id` / `event_linked` |
| `hangout_rsvp` | `FestivalView`, `my-plan` | `going`, `surface`, `hangout_id` |
| `dinner_joined` · `ride_share_posted` · `roommate_search_toggled` | `useDinners` · `useRideShares` · `useRoommates` | `dinner_id` · `festival`, `type` · `festival`, `looking` |
| `shared_plan_signup` | `FestivalView`, `my-year` ("add friend" from a shared plan) | `surface`, `slug` |
| `ask_locals_post` · `video_submit` · `video_vote` · `city_battle_vote` | city components | `city`, … |
| `review_submitted` · `giveaway_entered` · `election_nominated` | `ReviewsSection` · `GiveawayCard` · `elections/[handle]` | target ids |
| `event_created` / `event_published` | `business/events/new.vue` (starts a draft; `event_published` only when "Publish it now" is ticked); publish = draft→live in `business/events/[id]` (checklist "Publish" button or the Published box) | `event_id`, `is_festival`, `city`, `style`, `published` |
| `event_imported` | `business/events/new.vue` "Paste an Instagram post" (#453) | `event_id`, `source` (instagram), `created` (false = this post's draft already existed), `lineup`, `has_cover` |
| `business_profile_created` | `business/new.vue` | `profile`, `profile_type`, `from_instagram` |
| `public_page_set` | `settings/index.vue` "Your public page" (one handle per person, #474) | `cleared`, `profile_type` |
| `profile_merged` | `BusinessDuplicates` (Business → page → Duplicates) | `profile` (kept), `merged_profile`, `moved` |
| `profile_claim_started` / `team_join_started` | `business/claim.vue` (form opened) | `profile`, `kind` |
| `profile_claim_requested` / `team_join_requested` | `business/claim.vue` (sent) | `profile`, `kind`, `evidence_type` |
| `profile_claimed` | `confirm/[token].vue` (invite link) | `via`, `new_account` |
| `invite_email_confirmed` | `useAuth.confirmInviteEmail` ("That's me" in the answer email → `/confirm/<token>?that=`) | `owner`, `new_account` |
| `tickets_claimed` | `charanga/claim.vue` | `count`, `festivals` |
| `booking_inquiry_sent` · `booking_join_offered` · `booking_request_submitted` · `booking_added_to_event` | `BookingInquiryForm`, `PromoterProfile`, `/@handle`, `book/[handle]` | `profile`, … |
| `event_inquiry_submitted` | `for-events.vue` | `event_type`, `city` |
| `gig_posted` · `gig_cta_click` | `gigs/index.vue` | `kind`, `category` · `action`, `gig_id` |
| `ticket_cta_click` | `FestivalHero` (external shop), `FestivalView` (Stripe checkout) | `slug` / `festival`, `provider` (stripe / tickettailor / external), `tickets`, … |
| `organizer_cta_click` · `sponsor_cta_click` · `press_cta_click` · `whats_new_*_click` | marketing pages | `surface`, `kind` |
| `app_connected` | `oauth/authorize.vue` | `scopes`, `business` |
| `ai_app_cta_click` | `AiAppCta` ("Use WeDance in ChatGPT": docs connect-ai, Settings → Connected apps, new event, Business dashboard, for-organizers, my-plan) | `app` (chatgpt), `surface` (docs_connect_ai / settings_connections / business_event_new / business_dashboard_empty / business_dashboard_needs / for_organizers / my_plan) |
| `instagram_connect_started` | `BusinessInstagram` (Business → page → Instagram, before Meta's dialog) | `profile`, `reconnect` |
| `instagram_post_published` | `BusinessContentPlan` "Post to feed" / "Add to story" | `event_id`, `post_kind`, `format`, `to` (feed / story) |
| `weekend_plan_viewed` | `w/[code].vue` (Share my weekend page, once per mount) | `own`, `parties`, `friends`, `story` (opened with `?story=1`) |
| `weekend_joined` | `w/[code].vue` "I'm in" | `signed_in`, `surface` |
| `weekend_reminder_requested` | `w/[code].vue` email step after a guest's "I'm in" (magic link sent) | `surface` |
| `weekend_story_shared` | `w/[code].vue` story panel | `method` (native / download / copy), `parties`, `own_line` (the sharer wrote their own line) |
| `problem_report_opened` / `problem_report_submitted` / `problem_report_screenshot` | `ReportProblem` | `type` · `captured` (screenshot) |
| `community_group_submitted` | `SubmitGroupDialog` ("Share a group" on a city's Local groups) | `city`, `platform`, `duplicate` |
| `city_schedule_published` | `BusinessCitySchedule` (city page → Weekly post: Post to feed / story / Telegram) | `city`, `to` (instagram_feed / instagram_story / telegram) |

### Server events (`trackServer`, all prefixed `server_`)

| Event | Procedure | Props |
|---|---|---|
| `server_signup_completed` | `auth.register`, `auth.verifyMagicLink` (account created by this flow, see note), `artistInvites.confirmEmail` (method `invite_email`) | `method`, `has_city`, `via_link` |
| `server_login_completed` | `auth.login`, `auth.verifyMagicLink` | `method` |
| `server_onboarding_completed` | `auth.completeOnboarding` | `intent` |
| `server_event_created` | `businessEvents.create`, `businessEvents.createSeries` | `event_id`, `is_festival`, `host_type`, `city`, `published`, `series_id`, `dates` |
| `server_event_imported` | `eventImport.fromInstagram` (web + MCP `import_from_instagram`; the draft itself also fires `server_event_created`) | `event_id`, `source` (instagram), `kind` (post / reel), `lineup`, `organizers`, `has_venue_page`, `has_cover`, `has_ticket`, `sessions`, `$groups` |
| `server_event_published` | `create`/`createSeries` with `published`, `update` draft→live, `publishSeries` | `event_id`, `is_festival`, `series_id`, `dates` |
| `server_booking_request_submitted` | `booking.request` (was server_booking_requested until 2026-10-20) | `booking_id`, `signed_in` |
| `server_booking_inquiry_sent` | `inquiries.send` (was server_inquiry_sent until 2026-10-20) | `inquiry_id`, `profile`, `delivered`, `signed_in` |
| `server_event_inquiry_submitted` | `feedback.inquiry` | `event_type`, `city` |
| `server_festival_draft_submitted` | `festival.submitDraft` (server only) | `submission_id`, `festival`, `signed_in` |
| `server_profile_claim_requested` / `server_team_join_requested` | `businessTeam.requestAccess`, `business.requestClaim` | `profile`, `profile_type`, `kind`, `evidence_type` |
| `server_profile_claimed` | `business.decideClaim` approve (claimant's id), `artistInvites.claim`, `artistInvites.confirmEmail`, `admin.addPageOwner` | `profile`, `via` (review / invite / invite_email / admin — an admin made them owner in Admin → Users) |
| `server_invite_answered` | `artistInvites.respond` with an answer (artist in / can't · venue can host / another date / can't) | `kind` (artist / venue), `answer`, `changed`, `has_email`, `signed_in`, `member`, `has_terms`, `event_id`, `$groups` |
| `server_invite_email_confirmed` | `artistInvites.confirmEmail` ("That's me" in the answer email, first time per invite) | `kind`, `answer`, `new_account`, `owner`, `event_id`, `$groups` |
| `server_business_profile_created` | `business.create` | `profile`, `profile_type` |
| `server_profile_merged` | `business.merge` (web + MCP `merge_profiles`) | `profile` (kept), `merged_profile`, `profile_type`, `same_type`, `moved`, `$groups` |
| `server_rsvp_answered` | `rsvp.answer` (signed out → unconfirmed; signed in → confirmed at once) | `event_id`, `answer`, `signed_in`, `confirmed`, `$groups` |
| `server_rsvp_confirmed` | `rsvp.answer` signed in, folding in this browser's / magic link's unconfirmed answer | `event_id`, `answer`, `hours_to_confirm`, `$groups` |
| `server_festival_joined` | `festivalSignup.join` | `festival` |
| `server_ticket_checkout_started` | `festivalSignup.ticketCheckout`, `festivalSignup.createCheckoutSession` | `festival`, `tickets`, `referral` |
| `server_subscription_checkout_started` | `organizerSubscription.createCheckout` | `plan`, `profile_type` |
| `server_gig_applied` | `gigs.applyTo` | `gig_id`, `category`, `as_profile`, `reapplied`, `$groups` |
| `server_gig_application_decided` | `gigs.decideApplication` | `gig_id`, `category`, `decision`, `hours_to_decide` |
| `server_booking_decided` | `election.moderateBooking` (free spaces; commercial venues decide off-platform) | `booking_id`, `decision`, `hours_to_decide`, `redecided`, `free` |
| `server_inquiry_replied` | `inquiries.setStatus` (first move out of `new`) | `inquiry_id`, `status` (answered / declined), `hours_to_reply`, `profile`, `profile_type`, `$groups` |
| `server_flyer_generated` | `businessFlyers.make` / `directions` / `again` / `feed` / `fix` / `refresh` (each is an AI paint) | `event_id`, `mode`, `variant_count`, `saved_look`, `references`, `feelings`, `from_kept`, `$groups` |
| `server_flyer_kept` | `businessFlyers.keep` | `event_id`, `mode`, `post_kind`, `new_look`, `$groups` |
| `server_caption_written` | `businessFlyers.writeCaption`, `businessPosts.writeCaption` / `writeCaptions` | `event_id`, `language`, `scope` (event / post / plan), `count`, `failed`, `post_kind`, `$groups` |
| `server_post_proposed` | `businessPosts.propose` (content plan) | `event_id`, `added`, `total`, `is_festival`, `$groups` |
| `server_promo_kit_opened` | `referral.promoKit` | `event_id`, `profile_type`, `manager`, `has_link`, `has_flyer`, `painting`, `language`, `$groups` |
| `server_venue_ask_sent` / `server_venue_ask_booked` / `server_venue_ask_unbooked` | `venueAsks.ask` / `book` / `unbook` | `event_id`, `venue`, `updated`, `guests`, `needs_count`, `venue_managed`, `has_offer`, `plan_items` (ask only), `$groups` |
| `server_checked_in` | `attendance.checkIn` (door, organiser's id) | `event_id`, `is_festival`, `$groups` |
| `server_site_saved` | `businessSite.save`, `businessSite.restore` (not when nothing changed) | `profile`, `profile_type`, `first_save`, `sections`, `locales`, `restored`, `$groups` |
| `server_instagram_connected` | `/api/meta/instagram/callback` (Meta's redirect, account saved) | `profile`, `profile_type`, `accounts_granted`, `$groups` |
| `server_instagram_disconnected` | `instagram.disconnect` | `profile`, `profile_type`, `$groups` |
| `server_instagram_post_published` | `instagram.publishPost` | `event_id`, `post_kind`, `format`, `to` (feed / story), `profile`, `$groups` |
| `server_community_group_submitted` | `communityGroup.submit` (a dancer shares a local group) | `city`, `platform`, `duplicate` |
| `server_community_group_reviewed` | `communityGroup.review` (a city admin approves / declines) | `city`, `platform`, `decision` (approved / rejected), `hours_to_review` |
| `server_city_schedule_published` | `citySchedule.publishInstagram` / `publishTelegram` | `city`, `to` (instagram_feed / instagram_story / telegram), `events`, `channels`, `with_picture`, `$groups` |
| `server_city_admin_added` | `cityChannels.addAdmin` (Admin → Cities) | `city`, `role`, `$groups` |
| `server_weekend_shared` | `weekend.share` (new link only; web "Share my weekend" + MCP `share_my_weekend`) | `events`, `replaced_previous` |
| `server_weekend_joined` | `weekend.join` (a friend's first "I'm in" on a party) | `signed_in`, `coming`, `friends` |
| `server_weekend_join_confirmed` | `weekend.join` signed in with a guest token (the magic link came back; guest joins folded into the account) | `parties`, `hours_to_confirm` |
| `server_member_role_set` | `businessTeam.setRole` (role actually changed) | `profile`, `profile_type`, `from_role`, `role`, `self`, `$groups` |
| `server_mcp_tool_called` | every MCP tool call (`server/mcp/server.ts` `callTool`), signed in or anonymous | `tool`, `result` (ok / error / preview / denied), `error_code`, `client_app` (chatgpt / claude / cursor / … — `server/mcp/caller.ts`; not `app`, which is the project filter), `country` (Vercel geo, ISO-2), `anonymous`, `latency_ms`, `channel: mcp` |
| `server_account_deleted` | `auth.deleteAccount` — **anonymous**, no person profile | `days_since_signup` |
| `server_ticket_purchased` | Stripe webhook `checkout.session.completed` (festival checkout; not on redelivery) · TicketTailor webhook, first of `order.created`/`order.completed` per order | `festival`, `provider` (stripe / tickettailor), `product` (ticket / social_unlock), `tickets`, `amount` (cents), `currency`, `$revenue` (major units), `$currency`, `referral`, `referral_code` (promoter tracked-link code), `discount` (cents) |
| `server_ticket_checkout_expired` | Stripe webhook `checkout.session.expired` (festival checkout) | `festival`, `provider`, `product`, `tickets`, `referral`, `referral_code` |
| `server_subscription_activated` | Stripe webhook `checkout.session.completed` (`mode=subscription`, first delivery) | `plan`, `profile_id`, `provider`, `amount` (cents), `currency`, `interval`, `$revenue`, `$currency` |
| `server_subscription_cancelled` | Stripe webhook `customer.subscription.deleted` (or `updated` → canceled), once per subscription | `plan`, `profile_id`, `provider`, `amount`, `currency`, `interval`, `reason` (Stripe enum), `days_active` |

**Groups.** PostHog group type `profile` = a business profile's username. Client:
`useTrack().group('profile', username)` on Business mode pages (`/business/network/<username>/…`,
via the posthog plugin) and on `/@handle` for its managers. Server: `...profileGroup(username)` /
`...eventGroup(ev)` (organiser, else venue) add `$groups` to events where a business profile is in
scope (event created/published, claims, flyers, captions, inquiries, team, site, venue asks,
promo kit, gig applications as a page). Use group-based insights to count organisations, not people.

Webhook events (`channel: 'webhook'`) use the buyer's dancer id as `distinct_id` (Stripe metadata;
TicketTailor by buyer-email match, else anonymous). **Revenue = sum of `$revenue` on
`server_ticket_purchased` + `server_subscription_activated`** (first period only — renewals are not
yet tracked).

**Magic-link sign-up rule** (`server/utils/magicLinkSignup.ts`): a magic-link sign-in counts as a
sign-up only when the account was created by the magic-link flow — created < 24 h ago, no `source_ref`
(migrated v4 dancers never count), no password, never email-verified, and no earlier session.
Anything else is `login_completed`.

Adding an event: snake_case, one per user intent, non-PII props, and add a row above.
