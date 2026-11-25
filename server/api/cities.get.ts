import { eq } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { profiles } from '../database/schema'
import { tallyCities } from '../../shared/utils/serviceAreas'
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
    .select({ city: profiles.city, citySlug: profiles.citySlug, type: profiles.type, serviceAreas: profiles.serviceAreas })
    .from(profiles)
    .where(eq(profiles.status, 'visible'))

  // An artist counts in the home city and in each city they travel to.
  return tallyCities(rows).map((e): CityRow => {
    const h = heroes[e.citySlug]
    return {
      ...e,
      image: h?.image ?? null,
      credit: h?.credit ?? null,
      license: h?.license ?? null,
      country: h?.country ?? null,
      altNames: h?.altNames ?? [],
    }
  })
})
