/**
 * An organiser's private booking shortlist (RAZ-1085).
 * Follow is a separate graph: shortlisting an artist does not follow them,
 * and the artist is not told.
 */

export const SHORTLIST_OCCASIONS = ['wedding', 'birthday', 'corporate', 'other'] as const
export type ShortlistOccasion = (typeof SHORTLIST_OCCASIONS)[number]

/** A private note on the board. Mirrors the check on artist_shortlist.note. */
export const SHORTLIST_NOTE_MAX = 500

export const SHORTLIST_OCCASION_LABEL: Record<ShortlistOccasion, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  corporate: 'Corporate',
  other: 'Other',
}

export const SHORTLIST_FILTERS: { id: ShortlistOccasion | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'wedding', label: 'Weddings' },
  { id: 'birthday', label: 'Birthdays' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'other', label: 'Other' },
]

const OCCASION_SET = new Set<string>(SHORTLIST_OCCASIONS)

export function parseOccasion(value: unknown): ShortlistOccasion | null {
  if (value == null || value === '') return null
  if (typeof value === 'string' && OCCASION_SET.has(value)) return value as ShortlistOccasion
  throw new Error('Pick a wedding, birthday, corporate event, or other.')
}

export function parseNote(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') throw new Error('Write the note as text.')
  const note = value.trim()
  if (!note) return null
  if (note.length > SHORTLIST_NOTE_MAX) {
    throw new Error(`Keep the note under ${SHORTLIST_NOTE_MAX} characters.`)
  }
  return note
}

export type ShortlistBoardRow = {
  username: string
  occasion: ShortlistOccasion | null
  createdAt: Date | string
}

/** One occasion (or every tag), newest shortlist first. */
export function shortlistBoard<T extends ShortlistBoardRow>(
  rows: T[],
  occasion: ShortlistOccasion | 'all' = 'all',
): T[] {
  const filtered = occasion === 'all' ? rows : rows.filter(r => r.occasion === occasion)
  return [...filtered].sort((a, b) => {
    const delta = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    return delta || a.username.localeCompare(b.username)
  })
}
