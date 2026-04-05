# Discovery — Domain Description (Delegation Canvas)

**Date/Version:** 2026-04-04
**Delegator:** Organization (see 03_Strategy.md)
**Review date:** 2026-07-04

## Purpose
**Primary Driver:** Dance event information is scattered across Facebook groups, WhatsApp chats, Instagram stories, and physical flyers. Dancers — especially newcomers — struggle to discover events and classes in their city.
**Main Requirement:** A single source where dancers find events, classes, and community in their city — accessible enough that newcomers don't need insider knowledge.

## Key Responsibilities
- Aggregate event and class information per city
- Provide search and filtering (by style, date, location)
- Create onboarding paths for newcomers
- Maintain data quality and freshness

## Customers and Deliverables
| Customer | Deliverable |
|----------|-------------|
| Dancers | Searchable, up-to-date event and class listings |
| Newcomers | Guided entry point into the local dance scene |
| Dance schools/studios | Channel to promote regular classes (future) |

## Dependencies
| Provider | What they deliver |
|----------|-------------------|
| Festival Experience domain | Festival schedule data that feeds into discovery |
| Organizers / schools | Event and class information (source data) |

## External Constraints
- GDPR compliance for user data
- Data accuracy depends on community or organizer input — no authoritative central source exists
- Bootstrapped budget

## Key Challenges
- Cold start: no content without organizers, no organizers without dancers
- Keeping listings current — events are time-sensitive
- Competing with the habit of checking Facebook/WhatsApp

## Key Resources
- WeDance platform (existing codebase)
- Community connections in the dance scene
- Festival Experience domain as initial content source

## Delegator Responsibilities
- Set priorities between Discovery and other domains
- Secure partnerships with initial data sources
- Allocate development resources

## Competencies, Qualities, and Skills
- Understanding of the dance community and how dancers find events today
- UX design for search and onboarding
- Data management and content curation

## Key Metrics and Monitoring

| Metric | How Measured | Frequency | Measured By |
|--------|-------------|-----------|-------------|
| Events listed per city | Platform count | Monthly | Operations |
| Dancer sign-ups | Registration count | Weekly | Operations |
| Newcomer retention | % returning within 30 days | Monthly | Operations |

## Evaluation Schedule
Quarterly review aligned with organizational strategy review (next: 2026-07-04).
