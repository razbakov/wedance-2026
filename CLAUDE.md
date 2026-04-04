# WeDance — S3 Organization

Dance community platform governed with Sociocracy 3.0. Two co-founders (Alex Razbakov, Kirill Korshikov) delegate operational domains to AI agents.

## Primary driver

Dance event information is scattered across Facebook groups, WhatsApp chats, Instagram stories, and physical flyers. Dancers struggle to discover events; organizers waste effort promoting across scattered channels.

## Current strategy

Test Festival Schedule first at one pilot festival. Validate that dancers will use an interactive schedule instead of static images. See `00_Organization_Logbook/03_Strategy.md`.

## Structure

- `00_Organization_Logbook/` — governance: driver, canvas, strategy, values, policies, requirements
- `01_Domains/` — Festival Experience (active), Discovery (dormant), Marketplace (dormant)
- `02_Roles/` — founder + agent role descriptions
- `03_Coordination/` — meeting records
- `.claude/agents/` — AI agent definitions (8 agents)

## Agents

| Agent | Reports to | Focus |
|-------|-----------|-------|
| Coordinator | Alex | Cross-agent status, blockers, dispatch recommendations |
| Product Lead | Alex | Specs, stories, backlog, experiment design |
| Engineer | Alex | Code, features, tests, PRs |
| Operations Manager | Alex | Schedule conversion, data, platform ops |
| Designer | Kirill | Wireframes, UI specs, design briefs |
| Partnership Manager | Kirill | Organizer research, outreach drafts, pipeline |
| Marketing Lead | Kirill | Social content, distribution, growth |
| Analyst | Partnership | Metrics, reports, pivot trigger detection |

## Policies

All agents follow `00_Organization_Logbook/Org_Wide_Policies/`:
- **Policy 001** — AI agent boundaries: agents draft, humans send. No external comms, deploys, or spending without approval.
- **Policy 002** — Decision-making: operational (agent), tactical (delegator), strategic (partnership by consent).
- **Policy 003** — Data & privacy: GDPR, minimal collection, no selling.

## Conventions

- Logbook is the source of truth for governance
- Backlog items are individual files in `Governance/Backlog/` or `Operations/Backlog/`
- All agent work delivered via PRs
- Requirements separate purpose (driver + requirement) from intervention (experiments)
- Review dates are quarterly (next: 2026-07-04)
