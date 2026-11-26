import { eq, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { cities, profiles } from '../database/schema'
import { citySlugFor } from './myPlanFeeds'
import {
  ARTIST_EVENT_TYPES,
  ARTIST_SERVICE_AREA_MAX,
  cleanEventTypes,
  resolveServiceAreas,
  type ArtistEventType,
  type ArtistServiceArea,
} from '../../shared/utils/artistSearch'

/** Artist lists this city as somewhere they travel to (profiles.service_areas).
 *  Rows are { city, citySlug } (RAZ-1086) or { slug, name } (RAZ-1083). */
export function artistTravelsToCity(slug: string) {
  return sql`(
    ${profiles.serviceAreas} @> ${JSON.stringify([{ slug }])}::jsonb
    OR ${profiles.serviceAreas} @> ${JSON.stringify([{ citySlug: slug }])}::jsonb
  )`
}

/** Canonical English name and slug. "München" and "munich" become Munich when that city is known. */
export async function lookupArtistCity(db: any, name: string): Promise<{ city: string | null; citySlug: string | null }> {
  const trimmed = name.trim()
  if (!trimmed) return { city: null, citySlug: null }
  const slug = await citySlugFor(db, trimmed)
  if (!slug) return { city: null, citySlug: null }
  try {
    const [c] = await db.select({ name: cities.name, slug: cities.slug }).from(cities).where(eq(cities.slug, slug)).limit(1)
    if (c) return { city: c.name, citySlug: c.slug }
  } catch { /* cities table missing — keep the typed name */ }
  return { city: trimmed, citySlug: slug }
}

const serviceAreaObject = z.object({
  city: z.string().trim().max(120).optional(),
  name: z.string().trim().max(120).optional(),
  citySlug: z.string().trim().max(80).optional(),
  slug: z.string().trim().max(80).optional(),
})

export const artistDiscoveryShape = {
  eventTypes: z.array(z.enum(ARTIST_EVENT_TYPES)).max(ARTIST_EVENT_TYPES.length),
  // City names (the editor and MCP) or { city, citySlug } / { name, slug }.
  serviceAreas: z.array(z.union([
    z.string().trim().min(1).max(120),
    serviceAreaObject,
  ])).max(ARTIST_SERVICE_AREA_MAX),
}

type ServiceAreaInput = string | { city?: string | null; citySlug?: string | null; name?: string | null; slug?: string | null }

function asServiceAreaRows(areas: readonly ServiceAreaInput[]) {
  return areas.flatMap((area) => {
    if (typeof area === 'string') return area.trim() ? [{ city: area.trim() }] : []
    const city = (area.city || area.name || '').trim()
    const citySlug = (area.citySlug || area.slug || '').trim()
    if (!city && !citySlug) return []
    return [{ city: city || citySlug, ...(citySlug ? { citySlug } : {}) }]
  })
}

/**
 * Columns for an artist's event types and travel cities. Venues and organisers
 * don't have them. Empty input leaves the row unchanged.
 */
export async function artistDiscoveryFields(
  db: any,
  type: string,
  homeCity: string | null,
  input: { eventTypes?: readonly string[]; serviceAreas?: readonly ServiceAreaInput[] },
): Promise<{ eventTypes?: ArtistEventType[]; serviceAreas?: ArtistServiceArea[] }> {
  if (input.eventTypes === undefined && input.serviceAreas === undefined) return {}
  if (type !== 'artist') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only artist pages list event types and cities they travel to.' })
  }
  const set: { eventTypes?: ArtistEventType[]; serviceAreas?: ArtistServiceArea[] } = {}
  if (input.eventTypes !== undefined) set.eventTypes = cleanEventTypes(input.eventTypes)
  if (input.serviceAreas !== undefined) {
    set.serviceAreas = await resolveServiceAreas(asServiceAreaRows(input.serviceAreas), homeCity, city => lookupArtistCity(db, city))
  }
  return set
}
