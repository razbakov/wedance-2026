# Inter-Agent Protocol v1.0

- **Version:** 1.0
- **Last updated:** 2026-04-06
- **Status:** Active
- **Owner:** Кирилл

### Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-04-06 | 1.0 | Initial protocol: collaboration laws, interaction modes, handoff packets, confidence rules, risk tiers, event-driven routing, learning layer |

---

## Purpose

This protocol defines how agents collaborate in real time across projects, with:
- faster execution
- clearer ownership
- better routing
- higher precision
- lower coordination overhead
- stronger result quality

The goal is not to make agents talk more.
The goal is to make work move faster with less ambiguity and better outcomes.

This protocol applies to all agents and all project contexts.

---

## 1. Core Design Principles

1. Speed must not reduce precision.
2. Precision must not create unnecessary delay.
3. Every task must have one current owner at all times.
4. Agents collaborate only when collaboration materially improves the next best action.
5. Founder-visible output must be shorter than internal coordination.
6. Shared objects are the source of continuity, not agent memory alone.
7. Risk determines review depth.
8. Default to reversible actions when confidence is not high.
9. Prefer deterministic routing over open-ended multi-agent debate.
10. Low maintenance beats clever complexity.

---

## 2. Core Laws of Collaboration

### Law 1: Single Owner
Every task, lead, deal, content asset, or ops issue has exactly one current owner.

### Law 2: Minimal Necessary Collaboration
Do not involve another agent unless:
- ownership must change
- the next action is blocked
- another agent can materially improve outcome quality
- commercial, operational, or reputational risk is present
- the task crossed a true domain boundary

### Law 3: Silent Internal Routing
Agents may coordinate internally, but only the distilled actionable brief should be surfaced to the founder unless escalation is required.

### Law 4: Structured Transfer Only
All cross-agent transfers must use the shared handoff packet.

### Law 5: Context Before Specialization
Agents must first detect project context:
- Project-specific
- General / Unclear
- SDTV-default only if context is unspecified and confidence is sufficient

### Law 6: Risk-Proportional Process
The higher the risk, the stricter the review and handoff rules.

### Law 7: Object-Centered Coordination
Agents coordinate around shared objects, not around free-floating chat.

---

## 3. Shared Live Objects

Agents should coordinate through these live objects when relevant.

### 3.1 Task Card

Fields:
- Task ID, Project, Context, Goal
- Current owner, Priority, Status, Deadline
- Dependencies, Risk, Next best action
- Last update, Next handoff

### 3.2 Lead Card

Fields:
- Lead ID, Project, Segment, Origin
- Temperature, Commercial value, Urgency
- Current stage, Next stage
- Last meaningful touch, Next commercial angle
- Worth-founder-time score
- Current owner, Next handoff

### 3.3 Deal Card

Fields:
- Deal ID, Project, Account, Scope, Stage
- Revenue potential, Strategic value, Ease of conversion
- Renewal window, Upsell angle
- Proof needed before outreach
- Main blocker, Current owner, Deadline, Next handoff

### 3.4 Festival Dossier

Fields:
- Festival, Dates, Location, Contact chain
- Deal stage, Deliverables, Travel status
- Content plan, Publishing status
- Renewal angle, Risks
- Current owner, Next handoff

### 3.5 Content Asset Card

Fields:
- Asset ID, Project, Audience, Format
- Content bucket, Event phase, Business purpose
- CTA, Reuse potential, Status
- Current owner, Publish timing, Next handoff

### 3.6 Ops Brief

Fields:
- Project, Event or task
- Confirmed items, Missing items, Risks
- Current owner, Deadline, Reminder schedule, Next handoff

---

## 4. Interaction Modes

Agents may collaborate only through these modes.

### 4.1 Consult
Ask another agent for domain-specific judgment without changing ownership.
- Ownership stays with current owner.
- Consulted agent answers only the specific question asked.
- Output: recommendation, confidence, risk note, optional short rationale.

### 4.2 Handoff
Transfer ownership when the next step clearly belongs to another agent.
- Ownership changes only after handoff acceptance.
- Handoff must include current state, decision context, and expected output.
- No silent ownership loss.

**Acceptance format:**
- ACCEPTED / REJECTED
- current owner = [agent]
- next action = [short]
- timing = [short]
- If rejected: who should own it instead, what the best next route is.

### 4.3 Co-pilot
A second agent temporarily improves quality while ownership remains stable.
- Current owner stays explicit.
- Co-pilot does not create parallel authority or expand scope.

### 4.4 Review
Quality gate for high-risk or external-facing output.
- Reviewer checks against risk and quality standards.
- Reviewer does not reopen upstream work unless a material issue exists.

### 4.5 Escalation
Surface an issue to founder or Maya when risk, ambiguity, or conflict exceeds agent authority.
- Must include a recommended action, not just a problem statement.

---

## 5. Shared Handoff Packet

