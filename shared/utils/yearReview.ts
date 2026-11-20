/**
 * Your year in dance (RAZ-966): a look back at the dancer's past year, told as
 * a story of a few screens (Wrapped style) to post at New Year, ending on
 * "now plan next year".
 *
 * A "night" is any past event of that year the dancer was going to: Going! in
 * their plan, a "yes" on an event poll, a ticket, or a party in a weekend they
 * shared or joined. It's intent, not proof, so the story says "nights you were
 * going to", never "nights you danced". Mock / preview data never gets here —
 * the server only reads real events and festivals.
 *
 * A thin year just gets fewer screens: a screen with nothing to say is left
 * out (no filling in with the city's year).
 */
import type { DanceFamilyId } from '../dance-styles'
import { partyFamily, partyStyleLabel } from './storyLines'

export type YearNightKind = 'social' | 'class' | 'festival'

export type YearNight = {
  /** Event id, or `festival:<slug>`. */
  id: string
  kind: YearNightKind
  name: string
  /** ISO date-time (events) or YYYY-MM-DD (festivals). */
  start: string
  end?: string | null
  city?: string | null
  country?: string | null
  styles: readonly string[]
  /** Where it was: a venue page's name, else the venue name on the event. */
  venue?: string | null
  /** Who ran it: an organiser name. */
  organizer?: string | null
}

export type YearReviewFacts = {
  year: number
  /** First name, for the masthead ("ANA’S 2026"). */
  name: string
  nights: readonly YearNight[]
  /** Distinct friends who said "I'm in" on a weekend the dancer shared. */
  friendsJoined: number
  /** Festivals already in the plan for next year (the last screen). */
  nextYearFestivals: number
}

export type YearReviewScreen =
  | { kind: 'intro'; year: number; nights: number }
  | { kind: 'nights'; nights: number; months: number[]; family: DanceFamilyId | null }
  | { kind: 'style'; style: string; share: number; others: string[]; family: DanceFamilyId | null }
  | { kind: 'month'; month: string; nights: number }
  | { kind: 'floor'; venue: string; nights: number; city: string }
  | { kind: 'festivals'; festivals: Array<{ name: string; month: string; place: string; family: DanceFamilyId | null }> }
  | { kind: 'cities'; cities: string[]; countries: number }
  | { kind: 'friends'; friends: number }
  | { kind: 'first'; name: string; date: string }
  | { kind: 'next'; year: number; planned: number }

