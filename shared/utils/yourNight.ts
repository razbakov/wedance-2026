/**
 * "Your night" (RAZ-1007): an event whose programme runs one item after another
 * (19:00 class → 20:00 party → 22:00 band) is booked once. The pass decides which
 * items you get; booking puts them on your plan; you can untick what you'll skip
 * (you keep your spot and price) — that tells you when to arrive and the organiser
 * how many come to what. A programme with items at the same time (festival rooms)
 * is not a night: there you pick per workshop. Pure — unit-tested.
 */
import type { FestivalPass, FestivalSession } from '../types/festivalDetails'

type Session = Pick<FestivalSession, 'id' | 'date' | 'time' | 'duration' | 'type'>

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const weekdayOf = (ymd: string) => WEEKDAYS[new Date(`${ymd}T12:00:00Z`).getUTCDay()]!

const minutes = (t: string) => { const [h, m] = t.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0) }
/** Start in minutes from the programme's first day; an item after midnight (00:30) belongs to the night before only if its date says so. */
const startOf = (s: Session, firstDay: string) =>
  Math.round((new Date(`${s.date}T12:00:00Z`).getTime() - new Date(`${firstDay}T12:00:00Z`).getTime()) / 86400_000) * 1440 + minutes(s.time)

/** Items a dancer can be at: everything but "doors open" moments. */
export const plannable = <S extends Session>(sessions: readonly S[] | null | undefined): S[] =>
  (sessions ?? []).filter(s => s.type !== 'doors')
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

/**
 * One night, booked as a whole: no two classes at the same time. A show or a band
 * during the party is part of the night (same floor); two workshops at 14:00 in two
 * rooms is a festival programme, picked per workshop. Needs 2+ items.
 */
export function isNight(sessions: readonly Session[] | null | undefined): boolean {
  const items = plannable(sessions)
  if (items.length < 2) return false
  const first = items[0]!.date
  const classes = items.filter(s => s.type === 'workshop')
  let lastEnd = -Infinity
  for (const s of classes) {
    const start = startOf(s, first)
    if (start < lastEnd) return false
    lastEnd = Math.max(lastEnd, start + Math.max(s.duration || 0, 0))
  }
  return true
}

/**
 * What a pass covers: the items it names (`sessions`), else every item on its days
 * (no days = every day). No pass (a free event) = everything.
 */
export function passCovers<S extends Session>(pass: Pick<FestivalPass, 'days' | 'sessions'> | null | undefined, sessions: readonly S[] | null | undefined): S[] {
  const items = plannable(sessions)
  if (!pass) return items
  if (pass.sessions?.length) return items.filter(s => pass.sessions!.includes(s.id))
  if (pass.days?.length) return items.filter(s => pass.days.includes(weekdayOf(s.date)))
  return items
}

export const findPass = (passes: readonly FestivalPass[] | null | undefined, name: string | null | undefined) =>
  (name && (passes ?? []).find(p => p.name === name)) || null

/** "19:00 class · 20:00 party · 22:00 concert" — what a pass includes, in programme order. */
export function includesLine(pass: Pick<FestivalPass, 'days' | 'sessions'> | null, sessions: readonly (Session & { title?: string })[]): string {
  const KIND: Record<string, string> = { workshop: 'class', party: 'party', show: 'show', concert: 'concert', other: '' }
  return passCovers(pass, sessions).map(s => `${s.time} ${KIND[s.type] || s.title || ''}`.trim()).join(' · ')
}

