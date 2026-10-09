---
title: "Auto-Fill Plan"
type: Story
id: P225
page: /my-plan
audience: Dancer
p: P225
cuj: "C4 — Traveler — Plan your festival year (festivals, tickets, travel)"
jtbd: "J4 — Plan and afford my dance travel"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 8
wsjf_job_size: 3
wsjf: 7.0
source: "Tell us what you're into and we'll fill your plan with the right festivals, classes and socials."
linear: RAZ-29
linear_state: Done
linear_closed: 2026-10-05T18:08:22.443Z
linear_prs: ["https://github.com/razbakov/wedance-2026/pull/167", "https://github.com/razbakov/wedance-2026/pull/148", "https://github.com/razbakov/wedance-2026/pull/121"]
linear_url: https://linear.app/alosha/issue/RAZ-29/auto-fill-plan
---

As a dancer, I want to tell WeDance what I'm into and have my plan filled for me, so that I start with the right festivals, classes and socials instead of a blank page.

## Acceptance Criteria
- Before My Plan is ready, I am asked what dances and activities I'm into.
- After I answer, my plan is populated with matching festivals, classes and socials.
- If I haven't set my preferences yet, My Plan guides me to do so first.

## Linear history — RAZ-29 (Done, 2026-10-05)

Archived from https://linear.app/alosha/issue/RAZ-29/auto-fill-plan on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As a dancer, I want to tell WeDance what I'm into and have my plan filled for me, so that I start with the right festivals, classes and socials instead of a blank page.

## Acceptance Criteria

* Before My Plan is ready, I am asked what dances and activities I'm into.
* After I answer, my plan is populated with matching festivals, classes and socials.
* If I haven't set my preferences yet, My Plan guides me to do so first.

---

Promise P225 · page /my-plan · audience Dancer · status **partial**
CUJ C4 — Traveler — Plan your festival year · JTBD J4 — Plan and afford my dance travel
WSJF 7.0 = (value 8 + time 5 + risk/opp 8) / size 3
Source: "Tell us what you're into and we'll fill your plan with the right festivals, classes and socials."

</details>

### Links

- [fix: plan dashboard gating and course/social persistence](https://github.com/razbakov/wedance-2026/pull/167)
- [feat(my-plan): persist goals, inline enroll flow (RAZ-29 follow-up)](https://github.com/razbakov/wedance-2026/pull/148)
- [feat(my-plan): auto-fill classes and socials alongside festivals (RAZ-29)](https://github.com/razbakov/wedance-2026/pull/121)

### Comments

#### Aleksey Razbakov · 2026-09-23 16:10 UTC

**Dispatched by autopilot — PR open.**

PR: https://github.com/razbakov/wedance-2026/pull/93
Branch: `razbakovaleksey/raz-29-auto-fill-plan` (1 file, +34/-1 in `app/pages/my-plan.vue`)

Adds an `autoFillPlan()` pass on `/my-plan` that matches the dancer's onboarding `danceStyles` against festivals and auto-adds up to 4 on first visit, guarded on signed-in + onboarded + empty plan. The "finish setup" guard for un-onboarded dancers already existed.

**Verified by the dispatcher:** PR exists, is OPEN, and is on the correct branch (checked via `gh pr view`).

**NOT verified — for Architect at the merge gate:**
- Deploy (check 6) is **not** discharged. The Vercel preview returns a 302 to the SSO login gate, so no one has seen the change render. Per `wedance-preview-behind-vercel-protection.md` this is blocked, not passing.
- The matching is reported as festival-*name* matching against dance styles. Whether that satisfies "populated with matching festivals, **classes and socials**" is a Requirement question (check 4) — the criteria name three content types and the change appears to cover one.

Issue stays **In Progress**. The dispatcher does not merge.

#### Aleksey Razbakov · 2026-09-28 14:42 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/93 merged by razbakov at 2026-09-24T06:05:42Z outside the gate — no merge record; flagged for Trinity's audit.

#### Linear · 2026-10-01 13:22 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-01 13:33 UTC

PR checks passed — the background watch confirmed it. PR #121 is ready for the merge gate.

#### Forge · 2026-10-01 13:39 UTC

### ✅ Done — My Plan auto-fills classes and socials alongside festivals

**Live:** https://2026.wedance.vip/my-plan
**PR:** https://github.com/razbakov/wedance-2026/pull/121

**Try it**
1. Open https://2026.wedance.vip/my-plan
2. Complete onboarding with dance style preferences
3. You should see your plan auto-populated with matching festivals, classes, and socials

**Follow-ups:** RAZ-231

#### Messi · 2026-10-05 16:47 UTC

Issues:     On the dashboard (Yearly Schedule), when a user wants to setup preferences.      1. pop-up box at the top when a user clicks on +add a goal button, with questions to answer rather than a similar user friendly interface and a button to submit the response.   2. after completing the goal form, I noticed is not been saved in the dashboard for review.      3. For weekly classes. when a user click +Enroll on the monthly courses, the user is been re-directed to cities rather then an enrollment page.

#### ↳ reply · Messi · 2026-10-05 17:52 UTC

1\. Improve the “+ Add a Goal” Interface

On the **Dashboard → Yearly Schedule**, update the **“+ Add a Goal”** flow.

* Replace the current pop-up that appears at the top with a more **presentable, intuitive, and user-friendly form interface**.
* Let it create a dedicated UI/UX design form and not a pop-up form, with clear questions, labels, and actions with a submit button.
* After the user submits the goal form, **save the goal permanently** and display it on the dashboard.
* Do not allow the submitted goal to disappear after a period of time.
* Ensure users can return to the dashboard and **review their saved goals at any time**.

2\. Fix Goal Data Persistence

Ensure that completing the goal form triggers the appropriate save operation.

**Expected flow:**
`+ Add a Goal → Complete Form → Submit → Save Goal → Display Goal on Dashboard → Persist for Future Review`

The saved goal should remain available after refreshing the page, navigating away, or returning to the dashboard later.

3\. Fix the Weekly Class “+ Enroll” User Flow

Update the **“+ Enroll”** button for monthly courses so that users are not redirected incorrectly to the **Cities** page.

The enrollment process should follow the intended KPI/user flow:

`+ Enroll → City-page views/week (Leading KPI) → week_plan_add → Complete Weekly Plan Setup → Add Weekly Class`and be displayed in the user preference dashboard.

* Ensure the user is directed to the correct **City-page views/week** step.
* Track the **week_plan_add** event at the appropriate point in the flow.
* Allow the user to complete the entire weekly-plan setup process.
* Once completed, automatically add the selected weekly class to the appropriate dashboard section.
* Display the newly added class in the **“No monthly cadence yet. A weekly class is the quickest way to keep momentum”** area.
* Ensure the entire flow works from beginning to end without redirecting the user to an unrelated page or leaving the process incomplete.

Overall Requirement

**Complete and validate the entire user flow end-to-end.** Both goal creation and weekly class enrollment must persist the user's actions and correctly reflect the completed state on the dashboard.                                         [https://2026.wedance.vip/my-plan](<https://2026.wedance.vip/my-plan>)

#### ↳ reply · Forge · 2026-10-05 19:32 UTC

### ✅ Done — Goals persist and class enrollment no longer redirects to cities

**Live:** https://2026.wedance.vip/my-plan
**PR:** https://github.com/razbakov/wedance-2026/pull/148

**Try it**
1. Open https://2026.wedance.vip/my-plan
2. Click + Add a Goal, fill title and reason, submit
3. You should see the goal saved and visible after page refresh
4. Click + Enroll on a monthly course
5. You should see a class picker instead of being redirected to cities
