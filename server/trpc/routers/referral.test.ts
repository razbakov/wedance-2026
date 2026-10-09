/**
 * Unit tests for the referral router: validate + myReferrals.
 *
 * Hermetic — same FakeDb pattern as festivalSignup.test.ts.
 */
import { describe, it, expect, vi } from 'vitest'
import { dancers, festivals, referrals } from '../../database/schema'

// ---------- drizzle mocks ----------
vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) =>
    s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

  const eq = (col: any, val: any) => {
    const dbName: string | undefined = col?.name
    const jsKey = dbName ? snakeToCamel(dbName) : undefined
    return (row: Record<string, any>) => {
      if (jsKey && Object.prototype.hasOwnProperty.call(row, jsKey)) {
        return row[jsKey] === val
      }
      if (dbName && Object.prototype.hasOwnProperty.call(row, dbName)) {
        return row[dbName] === val
      }
      return false
    }
  }

  const and = (...preds: any[]) => {
    return (row: Record<string, any>) => preds.every(p => p(row))
  }

  return { eq, and, sql: (..._args: any[]) => ({}) }
})

// ---------- FakeDb ----------

interface FakeRow { [k: string]: any }

class FakeDb {
  festivals: FakeRow[] = []
  dancers: FakeRow[] = []
  referrals: FakeRow[] = []

  seedFestival(slug: string, id = 'fest-' + slug) {
    this.festivals.push({ id, slug, name: slug })
    return id
  }

  seedDancer(opts: { id?: string; email?: string; name?: string; username?: string | null }) {
    const id = opts.id ?? 'dancer-' + this.dancers.length
    this.dancers.push({
      id,
      email: opts.email ?? `${id}@example.com`,
      name: opts.name ?? 'Dancer ' + id,
      username: opts.username ?? null,
    })
    return id
  }

  seedReferral(row: FakeRow) {
    this.referrals.push({
      id: row.id ?? 'ref-' + this.referrals.length,
      discountCents: 0,
      stripeSessionId: null,
      status: 'pending',
      createdAt: new Date(),
      completedAt: null,
      ...row,
    })
  }

  select(_columns: any) {
    const self = this
    return {
      from: (table: any) => {
        const baseRows = () => self.tableFor(table).map(r => ({ ...r }))
        return {
          where: (filter: (r: FakeRow) => boolean) => {
            return Promise.resolve(baseRows().filter(filter))
          },
        }
      },
    }
  }

  private tableFor(table: any): FakeRow[] {
    if (table === festivals) return this.festivals
    if (table === dancers) return this.dancers
    if (table === referrals) return this.referrals
    throw new Error('FakeDb: unexpected table reference')
  }
}

// ---------- stub useRuntimeConfig ----------
;(globalThis as any).useRuntimeConfig = () => ({ stripeSecretKey: 'sk_test_dummy', siteUrl: 'http://test' })

// ---------- caller ----------
import { referralRouter } from './referral'
import { router } from '../trpc'

const appRouter = router({ referral: referralRouter })

function makeCaller(db: FakeDb, opts: { dancerId?: string } = {}) {
  return appRouter.createCaller({
    db: db as any,
    dancerId: opts.dancerId ?? null,
    isAdmin: false,
  })
}

// =====================================================================
// referral.validate
// =====================================================================

describe('referral.validate', () => {
  it('returns null for a festival with no referral program', async () => {
    const db = new FakeDb()
    db.seedFestival('no-referral-fest')
    db.seedDancer({ id: 'ref-1', username: 'alice' })

    const caller = makeCaller(db)
    const result = await caller.referral.validate({
      festivalSlug: 'no-referral-fest',
      referralCode: 'alice',
    })
    expect(result).toBeNull()
  })

  it('returns referrer info when code matches a username', async () => {
    const db = new FakeDb()
    db.seedFestival('meneate-viena-2026')
    db.seedDancer({ id: 'ref-1', name: 'Alice Dancer', username: 'alice' })

    const caller = makeCaller(db)
    const result = await caller.referral.validate({
      festivalSlug: 'meneate-viena-2026',
      referralCode: 'alice',
    })
    expect(result).toEqual({
      referrerName: 'Alice Dancer',
      referrerUsername: 'alice',
      discountPercent: 10,
    })
  })

  it('returns referrer info when code matches a dancer ID', async () => {
    const db = new FakeDb()
    const dancerId = '123e4567-e89b-12d3-a456-426614174000'
    db.seedFestival('meneate-viena-2026')
    db.seedDancer({ id: dancerId, name: 'Bob', username: null })

    const caller = makeCaller(db)
    const result = await caller.referral.validate({
      festivalSlug: 'meneate-viena-2026',
      referralCode: dancerId,
    })
    expect(result).toEqual({
      referrerName: 'Bob',
      referrerUsername: null,
      discountPercent: 10,
    })
  })

  it('returns null for an unknown referral code', async () => {
    const db = new FakeDb()
    db.seedFestival('meneate-viena-2026')

    const caller = makeCaller(db)
    const result = await caller.referral.validate({
      festivalSlug: 'meneate-viena-2026',
      referralCode: 'nonexistent',
    })
    expect(result).toBeNull()
  })

  it('works without authentication (public procedure)', async () => {
    const db = new FakeDb()
    db.seedFestival('meneate-viena-2026')
    db.seedDancer({ id: 'ref-1', name: 'Charlie', username: 'charlie' })

    const caller = makeCaller(db) // no dancerId
    const result = await caller.referral.validate({
      festivalSlug: 'meneate-viena-2026',
      referralCode: 'charlie',
    })
    expect(result).not.toBeNull()
    expect(result!.referrerName).toBe('Charlie')
  })
})

// =====================================================================
// referral.myReferrals
// =====================================================================

describe('referral.myReferrals', () => {
  it('returns empty array when not authenticated', async () => {
    const db = new FakeDb()
    const caller = makeCaller(db)
    const result = await caller.referral.myReferrals()
    expect(result).toEqual([])
  })

  it('returns referrals for the authenticated dancer', async () => {
    const db = new FakeDb()
    const festId = db.seedFestival('meneate-viena-2026')
    const me = db.seedDancer({ name: 'Me', username: 'me' })
    const other = db.seedDancer({ name: 'Other' })
    db.seedReferral({ festivalId: festId, referrerId: me, refereeId: other, discountCents: 2100, status: 'completed' })

    const caller = makeCaller(db, { dancerId: me })
    const result = await caller.referral.myReferrals()
    expect(result).toHaveLength(1)
    expect(result[0].discountCents).toBe(2100)
    expect(result[0].status).toBe('completed')
  })

  it('does not return referrals where the dancer is the referee', async () => {
    const db = new FakeDb()
    const festId = db.seedFestival('meneate-viena-2026')
    const me = db.seedDancer({ name: 'Me', username: 'me' })
    const referrer = db.seedDancer({ name: 'Referrer' })
    // I was referred by someone else — this should NOT show up in myReferrals
    db.seedReferral({ festivalId: festId, referrerId: referrer, refereeId: me, discountCents: 2100 })

    const caller = makeCaller(db, { dancerId: me })
    const result = await caller.referral.myReferrals()
    expect(result).toEqual([])
  })
})
