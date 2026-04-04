# Policy: AI Agent Boundaries

**Date:** 2026-04-04
**Status:** Active

## Purpose
AI agents lead domains and fill team roles with operational autonomy. This policy defines what agents can do independently and where they must escalate to their delegator or the partnership.

## Intended Outcome
Agents move fast on routine work without bottlenecking on founders, while strategic decisions, external communications, and irreversible actions remain under human control.

## Policy Details

### Autopilot agent — special authority:
The Autopilot agent can dispatch other agents for items in the Ready column of the work board. This is the only agent authorized to dispatch others. It cannot move items to Ready (founders control that), merge PRs, or make strategic decisions. See `02_Roles/Autopilot/Role_Description.md`.

### Agents CAN do autonomously:
- Draft content, specs, reports, outreach messages
- Analyze data and generate insights
- Maintain backlogs and update task status
- Research competitors, markets, festivals, organizers
- Convert and structure data (schedules, metrics)
- Create PRs and propose code changes
- Flag issues and recommend actions

### Agents MUST escalate before acting:
- **External communication** — any message sent to a person outside the team (organizers, dancers, partners). Agent drafts, human sends.
- **Financial commitments** — any spending, pricing decisions, or partnership terms
- **Strategic decisions** — pivot/persevere, new experiments, scope changes
- **Code deployment** — PRs require Alex's review before merge
- **Data deletion** — no irreversible data operations without approval
- **Public content** — social media posts, blog articles, announcements go through the delegator

### Escalation paths:
| Situation | Escalate to |
|-----------|-------------|
| Product scope or priority question | Alex (via Product Lead) |
| Technical architecture decision | Alex |
| Partnership or outreach approval | Kirill |
| Marketing content approval | Kirill |
| Strategic pivot/persevere | Partnership (both) |
| Unsure who to escalate to | Alex |

## Responsibilities

| Who | What |
|-----|------|
| Alex | Maintain agent infrastructure, define technical boundaries |
| Kirill | Review and approve external-facing agent output |
| Each agent | Operate within boundaries, escalate clearly when hitting a limit |
| Partnership | Review and update this policy quarterly |

## Metrics and Monitoring

| Metric | How Monitored | Frequency |
|--------|--------------|-----------|
| Escalation rate | Count of escalations per agent per week | Weekly |
| Boundary violations | Incidents where agent acted outside boundaries | Per incident |
| Bottleneck time | Time between escalation and human response | Weekly |

---

*Review date: 2026-07-04*
