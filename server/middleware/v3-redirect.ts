/**
 * Old wedance.vip (v3) links → 2026 pages. The rules live in
 * shared/utils/v3Redirect.ts; this handler only does the one database lookup a
 * rule may need (v3 event id, v3 profile handle or id, v3 city key, NFC card) and
 * answers with the redirect. Anything that isn't a v3 link passes through untouched,
 * and a lookup that finds nothing passes through too (2026 shows its 404).
 */
import { getRequestURL, sendRedirect } from 'h3'
import { sql } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { citySlugify } from '../utils/v3EventSync'
import { eventPath } from '../../shared/utils/eventSlug'
import { planV3Redirect, type V3Lookup } from '../../shared/utils/v3Redirect'
import nfcCards from '../data/v3-nfc-cards.json'
import cityImages from '../data/city-images.json'

const cards = nfcCards as Record<string, { username: string; uid: string | null }>
const cityAlt = cityImages as Record<string, { altNames?: string[] }>
const rows = (res: any): any[] => res?.rows ?? res ?? []
const looksLikeId = (s: string) => /^[A-Za-z0-9]{20,28}$/.test(s)

async function citySlug(db: ReturnType<typeof useDb>, key: string): Promise<string | null> {
  const lower = key.toLowerCase()
  // v3 city keys: "Munich", "china-shanghai", "canada-montreal" (country-city outside the first cities).
  const tries = [...new Set([citySlugify(key), lower.includes('-') ? citySlugify(lower.slice(lower.indexOf('-') + 1)) : ''])].filter(Boolean)
  for (const t of tries) {
    if (cityAlt[t]) return t
    const [hit] = rows(await db.execute(sql`select city_slug from profiles where city_slug = ${t}
      union all select city_slug from events where city_slug = ${t} limit 1`))
    if (hit) return t
  }
  for (const [slug, v] of Object.entries(cityAlt)) {
    if ((v.altNames ?? []).some(n => tries.includes(citySlugify(n)))) return slug
  }
  return null
}

async function profilePath(db: ReturnType<typeof useDb>, key: string): Promise<string | null> {
  const lower = key.toLowerCase()
  // The v3 sync stored some handles percent-encoded ("Krak%C3%B3wZouk-Fire").
  const encoded = encodeURIComponent(key).toLowerCase()
  const asId = looksLikeId(key) ? key : null
  const [page] = rows(await db.execute(sql`select username from profiles
    where lower(username) = ${lower}
       or lower(source_ref->>'v3Username') in (${lower}, ${encoded})
       or exists (select 1 from jsonb_array_elements_text(coalesce(source_ref->'oldHandles', '[]'::jsonb)) h where lower(h) = ${lower})
       or (${asId}::text is not null and (source_ref->>'firebaseId' = ${asId} or (source_ref->>'source' = 'wedance-v3' and source_ref->>'sourceId' = ${asId})))
    order by (status = 'visible') desc, (lower(username) = ${lower}) desc
    limit 1`))
  // /@handle follows renames and merges itself (entity.movedTo).
  if (page) return `/@${page.username}`
  const [dancer] = rows(await db.execute(sql`select username from dancers
    where username is not null and (lower(username) = ${lower}
       or exists (select 1 from jsonb_array_elements_text(old_usernames) h where lower(h) = ${lower})
       or (${asId}::text is not null and source_ref->>'firebaseId' = ${asId}))
    limit 1`))
  if (dancer) return `/u/${dancer.username}`
  // v3 had city profiles at /<city> too.
  const city = await citySlug(db, key)
  return city ? `/cities/${city}` : null
}

async function eventTarget(db: ReturnType<typeof useDb>, id: string): Promise<string | null> {
  const [ev] = rows(await db.execute(sql`select id, name, published, archived, city_slug from events
    where (source = 'wedance-v3' and source_id = ${id}) or source_ref->>'firebaseId' = ${id}
    order by (published and not archived) desc limit 1`))
  if (!ev) return null
  if (ev.published && !ev.archived) return eventPath({ id: ev.id, name: ev.name })
  // A past event (archived): its city is the closest live page.
  return ev.city_slug ? `/cities/${ev.city_slug}` : null
}

async function resolve(l: V3Lookup): Promise<string | null> {
  const db = useDb()
  switch (l.kind) {
    case 'event': return (await eventTarget(db, l.id)) ?? l.fallback
    case 'profile': return (await profilePath(db, l.key)) ?? l.fallback
    case 'city': { const s = await citySlug(db, l.key); return s ? `/cities/${s}` : l.fallback }
    case 'nfc': {
      const c = cards[l.card]
      if (!c) return l.fallback
      return (await profilePath(db, c.username)) || (c.uid && await profilePath(db, c.uid)) || l.fallback
    }
  }
}

export default defineEventHandler(async (event) => {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return
  const url = getRequestURL(event)
  const plan = planV3Redirect(url.pathname)
  if (!plan) return
  let to: string | null
  let code: 301 | 302 = 301
  if ('to' in plan) { to = plan.to; code = plan.code } else {
    try { to = await resolve(plan.lookup) } catch (e) {
      console.error('[v3-redirect] lookup failed', url.pathname, e)
      return
    }
  }
  if (!to || to === url.pathname) return
  return sendRedirect(event, `${to}${url.search}`, code)
})