Every Consult, Handoff, Co-pilot, Review, or Escalation must use this structure:

```text
HANDOFF TYPE:       [Consult / Handoff / Co-pilot / Review / Escalation]
PROJECT:            [which project]
CONTEXT:            [what happened so far]
OBJECT:             [reference to shared live object if available]
GOAL:               [desired outcome]
CURRENT OWNER:      [who owns it now]
REQUESTED AGENT:    [who is being asked]
WHY NOW:            [why this interaction is needed]
WHAT IS KNOWN:      [facts]
WHAT IS MISSING:    [gaps]
EXPECTED OUTPUT:    [what the receiving agent should produce]
RISK LEVEL:         [Low / Medium / High / Critical]
CONFIDENCE:         [High / Medium / Low]
DEADLINE:           [when]
NEXT OWNER IF ACCEPTED: [who owns after transfer]
```

---

## 6. Confidence Rules

### High Confidence
- Project context is clear, next step is well supported, no major ambiguity.
- Allowed: auto-routing, auto-handoff, direct recommended action.

### Medium Confidence
- Likely correct but one key uncertainty remains.
- Allowed: handoff with note, provisional recommendation, reversible next step.

### Low Confidence
- Context unclear, object missing, multiple plausible routes exist.
- Required: clarify first, label General/Unclear, do not force SDTV, do not trigger multi-agent chain prematurely.

---

## 7. Risk Tiers and Process Depth

### Low Risk
Internal notes, non-sensitive ideation, routine scheduling.
→ Owner acts directly. Consult optional. No review required.

### Medium Risk
Lead reply, proposal draft, content for active event window, CRM change.
→ Owner acts. Consult or review if useful. Founder-visible brief if timing matters.

### High Risk
Pricing, renewal framing, public positioning, travel dependency near event, automation touching production.
→ Structured handoff if needed. Review recommended. Explicit risk note required.

### Critical Risk
Token/access issue, client promise conflict, missed deadline, public error, broken chain before event.
→ Escalate immediately. Short actionable brief to founder. One owner + one support max.

---

## 8. Event-Driven Collaboration

### Core Events
- New inbound lead
- Lead reaches Proposal Ready
- No reply after threshold
- Deal confirmed
- Event approaching
- Travel incomplete
- Footage delivered
- Content ready
- Renewal window opens
- Overdue follow-up detected
- Active initiatives > threshold
- System friction repeated 3+ times

### Event Response
Each event triggers: object update → owner confirmation → next best action → optional invoke if domain boundary crossed → founder brief only if action/escalation needed.

---

## 9. Routing Algorithm

For every incoming task or event:

1. Detect project context
2. Detect object type
3. Detect urgency and risk
4. Detect current owner, or assign one
5. Decide if another agent is needed
6. Choose interaction mode (Consult / Handoff / Co-pilot / Review / Escalation)
7. Update shared object
8. Produce founder-facing brief only if required

Default: if context is ambiguous → use General/Unclear → clarify only if ambiguity blocks quality.

---

## 10. Agent-Specific Invocation Rules

### Maya
Invoke when: ownership unclear, multiple domains active, blocked item, founder-facing prioritization needed.

### Kai
Invoke when: new relationship/lead, follow-up due, relationship memory affects next move, lead reaches Proposal Ready.

### Marco
Invoke when: commercial judgment needed, proposal framing matters, renewal logic matters, founder-time prioritization needed.

### Luna
Invoke when: content supports a deal/event/renewal/authority move, asset packaging or publishing logic needed.

### Viktor
Invoke when: repeated manual friction, technical reliability/automation can improve process, security/sync/orchestration involved.

### Sage
Invoke when: active initiatives exceed threshold, complexity creep, founder overload, false priorities driving execution.

---

## 11. Anti-Bloat Rules

1. No free-form multi-agent debate by default.
2. Maximum 2 supporting agents on a task unless Critical.
3. No circular handoffs.
4. No agent may re-open a closed handoff without a material reason.
5. No agent may broaden scope without stating what changed, why it matters, whether founder approval is needed.
6. If coordination overhead exceeds expected value, simplify immediately.

---

## 12. Stop Rules

The system must stop and simplify when:
- More than 3 active initiatives compete for founder attention
- More than 2 handoffs happen without net progress
- Context remains unclear after one clarification cycle
- Coordination cost exceeds task value
- Automation introduces more fragility than manual handling

When triggered: owner pauses chain → Maya or Sage simplifies → new path must be shorter than previous.

---

## 13. Recovery and Failure Handling

**Routing fails:** revert to previous owner or Maya, label clearly, propose corrected route.
**Confidence collapses:** pause auto-chain, mark Low, escalate or clarify, preserve object state.
**Automation fails:** invoke manual fallback, do not leave task unowned, note what broke.
**Agents disagree:** current owner proposes one recommendation. Medium risk or below → owner decides. High/Critical → escalate.

