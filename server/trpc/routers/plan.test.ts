/**
 * Unit tests for the plan router (add / listDetailed / remove).
 *
 * Hermetic — no DATABASE_URL required. Uses an in-memory FakeDb that
 * mirrors just enough of the Drizzle query builder to exercise the plan
 * procedures. Regression test for RAZ-265 (goals not persisted because
 * the metadata column was missing).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { planItems } from '../../database/schema'

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

  const and = (...preds: any[]) => (row: Record<string, any>) =>
    preds.every(p => p(row))

  return { eq, and, sql: (..._args: any[]) => ({}), unique: () => ({}), index: () => ({}) }
})

// ---------- FakeDb ----------

interface FakeRow { [k: string]: any }

class FakeDb {
  rows: FakeRow[] = []

  select(columns: any) {
    const self = this
    const isSqlCount = columns && typeof columns === 'object' && 'count' in columns
    return {
      from: (_table: any) => ({
        where: (filter: (r: FakeRow) => boolean) => {
          const matched = self.rows.filter(filter)
          if (isSqlCount) {
            return Promise.resolve([{ count: matched.length }])
          }
          // Project only the requested columns
          return Promise.resolve(
            matched.map(r => {
              const out: any = {}
              for (const key of Object.keys(columns)) {
                const col = columns[key]
                const dbName: string | undefined = col?.name
                const jsKey = dbName
                  ? dbName.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
                  : key
                out[key] = r[jsKey]
              }
              return out
            }),
          )
        },
      }),
    }
  }

  insert(_table: any) {
    const self = this
    return {
      values: (row: FakeRow) => ({
        onConflictDoNothing: () => {
          // Check unique constraint (dancerId, itemType, itemId)
          const exists = self.rows.some(
            r =>
              r.dancerId === row.dancerId &&
              r.itemType === row.itemType &&
              r.itemId === row.itemId,
          )
          if (!exists) {
            self.rows.push({
              id: `id-${self.rows.length}`,
              createdAt: new Date(),
              ...row,
            })
          }
          return Promise.resolve()
        },
      }),
    }
  }

  delete(_table: any) {
    const self = this
    return {
      where: (filter: (r: FakeRow) => boolean) => {
        self.rows = self.rows.filter(r => !filter(r))
        return Promise.resolve()
      },
    }
  }
}

// ---------- router under test ----------

// `useRuntimeConfig` is used by the db util — stub it so the import chain
// doesn't blow up even though we never hit a real DB.
;(globalThis as any).useRuntimeConfig = () => ({ databaseUrl: '' })

import { planRouter } from './plan'
import { router } from '../trpc'

const appRouter = router({ plan: planRouter })

function makeCaller(db: FakeDb, dancerId: string | null = 'dancer-1') {
  return appRouter.createCaller({ db: db as any, dancerId, isAdmin: false })
}

describe('plan router', () => {
  let db: FakeDb

  beforeEach(() => {
    db = new FakeDb()
  })

  describe('add + listDetailed (RAZ-265)', () => {
    it('persists a goal with metadata and retrieves it', async () => {
      const caller = makeCaller(db)

      await caller.plan.add({
        itemType: 'goal',
        itemId: 'goal-test-1',
        metadata: { title: 'Learn timba', why: 'Feel at home in rueda', progress: '0' },
      })

      const rows = await caller.plan.listDetailed()
      const goals = rows.filter(r => r.itemType === 'goal')

      expect(goals).toHaveLength(1)
      expect(goals[0].itemId).toBe('goal-test-1')
      expect(goals[0].metadata).toEqual({
        title: 'Learn timba',
        why: 'Feel at home in rueda',
        progress: '0',
      })
    })

    it('does not duplicate on conflict', async () => {
      const caller = makeCaller(db)

      await caller.plan.add({ itemType: 'goal', itemId: 'goal-dup', metadata: { title: 'A', why: '', progress: '0' } })
      await caller.plan.add({ itemType: 'goal', itemId: 'goal-dup', metadata: { title: 'B', why: '', progress: '0' } })

      const rows = await caller.plan.listDetailed()
      expect(rows.filter(r => r.itemType === 'goal')).toHaveLength(1)
    })
  })

  describe('remove', () => {
    it('removes a goal by itemId', async () => {
      const caller = makeCaller(db)

      await caller.plan.add({ itemType: 'goal', itemId: 'goal-rm', metadata: { title: 'X', why: '', progress: '0' } })
      expect((await caller.plan.listDetailed()).filter(r => r.itemType === 'goal')).toHaveLength(1)

      await caller.plan.remove({ itemType: 'goal', itemId: 'goal-rm' })
      expect((await caller.plan.listDetailed()).filter(r => r.itemType === 'goal')).toHaveLength(0)
    })
  })

  describe('count', () => {
    it('returns the count for a specific item', async () => {
      const caller = makeCaller(db)

      await caller.plan.add({ itemType: 'goal', itemId: 'goal-cnt' })
      const c = await caller.plan.count({ itemType: 'goal', itemId: 'goal-cnt' })
      expect(c).toBe(1)
    })
  })

  describe('auth guard', () => {
    it('rejects unauthenticated calls', async () => {
      const caller = makeCaller(db, null)
      await expect(caller.plan.listDetailed()).rejects.toThrow('Not signed in')
    })
  })
})
