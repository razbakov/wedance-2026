/**
 * Hermetic unit tests for review / communityGroup / askLocals routers.
 * FakeDb pattern (no live Neon), same drizzle `eq`/`and` predicate mock.
 */
import { describe, it, expect, vi } from 'vitest'
import { dancers, reviews, communityGroups, recommendationRequests, sessions } from '../../database/schema'

type FilterFn = (row: Record<string, any>) => boolean

vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
  const resolveKey = (col: any): string | undefined => (col?.name ? snakeToCamel(col.name) : undefined)
  const eq = (col: any, val: any): FilterFn => {
    const jsKey = resolveKey(col)
    return (row) => (jsKey ? row[jsKey] === val : false)
  }
  const and = (...preds: FilterFn[]): FilterFn => (row) => preds.every(p => p(row))
  return { eq, and, gt: () => () => false, desc: (x: any) => x, sql: (..._a: any[]) => ({}) }
})

import { appRouter } from '../index'

interface FakeRow { [k: string]: any }

class FakeDb {
  dancers: FakeRow[] = []
  reviews: FakeRow[] = []
  communityGroups: FakeRow[] = []
  recommendationRequests: FakeRow[] = []
  sessions: FakeRow[] = []

  seedDancer(row: Partial<FakeRow> & { id: string }) {
    this.dancers.push({ name: 'Dancer', username: null, ...row })
    return row.id
  }

  select(_c: any) {
    return { from: (t: any) => ({ where: (f: FilterFn) => Promise.resolve(this.tableFor(t).filter(f)) }) }
  }

  insert(t: any) {
    return {
      values: (row: FakeRow) => {
        const id = row.id ?? 'row-' + this.tableFor(t).length
        // Emulate the per-table status column default the real DB applies.
        const statusDefault = t === recommendationRequests ? 'open' : 'visible'
        const inserted = { id, createdAt: null, status: statusDefault, ...row }
        this.tableFor(t).push(inserted)
        const chain: any = Promise.resolve(undefined)
        chain.returning = () => Promise.resolve([inserted])
        return chain
      },
    }
  }

  update(t: any) {
    return {
      set: (patch: FakeRow) => ({
        where: (f: FilterFn) => {
          for (const row of this.tableFor(t)) if (f(row)) Object.assign(row, patch)
          return Promise.resolve()
        },
      }),
    }
  }

  private tableFor(t: any): FakeRow[] {
    if (t === dancers) return this.dancers
    if (t === reviews) return this.reviews
    if (t === communityGroups) return this.communityGroups
    if (t === recommendationRequests) return this.recommendationRequests
    if (t === sessions) return this.sessions
    throw new Error('unexpected table in FakeDb')
  }
}

function caller(db: any, opts: { dancerId?: string | null; isAdmin?: boolean } = {}) {
  return appRouter.createCaller({ db, dancerId: opts.dancerId ?? null, isAdmin: opts.isAdmin ?? false })
}

describe('review', () => {
  it('creates a review and aggregates average + count', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', name: 'Ana', username: 'ana-1' })
    db.seedDancer({ id: 'd2', name: 'Bob', username: 'bob-1' })

    await caller(db, { dancerId: 'd1' }).review.create({ targetType: 'festival', targetSlug: 'charanga-2026', rating: 4, text: 'Great' })
    await caller(db, { dancerId: 'd2' }).review.create({ targetType: 'festival', targetSlug: 'charanga-2026', rating: 5 })

    const res = await caller(db).review.list({ targetType: 'festival', targetSlug: 'charanga-2026' })
    expect(res.count).toBe(2)
    expect(res.average).toBe(4.5)
    // denormalized reviewer identity present
    expect(res.reviews.some((r: any) => r.reviewerUsername === 'ana-1')).toBe(true)
  })

  it('is one-per-user: a second review from the same dancer updates, not duplicates', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', name: 'Ana', username: 'ana-1' })
    const c = caller(db, { dancerId: 'd1' })
    await c.review.create({ targetType: 'venue', targetSlug: 'la-rumba', rating: 3 })
    await c.review.create({ targetType: 'venue', targetSlug: 'la-rumba', rating: 5, text: 'Changed my mind' })

    const res = await caller(db).review.list({ targetType: 'venue', targetSlug: 'la-rumba' })
    expect(res.count).toBe(1)
    expect(res.average).toBe(5)
  })

  it('requires auth to create', async () => {
    const db = new FakeDb()
    await expect(caller(db).review.create({ targetType: 'artist', targetSlug: 'x', rating: 5 }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('askLocals.recommend', () => {
  it('writes a 5-star recommendation review on a slugified target', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', name: 'Ana', username: 'ana-1' })
    const out = await caller(db, { dancerId: 'd1' }).askLocals.recommend({
      citySlug: 'munich', targetType: 'organizer', targetName: 'Salsa Kings München', text: 'The best',
    })
    expect(out.targetSlug).toBe('salsa-kings-munchen')

    const res = await caller(db).review.list({ targetType: 'organizer', targetSlug: 'salsa-kings-munchen' })
    expect(res.count).toBe(1)
    expect(res.reviews[0].rating).toBe(5)
    expect(res.reviews[0].source).toBe('recommendation')
  })

  it('ask requires auth and creates a question listed for the city', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1' })
    await expect(caller(db).askLocals.ask({ citySlug: 'munich', question: 'Who teaches timba?' }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await caller(db, { dancerId: 'd1' }).askLocals.ask({ citySlug: 'munich', question: 'Who teaches timba?' })
    const qs = await caller(db).askLocals.listByCity({ citySlug: 'munich' })
    expect(qs).toHaveLength(1)
    expect(qs[0].question).toBe('Who teaches timba?')
  })
})

describe('communityGroup', () => {
  it('lists visible groups for a city, verified first', async () => {
    const db = new FakeDb()
    db.communityGroups.push({ id: 'g1', citySlug: 'munich', name: 'Zeta', platform: 'whatsapp', inviteUrl: 'https://chat.whatsapp.com/z', styles: [], verified: false, status: 'visible' })
    db.communityGroups.push({ id: 'g2', citySlug: 'munich', name: 'Alpha', platform: 'telegram', inviteUrl: 'https://t.me/a', styles: [], verified: true, status: 'visible' })
    db.communityGroups.push({ id: 'g3', citySlug: 'berlin', name: 'Other', platform: 'whatsapp', inviteUrl: 'https://x', styles: [], verified: false, status: 'visible' })

    const res = await caller(db).communityGroup.listByCity({ citySlug: 'munich' })
    expect(res.map((g: any) => g.id)).toEqual(['g2', 'g1']) // verified first
  })

  it('create requires admin', async () => {
    const db = new FakeDb()
    await expect(caller(db, { dancerId: 'd1' }).communityGroup.create({ citySlug: 'munich', name: 'X', inviteUrl: 'https://chat.whatsapp.com/x' }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
