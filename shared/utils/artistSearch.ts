/**
 * Artist discovery filters (RAZ-1086): name, dance style, event type
 * (wedding, birthday, corporate) and service area. A service area matches
 * the artist's home city or a city they travel to.
 */
import { citySlug, normalizeCity } from './citySearch'
import { sameDanceStyle } from '../dance-styles'

export const ARTIST_EVENT_TYPES = ['wedding', 'birthday', 'corporate'] as const
export type ArtistEventType = (typeof ARTIST_EVENT_TYPES)[number]

export const ARTIST_EVENT_TYPE_LABELS: Record<ArtistEventType, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  corporate: 'Corporate',
}

export const ARTIST_SERVICE_AREA_MAX = 20

export type ArtistServiceArea = { city: string; citySlug: string }

export type ArtistSearchRecord = {
  name: string
  city?: string | null
  citySlug?: string | null
  styles?: readonly string[] | null
  eventTypes?: readonly string[] | null
  serviceAreas?: readonly { city?: string | null; citySlug?: string | null; name?: string | null; slug?: string | null }[] | null
}

export type ArtistSearchFilters = {
  query?: string
  style?: string
  eventType?: string
  /** City name or slug. Home city or a listed travel city. */
  serviceArea?: string
}

export function normalizeArtistEventType(value: string | null | undefined): ArtistEventType | null {
  const key = String(value ?? '').trim().toLowerCase()
  return (ARTIST_EVENT_TYPES as readonly string[]).includes(key) ? key as ArtistEventType : null
}

export function artistEventTypeLabel(value: string): string {
  const type = normalizeArtistEventType(value)
  return type ? ARTIST_EVENT_TYPE_LABELS[type] : value.trim()
}

/** Wedding, birthday, corporate — once each, in that order. Anything else is dropped. */
export function cleanEventTypes(values: readonly string[]): ArtistEventType[] {
  const found = new Set<ArtistEventType>()
  for (const value of values) {
    const type = normalizeArtistEventType(value)
    if (type) found.add(type)
  }
  return ARTIST_EVENT_TYPES.filter(type => found.has(type))
}

function samePlace(city: string | null | undefined, slug: string | null | undefined, wantName: string, wantSlug: string): boolean {
  if (slug && (slug === wantSlug || slug === wantName)) return true
  if (city && (normalizeCity(city) === wantName || citySlug(city) === wantSlug)) return true
  return false
}

/** True when this artist is based in the area or lists it as a city they travel to. */
export function artistServesArea(artist: ArtistSearchRecord, area: string): boolean {
  const wantSlug = citySlug(area)
  const wantName = normalizeCity(area)
  if (!wantSlug && !wantName) return true
  if (samePlace(artist.city, artist.citySlug, wantName, wantSlug)) return true
  return (artist.serviceAreas ?? []).some(a => samePlace(a.city || a.name, a.citySlug || a.slug, wantName, wantSlug))
}

/** True when the area is somewhere they travel to, not the city on their page. */
export function artistTravelsTo(artist: ArtistSearchRecord, area: string): boolean {
  const wantSlug = citySlug(area)
  if (!wantSlug || !artistServesArea(artist, area)) return false
  const home = artist.citySlug || (artist.city ? citySlug(artist.city) : '')
  return !!home && home !== wantSlug
}

export function artistMatchesSearch(artist: ArtistSearchRecord, filters: ArtistSearchFilters): boolean {
  const query = (filters.query ?? '').trim().toLowerCase()
  if (query && !artist.name.toLowerCase().includes(query)) return false
  const style = (filters.style ?? '').trim()
  if (style && !(artist.styles ?? []).some(s => sameDanceStyle(s, style))) return false
  const eventType = (filters.eventType ?? '').trim()
  if (eventType) {
    const want = normalizeArtistEventType(eventType)
    if (!want) return false
    if (!cleanEventTypes([...(artist.eventTypes ?? [])]).includes(want)) return false
  }
  const area = (filters.serviceArea ?? '').trim()
  if (area && !artistServesArea(artist, area)) return false
  return true
}

/** Home cities and travel cities, one spelling each, A to Z. */
export function artistAreaChoices(artists: readonly ArtistSearchRecord[]): string[] {
  const bySlug = new Map<string, string>()
  const add = (city: string | null | undefined) => {
    const name = (city ?? '').trim()
    const slug = name ? citySlug(name) : ''
    if (!name || !slug || bySlug.has(slug)) return
    bySlug.set(slug, name)
  }
  for (const artist of artists) {
    add(artist.city)
    for (const area of artist.serviceAreas ?? []) add(area.city || area.name)
  }
  return [...bySlug.values()].sort((a, b) => a.localeCompare(b))
}

/**
 * Cities an artist travels to, besides home. Blank, duplicate and home-city
 * rows are dropped. The slug is a fallback until a city lookup replaces it.
 */
export function cleanServiceAreas(
  areas: readonly { city?: string | null; citySlug?: string | null; name?: string | null; slug?: string | null }[],
  homeCity: string | null | undefined,
): ArtistServiceArea[] {
  const home = homeCity ? citySlug(homeCity) : ''
  const out: ArtistServiceArea[] = []
  const seen = new Set<string>()
  for (const area of areas) {
    const city = (area.city || area.name || '').trim()
    const slug = citySlug((area.citySlug || area.slug || city).trim())
    if (!city || !slug || slug === home || seen.has(slug)) continue
    seen.add(slug)
    out.push({ city, citySlug: slug })
    if (out.length >= ARTIST_SERVICE_AREA_MAX) break
  }
  return out
}

type CityLookup = (city: string) => Promise<{ city: string | null; citySlug: string | null }>

/** Canonical city name and slug from `lookup`. Home city is left out. */
export async function resolveServiceAreas(
  areas: readonly { city?: string | null; citySlug?: string | null }[],
  homeCity: string | null | undefined,
  lookup: CityLookup,
): Promise<ArtistServiceArea[]> {
  const out: ArtistServiceArea[] = []
  const seen = new Set<string>()
  const homeSlug = homeCity ? citySlug(homeCity) : ''
  const homeName = homeCity ? normalizeCity(homeCity) : ''
  for (const area of cleanServiceAreas(areas, homeCity)) {
    const info = await lookup(area.city)
    const city = (info.city ?? '').trim()
    const slug = (info.citySlug ?? '').trim() || citySlug(city)
    if (!city || !slug || seen.has(slug)) continue
    if (homeSlug && (slug === homeSlug || citySlug(city) === homeSlug || normalizeCity(city) === homeName)) continue
    seen.add(slug)
    out.push({ city, citySlug: slug })
  }
  return out
}
