/**
 * The color-and-shape meetup on a real Meet match (RAZ-1071).
 *
 * A mutual yes (plan.meetMatches) is the start. Booking puts that night on the
 * dancer's plan and stamps booked_at. At the venue they reveal a symbol both
 * phones share — derived, not stored — and turn it toward the other person.
 * The morning after the event, each booked dancer gets one email. Follow is
 * only suggested there.
 */
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { attendances, dancers, events, follows, meetRituals, planItems } from '../database/schema'
import { eventPath } from '../../shared/utils/eventSlug'
import { eventEndsAt, eventLocalTime, eventLocalWeekday } from '../../shared/utils/eventTime'
import { MEET_MATCHES_SINCE, meetMatches } from './meetMatches'
import { matchEmailsOffUrl } from './meetMatchNotify'
import { sendRitualFollowupEmail } from './email'
import { nightCardWhen } from '../../shared/utils/notices'
import { repairPreviewDemoDancers } from './previewDemoDancers'
import {
  givenName,
  followupDue,
  meetupAt,
  pairMark,
  ritualEmailBlock,
  ritualFollowup,
  RITUAL_PROBLEMS,
  type RitualHow,
  type RitualMark,
  type RitualProblem,
} from '../../shared/utils/ritual'

type Db = any

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class RitualNoNight extends Error {
  constructor() { super('NO_NIGHT') }
}

export interface RitualNight {
  eventId: string
  name: string
  path: string
  startISO: string
  endISO: string | null
  timezone: string | null
  venue: string
  ticketUrl: string | null
  price: string | null
  cover: string | null
  going: number
  youGoing: boolean
  theyGoing: boolean
  /** 'HH:MM' of the meetup, in the event's zone. */
  time: string
  /** Weekday of the meetup, in the event's zone. */
  weekday: string
  /** The event's own start, so the booking card isn't the meetup clock. */
  starts: string
  /** 'HH:MM' of the event's start, in its own zone. */
  startTime: string
  /** "Fri, Nov 20 · 20:00" — the event card's date and time. */
  whenLabel: string
}

export interface RitualState {
  booked: boolean
  revealed: boolean
  problem: RitualProblem | null
  note: string | null
  how: RitualHow | null
  emailSentAt: string | null
}

export interface RitualView {
  you: { firstName: string }
  other: {
    id: string
    name: string
    firstName: string
    photo: string | null
    username: string | null
    city: string
    styles: string[]
  }
  night: RitualNight | null
  /** Null until there is an event to derive it from. The page hides it until the reveal. */
  mark: RitualMark | null
  state: RitualState
  following: boolean
}

const asProblem = (v: string | null | undefined): RitualProblem | null =>
  RITUAL_PROBLEMS.includes(v as RitualProblem) ? v as RitualProblem : null
const asHow = (v: string | null | undefined): RitualHow | null =>
  v === 'good' || v === 'not' ? v : null

const EMPTY_STATE: RitualState = { booked: false, revealed: false, problem: null, note: null, how: null, emailSentAt: null }

function stateOf(row: { bookedAt: Date | null, revealedAt: Date | null, problem: string | null, note: string | null, how: string | null, emailSentAt: Date | null } | null): RitualState {
  if (!row?.bookedAt) return EMPTY_STATE
  return {
    booked: true,
    revealed: !!row.revealedAt,
    problem: asProblem(row.problem),
    note: row.note,
    how: asHow(row.how),
    emailSentAt: row.emailSentAt ? new Date(row.emailSentAt).toISOString() : null,
  }
}

