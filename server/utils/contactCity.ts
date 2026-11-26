/**
 * Match a city typed on a site sign-up to the cities table (RAZ-1093).
 * The typed words are always kept; this only fills city_id when one city fits.
 */
import { or, sql } from 'drizzle-orm'
import { cities } from '../database/schema'
import { matchCity, type CityRow } from '../../shared/utils/contactCity'

export async function findContactCityId(db: any, text: string): Promise<string | null> {
  const q = text.trim()
  if (!q) return null
  const rows: CityRow[] = await db.select({
    id: cities.id, name: cities.name, localName: cities.localName, slug: cities.slug, altNames: cities.altNames,
  }).from(cities).where(or(
    sql`lower(${cities.name}) = lower(${q})`,
    sql`lower(${cities.localName}) = lower(${q})`,
    sql`lower(${cities.slug}) = lower(${q})`,
    sql`exists (select 1 from jsonb_array_elements_text(${cities.altNames}) a where lower(a) = lower(${q}))`,
  ))
  return matchCity(q, rows)?.id ?? null
}
