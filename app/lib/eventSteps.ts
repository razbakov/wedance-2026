/**
 * The event editor as ordered steps (RAZ-939), in the order an organiser
 * decides: what and when → where → who plays → entry → flyer → publish. The
 * same order as the MCP create_event flow (organiser → venue → artists →
 * create → the "missing" list → flyer → publish).
 *
 * Each step is done or to do, read from the saved event (its checklist gaps,
 * flyer and published state), so the editor and the checklist always agree.
 */
import type { EventGapKey } from '#shared/utils/eventChecklist'

export type EventStepKey = 'when' | 'where' | 'lineup' | 'entry' | 'flyer' | 'publish'
/** Which editor card a step opens (`null` = not a form card). */
export const STEP_CARD: Record<EventStepKey, string | null> = {
  when: 'when', where: 'where', lineup: 'lineup', entry: 'entry', flyer: null, publish: null,
}

export interface EventStep {
  key: EventStepKey
  label: string
  /** What WeDance offers in this step. */
  hint: string
  done: boolean
}

export interface StepEvent {
  date?: string | null
  startTime?: string | null
  published?: boolean
  gaps?: { key: EventGapKey | string }[]
  flyer?: { ready: number; kept: boolean } | null
}

export function eventSteps(ev: StepEvent): EventStep[] {
  const gap = new Set((ev.gaps ?? []).map(g => g.key))
  return [
    { key: 'when', label: 'What and when', hint: 'Type, music, date. See what else is on that night.', done: !!ev.date && !!ev.startTime },
    { key: 'where', label: 'Venue', hint: 'Venues for this music in your city. Ask one to host it.', done: !gap.has('venue') },
    { key: 'lineup', label: 'Line-up', hint: 'Artists from your past events. Send them a link to confirm.', done: !gap.has('lineup') },
    { key: 'entry', label: 'Entry and tickets', hint: 'Last time’s price, passes and the ticket link.', done: !gap.has('ticket') },
    { key: 'flyer', label: 'Flyer', hint: 'Painted from these details, in your style.', done: !!ev.flyer && (ev.flyer.kept || ev.flyer.ready > 0) },
    { key: 'publish', label: 'Publish', hint: 'Put it on WeDance when you’re ready.', done: !!ev.published },
  ]
}

/** The first step still to do, else the last one. */
export function firstOpenStep(steps: EventStep[]): EventStepKey {
  return (steps.find(s => !s.done) ?? steps[steps.length - 1]!).key
}

/** The step after `key`, preferring one still to do. */
export function nextStep(steps: EventStep[], key: EventStepKey): EventStepKey | null {
  const i = steps.findIndex(s => s.key === key)
  const after = steps.slice(i + 1)
  return (after.find(s => !s.done) ?? after[0])?.key ?? null
}

/**
 * What the host's other events tell this one: the artists they booked (most
 * often first, not already on this line-up) and the price of the latest event
 * that had one ("last time's price").
 */
export function pastEventHints(
  events: { id: string; startDate: string | Date; artists?: string[] | null; price?: string | null; role?: string }[],
  current: { id?: string; artists?: string[] },
): { artists: string[]; price: string | null } {
  const mine = events
    .filter(e => e.id !== current.id && (e.role ?? 'host') === 'host')
    .sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate))
  const count = new Map<string, number>()
  for (const e of mine) for (const h of e.artists ?? []) count.set(h, (count.get(h) ?? 0) + 1)
  const have = new Set(current.artists ?? [])
  const artists = [...count.entries()].filter(([h]) => !have.has(h)).sort((a, b) => b[1] - a[1]).map(([h]) => h).slice(0, 8)
  const price = mine.find(e => (e.price ?? '').trim())?.price?.trim() ?? null
  return { artists, price }
}
