---
title: "Free Tasters"
type: Story
id: P401
page: /
audience: Seeker
p: P401
cuj: "C1 — Seeker — Find your dance (first class / start dancing)"
jtbd: "J1 — Start dancing without feeling lost"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 8
wsjf_job_size: 3
wsjf: 7.0
source: "Seeker — Find your dance: Free taster classes. Pick by feeling, not guessing."
linear: RAZ-30
linear_state: Done
linear_closed: 2026-10-08T07:04:19.887Z
linear_prs: ["https://github.com/razbakov/wedance-2026/pull/123"]
linear_url: https://linear.app/alosha/issue/RAZ-30/free-tasters
---

As a Seeker, I want to try free taster classes and choose a dance by how it feels, so that I can pick a style I love instead of guessing from a name.

## Acceptance Criteria
- The first journey stage is labeled for someone finding their dance.
- The stage promises free taster classes as the way to try styles.
- The stage tells me I can choose by feeling rather than guessing.
- The stage points toward a way to explore styles (for example the dance-finder, marked coming soon).
- A total newcomer understands this stage is the starting point.

## Linear history — RAZ-30 (Done, 2026-10-08)

Archived from https://linear.app/alosha/issue/RAZ-30/free-tasters on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As a Seeker, I want to try free taster classes and choose a dance by how it feels, so that I can pick a style I love instead of guessing from a name.

## Acceptance Criteria

* The first journey stage is labeled for someone finding their dance.
* The stage promises free taster classes as the way to try styles.
* The stage tells me I can choose by feeling rather than guessing.
* The stage points toward a way to explore styles (for example the dance-finder, marked coming soon).
* A total newcomer understands this stage is the starting point.

---

Promise P401 · page / · audience Seeker · status **partial**
CUJ C1 — Seeker — Find your dance · JTBD J1 — Start dancing without feeling lost
WSJF 7.0 = (value 8 + time 5 + risk/opp 8) / size 3
Source: "Seeker — Find your dance: Free taster classes. Pick by feeling, not guessing."

</details>

### Relations

- related ← RAZ-145 Get Booked

### Links

- [fix: remove unreachable seeker.vue dead code (RAZ-30)](https://github.com/razbakov/wedance-2026/pull/123)

### Comments

#### Aleksey Razbakov · 2026-09-23 18:12 UTC

**Dispatched by autopilot → routed by Matrix → executed by Neo.**

PR: https://github.com/razbakov/wedance-2026/pull/96 — *RAZ-30: Free Tasters entry stage for Seekers*

Seeker journey stage now links to `/find-your-dance` and carries a "You are here" badge on desktop (mobile already had one), so the entry point reads as the starting point on both viewports. 2 files changed, +171/−1.

**Verified by the dispatcher, not taken on the agent's word:**
- PR #96 is `OPEN`, head `30b78067e1774dc6734dc9fb99cdab27e9d90df5`, branch `razbakovaleksey/raz-30-free-tasters` — confirmed via `gh pr view`.
- PR body carries summary + acceptance criteria + issue reference, no Test plan section.

⚠️ **Merge-gate check 6 (deploy) is blocked, not passing.** The branch preview returns `HTTP 302 → vercel.com/sso-api` — Vercel deployment protection, confirmed by independent `curl` from the dispatcher. It cannot be fetched anonymously, so "preview returns 200 with the expected content" cannot currently be evidenced for this or any wedance-2026 branch. Architect must not treat this check as green; it needs either preview protection relaxed or a manual authenticated verification.

Issue stays **In Progress** — the PR is the review signal. Merge authority is Architect's under the seven-check gate; the dispatcher does not merge and does not set Done.

#### Aleksey Razbakov · 2026-09-23 18:41 UTC

**Correction / addition to my previous comment** — found while verifying the neighbouring RAZ-145 branch, so it belongs here too.

PR #96 adds `app/pages/seeker.vue` (165 lines), but **nothing links to it.** The Seeker journey card's `href` was changed to `/find-your-dance`, and `app/pages/find-your-dance.vue` already existed on `main`. The only reference to `/seeker` anywhere on the branch is the docblock inside `seeker.vue` itself:

```
$ git grep -n "/seeker" origin/razbakovaleksey/raz-30-free-tasters -- app
app/pages/seeker.vue:3:  * /seeker — The first journey stage for Seekers
```

So the PR's load-bearing change is the two-line href swap plus the "You are here" badge; the new page is unreachable dead code. Not a broken link — `/find-your-dance` resolves — but 165 lines shipping with no route into them.

For Architect at the merge gate: this is worth a decision rather than a silent merge. Either wire the Seeker stage to `/seeker` and drop `find-your-dance.vue`, or drop `seeker.vue` and keep the existing page. Shipping both leaves two competing onboarding pages, which is the kind of duplication that quietly rots.

My earlier comment on this issue stands otherwise — the branch, PR, and SHA are real and verified; only the deploy check is blocked by Vercel SSO.

#### Aleksey Razbakov · 2026-09-28 14:42 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/96 merged by razbakov at 2026-09-24T06:06:40Z outside the gate — no merge record; flagged for Trinity's audit.

#### Linear · 2026-10-01 13:22 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-01 13:38 UTC

### ✅ Done — Removed unreachable seeker.vue dead code

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/123

Nothing to try — internal change (Dead code cleanup — removed an orphan page file that nothing linked to).

#### ↳ reply · Messi · 2026-10-08 07:02 UTC

what RAZ can I find the issues on my-plan dashboard ?

#### ↳ reply · Forge · 2026-10-08 07:04 UTC

### 💬 Answer — RAZ-75 'One Dashboard' is the /my-plan dashboard issue

RAZ-75 — 'One Dashboard' (Backlog, CUJ C4, aud:Dancer, landing-audit). It covers the /my-plan signed-out state: showing picks, partners, tickets, one next step, plus sign-in/join CTA. Related: RAZ-29 (Auto-Fill Plan, Done), RAZ-125 (Plan the Year, Backlog), RAZ-238 (my-plan backend sync, In Review).
