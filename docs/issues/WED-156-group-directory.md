---
title: "Group Directory"
type: Story
id: WED-156
source_github: "razbakov/wedance-2026#50"
linear_url: https://linear.app/wedance/issue/WED-156
audience: All
cuj: "C8 — Member — Belong & connect (onboard, account, partners, community, trust)"
jtbd: "J3 — Never dance alone — go with people I know"
status: not-built
wsjf_business_value: 5
wsjf_time_criticality: 3
wsjf_risk_opportunity: 5
wsjf_job_size: 3
wsjf: 4.33
origin: engineering-backlog (migrated from GitHub Issues 2026-07-16)
---

> Migrated from GitHub [razbakov/wedance-2026#50](https://github.com/razbakov/wedance-2026/issues/50) · tracked in Linear **WED-156** (https://linear.app/wedance/issue/WED-156).

**Original title:** Community groups directory (WhatsApp/Telegram) for cities without events

## Tension
Cities with no WeDance events look dead, but most have active organizer WhatsApp groups. The Commander has a big list.

## Driver
Cold-start filler — surface the real local scene where we have no events yet, and a bootstrap for 'ask locals' (#3).

## Requirement
- `community_groups` table: citySlug, name, platform (whatsapp/telegram/…), inviteUrl, styles, source, verified, status.
- Import path for the Commander's existing list (CSV/seed).
- 'Local groups' section on the city page, prominent when the city has no events. Report/verified flags (invite links rot; some organizers won't want listing).

## Response Options
1. Table + bulk import + city-page block (recommended).
Related: #1, #3.
