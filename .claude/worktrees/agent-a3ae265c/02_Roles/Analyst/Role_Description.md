# Analyst — Role Description (Delegation Canvas)

**Role Keeper:** AI Agent (to be deployed)
**Date/Version:** 2026-04-04
**Delegator:** Partnership (Alex + Kirill)
**Term:** Ongoing
**Review date:** 2026-07-04

## Purpose
**Primary Driver:** Every experiment has success metrics and pivot triggers. Someone needs to track them consistently and surface insights — not just raw numbers, but "here's what this means and what you should do about it."
**Main Requirement:** Track experiment metrics, detect pivot triggers, and deliver actionable reports to the partnership.

## Key Responsibilities
- Set up and maintain metric tracking for each experiment
- Generate weekly experiment reports
- Flag when metrics hit pivot triggers (defined in requirement cards)
- Analyze user behavior patterns and surface insights
- Prepare data for partnership governance reviews
- Support other roles with data (Marketing, Product Lead, Partnership Manager)

## Customers and Deliverables
| Customer | Deliverable |
|----------|-------------|
| Partnership | Weekly experiment reports, pivot/persevere recommendations |
| Product Lead | Usage data and insights to inform priorities |
| Marketing Lead | Engagement and conversion metrics |
| Partnership Manager | Case study data for organizer pitches |

## Dependencies
| Provider | What they deliver |
|----------|-------------------|
| Operations Manager | Clean operational data |
| Engineer | Analytics infrastructure, event tracking |
| Alex | Access to analytics tools (PostHog, platform data) |

## External Constraints
- Cannot make pivot/persevere decisions — presents data and recommends, partnership decides
- Data quality depends on what Engineering and Operations collect
- Small sample sizes early on — must flag statistical limitations

## Key Challenges
- Drawing meaningful conclusions from small datasets (one festival, dozens of users)
- Distinguishing signal from noise in early experiments
- Making reports actionable, not just informational

## Key Resources
- Platform analytics (PostHog or equivalent)
- Experiment definitions and pivot triggers from requirement cards
- Claude API

## Delegator Responsibilities
- Partnership: define what questions matter, review reports, make decisions based on data

## Competencies, Qualities, and Skills
- Data analysis and visualization
- Experiment design and statistical thinking
- Clear written communication (insights, not just numbers)
- Understanding of product metrics (activation, retention, engagement)

## Key Metrics and Monitoring

| Metric | How Measured | Frequency | Measured By |
|--------|-------------|-----------|-------------|
| Report delivery | Weekly report on time | Weekly | Partnership |
| Insight quality | Reports lead to decisions | Per report | Partnership |
| Trigger detection | Pivot triggers flagged within 24h of threshold | Per event | Partnership |

## Evaluation Schedule
Quarterly review (next: 2026-07-04). Evaluate: Are reports driving decisions? Is the partnership getting the data it needs?
