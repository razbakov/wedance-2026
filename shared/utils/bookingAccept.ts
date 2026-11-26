/**
 * A yes on a booking request (RAZ-1089): whose event it becomes, what that
 * draft is called, and when an unanswered request is reminded once.
 * The router and the reminder cron share these rules.
 */
import { zonedToUtc } from './eventTime'

/** One reminder, once the request has sat unanswered for three days. */
export const REMIND_AFTER_MS = 3 * 24 * 3600_000
/** Older than this when the reminder job runs, it is left alone (no burst of old mail). */
export const REMIND_UNTIL_MS = 14 * 24 * 3600_000

const EVENT_TYPE: Record<string, string> = {
  'Workshop or class': 'Workshop',
  'Show': 'Show',
  'DJ set': 'Party',
  'Festival': 'Festival',
  'Festival slot': 'Festival',
  'Party': 'Party',
  'Private event': 'Party',
  'Concert': 'Concert',
  'Tour booking': 'Show',
  'Book an artist': 'Show',
  'Collaboration': 'Party',
  'Event for us': 'Party',
}

/** The page that hosts the draft, or null when we must not guess. Never the artist’s own page. */
export function hostForBooking(
  inquiry: { askerProfileId: string | null; organization: string | null },
  pages: { id: string; name: string }[],
  artistProfileId: string,
): string | null {
  if (inquiry.askerProfileId && inquiry.askerProfileId !== artistProfileId) return inquiry.askerProfileId
  const others = pages.filter(p => p.id !== artistProfileId)
  if (others.length === 1) return others[0]!.id
  const org = (inquiry.organization ?? '').trim().toLowerCase()
  if (!org) return null
  const hits = others.filter(p => p.name.trim().toLowerCase() === org)
  return hits.length === 1 ? hits[0]!.id : null
}

export function draftEventName(artistName: string, what: string): string {
  const artist = artistName.trim() || 'Artist'
  const asked = what.trim()
  return (asked ? `${asked} · ${artist}` : artist).slice(0, 120)
}

export function eventTypeForBooking(what: string): string {
  return EVENT_TYPE[what.trim()] ?? 'Party'
}

/** 20:00–23:00 on the requested day, in the city’s zone. No date → no clock time. */
export function bookingInstants(eventDate: string | null | undefined, tz: string): { start: Date; end: Date } | null {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null
  const start = zonedToUtc(eventDate, '20:00', tz || 'Europe/Berlin')
  return { start, end: new Date(start.getTime() + 3 * 3600_000) }
}

/** A new request, or one only marked “answered” by email, can still become a booking. */
export function canBook(status: string): boolean {
  return status === 'new' || status === 'answered'
}

/** Still unanswered, three to fourteen days old, and not reminded yet. */
export function dueForReminder(
  row: { status: string; createdAt: Date; remindedAt: Date | null },
  now = new Date(),
): boolean {
  if (row.status !== 'new' || row.remindedAt) return false
  const age = now.getTime() - new Date(row.createdAt).getTime()
  return age >= REMIND_AFTER_MS && age < REMIND_UNTIL_MS
}

/** Waiting longer than the reminder delay — for the asker’s inbox, with no upper bound. */
export function waitingLong(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() >= REMIND_AFTER_MS
}
