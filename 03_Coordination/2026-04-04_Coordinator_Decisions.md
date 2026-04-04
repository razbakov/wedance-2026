# Coordinator Decisions — 2026-04-04

**Context:** All 7 agents delivered their first sprint of work (PRs #1-7 merged). These decisions resolve the open blockers identified across all agents.

## Decision 1: Pilot Festival — Bavarian Bachata Congress (Munich, Oct 23-25)

**Rationale:** Score 9/10. Home city = zero travel cost, easy to attend in person, maximum control over the pilot. October gives 6 months to prepare. Bachata is Kirill's SDTV core audience.

**Fallback:** If no connection to Anna Milite (organizer), go with Dance Casa Festival (Budapest, Aug 28-30) — 4 styles, 35+ workshops = maximum scheduling pain to solve.

**Action:** Partnership Manager drafts outreach to Anna Milite for Kirill to send.

## Decision 2: Early B2C Test — Yes, Rovinj in June

Run a lightweight B2C test at Summer Bachata Festival (Rovinj, Jun 5-8) in parallel. Convert their public schedule without needing organizer permission. Low cost, high learning — real user data 4 months before the main pilot.

**Action:** Operations Manager converts Rovinj schedule once published. Engineer deploys the app with real data.

## Decision 3: Tech Stack — Nuxt 4 + TypeScript + Tailwind (confirmed)

Engineer already scaffolded the app in `app/`. No reason to change.

## Decision 4: Analytics — PostHog Cloud

Self-hosted adds ops overhead we don't need at pilot scale. Free tier covers 1M events/month — more than enough for a 200-1000 person festival.

**Action:** Engineer sets up PostHog Cloud project and instruments events per Analyst's tracking spec.

## Decision 5: App Repo Location — Monorepo under `app/`

Governance + code stay together. Simpler for now. Can split later if needed.

---

## Next Sprint (recommended dispatch order)

| Priority | Agent | Task |
|----------|-------|------|
| 1 | Partnership Mgr | Draft outreach message to Anna Milite (Bavarian Bachata Congress) for Kirill |
| 2 | Operations Mgr | Find + convert Rovinj Summer Bachata Festival schedule for early B2C test |
| 3 | Engineer | Set up PostHog Cloud + instrument the 15 events from Analyst's spec |
| 4 | Engineer | Integrate Ops Manager's real JSON schema (PR #1) into the app data model |
| 5 | Designer | Create high-fidelity Figma mockups from wireframes (pending Kirill's brand answers) |
| 6 | Marketing Lead | Customize distribution playbook for Rovinj (June) as the first real target |
