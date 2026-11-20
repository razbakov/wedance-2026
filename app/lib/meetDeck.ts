/**
 * "Meet new friends" (RAZ-989: its own page, `/meet`; My plan links there).
 *
 * The deck is people only, and only people going somewhere (RAZ-981): dancers
 * signed up to a night out in your city, or with that night on their plan —
 * the same night as you first — and dancers going to a festival who chose
 * "Show me". Each card leads to that
 * night or festival. `plan.discover` also returns festival / social cards —
 * Your week and Your festivals on My plan already hold those, so they are dropped.
 */
import { relatedDanceStyles } from '#shared/dance-styles'
import { eventPath } from '#shared/utils/eventSlug'
import { eventLocalTime, eventLocalWeekday } from '#shared/utils/eventTime'
import { WD } from './brand'

/** A card as `plan.discover` returns it (server/utils/myPlanFeeds.ts `DiscoverCard`). */
type DancerIn = { targetKind: 'dancer'; targetId: string; dancerName: string; dancerPhoto: string; dancerCity: string; dancerStyles: string[] }
export type DiscoverCardIn =
  | DancerIn & { kind: 'dancer-your-fest' | 'dancer-new-fest'; festivalSlug?: string; festivalName?: string; festivalColor?: string }
  | DancerIn & { kind: 'dancer-same-night' | 'dancer-going-out'; eventId: string; eventName: string; eventDateISO: string; eventTimezone: string | null; eventVenue: string }
  | { kind: 'event-festival' | 'event-social'; targetKind: 'festival' | 'event'; targetId: string }

/** What a decision is stored against (discover_swipes); preview cards have none and never write. */
export type MeetTarget = { kind: 'dancer'; id: string; festivalSlug?: string }

type MeetCardBase = { id: string; target?: MeetTarget; name: string; photo: string; city: string; danceStyles: string[]; reason: string }
export type MeetCard =
  | MeetCardBase & { kind: 'dancer-your-fest' | 'dancer-new-fest'; festivalSlug: string; festivalName: string; festivalColor: string }
  | MeetCardBase & { kind: 'dancer-same-night' | 'dancer-going-out'; night: MeetNight }

/** The night out a dancer is on the card for: a link and a short "Fri 21:00 · La Rumba". */
export type MeetNight = { path: string; name: string; when: string; venue: string }

/** "Fri 21:00" in the event's own zone. */
export function nightWhen(iso: string, tz: string | null): string {
  const zone = tz || undefined
  return `${eventLocalWeekday(iso, zone).slice(0, 3)} ${eventLocalTime(iso, zone)}`
}

/** The people cards of a discover deck, each with one line on why it is there. */
export function toMeetCards(cards: readonly DiscoverCardIn[], me: { styles?: readonly string[] | null }): MeetCard[] {
  const myStyles = me.styles ?? []
  const sharedWith = (styles: string[]) => styles.filter(s => myStyles.some(m => relatedDanceStyles(s, m)))

  const out: MeetCard[] = []
  for (const c of cards) {
    if (c.targetKind !== 'dancer' || !('dancerName' in c)) continue
    const base = {
      id: `dancer:${c.targetId}`,
      target: { kind: 'dancer' as const, id: c.targetId, festivalSlug: 'festivalSlug' in c ? c.festivalSlug : undefined },
      name: c.dancerName,
      photo: c.dancerPhoto,
      city: c.dancerCity,
      danceStyles: c.dancerStyles,
    }
    const shared = sharedWith(c.dancerStyles)
    if (c.kind === 'dancer-same-night' || c.kind === 'dancer-going-out') {
      const night: MeetNight = {
        path: eventPath({ id: c.eventId, name: c.eventName }),
        name: c.eventName,
        when: nightWhen(c.eventDateISO, c.eventTimezone),
        venue: c.eventVenue,
      }
      const also = shared.length ? ` You both dance ${shared.join(' & ')}.` : ''
      out.push({
        ...base, kind: c.kind, night,
        reason: c.kind === 'dancer-same-night'
          ? `You're both going to ${c.eventName} — say hi there.${also}`
          : `Going to ${c.eventName}. Join them, and you'll meet there.${also}`,
      })
    } else if (c.kind === 'dancer-new-fest') {
      out.push({
        ...base, kind: 'dancer-new-fest',
        festivalSlug: c.festivalSlug ?? '', festivalName: c.festivalName ?? '', festivalColor: c.festivalColor ?? WD.sky500,
        reason: shared.length
          ? `${shared.join(' & ')} dancer heading to ${c.festivalName} — a festival not in your year yet.`
          : `Heading to ${c.festivalName} — a festival you haven't explored.`,
      })
    } else if (c.kind === 'dancer-your-fest') {
      out.push({
        ...base, kind: 'dancer-your-fest',
        festivalSlug: c.festivalSlug ?? '', festivalName: c.festivalName ?? '', festivalColor: c.festivalColor ?? WD.violet600,
        reason: `Also going to ${c.festivalName} — you'll be at the same festival.`,
      })
    }
  }
  return out
}

/** The line on My plan's "Meet new friends" card: how many people are waiting. */
export function meetEntryLine(count: number | null): string {
  if (count === null) return 'Dancers going out near you, and to your festivals'
  if (count === 0) return 'Nobody new is going out yet — sign up to a night and you’ll be the first they see'
  return `${count} ${count === 1 ? 'dancer' : 'dancers'} going out — meet them there`
}
