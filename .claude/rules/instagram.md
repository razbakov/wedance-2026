---
paths:
  - "server/utils/instagram/**"
  - "server/utils/meta/**"
  - "server/api/meta/**"
  - "server/trpc/routers/{instagram,eventImport}*.ts"
  - "**/{rehostImage,BusinessInstagram,BusinessContentPlan,EventImportedNotice}*"
  - "scripts/backfill-instagram-profiles.ts"
---

# Instagram: profile import, event from a post, Meta connection

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
"I have a post" start on `/business/events/new`, both → `eventImport.fromInstagram`
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

