/**
 * Festival Schedule data model.
 *
 * Aligned with the canonical JSON schema at:
 *   01_Domains/Festival_Experience/Operations/schedule_schema.json
 *
 * Key differences from the v1 scaffold types:
 *   - DanceStyle uses kebab-case enum values from the schema's controlled vocabulary
 *   - Level uses kebab-case enum values
 *   - Workshop references rooms by `roomId` (string ID) instead of inline room name
 *   - Workshop uses `day` (ISO date) + `startTime`/`endTime` (HH:MM) instead of full ISO timestamps
 *   - Festival has structured metadata (timezone, venue, city, country, etc.)
 *   - Rooms are first-class objects with id, name, and optional capacity
 *   - Workshop has optional `notes` field (operational, not shown to users)
 *   - Workshop has optional `tags` array
 */

export type DanceStyle =
  | 'salsa-cubana'
  | 'salsa-linear'
  | 'bachata'
  | 'kizomba'
  | 'zouk'
  | 'semba'
  | 'cha-cha-cha'
  | 'son'
  | 'rumba'
  | 'afro-cuban'
  | 'reggaeton'
  | 'lady-styling'
  | 'man-styling'
  | 'musicality'
  | 'body-movement'
  | 'other'

export type Level = 'beginner' | 'intermediate' | 'advanced' | 'all-levels'

export interface Room {
  id: string
  name: string
  capacity?: number
}

export interface Workshop {
  name: string
  artist?: string
  day: string // ISO date, e.g. "2026-06-12"
  startTime: string // HH:MM 24-hour in festival timezone, e.g. "14:00"
  endTime: string // HH:MM 24-hour in festival timezone, e.g. "15:00"
  roomId: string // references Room.id
  danceStyle?: DanceStyle
  level?: Level
  description?: string
  tags?: string[]
  notes?: string // operational notes, not shown to end users
}

export interface FestivalMetadata {
  name: string
  startDate: string // ISO date, e.g. "2026-06-12"
  endDate: string // ISO date, e.g. "2026-06-14"
  timezone: string // IANA timezone, e.g. "Europe/Berlin"
  venue?: string
  city?: string
  country?: string // ISO 3166-1 alpha-2, e.g. "DE"
  website?: string
  sourceUrl?: string
}

export interface FestivalSchedule {
  festival: FestivalMetadata
  rooms: Room[]
  workshops: Workshop[]
}

/**
 * Derived types used by the UI layer.
 */
export interface FestivalDay {
  date: string // ISO date, e.g. "2026-06-12"
  label: string // e.g. "Friday", "Day 1"
}

/**
 * A workshop enriched with a generated ID and resolved room name for display.
 * The schema does not mandate IDs on workshops (they come from the source data),
 * so we generate a stable ID from day + time + roomId for keying in the UI.
 */
export interface WorkshopWithId extends Workshop {
  id: string
  roomName: string // resolved from Room.id
}

/**
 * Festival theme configuration.
 * CSS custom properties applied per-festival, following the theming guide at:
 *   01_Domains/Festival_Experience/Operations/Design/004_Festival_Theming.md
 */
export interface FestivalTheme {
  accent: string // Hex color, e.g. "#0891B2"
  accentHover: string // Hex color for hover state
  headerBg: string // Header background color
  headerText: string // Header text color
  bannerUrl?: string | null // Optional banner image URL
}

/**
 * Full festival configuration including schedule data and theme.
 * Used by the data loader to provide everything the app needs for a festival.
 */
export interface FestivalConfig {
  slug: string // URL-safe identifier, e.g. "rovinj-summer-bachata-2026"
  schedule: FestivalSchedule
  theme: FestivalTheme
}
