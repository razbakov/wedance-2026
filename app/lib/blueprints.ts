/**
 * Every service blueprint in the docs, for the /docs/blueprints index.
 * A blueprint zooms into ONE job's flow (lanes = who acts, phases = when);
 * the UX map (/docs/ux-map) is the overview across all journeys. Add a new
 * blueprint here and in its job's `flows` (app/lib/jobs.ts) — the test checks both.
 */
import type { Blueprint, BpMark } from './blueprint'
import { eventSetupBlueprint } from './blueprint-event-setup'
import { meetFriendsBlueprint } from './blueprint-meet-friends'
import type { JobId } from './jobs'

export interface BlueprintEntry {
  title: string
  to: string
  job: JobId
  summary: string
  bp: Blueprint
}

export const blueprints: BlueprintEntry[] = [
  {
    title: 'Event setup',
    to: '/docs/blueprints/event-setup',
    job: 'J6',
    summary: 'From getting the organiser’s page to the night: organiser, WeDance, venue, artists and dancers.',
    bp: eventSetupBlueprint,
  },
  {
    title: 'Meet new friends',
    to: '/docs/blueprints/meet-friends',
    job: 'J3',
    summary: 'From joining WeDance to dancing with someone you didn’t know: you, WeDance and the other dancer.',
    bp: meetFriendsBlueprint,
  },
]

/** Step and marker counts for a blueprint's card. */
export function blueprintStats(bp: Blueprint) {
  const marks = (m: BpMark) => bp.steps.filter(s => s.marks.includes(m)).length
  return {
    lanes: bp.lanes.length,
    steps: bp.steps.length,
    gaps: bp.gaps.length,
    notLive: bp.steps.filter(s => s.status !== 'live').length,
    wait: marks('wait'),
    manual: marks('manual'),
    silent: marks('silent'),
  }
}
