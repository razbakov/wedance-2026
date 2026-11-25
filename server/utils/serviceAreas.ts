import { and, eq, or, sql } from 'drizzle-orm'
import { cities, profiles } from '../database/schema'
import { citySlugFor } from './myPlanFeeds'
import { withoutHomeCity, type ServiceArea } from '../../shared/utils/serviceAreas'

/**
 * SQL twin of `listedInCity` (shared/utils/serviceAreas.ts): home city, or an
 * artist whose service area includes this slug. Bind the slug — never interpolate it.
 */
export function profileInCity(citySlug: string) {
  return or(
    eq(profiles.citySlug, citySlug),
    and(
      eq(profiles.type, 'artist'),
      sql`${profiles.serviceAreas} @> ${JSON.stringify([{ slug: citySlug }])}::jsonb`,
    ),
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

/**
 * Turn typed city names into canonical service areas. "München" and "munich"
 * become { slug: "munich", name: "Munich" } when that city is known. The home
 * city is left out — the artist is already listed there.
 */
export async function resolveServiceAreas(
  db: any,
  names: readonly string[],
  home: { slugs: readonly (string | null | undefined)[]; name: string | null | undefined },
): Promise<ServiceArea[]> {
  const resolved: ServiceArea[] = []
  for (const raw of names) {
    const typed = raw.trim().replace(/\s+/g, ' ')
    if (!typed) continue
    const slug = await citySlugFor(db, typed)
    if (!slug) continue
    let area: ServiceArea = { slug, name: typed }
    try {
      const [c] = await db.select({ name: cities.name, slug: cities.slug }).from(cities).where(eq(cities.slug, slug)).limit(1)
      if (c) area = { slug: c.slug, name: c.name }
    } catch { /* cities table missing — keep the typed name */ }
    resolved.push(area)
  }
  return withoutHomeCity(resolved, home.slugs, home.name)
}
