import { and, eq, or } from 'drizzle-orm'
import { cities, profiles } from '../database/schema'
import { artistTravelsToCity } from './artistAreas'

/**
 * SQL twin of `listedInCity` (shared/utils/serviceAreas.ts): home city, or an
 * artist whose service area includes this slug. Bind the slug — never interpolate it.
 */
export function profileInCity(citySlug: string) {
  return or(
    eq(profiles.citySlug, citySlug),
    and(eq(profiles.type, 'artist'), artistTravelsToCity(citySlug)),
  )
}

/** Canonical English name for a city slug, when the cities table has it. */
export async function canonicalCityName(db: any, citySlug: string): Promise<string | null> {
  try {
    const [c] = await db.select({ name: cities.name }).from(cities).where(eq(cities.slug, citySlug)).limit(1)
    return c?.name ?? null
  } catch {
    return null
  }
}