/** The match, the night they booked (or the one suggested), and where they are in the meetup. Null when `otherId` is not a mutual yes. */
export async function loadRitual(db: Db, dancerId: string, otherId: string, now = new Date()): Promise<RitualView | null> {
  if (!UUID_RE.test(otherId) || otherId === dancerId) return null
  await repairPreviewDemoDancers(db)
  const match = (await meetMatches(db, dancerId, { now, since: MEET_MATCHES_SINCE })).find(m => m.dancerId === otherId)
  if (!match) return null

  const [me] = await db.select({ name: dancers.name }).from(dancers).where(eq(dancers.id, dancerId)).limit(1)
  const bookedRows: Array<{ eventId: string, bookedAt: Date | null }> = await db
    .select({ eventId: meetRituals.eventId, bookedAt: meetRituals.bookedAt })
    .from(meetRituals)
    .where(and(eq(meetRituals.dancerId, dancerId), eq(meetRituals.otherId, otherId), isNotNull(meetRituals.bookedAt)))
    .orderBy(desc(meetRituals.bookedAt))
  // Once booked, the meetup stays on that event — including the morning after, when it is no longer "the next night".
  const eventId = bookedRows[0]?.eventId ?? match.night?.eventId ?? null

  let night: RitualNight | null = null
  let row: any = null
  if (eventId) {
    const [ev] = await db.select({
      id: events.id, name: events.name, startDate: events.startDate, endDate: events.endDate,
      timezone: events.timezone, venueName: events.venueName, ticketUrl: events.ticketUrl, price: events.price,
      cover: events.cover,
    }).from(events).where(eq(events.id, eventId)).limit(1)
    const [plans, goingRows] = await Promise.all([
      db.select({ dancerId: planItems.dancerId, shareGoing: planItems.shareGoing, metadata: planItems.metadata })
        .from(planItems)
        .where(and(eq(planItems.itemType, 'event'), eq(planItems.itemId, eventId), inArray(planItems.dancerId, [dancerId, otherId]))) as Promise<Array<{ dancerId: string, shareGoing: boolean, metadata: Record<string, string> | null }>>,
      db.select({ n: sql<number>`count(*)::int` }).from(planItems)
        .where(and(eq(planItems.itemType, 'event'), eq(planItems.itemId, eventId))) as Promise<Array<{ n: number }>>,
    ])
    ;[row] = await db.select().from(meetRituals).where(and(
      eq(meetRituals.dancerId, dancerId), eq(meetRituals.otherId, otherId), eq(meetRituals.eventId, eventId),
    )).limit(1)
    if (ev?.startDate) {
      const zone = ev.timezone || 'Europe/Berlin'
      const start = new Date(ev.startDate)
      const end = ev.endDate ? new Date(ev.endDate) : null
      const at = meetupAt(start, end, zone)
      const theirs = plans.find(p => p.dancerId === otherId)
      night = {
        eventId: ev.id,
        name: ev.name || 'the night',
        path: eventPath(ev),
        startISO: start.toISOString(),
        endISO: end ? end.toISOString() : null,
        timezone: ev.timezone,
        venue: ev.venueName || '',
        ticketUrl: ev.ticketUrl || null,
        price: ev.price || null,
        cover: ev.cover || null,
        going: Number(goingRows[0]?.n) || 0,
        youGoing: plans.some(p => p.dancerId === dancerId) || !!row?.bookedAt,
        theyGoing: !!theirs && (theirs.shareGoing || theirs.metadata?.with === dancerId),
        time: eventLocalTime(at, zone),
        weekday: eventLocalWeekday(at, zone),
        starts: `${eventLocalWeekday(start, zone)} ${eventLocalTime(start, zone)}`,
        startTime: eventLocalTime(start, zone),
        whenLabel: nightCardWhen(start.toISOString(), zone),
      }
    }
  }

  const [follow] = await db.select({ id: follows.id }).from(follows).where(and(
    eq(follows.dancerId, dancerId), eq(follows.targetDancerId, otherId),
  )).limit(1)

  return {
    you: { firstName: givenName(me?.name) || 'there' },
    other: {
      id: match.dancerId,
      name: match.name,
      firstName: givenName(match.name) || match.name,
      photo: match.photo,
      username: match.username,
      city: match.city,
      styles: match.styles,
    },
    night,
    mark: night ? pairMark(dancerId, otherId, night.eventId) : null,
    state: stateOf(row),
    following: !!follow,
  }
}

