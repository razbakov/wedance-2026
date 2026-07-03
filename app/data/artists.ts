import type { Teacher, Workshop, Festival } from '~/types/festival'
import type { City, CityEvent } from '~/types/city'
import * as salsaOpen from '~/data/mock-festival'
import * as meneate from '~/data/mock-meneate'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'
import * as aguaPichi from '~/data/mock-agua-pichi'
import * as munich from '~/data/mock-city-munich'
import * as berlin from '~/data/mock-city-berlin'

/**
 * Cross-source artist registry. Teachers, DJs, and organisers live inside
 * per-festival and per-city mock files; this module aggregates them so an
 * artist has one profile page (/artists/[id]) that shows everywhere they
 * appear — the cross-festival view that makes a WeDance artist page worth
 * having. Replace with real DB lookups when the backend lands.
 */

const festivalSources = [salsaOpen, meneate, cubanFire, caribbeanUrbanFire, aguaPichi]
const citySources = [munich, berlin]

export interface FestivalAppearance {
  festival: Festival
  workshops: Workshop[]
}
export interface CityAppearance {
  city: City
  events: CityEvent[]
}

export function findArtist(id: string): Teacher | null {
  for (const src of festivalSources) {
    const t = src.mockTeachers.find((t) => t.id === id)
    if (t) return t
  }
  for (const c of citySources) {
    const t = [...c.teachers, ...c.djs, ...c.organisers].find((p) => p.id === id)
    if (t) return t
  }
  return null
}

export function festivalAppearances(id: string): FestivalAppearance[] {
  return festivalSources
    .filter((src) => src.mockTeachers.some((t) => t.id === id))
    .map((src) => ({
      festival: src.mockFestival,
      workshops: src.mockWorkshops.filter((w) => w.teacherId === id),
    }))
}

export function cityAppearances(id: string): CityAppearance[] {
  return citySources
    .filter((c) => [...c.teachers, ...c.djs, ...c.organisers].some((p) => p.id === id))
    .map((c) => ({
      city: c.city,
      events: c.events.filter(
        (e) => e.teacherId === id || e.djId === id || e.organizerId === id,
      ),
    }))
}

export interface ArtistSummary {
  artist: Teacher
  festivalCount: number
  cityNames: string[]
  location: string | null
}

/**
 * Best-effort home base. A local artist's city is where they teach/DJ
 * weekly; a festival artist's comes from the "based in X" their bio
 * already states — no invented locations. Null when neither is known.
 */
export function artistLocation(artist: Teacher, cityNames: string[]): string | null {
  if (cityNames.length) return cityNames[0]
  const m = artist.bio?.match(/based in ([A-Z][A-Za-zÀ-ÿ]+(?:\s[A-Z][A-Za-zÀ-ÿ]+)?)/)
  return m ? m[1] : null
}

/**
 * Every performer with a profile — festival teachers/headliners plus city
 * teachers and DJs. City organisers are schools/promoters, not artists, so
 * they're left out of the listing (they still resolve via findArtist if
 * linked directly). Deduped by id, first occurrence wins.
 */
export function allArtists(): ArtistSummary[] {
  const map = new Map<string, Teacher>()
  for (const src of festivalSources) {
    for (const t of src.mockTeachers) if (!map.has(t.id)) map.set(t.id, t)
  }
  for (const c of citySources) {
    for (const t of [...c.teachers, ...c.djs]) if (!map.has(t.id)) map.set(t.id, t)
  }
  return [...map.values()].map((artist) => {
    const cityNames = cityAppearances(artist.id).map((c) => c.city.name)
    return {
      artist,
      festivalCount: festivalAppearances(artist.id).length,
      cityNames,
      location: artistLocation(artist, cityNames),
    }
  })
}
