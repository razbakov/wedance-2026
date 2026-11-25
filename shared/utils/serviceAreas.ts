/**
 * An artist's service area (RAZ-1083): cities besides their home city where they
 * are listed. Home city stays on `profiles.city` / `city_slug`. Venues and
 * organisers are never listed through this — only artists travel.
 *
 * Stored as `{ slug, name }[]` on `profiles.service_areas`. The slug is the
 * canonical `cities.slug` (`/cities/<slug>`).
 */

export const SERVICE_AREAS_MAX = 20

export type ServiceArea = { slug: string; name: string }

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Canonical, de-duplicated service areas. Junk, blanks and a 21st city are dropped. */
export function cleanServiceAreas(raw: unknown): ServiceArea[] {
  if (!Array.isArray(raw)) return []
  const out: ServiceArea[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const slug = String((item as { slug?: unknown }).slug ?? '').trim().toLowerCase()
    const name = String((item as { name?: unknown }).name ?? '').trim().replace(/\s+/g, ' ')
    if (!slug || !name || name.length > 120 || !SLUG.test(slug) || seen.has(slug)) continue
    seen.add(slug)
    out.push({ slug, name })
    if (out.length >= SERVICE_AREAS_MAX) break
  }
  return out
}

/** The home city is not repeated in the service area. */
export function serviceAreasFor(areas: readonly ServiceArea[], homeSlug: string | null | undefined): ServiceArea[] {
  const home = (homeSlug ?? '').trim().toLowerCase()
  return cleanServiceAreas(areas.filter(a => a.slug !== home))
}

/** Drop the home city whether it matches by slug or by the same display name. */
export function withoutHomeCity(
  areas: readonly ServiceArea[],
  homeSlugs: readonly (string | null | undefined)[],
  homeName: string | null | undefined,
): ServiceArea[] {
  let out = serviceAreasFor(areas, null)
  for (const slug of homeSlugs) out = serviceAreasFor(out, slug)
  const name = homeName?.trim().toLowerCase()
  if (!name) return out
  return out.filter(a => a.name.toLowerCase() !== name)
}

/** Merge: the page that stays keeps its cities, then the copy's. Home city of the kept page is dropped. */
export function unionServiceAreas(kept: unknown, copy: unknown, homeSlug: string | null | undefined): ServiceArea[] {
  return serviceAreasFor([...cleanServiceAreas(kept), ...cleanServiceAreas(copy)], homeSlug)
}

export type CityMember = {
  type: string
  citySlug: string | null
  serviceAreas?: unknown
}

/**
 * Whether a visible profile belongs in a city's directory.
 * Callers already drop hidden profiles. A venue or organiser is only in its home city.
 */
export function listedInCity(profile: CityMember, citySlug: string): boolean {
  if (profile.citySlug === citySlug) return true
  if (profile.type !== 'artist') return false
  return cleanServiceAreas(profile.serviceAreas).some(a => a.slug === citySlug)
}

/**
 * The name to print for a city directory. A resident's own city wins, then the
 * canonical cities-table name, then a traveler's service-area label. A traveler's
 * home city ("Barcelona") must not rename Munich.
 */
export function cityDisplayName(
  rows: readonly { city: string | null; citySlug: string | null; serviceAreas?: unknown }[],
  citySlug: string,
  fallbackName: string | null,
): string | null {
  const resident = rows.find(r => r.citySlug === citySlug && r.city?.trim())
  if (resident?.city?.trim()) return resident.city.trim()
  if (fallbackName?.trim()) return fallbackName.trim()
  for (const r of rows) {
    const hit = cleanServiceAreas(r.serviceAreas).find(a => a.slug === citySlug)
    if (hit) return hit.name
  }
  return null
}

export type DirectoryPerson = {
  username: string | null
  name: string | null
  photo: string | null
  styles: string[]
  /** Set when an artist is listed here but based in another city. */
  basedIn: string | null
}

export type DirectoryProfile = CityMember & {
  username: string | null
  name: string | null
  photo: string | null
  styles: string[] | null
  city: string | null
}

export function peopleInCity(rows: readonly DirectoryProfile[], citySlug: string, type: string): DirectoryPerson[] {
  return rows.filter(r => r.type === type && listedInCity(r, citySlug)).map(r => ({
    username: r.username,
    name: r.name,
    photo: r.photo,
    styles: r.styles ?? [],
    basedIn: type === 'artist' && r.citySlug !== citySlug ? (r.city ?? null) : null,
  }))
}

export type CityTally = {
  city: string
  citySlug: string
  venues: number
  artists: number
  organizers: number
  total: number
}

/** One row per city. An artist counts in the home city and in each service-area city, once. */
export function tallyCities(
  rows: readonly { city: string | null; citySlug: string | null; type: string; serviceAreas?: unknown }[],
): CityTally[] {
  const map = new Map<string, CityTally>()
  const bump = (slug: string, name: string, type: string) => {
    const e = map.get(slug) ?? { city: name, citySlug: slug, venues: 0, artists: 0, organizers: 0, total: 0 }
    if (type === 'venue') e.venues++
    else if (type === 'artist') e.artists++
    else if (type === 'organizer') e.organizers++
    e.total++
    map.set(slug, e)
  }
  for (const r of rows) {
    if (r.citySlug && r.city) bump(r.citySlug, r.city, r.type)
    if (r.type !== 'artist') continue
    for (const area of cleanServiceAreas(r.serviceAreas)) {
      if (area.slug === r.citySlug) continue
      bump(area.slug, area.name, 'artist')
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.city.localeCompare(b.city))
}

/** Home city first, then each service-area city. Used by the /artists city filter. */
export function artistCityNames(home: string | null | undefined, areas: unknown): string[] {
  const names = [home?.trim(), ...cleanServiceAreas(areas).map(a => a.name)].filter((n): n is string => !!n)
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of names) {
    const key = n.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(n)
  }
  return out
}

export function matchesArtistCity(home: string | null | undefined, areas: unknown, selected: string): boolean {
  const q = selected.trim().toLowerCase()
  if (!q) return true
  return artistCityNames(home, areas).some(n => n.toLowerCase() === q)
}
