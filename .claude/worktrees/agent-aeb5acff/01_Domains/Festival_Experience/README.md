# WeDance

**Mission:** Unite the global dance community and organize dance information through technology, making every dancer, artist, and organizer feel seen, supported, and empowered — no matter where they are.

**Vision:** World that is open, welcoming, and empowering for dancers and anyone who dreams of becoming one — even if they’re just taking their first step into the scene.

## Status

Hypothesis validation phase. Nuxt 4 app with backend (Neon Postgres + Drizzle + tRPC). Festival browsing, year planning, dancer discovery, and group dinner feature with DB persistence. Marketing campaign with 10 poster concepts ready. Brand system with 3 visual styles defined.

## Next Steps

- [x] Jobs to Be Done analysis for meetup-planner
- [x] User journey for meetup-planner
- [x] Story map and backlog for meetup-planner
- [x] BDD scenarios for MVP stories
- [x] Pick pilot festival and launch date — Meneate Viena, 2026-03-26
- [x] Backend infrastructure (Neon Postgres, Drizzle, tRPC)
- [x] Group dinner feature with DB persistence
- [x] Festival partnership pipeline — 15 festivals identified ([docs/festival-pipeline-2026-Q2.md](docs/festival-pipeline-2026-Q2.md))
- [ ] Build activities page for pilot festival
- [ ] Add EUR 1 Stripe payment link
- [ ] Integrate Neon Auth for real user authentication
- [ ] At Meneate: talk to 10+ dancers, collect testimonials
- [ ] Post-Meneate: compile case study, begin outreach to Tier 1 festivals
- [ ] Analyze all Notion spaces and old source code (dance car, WeDance v1, Dancito network) for reusable assets and knowledge

## Workspace

- [Strategies and user journeys](product/)
- [Brand, visual styles, logos](design/)
- [Campaigns and poster concepts](marketing/)
- [Nuxt app source code](engineering/nuxt-app/)

### Products

- [Social activities around dance festivals](product/meetup-planner/) (dancers)
- [Analytics and promotion tools](product/festival-schedule/) (organizers)

## Methodology

This workspace follows the startup-coach structure (Understand > Validate > Commit):

```
<project>/
├── README.md                           # Mission, vision, status, OKRs
├── CLAUDE.md -> README.md              # AI context symlink
├── product/                            # Strategy & planning
│   └── <product>/
│       ├── strategy.md                 # Business strategy
│       ├── jtbd.md                     # Jobs to Be Done — user research
│       ├── user-journey.md             # First user experience
│       ├── story-map.md                # Visual journey × priority map
│       ├── backlog.md                  # All stories grouped by epic
│       └── scenarios/                  # BDD feature files (playwright-bdd)
│           └── <slug>.feature
├── design/                             # Brand & visual assets
│   ├── brand.md                        # Colors, fonts, logo rules
│   ├── logos/                          # SVG + PNG variants
│   └── styles/                         # Visual style definitions
├── marketing/                          # Campaigns & content
│   └── <product>/
│       ├── campaign.md                 # Launch playbook
│       ├── content-plan.md             # Weekly content calendar
│       └── posters/                    # Poster briefs
└── engineering/                        # Application code
    ├── architecture.md                 # System architecture
    ├── decisions/                      # Architecture Decision Records
    └── <app>/                          # App source code
```

Layers: Foundation (mission/vision) > Strategy > JTBD > User Journey > Story Map > Backlog > BDD Scenarios > Brand > Marketing > Architecture > ADRs

Use `/startup-coach` to run a workspace review, advance to the next phase, or generate any of these templates:
- `strategy.md` — hypothesis, pricing, success metrics
- `jtbd.md` — jobs per persona, struggling moments, priority map
- `user-journey.md` — step-by-step flow, ASCII wireframe, aha moment
- `story-map.md` — journey columns, priority rows, release slices
- `backlog.md` — epics with problem statements, stories with acceptance criteria
- `scenario.feature` — BDD Given-When-Then with Rules and tags
- `brand.md` — colors, fonts, logo usage
- `style.md` — visual style definition
- `campaign.md` — marketing campaign playbook
- `content-plan.md` — content calendar
- `poster.md` — poster brief
- `architecture.md` — system diagram, tech choices, data model, ER diagram
- `adr.md` — architecture decision record

## Getting Started

```bash
cd engineering/nuxt-app
bun install
bun run dev
```
