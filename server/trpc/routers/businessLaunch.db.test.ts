import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

// Local Postgres only (test-setup drops a remote DATABASE_URL), with 0067 applied:
//   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance \
//   NEON_FETCH_ENDPOINT=http://localhost:4444/sql bunx vitest run server/trpc/routers/businessLaunch.db.test.ts
const DATABASE_URL = process.env.DATABASE_URL
let db: any = null
if (DATABASE_URL) db = drizzle(neon(DATABASE_URL), { schema })

const as = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)
const tag = `launch-${Date.now()}`
const ids: Record<'owner' | 'stranger', string> = {} as any
let username = ''

describe.skipIf(!DATABASE_URL)('businessLaunch router', () => {
  beforeAll(async () => {
    const rows = await db.insert(schema.dancers).values([{ email: `${tag}-o@test.local`, name: 'owner' }, { email: `${tag}-s@test.local`, name: 'stranger' }]).returning({ id: schema.dancers.id })
    ids.owner = rows[0].id
    ids.stranger = rows[1].id
    username = (await as(ids.owner).business.create({ type: 'organizer', name: `${tag} Night` })).username
  })
  afterAll(async () => {
    if (username) await db.delete(schema.profiles).where(inArray(schema.profiles.username, [username]))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, Object.values(ids)))
  })

  it('is for the page’s team only', async () => {
    await expect(as(ids.stranger).businessLaunch.get({ username })).rejects.toThrow()
    const d = await as(ids.owner).businessLaunch.get({ username })
    expect(d.progress).toHaveLength(8)
    expect(d.steps.every(s => s.status === 'todo')).toBe(true)
  })

  it('fields feed the drafts; an edit sticks and can go back to the draft', async () => {
    const me = as(ids.owner).businessLaunch
    await me.saveStep({ username, stepKey: 'brand.where', fields: { placeName: 'La Prueba', displayName: 'La Prueba – Latin Disco' } })
    let d = await me.saveStep({ username, stepKey: 'maps.name', copy: { name: 'My own name' } })
    expect(d.steps.find(s => s.key === 'brand.where')!.status).toBe('doing')
    expect(d.steps.find(s => s.key === 'maps.name')!.copy[0]).toMatchObject({ text: 'My own name', edited: true, draft: 'La Prueba – Latin Disco' })
    d = await me.saveStep({ username, stepKey: 'maps.name', copy: { name: null } })
    expect(d.steps.find(s => s.key === 'maps.name')!.copy[0]).toMatchObject({ text: 'La Prueba – Latin Disco', edited: false })
    await expect(me.saveStep({ username, stepKey: 'maps.name', fields: { nope: 'x' } })).rejects.toThrow(/isn’t a field/)
  })

  it('a name is never free without a link, and only a free name can be chosen', async () => {
    const me = as(ids.owner).businessLaunch
    let d = await me.addName({ username, name: 'La Prueba' })
    const id = d.names[0]!.id
    await expect(me.addEvidence({ username, stepKey: 'name.pick', nameId: id, source: 'Google', verdict: 'free', note: 'looked fine' })).rejects.toThrow()
    await expect(me.decideName({ username, id, decision: 'chosen' })).rejects.toThrow(/link/)
    d = await me.addEvidence({ username, stepKey: 'name.pick', nameId: id, source: 'Instagram', url: 'https://www.instagram.com/laprueba/', verdict: 'free' })
    expect(d.names[0]!.verdict).toBe('free')
    d = await me.addEvidence({ username, stepKey: 'name.pick', nameId: id, source: 'Google', url: 'https://example.org/la-prueba-party', verdict: 'taken', note: 'A party with that name' })
    expect(d.names[0]!.verdict).toBe('taken')
    await expect(me.decideName({ username, id, decision: 'chosen' })).rejects.toThrow(/taken/)
    await me.removeEvidence({ username, id: d.names[0]!.evidence.find(e => e.verdict === 'taken')!.id })
    d = await me.decideName({ username, id, decision: 'chosen' })
    expect(d.chosenName).toBe('La Prueba')
    d = await me.setStatus({ username, stepKey: 'name.pick', status: 'done' })
    expect(d.progress.find(p => p.key === 'name')!.state).toBe('done')
  })

  it('a proof step can’t be ticked done without an evidence link', async () => {
    const me = as(ids.owner).businessLaunch
    await expect(me.setStatus({ username, stepKey: 'listing.inmuenchen', status: 'done' })).rejects.toThrow(/link/)
    await me.addEvidence({ username, stepKey: 'listing.inmuenchen', note: 'Submitted, waiting' })
    await expect(me.setStatus({ username, stepKey: 'listing.inmuenchen', status: 'done' })).rejects.toThrow(/link/)
    await me.addEvidence({ username, stepKey: 'listing.inmuenchen', url: 'https://www.in-muenchen.de/example' })
    const d = await me.setStatus({ username, stepKey: 'listing.inmuenchen', status: 'done' })
    expect(d.steps.find(s => s.key === 'listing.inmuenchen')!.status).toBe('done')
  })

  it('a corrected link sticks', async () => {
    const d = await as(ids.owner).businessLaunch.saveStep({ username, stepKey: 'listing.gonedancing', fields: { 'link:0': 'https://example.org/submit' } })
    expect(d.steps.find(s => s.key === 'listing.gonedancing')!.links[0]).toMatchObject({ url: 'https://example.org/submit', edited: true })
  })
})
