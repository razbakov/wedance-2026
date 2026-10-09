# QA Strategy — WeDance 2026

**Owner:** Forge (CTO agent) · **Stakeholder:** Alex Razbakov (Commander)
**Created:** 2026-10-09 · **Review cadence:** Quarterly
**Team maturity:** startup (solo founder + AI agents, no dedicated QA)

---

### 1. Executive Summary

WeDance 2026 is a Nuxt 3 + tRPC dance-community platform serving paying users
(festival tickets via TicketTailor/Stripe, venue bookings) and a public event feed
synced from wedance.vip (v3). It deploys to Vercel on every push to `main` with
**zero CI gates** — no GitHub Actions workflow exists. E2E tests are configured but
the feature files point outside the repo and do not exist on disk, so Playwright
has never run. Of 24 tRPC routers, 11 have unit tests (3,471 lines across 13
test files); the remaining 13 — including `booking` (touches money), `events`
(public feed), `gigs`, and `entity` — ship untested. Two stale git worktrees
inside the repo root (`wedance-checkout/`, `wedance-2026-raz-158/`) contain
duplicate test files that could confuse tooling.

This strategy prescribes a phased plan to move from "no safety net" to
"risk-proportional automated coverage" within 20 weeks, prioritized by the 8
Critical User Journeys (C1–C8) and a risk matrix that puts payment and auth
flows first.

**Objectives (measurable, with timelines):**

1. Reduce defect escape rate from unknown to < 10% within two quarters.
2. Achieve ≥ 70% unit-test coverage on CRITICAL/HIGH-risk routers by end of Phase 2.
3. Establish CI quality gates (unit + lint) on every PR by end of Phase 1.
4. Have E2E smoke coverage for the top 3 CUJs by risk by end of Phase 2.
5. Bring CI-to-green signal under 10 minutes by end of Phase 3.

---

### 2. Scope & Objectives

**In scope:**

- All 24 tRPC routers (server-side business logic)
- Stripe and TicketTailor webhook handlers (payment path)
- v3 → 2026 event/profile sync utilities
- Shared validation schemas and utility functions
- Playwright BDD E2E for critical user journeys
- Nuxt API routes under `server/api/`
- Vue composables with testable logic

**Out of scope:**

- Third-party service internals (Stripe, TicketTailor, Vercel) — tested at
  contract/mock level only
- wedance.vip (v3) codebase — sync tests validate the boundary, not v3 internals
- Mobile-specific testing (no native app)
- Load/performance testing (deferred to Phase 4; current traffic does not justify)
- Visual regression testing (deferred; no design system yet)

**Platforms:** Modern browsers (Chrome, Safari, Firefox latest). Mobile-responsive
viewport testing via Playwright.

---

### 3. Test Pyramid Analysis

#### Current state

| Level | Count | % | Frameworks |
|-------|------:|--:|-----------|
| Unit (router + utility) | 24 files, ~170 test cases | 100% | Vitest 4.1 |
| Integration (webhook handlers) | 2 files (stripe, tickettailor) | — | Vitest |
| E2E | 0 runnable | 0% | Playwright 1.58 + playwright-bdd 8.5 (configured, never runs) |
| **Total** | **~170 cases** | | |

**Shape: hourglass** — decent unit layer, near-zero integration middle (only 2
webhook tests), and an empty E2E top. The webhook tests are closer to integration
(they test HTTP handler → DB side-effects) but are colocated with unit tests and
run in the same Vitest process.

**CI duration:** N/A (no CI pipeline exists).
**Flakiness rate:** unknown (tests run only on developer machines).
**Pass rate on `main`:** needs baseline run (task in Phase 1).

#### Target state (end of Phase 4, week 20)

| Level | Target count | Target % | Run frequency |
|-------|-------------|----------|---------------|
| Unit | ~250 cases | 70–75% | Every PR (CI) |
| Integration | ~60 cases | 18–22% | Every PR (CI) |
| E2E | ~25 scenarios | 5–8% | Smoke on PR preview, full nightly |
| **Total** | **~335 cases** | **100%** | |

**Target CI duration:** < 10 min for PR gate (unit + integration + lint).
**Target flakiness:** < 5% (startup-appropriate; tighten to < 2% in Phase 4).

#### Rebalance plan

