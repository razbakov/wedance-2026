/**
 * The facts a venue gets about an ask, read from the event: when, the plan of
 * the day at this venue, the hours the room is needed, who's asking and their
 * track record, and what they offer. One source for the pasted message
 * (venueAsks.ask), the /ask page (artistInvites.get) and the email (notify).
 */
import { and, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { events, profiles } from '../database/schema'
import { eventLocalDate, eventLocalTime } from '../../shared/utils/eventTime'
import { agendaToSessions, legacyAgendaOf } from '../../shared/utils/programme'
import { accessWindows, eventKind, venuePlan, type VenueAskFacts } from '../../shared/utils/venueAsk'
import type { VenueRequest } from '../../shared/types/venueAsk'

export async function venueAskFacts(db: any, eventId: string, venue: { name: string }, request: VenueRequest): Promise<VenueAskFacts | null> {
  const [e] = await db.select().from(events).where(eq(events.id, eventId))
  if (!e) return null
  const tz = e.timezone || 'Europe/Berlin'
  const [host] = e.hostProfileId
    ? await db.select({ id: profiles.id, name: profiles.name, username: profiles.username, city: profiles.city }).from(profiles).where(eq(profiles.id, e.hostProfileId))
    : [null]
  // Their track record: events they ran before this one.
  const [{ n } = { n: 0 }] = host
    ? await db.select({ n: sql<number>`count(*)::int` }).from(events)
      .where(and(or(eq(events.hostProfileId, host.id), eq(events.organizerUsername, host.username)), lt(events.startDate, new Date())))
    : [{ n: 0 }]

  const date = e.startDate ? eventLocalDate(e.startDate, tz) : ''
  const start = e.startDate ? eventLocalTime(e.startDate, tz) : ''
  const endDay = e.endDate ? eventLocalDate(e.endDate, tz) : null
  const end = e.endDate ? eventLocalTime(e.endDate, tz) : null
  // An end before noon the next day is the same night.
  const overnight = !!(e.startDate && e.endDate && +new Date(e.endDate) - +new Date(e.startDate) < 24 * 3600_000)
  const multiDay = !!(endDay && endDay !== date && !overnight)

  const raw = (e.festival?.sessions ?? []) as any[]
  const sessions = raw.length ? raw : (date && start ? agendaToSessions(legacyAgendaOf(e), { date, startTime: start, endDate: endDay, endTime: end }) : [])
  // Artists by their names, not their handles.
  const handles = [...new Set(sessions.flatMap((s: any) => [s.artist, ...(s.with ?? [])]).filter(Boolean))] as string[]
  const artistNames = handles.length
    ? Object.fromEntries((await db.select({ username: profiles.username, name: profiles.name }).from(profiles).where(inArray(profiles.username, handles))).map((p: any) => [p.username, p.name]))
    : {}
  const { plan, elsewhere } = venuePlan(sessions, venue.name, h => e.flyerOptions?.names?.[h] || artistNames[h] || h)
  const access = date && start
    ? accessWindows(plan, { date, start, end: multiDay ? null : end }, request.setupMin ?? 30, request.cleanupMin ?? 30)
    : []

  const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const longDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const when = !date ? 'Date to be agreed'
    : multiDay ? `${longDay(date)} – ${longDay(endDay!)}`
      : `${longDay(date)} · ${end ? `${start}–${end}` : start}`

  return {
    venueName: venue.name,
    host: host?.name ?? e.organizerName ?? null,
    hostEvents: n ?? 0,
    hostCity: host?.city || e.city || null,
    eventName: e.name ?? 'our event',
    kind: eventKind((e.styles ?? []) as string[], e.type),
    when,
    plan,
    elsewhere,
    access,
    multiDay,
    dayLabels: Object.fromEntries(access.map(w => [w.date, dayLabel(w.date)])),
    guests: request.guests ?? null,
    needs: request.needs ?? [],
    offer: request.offer ?? '',
    price: String(e.price ?? '').trim(),
    note: request.note ?? '',
  }
}
