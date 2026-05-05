/**
 * Unit tests for the magic-link claim router.
 *
 * Mirrors the hermetic FakeDb pattern PR 1 established in
 * server/api/webhooks/tickettailor.test.ts so the suite stays runnable without
 * a live Neon connection. The fake covers the drizzle-orm shapes the router
 * actually uses: select/from/where, update/set/where, plus eq/and/isNull and
 * inArray predicates.
 */
import { describe, it, expect, vi } from 'vitest'
import { dancers, festivals, festivalSignups } from '../../database/schema'

// ---------- mocks ----------
//
// drizzle-orm's `eq`, `and`, `isNull`, `inArray` return opaque tagged objects.
// Replace them with predicate-builders so FakeDb's `.where(filter)` can run a
// plain JS check against a row instead.

type FilterFn = (row: Record<string, any>) => boolean

vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) =>
    s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

  const resolveKey = (col: any): string | undefined => {
    const dbName: string | undefined = col?.name
    return dbName ? snakeToCamel(dbName) : undefined
  }

  const eq = (col: any, val: any): FilterFn => {
    const jsKey = resolveKey(col)
    return (row) => (jsKey ? row[jsKey] === val : false)
  }

  const and = (...preds: FilterFn[]): FilterFn => {
    return (row) => preds.every(p => p(row))
  }

  const isNull = (col: any): FilterFn => {
    const jsKey = resolveKey(col)
    return (row) => (jsKey ? row[jsKey] === null || row[jsKey] === undefined : false)
  }

  const inArray = (col: any, values: any[]): FilterFn => {
    const jsKey = resolveKey(col)
    const set = new Set(values)
    return (row) => (jsKey ? set.has(row[jsKey]) : false)
  }

  return { eq, and, isNull, inArray, sql: (..._args: any[]) => ({}), gt: () => () => false }
})

import { appRouter } from '../index'

// ---------- in-memory fake DB ----------

interface FakeRow { [k: string]: any }

class FakeDb {
  festivals: FakeRow[] = []
  dancers: FakeRow[] = []
  signups: FakeRow[] = []

  seedFestival(slug: string, name?: string, id?: string) {
    const fid = id ?? 'fest-' + slug
    this.festivals.push({ id: fid, slug, name: name ?? slug })
    return fid
  }

  seedDancer(email: string, id?: string) {
    const did = id ?? 'dancer-' + email
    this.dancers.push({ id: did, email })
    return did
  }

  seedStubSignup(festivalId: string, buyerEmail: string, opts: Partial<FakeRow> = {}) {
    const id = opts.id ?? 'sig-' + this.signups.length
    this.signups.push({
      id,
      festivalId,
      dancerId: null,
      paidAmount: 0,
      verifiedTicketHolder: true,
      tickettailorOrderId: opts.tickettailorOrderId ?? `or_${id}`,
      tickettailorBuyerEmail: buyerEmail,
      verifiedAt: new Date(),
      ...opts,
    })
    return id
  }

  seedLinkedSignup(festivalId: string, dancerId: string) {
    const id = 'sig-' + this.signups.length
    this.signups.push({
      id,
      festivalId,
      dancerId,
      paidAmount: 0,
      verifiedTicketHolder: false,
      tickettailorOrderId: null,
      tickettailorBuyerEmail: null,
      verifiedAt: null,
    })
    return id
  }

  // The router uses these shapes:
  //   db.select({...}).from(table).where(filter)             — array
  //   db.select({...}).from(table).where(filter).limit(N)    — array (used in getClaimStatus)
  //   db.update(table).set(patch).where(filter)              — void

  select(_columns: any) {
    return {
      from: (table: any) => {
        const rowsForTable = () => this.tableFor(table)
        const buildResult = (filter: FilterFn) => {
          const rows = rowsForTable().filter(filter)
          const promise: any = Promise.resolve(rows)
          // Mimic drizzle's chainable .limit(): returns a thenable filtered to N.
          promise.limit = (n: number) => Promise.resolve(rows.slice(0, n))
          return promise
        }
        return {
          where: (filter: FilterFn) => buildResult(filter),
        }
      },
    }
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
    if (table === festivals) return this.festivals
    if (table === dancers) return this.dancers
    if (table === festivalSignups) return this.signups
    throw new Error('unexpected table in FakeDb')
  }
}

// drizzle-orm's chained `.where(...).limit(n)` needs an awaitable that exposes
// `.limit`. The FakeDb above returns a Promise with a `.limit` property, but
// drizzle's real query builder returns the limited rows directly when you
// `.limit().then(...)`. Our select() is wired to support both:
//   - `await q` resolves to the unfiltered (just-where'd) rows
//   - `await q.limit(n)` resolves to the first n
//
// The router only uses .limit(1) once (getClaimStatus). All other calls await
// the where directly.

function createCaller(db: any, opts: { dancerId?: string; isAdmin?: boolean } = {}) {
  return appRouter.createCaller({
    db,
    dancerId: opts.dancerId ?? null,
    isAdmin: opts.isAdmin ?? false,
  })
}

const CHARANGA_SLUG = 'charanga-habanera-munich-2026'
const CHARANGA_NAME = 'Charanga Habanera Munich 2026'

// ---------- claimMyTicketHolderRows ----------

