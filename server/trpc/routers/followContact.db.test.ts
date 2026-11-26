import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '..'
import { emailBlock } from '../../../shared/utils/contactSegments'

// Following a page makes the dancer a contact it may email (RAZ-1092). Local Postgres only:
//   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance NEON_FETCH_ENDPOINT=http://localhost:4444/sql bunx vitest run server/trpc/routers/followContact.db.test.ts
const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000', resendApiKey: '' }))

const tag = `followc${Date.now()}`
const ids = {} as Record<'owner' | 'fan' | 'imported' | 'gone', string>
let pageId = ''
const web = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false, origin: 'https://wedance.test' } as any)
const contactOf = async (dancerId: string) => {
  const [c] = await db.select().from(schema.profileContacts).where(and(eq(schema.profileContacts.profileId, pageId), eq(schema.profileContacts.dancerId, dancerId)))
  return c
}
const mailable = (c: any) => emailBlock({ status: c.status, source: c.source, bouncedAt: c.bouncedAt }) === null

describe.skipIf(!DATABASE_URL)('follow.toggle → Contacts (DB)', () => {
  beforeAll(async () => {
    const rows = await db.insert(schema.dancers).values([
      { email: `${tag}-owner@test.local`, name: 'Owner' },
      { email: `${tag}-fan@test.local`, name: 'Fiona Fan' },
      { email: `${tag}-imported@test.local`, name: 'Ivo Imported' },
      { email: `${tag}-gone@test.local`, name: 'Gina Gone' },
    ]).returning({ id: schema.dancers.id })
    ;[ids.owner, ids.fan, ids.imported, ids.gone] = rows.map((r: any) => r.id)
    const { username } = await web(ids.owner).business.create({ type: 'organizer', name: `Follow School ${tag}`, city: 'Munich' })
    const [p] = await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.username, username))
    pageId = p.id
    await db.insert(schema.profileContacts).values([
      { profileId: pageId, email: `${tag}-imported@test.local`, source: { from: 'hubspot', hubspot_origin: 'import' } },
      { profileId: pageId, dancerId: ids.gone, email: `${tag}-gone@test.local`, source: { form: 'school.test' }, status: 'unsubscribed' },
    ])
  })

  afterAll(async () => {
    if (!db) return
    if (pageId) {
      await db.delete(schema.follows).where(eq(schema.follows.profileId, pageId))
      await db.delete(schema.profiles).where(eq(schema.profiles.id, pageId))
    }
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, Object.values(ids)))
  })

  it('a new follower becomes a mailable contact with their name and email; unfollowing stops it, following again restarts it', async () => {
    expect(await web(ids.fan).follow.toggle({ profileId: pageId })).toEqual({ following: true })
    let c = await contactOf(ids.fan)
    expect(c).toMatchObject({ email: `${tag}-fan@test.local`, name: 'Fiona Fan', status: 'subscribed', source: { from: 'follow' } })
    expect(mailable(c)).toBe(true)

    expect(await web(ids.fan).follow.toggle({ profileId: pageId })).toEqual({ following: false })
    c = await contactOf(ids.fan)
    expect(c.status).toBe('unsubscribed')

    await web(ids.fan).follow.toggle({ profileId: pageId })
    c = await contactOf(ids.fan)
    expect(c.status).toBe('subscribed')
    expect(c.source.unfollowed_at).toBeUndefined()
    expect(mailable(c)).toBe(true)
  })

  it('an imported contact who follows opts in, keeps where they came from and is linked to their account', async () => {
    await web(ids.imported).follow.toggle({ profileId: pageId })
    const c = await contactOf(ids.imported)
    expect(c.source).toMatchObject({ from: 'hubspot', hubspot_origin: 'import', opted_in: 'follow' })
    expect(mailable(c)).toBe(true)
    // Unfollowing takes back only the opt-in following gave.
    await web(ids.imported).follow.toggle({ profileId: pageId })
    expect((await contactOf(ids.imported)).status).toBe('unsubscribed')
  })

  it('someone who unsubscribed from the page themselves stays unsubscribed when they follow', async () => {
    await web(ids.gone).follow.toggle({ profileId: pageId })
    const c = await contactOf(ids.gone)
    expect(c.status).toBe('unsubscribed')
    expect(c.source.opted_in).toBeUndefined()
  })
})
