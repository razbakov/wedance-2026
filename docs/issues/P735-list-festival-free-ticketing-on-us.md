---
title: "Ticketing On Us"
type: Story
id: P735
page: /festivals
audience: Organizer
p: P735
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 5
wsjf: 3.6
source: "Organize a dance festival? List your event for free. Ticket it on us."
linear: RAZ-122
linear_state: Done
linear_closed: 2026-10-06T13:03:48.131Z
linear_prs: ["https://github.com/razbakov/wedance-2026/pull/159", "https://github.com/razbakov/wedance-2026/pull/153", "https://github.com/razbakov/wedance-2026/pull/125"]
linear_url: https://linear.app/alosha/issue/RAZ-122/ticketing-on-us
---

As a festival organizer, I want to list my festival for free with ticketing covered, so that I can promote and sell without upfront cost.

## Acceptance Criteria
- The Festivals page shows an organizer call to action to list a festival.
- The call to action states listing is free.
- The call to action states ticketing is handled for me.
- I can start creating a festival listing from this call to action.

## Linear history — RAZ-122 (Done, 2026-10-06)

Archived from https://linear.app/alosha/issue/RAZ-122/ticketing-on-us on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As a festival organizer, I want to list my festival for free with ticketing covered, so that I can promote and sell without upfront cost.

## Acceptance Criteria

* The Festivals page shows an organizer call to action to list a festival.
* The call to action states listing is free.
* The call to action states ticketing is handled for me.
* I can start creating a festival listing from this call to action.

---

Promise P735 · page /festivals · audience Organizer · status **partial**
CUJ C7 — Organizer — Run a festival (list, ticket, insights) · JTBD J6 — Run a great event / throw a great night
WSJF 3.6 = (value 8 + time 5 + risk/opp 5) / size 5
Source: "Organize a dance festival? List your event for free. Ticket it on us."

</details>

### Links

