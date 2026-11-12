/**
 * What an artist needs to answer "you're in our line-up": when and where, the
 * classes and slots with their name on them, and what the flyer shows of them,
 * then the link. Used by artistInvites.link (the message the organizer pastes)
 * and artistInvites.notify (the email), so both say the same thing.
 */
import { SESSION_TYPE_LABEL, clockTime, isWorkshop, sessionType } from './programme'

export type ArtistSlot = { date: string; time: string; title: string; type: string; style?: string }

export type ArtistInviteFacts = {
  artistName: string
  host: string | null
  /** Dance events this organizer has run before. */
  hostEvents: number
  hostCity: string | null
  eventName: string
  /** "Saturday 14 November", or "Saturday 14 – Sunday 15 November". */
  when: string
  /** "Salsea Dance Academy, Munich". */
  place: string
  /** Their classes and slots, in order. */
  slots: ArtistSlot[]
  /** yyyy-mm-dd → "Sat", for slots over several days. */
  dayLabels: Record<string, string>
  /** What the kept flyer shows of them. */
  flyer: 'pictured' | 'named' | null
}

/** "10:00 Lady Styling", "21:00 party" — with the day in front when the event has several. */
export function slotLine(s: ArtistSlot, dayLabels: Record<string, string> = {}): string {
  const t = sessionType(s.type)
  const what = s.title?.trim() || (isWorkshop(t) ? `${s.style ? `${s.style} ` : ''}workshop` : SESSION_TYPE_LABEL[t].toLowerCase())
  const day = Object.keys(dayLabels).length > 1 ? `${dayLabels[s.date] ?? s.date} ` : ''
  return `${day}${clockTime(s.time) ?? s.time} ${what}`.trim()
}

/** "Your classes" or "Your sets": what to call their slots. */
function slotsLabel(slots: ArtistSlot[]): string {
  const all = slots.map(s => sessionType(s.type))
  if (all.every(isWorkshop)) return slots.length === 1 ? 'Your class' : 'Your classes'
  return slots.length === 1 ? 'Your slot' : 'Your slots'
}

function slotsText(f: ArtistInviteFacts): string {
  const lines = f.slots.map(s => slotLine(s, f.dayLabels))
  return (lines.length > 5 ? [...lines.slice(0, 4), `+${lines.length - 4} more`] : lines).join(' · ')
}

const flyerText = (f: ArtistInviteFacts['flyer']) =>
  f === 'pictured' ? 'The flyer is ready, with your name and photo' : f === 'named' ? 'The flyer is ready, with your name' : ''

/** What we ask them to confirm: always that they're in and their classes; the flyer when there is one. */
const askText = (f: ArtistInviteFacts) =>
  `Could you confirm you're in, and check your ${f.slots.length ? 'classes' : 'slot'}${f.flyer ? ` and how the flyer shows you (you can change your photo there)` : ''}?`

/** The message the organizer sends: the facts first, the link last. */
export function artistInviteMessage(f: ArtistInviteFacts, url: string): string {
  const first = f.artistName.split(/\s+/)[0] || f.artistName
  const intro = f.host
    ? ` This is ${f.host}${f.hostEvents >= 2 ? `: we've organised ${f.hostEvents} dance events${f.hostCity ? ` in ${f.hostCity}` : ''}` : ''}.`
    : ''
  const lines = [
    `Hi ${first}!${intro}`,
    `You're in the line-up of ${f.eventName}:`,
    `📅 ${[f.when, f.place].filter(Boolean).join(' · ')}`,
    f.slots.length ? `🕒 ${slotsLabel(f.slots)}: ${slotsText(f)}` : '🕒 Your slot isn’t in the programme yet: tell us what suits you',
    flyerText(f.flyer) && `🎨 ${flyerText(f.flyer)}`,
  ]
  return `${lines.filter(Boolean).join('\n')}\n\n${askText(f)} It takes a minute: ${url}`
}

/** The same facts as short lines, for the email. */
export function artistInviteLines(f: ArtistInviteFacts): string[] {
  return [
    f.place,
    f.slots.length ? `${slotsLabel(f.slots)}: ${f.slots.map(s => slotLine(s, f.dayLabels)).join(' · ')}` : 'Your slot isn’t in the programme yet',
    flyerText(f.flyer),
  ].filter(Boolean)
}
