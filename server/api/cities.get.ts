import { and, eq } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { profiles } from '../database/schema'
import cityImages from '../data/city-images.json'

/**
 * SSR-friendly cities directory. Mirrors trpc entity.listCities but lives as a
 * plain Nitro route so the /cities page can fetch it with useFetch during SSR
 * (the tRPC client is client-only, which is why /cities used to flash a spinner
 * on mount). Cities arrive already rendered in the HTML — instant load.
 *
 * Each row carries the city's landmark thumbnail (Wikimedia; see
 * server/data/city-images.json) so the directory cards show a photo.
 */
type CityImage = { image: string; credit: string | null; license: string | null; country?: string | null; altNames?: string[] }
const heroes = cityImages as Record<string, CityImage>

export type CityRow = {
  city: string; citySlug: string; venues: number; artists: number; organizers: number; total: number
  image: string | null; credit: string | null; license: string | null; country: string | null; altNames: string[]
}

export default defineEventHandler(async (): Promise<CityRow[]> => {
  const db = useDb()
  const rows = await db
    .select({ city: profiles.city, citySlug: profiles.citySlug, type: profiles.type })
    .from(profiles)
    .where(and(eq(profiles.status, 'visible')))

  const map = new Map<string, CityRow>()
  for (const r of rows) {
    if (!r.citySlug || !r.city) continue
    const e = map.get(r.citySlug) ?? { city: r.city, citySlug: r.citySlug, venues: 0, artists: 0, organizers: 0, total: 0, image: null, credit: null, license: null, country: null, altNames: [] }
    if (r.type === 'venue') e.venues++
    else if (r.type === 'artist') e.artists++
    else if (r.type === 'organizer') e.organizers++
    e.total++
    map.set(r.citySlug, e)
  }
  for (const e of map.values()) {
    const h = heroes[e.citySlug]
    if (h) { e.image = h.image; e.credit = h.credit; e.license = h.license; e.country = h.country ?? null; e.altNames = h.altNames ?? [] }
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
})
