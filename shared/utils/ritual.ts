/**
 * Color-and-shape ritual on a real Meet match (RAZ-1071).
 *
 * Pure pieces: the shared symbol (same for both dancers), the meetup clock,
 * the words each screen says, and whether the next-morning email is due.
 * Nothing here reads the database. The night-of copy never suggests a follow —
 * that sentence lives only in the next-day email.
 */
import { eventLocalDate, eventLocalTime, zonedToUtc } from './eventTime'

export type RitualShape = 'circle' | 'triangle' | 'square' | 'star' | 'cross'
export const RITUAL_PROBLEMS = ['couldnt_find', 'no_show', 'left', 'unsafe', 'other'] as const
export type RitualProblem = (typeof RITUAL_PROBLEMS)[number]
export type RitualHow = 'good' | 'not'

/** 23:15, the example from the brief, when that clock time falls inside the event. */
export const MEET_CLOCK = '23:15'
/** How long a social is assumed to run when it has no end, so 23:15 can still land inside it. */
const ASSUMED_LENGTH_MS = 5 * 3600_000
/** The morning-after email goes out once the event is over, and only until the next day's cron has had a chance. */
const FOLLOWUP_WINDOW_MS = 36 * 3600_000

export interface RitualColor {
  id: string
  /** CSS color, dark enough for white type. */
  css: string
  /** English name, for the screen reader. */
  name: string
}

export interface RitualMark {
  color: string
  colorName: string
  shape: RitualShape
  shapeName: string
  number: number
  code: string
}

/** Dark brand tokens. White type on each of these clears WCAG AA for large text. */
export const RITUAL_COLORS: readonly RitualColor[] = [
  { id: 'orange', css: 'var(--wd-orange-700)', name: 'orange' },
  { id: 'red', css: 'var(--wd-red-800)', name: 'red' },
  { id: 'rose', css: 'var(--wd-red-900)', name: 'rose' },
  { id: 'violet', css: 'var(--wd-violet-600)', name: 'violet' },
  { id: 'green', css: 'var(--wd-green-700)', name: 'green' },
  { id: 'cyan', css: 'var(--wd-cyan-700)', name: 'cyan' },
  { id: 'amber', css: 'var(--wd-amber-800)', name: 'amber' },
  { id: 'brown', css: 'var(--wd-brown-900)', name: 'brown' },
]

const SHAPES: readonly { id: RitualShape, name: string }[] = [
  { id: 'circle', name: 'circle' },
  { id: 'triangle', name: 'triangle' },
  { id: 'square', name: 'square' },
  { id: 'star', name: 'star' },
  { id: 'cross', name: 'cross' },
]

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export function givenName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] || ''
}

/** FNV-1a, unsigned. Stable across both dancers' phones. */
export function ritualHash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The symbol both dancers show. Swapping the two ids does not change it,
 * so each phone, turned toward the other person, shows the same color, shape and number.
 */
export function pairMark(a: string, b: string, eventId: string): RitualMark {
  const h = ritualHash([...[a, b].sort(), eventId].join(':'))
  const color = RITUAL_COLORS[h % RITUAL_COLORS.length]!
  const shape = SHAPES[(h >>> 8) % SHAPES.length]!
  const number = 10 + ((h >>> 16) % 90)
  const code = `${CODE_LETTERS[(h >>> 12) % CODE_LETTERS.length]}${(h >>> 20) % 10}`
  return { color: color.css, colorName: color.name, shape: shape.id, shapeName: shape.name, number, code }
}

/** Words for the symbol, for the screen reader. The other person is the one looking. */
export function markPhrase(mark: RitualMark): string {
  return `${mark.colorName} ${mark.shapeName} ${mark.number}`
}

/**
 * When the two of them meet. 23:15 local when that moment is during the event
 * (a 21:30 social that runs past midnight). Otherwise a little after the start,
 * still before the end.
 */
export function meetupAt(start: Date, end: Date | null, tz: string): Date {
  const zone = tz || 'Europe/Berlin'
  const startMs = start.getTime()
  const endMs = end && end.getTime() > startMs ? end.getTime() : startMs + ASSUMED_LENGTH_MS
  const at2315 = zonedToUtc(eventLocalDate(start, zone), MEET_CLOCK, zone).getTime()
  if (at2315 >= startMs && at2315 < endMs) return new Date(at2315)
  const plus90 = startMs + 90 * 60_000
  if (plus90 < endMs - 15 * 60_000) return new Date(plus90)
  const plus30 = startMs + 30 * 60_000
  if (plus30 < endMs) return new Date(plus30)
  return new Date(startMs)
}

/** True once the event is over, until the daily cron has had one morning to send. */
export function followupDue(end: Date, now: Date): boolean {
  const t = now.getTime() - end.getTime()
  return t >= 0 && t <= FOLLOWUP_WINDOW_MS
}

export type RitualEmailSkip = 'no_email' | 'off' | 'already'

/** Whether this dancer can be sent the morning-after email. */
export function ritualEmailBlock(p: { email: string | null, matchEmails: boolean, alreadySent: boolean }): RitualEmailSkip | null {
  if (p.alreadySent) return 'already'
  if (!p.email) return 'no_email'
  if (!p.matchEmails) return 'off'
  return null
}

export interface RitualFacts {
  you: string
  other: string
  event: string
  venue: string
  time: string
  weekday: string
}

