/**
 * "I'm in" on a shared weekend (RAZ-1016): a night nobody on WeDance manages
 * still goes on the friend's plan, and nothing is written to that event's
 * sign-up list. A night with a team still counts as a yes.
 *
 * Postgres only (server/test-setup.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000' }))

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const ALPH = 'abcdefghjkmnpqrstuvwxyz23456789'
const CODE = Array.from({ length: 7 }, (_, i) => ALPH[(RUN.charCodeAt(i % RUN.length) + i) % ALPH.length]).join('')
const ids: Record<string, string> = {}
const caller = (dancerId: string | null) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)
const GUEST = crypto.randomUUID()

describe.skipIf(!DATABASE_URL)('weekend.join and an event nobody manages', () => {
  beforeAll(async () => {
    for (const key of ['sharer', 'friend']) {
      const [d] = await db.insert(schema.dancers).values({ email: `${key}-${RUN}@test.wedance.local`, name: `${key} ${RUN}` }).returning({ id: schema.dancers.id })
      ids[key] = d.id
    }
    const [org] = await db.insert(schema.profiles).values({ username: `wknd-org-${RUN}`, name: `Org ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    ids.org = org.id
    await db.insert(schema.profileMembers).values({ profileId: ids.org, dancerId: ids.sharer, role: 'owner' })
    const start = new Date(Date.now() + 2 * 86400_000)
    const base = { type: 'Party', styles: ['Salsa'], startDate: start, timezone: 'Europe/Berlin', published: true, archived: false }
    const [imported] = await db.insert(schema.events).values({
      ...base, name: `Imported Night ${RUN}`, organizerUsername: `nobody-${RUN}`, link: 'https://megano-tanzschule.de/party',
    }).returning({ id: schema.events.id })
    ids.imported = imported.id
    const [managed] = await db.insert(schema.events).values({
      ...base, name: `Managed Night ${RUN}`, organizerUsername: `wknd-org-${RUN}`,
    }).returning({ id: schema.events.id })
    ids.managed = managed.id
    const [share] = await db.insert(schema.weekendShares).values({
      code: CODE, dancerId: ids.sharer, eventIds: [ids.imported, ids.managed],
    }).returning({ id: schema.weekendShares.id, code: schema.weekendShares.code })
    ids.share = share.id
    ids.code = share.code
  })

  afterAll(async () => {
    if (!db) return
    const eventIds = [ids.imported, ids.managed].filter(Boolean)
    const dancerIds = [ids.sharer, ids.friend].filter(Boolean)
    await db.delete(schema.weekendShares).where(eq(schema.weekendShares.id, ids.share))
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.attendances).where(inArray(schema.attendances.eventId, eventIds))
    await db.delete(schema.eventRsvps).where(inArray(schema.eventRsvps.eventId, eventIds))
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    await db.delete(schema.profiles).where(eq(schema.profiles.id, ids.org))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, dancerIds))
  })

  it('puts an unmanaged night on the friend’s plan and not on the sign-up list', async () => {
    const view = await caller(ids.friend).weekend.join({ code: ids.code, eventId: ids.imported })
    expect(view.events.find(e => e.id === ids.imported)?.joinedByMe).toBe(true)
    const plan = await db.select().from(schema.planItems).where(eq(schema.planItems.dancerId, ids.friend))
    expect(plan).toEqual([expect.objectContaining({ itemType: 'event', itemId: ids.imported })])
    expect(await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, ids.imported))).toEqual([])
  })

  it('a guest “I’m in” joins the weekend and writes no sign-up', async () => {
    const view = await caller(null).weekend.join({ code: ids.code, eventId: ids.imported, name: 'Mina', guestToken: GUEST })
    expect(view.events.find(e => e.id === ids.imported)?.coming.map(c => c.name)).toContain('Mina')
    expect(await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, ids.imported))).toEqual([])
  })

  it('still counts a yes on a night someone manages', async () => {
    await caller(ids.friend).weekend.join({ code: ids.code, eventId: ids.managed })
    const rows = await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, ids.managed))
    expect(rows).toEqual([expect.objectContaining({ dancerId: ids.friend, answer: 'yes' })])
    const plan = await db.select().from(schema.planItems).where(eq(schema.planItems.itemId, ids.managed))
    expect(plan).toHaveLength(1)
  })
})
