---
title: "Smart Ticket Picks"
type: Story
id: P722
page: /organizers
audience: Organizer
p: P722
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 5
wsjf: 3.6
source: "Smart ticket picks — As dancers add workshops, we suggest the best-value ticket."
linear: RAZ-69
linear_state: Done
linear_closed: 2026-10-08T06:47:46.051Z
linear_prs: []
linear_url: https://linear.app/alosha/issue/RAZ-69/smart-ticket-picks
---

As an organizer, I want dancers to be shown the best-value ticket as they plan, so that they buy the right pass with less hesitation and fewer support questions.

## Acceptance Criteria
- As a dancer adds workshops to their plan, the festival suggests a best-value ticket.
- The suggested ticket matches the workshops the dancer has selected.
- The suggestion updates when the dancer adds or removes workshops.
- The organizers toolkit lists smart ticket picks as an included feature.

## Linear history — RAZ-69 (Done, 2026-10-08)

Archived from https://linear.app/alosha/issue/RAZ-69/smart-ticket-picks on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As an organizer, I want dancers to be shown the best-value ticket as they plan, so that they buy the right pass with less hesitation and fewer support questions.

## Acceptance Criteria

* As a dancer adds workshops to their plan, the festival suggests a best-value ticket.
* The suggested ticket matches the workshops the dancer has selected.
* The suggestion updates when the dancer adds or removes workshops.
* The organizers toolkit lists smart ticket picks as an included feature.

---

Promise P722 · page /organizers · audience Organizer · status **partial**
CUJ C7 — Organizer — Run a festival (list, ticket, insights) · JTBD J6 — Run a great event / throw a great night
WSJF 3.6 = (value 8 + time 5 + risk/opp 5) / size 5
Source: "Smart ticket picks — As dancers add workshops, we suggest the best-value ticket."

</details>

### Relations

- related ← RAZ-149 Plans Drive Tickets

### Comments

#### Aleksey Razbakov · 2026-09-29 06:34 UTC

Dispatcher: PR opened at https://github.com/razbakov/wedance-2026/pull/109 (branch `razbakovaleksey/raz-69-smart-ticket-picks`, head `92812c0`). Routed Matrix → Neo.

**What's in it** (checked by the dispatcher): +369/−2 across 4 files.
- `shared/utils/smartTicketPicks.ts` holds the best-value algorithm.
- `shared/utils/smartTicketPicks.test.ts` has 16 tests. The agent reports all 16 pass; the dispatcher did not re-run them.
- `app/composables/useSmartTicketPicks.ts` is a composable.
- `app/pages/for-organizers.vue` gets an "Included features" section.

**The PR mostly re-delivers what main already has:**
- **Criteria 1–3** are cited to `app/pages/festivals/[slug].vue:1100-1170`, but this PR does not touch that file. The recommendation already exists on main (`[slug].vue:736`, "Smart ticket recommendation"). The new composable is **never imported by any page**, so it has no effect on what users see.
- **Criterion 4**: `/organizers` already lists "Smart ticket picks" on main (`app/pages/organizers/index.vue:43` and `:80`). The PR edits a different page, `/for-organizers`.

**Needs a decision:** the shipped recommendation on the festival page may already meet this promise. If so, close RAZ-69 and close #109 unmerged. If the tested algorithm should replace the inline logic, re-scope the issue to "wire `suggestSmartTicket` into `[slug].vue`".

**Checks:** the Vercel preview was still deploying at report time. CodeRabbit is rate-limited, so no review ran. The preview is login-walled, so check 6 is blocked. The AI-attribution line has been removed from the PR body.

The issue stays In Progress. Not merged.

#### Aleksey Razbakov · 2026-09-30 00:22 UTC

Merge gate · RED · PR https://github.com/razbakov/wedance-2026/pull/109 · head 92812c0
1 CI — red — GitHub checks (CodeRabbit, Vercel, Preview Comments) report success, but CodeRabbit was rate-limited and did not review anything. The repo's suite at head: `vitest run shared/utils/smartTicketPicks.test.ts` gives 15 passed and 1 failed (test.ts:206 `toBeFinite` → "Invalid Chai property"). The file is not on main, so this PR introduces the failure. The PR body's "16/16 pass" claim is false.
2 Threads — red — 2 unresolved threads (chatgpt-codex-connector):
  - P1 smartTicketPicks.ts:56 — a capped pass wins on partial coverage (confirmed: with 4 workshops selected, a €50 2-workshop pass beats a €120 full pass).
  - P2 useSmartTicketPicks.ts:20 — no callers (confirmed).
