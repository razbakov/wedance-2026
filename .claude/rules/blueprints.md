---
paths:
  - "app/lib/blueprint*.ts"
  - "app/pages/docs/blueprints/**"
  - "app/pages/meet/**"
  - "app/components/MeetMatches.vue"
  - "app/pages/business/events/**"
  - "app/pages/ask/**"
  - "app/pages/confirm/**"
  - "server/utils/meetMatchNotify.ts"
  - "server/utils/reviewAsk.ts"
  - "server/api/cron/**"
  - "scripts/check-blueprint-issues.ts"
---

# Service blueprints stay with the code (RAZ-1072)

Seven journeys, one file each, drawn at `/docs/blueprints/*`:

| File | Job | Route |
| --- | --- | --- |
| `app/lib/blueprint-first-class.ts` | J1 | `/docs/blueprints/first-class` |
| `app/lib/blueprint-keep-progressing.ts` | J2 | `/docs/blueprints/keep-progressing` |
| `app/lib/blueprint-meet-friends.ts` | J3 | `/docs/blueprints/meet-friends` |
| `app/lib/blueprint-festival-travel.ts` | J4 | `/docs/blueprints/festival-travel` |
| `app/lib/blueprint-artist-booking.ts` | J5 | `/docs/blueprints/artist-booking` |
| `app/lib/blueprint-event-setup.ts` | J6 | `/docs/blueprints/event-setup` |
| `app/lib/blueprint-make-it-real.ts` | J7 | `/docs/blueprints/make-it-real` |

A pull request that changes what a journey step does updates the matching file in the same PR. The PR description names the blueprint and the step ids (`meet-friends: match-them`). Bump that file's `updated` date.

`refs` is the work that would change the step's status. A step that is still `missing`, `partial` or `gap` must not cite a Done or Canceled `RAZ-…` issue there. Mark the step `live`, or take the closed issue out of `refs` (the note may still name it as history) and cite an open issue if one tracks what is left. `app/lib/blueprints.test.ts` fails otherwise, against `CLOSED_BLUEPRINT_ISSUES`.

Weekly: `.github/workflows/blueprint-reread.yml` (Mondays) runs `bun run blueprint:issues`. With `LINEAR_API_KEY` it re-reads Linear and fails when the committed closed list is stale or an unfinished step cites a newly closed issue. The same morning, re-read the seven files against the code they name — the issue check does not see a step whose note is simply wrong.
