/**
 * Jobs To Be Done (J1–J7): the jobs people hire WeDance for. Shown at
 * /docs/jobs and used by the UX map (/docs/ux-map), whose journey rows name
 * the job they serve.
 *
 * The statements mirror docs/issues/_reference-cuj-jtbd.md, where the backlog
 * stories (`jtbd:` in docs/issues/*.md, Linear labels `jtbd:J#`) take them from.
 * jobs.test.ts fails when the two drift apart, when a story names a job that
 * isn't here, or when `journeys` no longer matches the journeys (CUJ) of the
 * stories tagged with the job. Change a job in both places.
 */
import type { UxJourneyId } from './ux-map'

export type JobId = 'J1' | 'J2' | 'J3' | 'J4' | 'J5' | 'J6' | 'J7'

export interface DocsLink { title: string, to: string }

export interface Job {
  id: JobId
  /** The job, word for word as in the reference file. */
  statement: string
  /** Who has this job, in plain words. */
  who: string
  /** Every journey (CUJ) a backlog story for this job belongs to. */
  journeys: UxJourneyId[]
  /** Flows and blueprints in the docs that walk through this job. */
  flows: DocsLink[]
}

export const jobs: Job[] = [
  { id: 'J1', statement: 'Start dancing without feeling lost', who: 'Someone who has never danced, or only once, looking for a first class', journeys: ['C1'], flows: [] },
  { id: 'J2', statement: 'Get better and keep momentum', who: 'A student taking classes who wants the right teacher and steady progress', journeys: ['C2', 'C3'], flows: [] },
  { id: 'J3', statement: 'Never dance alone — go with people I know', who: 'A regular going out to socials, who wants friends and partners on the floor', journeys: ['C3', 'C8'], flows: [] },
  { id: 'J4', statement: 'Plan and afford my dance travel', who: 'A traveller choosing festivals for the year, with tickets, rides and rooms', journeys: ['C4'], flows: [] },
  { id: 'J5', statement: 'Get discovered and booked as an artist', who: 'A teacher, DJ, band or performer looking for gigs', journeys: ['C5'], flows: [] },
  {
    id: 'J6',
    statement: 'Run a great event / throw a great night',
    who: 'An organiser, a venue or someone hosting a private event',
    journeys: ['C6', 'C7', 'C8'],
    flows: [{ title: 'Event setup blueprint', to: '/docs/blueprints/event-setup' }],
  },
  { id: 'J7', statement: 'Trust it\'s real — real people, real faces, no fakes', who: 'Everyone: dancers, artists and organisers deciding whether WeDance is worth their time', journeys: ['C4', 'C7', 'C8'], flows: [] },
]

export const jobById = (id: JobId): Job => jobs.find(j => j.id === id)!

/** Anchor of a job on /docs/jobs, e.g. /docs/jobs#j3. */
export const jobLink = (id: JobId) => `/docs/jobs#${id.toLowerCase()}`