describe('claim.claimMyTicketHolderRows', () => {
  it('returns claimed:0 with no festivals when there are no stubs', async () => {
    const db = new FakeDb()
    db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const dancerId = db.seedDancer('lonely@example.com')

    const caller = createCaller(db as any, { dancerId })
    const result = await caller.claim.claimMyTicketHolderRows()

    expect(result).toEqual({ claimed: 0, festivals: [] })
  })

  it('claims a single stub row matching the user email', async () => {
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const dancerId = db.seedDancer('buyer@example.com')
    const stubId = db.seedStubSignup(festivalId, 'buyer@example.com')

    const caller = createCaller(db as any, { dancerId })
    const result = await caller.claim.claimMyTicketHolderRows()

    expect(result.claimed).toBe(1)
    expect(result.festivals).toEqual([{ slug: CHARANGA_SLUG, name: CHARANGA_NAME }])
    const updated = db.signups.find(s => s.id === stubId)
    expect(updated?.dancerId).toBe(dancerId)
  })

  it('is idempotent — re-running after a successful claim returns 0', async () => {
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const dancerId = db.seedDancer('buyer@example.com')
    db.seedStubSignup(festivalId, 'buyer@example.com')

    const caller = createCaller(db as any, { dancerId })
    const first = await caller.claim.claimMyTicketHolderRows()
    const second = await caller.claim.claimMyTicketHolderRows()

    expect(first.claimed).toBe(1)
    expect(second.claimed).toBe(0)
    expect(second.festivals).toEqual([])
  })

  it('claims multiple stubs across different festivals in one call', async () => {
    const db = new FakeDb()
    const charangaId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const otherId = db.seedFestival('cuban-fire-munich-2026', 'Cuban Fire')
    const dancerId = db.seedDancer('multi@example.com')
    db.seedStubSignup(charangaId, 'multi@example.com', { tickettailorOrderId: 'or_a' })
    db.seedStubSignup(otherId, 'multi@example.com', { tickettailorOrderId: 'or_b' })

    const caller = createCaller(db as any, { dancerId })
    const result = await caller.claim.claimMyTicketHolderRows()

    expect(result.claimed).toBe(2)
    expect(result.festivals).toHaveLength(2)
    const slugs = result.festivals.map(f => f.slug).sort()
    expect(slugs).toEqual(['charanga-habanera-munich-2026', 'cuban-fire-munich-2026'])
    // Both stubs now point at the dancer.
    expect(db.signups.every(s => s.dancerId === dancerId)).toBe(true)
  })

  it('email lookup is case-insensitive (stubs stored lowercase, dancer email mixed-case)', async () => {
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    // dancer email stored mixed-case; webhook stores buyer email lowercased.
    const dancerId = db.seedDancer('Buyer@Example.COM')
    db.seedStubSignup(festivalId, 'buyer@example.com')

    const caller = createCaller(db as any, { dancerId })
    const result = await caller.claim.claimMyTicketHolderRows()

    expect(result.claimed).toBe(1)
  })

  it('skips stubs for festivals where the dancer already has a signup row', async () => {
    // Edge case: same buyer free-joined the festival before buying a ticket.
    // The free join created a (festival_id, dancer_id) row; the webhook then
    // landed a stub. Linking the stub naively would violate the unique
    // constraint. We skip those stubs (the existing row remains; PR 1's
    // promote-existing path already covers same-email-known-dancer cases).
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const dancerId = db.seedDancer('overlap@example.com')
    db.seedLinkedSignup(festivalId, dancerId) // existing free signup
    db.seedStubSignup(festivalId, 'overlap@example.com') // stub from webhook

    const caller = createCaller(db as any, { dancerId })
    const result = await caller.claim.claimMyTicketHolderRows()

    expect(result.claimed).toBe(0)
    expect(result.festivals).toEqual([])
  })

  it('rejects unauthenticated callers', async () => {
    const db = new FakeDb()
    const caller = createCaller(db as any, {})
    await expect(caller.claim.claimMyTicketHolderRows()).rejects.toThrow(/Not signed in/)
  })
})

// ---------- getClaimStatus ----------

describe('claim.getClaimStatus', () => {
  it('returns pending:false when no email provided', async () => {
    const db = new FakeDb()
    const caller = createCaller(db as any)
    const result = await caller.claim.getClaimStatus({})
    expect(result).toEqual({ pending: false })
  })

  it('returns pending:false when the email has no matching stub', async () => {
    const db = new FakeDb()
    db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const caller = createCaller(db as any)

    const result = await caller.claim.getClaimStatus({ email: 'noone@example.com' })
    expect(result).toEqual({ pending: false })
  })

  it('returns pending:true with festival info when a stub exists for the email', async () => {
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    db.seedStubSignup(festivalId, 'pending@example.com')

    const caller = createCaller(db as any)
    const result = await caller.claim.getClaimStatus({ email: 'pending@example.com' })

    expect(result).toEqual({
      pending: true,
      festivalSlug: CHARANGA_SLUG,
      festivalName: CHARANGA_NAME,
    })
  })

  it('email lookup is case-insensitive (URL email may be capitalised)', async () => {
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    db.seedStubSignup(festivalId, 'mixed@example.com')

    const caller = createCaller(db as any)
    const result = await caller.claim.getClaimStatus({ email: 'Mixed@Example.COM' })

    expect(result.pending).toBe(true)
  })

  it('does not flag emails that are already linked (dancer_id IS NOT NULL)', async () => {
    const db = new FakeDb()
    const festivalId = db.seedFestival(CHARANGA_SLUG, CHARANGA_NAME)
    const dancerId = db.seedDancer('claimed@example.com')
    // Already-claimed row: stub email present but dancerId set.
    db.signups.push({
      id: 'sig-claimed',
      festivalId,
      dancerId,
      verifiedTicketHolder: true,
      tickettailorOrderId: 'or_claimed',
      tickettailorBuyerEmail: 'claimed@example.com',
      verifiedAt: new Date(),
    })

    const caller = createCaller(db as any)
    const result = await caller.claim.getClaimStatus({ email: 'claimed@example.com' })

    expect(result).toEqual({ pending: false })
  })
})
