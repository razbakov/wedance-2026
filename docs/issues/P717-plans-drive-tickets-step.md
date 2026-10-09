---
title: "Plans Drive Tickets"
type: Story
id: P717
page: /organizers
audience: Organizer
p: P717
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 5
wsjf: 3.6
source: "Plans drive tickets — Smart recommendations guide dancers to the right pass."
linear: RAZ-149
linear_state: Done
linear_closed: 2026-10-08T06:37:44.206Z
linear_prs: []
linear_url: https://linear.app/alosha/issue/RAZ-149/plans-drive-tickets
---

As an organizer, I want dancers to be guided from their plan to the right ticket, so that more of the plans they build turn into purchases.

## Acceptance Criteria
- The third step explains that plans lead to tickets through smart recommendations.
- As a dancer builds a plan, the festival suggests a matching pass.
- The recommended pass reflects the workshops the dancer has planned.

## Linear history — RAZ-149 (Done, 2026-10-08)

Archived from https://linear.app/alosha/issue/RAZ-149/plans-drive-tickets on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As an organizer, I want dancers to be guided from their plan to the right ticket, so that more of the plans they build turn into purchases.

## Acceptance Criteria

* The third step explains that plans lead to tickets through smart recommendations.
* As a dancer builds a plan, the festival suggests a matching pass.
* The recommended pass reflects the workshops the dancer has planned.

---

Promise P717 · page /organizers · audience Organizer · status **partial**
CUJ C7 — Organizer — Run a festival (list, ticket, insights) · JTBD J6 — Run a great event / throw a great night
WSJF 3.6 = (value 8 + time 5 + risk/opp 5) / size 5
Source: "Plans drive tickets — Smart recommendations guide dancers to the right pass."

</details>

### Relations

- related → RAZ-69 Smart Ticket Picks

### Comments

#### Aleksey Razbakov · 2026-09-29 07:30 UTC

Dispatcher: PR opened at https://github.com/razbakov/wedance-2026/pull/110 (branch `razbakovaleksey/raz-149-plans-drive-tickets`, head `181a15d`). Routed Matrix → Neo. The first pass backgrounded Neo and produced nothing, so it was retried once in the foreground.

**What's in it** (checked by the dispatcher): +132/−0 across 2 files, `shared/utils/smartTicketPicks.ts` and `app/composables/useSmartTicketPicks.ts`. **No page imports either file**, so the PR has no effect on what users see. It also duplicates the utility already proposed in #109 (RAZ-69), even though the brief said not to.

**All three criteria were already met on `main` before this PR:**
- Criterion 1: `app/pages/organizers/index.vue:118`. Step 3 on main already reads "Plans drive tickets — Smart recommendations guide dancers to the right pass."
- Criteria 2–3: `app/pages/festivals/[slug].vue`. "Best value for your plan" (L1122) and "Get this pass" (L1150) are on main, and the inline recommendation is based on planned workshops. The PR does not touch this file.

**Needs a decision:** RAZ-149 looks already delivered. If so, close it and close #110 unmerged. The same question is open on RAZ-69/#109. If the tested algorithm should replace the inline logic in `[slug].vue`, that belongs in one PR (#109 or a re-scoped issue), not two.

**Checks:** CodeRabbit and Vercel statuses are green. The agent reports `bun run build` passed; the dispatcher did not re-run it. The preview is login-walled, so check 6 is blocked. The AI-attribution line has been removed from the PR body.

The issue stays In Progress. Not merged.

#### Aleksey Razbakov · 2026-09-30 01:25 UTC

