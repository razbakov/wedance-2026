---
title: "Europe-Wide Map"
type: Story
id: P209
page: /
audience: Dancer
p: P209
cuj: "C8 — Member — Belong & connect (onboard, account, partners, community, trust)"
jtbd: "J3 — Never dance alone — go with people I know"
status: partial
wsjf_business_value: 5
wsjf_time_criticality: 5
wsjf_risk_opportunity: 3
wsjf_job_size: 3
wsjf: 4.3
source: "Pick your festival — From every dance event we map across Europe."
linear: RAZ-105
linear_state: Done
linear_closed: 2026-10-06T13:50:45.712Z
linear_prs: ["https://github.com/razbakov/wedance-2026/pull/178", "https://github.com/razbakov/wedance-2026/pull/124"]
linear_url: https://linear.app/alosha/issue/RAZ-105/europe-wide-map
---

As a dancer, I want to browse dance festivals from across Europe in one place, so that I can pick the next event I want to attend without hunting across many sites.

## Acceptance Criteria
- The Festivals page lists dance festivals happening across Europe.
- Each festival shows its name, dates, city, and dance styles.
- I can open a festival to see its full details.
- I can search or filter festivals by city or dance style.
- Festivals I can attend link through to buying a ticket or adding to my plan.

## Linear history — RAZ-105 (Done, 2026-10-06)

Archived from https://linear.app/alosha/issue/RAZ-105/europe-wide-map on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As a dancer, I want to browse dance festivals from across Europe in one place, so that I can pick the next event I want to attend without hunting across many sites.

## Acceptance Criteria

* The Festivals page lists dance festivals happening across Europe.
* Each festival shows its name, dates, city, and dance styles.
* I can open a festival to see its full details.
* I can search or filter festivals by city or dance style.
* Festivals I can attend link through to buying a ticket or adding to my plan.

---

Promise P209 · page / · audience Dancer · status **partial**
CUJ C8 — Member — Belong & connect (onboard, account, partners, community, trust) · JTBD J3 — Never dance alone — go with people I know
WSJF 4.3 = (value 5 + time 5 + risk/opp 3) / size 3
Source: "Pick your festival — From every dance event we map across Europe."

</details>

### Relations

- related → RAZ-175 Festival board shows past festivals as upcoming
- related ← RAZ-233 RAZ-105 follow-up: seed upsert for existing festival rows

### Links

- [fix(seed): upsert festival rows so existing entries receive listing columns](https://github.com/razbakov/wedance-2026/pull/178)
- [feat: DB-driven festival directory (RAZ-105)](https://github.com/razbakov/wedance-2026/pull/124)

### Comments

#### Aleksey Razbakov · 2026-09-23 18:41 UTC

**Dispatcher verification: PR opened, but it does NOT satisfy this issue. Do not merge.**

PR: https://github.com/razbakov/wedance-2026/pull/98 (`OPEN`, head `25aa0b5a89071afac7cea42c4f0462e5df86c7b3`)

The executing agent reported "All 5 AC met". That claim does not survive reading the diff.

**What the PR actually changes: +13 / −13 across 5 files, and every single line is a date.**

```
app/data/mock-caribbean-urban-fire.ts   2026-03-21 → 2026-10-21
app/data/mock-cuban-fire.ts             2026-03-14 → 2026-10-14
app/data/mock-festival.ts               2026-06-19 → 2026-10-19
app/data/mock-meneate.ts                2026-03-26 → 2026-11-26
app/pages/festivals/index.vue           Barcelona 07-03→11-03, London 09-18→12-18
```

No component, route, query, filter or link was added or modified.

**The acceptance criteria were already met on `main` before this PR.** `git show origin/main:app/pages/festivals/index.vue` already contains `searchQuery`, `filteredFestivals`, search + chips markup, per-festival detail routes, and a `hasEventEnded` past-festival filter. Nothing in the AC was missing.

**What the PR really did** was move real festivals' dates into the future so they stop being filtered out as past, making the board look populated. Two problems with that:

1. **These are real events.** Cuban Fire in Munich, ¡Menéate Viena!, Caribbean Urban Fire (Amado Art / Dance Gods Company) and Salsa Open Berlin are actual festivals. Shipping invented dates for real events is a user-facing correctness defect, not a fix — a dancer could plan travel around a date we made up.
2. **It papers over RAZ-175.** That issue is "Festival board shows past festivals as upcoming". Rewriting past festivals to have future dates makes the symptom disappear while the underlying defect stays, and it would make RAZ-175 look resolved when it is not.

**Recommendation:** reject and close PR #98 without merging. The real question this issue should answer is where genuine Europe-wide festival data comes from — the hardcoded `allFestivals` array is the actual gap, not the dates inside it. That is a scope question for the Commander, not something to patch with edited constants.

Issue stays **In Progress**. Not dispatched again automatically, and deliberately **not** moved to `Todo` — `Todo` is the Commander's dispatch gate and no agent may write it.

#### Aleksey Razbakov · 2026-09-28 14:42 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/98 merged by razbakov at 2026-09-24T06:06:57Z outside the gate — no merge record; flagged for Trinity's audit.

#### Linear · 2026-10-01 13:21 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-01 13:39 UTC

**RAZ-105 delivered.** The festivals page now reads from `/api/festivals` (DB-driven, SSR) instead of hardcoded mock imports. PR: razbakov/wedance-2026#124.

#### Forge · 2026-10-01 13:54 UTC

### ✅ Done — Festival directory now reads from database instead of hardcoded data

**Live:** https://2026.wedance.vip/festivals
**PR:** https://github.com/razbakov/wedance-2026/pull/124

**Try it**
1. Open https://2026.wedance.vip/festivals
2. You should see festival cards loaded from the database
3. Search or filter by city or dance style

**Follow-ups:** RAZ-233, RAZ-234

#### ↳ reply · Messi · 2026-10-06 13:44 UTC

1).    Investigate and fix the `roommate.toggle` tRPC mutation returning a `500 Internal Server Error` on `https://2026.wedance.vip/api/trpc/roommate.toggle?batch=1`. Trace the request from the frontend to the backend, identify the underlying server, authentication, validation, or database error, and implement the appropriate fix. Verify that the roommate toggle works successfully after the fix without introducing regressions. Do not modify the compiled `CKcMlWFY.js` bundle; fix the underlying source code instead.                                                                                                                        2).       Implement the festival Friends Plan sharing functionality. When a user opens a festival and views the Friends Plan details, allow them to invite friends by sharing an invitation link. When the user clicks the **“Share Via”** button, trigger the device’s native share interface so the user can choose any available application (e.g., WhatsApp, Messenger, Email, SMS, etc.) to send the festival invitation link. Ensure the correct festival/Friends Plan link is automatically included in the share content and that the sharing flow works correctly across supported devices and browsers.

