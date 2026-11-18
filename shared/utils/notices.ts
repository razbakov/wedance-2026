/**
 * In-app notices derived from something that already happened (a Meet match).
 * Nothing is stored to create one: Anna and Ben's existing mutual yes is a
 * notice the next time either of them opens the app. "Booked" is the ritual
 * booking (Book my spot), not merely having the night on a plan.
 */
import { eventLocalTime, eventLocalWeekday } from './eventTime'

export type NoticeKind = 'match'

export interface Notice {
  /** Stable id, `match:<other dancer id>`. */
  id: string
  kind: NoticeKind
  /** Match toasts are the large ones. */
  prominent: boolean
  title: string
  body: string
  /** The click that opens the meetup. */
  action: string
  href: string
  at: string
  name: string
  photo: string | null
  booked: boolean
}

export interface MatchNoticeInput {
  dancerId: string
  name: string
  photo: string | null
  matchedAt: string
  /** They already did "Book my spot" for this meetup. */
  booked: boolean
  night: { name: string; whenLabel: string; venue: string } | null
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'them'
}

/** "Thursday 21:00" in the event's own zone. */
export function nightWhenLabel(startISO: string, timezone: string | null | undefined): string {
  const zone = timezone || undefined
  return `${eventLocalWeekday(startISO, zone)} ${eventLocalTime(startISO, zone)}`
}

/**
 * What both dancers are told. Not booked: book the night. Already booked:
 * who they'll meet, and when and where, instead of another booking nudge.
 */
export function matchNotice(input: MatchNoticeInput): Notice {
  const who = firstName(input.name)
  const night = input.night
  const where = night
    ? `${night.name}, ${night.whenLabel}${night.venue ? ` · ${night.venue}` : ''}`
    : null
  const booked = input.booked && !!where
  return {
    id: `match:${input.dancerId}`,
    kind: 'match',
    prominent: true,
    title: `It's a match with ${who}`,
    body: booked
      ? `You'll meet ${who} at ${where}.`
      : `${who} said yes to you too. Book the night, then you'll see when and where you meet.`,
    action: booked ? 'See when and where you’ll meet' : 'Book the night and see where you’ll meet',
    href: `/meet/ritual?with=${input.dancerId}`,
    at: input.matchedAt,
    name: input.name,
    photo: input.photo,
    booked,
  }
}

/** Notices they have not opened yet. Dismissing a toast does not count. */
export function unactedNotices(notices: readonly Notice[], actedIds: readonly string[]): Notice[] {
  const acted = new Set(actedIds)
  return notices.filter(n => !acted.has(n.id))
}
