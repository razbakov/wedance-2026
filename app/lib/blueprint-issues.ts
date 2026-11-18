/**
 * Keep the seven service blueprints honest (RAZ-1072).
 *
 * `refs` on a step is the work that would change its status. Once that Linear
 * issue is Done or Canceled, a step still marked missing, partial or gap is
 * drift: either the step is live now, or the closed issue is no longer the
 * remaining work and must leave `refs`. The note may still name it as history.
 *
 * `CLOSED_BLUEPRINT_ISSUES` is every RAZ issue a step cites that Linear had as
 * completed or canceled on the last refresh (2026-11-18). The unit test uses
 * this list, so a pull request fails without an API key. `bun run blueprint:issues`
 * re-reads Linear when `LINEAR_API_KEY` is set; the weekly workflow does that.
 */
import type { Blueprint, BpStep } from './blueprint'
import type { JobId } from './jobs'
import { artistBookingBlueprint } from './blueprint-artist-booking'
import { eventSetupBlueprint } from './blueprint-event-setup'
import { festivalTravelBlueprint } from './blueprint-festival-travel'
import { firstClassBlueprint } from './blueprint-first-class'
import { keepProgressingBlueprint } from './blueprint-keep-progressing'
import { makeItRealBlueprint } from './blueprint-make-it-real'
import { meetFriendsBlueprint } from './blueprint-meet-friends'

/** A Linear issue id, as written in a step's `refs`. Pull-request numbers (`#521`) are not issues. */
export const LINEAR_ISSUE = /^RAZ-\d+$/

/** Statuses that still describe unfinished work. A `live` step may cite a closed issue. */
export const OPEN_STEP_STATUSES = new Set(['missing', 'partial', 'gap'])

export interface ServiceBlueprint {
  id: string
  job: JobId
  to: string
  bp: Blueprint
}

export const serviceBlueprints: ServiceBlueprint[] = [
  { id: 'first-class', job: 'J1', to: '/docs/blueprints/first-class', bp: firstClassBlueprint },
  { id: 'keep-progressing', job: 'J2', to: '/docs/blueprints/keep-progressing', bp: keepProgressingBlueprint },
  { id: 'meet-friends', job: 'J3', to: '/docs/blueprints/meet-friends', bp: meetFriendsBlueprint },
  { id: 'festival-travel', job: 'J4', to: '/docs/blueprints/festival-travel', bp: festivalTravelBlueprint },
  { id: 'artist-booking', job: 'J5', to: '/docs/blueprints/artist-booking', bp: artistBookingBlueprint },
  { id: 'event-setup', job: 'J6', to: '/docs/blueprints/event-setup', bp: eventSetupBlueprint },
  { id: 'make-it-real', job: 'J7', to: '/docs/blueprints/make-it-real', bp: makeItRealBlueprint },
]

/**
 * RAZ issues cited by a blueprint step and closed in Linear (completed or
 * canceled), sorted. Refresh with `bun run blueprint:issues` when the key is set.
 */
export const CLOSED_BLUEPRINT_ISSUES: readonly string[] = [
  'RAZ-897',
  'RAZ-924',
  'RAZ-928',
  'RAZ-939',
  'RAZ-964',
  'RAZ-966',
  'RAZ-985',
  'RAZ-995',
  'RAZ-1003',
  'RAZ-1005',
  'RAZ-1024',
  'RAZ-1071',
]

export interface ClosedOnOpenStep {
  id: string
  name: string
  status: string
  issue: string
}

/** Steps still unfinished whose `refs` include a closed issue. */
export function closedIssuesOnOpenSteps(steps: BpStep[], closed: ReadonlySet<string>): ClosedOnOpenStep[] {
  const hits: ClosedOnOpenStep[] = []
  for (const s of steps) {
    if (!OPEN_STEP_STATUSES.has(s.status)) continue
    for (const ref of s.refs ?? []) {
      if (LINEAR_ISSUE.test(ref) && closed.has(ref)) hits.push({ id: s.id, name: s.name, status: s.status, issue: ref })
    }
  }
  return hits
}

/** Every `RAZ-…` id in these steps' `refs`, sorted and unique. */
export function linearRefs(steps: BpStep[]): string[] {
  const ids = new Set<string>()
  for (const s of steps) {
    for (const ref of s.refs ?? []) if (LINEAR_ISSUE.test(ref)) ids.add(ref)
  }
  return [...ids].sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
}

/** Linear state types that mean the issue will not change the step anymore. */
export const TERMINAL_ISSUE_TYPES = new Set(['completed', 'canceled'])
