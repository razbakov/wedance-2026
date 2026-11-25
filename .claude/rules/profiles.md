---
paths:
  - "**/{mergeProfiles,profileDupes,handles,handleRegistry,handle,deleteProfile}*.ts"
  - "server/trpc/routers/business.ts"
  - "**/{BusinessDuplicates,BusinessHandle,BusinessDeletePage}.vue"
  - "scripts/merge-duplicate-profiles.ts"
  - "scripts/*handles*.ts"
  - "shared/utils/serviceAreas.ts"
  - "server/utils/serviceAreas.ts"
---

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

## Service area (RAZ-1083)

An artist page keeps one home city (`city` / `city_slug`) and a list of other cities they play in:
`profiles.service_areas` (`{ slug, name }[]`, migration 0081, `shared/utils/serviceAreas.ts`). They are listed in
the home city and in each of those cities: `/cities/[city]/artists`, `entity.cityDirectory`, MCP `list_artists`,
and the `/artists` city filter. Venues and organisers are not. The home city is not stored again in the list.
Set it on Business → the page (artists only), or with `service_areas` on `update_business_profile` /
`update_listed_profile`. A merge unions both lists and drops the kept page’s home city (`unionServiceAreas`).
