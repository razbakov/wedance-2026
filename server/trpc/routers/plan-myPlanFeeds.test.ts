/**
 * Integration tests for /my-plan's real data: plan.weekSocials (this week's
 * socials + RSVP), plan.discover / discoverSwipe / discoverUnswipe (the deck
 * persists decisions and never shows a decided card again).
 *
 * Runs against a local Postgres only (see server/test-setup.ts) and creates
 * its own fixture rows in a throwaway city, removed again in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray, like } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const CITY = `Testville ${RUN}`
const CITY_SLUG = `testville-${RUN}`
const FEST = `test-fest-${RUN}`
const WORKSHOP = `test-workshop-${RUN}`
const DAY = 86400_000

const ids: Record<string, string> = {}
const caller = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)

async function addDancer(key: string, values: Partial<typeof schema.dancers.$inferInsert>) {
  const [row] = await db.insert(schema.dancers).values({
    email: `${key}-${RUN}@test.wedance.local`,
    name: `${key} ${RUN}`,
    city: CITY,
    danceStyles: ['Salsa'],
    profilePublic: true,
    ...values,
  }).returning({ id: schema.dancers.id })
  ids[key] = row.id
}

async function addEvent(key: string, values: Partial<typeof schema.events.$inferInsert>) {
  const [row] = await db.insert(schema.events).values({
    name: `${key} ${RUN}`,
    type: 'Party',
    citySlug: CITY_SLUG,
    city: CITY,
    timezone: 'Europe/Berlin',
    styles: ['Salsa'],
    published: true,
    archived: false,
    ...values,
  }).returning({ id: schema.events.id })
  ids[key] = row.id
}

describe.skipIf(!DATABASE_URL)('my-plan feeds', () => {
  beforeAll(async () => {
    const now = Date.now()
    await addDancer('me', { photo: 'https://example.com/me.jpg' })
    await addDancer('withPhoto', { photo: 'https://example.com/p.jpg' })
    await addDancer('noPhoto', { photo: null })
    await addDancer('emptyPhoto', { photo: '' })
    await addDancer('friend', { photo: 'https://example.com/f.jpg', city: 'Elsewhere' })
    // RAZ-981: the deck shows dancers going out — a confirmed sign-up to a night
    // here in the next two weeks — not everyone who lives here.
    await addDancer('homebody', { photo: 'https://example.com/h.jpg' })
    await addDancer('goer', { photo: 'https://example.com/g.jpg', danceStyles: ['Tango'] })
    await addDancer('sameNight', { photo: 'https://example.com/n.jpg' })
    await addDancer('goerNoPhoto', { photo: null })
    await addDancer('unconfirmed', { photo: 'https://example.com/u.jpg' })
    await addDancer('notComing', { photo: 'https://example.com/x.jpg' })
    await addDancer('farOff', { photo: 'https://example.com/f2.jpg' })

    // Friend = mutual follow.
    await db.insert(schema.follows).values([
      { dancerId: ids.me, targetDancerId: ids.friend },
      { dancerId: ids.friend, targetDancerId: ids.me },
    ])

    await addEvent('socialSoon', { startDate: new Date(now + 2 * DAY), endDate: new Date(now + 2 * DAY + 4 * 3600_000) })
    await addEvent('socialKizomba', { styles: ['Kizomba'], startDate: new Date(now + 3 * DAY), endDate: new Date(now + 3 * DAY + 3600_000) })
    await addEvent('course', { type: 'Course', startDate: new Date(now + DAY), endDate: new Date(now + DAY + 3600_000) })
    await addEvent('nextMonth', { startDate: new Date(now + 20 * DAY), endDate: new Date(now + 20 * DAY + 3600_000) })
    await addEvent('past', { startDate: new Date(now - 3 * DAY), endDate: new Date(now - 3 * DAY + 3600_000) })
    // A weekly social: last week's occurrence (planned) and this week's.
    await addEvent('weeklyLast', { seriesId: `series-${RUN}`, startDate: new Date(now - 5 * DAY), endDate: new Date(now - 5 * DAY + 3600_000) })
    await addEvent('weeklyThis', { seriesId: `series-${RUN}`, startDate: new Date(now + 2 * DAY + 3600_000), endDate: new Date(now + 2 * DAY + 2 * 3600_000) })
    // A weekly course: last week's class (planned) and the next one; plus a course that has ended.
    await addEvent('courseLast', { type: 'Course', seriesId: `course-${RUN}`, startDate: new Date(now - 3 * DAY), endDate: new Date(now - 3 * DAY + 3600_000) })
    await addEvent('courseNext', { type: 'Course', seriesId: `course-${RUN}`, startDate: new Date(now + 4 * DAY), endDate: new Date(now + 4 * DAY + 3600_000), organizerName: `School ${RUN}`, organizerUsername: `school-${RUN}` })
    await addEvent('courseAfter', { type: 'Course', seriesId: `course-${RUN}`, startDate: new Date(now + 11 * DAY), endDate: new Date(now + 11 * DAY + 3600_000) })
    // A weekend workshop that started yesterday and runs until tomorrow (RAZ-891).
    await addEvent('workshop', { type: 'Workshop', styles: ['Zouk'], startDate: new Date(now - DAY), endDate: new Date(now + DAY) })
    await addEvent('courseEnded', { type: 'Course', startDate: new Date(now - 10 * DAY), endDate: new Date(now - 10 * DAY + 3600_000) })
    await addEvent('nightA', { startDate: new Date(now + 5 * DAY), endDate: new Date(now + 5 * DAY + 3600_000) })
    await addEvent('nightB', { startDate: new Date(now + 9 * DAY), endDate: new Date(now + 9 * DAY + 3600_000) })
    await addEvent('nightFar', { startDate: new Date(now + 25 * DAY), endDate: new Date(now + 25 * DAY + 3600_000) })
    const confirmedAt = new Date()
    await db.insert(schema.eventRsvps).values([
      { eventId: ids.nightA, dancerId: ids.goer, answer: 'yes', confirmedAt },
      { eventId: ids.nightB, dancerId: ids.sameNight, answer: 'needLeader', confirmedAt },
      { eventId: ids.nightB, dancerId: ids.me, answer: 'yes', confirmedAt },
      { eventId: ids.nightA, dancerId: ids.goerNoPhoto, answer: 'yes', confirmedAt },
      { eventId: ids.nightA, dancerId: ids.unconfirmed, answer: 'yes' },
      { eventId: ids.nightA, dancerId: ids.notComing, answer: 'next', confirmedAt },
      { eventId: ids.nightFar, dancerId: ids.farOff, answer: 'yes', confirmedAt },
    ])

    // A festival the friend has picked, so a dancer card + friend count exist.
    // The festival is its event (0032); the legacy row only adds a colour.
    await db.insert(schema.festivals).values({ slug: FEST, name: `Test Fest ${RUN}` })
    await addEvent('festEvent', {
      name: `Test Fest ${RUN}`, slug: FEST, type: 'Festival', isFestival: true, festival: { key: FEST } as any,
      citySlug: `elsewhere-${RUN}`, city: 'Elsewhere',
      startDate: new Date(now + 30 * DAY), endDate: new Date(now + 32 * DAY),
    })
    // RAZ-982: a one-hour workshop with a programme — it gets a 'festival' plan
    // item and a legacy festivals row, but it is not a festival.
    await addDancer('workshopper', { photo: 'https://example.com/w.jpg' })
    await addDancer('quiet', { photo: 'https://example.com/q.jpg' })
    await db.insert(schema.festivals).values({ slug: WORKSHOP, name: `Workshop ${RUN}` })
    await addEvent('workshopEvent', {
      slug: WORKSHOP, type: 'Workshop', isFestival: false, festival: { key: WORKSHOP } as any,
      startDate: new Date(now + 2 * DAY), endDate: new Date(now + 2 * DAY + 3600_000),
    })
    await db.insert(schema.planItems).values([
      { dancerId: ids.workshopper, itemType: 'festival', itemId: WORKSHOP },
      { dancerId: ids.withPhoto, itemType: 'festival', itemId: FEST, shareGoing: true },
      // Going too, but hasn't shared it (RAZ-981): no festival on their card.
      { dancerId: ids.quiet, itemType: 'festival', itemId: FEST },
      { dancerId: ids.friend, itemType: 'event', itemId: ids.socialSoon },
    ])
  })

  afterAll(async () => {
    const dancerIds = Object.entries(ids).filter(([k]) => ['me', 'withPhoto', 'noPhoto', 'emptyPhoto', 'friend', 'workshopper', 'quiet', 'homebody', 'goer', 'sameNight', 'goerNoPhoto', 'unconfirmed', 'notComing', 'farOff'].includes(k)).map(([, v]) => v)
    const eventIds = Object.entries(ids).filter(([k]) => !dancerIds.includes(ids[k]!)).map(([, v]) => v)
    await db.delete(schema.discoverSwipes).where(inArray(schema.discoverSwipes.dancerId, dancerIds))
    await db.delete(schema.attendances).where(inArray(schema.attendances.dancerId, dancerIds)).catch(() => {})
    await db.delete(schema.eventRsvps).where(inArray(schema.eventRsvps.eventId, eventIds)).catch(() => {})
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.follows).where(inArray(schema.follows.dancerId, dancerIds))
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    await db.delete(schema.festivals).where(inArray(schema.festivals.slug, [FEST, WORKSHOP]))
    await db.delete(schema.dancers).where(like(schema.dancers.email, `%-${RUN}@test.wedance.local`))
  })

  describe('plan.weekSocials', () => {
    const weekIds = async () => (await caller(ids.me!).plan.weekSocials()).socials.map(s => s.id)

    it('shows nothing the dancer did not plan — not even socials in their city this week', async () => {
      expect(await weekIds()).toEqual([])
    })

    it('returns the dancer\'s city slug for the "Full week" link, plan or no plan', async () => {
      expect((await caller(ids.me!).plan.weekSocials()).citySlug).toBe(CITY_SLUG)
    })

    it('shows a planned event this week, with its date, time zone and friends going', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.socialSoon! })
      const { socials } = await me.plan.weekSocials()
      expect(socials.map(s => s.id)).toEqual([ids.socialSoon])
      expect(socials[0]!.planItemId).toBe(ids.socialSoon)
      expect(socials[0]!.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(socials[0]!.timezone).toBe('Europe/Berlin')
      expect(socials[0]!.friendsGoing).toBe(1)

      await me.plan.remove({ itemType: 'event', itemId: ids.socialSoon! })
      expect(await weekIds()).toEqual([])
    })

    it('leaves out planned events next month or in the past', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.nextMonth! })
      await me.plan.add({ itemType: 'event', itemId: ids.past! })
      expect(await weekIds()).toEqual([])
      await me.plan.remove({ itemType: 'event', itemId: ids.nextMonth! })
      await me.plan.remove({ itemType: 'event', itemId: ids.past! })
    })

    it('lists a planned class on its day, marked as a class (RAZ-1006)', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.course!, metadata: { type: 'class' } })
      const { socials } = await me.plan.weekSocials()
      expect(socials.map(s => [s.id, s.isClass])).toEqual([[ids.course, true]])
      await me.plan.remove({ itemType: 'event', itemId: ids.course! })
    })

    it('shows this week\'s occurrence of a recurring event planned on another date, sorted by time', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.weeklyLast! })
      await me.plan.add({ itemType: 'event', itemId: ids.socialSoon! })
      const { socials } = await me.plan.weekSocials()
      expect(socials.map(s => s.id)).toEqual([ids.socialSoon, ids.weeklyThis])
      expect(socials[1]!.planItemId).toBe(ids.weeklyLast)
      await me.plan.remove({ itemType: 'event', itemId: ids.weeklyLast! })
      await me.plan.remove({ itemType: 'event', itemId: ids.socialSoon! })
    })
  })

  describe('plan.myCourses', () => {
    const courseIds = async () => (await caller(ids.me!).plan.myCourses()).courses.map(c => c.eventId)

    it('shows no course the dancer did not add — not even courses in their city', async () => {
      expect(await courseIds()).toEqual([])
    })

    it('shows a course added from the event page (no metadata) at its next class, which the week shows as a class', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.courseLast! })
      const { courses } = await me.plan.myCourses()
      expect(courses).toHaveLength(1)
      expect(courses[0]).toMatchObject({ planItemId: ids.courseLast, eventId: ids.courseNext, organizerName: `School ${RUN}`, organizerUsername: `school-${RUN}` })
      expect(courses[0]!.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(courses[0]).not.toHaveProperty('paidThroughMonth')
      expect(courses[0]).not.toHaveProperty('attended')
      // Planning the next occurrence too doesn't list the course twice.
      await me.plan.add({ itemType: 'event', itemId: ids.courseNext! })
      expect(await courseIds()).toEqual([ids.courseNext])
      expect((await me.plan.weekSocials()).socials.filter(s => s.id === ids.courseNext).map(s => s.isClass)).toEqual([true])
    })

    it('removing the plan item removes the course for good', async () => {
      const me = caller(ids.me!)
      await me.plan.remove({ itemType: 'event', itemId: ids.courseLast! })
      await me.plan.remove({ itemType: 'event', itemId: ids.courseNext! })
      expect(await courseIds()).toEqual([])
    })

    it('lists every class of a planned course in the month window, only this week\'s in the week (RAZ-1006)', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.courseLast! })
      try {
        const week = (await me.plan.weekSocials()).socials.filter(s => s.isClass).map(s => s.id)
        const month = (await me.plan.weekSocials({ days: 30 })).socials.filter(s => s.isClass).map(s => s.id)
        expect(week).toEqual([ids.courseNext])
        expect(month).toEqual([ids.courseNext, ids.courseAfter])
        expect((await me.plan.weekSocials({ days: 30 })).socials.find(s => s.id === ids.courseAfter)?.planItemId).toBe(ids.courseLast)
      }
      finally {
        await me.plan.remove({ itemType: 'event', itemId: ids.courseLast! })
      }
    })

    it('leaves out ended courses and nights out', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.courseEnded! })
      await me.plan.add({ itemType: 'event', itemId: ids.socialSoon! })
      expect(await courseIds()).toEqual([])
      await me.plan.remove({ itemType: 'event', itemId: ids.courseEnded! })
      await me.plan.remove({ itemType: 'event', itemId: ids.socialSoon! })
    })

    it('shows a workshop the dancer said they are going to on its event page, as a class in the week (RAZ-891)', async () => {
      const me = caller(ids.me!)
      await me.rsvp.answer({ event: ids.workshop!, answer: 'needFollower' })
      expect(await courseIds()).toEqual([ids.workshop])
      expect((await me.plan.weekSocials()).socials.filter(s => s.id === ids.workshop).map(s => s.isClass)).toEqual([true])
      // The My plan badge counts it as a course, this week (RAZ-889 counts from the same feed).
      expect(await me.plan.counts()).toMatchObject({ courses: 1, week: 1, total: 1 })
      // "Next time" takes it off again.
      await me.rsvp.answer({ event: ids.workshop!, answer: 'next' })
      expect(await courseIds()).toEqual([])
      expect(await me.plan.counts()).toMatchObject({ courses: 0, total: 0 })
    })

    it('counts a class saved from the course picker (metadata type class)', async () => {
      const me = caller(ids.me!)
      await me.plan.add({ itemType: 'event', itemId: ids.course!, metadata: { type: 'class' } })
      expect(await courseIds()).toEqual([ids.course])
      await me.plan.remove({ itemType: 'event', itemId: ids.course! })
    })
  })

  // RAZ-889: the header badge counted every plan item ever added (12 → 15 while
  // /my-plan showed a festival and two socials). It must count what the page lists.
  describe('plan.counts', () => {
    const PAST_FEST = `${FEST}-past`

    it('counts only what /my-plan lists: upcoming festivals, courses and this week\'s socials', async () => {
      const me = caller(ids.me!)
      expect(await me.plan.counts()).toMatchObject({ total: 0, week: 0 })

      await db.insert(schema.festivals).values({ slug: PAST_FEST, name: `Past Fest ${RUN}`, startDate: '2020-05-01', endDate: '2020-05-03' })
      try {
        await me.plan.add({ itemType: 'festival', itemId: FEST }) // no dates yet — listed, counted
        await me.plan.add({ itemType: 'festival', itemId: PAST_FEST }) // over — not counted
        await me.plan.add({ itemType: 'festival', itemId: `no-such-fest-${RUN}` }) // not a festival — not listed
        await me.plan.add({ itemType: 'event', itemId: ids.socialSoon! }) // this week
        await me.plan.add({ itemType: 'event', itemId: ids.past! }) // over
        await me.plan.add({ itemType: 'event', itemId: ids.nextMonth! }) // not this week
        await me.plan.add({ itemType: 'event', itemId: ids.courseLast! }) // course, next class in 4 days
        await me.plan.add({ itemType: 'event', itemId: ids.courseEnded! }) // ended course

        const counts = await me.plan.counts()
        const [{ courses }, { socials }] = await Promise.all([me.plan.myCourses(), me.plan.weekSocials()])
        expect(counts).toEqual({ festivals: 1, courses: 1, socials: 1, week: 2, total: 3 })
        // The same feeds /my-plan renders.
        expect(counts.courses).toBe(courses.length)
        expect(counts.socials).toBe(socials.filter(s => !s.isClass).length)
      }
      finally {
        for (const itemId of [FEST, PAST_FEST, `no-such-fest-${RUN}`]) await me.plan.remove({ itemType: 'festival', itemId })
        for (const k of ['socialSoon', 'past', 'nextMonth', 'courseLast', 'courseEnded']) await me.plan.remove({ itemType: 'event', itemId: ids[k]! })
        await db.delete(schema.festivals).where(eq(schema.festivals.slug, PAST_FEST))
      }
      expect(await me.plan.counts()).toMatchObject({ total: 0, week: 0 })
    })
  })

  // RAZ-983: a workshop saved from its (festival-style) page is an event in the
  // plan, never a festival in the dancer's year or the header badge.
  describe('workshops are not festivals', () => {
    it('saves a workshop\'s "I\'m going" as an event item', async () => {
      const me = caller(ids.me!)
      try {
        await me.plan.add({ itemType: 'festival', itemId: WORKSHOP })
        const rows = await db.select({ itemType: schema.planItems.itemType, itemId: schema.planItems.itemId })
          .from(schema.planItems).where(eq(schema.planItems.dancerId, ids.me!))
        expect(rows).toEqual([{ itemType: 'event', itemId: ids.workshopEvent }])
        expect(await me.plan.myPlan()).toEqual([])
        expect((await me.plan.counts()).festivals).toBe(0)
        // A real festival still goes in as a festival.
        await me.plan.add({ itemType: 'festival', itemId: FEST })
        expect((await me.plan.myPlan()).map(f => f.slug)).toEqual([FEST])
      }
      finally {
        await me.plan.remove({ itemType: 'festival', itemId: WORKSHOP })
        await me.plan.remove({ itemType: 'festival', itemId: FEST })
      }
      expect(await db.select().from(schema.planItems).where(eq(schema.planItems.dancerId, ids.me!))).toEqual([])
    })

    it('leaves an older festival item for a workshop out of the year and the badge', async () => {
      const w = caller(ids.workshopper!)
      expect(await w.plan.myPlan()).toEqual([])
      expect((await w.plan.counts()).festivals).toBe(0)
      const shared = await caller(ids.me!).plan.sharedPlan({ username: ids.workshopper! })
      expect(shared?.festivals).toEqual([])
    })
  })

  describe('plan.discover', () => {
    const deckIds = async () => (await caller(ids.me!).plan.discover()).cards.map(c => `${c.targetKind}:${c.targetId}`)

    it('only shows dancers with a photo, never the caller', async () => {
      const deck = await deckIds()
      expect(deck).toContain(`dancer:${ids.withPhoto}`)
      expect(deck).not.toContain(`dancer:${ids.noPhoto}`)
      expect(deck).not.toContain(`dancer:${ids.emptyPhoto}`)
      expect(deck).not.toContain(`dancer:${ids.me}`)
      const { cards } = await caller(ids.me!).plan.discover()
      for (const c of cards) if (c.targetKind === 'dancer') expect(c.dancerPhoto).toBeTruthy()
    })

    it('shows dancers going out here in the next two weeks, with their night (RAZ-981)', async () => {
      const { cards } = await caller(ids.me!).plan.discover()
      const goer = cards.find(c => c.targetKind === 'dancer' && c.targetId === ids.goer)
      expect(goer?.kind).toBe('dancer-going-out')
      expect(goer && 'eventId' in goer ? goer.eventId : null).toBe(ids.nightA)
      const deck = cards.map(c => `${c.targetKind}:${c.targetId}`)
      for (const k of ['homebody', 'goerNoPhoto', 'unconfirmed', 'notComing', 'farOff']) expect(deck, k).not.toContain(`dancer:${ids[k]}`)
    })

    it('puts someone going to my night first, as the same night (RAZ-981)', async () => {
      const { cards, me } = await caller(ids.me!).plan.discover()
      expect(cards[0]).toMatchObject({ kind: 'dancer-same-night', targetId: ids.sameNight, eventId: ids.nightB })
      expect(me.nextNight?.eventId).toBe(ids.nightB)
      expect(me.citySlug).toBe(CITY_SLUG)
    })

    it('shows another dancer who only put the same night on their plan, and a dancer with no city has none', async () => {
      const now = Date.now()
      await addDancer('annaPlan', { photo: 'https://example.com/anna.jpg', city: CITY, name: `Anna Plan ${RUN}` })
      await addDancer('benPlan', { photo: 'https://example.com/ben.jpg', city: CITY, name: `Ben Plan ${RUN}` })
      await addDancer('noCityPlan', { photo: 'https://example.com/nocity.jpg', city: '' })
      await addEvent('planNight', { startDate: new Date(now + 4 * DAY), endDate: new Date(now + 4 * DAY + 4 * 3600_000) })
      const created = [ids.annaPlan!, ids.benPlan!, ids.noCityPlan!]
      await db.insert(schema.planItems).values(created.map(dancerId => ({ dancerId, itemType: 'event' as const, itemId: ids.planNight! })))
      try {
        const ben = await caller(ids.benPlan!).plan.discover()
        expect(ben.cards.find(c => c.targetKind === 'dancer' && c.targetId === ids.annaPlan)).toMatchObject({
          kind: 'dancer-same-night', eventId: ids.planNight,
        })
        expect(ben.me.citySlug).toBe(CITY_SLUG)
        expect(ben.me.nextNight?.eventId).toBe(ids.planNight)
        expect((await caller(ids.noCityPlan!).plan.meetEmpty()).stage).toBe('no-city')
        expect((await caller(ids.benPlan!).plan.meetEmpty()).stage).not.toBe('no-city')
      } finally {
        await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, created))
        await db.delete(schema.events).where(eq(schema.events.id, ids.planNight!))
        await db.delete(schema.dancers).where(inArray(schema.dancers.id, created))
      }
    })

    it('shows each dancer once, with the festival that put them on the card', async () => {
      const { cards } = await caller(ids.me!).plan.discover()
      const mine = cards.filter(c => c.targetKind === 'dancer' && c.targetId === ids.withPhoto)
      expect(mine).toHaveLength(1)
      expect(mine[0]!.kind).toBe('dancer-new-fest')
      expect(mine[0]!.targetKind === 'dancer' && mine[0]!.festivalSlug).toBe(FEST)
      expect(mine[0]!.targetKind === 'dancer' && mine[0]!.festivalName).toBe(`Test Fest ${RUN}`)
    })

    it('never says someone is going to a festival when their "festival" is a workshop (RAZ-982)', async () => {
      const { cards } = await caller(ids.me!).plan.discover()
      expect(cards.find(c => c.targetKind === 'dancer' && c.targetId === ids.workshopper)).toBeUndefined()
    })

    it('only says someone is going to a festival when they share it (RAZ-981)', async () => {
      const { cards } = await caller(ids.me!).plan.discover()
      // Not shared, not going out here: not in the deck at all.
      expect(cards.find(c => c.targetKind === 'dancer' && c.targetId === ids.quiet)).toBeUndefined()
    })

    it('tells both dancers about a mutual yes, and stops asking once the night is booked', async () => {
      await addDancer('noteA', { photo: 'https://example.com/a.jpg', name: `Anna Note ${RUN}` })
      await addDancer('noteB', { photo: 'https://example.com/b.jpg', name: `Ben Note ${RUN}` })
      const now = Date.now()
      await addEvent('noteNight', { startDate: new Date(now + 4 * DAY), endDate: new Date(now + 4 * DAY + 3 * 3600_000), venueName: 'Stachus' })
      const pair = [ids.noteA!, ids.noteB!]
      try {
        await caller(ids.noteA!).plan.discoverSwipe({ targetKind: 'dancer', targetId: ids.noteB!, decision: 'yes' })
        const second = await caller(ids.noteB!).plan.discoverSwipe({ targetKind: 'dancer', targetId: ids.noteA!, decision: 'yes' })
        expect(second.match).toBe(true)
        const anna = await caller(ids.noteA!).plan.notices()
        const ben = await caller(ids.noteB!).plan.notices()
        expect(anna.notices.find(n => n.id === `match:${ids.noteB}`)).toMatchObject({
          booked: false,
          href: `/meet/ritual?with=${ids.noteB}`,
        })
        expect(anna.notices.find(n => n.id === `match:${ids.noteB}`)?.action).toContain('Book the night')
        expect(ben.notices.find(n => n.id === `match:${ids.noteA}`)?.title).toContain('Anna')
        await db.insert(schema.meetRituals).values({
          dancerId: ids.noteB!, otherId: ids.noteA!, eventId: ids.noteNight!, bookedAt: new Date(),
        })
        const booked = (await caller(ids.noteB!).plan.notices()).notices.find(n => n.id === `match:${ids.noteA}`)
        expect(booked?.booked).toBe(true)
        expect(booked?.body).toContain('Stachus')
        expect(booked?.action).not.toContain('Book the night')
      } finally {
        await db.delete(schema.meetRituals).where(inArray(schema.meetRituals.dancerId, pair))
        await db.delete(schema.discoverSwipes).where(inArray(schema.discoverSwipes.dancerId, pair))
        await db.delete(schema.events).where(eq(schema.events.id, ids.noteNight!))
        await db.delete(schema.dancers).where(inArray(schema.dancers.id, pair))
      }
    })

    it('a Skip is stored and the card does not come back; undo brings it back', async () => {
      const me = caller(ids.me!)
      await me.plan.discoverSwipe({ targetKind: 'dancer', targetId: ids.withPhoto!, decision: 'skip' })
      expect(await deckIds()).not.toContain(`dancer:${ids.withPhoto}`)

      await me.plan.discoverUnswipe({ targetKind: 'dancer', targetId: ids.withPhoto! })
      expect(await deckIds()).toContain(`dancer:${ids.withPhoto}`)
    })

    it('a Yes is stored too, and re-deciding overwrites instead of duplicating', async () => {
      const me = caller(ids.me!)
      await me.plan.discoverSwipe({ targetKind: 'dancer', targetId: ids.withPhoto!, decision: 'yes', festivalSlug: FEST })
      await me.plan.discoverSwipe({ targetKind: 'dancer', targetId: ids.withPhoto!, decision: 'skip' })
      const rows = await db.select().from(schema.discoverSwipes).where(eq(schema.discoverSwipes.dancerId, ids.me!))
      expect(rows).toHaveLength(1)
      expect(rows[0].decision).toBe('skip')
      expect(await deckIds()).not.toContain(`dancer:${ids.withPhoto}`)
      await me.plan.discoverUnswipe({ targetKind: 'dancer', targetId: ids.withPhoto! })
    })

    it('excludes skipped events and events already in the plan', async () => {
      const me = caller(ids.me!)
      expect(await deckIds()).toContain(`event:${ids.socialSoon}`)

      await me.plan.discoverSwipe({ targetKind: 'event', targetId: ids.socialSoon!, decision: 'skip' })
      expect(await deckIds()).not.toContain(`event:${ids.socialSoon}`)
      await me.plan.discoverUnswipe({ targetKind: 'event', targetId: ids.socialSoon! })

      await me.plan.add({ itemType: 'event', itemId: ids.socialSoon!, metadata: { type: 'social' } })
      expect(await deckIds()).not.toContain(`event:${ids.socialSoon}`)
      await me.plan.remove({ itemType: 'event', itemId: ids.socialSoon! })
    })

    it('reports a real friends-going count on event cards (no placeholder numbers)', async () => {
      const { cards } = await caller(ids.me!).plan.discover()
      const card = cards.find(c => c.targetKind === 'event' && c.targetId === ids.socialSoon)
      expect(card && 'friendsGoing' in card ? card.friendsGoing : -1).toBe(1)
    })

    it('builds a festival nudge from Yes swipes that survives a reload', async () => {
      const me = caller(ids.me!)
      await me.plan.discoverSwipe({ targetKind: 'dancer', targetId: ids.withPhoto!, decision: 'yes', festivalSlug: FEST })
      const { nudges } = await me.plan.discover()
      const nudge = nudges.find(n => n.festivalSlug === FEST)
      expect(nudge?.dancerNames).toEqual([`withPhoto ${RUN}`])

      // "Not this year" = a Skip on the festival → the nudge is gone for good.
      await me.plan.discoverSwipe({ targetKind: 'festival', targetId: FEST, decision: 'skip' })
      expect((await me.plan.discover()).nudges.find(n => n.festivalSlug === FEST)).toBeUndefined()
    })

    it('rejects anonymous callers', async () => {
      const anon = appRouter.createCaller({ db, dancerId: null, isAdmin: false } as any)
      await expect(anon.plan.discoverSwipe({ targetKind: 'dancer', targetId: 'x', decision: 'skip' })).rejects.toThrow()
    })
  })
})
