/**
 * Unit tests for the email+password auth router (login + register).
 *
 * Follows the hermetic FakeDb pattern established in claim.test.ts so the suite
 * runs without a live Neon connection. FirebaseScrypt is real here — we don't
 * mock it — so the register→login round-trip actually exercises the same
 * hashing that legacy wedance-v4 users rely on. The Firebase env params are set
 * in beforeAll; any non-empty signer key works for the round-trip since verify
 * uses the same params that hash used.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { dancers, sessions } from '../../database/schema'

// ---------- mocks ----------
// drizzle-orm's `eq` returns an opaque tagged object; replace it with a
// predicate-builder so FakeDb's `.where(filter)` can run a plain JS check.

type FilterFn = (row: Record<string, any>) => boolean

vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) =>
    s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())

  const resolveKey = (col: any): string | undefined => {
    const dbName: string | undefined = col?.name
    return dbName ? snakeToCamel(dbName) : undefined
  }

  const eq = (col: any, val: any): FilterFn => {
    const jsKey = resolveKey(col)
    return (row) => (jsKey ? row[jsKey] === val : false)
  }

  const and = (...preds: FilterFn[]): FilterFn => (row) => preds.every(p => p(row))

  return { eq, and, gt: () => () => false, sql: (..._args: any[]) => ({}) }
})

import { appRouter } from '../index'

// ---------- in-memory fake DB ----------

interface FakeRow { [k: string]: any }

class FakeDb {
  dancers: FakeRow[] = []
  sessions: FakeRow[] = []

  seedDancer(row: Partial<FakeRow> & { email: string }) {
    const id = row.id ?? 'dancer-' + this.dancers.length
    const full: FakeRow = {
      id,
      name: row.name ?? 'Test Dancer',
      isAdmin: row.isAdmin ?? false,
      salt: row.salt ?? '',
      hash: row.hash ?? '',
      danceStyles: row.danceStyles ?? [],
      role: row.role ?? null,
      city: row.city ?? null,
      ...row,
    }
    this.dancers.push(full)
    return id
  }

  select(_columns: any) {
    return {
      from: (table: any) => ({
        where: (filter: FilterFn) => Promise.resolve(this.tableFor(table).filter(filter)),
      }),
    }
  }

  insert(table: any) {
    return {
      values: (row: FakeRow) => {
        // Emulate the unique constraint on dancers.email: throw a Postgres
        // 23505-shaped error the router's catch block understands.
        if (table === dancers && this.dancers.some(d => d.email === row.email)) {
          const err: any = new Error('duplicate key value violates unique constraint')
          err.code = '23505'
          throw err
        }
        const id = row.id ?? (table === dancers ? 'dancer-' : 'session-') + this.tableFor(table).length
        const inserted = { id, ...row }
        this.tableFor(table).push(inserted)
        const chain: any = Promise.resolve(undefined)
        chain.returning = (_cols: any) => Promise.resolve([inserted])
        return chain
      },
    }
  }

  private tableFor(table: any): FakeRow[] {
    if (table === dancers) return this.dancers
    if (table === sessions) return this.sessions
    throw new Error('unexpected table in FakeDb')
  }
}

function createCaller(db: any) {
  return appRouter.createCaller({ db, dancerId: null, isAdmin: false })
}

beforeAll(() => {
  // Any consistent, non-empty params make the hash→verify round-trip valid.
  process.env.FIREBASE_SALT_SEPARATOR = 'Bw=='
  process.env.FIREBASE_SIGNER_KEY = 'test-signer-key-for-unit-tests-only'
})

// ---------- register ----------

describe('auth.register', () => {
  it('creates a dancer with a salt + hash and returns a session', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    const result = await caller.auth.register({
      name: 'Ada Lovelace',
      email: 'Ada@Example.COM',
      password: 'supersecret',
    })

    expect(result.name).toBe('Ada Lovelace')
    expect(result.sessionToken).toBeTruthy()
    expect(result.dancerId).toBeTruthy()

    const row = db.dancers[0]
    // Email is normalised to lowercase.
    expect(row.email).toBe('ada@example.com')
    // Salt + hash were generated (not the empty-string defaults).
    expect(row.salt).toBeTruthy()
    expect(row.hash).toBeTruthy()
    expect(row.hash).not.toBe('supersecret')
    // A session row was minted.
    expect(db.sessions).toHaveLength(1)
    expect(db.sessions[0].token).toBe(result.sessionToken)
  })

  it('preserves onboarding fields (danceStyles / role / city)', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    await caller.auth.register({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'password123',
      danceStyles: ['Salsa', 'Bachata'],
      role: 'follow',
      city: 'Munich',
    })

    const row = db.dancers[0]
    expect(row.danceStyles).toEqual(['Salsa', 'Bachata'])
    expect(row.role).toBe('follow')
    expect(row.city).toBe('Munich')
  })

  it('rejects a duplicate email with a clean message', async () => {
    const db = new FakeDb()
    db.seedDancer({ email: 'taken@example.com' })
    const caller = createCaller(db)

    await expect(
      caller.auth.register({
        name: 'Someone',
        email: 'taken@example.com',
        password: 'password123',
      }),
    ).rejects.toThrow(/Email already in use/)
  })

  it('rejects a short password (< 8 chars)', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    await expect(
      caller.auth.register({
        name: 'Shorty',
        email: 'short@example.com',
        password: 'abc',
      }),
    ).rejects.toThrow()
  })
})

// ---------- login ----------

describe('auth.login', () => {
  it('succeeds with the correct password (round-trips against register)', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    await caller.auth.register({
      name: 'Login User',
      email: 'login@example.com',
      password: 'correct-horse',
    })
    const sessionsBefore = db.sessions.length

    const result = await caller.auth.login({
      email: 'login@example.com',
      password: 'correct-horse',
    })

    expect(result.name).toBe('Login User')
    expect(result.sessionToken).toBeTruthy()
    // A second session row was minted by login.
    expect(db.sessions.length).toBe(sessionsBefore + 1)
  })

  it('is case-insensitive on the email (login email may be capitalised)', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    await caller.auth.register({
      name: 'Case User',
      email: 'case@example.com',
      password: 'password123',
    })

    const result = await caller.auth.login({
      email: 'CASE@EXAMPLE.COM',
      password: 'password123',
    })
    expect(result.name).toBe('Case User')
  })

  it('fails with the wrong password and does not mint a session', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    await caller.auth.register({
      name: 'Wrong Pass',
      email: 'wrong@example.com',
      password: 'correct-password',
    })
    const sessionsBefore = db.sessions.length

    await expect(
      caller.auth.login({ email: 'wrong@example.com', password: 'not-the-password' }),
    ).rejects.toThrow(/Invalid email or password/)
    expect(db.sessions.length).toBe(sessionsBefore)
  })

  it('fails for an unknown email with the same generic error (no user enumeration)', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)

    await expect(
      caller.auth.login({ email: 'ghost@example.com', password: 'whatever123' }),
    ).rejects.toThrow(/Invalid email or password/)
  })

  it('fails for a dancer that has no password set (magic-link-only account)', async () => {
    const db = new FakeDb()
    // Seeded with empty salt/hash — e.g. created via the festival/magic-link flow.
    db.seedDancer({ email: 'passwordless@example.com', salt: '', hash: '' })
    const caller = createCaller(db)

    await expect(
      caller.auth.login({ email: 'passwordless@example.com', password: 'anything123' }),
    ).rejects.toThrow(/Invalid email or password/)
  })
})
