/**
 * plan.yearReview (RAZ-966): the look back counts every past night of the year
 * the dancer was going to — plan, poll, attendance, weekend shares — once each,
 * leaves out cancelled events, "next time" answers, other years and mock ids,
 * and ends on next year's plan.
 *
 * Runs against a local Postgres only (see server/test-setup.ts); the fixture
 * rows are its own and are removed in afterAll. Uses 2025 so every date is past.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { inArray, like } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const CITY = `Reviewville ${RUN}`
const ids: Record<string, string> = {}
const eventIds: string[] = []
const festSlugs = [`review-fest-2025-${RUN}`, `review-fest-2026-${RUN}`]
const caller = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)

async function addDancer(key: string) {
  const [row] = await db.insert(schema.dancers).values({
    email: `${key}-${RUN}@test.wedance.local`, name: `${key === 'me' ? 'Ana' : 'Bo'} ${RUN}`, city: CITY,
  }).returning({ id: schema.dancers.id })
  ids[key] = row.id
}

async function addEvent(key: string, start: string, values: Partial<typeof schema.events.$inferInsert> = {}) {
  const [row] = await db.insert(schema.events).values({
    name: `${key} ${RUN}`, type: 'Party', city: CITY, styles: ['Salsa'], published: true, archived: false,
    startDate: new Date(start), ...values,
  }).returning({ id: schema.events.id })
  ids[key] = row.id
  eventIds.push(row.id)
}

describe.skipIf(!DATABASE_URL)('plan.yearReview', () => {
  beforeAll(async () => {
    await addDancer('me')
    await addDancer('friend')
    await addDancer('quiet')
    await db.insert(schema.profiles).values({ username: `floor-${RUN}`, type: 'venue', name: `Floor ${RUN}` })

    await addEvent('planned1', '2025-10-03T19:00:00Z', { venueUsername: `floor-${RUN}` })
    await addEvent('planned2', '2025-10-10T19:00:00Z', { venueUsername: `floor-${RUN}` })
    await addEvent('polled', '2025-10-17T19:00:00Z', { city: `Other ${RUN}` })
    await addEvent('pollNext', '2025-10-24T19:00:00Z')
    await addEvent('attended', '2025-06-06T19:00:00Z', { styles: ['Bachata'] })
    await addEvent('weekend', '2025-08-08T19:00:00Z')
    await addEvent('cancelled', '2025-09-05T19:00:00Z', { cancelledAt: new Date('2025-09-01T00:00:00Z') })
    await addEvent('course', '2025-09-02T18:00:00Z', { type: 'Course' })
    await addEvent('lastYear', '2024-12-20T19:00:00Z')

    // A planned festival counts only with its festival event (RAZ-983, as on My plan).
    await addEvent('festEvent2025', '2025-05-01T10:00:00Z', { slug: festSlugs[0], isFestival: true, type: 'Festival' })
    await addEvent('festEvent2026', '2026-05-01T10:00:00Z', { slug: festSlugs[1], isFestival: true, type: 'Festival' })
    await db.insert(schema.festivals).values([
      { slug: festSlugs[0], name: `Review Fest ${RUN}`, startDate: '2025-05-01', endDate: '2025-05-03', city: `Fest City ${RUN}`, country: 'Spain', styles: ['Salsa'] },
      { slug: festSlugs[1], name: `Next Fest ${RUN}`, startDate: '2026-05-01', endDate: '2026-05-03' },
    ])

    await db.insert(schema.planItems).values([
      { dancerId: ids.me, itemType: 'event', itemId: ids.planned1 },
      { dancerId: ids.me, itemType: 'event', itemId: ids.planned2 },
      // Planned AND polled: still one night.
      { dancerId: ids.me, itemType: 'event', itemId: ids.polled },
      { dancerId: ids.me, itemType: 'event', itemId: ids.cancelled },
      { dancerId: ids.me, itemType: 'event', itemId: ids.course },
      { dancerId: ids.me, itemType: 'event', itemId: ids.lastYear },
      { dancerId: ids.me, itemType: 'event', itemId: 'muc-3' },
      { dancerId: ids.me, itemType: 'festival', itemId: festSlugs[0] },
      { dancerId: ids.me, itemType: 'festival', itemId: festSlugs[1] },
      { dancerId: ids.me, itemType: 'festival', itemId: `timba-fest-london-2025-${RUN}` },
    ])
    await db.insert(schema.eventRsvps).values([
      { eventId: ids.polled, dancerId: ids.me, answer: 'yes', confirmedAt: new Date('2025-10-01T00:00:00Z') },
      { eventId: ids.pollNext, dancerId: ids.me, answer: 'next', confirmedAt: new Date('2025-10-01T00:00:00Z') },
    ])
    await db.insert(schema.attendances).values({ eventId: ids.attended, dancerId: ids.me, status: 'going' })
    const [share] = await db.insert(schema.weekendShares).values({ code: `rv${RUN}`, dancerId: ids.me, eventIds: [ids.weekend] })
      .returning({ id: schema.weekendShares.id })
    await db.insert(schema.weekendShareJoins).values([
      { shareId: share.id, eventId: ids.weekend, dancerId: ids.friend, name: 'Bo', createdAt: new Date('2025-08-05T10:00:00Z') },
      { shareId: share.id, eventId: ids.weekend, guestToken: `g-${RUN}`, name: 'Cy', createdAt: new Date('2025-08-05T11:00:00Z') },
    ])
  })

  afterAll(async () => {
    const dancerIds = [ids.me, ids.friend, ids.quiet].filter(Boolean) as string[]
    await db.delete(schema.weekendShares).where(inArray(schema.weekendShares.dancerId, dancerIds))
    await db.delete(schema.attendances).where(inArray(schema.attendances.dancerId, dancerIds))
    await db.delete(schema.eventRsvps).where(inArray(schema.eventRsvps.eventId, eventIds))
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    await db.delete(schema.festivals).where(inArray(schema.festivals.slug, festSlugs))
    await db.delete(schema.profiles).where(like(schema.profiles.username, `floor-${RUN}`))
    await db.delete(schema.dancers).where(like(schema.dancers.email, `%-${RUN}@test.wedance.local`))
  })

  it('counts each past night of the year once, from every kind of "yes"', async () => {
    const r = await caller(ids.me!).plan.yearReview({ year: 2025 })
    // planned1, planned2, polled, attended, weekend, course, the festival.
    expect(r.nights).toBe(7)
    expect(r.festivals).toBe(1)
    expect(r.classes).toBe(1)
    expect(r.name).toBe('Ana')
  })

  it('builds the screens from them and ends on next year\'s plan', async () => {
    const r = await caller(ids.me!).plan.yearReview({ year: 2025 })
    const kinds = r.screens.map(s => s.kind)
    expect(kinds[0]).toBe('intro')
    expect(kinds.at(-1)).toBe('next')
    expect(r.screens.find(s => s.kind === 'floor')).toMatchObject({ venue: `Floor ${RUN}`, nights: 2 })
    expect(r.screens.find(s => s.kind === 'month')).toMatchObject({ month: 'October', nights: 3 })
    expect(r.screens.find(s => s.kind === 'friends')).toEqual({ kind: 'friends', friends: 2 })
    expect(r.screens.find(s => s.kind === 'festivals')).toMatchObject({ festivals: [{ name: `Review Fest ${RUN}` }] })
    expect(r.screens.at(-1)).toEqual({ kind: 'next', year: 2026, planned: 1 })
  })

  it('a friend\'s "I\'m in" on a shared weekend is a night for them too', async () => {
    const r = await caller(ids.friend!).plan.yearReview({ year: 2025 })
    expect(r.nights).toBe(1)
  })

  it('a dancer with nothing that year only gets the plan step', async () => {
    const r = await caller(ids.quiet!).plan.yearReview({ year: 2025 })
    expect(r.nights).toBe(0)
    expect(r.screens.map(s => s.kind)).toEqual(['next'])
  })
})
