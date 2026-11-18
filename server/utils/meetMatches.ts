/**
 * "Meet new friends" matches (RAZ-985): two dancers who said yes to each other.
 *
 * Two places record a "yes" to another dancer today:
 *  - the deck on /meet (linked from My plan) → discover_swipes (target_kind 'dancer', decision 'yes');
 *  - "Shall we dance?" on a festival page → festival_waves (per festival).
 * A match is a yes in both directions, in either place. Both are merged here
 * into one list per other dancer, with where it came from (`deck`, festivals).
 *
 * Each match gets one next step — `night`: a night out both could go to in the
 * next 14 days. Order: both going › they're going › I'm going › a social in my
 * city whose styles suit both. "They're going" only counts when they share that
 * they're going (plan_items.share_going), the same opt-in as "Who's going".
 *
 * "Next time" on a match's night (something came up) is a Skip on that event
 * in discover_swipes: it is never suggested again, the next one is. "I'm going
 * too" adds the night to the plan with metadata.with = the match's dancer id, so
 * that one match sees "<name> is going" even when the dancer doesn't share their
 * plan publicly.
 *
 * Only public profiles with a photo are returned (the deck's own rule). Nobody
 * is notified from here — this only reads. Shown on My plan ("Your dance
 * friends", MeetMatches.vue); counted from MEET_MATCHES_SINCE (the day the deck
 * started saying "if they say yes too, we tell you both").
 */