Merge gate · RED · PR https://github.com/razbakov/wedance-2026/pull/110 · head 181a15d
1 CI — RED. The repo has no CI workflow. The GitHub checks are only Vercel and CodeRabbit, and CodeRabbit was rate-limited, so no review ran. On a clean worktree at 181a15d:
- the build passes;
- vitest: 114/114 tests pass, but 2 test files (admin.test.ts, dinner.test.ts) fail to load with "DATABASE_URL required for tests";
- nuxi typecheck fails on this PR's own code: useSmartTicketPicks.ts(7,58) TS2307, cannot find '~/shared/utils/smartTicketPicks' (the repo uses `#shared`).
2 Threads — RED. 2 unresolved: smartTicketPicks.ts:44 (exclude tickets that can't cover every selected workshop, P2) and :31 (require party access when the plan contains a party, P2).
3 Commander comments — green. The orchestrator read the issue comments: the only one is the dispatcher's, and there are no human Commander comments.
4 Requirement — RED. Nothing imports either new file, so the PR changes no user-visible behaviour. AC1 → organizers/index.vue:118; AC2/AC3 → festivals/[slug].vue:1122 and :1150. All of these are already on main, and both files are identical between main and head, so the PR cannot be credited with them.
5 Conventions — RED. The commit carries a "Co-Authored-By: Claude Haiku 4.5" trailer (AI attribution).
6 Deploy — BLOCKED. The preview /organizers redirects to vercel.com/login (HTTP 200, "Login – Vercel"); the expected content is not present.
7 Carve-outs — none. No money flow, legal claim, governance file or infrastructure touched.
Needed: a Commander decision. RAZ-149's criteria look already delivered on main. Recommended: close #110 unmerged and close RAZ-149 as already delivered; the utility belongs in #109 (RAZ-69), which adds the same two files and is also RED. If you'd rather re-scope, the PR needs: the import changed to #shared, both threads fixed and resolved, the capped-pass ranking fixed (smartTicketPicks.ts:55-62), a real page that uses the utility (cited per criterion), the AI trailer removed, a test run without the DATABASE_URL load failures, and a preview the gate can reach.
PR comment: https://github.com/razbakov/wedance-2026/pull/110#issuecomment-5902222881
The issue stays In Progress, pending your call.

#### Aleksey Razbakov · 2026-10-01 11:17 UTC

Merge gate · CLOSED-OUT · delivered on main · PR https://github.com/razbakov/wedance-2026/pull/110 (head 181a15d) closed unmerged as superseded
The gate checked this itself instead of asking the Commander. Every Requirement item is met on main 51e7bda (main Vercel status: success):
- AC1, step 3 explains that plans lead to tickets → app/pages/organizers/index.vue:118 ("Plans drive tickets — Smart recommendations guide dancers to the right pass.")
- AC2, suggests a matching pass as the plan grows → app/pages/festivals/[slug].vue:783-869 (`recommendation`), rendered at :1110-1150 ("Get this pass")
- AC3, the pass reflects the planned workshops → computed from `planIds` → `plannedDays` / `plannedWorkshopCount` (:742-751)
Live: https://2026.wedance.vip/organizers returns 200 and contains "Plans drive tickets".
PR #110 added only files that nothing imports, duplicating #109. It is closed, not merged. Issue → Done.

#### Linear · 2026-10-01 11:30 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-01 11:31 UTC

The issue is already resolved. The latest merge gate comment (2026-10-01) confirmed all three acceptance criteria are met on `main`, closed PR #110 unmerged (it was dead code that duplicated #109), and moved the issue to Done.

Nothing to ship — RAZ-149 was already delivered on `main` before any PR was opened:
- **AC1:** `organizers/index.vue:118` — step 3 text present
- **AC2/AC3:** `festivals/[slug].vue:783-869` — recommendation logic live, driven by planned workshops
- **Live:** `2026.wedance.vip/organizers` returns 200 with "Plans drive tickets"

No further action needed.

#### ↳ reply · Messi · 2026-10-08 06:36 UTC

Check if all Criteria has been resolved

#### Aleksey Razbakov · 2026-10-08 06:37 UTC

All three acceptance criteria verified on main (bca8249):
• AC1 — organizers/index.vue:123: step 3 reads 'Plans drive tickets — Smart recommendations guide dancers to the right pass.'
• AC2 — festivals/[slug].vue:924: recommendation computed reacts to planIds, rendered at :1283–1321 ('Best value for your plan' + 'Get this pass')
• AC3 — festivals/[slug].vue:883–894: plannedDays/plannedWorkshopCount/hasPartyInPlan derived from planIds; recommendation at :927–930 uses them; UI at :1311–1312 shows coverage.
PR #110 was closed unmerged (dead code). Issue confirmed Done — nothing outstanding.

#### ↳ reply · Forge · 2026-10-08 06:37 UTC

**Summary:** All three acceptance criteria for RAZ-149 are verified as delivered on `main` (`bca8249`). The organizers page shows step 3 text, the festival page computes a smart ticket recommendation from the dancer's plan, and the UI reflects planned workshops/days. PR #110 was already closed unmerged. Issue is Done — nothing outstanding. Comment posted on the issue.
