/**
 * Unit tests for the onboarding quest machine.
 *
 * Mirrors server/api/webhooks/tickettailor.test.ts: exercises the pure lib
 * against a lightweight in-memory FakeDb that mimics the slice of the drizzle
 * query builder the lib uses. Hermetic — no Neon round-trip to run `bun run test`.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  checkSecret,
  buildInitialQuest,
  allCujGreen,
  toSafeCandidate,
  createCandidate,
  getCandidate,
  recordAdvance,
  recordCuj,
  CUJ_EVENTS,
} from './onboarding.lib'
import { onboardingCandidates } from '../../database/schema'

// ---------- mocks ----------
// Replace drizzle-orm's `eq` with a predicate-builder so the FakeDb's
// `.where(filter)` receives a plain function instead of an opaque SQL object.
// (Same trick as the tickettailor test.)
type FilterFn = (row: FakeRow) => boolean
vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  const eq = (col: any, val: any): FilterFn => {
    const dbName: string | undefined = col?.name
    const jsKey = dbName ? snakeToCamel(dbName) : undefined
    return (row: FakeRow) => {
      if (jsKey && Object.prototype.hasOwnProperty.call(row, jsKey)) return row[jsKey] === val
      if (dbName && Object.prototype.hasOwnProperty.call(row, dbName)) return row[dbName] === val
      return false
    }
  }
  const and = (...preds: FilterFn[]): FilterFn => (row: FakeRow) => preds.every(p => p(row))
  return { eq, and, sql: (..._args: any[]) => ({}) }
})

// ---------- in-memory fake DB ----------
interface FakeRow { [k: string]: any }

let idCounter = 0

class FakeDb {
  candidates: FakeRow[] = []

  select(_columns?: any) {
    return {
      from: (_table: any) => ({
        where: (filter: FilterFn) => Promise.resolve(this.candidates.filter(filter)),
      }),
    }
  }

  insert(_table: any) {
    return {
      values: (vals: FakeRow) => ({
        returning: (_cols?: any) => {
          const row = { id: 'cand-' + (++idCounter), ...vals }
          this.candidates.push(row)
          return Promise.resolve([row])
        },
      }),
    }
  }

  update(_table: any) {
    return {
      set: (patch: FakeRow) => ({
        where: (filter: FilterFn) => ({
          returning: (_cols?: any) => {
            const updated: FakeRow[] = []
            for (const row of this.candidates) {
              if (filter(row)) {
                Object.assign(row, patch)
                updated.push(row)
              }
            }
            return Promise.resolve(updated)
          },
        }),
      }),
    }
  }
}

// ---------- checkSecret ----------

describe('checkSecret', () => {
  it('accepts an exact match', () => {
    expect(checkSecret('s3cr3t-value', 's3cr3t-value')).toBe(true)
  })
  it('rejects a mismatch', () => {
    expect(checkSecret('wrong', 's3cr3t-value')).toBe(false)
  })
  it('fails closed when expected secret is empty', () => {
    expect(checkSecret('anything', '')).toBe(false)
  })
  it('fails closed when provided secret is empty', () => {
    expect(checkSecret('', 's3cr3t-value')).toBe(false)
  })
  it('rejects a differing length without throwing', () => {
    expect(checkSecret('short', 'a-much-longer-secret')).toBe(false)
  })
})

// ---------- quest helpers ----------

describe('buildInitialQuest + allCujGreen', () => {
  it('starts all 13 events pending', () => {
    const q = buildInitialQuest()
    expect(Object.keys(q.cuj_events)).toHaveLength(13)
    expect(Object.values(q.cuj_events).every(s => s === 'pending')).toBe(true)
    expect(allCujGreen(q)).toBe(false)
  })
  it('is green only when every event is green', () => {
    const q = buildInitialQuest()
    for (const e of CUJ_EVENTS) q.cuj_events[e] = 'green'
    expect(allCujGreen(q)).toBe(true)
    q.cuj_events[CUJ_EVENTS[0]] = 'red'
    expect(allCujGreen(q)).toBe(false)
  })
})

describe('toSafeCandidate', () => {
  it('drops email and telegramId', () => {
    const safe = toSafeCandidate({
      id: 'x', name: 'Alex', email: 'a@b.com', telegramId: '12345', role: 'organizer',
      level: 2, quest: buildInitialQuest(), accessGranted: false, history: [],
    })
    expect(safe).toEqual({ id: 'x', name: 'Alex', level: 2, quest: buildInitialQuest(), accessGranted: false })
    expect('email' in safe).toBe(false)
    expect('telegramId' in safe).toBe(false)
  })
})

// ---------- createCandidate ----------

describe('createCandidate', () => {
  it('inserts a level-0 candidate with an all-pending quest', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Maya', email: 'm@x.com', telegramId: '999', role: 'dancer' })
    expect(c.level).toBe(0)
    expect(c.accessGranted).toBe(false)
    expect(Object.keys(c.quest!.cuj_events)).toHaveLength(13)
    expect(allCujGreen(c.quest)).toBe(false)
    expect(Array.isArray(c.history)).toBe(true)
    expect(c.history).toHaveLength(0)
    expect(db.candidates).toHaveLength(1)
    // Public projection never leaks PII.
    expect('email' in toSafeCandidate(c)).toBe(false)
  })

  it('stores null for optional fields when omitted', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Solo' })
    expect(c.email).toBeNull()
    expect(c.telegramId).toBeNull()
    expect(c.role).toBeNull()
  })
})

// ---------- getCandidate ----------

describe('getCandidate', () => {
  it('returns null for an unknown id', async () => {
    const db = new FakeDb()
    expect(await getCandidate(db as any, 'nope')).toBeNull()
  })
  it('returns the row for a known id', async () => {
    const db = new FakeDb()
    const created = await createCandidate(db as any, { name: 'Find Me' })
    const found = await getCandidate(db as any, created.id)
    expect(found?.name).toBe('Find Me')
  })
})

// ---------- recordAdvance ----------

describe('recordAdvance', () => {
  it('appends to history and sets the level', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Climber' })
    const updated = await recordAdvance(db as any, c.id, { event: 'call_booked', level: 2, data: { slot: '18:00' } })
    expect(updated?.level).toBe(2)
    expect(updated?.history).toHaveLength(1)
    expect(updated?.history?.[0]).toMatchObject({ event: 'call_booked', data: { slot: '18:00' } })
    expect(typeof updated?.history?.[0]?.at).toBe('string')
  })

  it('appends without touching the level when none is given', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Stayer' })
    const updated = await recordAdvance(db as any, c.id, { event: 'read_map' })
    expect(updated?.level).toBe(0)
    expect(updated?.history).toHaveLength(1)
  })

  it('returns null for an unknown candidate', async () => {
    const db = new FakeDb()
    expect(await recordAdvance(db as any, 'ghost', { event: 'x' })).toBeNull()
  })
})

// ---------- recordCuj ----------

describe('recordCuj', () => {
  it('sets a single event green without flipping the level early', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Grinder' })
    const res = await recordCuj(db as any, c.id, { event: 'week_plan_add', status: 'green' })
    expect(res?.allGreen).toBe(false)
    expect(res?.candidate.quest?.cuj_events.week_plan_add).toBe('green')
    expect(res?.candidate.level).toBe(0)
  })

  it('records a red status', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Failer' })
    const res = await recordCuj(db as any, c.id, { event: 'video_vote', status: 'red' })
    expect(res?.candidate.quest?.cuj_events.video_vote).toBe('red')
    expect(res?.allGreen).toBe(false)
  })

  it('flips the candidate to level 4 once all 13 events are green', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Boss Slayer' })
    let res
    for (const e of CUJ_EVENTS) {
      res = await recordCuj(db as any, c.id, { event: e, status: 'green' })
    }
    expect(res?.allGreen).toBe(true)
    expect(res?.candidate.level).toBe(4)
  })

  it('rejects an unknown event name (returns null)', async () => {
    const db = new FakeDb()
    const c = await createCandidate(db as any, { name: 'Typo' })
    expect(await recordCuj(db as any, c.id, { event: 'not_a_real_event', status: 'green' })).toBeNull()
  })

  it('returns null for an unknown candidate', async () => {
    const db = new FakeDb()
    expect(await recordCuj(db as any, 'ghost', { event: 'week_plan_add', status: 'green' })).toBeNull()
  })
})
