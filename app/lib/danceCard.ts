/**
 * Where "Your dance card" (/dance-card, RAZ-1005) starts: which dances it lists
 * and ticks, and which role is picked.
 *
 * From a night the dancer signed up to: that night's dances first (ticked —
 * they're going to dance them), then their own; the role from how they signed
 * up ("I lead, need a follower" → Lead). Without a night: their own dances,
 * then a few common ones, and the role from their profile.
 */
export const COMMON_DANCE_CARD_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Tango']

/** The sign-up answer as a role; "with my partner" / "I'm going" say nothing about it. */
export function roleFromAnswer(answer: string | null | undefined): 'lead' | 'follow' | null {
  if (answer === 'needFollower') return 'lead'
  if (answer === 'needLeader') return 'follow'
  return null
}

export function danceCardStart(input: {
  profileRole?: string | null
  profileStyles: readonly string[]
  event?: { styles: readonly string[]; answer?: string | null } | null
}): { role: 'lead' | 'follow' | null; ticked: string[]; listed: string[] } {
  const own = [...input.profileStyles]
  const profileRole = input.profileRole === 'lead' || input.profileRole === 'follow' ? input.profileRole : null
  if (input.event) {
    const night = input.event.styles.filter(Boolean)
    return {
      role: roleFromAnswer(input.event.answer) ?? profileRole,
      ticked: [...new Set([...night, ...own])],
      listed: [...new Set([...night, ...own])],
    }
  }
  return { role: profileRole, ticked: own, listed: [...new Set([...own, ...COMMON_DANCE_CARD_STYLES])] }
}