1. **Invest in the missing integration middle:** add integration tests for
   service-boundary routers (booking → DB, events → DB + sync, festivalSignup →
   TicketTailor contract).
2. **Move E2E feature files into repo** at `e2e/features/`, fix
   `playwright.config.ts` paths.
3. **Add unit tests for all untested routers**, prioritized by risk score.
4. **Keep E2E lean** — only critical journeys; resist the urge to E2E everything.

---

### 4. Risk Assessment Matrix

Impact (1–5) × Likelihood (1–5). Bands: CRITICAL 15–25, HIGH 10–14, MEDIUM 5–9, LOW 1–4.

| Feature area | CUJ | Impact | Likelihood | Score | Risk | Has tests? |
|-------------|-----|-------:|-----------:|------:|------|:----------:|
| **Stripe webhook (payment)** | C4, C7 | 5 – Catastrophic | 3 – Possible | **15** | CRIT | ✓ (181 lines) |
| **TicketTailor webhook (ticketing)** | C4, C7 | 5 – Catastrophic | 3 – Possible | **15** | CRIT | ✓ (368 lines) |
| **Booking requests** | C6 | 5 – Catastrophic | 3 – Possible | **15** | CRIT | ✗ |
| **Auth (signup, login, magic link)** | C8 | 5 – Catastrophic | 2 – Unlikely | **10** | HIGH | ✓ (831 lines) |
| **Festival signup / checkout** | C4, C7 | 4 – Major | 3 – Possible | **12** | HIGH | ✓ (469 lines) |
| **Events (public feed + v3 sync)** | C3, C4 | 4 – Major | 3 – Possible | **12** | HIGH | ✗ (sync utils tested) |
| **Gigs (artist booking)** | C5 | 4 – Major | 2 – Unlikely | **8** | MED | ✗ |
| **Entity (profiles, venues)** | C5, C6 | 3 – Moderate | 3 – Possible | **9** | MED | ✗ |
| **Profile management** | C8 | 3 – Moderate | 2 – Unlikely | **6** | MED | ✓ |
| **Plan (year plan / week plan)** | C4 | 3 – Moderate | 2 – Unlikely | **6** | MED | ✓ |
| **Review / community reviews** | C3, C8 | 2 – Minor | 3 – Possible | **6** | MED | Partial (reviewsCommunity ✓, review ✗) |
| **Referral system** | C8 | 2 – Minor | 2 – Unlikely | **4** | LOW | ✓ |
| **Claim (profile ownership)** | C5 | 2 – Minor | 2 – Unlikely | **4** | LOW | ✓ |
| **Dinner / hangouts** | C3 | 2 – Minor | 2 – Unlikely | **4** | LOW | ✓ / ✗ |
| **Election (moderator)** | C8 | 2 – Minor | 1 – Rare | **2** | LOW | ✓ |
| **Ask Locals** | C1, C4 | 1 – Negligible | 2 – Unlikely | **2** | LOW | ✗ |
| **City Video voting** | C3 | 1 – Negligible | 2 – Unlikely | **2** | LOW | ✗ |
| **Giveaway** | C8 | 1 – Negligible | 1 – Rare | **1** | LOW | ✗ |
| **Ride share** | C4 | 1 – Negligible | 2 – Unlikely | **2** | LOW | ✗ |
| **Roommate** | C4 | 1 – Negligible | 2 – Unlikely | **2** | LOW | ✗ |
| **Festival insights** | C7 | 2 – Minor | 2 – Unlikely | **4** | LOW | ✗ |
| **Community groups** | C8 | 2 – Minor | 1 – Rare | **2** | LOW | ✓ |
| **Feedback** | C8 | 1 – Negligible | 1 – Rare | **1** | LOW | ✗ |
| **Admin** | — | 3 – Moderate | 1 – Rare | **3** | LOW | ✓ |

#### Testing action by risk band

| Risk | Testing depth | Automation | Monitoring |
|------|--------------|-----------|-----------|
| **CRITICAL** | Full unit + integration + E2E smoke + manual exploratory | Mandatory, every PR | Stripe/TT webhook dashboards, error alerts |
| **HIGH** | Full unit + integration, E2E for happy path | Mandatory, every PR | Weekly error-log review |
| **MEDIUM** | Unit for happy path + key errors | Recommended | Monthly review |
| **LOW** | Unit happy path or manual-only | Optional | None |

