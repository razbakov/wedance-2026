---
title: "🐞 Datenschutz is not an English word. I don't understand"
type: Bug
id: RAZ-189
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["user-report"]
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-09-23T08:21:39.074Z
started: "2026-09-23T08:31:37.047Z"
completed: "2026-10-08T22:36:51.546Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/122"]
linear_url: https://linear.app/alosha/issue/RAZ-189/datenschutz-is-not-an-english-word-i-dont-understand
exported: 2026-10-09
---

# RAZ-189 — 🐞 Datenschutz is not an English word. I don't understand

Datenschutz is not an English word. I don't understand

---

**Reported by:** Anonymous visitor · not signed in
**Page:** [https://2026.wedance.vip/](<https://2026.wedance.vip/>)
**Route:** `/`
**Environment:** UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 · viewport 1512×740 · screen 1512×982 · dpr 2 · lang en-US · tz Europe/Berlin · online · build 7f8ebb1

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Relations

- related ← RAZ-162 One Events Feed
- duplicate ← RAZ-190 🐞 Datenschutz is not an English word. I don't understand it.

## Links

- [fix: localize legal page URLs to English (RAZ-189)](https://github.com/razbakov/wedance-2026/pull/122)

## Comments

### Aleksey Razbakov · 2026-09-23 08:39 UTC

**Dispatched → PR opened.** https://github.com/razbakov/wedance-2026/pull/90

Footer legal link labels translated to English in `app/components/SiteFooter.vue` — Datenschutz → Privacy Policy, Impressum → Imprint, AGB → Terms. The hrefs (`/datenschutz`, `/impressum`, `/agb`) are unchanged and still point at the German legal pages; only the labels changed, so no legal-document text was touched. Fixed at class level (all three labels), not just the one reported.

**Bug confirmed live:** `https://2026.wedance.vip/` currently serves `Datenschutz`, `Impressum` and `AGB` to English visitors.

**Verification status for the merge gate — read before merging:**

- **Check 6 (deploy) is NOT satisfied.** The Vercel preview `https://wedance-2026-git-razbakovaleksey-raz-189-datensc-f99b3c-wedance.vercel.app` returns HTTP 200 but serves **Vercel's login page** (`<title>Login – Vercel</title>`), not the app — deployment protection is on. A 200 here is not evidence. The "Privacy Policy"/"Terms" strings present in that response are Vercel's own footer, not ours. The dispatching agent reported only a `localhost:3001` check; no preview was verified by anyone.
- **Check 1 (CI): one red status — `Vercel – app` failure.** This is **pre-existing**: the same check also fails on `main`. `Vercel – wedance-2026` (the real project) deployed successfully. CodeRabbit passed.
- **Check 5 (PR conventions):** the PR body shipped with a `🤖 Generated with Claude Code` attribution line, which the Commander's standing rule forbids. Removed by the dispatcher; body now clean, no Test plan section, `Fixes RAZ-189` present.
- The S3 body on this issue is still capture-only (Tension only). Driver · Requirement · Response Options need completing before the merge gate can rule on check 4.

Issue stays **In Progress**. Not merged — merge authority is Architect's.

### Aleksey Razbakov · 2026-09-23 08:59 UTC

**Actual:**
Page /datenschutz url is still in German.
page header is "Datenschutz"

**Expected:**
It should be localized

### Aleksey Razbakov · 2026-09-23 09:45 UTC

**Re-dispatched → PR #90 extended.** https://github.com/razbakov/wedance-2026/pull/90

Picked up after the Commander's clarification ("Page /datenschutz url is still in German, page header is 'Datenschutz' → should be localized"). New commit `64ca14d` *localize legal page headers and titles to English* on branch `razbakovaleksey/raz-189-datenschutz-is-not-an-english-word-i-dont-understand`.

**What changed** (verified by `git diff`, not by agent report):
- `app/pages/datenschutz.vue` — `<h1>` Datenschutz → Privacy Policy; `<title>` WeDance — Datenschutz → Privacy Policy
- `app/pages/impressum.vue` — Impressum → Imprint (header + title)
- `app/pages/agb.vue` — AGB → Terms (header + title)
- `app/components/SiteFooter.vue` — footer link labels (from the first pass, `917aede`)

**Reserved class — not triggered.** All three legal pages are PLACEHOLDERs with no substantive legal body text; only headers, `<title>`s and draft-warning copy changed. No privacy-policy or terms wording was written or machine-translated.

---

**For the merge gate — three things are NOT satisfied. Do not read this as ready.**

1. **Check 6 (deploy) — BLOCKED, not passing.** I fetched the preview myself:
   `https://wedance-2026-git-razbakovaleksey-raz-189-datensc-f99b3c-wedance.vercel.app/datenschutz`
   returns **HTTP 200 with `<title>Login – Vercel</title>`** — deployment protection is on. The two "Privacy Policy" strings in that response are Vercel's own page chrome, not ours; zero of our app markup is present. A 200 here is not evidence of anything. Same wall as the first pass. This check cannot be discharged until protection is lifted or an alternative verification path exists.

2. **Check 4 (Requirement) — STOPS the merge.** The S3 body on this issue is still capture-only: Driver · Requirement · Response Options remain `— (unclarified at capture)`. Neo did not complete them. Per `consent-and-control.md`, an unclarified Requirement stops the merge.

3. **Check 3 (Commander comment) — only partly answered.** The Commander flagged *two* things: the page header **and the URL**. The header is fixed. The **URL was deliberately left German** — the PR body says "Routes remain German (/datenschutz, /impressum, /agb) for legacy compatibility", and code comments say "German for legacy; content is English". That is a defensible decision, but it was written into the PR and the source, **not answered on this issue**, and it declines half of what the Commander asked for. Architect should rule on whether that stands or the routes get renamed with redirects.

**Check 1 (CI):** pending at time of writing — CodeRabbit in review, Vercel deploying. `Vercel – app` failing is pre-existing on `main`.
**Check 5 (PR conventions):** clean — `Fixes RAZ-189` present, no Test plan section, no AI attribution.

**Minor regression worth a look:** `impressum.vue` lost its legal specificity — "an incomplete Impressum is an **Abmahnung risk under §5 DDG**" became "an incomplete imprint is **a legal risk**". That warning is aimed at whoever fills the page in; the citation was the useful part of it.

**Also on this branch and out of scope for RAZ-189:** commit `c0c6363` (merge booked events into WeeklyCalendar, delete `CityEventsSection.vue` — 36 lines removed). It predates this issue's work but it will ride in on this merge.

Issue stays **In Progress**. Not merged — merge authority is Architect's.

### Aleksey Razbakov · 2026-09-23 09:47 UTC

Addendum for Architect — two process facts from this dispatch, recorded because both will recur.

**1. Why check 4 is open may be structural, not laziness.** Neo reported it could not complete the S3 Driver · Requirement · Response Options because of *"OAuth limitations on Linear writes"* — i.e. it claims the subagent has no Linear write access. I have not verified that claim (the dispatcher clearly does have write access — this comment is proof). If it is true, then **every dispatched agent will leave check 4 open by construction**, and the merge gate will block on every PR forever. That is a capability gap worth Agent confirming and Architect ruling on, not a per-issue oversight. If it is false, it is a dispatched agent excusing unfinished work with an infrastructure story, which is the `dispatched-agent-fabricates-verification` pattern again.

**2. The preview conclusion was right; the evidence behind it was not.** Matrix reported check 6 as blocked citing *project memory* ("wedance previews are login-walled") rather than a fetch. The conclusion happens to be correct — I fetched `…-f99b3c-wedance.vercel.app/datenschutz` myself and got HTTP 200 with `<title>Login – Vercel</title>` — but a check asserted from memory is not evidence, and next time the remembered fact may be stale. Check 6's evidence must be a fetch performed in that run.

Neither changes the verdict above: PR #90 is not ready to merge.

### Aleksey Razbakov · 2026-09-28 14:42 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/90 merged by razbakov at 2026-09-23T14:46:54Z outside the gate — no merge record; flagged for Trinity's audit.

### Linear · 2026-10-01 13:22 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-01 13:33 UTC

### ✅ Done — Legal page URLs localized from German to English with 301 redirects

**Live:** https://2026.wedance.vip/privacy-policy
**PR:** https://github.com/razbakov/wedance-2026/pull/122

**Try it**
1. Open https://2026.wedance.vip
2. Scroll to the footer
3. You should see 'Imprint', 'Privacy Policy', 'Terms' linking to /imprint, /privacy-policy, /terms
4. Open https://2026.wedance.vip/datenschutz
5. You should be redirected to /privacy-policy
