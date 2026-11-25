import { sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { cities, profiles } from '../database/schema'
import { slugify } from './slug'
import {
  ARTIST_EVENT_TYPES,
  ARTIST_SERVICE_AREA_MAX,
  cleanEventTypes,
  resolveServiceAreas,
  type ArtistEventType,
  type ArtistServiceArea,
} from '../../shared/utils/artistSearch'

/** Artist lists this city as somewhere they travel to (profiles.service_areas). */
export function artistTravelsToCity(slug: string) {
  return sql`exists (
    select 1 from jsonb_array_elements(coalesce(${profiles.serviceAreas}, '[]'::jsonb)) area
    where area->>'citySlug' = ${slug}
  )`
}

/** Canonical English name and slug, same fallback as a profile's home city. */
export async function lookupArtistCity(db: any, name: string): Promise<{ city: string | null; citySlug: string | null }> {
  const trimmed = name.trim()
  if (!trimmed) return { city: null, citySlug: null }
  const [c] = await db.select({ name: cities.name, slug: cities.slug }).from(cities)
    .where(sql`lower(${cities.name}) = lower(${trimmed})`).limit(1)
  return c ? { city: c.name, citySlug: c.slug } : { city: trimmed, citySlug: slugify(trimmed) }
}

export const artistDiscoveryShape = {
  eventTypes: z.array(z.enum(ARTIST_EVENT_TYPES)).max(ARTIST_EVENT_TYPES.length),
  serviceAreas: z.array(z.object({
    city: z.string().trim().min(1).max(120),
    citySlug: z.string().trim().max(80).optional(),
  })).max(ARTIST_SERVICE_AREA_MAX),
}

/**
 * Columns for an artist's event types and travel cities. Venues and organisers
 * don't have them. Empty input leaves the row unchanged.
 */
export async function artistDiscoveryFields(
  db: any,
  type: string,
  homeCity: string | null,
  input: { eventTypes?: readonly string[]; serviceAreas?: readonly { city?: string | null; citySlug?: string | null }[] },
): Promise<{ eventTypes?: ArtistEventType[]; serviceAreas?: ArtistServiceArea[] }> {
  if (input.eventTypes === undefined && input.serviceAreas === undefined) return {}
  if (type !== 'artist') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only artist pages list event types and cities they travel to.' })
  }
  const set: { eventTypes?: ArtistEventType[]; serviceAreas?: ArtistServiceArea[] } = {}
  if (input.eventTypes !== undefined) set.eventTypes = cleanEventTypes(input.eventTypes)
  if (input.serviceAreas !== undefined) {
    set.serviceAreas = await resolveServiceAreas(input.serviceAreas, homeCity, city => lookupArtistCity(db, city))
  }
  return set
}
