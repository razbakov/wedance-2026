/**
 * rsvp router (RAZ-718) — the event RSVP as the organiser's poll: a signed-out
 * tap counts at once (unconfirmed), signing in through the magic link folds it
 * into the dancer's confirmed answer, pairing, "Next time", and the organiser's
 * summary in the same buckets.
 *
 * Postgres only (see server/test-setup.ts); fixtures are removed in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'
import { signupsOf } from '../../utils/eventCancel'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const ids: Record<string, string> = {}
const caller = (dancerId: string | null, isAdmin = false) => appRouter.createCaller({ db, dancerId, isAdmin } as any)
const GUEST = crypto.randomUUID()
const OTHER_GUEST = crypto.randomUUID()

describe.skipIf(!DATABASE_URL)('rsvp router', () => {
  beforeAll(async () => {
    for (const key of ['ana', 'ben', 'cat']) {
      const [d] = await db.insert(schema.dancers).values({ email: `${key}-${RUN}@test.wedance.local`, name: `${key} ${RUN}` }).returning({ id: schema.dancers.id })
      ids[key] = d.id
    }
    const [org] = await db.insert(schema.profiles).values({ username: `org-${RUN}`, name: `Org ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    ids.org = org.id
    const start = new Date(Date.now() + 2 * 86400_000)
    const [ev] = await db.insert(schema.events).values({
      name: `Salsa From Zero ${RUN}`, type: 'Course', styles: ['Salsa', 'Casino'], startDate: start, timezone: 'Europe/Berlin',
      published: true, archived: false, organizerUsername: `org-${RUN}`,
    }).returning({ id: schema.events.id })
    ids.event = ev.id
    const [solo] = await db.insert(schema.events).values({
      name: `Reggaeton ${RUN}`, type: 'Class', styles: ['Reggaeton'], startDate: start, timezone: 'Europe/Berlin', published: true, archived: false,
    }).returning({ id: schema.events.id })
    ids.solo = solo.id
  })

  afterAll(async () => {
    if (!db) return
    const dancerIds = [ids.ana, ids.ben, ids.cat].filter(Boolean)
    await db.delete(schema.festivalWaves).where(inArray(schema.festivalWaves.dancerId, dancerIds))
    await db.delete(schema.follows).where(inArray(schema.follows.dancerId, dancerIds))
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.events).where(inArray(schema.events.id, [ids.event, ids.solo]))
    await db.delete(schema.profiles).where(eq(schema.profiles.id, ids.org))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, dancerIds))
  })

  it('shows the counts before anyone answers, with the partner-dance options', async () => {
    const p = await caller(null).rsvp.poll({ event: ids.event, guestToken: GUEST })
    expect(p.partner).toBe(true)
    expect(p.coming).toBe(0)
    expect(p.mine).toBeNull()
    expect((await caller(null).rsvp.poll({ event: ids.solo })).partner).toBe(false)
  })

  it('counts a signed-out "I need a leader" at once, unconfirmed', async () => {
    const p = await caller(null).rsvp.answer({ event: ids.event, answer: 'needLeader', guestToken: GUEST })
    expect(p.counts.needLeader).toBe(1)
    expect(p.unconfirmed).toBe(1)
    expect(p.coming).toBe(1)
    expect(p.mine).toEqual({ answer: 'needLeader', confirmed: false })
    // The organiser sees it straight away, in the same buckets.
    const s = await caller(ids.ana, true).rsvp.summary({ eventId: ids.event })
    expect(s.counts.needLeader).toBe(1)
    expect(s.line).toBe('1 coming · 1 unconfirmed · 0 with a partner · 1 need a leader · 0 need a follower · 0 next time → 1 leader short')
  })

  it('needs a guest token when signed out', async () => {
    await expect(caller(null).rsvp.answer({ event: ids.event, answer: 'yes' })).rejects.toThrow(/guest token/i)
  })

  it('the magic link folds the guest answer into the dancer’s, confirmed, without double counting', async () => {
    const p = await caller(ids.ana).rsvp.answer({ event: ids.event, answer: 'needLeader', guestToken: GUEST })
    expect(p.mine).toEqual({ answer: 'needLeader', confirmed: true })
    expect(p.counts.needLeader).toBe(1)
    expect(p.unconfirmed).toBe(0)
    const rows = await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, ids.event))
    expect(rows).toHaveLength(1)
    expect(rows[0].dancerId).toBe(ids.ana)
    // A yes answer puts the event on the dancer's plan.
    const plan = await db.select().from(schema.planItems).where(and(eq(schema.planItems.dancerId, ids.ana), eq(schema.planItems.itemId, ids.event)))
    expect(plan).toHaveLength(1)
  })

  it('pairs a confirmed "I need a leader" with confirmed "I need a follower"s, and waves', async () => {
    await caller(ids.ben).rsvp.answer({ event: ids.event, answer: 'needFollower' })
    // An unconfirmed answer is never shown as a person.
    await caller(null).rsvp.answer({ event: ids.event, answer: 'needFollower', guestToken: OTHER_GUEST })
    const p = await caller(ids.ana).rsvp.poll({ event: ids.event })
    expect(p.matches.map(m => m.dancerId)).toEqual([ids.ben])
    expect(p.matches[0].name).toBe('ben')
    expect(p.matches[0].waved).toBe(false)
    await caller(ids.ana).wave.send({ festivalSlug: ids.event, targetDancerId: ids.ben })
    expect((await caller(ids.ana).rsvp.poll({ event: ids.event })).matches[0].waved).toBe(true)
    // And back the other way.
    expect((await caller(ids.ben).rsvp.poll({ event: ids.event })).matches.map(m => m.dancerId)).toEqual([ids.ana])
  })

  it('"Next time" takes the event off the plan and follows the organiser', async () => {
    await caller(ids.cat).rsvp.answer({ event: ids.event, answer: 'partner' })
    const p = await caller(ids.cat).rsvp.answer({ event: ids.event, answer: 'next' })
    expect(p.mine).toEqual({ answer: 'next', confirmed: true })
    const plan = await db.select().from(schema.planItems).where(and(eq(schema.planItems.dancerId, ids.cat), eq(schema.planItems.itemId, ids.event)))
    expect(plan).toHaveLength(0)
    const f = await db.select().from(schema.follows).where(and(eq(schema.follows.dancerId, ids.cat), eq(schema.follows.profileId, ids.org)))
    expect(f).toHaveLength(1)
  })

  it('lists the people behind the counts for the organiser: names, answers, the signed-out guest without one', async () => {
    const people = await caller(ids.ana, true).rsvp.people({ eventId: ids.event })
    const byId = Object.fromEntries(people.filter(p => p.dancerId).map(p => [p.dancerId, p]))
    expect(byId[ids.ana]).toMatchObject({ name: `ana ${RUN}`, answer: 'needLeader', confirmed: true })
    expect(byId[ids.ben]).toMatchObject({ answer: 'needFollower', confirmed: true })
    expect(byId[ids.cat]).toMatchObject({ answer: 'next' })
    const guests = people.filter(p => !p.dancerId)
    expect(guests).toEqual([expect.objectContaining({ name: null, answer: 'needFollower', confirmed: false })])
    expect(JSON.stringify(people)).not.toContain('@test.wedance.local')
  })

  it('drops an unconfirmed answer out of the count after 48 hours', async () => {
    const before = await caller(null).rsvp.poll({ event: ids.event })
    await db.update(schema.eventRsvps).set({ updatedAt: new Date(Date.now() - 49 * 3600_000) })
      .where(and(eq(schema.eventRsvps.eventId, ids.event), eq(schema.eventRsvps.guestToken, OTHER_GUEST)))
    const after = await caller(null).rsvp.poll({ event: ids.event })
    expect(after.counts.needFollower).toBe(before.counts.needFollower - 1)
    expect(after.unconfirmed).toBe(0)
  })

  it('a guest who left an email for the confirm link is told when the event is cancelled (RAZ-948)', async () => {
    const guest = crypto.randomUUID()
    const nextGuest = crypto.randomUUID()
    const email = `guest-${RUN}@test.wedance.local`
    await caller(null).rsvp.answer({ event: ids.solo, answer: 'yes', guestToken: guest })
    await caller(null).auth.requestMagicLink({ email, redirect: '/events/x', do: 'yes', guest })
    // "Next time" with an email: not coming, not told.
    await caller(null).rsvp.answer({ event: ids.solo, answer: 'next', guestToken: nextGuest })
    await caller(null).auth.requestMagicLink({ email: `next-${RUN}@test.wedance.local`, guest: nextGuest })
    // A later answer from the same browser keeps the email.
    await caller(null).rsvp.answer({ event: ids.event, answer: 'yes', guestToken: guest })
    try {
      const [ev] = await db.select().from(schema.events).where(eq(schema.events.id, ids.solo))
      expect((await signupsOf(db, ev)).map(p => p.email)).toEqual([email])
      const [later] = await db.select({ e: schema.eventRsvps.guestEmail }).from(schema.eventRsvps)
        .where(and(eq(schema.eventRsvps.eventId, ids.event), eq(schema.eventRsvps.guestToken, guest)))
      expect(later.e).toBe(email)
    } finally {
      await db.delete(schema.eventRsvps).where(inArray(schema.eventRsvps.guestToken, [guest, nextGuest]))
      await db.delete(schema.dancers).where(inArray(schema.dancers.email, [email, `next-${RUN}@test.wedance.local`]))
    }
  })

  it('keeps the organiser view to the event’s managers', async () => {
    await expect(caller(ids.ben).rsvp.summary({ eventId: ids.event })).rejects.toThrow(/manage/i)
    await expect(caller(ids.ben).rsvp.people({ eventId: ids.event })).rejects.toThrow(/manage/i)
  })
})