---

### 5. Environment Strategy

| Environment | Purpose | Test types | Data | Deploy trigger |
|------------|---------|-----------|------|---------------|
| **Local** | Developer feedback | Unit, integration (Vitest) | Seeded test DB / mocks | On save (`vitest --watch`) |
| **CI (GitHub Actions)** | Automated validation | Unit, integration, lint, type-check | Ephemeral (mocked DB via test helpers) | On push / PR |
| **Vercel Preview** | Pre-production E2E | Playwright BDD smoke suite | Preview deployment with test data | On PR (Vercel auto-deploy) |
| **Production** | Monitoring | Synthetic smoke (future) | Live | On merge to `main` |

**Test data management:**

- Unit/integration tests use the existing in-memory mock pattern (test helpers
  already set up `ctx` with mock DB results).
- E2E tests against Vercel previews will use seeded test accounts (created via
  API fixtures in `e2e/steps/fixtures.ts`).
- No production data in any test environment.

---

### 6. Tool Selection Rationale

| Criteria (weight) | Vitest (unit/integration) | Playwright + BDD (E2E) | GitHub Actions (CI) |
|-------------------|:---:|:---:|:---:|
| Fits tech stack (25%) | 5 — native Vite/Nuxt | 5 — already configured | 5 — GitHub repo |
| Team familiarity (20%) | 5 — 24 test files exist | 3 — configured, never run | 4 — standard |
| Community & docs (15%) | 5 | 5 | 5 |
| CI integration (15%) | 5 | 4 | 5 |
| Maintenance cost (10%) | 5 — zero config | 3 — BDD adds a layer | 4 |
| Speed of execution (10%) | 5 — fast | 3 — browser-based | 4 |
| License cost (5%) | 5 — free | 5 — free | 5 — free for public repos |
| **Weighted total** | **4.9** | **3.9** | **4.6** |

**Decision:** Keep the existing Vitest + Playwright + playwright-bdd stack. No tool
changes needed — the gap is in CI wiring and test coverage, not tooling. Adding
GitHub Actions as the CI runner is the only new tool.

**Why not alternatives:**

- Jest: Vitest is already in use, faster, and Vite-native. No reason to switch.
- Cypress: Playwright is already configured and has better cross-browser support.
- CircleCI/GitLab CI: GitHub Actions is the natural fit for a GitHub-hosted repo.

---

### 7. CI Scaling Levers

Not applicable at current scale (< 200 tests, solo developer + agents). Revisit
when CI duration exceeds 10 minutes. Planned levers for Phase 4:

- **Vitest file parallelism:** currently `false` in config (serial execution).
  Enable once test isolation is verified — expected 2–3× speedup.
- **Playwright sharding:** `--shard=1/N` when E2E count exceeds 20 scenarios.
- **Dependency caching:** GitHub Actions `actions/cache` for `node_modules` and
  Playwright browser binaries.
- **Test impact analysis:** Vitest `--changed` on PRs, full suite on merge.

**Metric:** CI-minutes-per-PR — track from Phase 1 to detect drift early.

---

### 8. Entry/Exit Criteria

**Unit tests:**

- Entry: Code compiles (`nuxi typecheck` passes), router has defined procedures.
- Exit: Happy path + at least one error case per procedure, no `.skip`/`.todo`
  tests, coverage target met for the router's risk band.

**Integration tests:**

- Entry: Unit tests pass, database schema is current, test helpers available.
- Exit: Service boundaries tested (router → DB write → read-back), webhook
  handlers tested with realistic payloads, error paths validated.

**E2E tests:**

- Entry: Integration tests pass, Vercel preview deployed, test accounts provisioned.
- Exit: All targeted CUJ scenarios pass, no P0 defects open, page loads under 5s.

**Release (merge to `main`):**

- Entry: All CI gates pass, no CRITICAL/HIGH defects open, PR reviewed.
- Exit: Vercel production deploy succeeds, no error-rate spike in first 30 min
  (manual check until synthetic monitoring is set up).

---

### 9. Quality Gates & Definition of Done

#### PR gate (every PR) — Phase 1

