import type { Teacher } from '~/types/festival'

/**
 * Artist display helpers for line-up cards: where an artist is from and
 * based (read off their bio), the flag for a place, and the languages that
 * implies. Profiles themselves live at /@handle.
 */

// Nationality adjective -> country of origin, for bios that state it
// ("Cuban dancer", "Dominican Bachata artist", "Cuban-born"). Only the
// nationalities that actually appear in the data.
const NATIONALITY_COUNTRY: Record<string, string> = {
  cuban: 'Cuba',
  dominican: 'Dominican Republic',
  italian: 'Italy',
  brazilian: 'Brazil',
  montenegrin: 'Montenegro',
  slovenian: 'Slovenia',
  venezuelan: 'Venezuela',
  spanish: 'Spain',
  colombian: 'Colombia',
  german: 'Germany',
  french: 'France',
  mexican: 'Mexico',
  puerto: 'Puerto Rico',
  angolan: 'Angola',
  argentinian: 'Argentina',
  argentine: 'Argentina',
}

/**
 * Country of origin — derived from the leading nationality the bio
 * states ("Cuban dancer" / "Cuban-born" -> Cuba). Null if none stated.
 */
export function artistOrigin(artist: Teacher): string | null {
  const m = (artist.bio || '').match(/^([A-Z][a-zà-ÿ]+)(?:-born)?/)
  return m ? (NATIONALITY_COUNTRY[m[1].toLowerCase()] || null) : null
}

/**
 * Where the artist is based now — derived, never invented. Stated residence
 * ("Berlin-based" or "based in Berlin"). Null if the bio states none.
 */
export function artistResidence(artist: Teacher): string | null {
  const bio = artist.bio || ''
  let m = bio.match(/\b([A-Z][A-Za-zÀ-ÿ]+)-based\b/)
  if (m) return m[1]
  m = bio.match(/based in ([A-Z][A-Za-zÀ-ÿ]+(?:\s[A-Z][A-Za-zÀ-ÿ]+)?)/)
  if (m) return m[1]
  return null
}

/** Origin + residence for one artist, read from their bio. */
export function artistPlaces(artist: Teacher): { origin: string | null; residence: string | null } {
  return { origin: artistOrigin(artist), residence: artistResidence(artist) }
}

// Place (country or one of our cities) -> its country flag.
export const PLACE_FLAG: Record<string, string> = {
  Cuba: '🇨🇺',
  Spain: '🇪🇸',
  'Dominican Republic': '🇩🇴',
  Colombia: '🇨🇴',
  Venezuela: '🇻🇪',
  Mexico: '🇲🇽',
  Argentina: '🇦🇷',
  Italy: '🇮🇹',
  Germany: '🇩🇪',
  Austria: '🇦🇹',
  France: '🇫🇷',
  Brazil: '🇧🇷',
  Portugal: '🇵🇹',
  Angola: '🇦🇴',
  Hungary: '🇭🇺',
  Montenegro: '🇲🇪',
  Slovenia: '🇸🇮',
  // Cities resolve to their country's flag.
  Munich: '🇩🇪',
  Berlin: '🇩🇪',
  Vienna: '🇦🇹',
}

export function placeFlag(place: string | null | undefined): string {
  return place ? (PLACE_FLAG[place] || '') : ''
}

// Place -> primary language (label + 2-letter code).
export interface Language { label: string; code: string }
const PLACE_LANGUAGE: Record<string, Language> = {
  Cuba: { label: 'Spanish', code: 'ES' },
  Spain: { label: 'Spanish', code: 'ES' },
  'Dominican Republic': { label: 'Spanish', code: 'ES' },
  Colombia: { label: 'Spanish', code: 'ES' },
  Venezuela: { label: 'Spanish', code: 'ES' },
  Mexico: { label: 'Spanish', code: 'ES' },
  Argentina: { label: 'Spanish', code: 'ES' },
  Italy: { label: 'Italian', code: 'IT' },
  Germany: { label: 'German', code: 'DE' },
  Austria: { label: 'German', code: 'DE' },
  France: { label: 'French', code: 'FR' },
  Brazil: { label: 'Portuguese', code: 'PT' },
  Portugal: { label: 'Portuguese', code: 'PT' },
  Angola: { label: 'Portuguese', code: 'PT' },
  Hungary: { label: 'Hungarian', code: 'HU' },
  Montenegro: { label: 'Montenegrin', code: 'ME' },
  Slovenia: { label: 'Slovenian', code: 'SL' },
  Munich: { label: 'German', code: 'DE' },
  Berlin: { label: 'German', code: 'DE' },
  Vienna: { label: 'German', code: 'DE' },
}

/**
 * Languages an artist likely speaks — derived from their origin and
 * residence, plus English as the international dance-festival lingua
 * franca. Deduped, English last. Best-effort, not a stated fact.
 */
export function artistLanguages(origin: string | null, residence: string | null): Language[] {
  const out: Language[] = []
  const seen = new Set<string>()
  for (const place of [origin, residence]) {
    if (!place) continue
    const lang = PLACE_LANGUAGE[place]
    if (lang && !seen.has(lang.label)) {
      seen.add(lang.label)
      out.push(lang)
    }
  }
  if (!seen.has('English')) out.push({ label: 'English', code: 'EN' })
  return out
}

