/**
 * What a venue owner needs to answer "can you host our event?" — worked out
 * from the event, so the organizer doesn't retype it: the plan of the day at
 * this venue, the hours they'd have to open the room (setup and cleanup
 * included), and the message the organizer sends (date and plan first, the
 * offer, and the link last as an extra — a "yes" in the chat is enough).
 *
 * Used by venueAsks.ask (the message), artistInvites.get (the /ask page) and
 * artistInvites.notify (the email), so all three say the same thing.
 */
import type { FestivalSession } from '../types/festivalDetails'
import { SESSION_TYPE_LABEL, clockTime, isWorkshop, sessionType, type SessionType } from './programme'

export type VenuePlanItem = {
  date: string
  time: string
  /** End time, or null for a moment (doors) or an unknown length. */
  end: string | null
  type: SessionType
  title: string
  /** "Salsa · Intermediate", "Party". */
  kind: string
  /** Artist names, joined. */
  who: string
  room: string
}

export type AccessWindow = { date: string; from: string; until: string | null }

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h! * 60 + m! }
const fromMin = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim()

/** A session's place matches this venue: none named, or the venue's own name. */
function atVenue(s: { venue?: string }, venueName: string): boolean {
  const v = norm(s.venue ?? '')
  if (!v) return true
  const n = norm(venueName)
  return !!n && (v.includes(n) || n.includes(v))
}

/**
 * The day's plan at this venue, in order. Sessions placed at another venue
 * ("Workshops at Studio Z") are left out; `elsewhere` counts them.
 */
