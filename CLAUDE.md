# WeDance — S3 Organization

Dance community platform governed with Sociocracy 3.0. Two co-founders (Alex Razbakov, Kirill Korshikov) delegate operational domains to AI agents.

## Primary driver

Dance event information is scattered across Facebook groups, WhatsApp chats, Instagram stories, and physical flyers. Dancers struggle to discover events; organizers waste effort promoting across scattered channels.

## Current strategy

Test Festival Schedule first at one pilot festival. Validate that dancers will use an interactive schedule instead of static images. See `00_Organization_Logbook/03_Strategy.md`.

## Structure

Preset: numbered

- Logbook: `00_Organization_Logbook/`
- Primary driver: `00_Organization_Logbook/01_Primary_Driver_and_Requirement.md`
- Organization canvas: `00_Organization_Logbook/02_Organization_Canvas.md`
- Strategy: `00_Organization_Logbook/03_Strategy.md`
- Values: `00_Organization_Logbook/04_Values.md`
- Policies: `00_Organization_Logbook/Org_Wide_Policies/`
- Requirements: `00_Organization_Logbook/Requirements_Mapping/`
- Reviews: `00_Organization_Logbook/Reviews/`
- Domain map: `00_Organization_Logbook/Organizational_Structure/Domain_Map.md`
- Domains: `01_Domains/<Domain_Name>/`
- Domain description: `01_Domains/<Domain_Name>/Domain_Description.md`
- Domain governance backlog: `01_Domains/<Domain_Name>/Governance/Backlog/`
- Domain operations backlog: `01_Domains/<Domain_Name>/Operations/Backlog/`
- Domain metrics: `01_Domains/<Domain_Name>/Metrics/`
- Roles: `02_Roles/<Role_Name>/`
- Role description: `02_Roles/<Role_Name>/Role_Description.md`
- Coordination: `03_Coordination/`
- Work board: `03_Coordination/Work_Board.md`
- Review schedule: `03_Coordination/Review_and_Retrospective_Schedule.md`
- Agents: `.claude/agents/`
- Skills: `.claude/skills/`
- S3 Coach: use `/s3-coach` when creating or reviewing drivers, requirements, domains, roles, policies, or any S3 governance artifact. Install: `claude install-skill https://github.com/razbakov/skills/tree/main/skills/s3-coach`
- App: `app/`

Active domains: Festival Experience. Dormant: Discovery, Marketplace.

## Agents

| Agent | Reports to | Focus |
|-------|-----------|-------|
| Autopilot | Alex | Autonomous dispatch loop — dispatches agents for Ready items, updates board, reports to founders |
| Coordinator | Alex | Cross-agent status, blockers, dispatch recommendations |
| Product Lead | Alex | Specs, stories, backlog, experiment design |
| Engineer | Alex | Code, features, tests, PRs |
| Operations Manager | Alex | Schedule conversion, data, platform ops |
| Designer | Kirill | Wireframes, UI specs, design briefs |
| Partnership Manager | Kirill | Organizer research, outreach drafts, pipeline |
| Marketing Lead | Kirill | Social content, distribution, growth |
| Analyst | Partnership | Metrics, reports, pivot trigger detection |

## Policies

- **Policy 001** — AI agent boundaries: agents draft, humans send. No external comms, deploys, or spending without approval.
- **Policy 002** — Decision-making: operational (agent), tactical (delegator), strategic (partnership by consent).
- **Policy 003** — Data & privacy: GDPR, minimal collection, no selling.
- **Policy 004** — Collaboration: ask-for-help protocol, peer feedback, involve affected parties, breaking agreements, learning from work.

## Conventions

- Logbook is the source of truth for governance
- Backlog items are individual files in domain governance/operations backlog directories
- Work board (`03_Coordination/Work_Board.md`) is the single source of truth for work status — backlog files define what, the board tracks where each item stands
- Pull system: agents pull from Ready when dispatched. WIP limit: 1 item per agent. No two agents modify the same files.
- All agent work delivered via PRs
- Requirements separate purpose (driver + requirement) from intervention (experiments)
- Agents read CLAUDE.md first to find file paths — never hardcode paths
- Review dates are quarterly (next: 2026-07-04)
- Retrospectives run after each milestone or every 2-3 dispatch cycles — see review schedule
