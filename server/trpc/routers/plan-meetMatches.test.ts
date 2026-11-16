/**
 * Integration tests for plan.meetMatches (RAZ-985): a mutual yes in the My plan
 * deck or a mutual wave on a festival page is a match; one-way yeses, skips,
 * private profiles and dancers without a photo are not. Each match carries the
 * next night out both could go to; "Next time" skips a night, "I'm going too"
 * shows the match that you're going. Yeses before MEET_MATCHES_SINCE don't count.
 *
 * Runs against a local Postgres only (see server/test-setup.ts); fixture rows
 * live in a throwaway city and are removed in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'
import { MEET_MATCHES_SINCE } from '../../utils/meetMatches'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const CITY = `Matchville ${RUN}`
const CITY_SLUG = `matchville-${RUN}`
const FEST = `match-fest-${RUN}`
const DAY = 86400_000

const ids: Record<string, string> = {}
const caller = (dancerId: string, isAdmin = true) => appRouter.createCaller({ db, dancerId, isAdmin } as any)

async function addDancer(key: string, values: Partial<typeof schema.dancers.$inferInsert> = {}) {
  const [row] = await db.insert(schema.dancers).values({
    email: `${key}-${RUN}@test.wedance.local`,
    name: `${key} ${RUN}`,
    city: CITY,
    danceStyles: ['Salsa'],
    profilePublic: true,
    photo: `https://example.com/${key}.jpg`,
    ...values,
  }).returning({ id: schema.dancers.id })
  ids[key] = row.id
}

const yes = (from: string, to: string, decision: 'yes' | 'skip' = 'yes') =>
  ({ dancerId: ids[from], targetKind: 'dancer', targetId: ids[to], decision })

describe.skipIf(!DATABASE_URL)('plan.meetMatches', () => {
  beforeAll(async () => {
    const now = Date.now()
    await addDancer('me')
    await addDancer('gila')        // mutual deck yes
    await addDancer('oneway')      // I said yes, they didn't
    await addDancer('skipper')     // they skipped me
    await addDancer('hidden', { profilePublic: false }) // mutual, but private
    await addDancer('waver', { city: 'Elsewhere' })     // mutual wave at a festival

    await db.insert(schema.discoverSwipes).values([
      yes('me', 'gila'), yes('gila', 'me'),
      yes('me', 'oneway'),
      yes('me', 'skipper'), yes('skipper', 'me', 'skip'),
      yes('me', 'hidden'), yes('hidden', 'me'),
    ])
    await db.insert(schema.festivalWaves).values([
      { festivalSlug: FEST, dancerId: ids.me, targetDancerId: ids.waver },
      { festivalSlug: FEST, dancerId: ids.waver, targetDancerId: ids.me },
    ])

    const [party] = await db.insert(schema.events).values({
      name: `Salsa night ${RUN}`, type: 'Party', citySlug: CITY_SLUG, city: CITY, timezone: 'Europe/Berlin',
      styles: ['Salsa'], published: true, archived: false,
      startDate: new Date(now + 3 * DAY), endDate: new Date(now + 3 * DAY + 4 * 3600_000),
    }).returning({ id: schema.events.id })
    ids.party = party.id
    const [later] = await db.insert(schema.events).values({
      name: `Late salsa ${RUN}`, type: 'Party', citySlug: CITY_SLUG, city: CITY, timezone: 'Europe/Berlin',
      styles: ['Salsa'], published: true, archived: false,
      startDate: new Date(now + 6 * DAY), endDate: new Date(now + 6 * DAY + 4 * 3600_000),
    }).returning({ id: schema.events.id })
    ids.later = later.id
    // Gila is going to the later one and shares it → it wins over the sooner city night.
    await db.insert(schema.planItems).values({ dancerId: ids.gila, itemType: 'event', itemId: ids.later, shareGoing: true })
  })

  afterAll(async () => {
    if (!db) return
    const dancerIds = Object.entries(ids).filter(([k]) => !['party', 'later'].includes(k)).map(([, v]) => v)
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.festivalWaves).where(inArray(schema.festivalWaves.dancerId, dancerIds))
    await db.delete(schema.discoverSwipes).where(inArray(schema.discoverSwipes.dancerId, dancerIds))
    await db.delete(schema.events).where(inArray(schema.events.id, [ids.party, ids.later]))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, dancerIds))
  })

  it('lists mutual yeses only — deck and festival waves in one list', async () => {
    const { matches } = await caller(ids.me).plan.meetMatches()
    const byId = new Map(matches.map(m => [m.dancerId, m]))
    expect([...byId.keys()].sort()).toEqual([ids.gila, ids.waver].sort())
    expect(byId.get(ids.gila)).toMatchObject({ deck: true, festivals: [] })
    expect(byId.get(ids.waver)).toMatchObject({ deck: false, festivals: [{ slug: FEST }] })
  })

  it("suggests the night they're going to over a sooner city social", async () => {
    const { matches } = await caller(ids.me).plan.meetMatches()
    const gila = matches.find(m => m.dancerId === ids.gila)!
    expect(gila.night).toMatchObject({ eventId: ids.later, theyGoing: true, youGoing: false })
  })

  it('is symmetric: Gila sees me too', async () => {
    const { matches } = await caller(ids.gila).plan.meetMatches()
    expect(matches.map(m => m.dancerId)).toEqual([ids.me])
  })

  it('is open to every signed-in dancer', async () => {
    const { matches } = await caller(ids.me, false).plan.meetMatches()
    expect(matches.length).toBe(2)
  })

  it("'Next time' on a night suggests the next one instead", async () => {
    await caller(ids.me).plan.discoverSwipe({ targetKind: 'event', targetId: ids.later, decision: 'skip' })
    const { matches } = await caller(ids.me).plan.meetMatches()
    expect(matches.find(m => m.dancerId === ids.gila)!.night).toMatchObject({ eventId: ids.party })
    await caller(ids.me).plan.discoverUnswipe({ targetKind: 'event', targetId: ids.later })
  })

  it("'I'm going too' tells that match, without sharing the plan publicly", async () => {
    // A plain, unshared plan item: Gila isn't told — her own night stays the pick.
    await caller(ids.me).plan.add({ itemType: 'event', itemId: ids.party })
    expect((await caller(ids.gila).plan.meetMatches()).matches[0].night).toMatchObject({ eventId: ids.later })
    await caller(ids.me).plan.remove({ itemType: 'event', itemId: ids.party })
    // Added from the match card (with: Gila) → for Gila, "Me is going" beats her own.
    await caller(ids.me).plan.add({ itemType: 'event', itemId: ids.party, metadata: { with: ids.gila } })
    expect((await caller(ids.gila).plan.meetMatches()).matches[0].night).toMatchObject({ eventId: ids.party, theyGoing: true })
    await caller(ids.me).plan.remove({ itemType: 'event', itemId: ids.party })
  })

  it('leaves out yeses made before the deck said "we tell you both"', async () => {
    const before = new Date(MEET_MATCHES_SINCE.getTime() - DAY)
    await addDancer('early')
    await db.insert(schema.discoverSwipes).values([
      { ...yes('me', 'early'), createdAt: before },
      { ...yes('early', 'me'), createdAt: before },
    ])
    const { matches } = await caller(ids.me).plan.meetMatches()
    expect(matches.map(m => m.dancerId)).not.toContain(ids.early)
  })
})
