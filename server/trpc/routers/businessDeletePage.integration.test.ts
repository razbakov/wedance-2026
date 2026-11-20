/**
 * RAZ-944 — an owner deletes a page made by mistake, against a real Postgres.
 * Only a page nothing uses goes; a page with events, or one from wedance.vip,
 * is refused with the reason. Local database only (server/test-setup.ts).
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
const h = (k: string) => `del-${k}-${RUN}`
const ids: Record<string, string> = {}
const caller = (dancerId: string, extra: Record<string, unknown> = {}) => appRouter.createCaller({ db, dancerId, isAdmin: false, ...extra } as any)

async function addPage(key: string, values: Partial<typeof schema.profiles.$inferInsert> = {}) {
  const [p] = await db.insert(schema.profiles).values({ username: h(key), type: 'organizer', name: `Page ${key} ${RUN}`, status: 'visible', claimed: true, ...values }).returning({ id: schema.profiles.id })
  ids[key] = p.id
  await db.insert(schema.profileMembers).values({ profileId: p.id, dancerId: ids.owner, role: 'owner' })
  return p.id as string
}

describe.skipIf(!DATABASE_URL)('business.deletePage — integration', () => {
  beforeAll(async () => {
    const [o] = await db.insert(schema.dancers).values({ email: `del-owner-${RUN}@test.wedance.local`, name: `Owner ${RUN}` }).returning({ id: schema.dancers.id })
    const [e] = await db.insert(schema.dancers).values({ email: `del-editor-${RUN}@test.wedance.local`, name: `Editor ${RUN}` }).returning({ id: schema.dancers.id })
    const [f] = await db.insert(schema.dancers).values({ email: `del-fan-${RUN}@test.wedance.local`, name: `Fan ${RUN}` }).returning({ id: schema.dancers.id })
    ids.owner = o.id; ids.editor = e.id; ids.fan = f.id
    await addPage('mistake')
    await db.insert(schema.profileMembers).values({ profileId: ids.mistake, dancerId: ids.editor, role: 'editor' })
    await db.insert(schema.follows).values({ dancerId: ids.fan, profileId: ids.mistake })
    await addPage('busy')
    await db.insert(schema.events).values({ name: `Party ${RUN}`, startDate: new Date(), organizerUsername: h('busy'), archived: true } as any)
    await addPage('imported', { sourceRef: { firebaseId: `fb-${RUN}` } })
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(schema.events).where(eq(schema.events.organizerUsername, h('busy')))
    const left = Object.entries(ids).filter(([k]) => !['owner', 'editor', 'fan'].includes(k)).map(([, v]) => v)
    if (left.length) {
      await db.delete(schema.follows).where(inArray(schema.follows.profileId, left))
      await db.delete(schema.profiles).where(inArray(schema.profiles.id, left))
    }
    await db.delete(schema.dancers).where(like(schema.dancers.email, `del-%-${RUN}@test.wedance.local`))
  })

  it('shows the owner what goes with an unused page, and lets only an owner see it', async () => {
    const c = await caller(ids.owner).business.deleteCheck({ username: h('mistake') })
    expect(c.blocker).toBeNull()
    expect(c.loses).toMatchObject({ followers: 1, team: 2, instagram: false, website: false })
    expect((await caller(ids.owner).business.get({ username: h('mistake') })).isOwner).toBe(true)
    expect((await caller(ids.editor).business.get({ username: h('mistake') })).isOwner).toBe(false)
    await expect(caller(ids.editor).business.deleteCheck({ username: h('mistake') })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('refuses an editor, a connected app and a wrong confirmation', async () => {
    await expect(caller(ids.editor).business.deletePage({ username: h('mistake'), confirm: h('mistake') })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(caller(ids.owner, { grantedProfileIds: [ids.mistake] }).business.deletePage({ username: h('mistake'), confirm: h('mistake') })).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(caller(ids.owner).business.deletePage({ username: h('mistake'), confirm: 'nope' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('refuses a page with events and a page from wedance.vip, saying why', async () => {
    const busy = await caller(ids.owner).business.deleteCheck({ username: h('busy') })
    expect(busy.uses).toEqual([{ key: 'events', count: 1, label: '1 event' }])
    expect(busy.blocker).toMatch(/It has 1 event\. Merge it/)
    await expect(caller(ids.owner).business.deletePage({ username: h('busy'), confirm: h('busy') })).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(caller(ids.owner).business.deletePage({ username: h('imported'), confirm: h('imported') })).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringMatching(/wedance\.vip/) })
  })

  it('deletes an unused page with its team and followers, and frees the handle', async () => {
    const r = await caller(ids.owner).business.deletePage({ username: h('mistake'), confirm: `@${h('mistake').toUpperCase()}` })
    expect(r).toEqual({ deleted: h('mistake') })
    expect(await db.select().from(schema.profiles).where(eq(schema.profiles.id, ids.mistake))).toEqual([])
    expect(await db.select().from(schema.profileMembers).where(eq(schema.profileMembers.profileId, ids.mistake))).toEqual([])
    expect(await db.select().from(schema.follows).where(eq(schema.follows.profileId, ids.mistake))).toEqual([])
    expect(await db.select().from(schema.handles).where(eq(schema.handles.handle, h('mistake')))).toEqual([])
    // The owner's other pages stay.
    expect(await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.id, ids.busy))).toHaveLength(1)
  })
})
