/**
 * Festival Schedule data model.
 *
 * Designed to support the acceptance criteria in story 005:
 * - workshops grouped by day, sorted by time
 * - filterable by dance style, day, room, level
 * - each entry shows name, artist, time, room, dance style
 */

export type DanceStyle =
  | 'Salsa'
  | 'Bachata'
  | 'Kizomba'
  | 'Zouk'
  | 'Afro'
  | 'Reggaeton'
  | 'Semba'
  | 'Cha Cha'
  | 'Ladies Styling'
  | 'Mens Styling'
  | 'Musicality'

export type Level = 'All Levels' | 'Beginner' | 'Intermediate' | 'Advanced'

export interface Workshop {
  id: string
  name: string
  artist: string
  startTime: string // ISO 8601, e.g. "2026-06-12T10:00:00"
  endTime: string   // ISO 8601, e.g. "2026-06-12T11:30:00"
  room: string
  danceStyle: DanceStyle
  level: Level
  description?: string
}

export interface FestivalDay {
  date: string // ISO date, e.g. "2026-06-12"
  label: string // e.g. "Friday", "Day 1"
}

export interface Festival {
  id: string
  name: string
  location: string
  days: FestivalDay[]
  rooms: string[]
  workshops: Workshop[]
}
