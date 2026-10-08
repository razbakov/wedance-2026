/**
 * Style & level mix — the organizer insight "who is actually coming" (P726).
 *
 * Aggregates a festival's attendees into (a) how many dance each style, broken
 * down by self-declared level, and (b) one level per attendee. Pure + shared so
 * the server computes it and the client can reuse the types/constants.
 *
 * Levels are per style (`dancers.dance_levels`: { Salsa: 'Advanced', … }) since
 * a dancer can be advanced in one style and a beginner in another.
 */

export const DANCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const
export type DanceLevel = typeof DANCE_LEVELS[number]

export type LevelCounts = Record<DanceLevel | 'unknown', number>

export interface MixAttendee {
  danceStyles: string[] | null
  danceLevels: Record<string, string> | null
}

export interface StyleMixRow {
  style: string
  count: number
  /** Share of attendees who listed any style. */
  share: number
  isFestivalStyle: boolean
  levels: LevelCounts
}

export interface StyleLevelMix {
  /** Every signup, including ticket stubs nobody has claimed yet. */
  attendees: number
  /** Signups linked to a WeDance profile. */
  withProfile: number
  /** Profiles that list at least one style — the base for style shares. */
  withStyles: number
  styles: StyleMixRow[]
  /** One entry per profile: top level in the festival's styles (else overall). */
  levels: LevelCounts
}

const RANK: Record<DanceLevel, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 }

const norm = (s: string) => s.trim().toLowerCase()
const emptyLevels = (): LevelCounts => ({ Beginner: 0, Intermediate: 0, Advanced: 0, unknown: 0 })

function isLevel(v: unknown): v is DanceLevel {
  return typeof v === 'string' && (DANCE_LEVELS as readonly string[]).includes(v)
}

/** Drop levels for styles the dancer doesn't list, and values off the scale. */
export function sanitizeDanceLevels(levels: Record<string, string>, danceStyles: string[]): Record<string, DanceLevel> {
  const styles = new Set(danceStyles.map(norm))
  const out: Record<string, DanceLevel> = {}
  for (const [style, level] of Object.entries(levels)) {
    if (styles.has(norm(style)) && isLevel(level)) out[style] = level
  }
  return out
}

/** `null` attendee = an unclaimed ticket stub (no profile to read from). */
export function computeStyleLevelMix(attendees: (MixAttendee | null)[], festivalStyles: string[]): StyleLevelMix {
  const festivalKeys = new Set(festivalStyles.map(norm).filter(Boolean))
  const rows = new Map<string, Omit<StyleMixRow, 'share'>>()
  const levels = emptyLevels()
  let withProfile = 0
  let withStyles = 0

  for (const a of attendees) {
    if (!a) continue
    withProfile += 1

    const levelByKey = new Map<string, DanceLevel>()
    for (const [style, level] of Object.entries(a.danceLevels ?? {})) {
      if (isLevel(level)) levelByKey.set(norm(style), level)
    }

    const seen = new Set<string>()
    let topInFestival: DanceLevel | undefined
    let topOverall: DanceLevel | undefined
    for (const raw of a.danceStyles ?? []) {
      const key = norm(raw)
      if (!key || seen.has(key)) continue
      seen.add(key)

      let row = rows.get(key)
      if (!row) {
        row = { style: raw.trim(), count: 0, isFestivalStyle: festivalKeys.has(key), levels: emptyLevels() }
        rows.set(key, row)
      }
      row.count += 1

      const level = levelByKey.get(key)
      row.levels[level ?? 'unknown'] += 1
      if (level) {
        if (!topOverall || RANK[level] > RANK[topOverall]) topOverall = level
        if (festivalKeys.has(key) && (!topInFestival || RANK[level] > RANK[topInFestival])) topInFestival = level
      }
    }

    if (seen.size > 0) withStyles += 1
    const dancesFestivalStyle = [...seen].some(k => festivalKeys.has(k))
    levels[(dancesFestivalStyle ? topInFestival : topOverall) ?? 'unknown'] += 1
  }

  const styles = [...rows.values()]
    .sort((x, y) => Number(y.isFestivalStyle) - Number(x.isFestivalStyle) || y.count - x.count || x.style.localeCompare(y.style))
    .map(r => ({ ...r, share: withStyles ? r.count / withStyles : 0 }))

  return { attendees: attendees.length, withProfile, withStyles, styles, levels }
}
