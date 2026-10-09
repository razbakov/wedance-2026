/**
 * Unit tests for Stripe webhook referral state transitions.
 *
 * Tests the extracted completeReferral / expireReferral helpers from
 * webhook.lib.ts using the same FakeDb pattern as referral.test.ts.
 */
import { describe, it, expect, vi } from 'vitest'
import { referrals } from '../../database/schema'

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
type FilterFn = (row: FakeRow) => boolean

class FakeDb {
  referrals: FakeRow[] = []

  seedReferral(row: FakeRow) {
    this.referrals.push({
      id: row.id ?? 'ref-' + this.referrals.length,
      festivalId: row.festivalId ?? 'fest-1',
      referrerId: row.referrerId ?? 'referrer-1',
      refereeId: row.refereeId ?? 'referee-1',
      discountCents: row.discountCents ?? 2100,
      stripeSessionId: row.stripeSessionId ?? null,
      status: row.status ?? 'pending',
      createdAt: new Date(),
      completedAt: null,
      ...row,
    })
  }

  update(table: any) {
    return {
      set: (patch: FakeRow) => ({
        where: (filter: FilterFn) => {
          for (const row of this.tableFor(table)) {
            if (filter(row)) Object.assign(row, patch)
          }
          return Promise.resolve()
        },
      }),
    }
  }

  private tableFor(table: any): FakeRow[] {
    if (table === referrals) return this.referrals
    throw new Error('FakeDb: unexpected table reference')
  }
}

// ---------- import under test ----------
import { completeReferral, expireReferral } from './webhook.lib'

// =====================================================================
// completeReferral
// =====================================================================

describe('completeReferral', () => {
  it('transitions a pending referral to completed', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_123', status: 'pending' })

    await completeReferral(db, 'cs_123')

    expect(db.referrals[0].status).toBe('completed')
    expect(db.referrals[0].completedAt).toBeInstanceOf(Date)
  })

  it('is idempotent — does not re-complete an already completed referral', async () => {
    const db = new FakeDb()
    const originalDate = new Date('2026-01-01')
    db.seedReferral({ stripeSessionId: 'cs_123', status: 'completed', completedAt: originalDate })

    await completeReferral(db, 'cs_123')

    // Status unchanged, completedAt not overwritten
    expect(db.referrals[0].status).toBe('completed')
    expect(db.referrals[0].completedAt).toBe(originalDate)
  })

  it('does not touch referrals for a different session', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_other', status: 'pending' })

    await completeReferral(db, 'cs_123')

    expect(db.referrals[0].status).toBe('pending')
  })

  it('does not touch an expired referral', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_123', status: 'expired' })

    await completeReferral(db, 'cs_123')

    expect(db.referrals[0].status).toBe('expired')
  })
})

// =====================================================================
// expireReferral
// =====================================================================

describe('expireReferral', () => {
  it('transitions a pending referral to expired', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_456', status: 'pending' })

    await expireReferral(db, 'cs_456')

    expect(db.referrals[0].status).toBe('expired')
  })

  it('is idempotent — does not re-expire an already expired referral', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_456', status: 'expired' })

    await expireReferral(db, 'cs_456')

    expect(db.referrals[0].status).toBe('expired')
  })

  it('does not expire a completed referral', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_456', status: 'completed' })

    await expireReferral(db, 'cs_456')

    expect(db.referrals[0].status).toBe('completed')
  })

  it('does not touch referrals for a different session', async () => {
    const db = new FakeDb()
    db.seedReferral({ stripeSessionId: 'cs_other', status: 'pending' })

    await expireReferral(db, 'cs_456')

    expect(db.referrals[0].status).toBe('pending')
  })
})