- [ ] `vitest run` passes (exit 0)
- [ ] `nuxi typecheck` passes
- [ ] ESLint passes (no new errors)
- [ ] No decrease in line coverage vs. `main` (once baseline is set)
- [ ] At least one reviewer approval

#### Merge gate (merge to `main`) — Phase 2

- [ ] All PR-gate checks pass
- [ ] E2E smoke suite passes against Vercel preview URL
- [ ] Branch is rebased on `main` (no merge conflicts)

#### Deploy gate (production) — Phase 3

- [ ] Merge gate passed
- [ ] No open CRITICAL/HIGH defect issues
- [ ] Changelog entry or PR description documents user-facing changes

#### Nightly gate (scheduled) — Phase 4

- [ ] Full E2E suite passes
- [ ] Dependency vulnerability scan (`npm audit`, no critical)
- [ ] Flakiness report generated and reviewed

Every gate is enforced via GitHub Actions required status checks. A gate that can
be clicked past is documentation, not a gate.

---

### 10. Metrics & KPIs

| Metric | Definition | Target | Cadence |
|--------|-----------|--------|---------|
| **Unit coverage (CRITICAL routers)** | Lines covered / total lines for CRITICAL-band routers | ≥ 70% | Per PR |
| **Unit coverage (overall)** | Lines covered / total across all included files | ≥ 50% | Monthly |
| **Test pyramid ratio** | Unit : Integration : E2E split | 70 : 20 : 10 (±10%) | Monthly |
| **Flakiness rate** | Non-deterministic failures / total runs | < 5% | Weekly |
| **Defect escape rate** | Defects found in prod / total defects | < 10% | Per release |
| **MTTR (P0)** | Detection → fix deployed | < 8h | Per incident |
| **MTTR (P1)** | Detection → fix deployed | < 48h | Per incident |
| **CI pipeline duration (PR)** | Push → green/red signal | < 10 min | Weekly |
| **CI-minutes-per-PR** | Billed compute minutes per PR run | Flat or decreasing | Monthly |
| **Defect density** | Defects per 1,000 LOC | Decreasing trend | Monthly |
| **CUJ coverage** | CUJs with ≥ 1 E2E scenario | 3 of 8 (Phase 2) → 6 of 8 (Phase 4) | Quarterly |
| **Automation rate** | Automated test cases / total regression cases | ≥ 80% | Quarterly |
| **False positive rate** | Failures that are not real bugs / total failures | < 10% | Weekly |

**Using metrics:** Baseline all values in Phase 1. Track trends, not absolutes. A
team going from 0% → 50% coverage is a win. Review monthly; celebrate improvements.
Investigate spikes — a sudden flakiness jump signals infra, not laziness. Never use
metrics to punish.

---

### 11. Timeline & Milestones

#### Phase 1 — Foundation (Weeks 1–4) · `QA · Foundation`

| # | Task | Risk covered | Exit criteria |
|---|------|-------------|--------------|
| 1.1 | Add `.github/workflows/ci.yml`: Vitest + typecheck + lint on every PR | All | CI runs and reports on PRs |
| 1.2 | Run full Vitest suite on `main`, fix failures, establish baseline | All | `vitest run` exit 0 on `main` |
| 1.3 | Add unit tests for `booking` router (CRITICAL, 309 LOC, 0 tests) | C6 | ≥ 5 test cases, happy + error |
| 1.4 | Add unit tests for `events` router (HIGH, 104 LOC, 0 tests) | C3, C4 | ≥ 3 test cases |
| 1.5 | Fix E2E path: move feature files into `e2e/features/`, update `playwright.config.ts` | All E2E | `bddgen` succeeds |
| 1.6 | Remove stale worktrees `wedance-checkout/` and `wedance-2026-raz-158/` | Tooling hygiene | `git worktree list` shows only main |
| 1.7 | Baseline all KPIs (coverage, pass rate, CI duration) | Metrics | Values documented in this file |

**Exit:** CI runs unit tests on every PR. Baseline metrics documented. Two
CRITICAL-gap routers have tests.

#### Phase 2 — Coverage Expansion (Weeks 5–10) · `QA · Coverage`