---

## 14. Fast Routing Add-on

**Low-risk tasks:**
- One owner, zero or one consult, zero founder clarification unless blocking, one recommended action in first response.

**Medium-risk tasks:**
- One owner, up to one consult or one review, founder sees only actionable brief.

**High-risk tasks:**
- One owner, one support agent, structured review before external action.

Never add more agents unless expected quality gain is real and explicit.

---

## 15. Quality Acceleration Rules

1. Default to the single best next action.
2. Use structured objects to avoid repeated re-analysis.
3. Use event triggers to reduce manual coordination.
4. Use Consult before Handoff when ownership does not need to change.
5. Use brief mode for founder-facing output.
6. Use review only where risk justifies it.
7. Prefer reversible moves when certainty is incomplete.
8. Prefer prepared templates over improvised coordination.
9. Measure routing quality, not conversation volume.

---

## 16. Golden Founder Experience Standard

The founder should feel:
- less noise
- faster clarity
- fewer dropped balls
- better next actions
- stronger decision support
- more confidence that the system is moving work, not generating work

If the system creates more communication than progress, the protocol is being violated.

---

## 17. Learning and Improvement Protocol

### Purpose
Agents must improve over time without becoming unstable, overfit, or noisy.
The system learns through controlled updates, not through uncontrolled drift.

### 17.1 Learning Trigger Events

A learning review should be triggered when:
- a lead converts or is lost
- a renewal succeeds or fails
- a post significantly outperforms or underperforms expectations
- an ops issue repeats
- a handoff fails or a routing error happens
- confidence was miscalibrated
- a repeated manual workaround appears
- the same founder correction appears 2+ times

### 17.2 Learning Note (Shared Object)

```text
PROJECT:
OBJECT:             [reference to live object if applicable]
EVENT:              [what happened]
EXPECTED RESULT:    [what should have happened]
ACTUAL RESULT:      [what actually happened]
WHAT WORKED:        [strengths]
WHAT FAILED:        [weaknesses]
ROOT CAUSE:         [why the gap exists]
CONFIDENCE BEFORE:  [High / Medium / Low]
CONFIDENCE AFTER:   [adjusted level]
REUSABLE PATTERN:   [if any — must meet promotion threshold]
RULE UPDATE NEEDED: [yes/no — what should change]
OWNER OF FOLLOW-UP: [who acts on this]
```

Learning Notes are saved to `.claude/agent-memory/<agent>/learning/`.

### 17.3 Evidence Levels

Agents must distinguish between:
- **Observation** — one data point. Log, do not generalize.
- **Pattern** — repeated signal across similar cases. Track, note conditions.
- **Rule** — validated pattern safe for reuse. Adopt after threshold met.
- **SOP** — officially adopted workflow. Requires founder approval.

Do not promote one observation directly into a system rule.

### 17.4 Memory Hierarchy

Store insights at the correct level:
- **Working Memory** — short-term active context (conversation, task)
- **Project Memory** — project-specific learning (`.claude/agent-memory/<agent>/`)
- **Pattern Library** — reusable repeated patterns (`.claude/agent-memory/<agent>/patterns/`)
- **Rules / SOP** — validated standard process (agent file or CLAUDE.md)

### 17.5 Pattern Promotion Threshold

A pattern can be promoted to a Rule only if:
- it appears at least 3 times in similar conditions
- it improves speed, quality, revenue, or reliability
- it does not create notable side effects
- the context of use is clear

### 17.6 Confidence Calibration

When an agent's confidence level was wrong, log:
- what confidence was used
- whether it was too high or too low
- what signal was missing
- how to adjust next time

Save to `.claude/agent-memory/<agent>/learning/confidence-log.md`.

### 17.7 Shadow Mode

New patterns should be tested in shadow mode before becoming rules:
- apply the new idea in parallel or on limited cases
- compare against current approach
- adopt only after evidence supports it

### 17.8 Anti-Overlearning Rule

Do not generalize too fast from:
- one client, one festival, one viral post
- one emotional founder preference
- one unusual success or failure

Default to local learning first, system-wide learning later.

### 17.9 Learning Ownership by Agent

| Agent | Learning Domain |
|-------|----------------|
| Maya | Operational frictions, routing errors, coordination gaps |
| Kai | Relationship patterns, follow-up effectiveness, lead conversion |
| Luna | Content performance, audience patterns, format effectiveness |
| Marco | Commercial patterns, renewal timing, pricing signals |
| Viktor | Automation reliability, integration failures, technical friction |
| Sage | Overload patterns, decision quality, complexity creep |

### 17.10 Founder-Facing Learning Brief

Only surface learning to the founder when it changes future action.

```text
LEARNING:           [what was learned]
WHY IT MATTERS:     [business impact]
WHAT CHANGES NOW:   [concrete change to process or behavior]
OWNER:              [who implements the change]
```
