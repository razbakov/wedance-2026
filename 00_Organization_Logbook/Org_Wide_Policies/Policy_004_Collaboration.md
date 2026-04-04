# Policy: Collaboration Agreements

**Date:** 2026-04-04
**Status:** Active

## Purpose
Seven AI agents and two human founders work asynchronously across a shared codebase and governance system. Without explicit collaboration protocols, agents guess instead of asking, feedback only comes from delegators, and broken agreements go unrecorded — leading to rework, blind spots, and drift.

## Intended Outcome
Agents ask for help early, give and receive peer feedback, involve affected parties in decisions, and handle exceptions transparently. Collaboration friction stays low as the team scales.

## Policy Details

### 1. Ask for Help

When an agent's task requires knowledge, artifacts, or decisions from another agent's domain:

1. **Flag it as a dependency** in the PR or backlog item — don't guess or work around it.
2. The **Coordinator** routes the request to the right agent or delegator.
3. The receiving agent either helps or declines with a reason. If declined, the requesting agent escalates to their delegator.
4. **Response time:** within the same dispatch cycle. If no response, the Coordinator flags it as a blocker.

Examples:
- Engineer needs Designer input on a UI pattern → flags dependency in PR, Coordinator dispatches Designer.
- Partnership Manager needs Analyst data for a pitch → flags in backlog item, Coordinator routes.

### 2. Peer Feedback

After each significant milestone (e.g., pilot festival, sprint completion):

1. The **Coordinator** dispatches each agent to review one other agent's recent output.
2. Each review covers:
   - What was done well
   - What could be improved
   - Suggestions for the next cycle
3. Feedback is recorded in the Coordinator's synthesis report — not buried in PRs.
4. Agents are expected to act on feedback in their next task.

**Feedback pairs rotate** each cycle so agents learn from different perspectives.

### 3. Involve Those Affected

Before dispatching work that changes shared structures (data models, APIs, governance docs, coordination rules):

1. The **Coordinator** identifies which agents are affected.
2. Affected agents are dispatched for a brief impact check: "Will this change break or block your current work?"
3. The delegator reviews impact feedback before approving the dispatch.

This does not apply to work fully contained within one agent's domain and file ownership.

### 4. Breaking Agreements

Agents should almost never break an established policy or convention unilaterally. When following a rule would cause harm or miss a time-sensitive opportunity:

1. **Flag the tension:** "Policy X says I should do Y, but in this case Y would cause [specific harm]."
2. **Escalate to delegator** with a recommendation to amend or make an exception.
3. The delegator decides whether to authorize the exception.
4. If authorized, the Coordinator records the exception and proposes a policy amendment if the situation is likely to recur.

Repeated exceptions to the same policy are a signal that the policy needs updating — not that breaking it is acceptable.

### 5. Learning from Work

After completing each task, agents include in their PR description:
- What they learned that could improve future work in this domain
- Any tensions they noticed (process friction, missing information, unclear boundaries)

The Coordinator aggregates these across agents during sprint synthesis to feed into retrospectives.

### 6. External Input (Open Systems)

When agents research competitors, market trends, or technical approaches, they should:
- Cite external sources
- Reference industry practices
- Flag when the organization would benefit from human external input (e.g., "A UX researcher could validate these wireframes with real users")

Agents draft; humans decide whether to pursue external input. Per Policy 001, no external communication without delegator approval.

## Responsibilities

| Who | What |
|-----|------|
| Each agent | Flag dependencies, participate in peer feedback, include learnings in PRs |
| Coordinator | Route help requests, organize peer feedback pairs, record exceptions, aggregate learnings |
| Delegators (Alex, Kirill) | Authorize exceptions, review impact feedback, approve external input |
| Partnership | Review this policy quarterly |

## Metrics and Monitoring

| Metric | How Monitored | Frequency |
|--------|--------------|-----------|
| Help requests resolved | Dependency flags resolved within same dispatch cycle | Per cycle |
| Peer feedback completion | All agents gave and received feedback per milestone | Per milestone |
| Unrecorded exceptions | Policy breaks that weren't flagged or recorded | Per incident |
| Learnings captured | PR descriptions include learnings section | Per PR |

---

*Review date: 2026-07-04*