/** "Be there around 18:50": 10 min before a class, else when the first item starts. */
export function arrivalTime(ticked: readonly Session[]): string | null {
  const first = plannable(ticked)[0]
  if (!first) return null
  const m = minutes(first.time) - (first.type === 'workshop' ? 10 : 0)
  const d = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`
}

/** The cheapest pass covering everything you have now plus `sessionId`, and what it costs on top. */
export function upgradeFor(passes: readonly FestivalPass[] | null | undefined, current: FestivalPass | null, sessions: readonly Session[], sessionId: string): { pass: FestivalPass; extra: number } | null {
  const have = new Set(passCovers(current, sessions).map(s => s.id))
  have.add(sessionId)
  const options = (passes ?? []).filter(p => !p.soldOut && p.name !== current?.name)
    .filter(p => { const c = new Set(passCovers(p, sessions).map(s => s.id)); return [...have].every(id => c.has(id)) })
    .sort((a, b) => Number(a.price) - Number(b.price))
  const best = options[0]
  if (!best) return null
  return { pass: best, extra: Math.max(0, Number(best.price) - Number(current?.price ?? 0)) }
}

/** The plan item id of a programme item: `<festival key>:<session id>` (as the schedule saves it). */
export const sessionPlanId = (key: string, sessionId: string) => `${key}:${sessionId}`

/**
 * What booking changes on the plan (a night only): add the items the new pass covers
 * that the old one didn't (so a dancer's unticks survive "Change"), drop the ones it
 * no longer covers. Cancelling ("next") drops them all.
 */
export function nightPlanChanges(
  sessions: readonly Session[] | null | undefined,
  passes: readonly FestivalPass[] | null | undefined,
  before: { answer: string | null; pass: string | null } | null,
  after: { answer: string; pass: string | null },
): { add: string[]; remove: string[] } {
  if (!isNight(sessions)) return { add: [], remove: [] }
  const all = plannable(sessions).map(s => s.id)
  if (after.answer === 'next') return { add: [], remove: all }
  const now = new Set(passCovers(findPass(passes, after.pass), sessions).map(s => s.id))
  const wasBooked = !!before && before.answer !== 'next' && before.answer != null
  const had = wasBooked ? new Set(passCovers(findPass(passes, before!.pass), sessions).map(s => s.id)) : new Set<string>()
  return { add: [...now].filter(id => !had.has(id)), remove: all.filter(id => !now.has(id)) }
}

export type NightBooking = { answer: string; items: string[] }
export type NightCounts = {
  items: { id: string; people: number; leaders: number; followers: number }[]
  /** People arriving for each item first (by "Be there around"), in programme order. */
  arrivals: { id: string; time: string; people: number }[]
}

/**
 * The organiser's view of a night: how many come to each item, and when they arrive.
 * With a partner = two people, a leader and a follower. "Alone, I follow" = needLeader.
 */
export function nightCounts(sessions: readonly Session[] | null | undefined, bookings: readonly NightBooking[]): NightCounts {
  const items = plannable(sessions)
  const byId = new Map(items.map(s => [s.id, { id: s.id, people: 0, leaders: 0, followers: 0 }]))
  const firstBy = new Map(items.map(s => [s.id, 0]))
  for (const b of bookings) {
    if (b.answer === 'next') continue
    const n = b.answer === 'partner' ? 2 : 1
    const lead = b.answer === 'partner' ? 1 : b.answer === 'needFollower' ? 1 : 0
    const follow = b.answer === 'partner' ? 1 : b.answer === 'needLeader' ? 1 : 0
    const mine = items.filter(s => b.items.includes(s.id))
    for (const s of mine) {
      const c = byId.get(s.id)!
      c.people += n; c.leaders += lead; c.followers += follow
    }
    if (mine[0]) firstBy.set(mine[0].id, firstBy.get(mine[0].id)! + n)
  }
  return {
    items: [...byId.values()],
    arrivals: items.filter(s => firstBy.get(s.id)).map(s => ({ id: s.id, time: arrivalTime([s])!, people: firstBy.get(s.id)! })),
  }
}

const PART: Record<string, string> = { workshop: 'class', party: 'party', show: 'show', concert: 'concert', other: 'programme' }

/**
 * My plan's one row for a night (RAZ-1007): the pass, when to come, and the parts you're
 * at ("Party only · from 20:00: party, concert"). Not a night → null.
 */
export function nightSummary(
  sessions: readonly Session[] | null | undefined,
  passes: readonly FestivalPass[] | null | undefined,
  passName: string | null,
  tickedIds: readonly string[],
): { pass: string | null; arrival: string | null; parts: string[] } | null {
  if (!isNight(sessions)) return null
  const ticked = plannable(sessions).filter(s => tickedIds.includes(s.id))
  return {
    pass: findPass(passes, passName)?.name ?? null,
    arrival: arrivalTime(ticked),
    parts: [...new Set(ticked.map(s => PART[s.type] ?? 'programme'))],
  }
}