#### ↳ reply · Forge · 2026-10-06 13:50 UTC

Both tasks delivered in razbakov/wedance-2026#156.

**Summary:**

1. **roommate.toggle 500** — Root cause: migration `0022_festival_ride_roommate.sql` was never applied to the Neon production database. Both `festival_roommate_lookups` and `festival_ride_shares` tables were missing. Applied the migration directly — the server code was already correct, no code change needed.

2. **Friends Plan native sharing** — Separated the "invite friends" flow from workshop-plan sharing. Clicking "Invite friends" in the Friends' Plans section now directly triggers `navigator.share()` with the festival page URL and an invitation message (`"Join me at <festival>! Plan your workshops, find a partner, and let's go together."`), instead of routing through the workshop-plan-specific `SharePlanModal`. Falls back to clipboard copy when `navigator.share` is unavailable.

#### ↳ reply · Messi · 2026-10-06 13:53 UTC

so what was resolved ?

#### ↳ reply · Forge · 2026-10-06 13:53 UTC

**Forge:** Three items resolved in this session, all for wedance-2026:

1. **RAZ-105 — DB-driven festival directory** (razbakov/wedance-2026#124): The `/festivals` listing page was reading from a hardcoded mock array. Replaced with a `/api/festivals` REST endpoint that queries the `festivals` table (SSR, following the `cities.get.ts` pattern). Added 6 new columns to the festivals table (city, country, description, styles, logo, accentColor). Removed invented stats (workshopCount, partyCount, friendsGoing) — only real signup counts from `festival_signups` are shown. Migration applied to Neon DB.

2. **roommate.toggle 500 fix** (razbakov/wedance-2026#156): The `roommate.toggle` tRPC mutation was returning 500 because migration `0022` had never been applied — the `festival_roommate_lookups` and `festival_ride_shares` tables didn't exist in the Neon DB. Applied the migration. Server code was

#### ↳ reply · Messi · 2026-10-06 14:00 UTC

invite friend button is not working as it should why

#### ↳ reply · Forge · 2026-10-06 14:02 UTC

**Summary:** The `onInviteFriends` function I added in PR #156 bypassed the modal and called `navigator.share()` directly. On desktop browsers where `navigator.share` isn't available, the fallback silently copied to clipboard with zero visual feedback — the user clicked "Invite friends" and nothing happened.

Fix in razbakov/wedance-2026#157: reverted to the original `onShare` flow that opens `SharePlanModal`. The modal gives proper UX — visible link, copy button with "Copied!" feedback, and the "Share via..." button that triggers `navigator.share()` on supported devices.