async function putOnPlan(db: Db, dancerId: string, otherId: string, eventId: string) {
  const [existing] = await db.select({ id: planItems.id, metadata: planItems.metadata }).from(planItems).where(and(
    eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'event'), eq(planItems.itemId, eventId),
  )).limit(1)
  if (!existing) {
    await db.insert(planItems).values({ dancerId, itemType: 'event', itemId: eventId, metadata: { with: otherId } })
  } else if (!existing.metadata?.with) {
    await db.update(planItems).set({ metadata: { ...(existing.metadata ?? {}), with: otherId } }).where(eq(planItems.id, existing.id))
  }
  try {
    await db.insert(attendances).values({
      eventId, dancerId, status: 'going', source: 'click', visibility: 'hidden',
    }).onConflictDoNothing()
  } catch { /* the plan item is the booking that matters */ }
}

/** Confirm they're going. Returns the view, and whether this call is the one that booked it. */
export async function bookRitual(db: Db, dancerId: string, otherId: string, now = new Date()): Promise<{ view: RitualView, bookedNow: boolean } | null> {
  const before = await loadRitual(db, dancerId, otherId, now)
  if (!before) return null
  if (!before.night) throw new RitualNoNight()
  if (before.state.booked) return { view: before, bookedNow: false }
  const eventId = before.night.eventId
  await putOnPlan(db, dancerId, otherId, eventId)
  await db.insert(meetRituals).values({ dancerId, otherId, eventId, bookedAt: now }).onConflictDoNothing()
  await db.update(meetRituals).set({ bookedAt: now, updatedAt: now }).where(and(
    eq(meetRituals.dancerId, dancerId), eq(meetRituals.otherId, otherId), eq(meetRituals.eventId, eventId), isNull(meetRituals.bookedAt),
  ))
  const view = await loadRitual(db, dancerId, otherId, now)
  return view ? { view, bookedNow: true } : null
}

export async function revealRitual(db: Db, dancerId: string, otherId: string, now = new Date()): Promise<{ view: RitualView, revealedNow: boolean } | null> {
  const before = await loadRitual(db, dancerId, otherId, now)
  if (!before?.night || !before.state.booked) return null
  if (before.state.revealed) return { view: before, revealedNow: false }
  await db.update(meetRituals).set({ revealedAt: now, updatedAt: now }).where(and(
    eq(meetRituals.dancerId, dancerId), eq(meetRituals.otherId, otherId), eq(meetRituals.eventId, before.night.eventId), isNull(meetRituals.revealedAt),
  ))
  const view = await loadRitual(db, dancerId, otherId, now)
  return view ? { view, revealedNow: true } : null
}

export async function reportRitual(
  db: Db, dancerId: string, otherId: string, problem: RitualProblem, note: string | null, now = new Date(),
): Promise<RitualView | null> {
  const before = await loadRitual(db, dancerId, otherId, now)
  if (!before?.night || !before.state.booked) return null
  await db.update(meetRituals).set({ problem, note, reportedAt: now, updatedAt: now }).where(and(
    eq(meetRituals.dancerId, dancerId), eq(meetRituals.otherId, otherId), eq(meetRituals.eventId, before.night.eventId),
  ))
  return loadRitual(db, dancerId, otherId, now)
}

export async function howRitual(db: Db, dancerId: string, otherId: string, how: RitualHow, now = new Date()): Promise<RitualView | null> {
  const before = await loadRitual(db, dancerId, otherId, now)
  if (!before?.night || !before.state.booked) return null
  await db.update(meetRituals).set({ how, updatedAt: now }).where(and(
    eq(meetRituals.dancerId, dancerId), eq(meetRituals.otherId, otherId), eq(meetRituals.eventId, before.night.eventId),
  ))
  return loadRitual(db, dancerId, otherId, now)
}

