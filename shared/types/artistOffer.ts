/**
 * What an artist publishes for organizers planning a night (RAZ-1084): a song
 * list they can use as playlist inspiration, the services they offer, and a
 * pricing note in the artist’s own words. Stored on the artist page
 * (`profiles.artist_offer`, migration 0081).
 *
 * Every part is optional. An empty pricing note means the artist has not
 * stated a price — nothing here invents one. The v3 sync never writes this.
 */

export const ARTIST_SERVICES = [
  { id: 'live_show', label: 'Live show' },
  { id: 'animation', label: 'Animation' },
  { id: 'dj_set', label: 'DJ set' },
  { id: 'wedding', label: 'Wedding set' },
  { id: 'party', label: 'Party set' },
] as const

export type ArtistServiceId = (typeof ARTIST_SERVICES)[number]['id']

export const ARTIST_SERVICE_IDS = ARTIST_SERVICES.map(s => s.id) as [ArtistServiceId, ...ArtistServiceId[]]

export const ARTIST_OFFER_LIMITS = { songs: 40, title: 120, by: 80, url: 300, pricing: 400 } as const

export interface ArtistSong {
  title: string
  /** Who performs or wrote it, when that isn’t obvious from the page. */
  by?: string
  /** A public YouTube or Spotify link, so an organizer can find the song. */
  url?: string
}

export interface ArtistOffer {
  songs: ArtistSong[]
  services: ArtistServiceId[]
  /** The artist’s own public words. Empty means they have not stated a price. */
  pricing: string
}

export const EMPTY_ARTIST_OFFER: ArtistOffer = { songs: [], services: [], pricing: '' }

/** The editor's form: every song field is a string, so inputs can bind to it. */
export interface ArtistOfferForm {
  services: ArtistServiceId[]
  pricing: string
  songs: { title: string; by: string; url: string }[]
}

export function artistOfferToForm(raw: unknown): ArtistOfferForm {
  const o = cleanArtistOffer(raw)
  return {
    services: [...o.services],
    pricing: o.pricing,
    songs: o.songs.map(s => ({ title: s.title, by: s.by ?? '', url: s.url ?? '' })),
  }
}

/** A partial save: only the parts present change. `pricing: ''` clears it. */
export interface ArtistOfferPatch {
  songs?: { title: string; by?: string; url?: string }[]
  services?: readonly string[]
  pricing?: string | null
}

const SERVICE_INDEX = new Map(ARTIST_SERVICES.map((s, i) => [s.id, i]))

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function webUrl(v: unknown): string {
  const url = str(v, ARTIST_OFFER_LIMITS.url)
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? url : ''
  } catch {
    return ''
  }
}

export function artistServiceLabel(id: string): string {
  return ARTIST_SERVICES.find(s => s.id === id)?.label ?? id
}

/** Trim, drop blanks and bad links, keep known services in catalog order. */
export function cleanArtistOffer(raw: unknown): ArtistOffer {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const L = ARTIST_OFFER_LIMITS
  const seen = new Set<string>()
  const songs: ArtistSong[] = []
  for (const item of Array.isArray(r.songs) ? r.songs : []) {
    if (songs.length >= L.songs) break
    const title = str(item?.title, L.title)
    if (!title) continue
    const by = str(item?.by, L.by)
    const url = webUrl(item?.url)
    const key = `${title}\n${by}\n${url}`
    if (seen.has(key)) continue
    seen.add(key)
    songs.push({ title, ...(by ? { by } : {}), ...(url ? { url } : {}) })
  }
  const wanted = new Set<string>()
  for (const id of Array.isArray(r.services) ? r.services : []) if (SERVICE_INDEX.has(id as ArtistServiceId)) wanted.add(id)
  const services = ARTIST_SERVICES.map(s => s.id).filter(id => wanted.has(id))
  return { songs, services, pricing: str(r.pricing, L.pricing) }
}

export function artistOfferIsEmpty(offer: ArtistOffer | null | undefined): boolean {
  const o = offer ?? EMPTY_ARTIST_OFFER
  return !o.songs.length && !o.services.length && !o.pricing
}

/** Apply a partial update. Omitted parts stay as they are. */
export function mergeArtistOffer(current: unknown, patch: ArtistOfferPatch): ArtistOffer {
  const base = cleanArtistOffer(current)
  return cleanArtistOffer({
    songs: patch.songs !== undefined ? patch.songs : base.songs,
    services: patch.services !== undefined ? patch.services : base.services,
    pricing: patch.pricing !== undefined ? (patch.pricing ?? '') : base.pricing,
  })
}

/**
 * When two pages for the same artist are merged: the page that stays wins
 * each part it already stated; the copy fills a part it left empty.
 */
export function fillArtistOffer(kept: unknown, copy: unknown): ArtistOffer {
  const k = cleanArtistOffer(kept)
  const c = cleanArtistOffer(copy)
  return {
    songs: k.songs.length ? k.songs : c.songs,
    services: k.services.length ? k.services : c.services,
    pricing: k.pricing || c.pricing,
  }
}

/** Persist a patch. Venues, organizers and promoters don’t have this. */
export function saveArtistOffer(type: string, current: unknown, patch: ArtistOfferPatch): ArtistOffer {
  if (type !== 'artist') throw new Error('Only artist pages have a song list, services and pricing.')
  return mergeArtistOffer(current, patch)
}
