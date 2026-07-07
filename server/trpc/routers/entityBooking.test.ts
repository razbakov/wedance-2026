/**
 * Hermetic tests for the entity (pro profiles) + booking routers.
 */
import { describe, it, expect, vi } from 'vitest'
import { profiles, bookableSpaces, bookingRequests } from '../../database/schema'

type FilterFn = (row: Record<string, any>) => boolean

vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
  const resolveKey = (col: any): string | undefined => (col?.name ? snakeToCamel(col.name) : undefined)
  const eq = (col: any, val: any): FilterFn => { const k = resolveKey(col); return (r) => (k ? r[k] === val : false) }
  const and = (...p: FilterFn[]): FilterFn => (r) => p.every(f => f(r))
  return { eq, and, gt: () => () => false, sql: (..._a: any[]) => ({}) }
})

import { appRouter } from '../index'

interface Row { [k: string]: any }
class FakeDb {
  profiles: Row[] = []
  bookableSpaces: Row[] = []
  bookingRequests: Row[] = []
  select(_c: any) { return { from: (t: any) => ({ where: (f: FilterFn) => Promise.resolve(this.tableFor(t).filter(f)) }) } }
  insert(t: any) {
    return { values: (row: Row) => {
      const id = row.id ?? 'row-' + this.tableFor(t).length
      const inserted = { id, status: row.status ?? 'pending', ...row }
      this.tableFor(t).push(inserted)
      const chain: any = Promise.resolve(undefined)
      chain.returning = () => Promise.resolve([inserted])
      return chain
    } }
  }
  private tableFor(t: any): Row[] {
    if (t === profiles) return this.profiles
    if (t === bookableSpaces) return this.bookableSpaces
    if (t === bookingRequests) return this.bookingRequests
    throw new Error('unexpected table')
  }
}
function caller(db: any, opts: { dancerId?: string | null } = {}) {
  return appRouter.createCaller({ db, dancerId: opts.dancerId ?? null, isAdmin: false })
}

describe('entity.getByHandle', () => {
  it('returns a visible profile with its spaces sorted by sortOrder', async () => {
    const db = new FakeDb()
    db.profiles.push({ id: 'p1', username: 'pina', type: 'venue', name: 'Pina', status: 'visible', city: 'Munich', citySlug: 'munich' })
    db.bookableSpaces.push({ id: 's2', profileId: 'p1', name: 'B', sortOrder: 20 })
    db.bookableSpaces.push({ id: 's1', profileId: 'p1', name: 'A', sortOrder: 10 })
    const res = await caller(db).entity.getByHandle({ handle: 'pina' })
    expect(res?.profile.name).toBe('Pina')
    expect(res?.spaces.map((s: any) => s.name)).toEqual(['A', 'B'])
  })

  it('returns null for an unknown handle', async () => {
    const db = new FakeDb()
    expect(await caller(db).entity.getByHandle({ handle: 'nope' })).toBeNull()
  })

  it('lists venues by city', async () => {
    const db = new FakeDb()
    db.profiles.push({ id: 'p1', username: 'pina', type: 'venue', name: 'Pina', status: 'visible', citySlug: 'munich' })
    db.profiles.push({ id: 'p2', username: 'other', type: 'venue', name: 'Other', status: 'visible', citySlug: 'berlin' })
    const res = await caller(db).entity.listByCity({ citySlug: 'munich', type: 'venue' })
    expect(res.map((v: any) => v.username)).toEqual(['pina'])
  })
})

describe('booking.request', () => {
  it('creates a request when terms are accepted', async () => {
    const db = new FakeDb()
    db.bookableSpaces.push({ id: '11111111-1111-4111-8111-111111111111', profileId: 'p1', name: 'A' })
    const out = await caller(db, { dancerId: 'd1' }).booking.request({
      spaceId: '11111111-1111-4111-8111-111111111111',
      email: 'org@example.com', termsAccepted: true, headcount: 50,
    })
    expect(out.ok).toBe(true)
    expect(db.bookingRequests).toHaveLength(1)
    expect(db.bookingRequests[0].termsAcceptedAt).toBeTruthy()
    expect(db.bookingRequests[0].profileId).toBe('p1')
  })

  it('rejects when terms are not accepted', async () => {
    const db = new FakeDb()
    db.bookableSpaces.push({ id: '11111111-1111-4111-8111-111111111111', profileId: 'p1', name: 'A' })
    await expect(caller(db).booking.request({
      spaceId: '11111111-1111-4111-8111-111111111111',
      email: 'org@example.com', termsAccepted: false,
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  it('404s when the space does not exist', async () => {
    const db = new FakeDb()
    await expect(caller(db).booking.request({
      spaceId: '22222222-2222-4222-8222-222222222222',
      email: 'org@example.com', termsAccepted: true,
    })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