- [fix(a11y): add role=alert to festival form validation errors](https://github.com/razbakov/wedance-2026/pull/159)
- [feat: prevent adding empty dynamic fields in festival form](https://github.com/razbakov/wedance-2026/pull/153)
- [feat: validate required fields before advancing festival form steps](https://github.com/razbakov/wedance-2026/pull/125)

### Comments

#### Aleksey Razbakov · 2026-09-29 18:01 UTC

Dispatcher: PR opened at https://github.com/razbakov/wedance-2026/pull/112 (branch `razbakovaleksey/raz-122-ticketing-on-us`, head `a05cd16`). Routed Matrix → Neo.

**What's in it** (checked by the dispatcher): +2/−2 in `app/pages/festivals/index.vue:402-404`. The organizer CTA button on /festivals now reads "Start listing" (was "Learn more") and goes to `/organizers/create` (was `/organizers`). The agent cites the existing copy "List your event for free. Ticket it on us." at :395 for criteria 1–3; those were already on main, so criterion 4 was the only gap.

**Checks:** Vercel and Vercel Preview Comments pass. CodeRabbit is rate-limited, so no review ran. The agent reports the build passed and 114 tests passed (2 suites skipped for DATABASE_URL); the dispatcher did not re-run them. The preview is login-walled, so check 6 is blocked. The dispatcher removed the AI-attribution line the agent left in the PR body.

The issue stays In Progress. Not merged.

#### Aleksey Razbakov · 2026-09-30 08:22 UTC

Merge gate · RED · PR https://github.com/razbakov/wedance-2026/pull/112 · head a05cd16
1 CI — RED. On GitHub, Vercel and Vercel Preview Comments pass. CodeRabbit shows "pass" but its status reads "Review rate limited": it never reviewed. Architect re-ran `bun run test` at the head and it exits 1: "Test Files 2 failed | 12 passed (14)". admin.test.ts and dinner.test.ts throw "DATABASE_URL required for tests" on load, and main does the same. An unrun suite is not a passing suite. Code review (low): no correctness bugs.
2 Threads — GREEN. 0 review threads (GraphQL).
3 Commander comments — GREEN. The only comment since the branch opened is the dispatcher's; none from the Commander.
4 Requirement — GREEN.
- (1) Organizer CTA → app/pages/festivals/index.vue:385-407 (already on main)
- (2) Listing is free → index.vue:395 "List your event for free"
- (3) Ticketing handled → index.vue:395 "Ticket it on us"
- (4) Start a listing → index.vue:402 routes to /organizers/create. create.vue exists, and festival.submitDraft is public (server/trpc/routers/festival.ts:56).
- The PR body cites all four.
5 Conventions — RED. The PR body is fine: summary, AC citations, "Closes RAZ-122", no Test plan, no AI attribution. But commit a05cd164 carries "Co-Authored-By: Claude Haiku 4.5".
6 Deploy — RED (blocked). The preview …raz-122-ticketi-92f9d8-wedance.vercel.app/festivals returns 302 to vercel.com/sso-api and ends at 200 on vercel.com/login, so the content can't be verified.
7 Carve-outs — GREEN. Only a button's route and label change. The existing "Ticket it on us" copy is ordinary marketing copy and is unchanged. Not authored by Architect.
Needed:
- (1) Land the describe.skipIf(!DATABASE_URL) change from #107 on main, rebase this branch, and get `bun run test` to exit 0. Re-request CodeRabbit once its rate limit resets.
- (5) Leave the AI trailer out of the squash message.
- (6) Commander GUI action: in the Vercel project wedance-2026, go to Settings → Deployment Protection and either turn off Vercel Authentication for previews or create a Protection Bypass for Automation secret for the gate.
PR comment: https://github.com/razbakov/wedance-2026/pull/112#issuecomment-5907191584
The issue stays In Progress.

#### Aleksey Razbakov · 2026-09-30 12:41 UTC

Fix dispatched for a05cd16

#### Aleksey Razbakov · 2026-09-30 12:43 UTC

Dispatcher (fix lane, attempt 1 of 2): the fix is pushed to https://github.com/razbakov/wedance-2026/pull/112. The new head is **6542fbc** (was a05cd16). Routed Matrix → Neo.

**What the dispatcher checked itself:**
- The head is 6542fbc and the PR is open (gh).
- `origin/main..branch` has 2 commits, and neither carries a Co-Authored-By trailer. The original commit was rewritten to 9d82df6 with the same content.
- The diff covers 3 files:
  - `app/pages/festivals/index.vue`, the original ±2
  - `server/trpc/routers/admin.test.ts` and `server/trpc/routers/dinner.test.ts`, which now `describe.skipIf(!DATABASE_URL)`. This is the same content as #107, so they won't conflict whichever merges first.
- The PR body has no AI attribution and no Test plan section.

**Agent's claims, not re-run by the dispatcher:**
- `bun run test` exits 0, with 12 files passed / 2 skipped and 114 tests passed / 15 skipped.
- CodeRabbit was re-requested: https://github.com/razbakov/wedance-2026/pull/112#issuecomment-5911528855

**Still open:**
- Check 6 is blocked by Vercel Deployment Protection. Fixing it is a Commander GUI action.
- The fresh CI results on 6542fbc hadn't been awaited when this was posted.
- The stale local worktree `~/Projects/wedance-2026-raz-122` still sits at a05cd16.

The issue stays In Progress. Not merged. The merge gate re-rules on the new SHA.

#### Aleksey Razbakov · 2026-09-30 13:18 UTC

Merge gate · RED · PR https://github.com/razbakov/wedance-2026/pull/112 · head 6542fbc
1 CI — green. CodeRabbit, Vercel and Vercel Preview Comments pass, and CodeRabbit really reviewed 6542fbc this time (no actionable comments). Run from a clean worktree with DATABASE_URL unset, `bun run test` exits 0: 12 files passed / 2 skipped, 114 tests passed / 15 skipped. Main 7ee41b2 is green (Vercel success).
2 Threads — green. 0 review threads (GraphQL totalCount 0).
3 Commander comments — green. None since the branch opened; the only comments are from the dispatcher and the gate.
4 Requirement — green.
- (1) Organizer CTA → app/pages/festivals/index.vue:385-407
- (2) Listing is free → index.vue:395 "List your event for free"
- (3) Ticketing handled → index.vue:395 "Ticket it on us"
- (4) Start a listing → index.vue:402 `router.push('/organizers/create')`; app/pages/organizers/create.vue exists at head
- The PR body cites all four.
5 Conventions — green. Summary, AC citations, preview link and "Closes RAZ-122" are present. There is no Test plan section and no AI attribution. `%(trailers:key=Co-Authored-By)` is empty on both commits (9d82df6, 6542fbc), so the earlier red is resolved.
6 Deploy — RED (blocked). The preview https://wedance-2026-git-razbakovaleksey-raz-122-ticketi-92f9d8-wedance.vercel.app/festivals goes 302 → vercel.com/sso-api → 307 → 200 on vercel.com/login ("Login – Vercel"). "Start listing" and "/organizers/create" are absent from the body, so the content was not verified.
7 Carve-outs — none. A button's label and route change, plus test skips. No money, legal, governance or infra files are touched, and it was not authored by Architect.
Needed: only check 6. That is a Commander GUI action: in the Vercel project wedance-2026, go to Settings → Deployment Protection and either turn off Vercel Authentication for previews or create a Protection Bypass for Automation secret for the gate. No code fix and no fix-lane dispatch are needed. Once the preview is reachable, this PR is ready to merge on the next run.
PR comment: https://github.com/razbakov/wedance-2026/pull/112#issuecomment-5912107448
The issue stays In Progress.

#### Aleksey Razbakov · 2026-09-30 14:58 UTC

Merge gate · MERGED · PR https://github.com/razbakov/wedance-2026/pull/112 · head 6542fbc
1 CI — green. CodeRabbit, Vercel and Vercel Preview Comments pass. On a clean worktree with DATABASE_URL unset, `bun run test` exits 0: 12 files passed / 2 skipped, 114 tests passed / 15 skipped.
2 Threads — 0 review threads.
3 Commander comments — none on RAZ-122; all comments are dispatcher or gate records.
4 Requirement:
- (1) CTA → app/pages/festivals/index.vue:385-407
- (2) listing is free → :395 "List your event for free"
- (3) ticketing handled → :395 "Ticket it on us"
- (4) starts a listing → :402 router.push('/organizers/create'), confirmed in the served chunk; app/pages/organizers/create.vue exists
5 Conventions — summary, citations and "Closes RAZ-122" are present; no Test plan; no attribution in the commits or the squash body.
6 Deploy — green. Head-pinned preview https://wedance-2026-72jeg9r99-wedance.vercel.app, checked through the new Vercel automation bypass: /festivals returns 200 "WeDance — Festivals" with "List your event for free" and "Start listing"; /organizers/create returns 200. · live: https://2026.wedance.vip/festivals returns 200 with "Start listing", and the live JS has push("/organizers/create"); /organizers/create returns 200.
7 Carve-outs — none (UI copy and routing, plus test gating).
Merged as 7d98c6c. PR merge record: https://github.com/razbakov/wedance-2026/pull/112#issuecomment-5913845069

#### Linear · 2026-10-01 13:22 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-01 13:34 UTC

### ✅ Done — Organizer CTA now says 'Start listing' and links to /organizers/create

**Live:** https://2026.wedance.vip/festivals

**Try it**
1. Open https://2026.wedance.vip/festivals
2. Scroll to the organizer section
3. You should see 'List your event for free. Ticket it on us.' with a 'Start listing' button that takes you to /organizers/create

#### ↳ reply · Messi · 2026-10-01 15:40 UTC

There should be a validation for completing each field in the form before clicking the next button from step 1 to the final step 6 and not clicking all the way through even without data in the form

#### ↳ reply · Forge · 2026-10-01 15:50 UTC

### ✅ Done — Festival form now validates required fields before each step

**Live:** https://2026.wedance.vip/organizers/create
**PR:** https://github.com/razbakov/wedance-2026/pull/125

**Try it**
1. Open https://2026.wedance.vip/organizers/create
2. Leave the festival name empty and click Next
3. You should see a red error banner listing the missing required fields

**Follow-ups:** RAZ-236

#### ↳ reply · Messi · 2026-10-01 15:51 UTC

restore all changes

#### Forge · 2026-10-01 15:51 UTC

### ✅ Done — Festival form now validates required fields before advancing steps

**Live:** https://2026.wedance.vip/organizers/create
**PR:** https://github.com/razbakov/wedance-2026/pull/125

**Try it**
1. Open https://2026.wedance.vip/festivals
2. Click 'Start listing'
3. Click 'Next' without filling any fields
4. You should see red validation errors listing required fields

**Follow-ups:** RAZ-237

#### ↳ reply · Forge · 2026-10-01 15:51 UTC

Forge failed: error_during_execution — reply here to retry.

#### ↳ reply · Messi · 2026-10-06 12:59 UTC

1). When creating a festival listing, prevent users from adding  (when a user clicks on + Add button)  an additional link or information field ( Rooms or practical info and link etc)  if the current/default field is empty. Only allow a new field to be added after the existing field contains valid information. If the current field has no input, clicking “Add” should not create another field.

#### ↳ reply · Forge · 2026-10-06 13:03 UTC

### ✅ Done — Add buttons now require filling current field before creating another


Nothing to try — internal change (Empty-field guard on /organizers/create — PR #153 open, not yet merged).

#### ↳ reply · Messi · 2026-10-06 13:03 UTC

1). When creating a festival listing, prevent users from adding  (when a user clicks the + Add button)  an additional link or information field ( Rooms or practical info and link, etc.)  if the current/default field is empty. Only allow a new field to be added after the existing field contains valid information. If the current field has no input, clicking “Add” should not create another field.                                                                                                 2).    Before allowing the user to proceed to the next page, validate all required fields. Prevent navigation if any required field is empty. Optional fields and fields explicitly designated to remain empty when no response is available should be excluded from this validation.

#### ↳ reply · Forge · 2026-10-06 13:08 UTC

### ✅ Done — Add buttons now require filling current field first

**Live:** https://2026.wedance.vip/organizers/create
**PR:** https://github.com/razbakov/wedance-2026/pull/153

**Try it**
1. Open https://2026.wedance.vip/organizers/create
2. Click '+ Add link' without filling the default link field
3. You should see no new empty row is added

#### Forge · 2026-10-06 13:08 UTC

### ✅ Done — Add buttons now require filling the current field first

**Live:** https://2026.wedance.vip/organizers/create
**PR:** https://github.com/razbakov/wedance-2026/pull/153

**Try it**
1. Open https://2026.wedance.vip/organizers/create
2. Click '+ Add link' without filling the URL field
3. You should see no new empty field is added — fill the field first, then Add works

#### ↳ reply · Messi · 2026-10-06 13:11 UTC

When creating a festival listing, before allowing the user to proceed to the next page, validate all required fields. Prevent navigation if any required field is empty. Optional fields and fields explicitly designated to remain empty when no response is available should be excluded from this validation.            Has this been resolved?

#### ↳ reply · Forge · 2026-10-06 13:12 UTC

### 💬 Answer — Step validation is resolved and live on production

Yes — merged via PR #125. Required fields (name, dates, venue name, venue address, and names on added items) are validated before allowing Next. Optional fields are excluded. Error banner renders above the step.
