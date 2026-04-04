# WeDance — Domain Map

## Organizational Structure

```
                    ┌─────────────────────┐
                    │     Partnership      │
                    │  Alex    +    Kirill │
                    └─────────┬───────────┘
                              │ delegates by consent
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──────┐ ┌─────▼───────┐ ┌─────▼──────┐
    │   Discovery    │ │  Festival   │ │ Marketplace│
    │   (dormant)    │ │ Experience  │ │  (dormant) │
    └─────────┬──────┘ └──────┬──────┘ └────────────┘
              │               │
              │         ┌─────▼─────┐
              └────────►│  feeds    │
                        │  into     │
                        └───────────┘

    Alex's team:              Kirill's team:         Shared:
    ┌──────────────┐          ┌────────────────────┐ ┌─────────┐
    │ Product Lead │          │ Designer           │ │ Analyst │
    │ Engineer     │          │ Partnership Manager│ └─────────┘
    │ Ops Manager  │          │ Marketing Lead     │
    └──────────────┘          └────────────────────┘
```

## Domains

| Domain | Purpose | Status | Team/Roles |
|--------|---------|--------|------------|
| Festival Experience | Validate interactive festival schedule — first experiment | Active | Product Lead, Engineer, Designer, Ops Manager, Partnership Manager, Marketing Lead, Analyst |
| Discovery | Aggregate events per city — single source for dancers | Dormant | Activates after Festival Experience validation |
| Marketplace | Connect artists and venues with organizers | Dormant | Activates after Discovery |

## Roles

| Role | Keeper | Reports to | Domain(s) |
|------|--------|-----------|-----------|
| Co-Founder: Engineering & Platform | Alex | Partnership | All (governance) |
| Co-Founder: Product & Growth | Kirill | Partnership | All (governance) |
| Product Lead | AI Agent | Alex | Festival Experience |
| Engineer | AI Agent | Alex | Festival Experience |
| Operations Manager | AI Agent | Alex | Festival Experience |
| Designer | AI Agent | Kirill | Festival Experience |
| Partnership Manager | AI Agent | Kirill | Festival Experience |
| Marketing Lead | AI Agent | Kirill | Festival Experience |
| Analyst | AI Agent | Partnership | Festival Experience |

## Dependencies

| From | To | What |
|------|----|------|
| Partnership Manager | Product Lead | Organizer feedback and requirements |
| Product Lead | Engineer | Specs and user stories |
| Product Lead | Designer | Feature briefs |
| Designer | Engineer | UI designs and assets |
| Kirill / Partnership Manager | Operations Manager | Source schedule materials |
| Operations Manager | Analyst | Clean operational data |
| Analyst | Product Lead | Usage insights for prioritization |
| Analyst | Marketing Lead | Engagement and conversion metrics |
| Analyst | Partnership Manager | Case study data |
| Marketing Lead | Designer | Visual asset requests |
| Festival Experience | Discovery | Festival data seeds city-level discovery (future) |

## Coordination Mechanism

| Mechanism | Participants | Frequency | Purpose |
|-----------|-------------|-----------|---------|
| Partnership sync | Alex + Kirill | Weekly | Strategic decisions, review agent output, unblock issues |
| Agent standup | All agents → their delegator | Daily (async) | Status update: done, doing, blocked |
| Experiment review | Partnership + Analyst | Per festival | Review metrics, decide pivot/persevere |
| Quarterly governance review | Partnership + all agents | Quarterly | Review domains, roles, policies, strategy |

### Communication channels:
- **Async (default):** Agents report via structured logs/messages. Founders review when available.
- **Sync (when needed):** Partnership weekly call. Ad-hoc calls for urgent escalations.
- **Agent-to-agent:** Agents coordinate directly on operational handoffs (e.g., Ops Manager → Analyst). No human approval needed for data handoffs within boundaries.

---

*Review date: 2026-07-04*