export interface NightCopy {
  back: string
  toMeet: string
  toFriends: string
  signInTitle: string
  signInBody: string
  signIn: string
  noneTitle: string
  noneBody: string
  pickTitle: string
  pickHint: string
  notMatch: string
  matchKicker: string
  matchTitle: string
  matchBody: string
  book: string
  seeInstructions: string
  noNight: string
  tickets: string
  instructionsTitle: string
  safetyTitle: string
  safetyLeave: string
  safetyPublic: string
  safetyAdult: string
  safetyOptional: string
  turnHint: string
  showThem: string
  showAgain: string
  /** Addressed to the person the phone is turned toward. The holder's name, never the other's. */
  revealLine: string
  help: string
  tomorrow: string
  helpTitle: string
  helpBody: string
  problems: Record<RitualProblem, string>
  noteLabel: string
  notePlaceholder: string
  saveReport: string
  reportSaved: string
  morningKicker: string
  morningPending: string
  morningSent: string
  emailCaption: string
  howTitle: string
  howGood: string
  howNot: string
  howSaved: string
  follow: string
  following: string
  place: string
}

/** Everything said on the night itself. English only. No follow — that waits for the email. */
export function nightCopy(facts: RitualFacts): NightCopy {
  const { you, other, event } = facts
  return {
    back: 'Back',
    toMeet: 'Back to Meet',
    toFriends: 'Your dance friends',
    signInTitle: 'Sign in',
    signInBody: 'Sign in to book the night and see where you’ll meet.',
    signIn: 'Sign in',
    noneTitle: 'No match yet',
    noneBody: 'Say yes to each other on Meet. Then this page tells you when and where you’ll meet.',
    pickTitle: 'Who are you meeting?',
    pickHint: 'You both said yes.',
    notMatch: 'This isn’t one of your matches.',
    matchKicker: 'You both said yes',
    matchTitle: 'It’s a match',
    matchBody: `${other} said yes to you too. Book the night, then you’ll see when and where you meet.`,
    book: 'Book my spot',
    seeInstructions: 'See where you’ll meet',
    noNight: 'No night out you could both go to in the next two weeks.',
    tickets: 'Or buy a ticket',
    instructionsTitle: 'Where you’ll meet',
    safetyTitle: 'A few reassurances',
    safetyLeave: 'You can leave any time',
    safetyPublic: 'You meet in a public spot',
    safetyAdult: 'This meetup is 18+',
    safetyOptional: 'The ticks are optional.',
    turnHint: `Don’t look at the next screen. Turn your phone toward ${other} so they can see it.`,
    showThem: 'Turn your phone',
    showAgain: 'Show it again',
    revealLine: `Hi, I’m ${you}`,
    help: 'Couldn’t meet?',
    tomorrow: 'Tomorrow’s email',
    helpTitle: 'What happened?',
    helpBody: `This stays with WeDance. ${other} isn’t notified.`,
    problems: {
      couldnt_find: 'We couldn’t find each other',
      no_show: 'They didn’t come',
      left: 'I left',
      unsafe: 'It didn’t feel okay',
      other: 'Something else',
    },
    noteLabel: 'Anything else? Optional.',
    notePlaceholder: 'A sentence is enough',
    saveReport: 'Save',
    reportSaved: 'Saved. You can come back to this screen any time.',
    morningKicker: 'The next morning',
    morningPending: `You both get this email the morning after ${event}.`,
    morningSent: 'Sent.',
    emailCaption: 'The email',
    howTitle: 'How was it?',
    howGood: 'Good',
    howNot: 'Not this time',
    howSaved: 'Thanks, that’s in.',
    follow: `Follow ${other}`,
    following: `Following ${other}`,
    place: 'near the DJ booth',
  }
}

export interface RitualEmail {
  subject: string
  /** Plain text, including the link. */
  text: string
  /** The sentences shown on the morning screen — the same words as the email, without the raw URL. */
  paragraphs: readonly string[]
  html: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * The email both dancers get the morning after. Follow is suggested here and nowhere earlier.
 * English, like the other WeDance mail. `link` opens the morning screen; it does not follow by itself.
 */
export function ritualFollowup(
  facts: RitualFacts,
  link: string,
  unsubscribeUrl: string,
): RitualEmail {
  const where = facts.venue ? `${facts.venue}, near the DJ booth` : 'near the DJ booth'
  const subject = `How was it with ${facts.other}?`
  const paragraphs = [
    `Hey ${facts.you},`,
    `You were meeting ${facts.other} at ${facts.event}, ${facts.weekday} ${facts.time}, ${where}.`,
    'How was it? One tap tells us.',
    `If you’d like to see ${facts.other} again, you can follow them from that page. Only if you want to.`,
  ]
  const text = `${paragraphs.join('\n\n')}\n\n${link}\n`
  const html = `<div style="font-family: sans-serif; max-width: 460px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #333;">${esc(subject)}</h2>
      ${paragraphs.map(p => `<p style="color: #555;">${esc(p)}</p>`).join('\n')}
      <a href="${esc(link)}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">How was it?</a>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">You get this the morning after a meetup you booked. <a href="${esc(unsubscribeUrl)}" style="color: #999;">Stop these emails</a> · or turn them off in Settings.</p>
    </div>`
  return { subject, text, paragraphs, html }
}

/** 'HH:MM' of the meetup, in the event's own zone. */
export function meetupClock(start: Date, end: Date | null, tz: string): string {
  return eventLocalTime(meetupAt(start, end, tz), tz || 'Europe/Berlin')
}
