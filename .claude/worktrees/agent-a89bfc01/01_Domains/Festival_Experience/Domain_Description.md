# Festival Experience — Domain Description (Delegation Canvas)

**Date/Version:** 2026-04-04
**Delegator:** Organization (see 03_Strategy.md)
**Review date:** 2026-07-04

## Purpose
**Primary Driver:** Festival organizers promote the same event across multiple channels individually, with limited visibility into reach or impact. Dancers receive schedules as static images and coordinate logistics through chaotic WhatsApp groups.
**Main Requirement:** An interactive festival experience — from schedule planning to social coordination — that serves both dancers (usability) and organizers (analytics).

## Key Responsibilities
- Build and maintain interactive festival schedule functionality
- Run B2C and B2B experiments (see Requirements 002, 003)
- Provide organizer analytics (workshop demand, gender balance, attendance)
- Enable social coordination features (rides, rooms, meals, partner matching)

## Customers and Deliverables
| Customer | Deliverable |
|----------|-------------|
| Dancers | Interactive schedule, personal plan, social coordination tools |
| Festival organizers | Analytics dashboard, promotion reach, reduced support load |
| Discovery domain | Festival data that feeds into city-level discovery |

## Dependencies
| Provider | What they deliver |
|----------|-------------------|
| Festival organizers | Schedule data (B2B path) |
| Dancers / community | Schedule uploads (B2C path) |
| Discovery domain | Audience of dancers to promote festivals to |

## External Constraints
- Festival schedules are time-bound — value window is days/weeks, not months
- Organizer buy-in is not guaranteed (B2B path)
- Data quality varies between organizer-provided and community-uploaded schedules
- Bootstrapped budget — manual processes before automation

## Key Challenges
- Validating which path works first (B2C vs B2B)
- Getting the schedule live early enough before the festival (2+ weeks)
- Proving enough value that dancers prefer this over a photo of the schedule
- Bridging from B2C usage data to B2B organizer relationship

## Key Resources
- WeDance platform (existing codebase)
- Connections to at least one festival organizer for pilot
- Content from existing festival strategy documents

## Delegator Responsibilities
- Decide experiment priority and sequence
- Select pilot festival
- Review experiment results and decide pivot/persevere

## Competencies, Qualities, and Skills
- Product development (MVP mindset, experiment design)
- Festival domain knowledge (how schedules work, what organizers care about)
- Data analysis (measuring experiment outcomes)
- Community engagement (getting dancers to try it)

## Key Metrics and Monitoring

| Metric | How Measured | Frequency | Measured By |
|--------|-------------|-----------|-------------|
| Schedule opens | Unique visitors per festival | Per festival | Operations |
| Return visits | Returning users during festival | Per festival | Operations |
| Organic shares | UTM/referral tracking | Per festival | Operations |
| Organizer interest | Inbound inquiries after pilot | Post-festival | Operations |

## Evaluation Schedule
After each pilot festival — pivot or persevere. Formal domain review quarterly (next: 2026-07-04).
