/**
 * Your year in dance (RAZ-966): the past nights of a year a dancer was going
 * to, read from what they did on WeDance — never from mock or preview data
 * (only real `events` rows and `festivals` rows are joined, so a mock id in a
 * plan never resolves).
 *
 * A night counts when the dancer:
 *  - put the event in their plan (Going!, plan_items type 'event');
 *  - has an attendance on it (going / ticket holder);
 *  - answered the event poll with anything but "next time", confirmed;
 *  - shared it in a weekend (/w/<code>) or said "I'm in" on a friend's;
 *  - put a festival in their year plan (plan_items type 'festival').
 * Only events that started in that year and before `now`, and weren't cancelled.
 * The screens are built from these in `shared/utils/yearReview.ts`.
 */
import { and, eq, gte, inArray, isNotNull, isNull, lt, ne, sql } from 'drizzle-orm'
import {
  attendances, dancers, eventRsvps, events, festivals, planItems, profiles, weekendShareJoins, weekendShares,
} from '../database/schema'
import { buildYearReview, type YearNight, type YearReview } from '../../shared/utils/yearReview'
import { festivalPlanSlugs, isClassType } from './myPlanFeeds'

type Db = any

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FESTIVAL_TYPES = ['Festival', 'Congress', 'Weekender']

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

/** Every event id this dancer was going to, from every place a "yes" lives. */
async function goingEventIds(db: Db, dancerId: string): Promise<{ ids: string[]; classIds: Set<string> }> {
  const [plan, att, rsvp, shared, joined] = await Promise.all([
    db.select({ id: planItems.itemId, metadata: planItems.metadata }).from(planItems)
      .where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'event'))),
    db.select({ id: attendances.eventId }).from(attendances)
      .where(and(eq(attendances.dancerId, dancerId), inArray(attendances.status, ['going', 'ticket_holder']))),
    db.select({ id: eventRsvps.eventId }).from(eventRsvps)
      .where(and(eq(eventRsvps.dancerId, dancerId), ne(eventRsvps.answer, 'next'), isNotNull(eventRsvps.confirmedAt))),
    db.select({ ids: weekendShares.eventIds }).from(weekendShares).where(eq(weekendShares.dancerId, dancerId)),
    db.select({ id: weekendShareJoins.eventId }).from(weekendShareJoins).where(eq(weekendShareJoins.dancerId, dancerId)),
  ])
  const classIds = new Set<string>(
    plan.filter((p: any) => (p.metadata as Record<string, string> | null)?.type === 'class').map((p: any) => p.id),
  )
  const ids = new Set<string>([
    ...plan.map((p: any) => p.id),
    ...att.map((a: any) => a.id),
    ...rsvp.map((r: any) => r.id),
    ...shared.flatMap((s: any) => (s.ids as string[] | null) ?? []),
    ...joined.map((j: any) => j.id),
  ].filter((id): id is string => typeof id === 'string' && UUID_RE.test(id)))
  return { ids: [...ids], classIds }
}

