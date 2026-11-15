import { sql } from 'drizzle-orm'
import { summariseActivity, EMPTY_ACTIVITY, type ActivitySignal, type ContactActivity } from '../../shared/utils/contactSegments'

/**
 * What a page's contacts do on WeDance (RAZ-949), for contacts linked to an
 * account (`profile_contacts.dancer_id`). Only facts about the page itself:
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
    ), ppl as (
      select distinct dancer_id from profile_contacts where profile_id = ${page.id} and dancer_id is not null
    )
    select a.dancer_id, ev.id as event_id, ev.name, ev.start_date, 'attendance' as kind, a.status as detail, to_char(a.checked_in_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as checked_in_at
      from attendances a join ev on ev.id = a.event_id where a.dancer_id in (select dancer_id from ppl)
    union all
    select r.dancer_id, ev.id, ev.name, ev.start_date, 'rsvp', r.answer, null
      from event_rsvps r join ev on ev.id = r.event_id where r.dancer_id in (select dancer_id from ppl)
    union all
    select p.dancer_id, ev.id, ev.name, ev.start_date, 'plan', null, null
      from plan_items p join ev on ev.id::text = p.item_id where p.item_type = 'event' and p.dancer_id in (select dancer_id from ppl)
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