export function venuePlan(
  sessions: Pick<FestivalSession, 'date' | 'time' | 'duration' | 'type' | 'title' | 'artist' | 'with' | 'style' | 'level' | 'room' | 'venue'>[],
  venueName: string,
  names: (handle: string) => string = h => h,
): { plan: VenuePlanItem[]; elsewhere: number } {
  const timed = sessions.filter(s => clockTime(s.time))
  const here = timed.filter(s => atVenue(s, venueName))
  const plan = here
    .map((s) => {
      const time = clockTime(s.time)!
      const type = sessionType(s.type)
      return {
        date: s.date,
        time,
        end: s.duration ? fromMin(toMin(time) + s.duration) : null,
        type,
        title: s.title?.trim() || SESSION_TYPE_LABEL[type],
        // A level alone says nothing ("Lunch break" saved as a beginner workshop).
        kind: isWorkshop(type) ? (s.style ? [s.style, s.level].filter(Boolean).join(' · ') : s.artist ? 'Workshop' : '') : SESSION_TYPE_LABEL[type],
        who: [s.artist, ...(s.with ?? [])].filter(Boolean).map(names).join(' & '),
        room: s.room ?? '',
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date) || toMin(a.time) - toMin(b.time))
  return { plan, elsewhere: timed.length - here.length }
}

/** A gap longer than this between items splits the day: the venue can use the room in between. */
export const GAP_SPLIT_MIN = 120

/**
 * When the room has to be open: from each block's first item minus setup to
 * its last end plus cleanup. A day with a long break (workshops in the
 * afternoon, the party at night) gives two windows. Without a plan, the
 * event's own start and end. An end past midnight stays on its day ("19:30–01:30").
 */
export function accessWindows(
  plan: Pick<VenuePlanItem, 'date' | 'time' | 'end'>[],
  event: { date: string; start: string; end?: string | null },
  setupMin = 30,
  cleanupMin = 30,
): AccessWindow[] {
  const items = plan.length ? plan : [{ date: event.date, time: event.start, end: event.end ?? null }]
  const spans = items.map((p) => {
    const s = toMin(p.time)
    let e = p.end ? toMin(p.end) : null
    if (e !== null && e <= s) e += 1440
    return { date: p.date, s, e }
  }).sort((a, b) => a.date.localeCompare(b.date) || a.s - b.s)
  const blocks: { date: string; from: number; until: number | null }[] = []
  for (const x of spans) {
    const last = blocks[blocks.length - 1]
    const lastEnd = last ? (last.until ?? last.from) : 0
    if (last && last.date === x.date && x.s - lastEnd <= GAP_SPLIT_MIN) {
      if (x.e !== null) last.until = Math.max(last.until ?? x.e, x.e)
      continue
    }
    blocks.push({ date: x.date, from: x.s, until: x.e })
  }
  return blocks.map(b => ({
    date: b.date,
    from: fromMin(b.from - setupMin),
    until: b.until === null ? null : fromMin(b.until + cleanupMin),
  }))
}

/** "19:30 Salsa workshop" · "20:30–00:00 Party": one short line per item. */
export function planLine(p: Pick<VenuePlanItem, 'time' | 'end' | 'type' | 'kind' | 'title'>): string {
  if (p.type === 'doors') return `${p.time} doors open`
  const when = p.end ? `${p.time}–${p.end}` : p.time
  const what = !isWorkshop(p.type) ? p.kind.toLowerCase()
    : !p.kind ? p.title.toLowerCase()
      : p.kind === 'Workshop' ? 'workshop' : `${p.kind.split(' · ')[0]} workshop`
  return `${when} ${what}`
}

/**
 * The plan in one chat line: back-to-back classes collapse into one block
 * ("10:00–15:00 5 workshops"), the night's items stay as they are
 * ("21:00–00:00 party"). Doors aren't listed.
 */
export function planSummary(plan: Pick<VenuePlanItem, 'date' | 'time' | 'end' | 'type' | 'kind' | 'title'>[]): string[] {
  const out: string[] = []
  let run: { date: string; from: string; to: string | null; n: number; first: (typeof plan)[number] } | null = null
  const flush = () => {
    if (!run) return
    out.push(run.n > 1 ? `${run.from}–${run.to ?? run.from} ${run.n} workshops` : planLine(run.first))
    run = null
  }
  for (const p of plan) {
    if (p.type === 'doors') continue
    if (!isWorkshop(p.type)) { flush(); out.push(planLine(p)); continue }
    const r = run as typeof run
    const gap = r && r.to ? (toMin(p.time) - toMin(r.to) + 1440) % 1440 : Infinity
    if (r && r.date === p.date && gap <= 60) {
      r.to = p.end ?? r.to
      if (p.kind) r.n++
      continue
    }
    flush()
    run = { date: p.date, from: p.time, to: p.end, n: p.kind ? 1 : 0, first: p }
  }
  flush()
  return out
}

/** "19:30–00:30", or "from 19:30" when the end isn't known. */
export const windowRange = (w: AccessWindow) => (w.until ? `${w.from}–${w.until}` : `from ${w.from}`)

/** "Salsa & Bachata party", from the event's styles and type. */
export function eventKind(styles: string[], type: string | null | undefined): string {
  const t = (type || 'event').toLowerCase()
  const s = styles.slice(0, 2).join(' & ')
  return s ? `${s} ${t}` : t
}

export type VenueAskFacts = {
  venueName: string
  host: string | null
  /** Dance events this organizer has run (on WeDance and wedance.vip). */
  hostEvents: number
  hostCity: string | null
  eventName: string
  /** "Salsa party". */
  kind: string
  /** "Saturday 22 November · 20:00–00:00". */
  when: string
  plan: VenuePlanItem[]
  /** Days with the plan elsewhere, for a festival spread over several venues. */
  elsewhere: number
  access: AccessWindow[]
  /** True when there's more than one day: then each window names its day. */
  multiDay: boolean
  /** yyyy-mm-dd → "Sat 22 Nov", for the windows of a multi-day event. */
  dayLabels: Record<string, string>
  guests: number | null
  needs: string[]
  /** What the organizer offers ("€200 rent"); empty = "tell us your price". */
  offer: string
  /** Entry price for dancers, as the event says it. */
  price: string
  note: string
}

/** What the organizer sends the venue: the facts first, the link last. */
export function venueAskMessage(f: VenueAskFacts, url: string): string {
  const intro = f.host
    ? `This is ${f.host}${f.hostEvents >= 2 ? `: we've organised ${f.hostEvents} dance events${f.hostCity ? ` in ${f.hostCity}` : ''}` : ''}.`
    : ''
  const summary = planSummary(f.plan)
  const planText = (summary.length > 4 ? [...summary.slice(0, 4), `+${summary.length - 4} more`] : summary).join(' · ')
  const access = f.access.map(w => (f.multiDay ? `${(f.dayLabels[w.date] ?? w.date)} ${windowRange(w)}` : windowRange(w))).join(' and ')
  const lines = [
    `Hi ${f.venueName}! ${intro}`.trim(),
    `We're looking for a place for ${f.eventName} (${f.kind}) and would love to hold it at yours:`,
    `📅 ${f.when}`,
    planText && `🕒 ${planText}`,
    access && `🔑 We'd need the room ${access} (setup and cleanup included)`,
    f.guests && `👥 About ${f.guests} dancers${f.price ? `, entry ${f.price}` : ''}`,
    f.needs.length && `🎵 We need: ${f.needs.join(', ').toLowerCase()}`,
    `💶 ${f.offer ? `We offer: ${f.offer}` : 'What would you charge?'}`,
  ]
  return `${lines.filter(Boolean).join('\n')}\n\nAre you free then? A quick yes or no here is enough. All the details in one place: ${url}`
}

/** The same facts as short lines, for the email. */
export function venueAskLines(f: VenueAskFacts): string[] {
  const plan = f.plan.filter(p => p.type !== 'doors').map(planLine)
  return [
    plan.length ? `Plan: ${plan.join(' · ')}` : '',
    f.access.length ? `Room needed ${f.access.map(w => (f.multiDay ? `${(f.dayLabels[w.date] ?? w.date)} ${windowRange(w)}` : windowRange(w))).join(' and ')} (setup and cleanup included)` : '',
    f.guests ? `About ${f.guests} dancers${f.price ? `, entry ${f.price}` : ''}` : '',
    f.needs.length ? `Needs: ${f.needs.join(', ')}` : '',
    f.offer ? `They offer: ${f.offer}` : 'They ask what you would charge',
    f.note ? `“${f.note}”` : '',
  ].filter(Boolean)
}
