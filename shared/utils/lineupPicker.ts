/**
 * The events an organiser is offered on an artist's booking page (/@handle/book,
 * RAZ-964) when they open "Add <artist> to an event's line-up": only events
 * that share one of the artist's styles, one row per series (its next date),
 * events of the pages they own before the ones they only help run, a few rows.
 */

export interface LineupCandidate {
  id: string
  startDate: string | Date
  styles?: string[] | null
  seriesId?: string | null
  /** The asker's role on the event's host page. */
  role?: string | null
}

export type LineupPick<T> = T & { dates: number }

const norm = (s: string) => s.trim().toLowerCase()

export function pickLineupEvents<T extends LineupCandidate>(events: T[], artistStyles: string[] | null | undefined, limit = 5): LineupPick<T>[] {
  const wanted = new Set((artistStyles ?? []).map(norm).filter(Boolean))
  // An artist without styles: nothing to filter on, so every event stays.
  const matches = wanted.size
    ? events.filter(e => (e.styles ?? []).some(s => wanted.has(norm(s))))
    : events.slice()
  matches.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const bySeries = new Map<string, LineupPick<T>>()
  const rows: LineupPick<T>[] = []
  for (const e of matches) {
    if (e.seriesId) {
      const seen = bySeries.get(e.seriesId)
      if (seen) { seen.dates++; continue }
      const row = { ...e, dates: 1 }
      bySeries.set(e.seriesId, row)
      rows.push(row)
    } else rows.push({ ...e, dates: 1 })
  }

  const own = (e: LineupCandidate) => (e.role ?? 'owner') === 'owner' ? 0 : 1
  // Stable sort: date order kept within each group.
  return rows.sort((a, b) => own(a) - own(b)).slice(0, limit)
}
