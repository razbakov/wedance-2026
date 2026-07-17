---
title: "The Floor Votes"
type: Story
id: G803
page: "— (governance / free-OpenAir commons)"
audience: Member
p: G803
cuj: "C8 — Member — Belong & connect (community, trust)"
jtbd: "J6 — Run a great event / throw a great night"
status: not-built
wsjf_business_value: 5
wsjf_time_criticality: 2
wsjf_risk_opportunity: 3
wsjf_job_size: 8
wsjf: 1.25
source: "Non-landing. Ported from governance issue razbakov/wedance-2026#60."
---

As a community member, I want to vote for the candidate whose guidelines I support, so that the winning proposal becomes the space's active rules — and I want the ballot to be openly verifiable, so the community trusts the result.

## Acceptance Criteria
- Only eligible dancers (real profile; one vote per election) can vote.
- Every vote is recorded with a **timestamp** and is **attributable to the voter** — this is an **open ballot** by design.
- The results view shows each vote with its timestamp. The voter's **profile link is visible only to logged-in members**; anonymous/public visitors see the vote and timestamp but no linked profile.
- A voter can **change their vote until the election closes**; every change is written as an **immutable history entry** (previous choice → new choice, with timestamp). Votes are never silently overwritten.
- Any member can verify their own — or a friend's — **current vote and its full change history**, so "is my vote still X?" is answerable.
- When the election closes, the tally uses the **latest vote per voter**; the winner's guidelines become the active ruleset (feeds G804).

## Design note — open ballot (deliberate)
Chosen: an **always-open, verifiable ledger** (no secret-ballot mode). The trade is explicit — transparency makes the *count* trustworthy (no silent flips, no unnoticed stuffing, friends can audit each other) at the cost of making the *choice* coercible (in a tight community, others can see how you voted). Accepted for this **low-stakes, unpaid community-moderator** role, where buy-in and auditability outweigh ballot secrecy, and it aligns with the Agora liquid-democracy model. The "profile only for logged-in users" rule is an **anti-scraping privacy floor, not a coercion defense** (coercers are logged-in members). If a future space needs secrecy, that's a separate story, not this one.
