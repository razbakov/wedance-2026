// What an event page offers once a dancer has booked (RAZ-1010), and the older
// helpers for a workshop-plan link (`?invite=`), which old shared links still open.
//
// "Tell your story" is not a popup. It opens the story that already lives on
// My plan: the week, when this night is in the next seven days, or the year,
// when it's a festival further out (or one that has already started — the week
// story only lists nights still ahead). A class stays off it: that story is
// nights. Nothing is offered before they book.

import { eventLocalDate } from '#shared/utils/eventTime'

const CLASS_TYPES = ['class', 'course', 'practica', 'workshop']
const FESTIVAL_TYPES = ['festival', 'congress', 'weekender']

export type StoryPrompt = {
  href: '/my-plan#share-week' | '/my-plan#share-year'
  where: 'week' | 'year'
  label: 'Tell your story'
  line: string
}

const WEEK_LINE = 'Post that you’re going. Friends tap the link and say they’re in.'
const YEAR_LINE = 'Post the festivals you’re going to. Friends can follow your year.'

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

/**
 * Where "Tell your story" goes after a booking. Null = don't show it.
 * `now` and `timezone` keep the week boundary testable; the week is the
 * event's local today and the next six days, same as My plan.
 */
export function storyAfterBooking(input: {
  booked: boolean
  signedIn: boolean
  type?: string | null
  isFestival?: boolean
  startDate?: string | null
  timezone?: string | null
  now?: Date
}): StoryPrompt | null {
  if (!input.booked || !input.signedIn) return null
  const type = String(input.type ?? '').trim().toLowerCase()
  if (CLASS_TYPES.includes(type)) return null
  const festival = !!input.isFestival || FESTIVAL_TYPES.includes(type)
  const now = input.now ?? new Date()
  const tz = input.timezone || undefined
  const today = tz ? eventLocalDate(now, tz) : dayKey(now)

  if (!input.startDate) return weekPrompt()
  const day = eventLocalDate(input.startDate, tz)
  // Already begun: the week story has dropped it. A festival still has the year.
  if (day < today) return festival ? yearPrompt() : null
  // Today and the next six days (My plan's Week: date < today + 7).
  if (day < plusDays(today, 7)) return weekPrompt()
  return festival ? yearPrompt() : null
}

function weekPrompt(): StoryPrompt {
  return { href: '/my-plan#share-week', where: 'week', label: 'Tell your story', line: WEEK_LINE }
}

function yearPrompt(): StoryPrompt {
  return { href: '/my-plan#share-year', where: 'year', label: 'Tell your story', line: YEAR_LINE }
}

export type ShareMode = 'plan' | 'event'

export function shareMode(sessionCount: number, plannedCount: number): ShareMode {
  return sessionCount > 1 && plannedCount > 0 ? 'plan' : 'event'
}

/** "class" / "festival" / "event" — how a shared link names the thing. */
export function eventNoun(type: string | null | undefined): 'class' | 'festival' | 'event' {
  const t = String(type ?? 'festival').toLowerCase()
  if (CLASS_TYPES.includes(t)) return 'class'
  if (FESTIVAL_TYPES.includes(t)) return 'festival'
  return 'event'
}

/** Adds `ref=<code>` to a link — only when the event has a referral discount. */
export function withReferral(url: string, code: string | null | undefined, discountPercent: number): string {
  if (!code || !(discountPercent > 0)) return url
  return `${url}${url.includes('?') ? '&' : '?'}ref=${encodeURIComponent(code)}`
}

/** The words that go with the link in the share sheet. */
export function shareText(mode: ShareMode, name: string, planned: number): string {
  if (mode === 'plan') return `My plan for ${name}: ${planned} ${planned === 1 ? 'workshop' : 'workshops'}. Join me?`
  return `Join me at ${name}?`
}
