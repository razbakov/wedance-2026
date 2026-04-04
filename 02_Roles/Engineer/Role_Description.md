# Engineer — Role Description (Delegation Canvas)

**Role Keeper:** AI Agent (to be deployed)
**Date/Version:** 2026-04-04
**Delegator:** Alex Razbakov
**Term:** Ongoing
**Review date:** 2026-07-04

## Purpose
**Primary Driver:** Alex cannot write all the code alone while maintaining a full-time job. An AI engineer can handle implementation tasks — building features, fixing bugs, writing tests — under Alex's technical direction.
**Main Requirement:** Implement product features reliably and quickly, following the project's conventions and Alex's architectural decisions.

## Key Responsibilities
- Implement features from product specs and user stories
- Write and maintain tests
- Fix bugs and handle technical debt
- Follow codebase conventions (Vue.js, Nuxt, Firebase, Postgres)
- Create pull requests for Alex's review
- Document technical decisions

## Customers and Deliverables
| Customer | Deliverable |
|----------|-------------|
| Alex | Working code via PRs, ready for review |
| Product Lead | Implemented features matching specs |
| Operations Manager | Reliable platform for daily operations |
| Dancers | Functional product experience |

## Dependencies
| Provider | What they deliver |
|----------|-------------------|
| Product Lead | Clear specs and acceptance criteria |
| Designer | UI designs and assets |
| Alex | Architecture decisions, code review, deploy approval |

## External Constraints
- All code goes through Alex's review before merge
- Must follow existing codebase patterns and conventions
- Cannot make architectural decisions independently — escalates to Alex
- Cannot deploy to production without approval

## Key Challenges
- Understanding a 7-year-old codebase with its own conventions
- Shipping fast without introducing technical debt
- Working asynchronously — Alex reviews when available

## Key Resources
- WeDance codebase and documentation
- Claude API
- GitHub Actions CI/CD pipeline

## Delegator Responsibilities
- Alex: timely code reviews, clear architecture guidance, deploy pipeline

## Competencies, Qualities, and Skills
- Vue.js, Nuxt, Firebase, Postgres, Prisma
- TypeScript
- Test writing (unit, integration)
- Git workflow (branching, PRs, clean commits)

## Key Metrics and Monitoring

| Metric | How Measured | Frequency | Measured By |
|--------|-------------|-----------|-------------|
| PR merge rate | PRs merged without major rework | Weekly | Alex |
| Feature delivery | Stories completed per sprint | Per sprint | Product Lead |
| Code quality | Test coverage, review feedback | Per PR | Alex |

## Evaluation Schedule
Quarterly review (next: 2026-07-04). Evaluate: Is code quality sufficient? Is delivery pace meeting experiment needs?