| # | Task | Risk covered | Exit criteria |
|---|------|-------------|--------------|
| 2.1 | Unit tests for remaining untested MEDIUM+ routers: `gigs`, `entity`, `review` | C5, C6 | ≥ 3 tests each |
| 2.2 | Integration tests for booking flow (router → DB write → read-back) | C6 | End-to-end booking request lifecycle |
| 2.3 | Integration tests for events sync boundary (v3 → 2026) | C3, C4 | Sync creates/updates events correctly |
| 2.4 | E2E smoke: Festival landing (C4/C7) — Seeker finds a festival, sees ticket CTA | C4, C7 | Playwright scenario passes on preview |
| 2.5 | E2E smoke: Event discovery (C3) — Regular finds weekly socials in their city | C3 | Playwright scenario passes on preview |
| 2.6 | E2E smoke: Signup/onboarding (C8) — Member creates account, completes onboarding | C8 | Playwright scenario passes on preview |
| 2.7 | Wire E2E smoke to run on Vercel preview deployments in CI | All E2E | GitHub Actions runs Playwright post-deploy |

**Exit:** All CRITICAL/HIGH-risk routers have unit tests. Top 3 CUJs have E2E
smoke scenarios. E2E runs automatically on PR previews.

#### Phase 3 — Quality Gates (Weeks 11–14) · `QA · Gates`

| # | Task | Risk covered | Exit criteria |
|---|------|-------------|--------------|
| 3.1 | Coverage gate: PR fails if unit coverage drops below baseline | All | GitHub Actions required check |
| 3.2 | E2E gate: PR blocked if smoke suite fails on preview | CRIT/HIGH CUJs | Required status check |
| 3.3 | `npm audit` gate: fail on critical vulnerabilities | Security | Required status check |
| 3.4 | Metrics dashboard (coverage + flakiness + CI duration in PR comment) | Observability | Bot comments on every PR |
| 3.5 | Unit tests for remaining LOW-risk routers (best-effort) | LOW band | Coverage improves |

**Exit:** All four gate types (PR, merge, deploy, nightly) active and enforced.

#### Phase 4 — Optimization (Weeks 15–20) · `QA · Optimize`

| # | Task | Risk covered | Exit criteria |
|---|------|-------------|--------------|
| 4.1 | Enable Vitest file parallelism, measure speedup | CI speed | CI under 10 min confirmed |
| 4.2 | Add E2E scenarios for C1 (Seeker), C2 (Student), C5 (Pro) | Broader CUJ coverage | 6 of 8 CUJs with E2E |
| 4.3 | Flakiness triage: quarantine or fix any test with > 10% flake rate | Reliability | Flakiness < 5% |
| 4.4 | Nightly full E2E + dependency scan (scheduled GitHub Actions) | Regression | Nightly workflow runs |
| 4.5 | First quarterly strategy review — update this document | Living doc | Revision history entry |

**Exit:** CI under 10 min, flakiness under 5%, first strategy revision published.

---

### 12. CUJ → Test Coverage Map

This table maps each Critical User Journey to its current and target test
coverage. It is the primary filter for Linear sub-issues: label `qa` × `cuj:CN`.

| CUJ | Persona | Key routers | Unit today | Integration today | E2E today | Target (Phase 2) | Target (Phase 4) |
|-----|---------|------------|:----------:|:-----------------:|:---------:|:-----------------:|:-----------------:|
| C1 | Seeker | events, askLocals | ✗ | ✗ | ✗ | Unit | Unit + E2E |
| C2 | Student | events, profile, entity | Partial | ✗ | ✗ | Unit | Unit + E2E |
| C3 | Regular | events, dinner, reviewsCommunity | Partial | ✗ | ✗ | Unit + E2E smoke | Unit + Integration + E2E |
| C4 | Traveler | festival, festivalSignup, plan, events, rideShare, roommate | Partial | ✗ | ✗ | Unit + E2E smoke | Unit + Integration + E2E |
| C5 | Pro | gigs, entity, claim, profile | Partial | ✗ | ✗ | Unit | Unit + E2E |
| C6 | Host | booking, entity | ✗ | ✗ | ✗ | Unit + Integration | Unit + Integration + E2E |
| C7 | Organizer | festival, festivalSignup, festivalInsights, gigs | Partial | ✗ | ✗ | Unit + E2E smoke | Unit + Integration + E2E |
| C8 | Member | auth, profile, referral, election, communityGroup, feedback | Mostly ✓ | ✗ | ✗ | Unit + E2E smoke | Unit + Integration + E2E |

