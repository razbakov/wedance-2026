---
title: "Erase My Account"
type: Story
id: WED-155
source_github: "razbakov/wedance-2026#48"
linear_url: https://linear.app/wedance/issue/WED-155
audience: All
cuj: "C8 — Member — Belong & connect (onboard, account, partners, community, trust)"
jtbd: "J7 — Trust it's real — real people, real faces, no fakes"
status: not-built
wsjf_business_value: 5
wsjf_time_criticality: 8
wsjf_risk_opportunity: 8
wsjf_job_size: 5
wsjf: 4.2
origin: engineering-backlog (migrated from GitHub Issues 2026-07-16)
---

> Migrated from GitHub [razbakov/wedance-2026#48](https://github.com/razbakov/wedance-2026/issues/48) · tracked in Linear **WED-155** (https://linear.app/wedance/issue/WED-155).

**Original title:** Account deletion (GDPR right to erasure) with FK-safe cascade

## Tension
Settings lets a dancer edit their profile and change password, but there's no way to **delete their account**. GDPR (German platform) grants a right to erasure.

## Driver
Legal requirement + user trust. Deletion is non-trivial: `dancers` is referenced by `sessions`, `cityVideos`, `festivalSignups`, `dinnerSignups`, `videoVotes` (voterDancerId) — a naive delete hits FK violations.

## Requirement
- `auth.deleteAccount` (protected): remove/anonymize the dancer and all referencing rows in FK-safe order (or null out where the row should survive, e.g. keep an approved video as anonymous).
- A 'Danger zone' in /settings with a confirm step.
- Session invalidated; user signed out.
- Documented what's hard-deleted vs anonymized.

## Response Options
1. Cascade delete in dependency order (recommended).
2. Soft-delete / anonymize (keep rows, scrub PII).

Related: #45, #46.