3 Commander comments — green — no Commander comments on RAZ-69 since the branch opened; the only comment is the dispatcher's.
4 Requirement — red
  - AC1–3 (suggests, matches, updates) → cited to festivals/[slug].vue:1100-1170, which the PR does not touch. suggestSmartTicket and useSmartTicketPicks are imported nowhere. The composable imports `~/shared/...` (resolves to a nonexistent app/shared; the repo uses `#shared`) and uses `Ref` without importing it. The behaviour already on main is at [slug].vue:736 and :1122.
  - AC4 (organizers toolkit) → the PR edits for-organizers.vue:32, 74-93. /organizers already lists "Smart ticket picks" on main (organizers/index.vue:43, :80).
5 Conventions — red — Summary and "Fixes RAZ-69" are present, with no Test plan section. But the "Testing" section asserts a pass that does not reproduce, and commit 92812c0 carries a `Co-Authored-By: Claude` trailer.
6 Deploy — blocked — the preview /for-organizers URL returns HTTP 200 on the Vercel login page (vercel.com/login SSO), so the content cannot be verified.
7 Carve-outs — none
Needed: a Commander decision on whether main already delivers RAZ-69.
  - If it does: close RAZ-69 and close #109 unmerged.
  - If you re-scope to "wire suggestSmartTicket into [slug].vue": fix the capped-pass ranking and the toBeFinite test; use a `#shared` import and import `Ref`; wire the composable into the page; cite real lines. The preview also needs to be fetchable.
  - PR #110 (RAZ-149) adds the same shared/utils/smartTicketPicks.ts and will conflict.
PR comment: https://github.com/razbakov/wedance-2026/pull/109#issuecomment-5901579049
Issue stays In Progress.

#### Aleksey Razbakov · 2026-10-01 11:17 UTC

Merge gate · CLOSED-OUT · delivered on main · PR https://github.com/razbakov/wedance-2026/pull/109 (head 92812c0) closed unmerged as superseded
The gate checked this itself instead of asking the Commander. Every Requirement item is met on main 51e7bda (main Vercel status: success):
- AC1, suggests a best-value ticket as workshops are added → app/pages/festivals/[slug].vue:736-869 (`recommendation` computed), rendered at :1110-1150 ("Best value for your plan")
- AC2, matches the selected workshops → the recommendation is computed from `planIds` → `plannedDays` / `plannedWorkshopCount` / `hasPartyInPlan` (:742-754), and only a combo that covers every planned day is offered (:770-773)
- AC3, updates on add/remove → it is a reactive computed over `plan`, and toggleWorkshop (:105) and removeFromPlan (:159) mutate `plan`
- AC4, organizers toolkit → app/pages/organizers/index.vue:43 ("Smart ticket picks") and :80
Live: https://2026.wedance.vip/organizers returns 200 and contains "Smart ticket picks".
PR #109 added a util and a composable that nothing imports, plus a failing test. It is closed, not merged. Issue → Done.

#### Linear · 2026-10-01 11:30 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-01 11:31 UTC

This issue is already fully resolved. The last merge-gate comment (2026-10-01) confirmed:

- **AC1-3**: Smart ticket recommendation logic lives on main at `app/pages/festivals/[slug].vue:736-869` — reactive computed over the dancer's plan, updates on add/remove.
- **AC4**: "Smart ticket picks" listed on `/organizers` (main `organizers/index.vue:43, :80`), live at `https://2026.wedance.vip/organizers`.
- **PR #109** was closed unmerged (superseded — it added dead code that nothing imported).
- **Status**: Done. All four acceptance criteria verified on main `51e7bda`.

No work remaining. The agent runtime will mark the issue Done.

#### ↳ reply · Messi · 2026-10-08 06:46 UTC

Has all the criteria been resolved ?

#### Aleksey Razbakov · 2026-10-08 06:47 UTC

All four acceptance criteria verified on current main:
• AC1 suggests best-value ticket → [slug].vue:924-995 (recommendation computed) + :1281-1322 (UI)
• AC2 matches selected workshops → :883-895 (plannedDays/workshopCount/party derived from planIds) + :947-967 (coverage filter)
• AC3 updates on add/remove → reactive computed over plan Map, mutated by toggleWorkshop/:105 and removeFromPlan/:159
• AC4 organizers toolkit → organizers/index.vue:44 ('Smart ticket picks')
PR #109 was correctly closed unmerged. Issue is fully delivered — ready for Done.

#### ↳ reply · Forge · 2026-10-08 06:47 UTC

**Summary for Alex:**

All 4 acceptance criteria for RAZ-69 are verified on current main — no gaps, no work remaining:

1. **Suggests** best-value ticket as workshops are added (`[slug].vue:924-995`, rendered `:1281-1322`)
2. **Matches** selected workshops via reactive `plannedDays`/`workshopCount`/`hasPartyInPlan` (`:883-895`)
3. **Updates** on add/remove — all Vue `computed` over the reactive `plan` Map
4. **Organizers toolkit** lists "Smart ticket picks" (`organizers/index.vue:44`)

PR #109 was correctly closed unmerged. Issue is ready for Done.
