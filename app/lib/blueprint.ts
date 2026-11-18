/**
 * Service blueprints in the docs (/docs/blueprints/*): lanes are who acts,
 * phases are when; each step says how well it is built and where it makes
 * someone wait, carry something by hand, or misses a change. Drawn by
 * `DocsBlueprint`; each blueprint keeps its data in its own file
 * (blueprint-event-setup.ts, blueprint-meet-friends.ts, blueprint-first-class.ts,
 * blueprint-keep-progressing.ts, blueprint-artist-booking.ts,
 * blueprint-make-it-real.ts, blueprint-festival-travel.ts).
 *
 * A pull request that changes what a step does updates that file in the same
 * PR and names the step ids. A step that is still missing, partial or gap
 * must not list a Done or Canceled issue in `refs` (app/lib/blueprint-issues.ts).
 */
import type { UxStatus } from './ux-map'

/** wait: someone is blocked on someone else · manual: a person carries the link or the news · silent: a change or answer doesn't reach the side that needs it */
export type BpMark = 'wait' | 'manual' | 'silent'

export interface BpStep<L extends string = string, P extends string = string> {
  id: string
  phase: P
  lane: L
  name: string
  status: UxStatus
  note: string
  marks: BpMark[]
  route?: string
  code?: string
  refs?: string[]
}

export interface BpGap {
  title: string
  why: string
  fix: string
  steps: string[]
}

export interface BpLaneDef<L extends string = string> { key: L, label: string, hint: string }
export interface BpPhaseDef<P extends string = string> { key: P, label: string }

export interface Blueprint {
  updated: string
  lanes: BpLaneDef[]
  phases: BpPhaseDef[]
  steps: BpStep[]
  gaps: BpGap[]
  /** The lane drawn shaded (WeDance itself). */
  systemLane?: string
}

export const bpMarkLabel: Record<BpMark, { icon: string, label: string, hint: string }> = {
  wait: { icon: '⏳', label: 'Waits', hint: 'Someone is blocked on someone else, and nothing chases it.' },
  manual: { icon: '✋', label: 'By hand', hint: 'A person carries the link or the news between lanes.' },
  silent: { icon: '🔇', label: 'Silent', hint: 'An answer or change doesn’t reach the side that needs it.' },
}
