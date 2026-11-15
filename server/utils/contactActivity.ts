import { sql } from 'drizzle-orm'
import { summariseActivity, EMPTY_ACTIVITY, EVENT_FILTER_PAST_DAYS, type ActivitySignal, type ContactActivity } from '../../shared/utils/contactSegments'
import { UNCONFIRMED_TTL_HOURS } from '../../shared/utils/rsvp'

/**
 * What dancers do on WeDance around a page (RAZ-949): every account that follows
 * it or signed up for one of its events — its contacts' accounts
 * (`profile_contacts.dancer_id`) and, since RAZ-963, the rest of its audience
 * too. Guests and ticket buyers without an account have no dancer id and are
 * left out. Only facts about the page itself:
 * whether they follow it, and their Going / RSVP / check-in on the page's
 * events — the events it hosts, organises, is the venue of or co-organises.
 * Nothing about other pages' events. Two queries for the whole list.
 */
export async function loadContactActivity(db: any, page: { id: string, username: string }, now = new Date()): Promise<{ byDancer: Map<string, ContactActivity>, followers: number }> {
  const co = JSON.stringify([{ username: page.username }])
  const signalsRes: any = await db.execute(sql`
    with ev as (
      -- Stored as UTC without a zone: hand it on as an ISO string in UTC.
      select id, name, to_char(start_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_date from events
      where host_profile_id = ${page.id} or organizer_username = ${page.username} or venue_username = ${page.username}
         or co_organizers @> ${co}::jsonb
    )
    select a.dancer_id, ev.id as event_id, ev.name, ev.start_date, 'attendance' as kind, a.status as detail, to_char(a.checked_in_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as checked_in_at
      from attendances a join ev on ev.id = a.event_id where a.dancer_id is not null
    union all
    select r.dancer_id, ev.id, ev.name, ev.start_date, 'rsvp', r.answer, null
      from event_rsvps r join ev on ev.id = r.event_id where r.dancer_id is not null
    union all
    select p.dancer_id, ev.id, ev.name, ev.start_date, 'plan', null, null
      from plan_items p join ev on ev.id::text = p.item_id where p.item_type = 'event'
  `)
  const followsRes: any = await db.execute(sql`
    select dancer_id, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at from follows where profile_id = ${page.id}
  `)
  const signals: any[] = signalsRes.rows ?? signalsRes
  const followRows: any[] = followsRes.rows ?? followsRes

  const byDancerSignals = new Map<string, ActivitySignal[]>()
  for (const r of signals) {
    const list = byDancerSignals.get(r.dancer_id) ?? []
    list.push({ eventId: r.event_id, name: r.name, startDate: r.start_date, kind: r.kind, detail: r.detail, checkedInAt: r.checked_in_at })
    byDancerSignals.set(r.dancer_id, list)
  }
  const followedAt = new Map<string, { at: string | Date | null }>(followRows.map(r => [r.dancer_id, { at: r.created_at ?? null }]))
  const byDancer = new Map<string, ContactActivity>()
  for (const id of new Set([...byDancerSignals.keys(), ...followedAt.keys()])) {
    byDancer.set(id, summariseActivity(byDancerSignals.get(id) ?? [], followedAt.get(id), now))
  }
  return { byDancer, followers: followRows.length }
}

export const activityFor = (m: Map<string, ContactActivity>, dancerId: string | null | undefined): ContactActivity =>
  (dancerId && m.get(dancerId)) || EMPTY_ACTIVITY

// Columns are UTC timestamps without a zone: compare with a UTC literal.
const utc = (d: Date) => sql`(${d.toISOString()}::timestamptz at time zone 'UTC')`

export interface PageEventOption { id: string, name: string, startDate: string, timezone: string | null, coming: number }

/**
 * The page's events the Contacts page can filter by: published, from
 * EVENT_FILTER_PAST_DAYS back to 120 days ahead, with how many people signed up
 * (Going!, a poll answer other than "Next time" — signed out ones while they
 * count — or a ticket; a guest counts once). Only events someone signed up for.
 */
export async function loadPageEvents(db: any, page: { id: string, username: string }, now = new Date()): Promise<PageEventOption[]> {
  const co = JSON.stringify([{ username: page.username }])
  const from = new Date(now.getTime() - EVENT_FILTER_PAST_DAYS * 86_400_000)
  const to = new Date(now.getTime() + 120 * 86_400_000)
  const fresh = new Date(now.getTime() - UNCONFIRMED_TTL_HOURS * 3_600_000)
  const res: any = await db.execute(sql`
    with ev as (
      select id, name, start_date, timezone from events
      where (host_profile_id = ${page.id} or organizer_username = ${page.username} or venue_username = ${page.username}
         or co_organizers @> ${co}::jsonb)
        and published and not archived and start_date >= ${utc(from)} and start_date < ${utc(to)}
    ), who as (
      select a.event_id, coalesce(a.dancer_id::text, 'buyer:' || a.buyer_email) as who from attendances a
        join ev on ev.id = a.event_id where a.status in ('going', 'ticket_holder')
      union
      select r.event_id, coalesce(r.dancer_id::text, 'guest:' || r.guest_token) from event_rsvps r
        join ev on ev.id = r.event_id where r.answer <> 'next' and (r.confirmed_at is not null or r.updated_at > ${utc(fresh)})
      union
      select ev.id, p.dancer_id::text from plan_items p join ev on ev.id::text = p.item_id where p.item_type = 'event'
    )
    select ev.id, ev.name, to_char(ev.start_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_date, ev.timezone, count(who.who)::int as coming
      from ev join who on who.event_id = ev.id
      group by ev.id, ev.name, ev.start_date, ev.timezone
      order by ev.start_date
      limit 60
  `)
  const rows: any[] = res.rows ?? res
  return rows.map(r => ({ id: r.id, name: r.name || 'Event', startDate: r.start_date, timezone: r.timezone ?? null, coming: Number(r.coming) }))
}
