---
name: hi
description: Morning sync — pull repo, show what's new, surface anything needing founder attention
user_invocable: true
---

# /hi — What needs my attention?

Quick inbox check for the founder. Sync the repo, scan for changes, and surface action items.

## Workflow

### Step 1: Sync repo

```bash
git pull --rebase origin main
```

If there are conflicts, report them and stop.

### Step 2: What's new since last visit

Run `git log --oneline --since="3 days ago"` to find recent commits. Summarize who did what — group by author or agent.

If there are open PRs, list them:
```bash
gh pr list --state open
```

### Step 3: Check the work board

Read `03_Coordination/Work_Board.md` and report:
- Items assigned to Alex or requiring founder decision
- Items in "In Review" waiting for approval
- Items in "Ready" that need dispatching
- Any blockers that need unblocking

### Step 4: Check for pending governance

Scan `01_Domains/*/Governance/Backlog/` and `00_Organization_Logbook/` for recent changes (last 7 days) that may need founder review or consent.

### Step 5: Summary

Present a concise summary in this format:

```
## Good morning

**Repo**: up to date / X new commits
**PRs**: X open
**Board**: X items need your attention
**Governance**: X items pending

### Action items
1. [most important thing]
2. [next thing]
3. ...
```

Keep it short. Lead with what needs a decision. Skip sections with nothing to report.
