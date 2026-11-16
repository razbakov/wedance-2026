// What "Bring friends" on an event page sends (RAZ-1001).
//
// A workshop plan is only worth sending when there is one: the event has more
// than one session to pick from and the dancer picked some. A class with a
// single item in its schedule, or a festival before anything is picked, sends
// the event itself — never "your 0 workshop plan".

const CLASS_TYPES = ['class', 'course', 'practica', 'workshop']
const FESTIVAL_TYPES = ['festival', 'congress', 'weekender']

export type ShareMode = 'plan' | 'event'

export function shareMode(sessionCount: number, plannedCount: number): ShareMode {
  return sessionCount > 1 && plannedCount > 0 ? 'plan' : 'event'
}

/** "class" / "festival" / "event" — how the popup names the thing. */
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
