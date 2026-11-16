/**
 * RAZ-1011: an event is reviewed only by people who went, after the night. Hermetic (FakeDb);
 * who went is `wentTo` (unit-covered by its sources in eventCancel), mocked here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dancers, reviews, events, eventReviewAsks } from '../../database/schema'

type FilterFn = (row: Record<string, any>) => boolean
vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
  const key = (col: any): string | undefined => (col?.name ? snakeToCamel(col.name) : undefined)
  const eq = (col: any, val: any): FilterFn => (row) => (key(col) ? row[key(col)!] === val : false)
  const and = (...p: FilterFn[]): FilterFn => (row) => p.filter(Boolean).every(f => f(row))
  return { eq, and, ne: () => () => true, gt: () => () => false, desc: (x: any) => x, sql: (..._a: any[]) => ({}) }
})
const went = new Set<string>()
vi.mock('../../utils/eventCancel', async (orig) => ({ ...(await orig<any>()), wentTo: async (_db: any, _ev: any, d: { id: string }) => went.has(d.id) }))

import { appRouter } from '../index'

const EV = '11111111-2222-4333-8444-555555555555'
const H = 3_600_000

class FakeDb {
  t = new Map<any, any[]>([[dancers, []], [reviews, []], [events, []], [eventReviewAsks, []]])
  rows(t: any) { const r = this.t.get(t); if (!r) throw new Error('unexpected table'); return r }
  select(_c?: any) { return { from: (t: any) => ({ where: (f: FilterFn) => Promise.resolve(this.rows(t).filter(f)) }) } }
  insert(t: any) {
    return { values: (row: any) => { const x = { id: `r${this.rows(t).length}`, createdAt: null, status: 'visible', ...row }; this.rows(t).push(x); const c: any = Promise.resolve(); c.returning = () => Promise.resolve([x]); return c } }
  }
  update(t: any) { return { set: (p: any) => ({ where: (f: FilterFn) => { for (const r of this.rows(t)) if (f(r)) Object.assign(r, p); return Promise.resolve() } }) } }
}

const caller = (db: any, dancerId: string | null = null) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)

function seed(endOffsetH: number) {
  const db = new FakeDb()
  db.rows(dancers).push({ id: 'd1', name: 'Ana', username: 'ana', email: 'ana@example.com' }, { id: 'd2', name: 'Bo', username: 'bo', email: 'bo@example.com' })
  db.rows(events).push({ id: EV, name: 'Timba Thursday', startDate: new Date(Date.now() + (endOffsetH - 4) * H), endDate: new Date(Date.now() + endOffsetH * H), citySlug: 'munich' })
  return db
}

beforeEach(() => { went.clear() })

describe('review.create for an event', () => {
  it('lets someone who went review it once the night is over, marked "went"', async () => {
    const db = seed(-2)
    went.add('d1')
    await caller(db, 'd1').review.create({ targetType: 'event', targetSlug: EV, rating: 5, text: 'The band!' })
    const res = await caller(db).review.list({ targetType: 'event', targetSlug: EV })
    expect(res.count).toBe(1)
    expect(res.reviews[0]).toMatchObject({ rating: 5, went: true })
    expect(db.rows(reviews)[0]).toMatchObject({ targetName: 'Timba Thursday', citySlug: 'munich' })
  })

  it('refuses people who did not go', async () => {
    const db = seed(-2)
    await expect(caller(db, 'd2').review.create({ targetType: 'event', targetSlug: EV, rating: 1 }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', message: expect.stringMatching(/went/) })
  })

  it('refuses before the night is over, even for people going', async () => {
    const db = seed(+2)
    went.add('d1')
    await expect(caller(db, 'd1').review.create({ targetType: 'event', targetSlug: EV, rating: 5 }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', message: expect.stringMatching(/over/) })
  })

  it('refuses an unknown event', async () => {
    const db = seed(-2)
    await expect(caller(db, 'd1').review.create({ targetType: 'event', targetSlug: 'not-an-id', rating: 5 }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('leaves festivals open to anyone signed in', async () => {
    const db = seed(-2)
    await caller(db, 'd2').review.create({ targetType: 'festival', targetSlug: 'charanga', rating: 4 })
    expect(db.rows(reviews)[0]).toMatchObject({ targetType: 'festival', went: false })
  })
})

describe('review.eventAsk', () => {
  it('tells the page who may rate: before / went / reviewed / missed', async () => {
    const before = seed(+2)
    went.add('d1')
    expect(await caller(before, 'd1').review.eventAsk({ eventId: EV })).toMatchObject({ open: false, went: true })

    const db = seed(-2)
    expect(await caller(db).review.eventAsk({ eventId: EV })).toMatchObject({ open: true, signedIn: false, went: false })
    expect(await caller(db, 'd2').review.eventAsk({ eventId: EV })).toMatchObject({ open: true, went: false, mine: null })
    expect(await caller(db, 'd1').review.eventAsk({ eventId: EV })).toMatchObject({ open: true, went: true, missed: false, mine: null })

    await caller(db, 'd1').review.create({ targetType: 'event', targetSlug: EV, rating: 4, text: 'Nice' })
    expect((await caller(db, 'd1').review.eventAsk({ eventId: EV })).mine).toMatchObject({ rating: 4, text: 'Nice' })

    db.rows(eventReviewAsks).push({ id: 'a1', eventId: EV, email: 'ana@example.com', token: 'tok-ana-123456', missedAt: null })
    await caller(db).review.missed({ token: 'tok-ana-123456' })
    expect(db.rows(eventReviewAsks)[0].missedAt).toBeInstanceOf(Date)
    expect(await caller(db, 'd1').review.eventAsk({ eventId: EV })).toMatchObject({ missed: true })
  })

  it('missed: an unknown token is a clear error', async () => {
    await expect(caller(seed(-2)).review.missed({ token: 'nope-nope-nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
