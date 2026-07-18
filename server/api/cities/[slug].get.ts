import { and, eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { profiles } from '../../database/schema'
import cityImages from '../../data/city-images.json'

type CityHero = { image: string; credit: string | null; license: string | null; licenseUrl: string | null; source: string; country?: string | null }
const heroes = cityImages as Record<string, CityHero>

/**
 * SSR-friendly city directory. Mirrors trpc entity.cityDirectory but as a plain
 * Nitro route so /cities/[city] can render its people + an intent-first,
 * data-driven <title> during SSR (the tRPC client is client-only).
 *
 * topStyles = the most common dance styles among this city's profiles, so the
 * page title reads e.g. "Salsa, Bachata & Kizomba in Munich …" — matching how
 * dancers actually search (by style), truthfully per city.
 */
type Person = { username: string | null; name: string | null; photo: string | null; styles: string[] }
export type CityDirectory = {
  city: string | null
  citySlug: string
  venues: Person[]
  artists: Person[]
  organizers: Person[]
  topStyles: string[]
  hero: CityHero | null
  country: string | null
}

export default defineEventHandler(async (event): Promise<CityDirectory> => {
  const citySlug = getRouterParam(event, 'slug') ?? ''
  const db = useDb()
  const rows = await db
    .select({
      username: profiles.username,
      name: profiles.name,
      photo: profiles.photo,
      type: profiles.type,
      styles: profiles.styles,
      city: profiles.city,
    })
    .from(profiles)
    .where(and(eq(profiles.citySlug, citySlug), eq(profiles.status, 'visible')))

  const city = rows.find(r => r.city)?.city ?? null
  const pick = (t: string): Person[] =>
    rows.filter(r => r.type === t).map(({ username, name, photo, styles }) => ({ username, name, photo, styles: styles ?? [] }))

  // Style frequency across every profile in the city → top 3, first-seen casing.
  const counts = new Map<string, { label: string; n: number }>()
  for (const r of rows) {
    for (const s of r.styles ?? []) {
      const key = s.trim().toLowerCase()
      if (!key) continue
      const e = counts.get(key) ?? { label: s.trim(), n: 0 }
      e.n++
      counts.set(key, e)
    }
  }
  const topStyles = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 3).map(e => e.label)

  const hero = heroes[citySlug] ?? null
  return { city, citySlug, venues: pick('venue'), artists: pick('artist'), organizers: pick('organizer'), topStyles, hero, country: hero?.country ?? null }
})
