/**
 * In-app notices derived from something that already happened (a Meet match).
 * Nothing is stored to create one: Anna and Ben's existing mutual yes is a
 * notice the next time either of them opens the app. "Booked" is the ritual
 * booking (Book my spot), not merely having the night on a plan.
 */
import { eventLocalTime, eventLocalWeekday } from './eventTime'

export type NoticeKind = 'match'

export type DanceRole = 'lead' | 'follow' | 'both'

/** The other dancer, in the shape of a Meet deck card. */
export interface NoticePerson {
  name: string
  photo: string | null
  city: string
  role: DanceRole | null
  styles: string[]
}

/** The shared night, in the shape of an event card. */
export interface NoticeEvent {
  name: string
  path: string
  /** "Fri, Nov 20 · 21:00" in the event's zone. */
  whenLabel: string
  venue: string
  cover: string | null
  going: number
}

export interface Notice {
  /** Stable id, `match:<other dancer id>`. */
  id: string
  kind: NoticeKind
  /** The Meet card is the prominent part. Toasts stay small. */
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
  person: NoticePerson
  event: NoticeEvent | null
}

export interface MatchNoticeInput {
  dancerId: string
  name: string
  photo: string | null
  city?: string
  role?: DanceRole | null
  styles?: string[]
  matchedAt: string
  /** They already did "Book my spot" for this meetup. */
  booked: boolean
  night: {
    name: string
    whenLabel: string
    venue: string
    path?: string
    cover?: string | null
    going?: number
  } | null
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || 'them'
}

/** "Thursday 21:00" in the event's own zone. */
export function nightWhenLabel(startISO: string, timezone: string | null | undefined): string {
  const zone = timezone || undefined
  return `${eventLocalWeekday(startISO, zone)} ${eventLocalTime(startISO, zone)}`
}

/** "Fri, Nov 20 · 21:00" — the date and time an event card shows. */
export function nightCardWhen(startISO: string, timezone: string | null | undefined): string {
  const zone = timezone || 'Europe/Berlin'
  const date = new Date(startISO).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: zone,
  })
  return `${date} · ${eventLocalTime(startISO, zone)}`
}

export function roleLabel(role: string | null | undefined): string | null {
  if (role === 'lead') return 'Leader'
  if (role === 'follow') return 'Follower'
  if (role === 'both') return 'Both'
  return null
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
    person: {
      name: input.name,
      photo: input.photo,
      city: input.city ?? '',
      role: input.role ?? null,
      styles: input.styles ?? [],
    },
    event: night
      ? {
          name: night.name,
          path: night.path || `/meet/ritual?with=${input.dancerId}`,
          whenLabel: night.whenLabel,
          venue: night.venue,
          cover: night.cover ?? null,
          going: night.going ?? 0,
        }
      : null,
  }
}

/** Notices they have not opened yet. Dismissing a toast does not count. */
export function unactedNotices(notices: readonly Notice[], actedIds: readonly string[]): Notice[] {
  const acted = new Set(actedIds)
  return notices.filter(n => !acted.has(n.id))
}