**Escaped-bug tracking:** production bugs get `Bug` + `user-report` labels in
Linear. Each escaped bug must link the test that _should_ have caught it → this
feeds the defect escape rate KPI and identifies coverage gaps.

---

### 13. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-10-09 | Forge | Initial version — baseline analysis, risk matrix, phased plan |

---

## Appendix A — Current Test Inventory

### Router unit tests (Vitest)

| File | Router | Lines | Risk band |
|------|--------|------:|-----------|
| `server/trpc/routers/admin.test.ts` | admin | 150 | LOW |
| `server/trpc/routers/auth.test.ts` | auth | 831 | HIGH |
| `server/trpc/routers/claim.test.ts` | claim | 339 | LOW |
| `server/trpc/routers/communityGroup.test.ts` | communityGroup | 156 | LOW |
| `server/trpc/routers/dinner.test.ts` | dinner | 217 | LOW |
| `server/trpc/routers/election.test.ts` | election | 157 | LOW |
| `server/trpc/routers/entityBooking.test.ts` | entityBooking (orphaned?) | 217 | — |
| `server/trpc/routers/festival.test.ts` | festival | 155 | MED |
| `server/trpc/routers/festivalSignup.test.ts` | festivalSignup | 469 | HIGH |
| `server/trpc/routers/plan.test.ts` | plan | 194 | MED |
| `server/trpc/routers/profile.test.ts` | profile | 198 | MED |
| `server/trpc/routers/referral.test.ts` | referral | 229 | LOW |
| `server/trpc/routers/reviewsCommunity.test.ts` | reviewsCommunity | 159 | MED |

### Utility and integration tests

| File | What it tests | Lines |
|------|--------------|------:|
| `server/trpc/lib/elo.test.ts` | ELO algorithm | 65 |
| `server/trpc/lib/pairSelect.test.ts` | Pair selection | 75 |
| `server/api/stripe/webhook.test.ts` | Stripe webhook handler | 181 |
| `server/api/webhooks/tickettailor.test.ts` | TicketTailor webhook | 368 |
| `server/utils/v3EventSync.test.ts` | v3 event sync | 124 |
| `server/utils/v3ProfileSync.test.ts` | v3 profile sync | 111 |
| `shared/utils/eventTime.test.ts` | Event time formatting | 42 |
| `shared/utils/festivalDateFormatter.test.ts` | Festival date formatting | 111 |
| `shared/validation/forms.test.ts` | Form validation schemas | 209 |
| `scripts/csv-parser.test.ts` | CSV parser (excluded from vitest include) | 78 |
| `app/composables/useFormValidation.test.ts` | Form validation composable | 61 |

### E2E step definitions (exist, but feature files missing)

| File | CUJ scenario |
|------|-------------|
| `e2e/steps/fixtures.ts` | Test setup |
| `e2e/steps/common.ts` | Shared steps |
| `e2e/steps/festival-landing.ts` | C4/C7 — festival discovery |
| `e2e/steps/group-dinner.ts` | C3/C6 — group dinner |

### Stale artifacts

| Path | Issue |
|------|-------|
| `wedance-checkout/` | Git worktree for branch `merge-gate-check`, prunable |
| `wedance-2026-raz-158/` | Git worktree for branch `razbakovaleksey/raz-158-booking-engine` |

Both contain duplicate test files and should be removed (Phase 1, task 1.6).

## Appendix B — Vitest Configuration

```
// vitest.config.ts
include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'app/composables/**/*.test.ts']
fileParallelism: false
env: loaded from .env
alias: #shared → ./shared/
```

Note: `scripts/csv-parser.test.ts` is not covered by the include pattern.

## Appendix C — Playwright Configuration

```
// playwright.config.ts (current — broken)
featuresRoot: '../../'  // resolves to ~/Projects/, not inside the repo
paths:
  - ../../product/meetup-planner/scenarios/festival-landing.feature  // does not exist
  - ../../product/meetup-planner/scenarios/group-dinner.feature      // does not exist
steps: ./e2e/steps/**/*.ts
baseURL: http://localhost:3000
browser: chromium only
```

**Fix (Phase 1):** Move feature files to `e2e/features/`, update `featuresRoot`
to `./e2e/features`, update `paths` accordingly.