import { and, asc, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { dancers, discoverSwipes, events, festivals, festivalWaves, planItems } from '../database/schema'
import { asDanceRole, asStyleList, type DanceRole } from '../../shared/utils/notices'
import { eventPath } from '../../shared/utils/eventSlug'
import { NON_SOCIAL_TYPES, citySlugFor, claimableFestivals, stylesMatch } from './myPlanFeeds'

type Db = any

const DAY = 86400_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** How far ahead the next-step night is looked for. */
export const MATCH_NIGHT_DAYS = 14
/**
 * Yeses count from when the deck's copy changed to "If they say yes too, we
 * tell you both" (RAZ-985). Earlier ones were made under "Only you know".
 */
export const MEET_MATCHES_SINCE = new Date('2026-11-16T19:00:00Z')

export type MatchNight = {
  eventId: string
  name: string
  path: string
  startISO: string
  timezone: string | null
  venue: string
  /** Who already has it in their plan. */
  youGoing: boolean
  theyGoing: boolean
}

export type MeetMatch = {
  dancerId: string
  name: string
  photo: string | null
  username: string | null
  city: string
  role: DanceRole | null
  styles: string[]
  instagram: string | null
  /** When the second yes landed — the moment it became a match. */
  matchedAt: string
  /** Said yes to each other in the My plan deck. */
  deck: boolean
  /** Festivals where they waved at each other. */
  festivals: { slug: string; name: string }[]
  night: MatchNight | null
}

/** One yes: from → to, when, and (for waves) the festival. */
export type YesEdge = { from: string; to: string; at: Date | null; festivalSlug?: string | null }

export type MutualPair = { other: string; matchedAt: Date; deck: boolean; festivalSlugs: string[] }

const time = (d: Date | null | undefined) => (d ? new Date(d).getTime() : 0)

/**
 * Pair up yeses in both directions for `me`. Deck edges match on the dancer
 * alone; wave edges match per festival. Result: one entry per other dancer,
 * newest match first; matchedAt = the later of the two yeses (latest pair wins).
 */
export function mutualPairs(me: string, deck: YesEdge[], waves: YesEdge[]): MutualPair[] {
  const out = new Map<string, MutualPair>()
  const add = (other: string, at: number, kind: 'deck' | string) => {
    const cur = out.get(other) ?? { other, matchedAt: new Date(0), deck: false, festivalSlugs: [] }
    if (kind === 'deck') cur.deck = true
    else if (!cur.festivalSlugs.includes(kind)) cur.festivalSlugs.push(kind)
    if (at > cur.matchedAt.getTime()) cur.matchedAt = new Date(at)
    out.set(other, cur)
  }

  const myDeck = new Map<string, number>()
  for (const e of deck) if (e.from === me && e.to !== me) myDeck.set(e.to, Math.max(myDeck.get(e.to) ?? 0, time(e.at)))
  for (const e of deck) {
    if (e.to !== me || e.from === me || !myDeck.has(e.from)) continue
    add(e.from, Math.max(myDeck.get(e.from)!, time(e.at)), 'deck')
  }

  const myWaves = new Map<string, number>()
  const key = (other: string, slug: string) => `${slug}\u0000${other}`
  for (const e of waves) if (e.from === me && e.to !== me && e.festivalSlug) myWaves.set(key(e.to, e.festivalSlug), time(e.at))
  for (const e of waves) {
    if (e.to !== me || e.from === me || !e.festivalSlug) continue
    const mine = myWaves.get(key(e.from, e.festivalSlug))
    if (mine === undefined) continue
    add(e.from, Math.max(mine, time(e.at)), e.festivalSlug)
  }

  return [...out.values()].sort((a, b) => b.matchedAt.getTime() - a.matchedAt.getTime())
}

export type NightCandidate = {
  id: string
  name: string
  type: string | null
  citySlug: string | null
  startDate: Date
  timezone: string | null
  venueName: string | null
  styles: string[]
}

/**
 * The one night out to suggest for a match. Both going › they're going (and
 * shared it) › I'm going › a social in my city that suits both dancers' styles.
 * Soonest wins within a rank. `null` when nothing fits.
 */
export function pickNight(
  candidates: NightCandidate[],
  ctx: { myCitySlug: string; myStyles: string[]; theirStyles: string[]; mine: Set<string>; theirs: Set<string> },
): MatchNight | null {
  let best: { rank: number; ev: NightCandidate } | null = null
  for (const ev of candidates) {
    const you = ctx.mine.has(ev.id)
    const they = ctx.theirs.has(ev.id)
    let rank = 0
    if (you && they) rank = 4
    else if (they) rank = 3
    else if (you) rank = 2
    else {
      if (!ctx.myCitySlug || ev.citySlug !== ctx.myCitySlug) continue
      if (NON_SOCIAL_TYPES.includes(ev.type ?? '')) continue
      const fits = (s: string[]) => !s.length || !ev.styles.length || stylesMatch(ev.styles, s)
      if (!fits(ctx.myStyles) || !fits(ctx.theirStyles)) continue
      rank = 1
    }
    if (!best || rank > best.rank || (rank === best.rank && ev.startDate < best.ev.startDate)) best = { rank, ev }
  }
  if (!best) return null
  const ev = best.ev
  return {
    eventId: ev.id,
    name: ev.name,
    path: eventPath(ev),
    startISO: ev.startDate.toISOString(),
    timezone: ev.timezone,
    venue: ev.venueName ?? '',
    youGoing: ctx.mine.has(ev.id),
    theyGoing: ctx.theirs.has(ev.id),
  }
}

/**
 * Every dancer `dancerId` has a mutual yes with. `since` leaves out yeses made
 * before a date (e.g. those made while the copy said "they aren't told").
 */
export async function meetMatches(db: Db, dancerId: string, opts: { now?: Date; since?: Date | null } = {}): Promise<MeetMatch[]> {
  const now = opts.now ?? new Date()
  const since = opts.since ?? null
  const okTime = (at: Date | null) => !since || time(at) >= since.getTime()

  // 1. Deck yeses: mine, then theirs back at me.
  const myDeck: Array<{ to: string; at: Date | null }> = await db
    .select({ to: discoverSwipes.targetId, at: discoverSwipes.createdAt })
    .from(discoverSwipes)
    .where(and(eq(discoverSwipes.dancerId, dancerId), eq(discoverSwipes.targetKind, 'dancer'), eq(discoverSwipes.decision, 'yes')))
  const deckTargets = myDeck.map(r => r.to).filter(id => UUID_RE.test(id) && id !== dancerId)
  const backDeck: Array<{ from: string; at: Date | null }> = deckTargets.length
    ? await db
      .select({ from: discoverSwipes.dancerId, at: discoverSwipes.createdAt })
      .from(discoverSwipes)
      .where(and(
        eq(discoverSwipes.targetKind, 'dancer'),
        eq(discoverSwipes.targetId, dancerId),
        eq(discoverSwipes.decision, 'yes'),
        inArray(discoverSwipes.dancerId, deckTargets),
      ))
    : []

  // 2. Festival waves: mine, then theirs back at me (any festival; paired per festival).
  const myWaves: Array<{ to: string; at: Date | null; slug: string }> = await db
    .select({ to: festivalWaves.targetDancerId, at: festivalWaves.createdAt, slug: festivalWaves.festivalSlug })
    .from(festivalWaves)
    .where(eq(festivalWaves.dancerId, dancerId))
  const waveTargets = [...new Set(myWaves.map(r => r.to))].filter(id => id !== dancerId)
  const backWaves: Array<{ from: string; at: Date | null; slug: string }> = waveTargets.length
    ? await db
      .select({ from: festivalWaves.dancerId, at: festivalWaves.createdAt, slug: festivalWaves.festivalSlug })
      .from(festivalWaves)
      .where(and(eq(festivalWaves.targetDancerId, dancerId), inArray(festivalWaves.dancerId, waveTargets)))
    : []

  const pairs = mutualPairs(
    dancerId,
    [
      ...myDeck.filter(r => okTime(r.at)).map(r => ({ from: dancerId, to: r.to, at: r.at })),
      ...backDeck.filter(r => okTime(r.at)).map(r => ({ from: r.from, to: dancerId, at: r.at })),
    ],
    [
      ...myWaves.filter(r => okTime(r.at)).map(r => ({ from: dancerId, to: r.to, at: r.at, festivalSlug: r.slug })),
      ...backWaves.filter(r => okTime(r.at)).map(r => ({ from: r.from, to: dancerId, at: r.at, festivalSlug: r.slug })),
    ],
  )
  if (!pairs.length) return []

  // 3. Profiles — public, with a photo.
  const otherIds = pairs.map(p => p.other)
  const [me] = await db
    .select({ city: dancers.city, danceStyles: dancers.danceStyles })
    .from(dancers)
    .where(eq(dancers.id, dancerId))
  const people: any[] = await db
    .select({
      id: dancers.id, name: dancers.name, photo: dancers.photo, username: dancers.username,
      city: dancers.city, danceStyles: dancers.danceStyles, danceLevels: dancers.danceLevels,
      role: dancers.role, instagram: dancers.instagram, profilePublic: dancers.profilePublic,
    })
    .from(dancers)
    .where(inArray(dancers.id, otherIds))
  const byId = new Map<string, any>(people.filter(p => p.profilePublic !== false && p.photo).map(p => [p.id, p]))
  const shown = pairs.filter(p => byId.has(p.other))
  if (!shown.length) return []

  // 4. Festival names.
  const slugs = [...new Set(shown.flatMap(p => p.festivalSlugs))]
  const festNames = new Map<string, string>()
  if (slugs.length) {
    try {
      const legacy: Array<{ slug: string; name: string }> = await db.select({ slug: festivals.slug, name: festivals.name }).from(festivals).where(inArray(festivals.slug, slugs))
      for (const f of legacy) festNames.set(f.slug, f.name)
      for (const f of (await claimableFestivals(db, slugs, new Date(0))).values()) festNames.set(f.slug, f.name)
    } catch { /* names are nice to have — the slug stands in */ }
  }

  // 5. Next-step night: plans of both sides + my city's socials, next 14 days.
  const myCitySlug = await citySlugFor(db, me?.city)
  const myStyles = (me?.danceStyles as string[] | null) ?? []
  const planRows: Array<{ dancerId: string; itemId: string; shareGoing: boolean; metadata: Record<string, string> | null }> = await db
    .select({ dancerId: planItems.dancerId, itemId: planItems.itemId, shareGoing: planItems.shareGoing, metadata: planItems.metadata })
    .from(planItems)
    .where(and(eq(planItems.itemType, 'event'), inArray(planItems.dancerId, [dancerId, ...shown.map(p => p.other)])))
  const mine = new Set<string>()
  const theirs = new Map<string, Set<string>>()
  for (const r of planRows) {
    if (!UUID_RE.test(r.itemId)) continue
    if (r.dancerId === dancerId) mine.add(r.itemId)
    else if (r.shareGoing || r.metadata?.with === dancerId) theirs.set(r.dancerId, (theirs.get(r.dancerId) ?? new Set()).add(r.itemId))
  }
  // Nights I said "Next time" to (an event Skip) — never suggested again.
  const skipped = new Set<string>((await db
    .select({ id: discoverSwipes.targetId })
    .from(discoverSwipes)
    .where(and(eq(discoverSwipes.dancerId, dancerId), eq(discoverSwipes.targetKind, 'event'), eq(discoverSwipes.decision, 'skip')))
  ).map((r: { id: string }) => r.id))
  const planned = [...new Set([...mine, ...[...theirs.values()].flatMap(s => [...s])])]
  const window = and(
    eq(events.published, true),
    eq(events.archived, false),
    sql`${events.cancelledAt} is null`,
    gte(events.startDate, now),
    lt(events.startDate, new Date(now.getTime() + MATCH_NIGHT_DAYS * DAY)),
  )
  const cols = {
    id: events.id, name: events.name, type: events.type, citySlug: events.citySlug, startDate: events.startDate,
    timezone: events.timezone, venueName: events.venueName, styles: events.styles,
  }
  const [plannedEvents, cityEvents] = await Promise.all([
    planned.length ? db.select(cols).from(events).where(and(window, inArray(events.id, planned))) : [],
    myCitySlug ? db.select(cols).from(events).where(and(window, eq(events.citySlug, myCitySlug), eq(events.isFestival, false))).orderBy(asc(events.startDate)).limit(40) : [],
  ])
  const candidates = new Map<string, NightCandidate>()
  for (const e of [...plannedEvents, ...cityEvents] as any[]) {
    if (!e.startDate || (skipped.has(e.id) && !mine.has(e.id))) continue
    candidates.set(e.id, { ...e, name: e.name ?? '', startDate: new Date(e.startDate), styles: (e.styles as string[] | null) ?? [] })
  }
  const list = [...candidates.values()]

  return shown.map((p) => {
    const d = byId.get(p.other)
    const theirStyles = asStyleList(d.danceStyles, d.danceLevels)
    return {
      dancerId: d.id,
      name: d.name ?? '',
      photo: d.photo ?? null,
      username: d.username ?? null,
      city: d.city ?? '',
      role: asDanceRole(d.role),
      styles: theirStyles,
      instagram: d.instagram ?? null,
      matchedAt: p.matchedAt.toISOString(),
      deck: p.deck,
      festivals: p.festivalSlugs.map(slug => ({ slug, name: festNames.get(slug) ?? slug })),
      night: pickNight(list, { myCitySlug, myStyles, theirStyles, mine, theirs: theirs.get(p.other) ?? new Set() }),
    }
  })
}
