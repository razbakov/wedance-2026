---
title: "Ticket On Page"
type: Story
id: P309
page: /my-plan
audience: Traveler
p: P309
cuj: "C4 — Traveler — Plan your festival year (festivals, tickets, travel)"
jtbd: "J4 — Plan and afford my dance travel"
status: built
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 5
wsjf: 3.6
source: "Ticket — buy on the festival page (WeDance is the ticketing platform)"
---

As a traveler, I want each festival track in my plan to point me to where I buy the ticket, so that I can complete my booking on the festival page.

## Acceptance Criteria
- Each festival track on My Plan shows its ticket status. ✓
- I can go from a festival track to the festival page to buy the ticket. ✓
- Once I have a ticket, the track reflects that it's booked. ✓

## Implementation
- **Location:** `app/pages/my-plan.vue`, track function (line 368–461)
- **Ticket track** renders status: "Bought" (when ticketBought=true), "Early-bird ends in Xd", "From €XXX", or "Not bought"
- **Action link:** `/festivals/{slug}#tickets` points to festival's ticket purchasing section on WeDance
- **Toggle:** Manual "Mark done" / "Undo" button in expanded track detail
- **State persistence:** localStorage via progressStore (survives page refreshes)
