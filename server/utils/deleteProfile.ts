/**
 * Deleting a business page (RAZ-944). Meant for a page made by mistake: only a
 * page nothing else uses can be deleted. Once events, bookings, reviews, gigs,
 * merges or a city use it, deleting would break them, so the owner merges it
 * into their other page instead (business.merge).
 *
 * A page that came from wedance.vip (the v4 import or the v3 sync) is never
 * deleted: the next sync would bring it back. Merge it instead.
 *
 * What goes with the page: its team, followers, website, Instagram connection,
 * contacts, claims and suggestions (they CASCADE, or are deleted here when the
 * foreign key doesn't). A dancer whose own public page it was keeps their account
 * (dancers.page_profile_id → null). The handle is free again.
 */
import { sql } from 'drizzle-orm'

export type PageUse = { key: string; label: string; count: number }
export type PageLoss = { followers: number; team: number; instagram: boolean; website: boolean }

type Page = { id: string; username: string; sourceRef?: Record<string, any> | null }

// Everything that stops a delete. `single`/`plural` read as "It has 3 events".
const USES: { key: string; single: string; plural: string; query: (p: Page) => any }[] = [
  {
    key: 'events', single: 'event', plural: 'events',
    query: p => sql`select count(*)::int as n from events where host_profile_id = ${p.id} or venue_username = ${p.username}
      or organizer_username = ${p.username} or artists::jsonb ? ${p.username}
      or co_organizers @> ${JSON.stringify([{ username: p.username }])}::jsonb`,
  },
  { key: 'reviews', single: 'review', plural: 'reviews', query: p => sql`select count(*)::int as n from reviews where target_slug = ${p.username} and target_type in ('venue', 'artist', 'organizer')` },
  { key: 'rooms', single: 'room', plural: 'rooms', query: p => sql`select count(*)::int as n from bookable_spaces where profile_id = ${p.id}` },
  { key: 'bookings', single: 'booking request', plural: 'booking requests', query: p => sql`select count(*)::int as n from booking_requests where profile_id = ${p.id} or organizer_id = ${p.id}` },
  { key: 'inquiries', single: 'booking inquiry', plural: 'booking inquiries', query: p => sql`select count(*)::int as n from booking_inquiries where profile_id = ${p.id}` },
  { key: 'requests', single: 'request', plural: 'requests', query: p => sql`select count(*)::int as n from inbound_requests where profile_id = ${p.id}` },
  { key: 'gigs', single: 'gig', plural: 'gigs', query: p => sql`select count(*)::int as n from gigs where poster_profile_id = ${p.id}` },
  { key: 'gigApplications', single: 'gig application', plural: 'gig applications', query: p => sql`select count(*)::int as n from gig_applications where profile_id = ${p.id}` },
  { key: 'elections', single: 'moderator election', plural: 'moderator elections', query: p => sql`select count(*)::int as n from moderator_elections where profile_id = ${p.id}` },
  { key: 'guidelines', single: 'guideline version', plural: 'guideline versions', query: p => sql`select count(*)::int as n from guideline_versions where profile_id = ${p.id}` },
  { key: 'giveaways', single: 'giveaway proposal', plural: 'giveaway proposals', query: p => sql`select count(*)::int as n from giveaway_proposals where profile_id = ${p.id}` },
  { key: 'subscriptions', single: 'subscription', plural: 'subscriptions', query: p => sql`select count(*)::int as n from organizer_subscriptions where profile_id = ${p.id}` },
  { key: 'cityPage', single: 'WeDance city it runs', plural: 'WeDance cities it runs', query: p => sql`select count(*)::int as n from city_pages where profile_id = ${p.id}` },
  { key: 'channels', single: 'city channel', plural: 'city channels', query: p => sql`select count(*)::int as n from community_groups where profile_id = ${p.id}` },
  {
    key: 'merges', single: 'merge', plural: 'merges',
    query: p => sql`select ((select count(*) from profile_merges where to_profile_id = ${p.id} or from_profile_id = ${p.id})
      + (select count(*) from profiles where source_ref->>'mergedInto' = ${p.username}))::int as n`,
  },
]

const rowsOf = (r: any) => ((r?.rows ?? r) as any[])
// A table this database doesn't have (some never reached production): nothing uses the page there.
const missingTable = (e: any) => (e?.code ?? e?.cause?.code) === '42P01'

async function count(db: any, query: any) {
  try {
    return Number(rowsOf(await db.execute(query))[0]?.n ?? 0)
  } catch (e) {
    if (missingTable(e)) return 0
    throw e
  }
}

/** A page from wedance.vip (v4 import / v3 sync) would come back on the next sync. */
export function fromWedanceVip(sourceRef: Record<string, any> | null | undefined) {
  const s = sourceRef ?? {}
  return s.source === 'wedance-v3' || !!s.firebaseId || !!s.v4ProfileId
}

/** What uses this page (stops a delete), and what goes with it. */
export async function pageUsage(db: any, p: Page): Promise<{ uses: PageUse[]; loses: PageLoss; fromWedanceVip: boolean }> {
  const uses: PageUse[] = []
  for (const u of USES) {
    const n = await count(db, u.query(p))
    if (n > 0) uses.push({ key: u.key, count: n, label: `${n} ${n === 1 ? u.single : u.plural}` })
  }
  const [followers, team, instagram, website] = await Promise.all([
    count(db, sql`select count(*)::int as n from follows where profile_id = ${p.id}`),
    count(db, sql`select count(*)::int as n from profile_members where profile_id = ${p.id}`),
    count(db, sql`select count(*)::int as n from instagram_connections where profile_id = ${p.id}`),
    count(db, sql`select count(*)::int as n from profile_sites where profile_id = ${p.id}`),
  ])
  return { uses, loses: { followers, team, instagram: instagram > 0, website: website > 0 }, fromWedanceVip: fromWedanceVip(p.sourceRef) }
}

/** Why this page can't be deleted, in a sentence — or null when it can. */
export function deleteBlocker(u: { uses: PageUse[]; fromWedanceVip: boolean }) {
  if (u.fromWedanceVip) return 'This page comes from wedance.vip, so it would come back. Merge it into your other page instead.'
  if (!u.uses.length) return null
  const list = u.uses.map(x => x.label)
  const said = list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`
  return `It has ${said}. Merge it into your other page instead, so they move along.`
}

/**
 * Delete the page. Callers check deleteBlocker first; follows have no CASCADE in
 * production, so they go here. Everything else is removed by its foreign key.
 */
export async function deleteProfile(db: any, p: Page) {
  await db.execute(sql`delete from follows where profile_id = ${p.id}`)
  const r = rowsOf(await db.execute(sql`delete from profiles where id = ${p.id} returning id`))
  return r.length > 0
}
