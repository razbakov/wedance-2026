---
title: Merge gate — main only takes PRs whose tests pass
status: accepted
date: 2026-11-14
---

## Context

Every push to `main` deploys to production (Vercel). The `Test` workflow ran on
every PR, but `main` had no branch protection, so a PR with red tests could still
be merged and shipped. The end-to-end job only ran *after* merge, so it found
breaks once they were already live. Most PRs are opened and merged by agents
(`gh pr merge --squash`), usually with the owner's token, which is an admin on the
repo. RAZ-881.

The QA strategy (`docs/qa-strategy.md` §8–9) already called for "`@smoke` every
PR, full suite nightly" and for the gate to be a required GitHub check: "a gate
that can be clicked past is documentation, not a gate".

## Decision

**Branch protection on `main` with three required checks** (from
`.github/workflows/test.yml`):

| Check | What it runs | Typical time |
|---|---|---|
| `unit` | `bun run test` (vitest) with coverage | ~2 min |
| `integration` | vitest against a Postgres 17 service container, seeded | ~2 min |
| `e2e-smoke / e2e` | `nuxt build` + preview, `@smoke` BDD scenarios, design contract + a11y (`.github/workflows/e2e.yml`) | ~4 min |

The three run in parallel, so a PR is mergeable about 4 minutes after its last push.

- **Applies to admins too** (`enforce_admins: true`). Agents merge with the
  owner's admin token; without this the gate would only bind outside
  contributors. Nobody pushes to `main` directly.
- **Branches need not be up to date** (`strict: false`). Agents merge many small,
  independent PRs; requiring a rebase after every merge would cost a CI round
  each time for little gain. `main` still runs the full `Test` workflow after
  every merge, so a semantic conflict between two green PRs shows up there.
- **No required reviews.** Agents self-merge once CI is green.
- The Vercel preview build is not a required check: it is a deployment, not a
  test, and a broken build already fails `e2e-smoke`, which builds the app.

**Full E2E suite: nightly, not on PRs** (`.github/workflows/nightly.yml`,
03:00 Europe/Berlin, plus manual "Run workflow"). It runs every BDD scenario
(`@write`, `@c3`, `@c6`, `@tz`, …) against the same CI build and ephemeral
Postgres. Not a merge gate because the
write scenarios are slower and build their own fixtures; a nightly failure points
at one day's merges, which is small enough to bisect. Scenarios tagged `@fail`
are expected failures (playwright-bdd's `test.fail()`), so they keep the run green
until the bug they document is fixed. A failed scheduled run emails the person
who last changed the workflow's cron (GitHub default).

First CI run of the full suite (PR #544): 24 passed, 4 failed — the `@c3 @write`
Going scenarios in `c3-going.feature`, which had only run locally. They are real
failures to fix (RAZ-910), not a reason to shrink the suite, so the nightly
run is red until they are fixed.

## How agents merge now

```
gh pr checks <pr> --watch --fail-fast   # wait for the three required checks
gh pr merge <pr> --squash --delete-branch
```

Merging before the checks finish is refused ("required status check … is
expected"). `gh pr merge --auto --squash` would queue the merge instead, but the
repo's "Allow auto-merge" setting is off; until it is turned on, wait with
`gh pr checks --watch`.

## Consequences

- A red unit, integration or smoke run blocks the merge, for everyone.
- PRs wait ~4 minutes longer than before (smoke used to run only after merge).
- Renaming a required job in `test.yml` / `e2e.yml` silently blocks every PR
  (the old check name never reports). Rename the check in branch protection in the
  same change: `gh api -X PUT repos/razbakov/wedance-2026/branches/main/protection …`.
- A job skipped by an `if:` counts as passing for a required check — never put an
  `if:` on a required job.
- Dependabot PRs need green tests to merge, like everything else.
