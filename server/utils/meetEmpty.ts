/**
 * An empty "Meet new friends" deck (RAZ-1002): you want to meet dancers — so do
 * we, so here is one thing to do about it, picked by what your city has:
 *
 *   nights      nights out in the next two weeks → be the first to sign up
 *   organisers  none posted, but organisers ran nights here → get them to post the next one
 *   venues      no organisers, but places people dance → find who runs nights there
 *   nothing     nothing listed yet → ask locals where they dance
 *   no-city     we don't know your city → add it
 *
 * Only reads public listings (events, business pages); nobody is contacted from here.
 */
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, notInArray, sql } from 'drizzle-orm'
import { eventRsvps, events, profiles } from '../database/schema'
import { eventPath } from '../../shared/utils/eventSlug'
import { notMerged } from './profileDupes'
import { GOING_OUT_DAYS, NON_SOCIAL_TYPES } from './myPlanFeeds'

type Db = any
const DAY = 86400_000
/** How far back an organiser's nights count as "runs nights here". */
const ORGANISER_DAYS = 365

export type MeetEmptyStage = 'nights' | 'organisers' | 'venues' | 'nothing' | 'no-city'
export type MeetEmptyNight = { id: string; name: string; path: string; startISO: string; timezone: string | null; venue: string; going: number }
export type MeetEmptyPage = { username: string; name: string; photo: string | null; nights: number }
export type MeetEmpty = { stage: MeetEmptyStage; citySlug: string; nights: MeetEmptyNight[]; organisers: MeetEmptyPage[]; venues: MeetEmptyPage[] }

/** Which next step to offer, from what the city has. Pure, for tests. */
export function meetEmptyStage(citySlug: string, counts: { nights: number; organisers: number; venues: number }): MeetEmptyStage {
  if (!citySlug) return 'no-city'
  if (counts.nights) return 'nights'
  if (counts.organisers) return 'organisers'
  if (counts.venues) return 'venues'
  return 'nothing'
}

const live = () => and(eq(events.published, true), eq(events.archived, false), isNull(events.cancelledAt))

export async function meetEmpty(db: Db, citySlug: string, now = new Date()): Promise<MeetEmpty> {
  const empty: MeetEmpty = { stage: meetEmptyStage(citySlug, { nights: 0, organisers: 0, venues: 0 }), citySlug, nights: [], organisers: [], venues: [] }
  if (!citySlug) return empty

  // Nights out in the next two weeks, soonest first, with how many are going.
  const rows: any[] = await db
    .select({ id: events.id, name: events.name, startDate: events.startDate, timezone: events.timezone, venueName: events.venueName })
    .from(events)
    .where(and(
      eq(events.citySlug, citySlug),
      live(),
      ne(events.isFestival, true),
      notInArray(sql`coalesce(${events.type}, '')`, NON_SOCIAL_TYPES),
      gte(sql`coalesce(${events.endDate}, ${events.startDate})`, now),
      lt(events.startDate, new Date(now.getTime() + GOING_OUT_DAYS * DAY)),
    ))
    .orderBy(asc(events.startDate))
    .limit(3)
  const goingRows: any[] = rows.length
    ? await db.select({ eventId: eventRsvps.eventId, n: sql<number>`count(*)::int` }).from(eventRsvps)
      .where(and(inArray(eventRsvps.eventId, rows.map(r => r.id)), ne(eventRsvps.answer, 'next'), isNotNull(eventRsvps.confirmedAt)))
      .groupBy(eventRsvps.eventId)
    : []
  const going = new Map<string, number>(goingRows.map(r => [r.eventId, Number(r.n)]))
  const nights: MeetEmptyNight[] = rows.filter(r => r.startDate).map(r => ({
    id: r.id, name: r.name ?? 'Night out', path: eventPath({ id: r.id, name: r.name }),
    startISO: new Date(r.startDate).toISOString(), timezone: r.timezone ?? null, venue: r.venueName ?? '', going: going.get(r.id) ?? 0,
  }))
  if (nights.length) return { ...empty, stage: 'nights', nights }

  // Organisers who ran nights here in the last year, most nights first.
  const pageCols = { username: profiles.username, name: profiles.name, photo: profiles.photo }
  const organisers: MeetEmptyPage[] = (await db
    .select({ ...pageCols, nights: sql<number>`count(${events.id})::int` })
    .from(events)
    .innerJoin(profiles, eq(profiles.username, events.organizerUsername))
    .where(and(
      eq(events.citySlug, citySlug),
      eq(events.published, true),
      gte(events.startDate, new Date(now.getTime() - ORGANISER_DAYS * DAY)),
      eq(profiles.status, 'visible'),
      notMerged,
    ))
    .groupBy(profiles.username, profiles.name, profiles.photo)
    .orderBy(desc(sql`count(${events.id})`))
    .limit(3)).map((r: any) => ({ ...r, nights: Number(r.nights) }))
  if (organisers.length) return { ...empty, stage: 'organisers', organisers }

  // Places people dance here: venue pages in the city, the ones with the most nights first.
  const venues: MeetEmptyPage[] = (await db
    .select({ ...pageCols, nights: sql<number>`count(${events.id})::int` })
    .from(profiles)
    .leftJoin(events, eq(events.venueUsername, profiles.username))
    .where(and(eq(profiles.type, 'venue'), eq(profiles.citySlug, citySlug), eq(profiles.status, 'visible'), notMerged))
    .groupBy(profiles.username, profiles.name, profiles.photo)
    .orderBy(desc(sql`count(${events.id})`), asc(profiles.name))
    .limit(3)).map((r: any) => ({ ...r, nights: Number(r.nights) }))
  if (venues.length) return { ...empty, stage: 'venues', venues }

  return { ...empty, stage: 'nothing' }
}
