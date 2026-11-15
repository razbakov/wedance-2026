/**
 * "Meet new friends" (RAZ-989: its own page, `/meet`; My plan links there).
 *
 * The deck is people only: dancers going to your festivals, to ones you haven't
 * picked, and locals. `plan.discover` also returns festival / social cards —
 * This week and This year on My plan already hold those, so they are dropped.
 */
import { relatedDanceStyles } from '#shared/dance-styles'
import { WD } from './brand'

/** A card as `plan.discover` returns it (server/utils/myPlanFeeds.ts `DiscoverCard`). */
export type DiscoverCardIn =
  | { kind: 'dancer-local' | 'dancer-your-fest' | 'dancer-new-fest'; targetKind: 'dancer'; targetId: string; dancerName: string; dancerPhoto: string; dancerCity: string; dancerStyles: string[]; festivalSlug?: string; festivalName?: string; festivalColor?: string }
  | { kind: 'event-festival' | 'event-social'; targetKind: 'festival' | 'event'; targetId: string }

/** What a decision is stored against (discover_swipes); preview cards have none and never write. */
export type MeetTarget = { kind: 'dancer'; id: string; festivalSlug?: string }

type MeetCardBase = { id: string; target?: MeetTarget; name: string; photo: string; city: string; danceStyles: string[]; reason: string }
export type MeetCard =
  | MeetCardBase & { kind: 'dancer-your-fest' | 'dancer-new-fest'; festivalSlug: string; festivalName: string; festivalColor: string }
  | MeetCardBase & { kind: 'dancer-local'; regularAt?: string }

/** The people cards of a discover deck, each with one line on why it is there. */
export function toMeetCards(cards: readonly DiscoverCardIn[], me: { city?: string | null; styles?: readonly string[] | null }): MeetCard[] {
  const myCity = (me.city ?? '').trim().toLowerCase()
  const myStyles = me.styles ?? []
  const sharedWith = (styles: string[]) => styles.filter(s => myStyles.some(m => relatedDanceStyles(s, m)))

  const out: MeetCard[] = []
  for (const c of cards) {
    if (c.targetKind !== 'dancer' || !('dancerName' in c)) continue
    const base = {
      id: `dancer:${c.targetId}`,
      target: { kind: 'dancer' as const, id: c.targetId, festivalSlug: c.festivalSlug },
      name: c.dancerName,
      photo: c.dancerPhoto,
      city: c.dancerCity,
      danceStyles: c.dancerStyles,
    }
    const shared = sharedWith(c.dancerStyles)
    if (c.kind === 'dancer-local') {
      // The chip already says where they dance; only add what you share.
      const here = c.dancerCity && c.dancerCity.toLowerCase() === myCity ? ` in ${c.dancerCity}` : ''
      out.push({ ...base, kind: 'dancer-local', reason: shared.length ? `You both dance ${shared.join(' & ')}${here}.` : '' })
    } else if (c.kind === 'dancer-new-fest') {
      out.push({
        ...base, kind: 'dancer-new-fest',
        festivalSlug: c.festivalSlug ?? '', festivalName: c.festivalName ?? '', festivalColor: c.festivalColor ?? WD.sky500,
        reason: shared.length
          ? `${shared.join(' & ')} dancer heading to ${c.festivalName} — a festival not in your year yet.`
          : `Heading to ${c.festivalName} — a festival you haven't explored.`,
      })
    } else {
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
  if (count === null) return 'Dancers going where you go, and locals who dance like you'
  if (count === 0) return 'No one new right now — new dancers show up as they join'
  return `${count} ${count === 1 ? 'dancer' : 'dancers'} to meet — going where you go, or dancing near you`
}