export type YearReview = {
  year: number
  name: string
  nights: number
  festivals: number
  classes: number
  cities: number
  /** The family that colours the story: the one most nights are. */
  family: DanceFamilyId | null
  screens: YearReviewScreen[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The year the look back is about: last year in January (it just ended), else this one. */
export function lookBackYear(now = new Date()): number {
  return now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
}

/** The turn of the year — December and January — when My plan puts the look back up front. */
export function isYearTurn(now = new Date()): boolean {
  const m = now.getUTCMonth()
  return m === 11 || m === 0
}

function monthOf(start: string): number {
  const d = new Date(start)
  return Number.isNaN(d.getTime()) ? -1 : d.getUTCMonth()
}

function clean(s: string | null | undefined): string {
  return (s ?? '').trim()
}

/** Most common value (the earliest seen wins a tie), with its count. */
function top<T>(values: readonly T[]): [T, number] | null {
  const counts = new Map<T, number>()
  let best: T | undefined
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1
    counts.set(v, n)
    if (best === undefined || n > counts.get(best)!) best = v
  }
  return best === undefined ? null : [best, counts.get(best)!]
}

function shortDate(start: string): string {
  const d = new Date(start)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/** The story for a dancer's year. Screens with nothing to say are left out. */
export function buildYearReview(facts: YearReviewFacts): YearReview {
  const nights = facts.nights
    .filter(n => n.start && monthOf(n.start) >= 0)
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
  const festivals = nights.filter(n => n.kind === 'festival')
  const classes = nights.filter(n => n.kind === 'class')
  const out = nights.filter(n => n.kind !== 'class')

  const families = nights.map(n => partyFamily({ name: n.name, styles: n.styles })).filter((f): f is DanceFamilyId => !!f)
  const family = top(families)?.[0] ?? null

  const cities = [...new Set(nights.map(n => clean(n.city)).filter(Boolean))]
  const countries = new Set(nights.map(n => clean(n.country)).filter(Boolean)).size

  const screens: YearReviewScreen[] = []
  if (nights.length) screens.push({ kind: 'intro', year: facts.year, nights: nights.length })

  // Nights out (classes have their own count on the intro; a course isn't a night out).
  if (out.length) {
    const months = Array.from({ length: 12 }, () => 0)
    for (const n of out) months[monthOf(n.start)]!++
    screens.push({ kind: 'nights', nights: out.length, months, family })
  }

  // The style of the year: only when the dancer has more than one night with a style.
  const styleOf = nights.map(n => partyStyleLabel({ name: n.name, styles: n.styles })).filter(Boolean)
  const topStyle = top(styleOf)
  if (topStyle && styleOf.length >= 2) {
    const others = [...new Set(styleOf.filter(s => s !== topStyle[0]))].slice(0, 3)
    const styleFamily = partyFamily({ name: '', styles: [topStyle[0]] })
    screens.push({ kind: 'style', style: topStyle[0], share: Math.round((topStyle[1] / styleOf.length) * 100), others, family: styleFamily })
  }

  // The busiest month: worth a screen only when it stands out (2+ nights).
  const busiest = top(out.map(n => monthOf(n.start)))
  if (busiest && busiest[1] >= 2) screens.push({ kind: 'month', month: MONTHS[busiest[0]]!, nights: busiest[1] })

  // Home floor: the venue they were at most, when it's more than once.
  // Keyed by venue + city: two bars can share a name.
  const floor = top(out.filter(n => n.kind === 'social' && clean(n.venue)).map(n => `${clean(n.venue)}\n${clean(n.city)}`))
  if (floor && floor[1] >= 2) {
    const [venue, city] = floor[0].split('\n') as [string, string]
    screens.push({ kind: 'floor', venue, nights: floor[1], city })
  }

  if (festivals.length) {
    screens.push({
      kind: 'festivals',
      festivals: festivals.map(f => ({
        name: f.name,
        month: new Date(f.start).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase().slice(0, 3),
        place: [clean(f.city), clean(f.country)].filter(Boolean).join(' · '),
        family: partyFamily({ name: f.name, styles: f.styles }),
      })),
    })
  }

  if (cities.length >= 2) screens.push({ kind: 'cities', cities, countries })

  if (facts.friendsJoined > 0) screens.push({ kind: 'friends', friends: facts.friendsJoined })

  // Where it started: the year's first night, when there's more than one.
  if (nights.length >= 2) screens.push({ kind: 'first', name: nights[0]!.name, date: shortDate(nights[0]!.start) })

  // Always last: celebrate first, then plan.
  screens.push({ kind: 'next', year: facts.year + 1, planned: facts.nextYearFestivals })

  return {
    year: facts.year,
    name: clean(facts.name).split(/\s+/)[0] ?? '',
    nights: nights.length,
    festivals: festivals.length,
    classes: classes.length,
    cities: cities.length,
    family,
    screens,
  }
}

/** Plain-text version of a screen: alt text for its picture and the share text. */
export function screenText(s: YearReviewScreen, year: number): string {
  switch (s.kind) {
    case 'intro': return `My ${year} in dance: ${s.nights} ${s.nights === 1 ? 'night' : 'nights'} I was going to.`
    case 'nights': return `${s.nights} ${s.nights === 1 ? 'night' : 'nights'} out in ${year}.`
    case 'style': return `${s.style} was my year: ${s.share}% of my nights.`
    case 'month': return `${s.month} was on fire: ${s.nights} nights.`
    case 'floor': return `My home floor: ${s.venue}${s.city ? `, ${s.city}` : ''} — ${s.nights} nights.`
    case 'festivals': return `${s.festivals.length} ${s.festivals.length === 1 ? 'festival' : 'festivals'}: ${s.festivals.map(f => f.name).join(', ')}.`
    case 'cities': return `Danced in ${s.cities.length} cities: ${s.cities.join(', ')}.`
    case 'friends': return `${s.friends} ${s.friends === 1 ? 'friend' : 'friends'} came along.`
    case 'first': return `It started on ${s.date}: ${s.name}.`
    case 'next': return `${s.year}: let’s plan it. See you on the floor.`
  }
}
