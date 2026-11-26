import type { SchedulePeople } from '../types/profileSite'

/** Roles that make the people column "Artist", even when the page is not typed artist. */
const ARTIST_ROLES = new Set(['artist', 'band', 'orchestra', 'performer'])
/** Roles that make the people column "Teacher" when the page is not an artist. */
const TEACHER_ROLES = new Set(['school', 'teacher'])

const norm = (s: string) => s.trim().toLowerCase()

/**
 * The schedule table's people column (RAZ-1094): "Teacher" is right for a
 * school and wrong on an artist or orchestra page. A feed with no type yet
 * (every hosted site before this field) stays "Teacher".
 */
export function schedulePeople(profile?: { type?: string | null; roles?: readonly string[] | null } | null): SchedulePeople {
  const type = norm(profile?.type ?? '')
  const roles = new Set((profile?.roles ?? []).map(r => norm(String(r))).filter(Boolean))
  const has = (known: Set<string>) => [...roles].some(r => known.has(r))
  if (type === 'artist' || has(ARTIST_ROLES)) return 'artist'
  if (type === 'organizer' || has(TEACHER_ROLES)) return 'teacher'
  if (!type && roles.size === 0) return 'teacher'
  return 'with'
}