/** The dancer's nights of `year` that are already over. */
export async function yearNights(db: Db, dancerId: string, year: number, now = new Date()): Promise<YearNight[]> {
  const from = new Date(Date.UTC(year, 0, 1))
  const to = new Date(Math.min(Date.UTC(year + 1, 0, 1), now.getTime()))
  const nights: YearNight[] = []

  const { ids, classIds } = await goingEventIds(db, dancerId)
  const festivalNames = new Set<string>()
  if (ids.length) {
    const rows = await db
      .select({
        id: events.id,
        name: events.name,
        type: events.type,
        isFestival: events.isFestival,
        startDate: events.startDate,
        endDate: events.endDate,
        city: events.city,
        country: events.country,
        styles: events.styles,
        venueName: events.venueName,
        venueProfileName: profiles.name,
      })
      .from(events)
      .leftJoin(profiles, eq(profiles.username, events.venueUsername))
      .where(and(
        inArray(events.id, ids),
        gte(events.startDate, from),
        lt(events.startDate, to),
        isNull(events.cancelledAt),
      ))
    for (const e of rows) {
      const kind = e.isFestival || FESTIVAL_TYPES.includes(e.type ?? '')
        ? 'festival'
        : isClassType(e.type) || classIds.has(e.id) ? 'class' : 'social'
      if (kind === 'festival') festivalNames.add((e.name ?? '').trim().toLowerCase())
      nights.push({
        id: e.id,
        kind,
        name: (e.name ?? '').trim(),
        start: (e.startDate as Date).toISOString(),
        end: e.endDate ? (e.endDate as Date).toISOString() : null,
        city: e.city,
        country: e.country,
        styles: (e.styles as string[] | null) ?? [],
        venue: e.venueProfileName || e.venueName,
      })
    }
  }

  // Festivals from the year plan: a real festival row (mock slugs don't resolve), started this year, before now.
  const planned = await db.select({ slug: planItems.itemId }).from(planItems)
    .where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'festival')))
  // Only real festivals, as My plan counts them (RAZ-983: a workshop saved from its page is not one).
  const slugs = [...await festivalPlanSlugs(db, planned.map((p: any) => p.slug as string).filter(Boolean))]
  if (slugs.length) {
    const rows = await db
      .select({ slug: festivals.slug, name: festivals.name, startDate: festivals.startDate, endDate: festivals.endDate, city: festivals.city, country: festivals.country, styles: festivals.styles })
      .from(festivals)
      .where(and(inArray(festivals.slug, slugs), gte(festivals.startDate, isoDay(from)), lt(festivals.startDate, isoDay(to))))
    for (const f of rows) {
      // The same festival can also be an event row the dancer said yes to: count it once.
      if (festivalNames.has(f.name.trim().toLowerCase())) continue
      nights.push({
        id: `festival:${f.slug}`,
        kind: 'festival',
        name: f.name,
        start: f.startDate as string,
        end: (f.endDate as string | null) ?? null,
        city: f.city,
        country: f.country,
        styles: (f.styles as string[] | null) ?? [],
        venue: null,
      })
    }
  }
  return nights
}

/** Distinct friends who said "I'm in" on a weekend this dancer shared during `year`. */
async function friendsJoined(db: Db, dancerId: string, year: number): Promise<number> {
  const rows = await db
    .select({ dancerId: weekendShareJoins.dancerId, guestToken: weekendShareJoins.guestToken, name: weekendShareJoins.name })
    .from(weekendShareJoins)
    .innerJoin(weekendShares, eq(weekendShares.id, weekendShareJoins.shareId))
    .where(and(
      eq(weekendShares.dancerId, dancerId),
      gte(weekendShareJoins.createdAt, new Date(Date.UTC(year, 0, 1))),
      lt(weekendShareJoins.createdAt, new Date(Date.UTC(year + 1, 0, 1))),
    ))
  const people = new Set(rows
    .filter((r: any) => r.dancerId !== dancerId)
    .map((r: any) => r.dancerId ?? `guest:${r.guestToken}`))
  return people.size
}

/** Real festivals already in the plan for `year`. */
async function festivalsPlannedFor(db: Db, dancerId: string, year: number): Promise<number> {
  const planned = await db.select({ slug: planItems.itemId }).from(planItems)
    .where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'festival')))
  const slugs = [...await festivalPlanSlugs(db, planned.map((p: any) => p.slug as string).filter(Boolean))]
  if (!slugs.length) return 0
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(festivals)
    .where(and(
      inArray(festivals.slug, slugs),
      gte(festivals.startDate, `${year}-01-01`),
      lt(festivals.startDate, `${year + 1}-01-01`),
    ))
  return Number(row?.n ?? 0)
}

export async function yearReviewFor(db: Db, dancerId: string, year: number, now = new Date()): Promise<YearReview> {
  const [[me], nights, friends, planned] = await Promise.all([
    db.select({ name: dancers.name }).from(dancers).where(eq(dancers.id, dancerId)),
    yearNights(db, dancerId, year, now),
    friendsJoined(db, dancerId, year),
    festivalsPlannedFor(db, dancerId, year + 1),
  ])
  return buildYearReview({ year, name: (me?.name as string | null) ?? '', nights, friendsJoined: friends, nextYearFestivals: planned })
}
