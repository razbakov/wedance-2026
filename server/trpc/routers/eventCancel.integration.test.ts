/**
 * RAZ-948 — an organiser cancels events, against a real Postgres. They stay
 * listed (public reads + the profile feed say cancelled, with the reason),
 * everyone who signed up is emailed once, and undo clears it. Local database
 * only (server/test-setup.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray, like } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'
import { profileFeedEvents } from '../../utils/profileFeed'

const sent: any[] = []
vi.mock('../../utils/email', async (orig) => ({
  ...(await orig<any>()),
  sendEventCancelledEmail: async (p: any) => { sent.push(p) },
}))
vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000' }))

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null
const RUN = Math.random().toString(36).slice(2, 8)
const mail = (k: string) => `cxl-${k}-${RUN}@test.wedance.local`
const ids: Record<string, string> = {}
const eventIds: string[] = []
const caller = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)
const HOUR = 3600_000

async function dancer(k: string) {
  const [d] = await db.insert(schema.dancers).values({ email: mail(k), name: `${k[0]!.toUpperCase()}${k.slice(1)} Tester` }).returning({ id: schema.dancers.id })
  ids[k] = d.id
}
async function party(k: string, values: Partial<typeof schema.events.$inferInsert> = {}) {
  const [e] = await db.insert(schema.events).values({
    name: `Party ${k} ${RUN}`, startDate: new Date(Date.now() + 5 * HOUR), endDate: new Date(Date.now() + 9 * HOUR),
    timezone: 'Europe/Berlin', published: true, archived: false, hostProfileId: ids.page, ...values,
  } as any).returning({ id: schema.events.id })
  ids[k] = e.id
  eventIds.push(e.id)
}

describe.skipIf(!DATABASE_URL)('businessEvents.cancel — integration', () => {
  beforeAll(async () => {
    for (const k of ['owner', 'planner', 'poller', 'maybe', 'stranger']) await dancer(k)
    const [p] = await db.insert(schema.profiles).values({ username: `cxl-club-${RUN}`, type: 'organizer', name: `Club ${RUN}`, status: 'visible', claimed: true }).returning({ id: schema.profiles.id, username: schema.profiles.username, name: schema.profiles.name })
    ids.page = p.id
    await db.insert(schema.profileMembers).values({ profileId: p.id, dancerId: ids.owner, role: 'owner' })
    await party('one')
    await party('two')
    await party('draft', { published: false })
    // Signed up for "one": on the plan (twice over: plan + poll), a confirmed poll "yes",
    // a "next time" (not told), an unclaimed ticket stub, and the organiser themselves.
    await db.insert(schema.planItems).values([
      { dancerId: ids.planner, itemType: 'event', itemId: ids.one },
      { dancerId: ids.owner, itemType: 'event', itemId: ids.one },
    ])
    await db.insert(schema.eventRsvps).values([
      { eventId: ids.one, dancerId: ids.planner, answer: 'yes', confirmedAt: new Date() },
      { eventId: ids.one, dancerId: ids.poller, answer: 'partner', confirmedAt: new Date() },
      { eventId: ids.one, dancerId: ids.maybe, answer: 'next', confirmedAt: new Date() },
    ])
    await db.insert(schema.attendances).values({ eventId: ids.one, buyerEmail: mail('stub'), status: 'ticket_holder', source: 'stripe' })
  })

  afterAll(async () => {
    if (!db) return
    if (eventIds.length) await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    await db.delete(schema.planItems).where(inArray(schema.planItems.itemId, eventIds))
    if (ids.page) await db.delete(schema.profiles).where(eq(schema.profiles.id, ids.page))
    await db.delete(schema.dancers).where(like(schema.dancers.email, `cxl-%-${RUN}@test.wedance.local`))
  })

  it('previews who will be told, without changing anything', async () => {
    const p = await caller(ids.owner).businessEvents.cancelPreview({ ids: [ids.one, ids.two] })
    expect(p.events.find(e => e.id === ids.one)).toMatchObject({ toNotify: 3, ticketHolders: 1, alreadyCancelled: false })
    expect(p.toNotify).toBe(3)
    const [ev] = await db.select({ c: schema.events.cancelledAt }).from(schema.events).where(eq(schema.events.id, ids.one))
    expect(ev.c).toBeNull()
  })

  it('refuses someone who doesn’t manage it, and a draft', async () => {
    await expect(caller(ids.stranger).businessEvents.cancel({ ids: [ids.one] })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(caller(ids.owner).businessEvents.cancel({ ids: [ids.draft] })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('cancels several at once, emails each person once, and keeps them listed', async () => {
    const r = await caller(ids.owner).businessEvents.cancel({ ids: [ids.one, ids.two], reason: '  Tanzverbot today  ' })
    expect(r.notified).toBe(3)
    expect(sent.map(s => s.to).sort()).toEqual([mail('planner'), mail('poller'), mail('stub')].sort())
    expect(sent.find(s => s.to === mail('stub'))).toMatchObject({ ticket: true, reason: 'Tanzverbot today', organizer: `Club ${RUN}` })
    expect(sent.find(s => s.to === mail('planner'))).toMatchObject({ ticket: false, name: 'Planner' })

    const pub = await caller(ids.stranger).events.get({ id: ids.one })
    expect(pub).toMatchObject({ published: true, cancelReason: 'Tanzverbot today' })
    expect(pub.cancelledAt).toBeTruthy()

    const feed = await profileFeedEvents(db, { id: ids.page, username: `cxl-club-${RUN}`, name: `Club ${RUN}` })
    expect(feed.filter(e => eventIds.includes(e.id)).map(e => [e.cancelled, e.cancelReason])).toEqual([[true, 'Tanzverbot today'], [true, 'Tanzverbot today']])
  })

  it('cancelling again only edits the reason; nobody is emailed twice', async () => {
    sent.length = 0
    const r = await caller(ids.owner).businessEvents.cancel({ ids: [ids.one], reason: 'Tanzverbot (Totensonntag)' })
    expect(r).toMatchObject({ notified: 0, events: [{ alreadyCancelled: true }] })
    expect(sent).toEqual([])
    expect((await caller(ids.stranger).events.get({ id: ids.one })).cancelReason).toBe('Tanzverbot (Totensonntag)')
  })

  it('undo: it’s on again, emails nobody', async () => {
    sent.length = 0
    expect(await caller(ids.owner).businessEvents.uncancel({ id: ids.two })).toEqual({ uncancelled: true })
    const ev = await caller(ids.stranger).events.get({ id: ids.two })
    expect(ev.cancelledAt).toBeNull()
    expect(ev.cancelReason).toBeNull()
    expect(sent).toEqual([])
    const feed = await profileFeedEvents(db, { id: ids.page, username: `cxl-club-${RUN}`, name: `Club ${RUN}` })
    expect(feed.find(e => e.id === ids.two)).toMatchObject({ cancelled: false, cancelReason: null })
  })
})