export interface FollowupRun { sent: number, skipped: number, failed: number, sentTo: string[] }

/**
 * Send the morning-after email to dancers who booked and whose event has just ended.
 * One per row. Re-running is safe: email_sent_at is claimed first, and cleared if the send throws.
 */
export async function sendRitualFollowups(db: Db, opts: { siteUrl: string, now?: Date }): Promise<FollowupRun> {
  const now = opts.now ?? new Date()
  const site = opts.siteUrl.replace(/\/$/, '')
  const rows: Array<{
    id: string, dancerId: string, otherId: string, eventId: string
    email: string | null, name: string, matchEmails: boolean
    start: Date | null, end: Date | null, tz: string | null, eventName: string | null, venue: string | null
  }> = await db.select({
    id: meetRituals.id,
    dancerId: meetRituals.dancerId,
    otherId: meetRituals.otherId,
    eventId: meetRituals.eventId,
    email: dancers.email,
    name: dancers.name,
    matchEmails: dancers.matchEmails,
    start: events.startDate,
    end: events.endDate,
    tz: events.timezone,
    eventName: events.name,
    venue: events.venueName,
  }).from(meetRituals)
    .innerJoin(dancers, eq(dancers.id, meetRituals.dancerId))
    .innerJoin(events, eq(events.id, meetRituals.eventId))
    .where(and(isNotNull(meetRituals.bookedAt), isNull(meetRituals.emailSentAt)))

  const otherIds = [...new Set(rows.map(r => r.otherId))]
  const others: Array<{ id: string, name: string }> = otherIds.length
    ? await db.select({ id: dancers.id, name: dancers.name }).from(dancers).where(inArray(dancers.id, otherIds))
    : []
  const otherName = new Map(others.map(o => [o.id, o.name]))

  const run: FollowupRun = { sent: 0, skipped: 0, failed: 0, sentTo: [] }
  for (const row of rows) {
    if (!row.start) { run.skipped++; continue }
    const zone = row.tz || 'Europe/Berlin'
    const end = eventEndsAt(row.start, row.end, zone)
    if (!followupDue(end, now)) { run.skipped++; continue }
    if (ritualEmailBlock({ email: row.email, matchEmails: row.matchEmails, alreadySent: false })) { run.skipped++; continue }

    const claimed = await db.update(meetRituals).set({ emailSentAt: now }).where(and(
      eq(meetRituals.id, row.id), isNull(meetRituals.emailSentAt),
    )).returning({ id: meetRituals.id })
    if (!claimed.length) { run.skipped++; continue }

    try {
      let unsubscribeUrl: string
      try { unsubscribeUrl = matchEmailsOffUrl(row.dancerId) }
      catch (e) { throw new Error(`no unsubscribe link: ${(e as Error)?.message ?? e}`) }
      const start = new Date(row.start)
      const at = meetupAt(start, row.end ? new Date(row.end) : null, zone)
      const email = ritualFollowup({
        you: givenName(row.name) || 'there',
        other: givenName(otherName.get(row.otherId)) || 'them',
        event: row.eventName || 'the night',
        venue: row.venue || '',
        time: eventLocalTime(at, zone),
        weekday: eventLocalWeekday(at, zone),
      }, `${site}/meet/ritual?with=${row.otherId}&morning=1`, unsubscribeUrl)
      await sendRitualFollowupEmail({ to: row.email!, subject: email.subject, html: email.html, text: email.text, unsubscribeUrl })
      run.sent++
      run.sentTo.push(row.dancerId)
    } catch (e) {
      await db.update(meetRituals).set({ emailSentAt: null }).where(eq(meetRituals.id, row.id))
      run.failed++
      console.warn('[ritual] follow-up failed', (e as Error)?.message ?? e)
    }
  }
  return run
}
