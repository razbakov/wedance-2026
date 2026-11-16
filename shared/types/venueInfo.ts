/**
 * What's true about a venue itself, for everyone coming to any event there (RAZ-1012): how to get
 * there, where to park, what to bring, what it doesn't have. Stored on the venue's page
 * (`profiles.venue_info`, migration 0074), shown in the event hero's venue row as one hint per line.
 *
 * Every field is optional and each hint shows only when filled in. The cloakroom is three-state
 * (yes / no / not said) and lives only here: the old presence-only `CoatCheck` amenity moved into it.
 * Only "no" is shown, struck through, since it's the one that changes what you bring.
 */
export type Cloakroom = 'yes' | 'no'

export interface VenueInfo {
  /** The nearest stop: its line ("S2"), the line's colour (#76B82A), the stop's name and how to get from it. */
  transit?: { line?: string; color?: string; stop: string; detail?: string }
  /** Where to park ("Garage next door") and a detail ("Entrance by the Audi dealership"). */
  parking?: { text: string; detail?: string }
  /** Street shoes off the floor: bring a pair to change into. */
  indoorShoesOnly?: boolean
  cloakroom?: Cloakroom
}

/** Where the colour picker starts when a line has no colour yet (the badge itself stays neutral). */
export const NEUTRAL_LINE_COLOR = '#222222'

export const VENUE_INFO_LIMITS = { line: 8, stop: 80, text: 80, detail: 120 } as const

const HEX = /^#[0-9a-f]{6}$/i
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Drop empty parts (an empty stop removes the transit hint), trim, keep only a #rrggbb colour. */
export function cleanVenueInfo(raw: unknown): VenueInfo {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const L = VENUE_INFO_LIMITS
  const out: VenueInfo = {}
  const stop = str(r.transit?.stop, L.stop)
  if (stop) {
    const line = str(r.transit?.line, L.line)
    const color = str(r.transit?.color, 7)
    const detail = str(r.transit?.detail, L.detail)
    out.transit = { stop, ...(line ? { line } : {}), ...(line && HEX.test(color) ? { color: color.toLowerCase() } : {}), ...(detail ? { detail } : {}) }
  }
  const park = str(r.parking?.text, L.text)
  if (park) {
    const detail = str(r.parking?.detail, L.detail)
    out.parking = { text: park, ...(detail ? { detail } : {}) }
  }
  if (r.indoorShoesOnly === true) out.indoorShoesOnly = true
  if (r.cloakroom === 'yes' || r.cloakroom === 'no') out.cloakroom = r.cloakroom
  return out
}

/** One row of the venue card: what it is, its title, a quiet line under it. */
export type VenueHint =
  | { kind: 'transit'; title: string; detail?: string; line?: string; color?: string }
  | { kind: 'parking'; title: string; detail?: string }
  | { kind: 'shoes'; title: string; detail: string }
  | { kind: 'cloakroom'; title: string; missing: true }

/** The rows to show, in the order you need them (getting there → parking → what to bring). */
export function venueHints(info: VenueInfo | null | undefined): VenueHint[] {
  const i = cleanVenueInfo(info)
  const out: VenueHint[] = []
  if (i.transit) out.push({ kind: 'transit', title: i.transit.stop, ...(i.transit.detail ? { detail: i.transit.detail } : {}), ...(i.transit.line ? { line: i.transit.line } : {}), ...(i.transit.color ? { color: i.transit.color } : {}) })
  if (i.parking) out.push({ kind: 'parking', title: i.parking.text, ...(i.parking.detail ? { detail: i.parking.detail } : {}) })
  if (i.indoorShoesOnly) out.push({ kind: 'shoes', title: 'Indoor dance shoes only', detail: 'Bring a pair to change into' })
  if (i.cloakroom === 'no') out.push({ kind: 'cloakroom', title: 'Cloakroom', missing: true })
  return out
}

/** Readable text on a line badge: dark on light colours (U-Bahn yellow), white otherwise. */
export function lineBadgeInk(color: string | undefined): string {
  if (!color || !HEX.test(color)) return '#ffffff'
  const n = parseInt(color.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  return lum > 0.4 ? '#111111' : '#ffffff'
}

/** The editor's flat form (every input a string, the cloakroom '' = not said). */
export interface VenueInfoForm {
  line: string; color: string; stop: string; transitDetail: string
  parking: string; parkingDetail: string
  indoorShoesOnly: boolean
  cloakroom: '' | Cloakroom
}

export function venueInfoToForm(info: VenueInfo | null | undefined): VenueInfoForm {
  const i = cleanVenueInfo(info)
  return {
    line: i.transit?.line ?? '', color: i.transit?.color ?? '', stop: i.transit?.stop ?? '', transitDetail: i.transit?.detail ?? '',
    parking: i.parking?.text ?? '', parkingDetail: i.parking?.detail ?? '',
    indoorShoesOnly: !!i.indoorShoesOnly,
    cloakroom: i.cloakroom ?? '',
  }
}

/** The whole form as a save: every part given, empty ones as null (cleared). */
export function venueInfoFromForm(f: VenueInfoForm) {
  const t = (s: string) => s.trim()
  return {
    transit: t(f.stop) ? { stop: t(f.stop), line: t(f.line), color: t(f.line) ? t(f.color) : '', detail: t(f.transitDetail) } : null,
    parking: t(f.parking) ? { text: t(f.parking), detail: t(f.parkingDetail) } : null,
    indoorShoesOnly: f.indoorShoesOnly,
    cloakroom: f.cloakroom || null,
  }
}
