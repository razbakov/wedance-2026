/**
 * Tests for communityGroup router: listByCity, create, report
 */
import { describe, it, expect, vi } from 'vitest'
import { communityGroups, communityGroupReports } from '../../database/schema'

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
  communityGroups: FakeRow[] = []
  reports: FakeRow[] = []

  select(_c: any) {
    return {
      from: (t: any) => ({
        where: (f: FilterFn) => Promise.resolve(this.tableFor(t).filter(f)),
      }),
    }
  }

  insert(t: any) {
    return {
      values: (row: FakeRow) => {
        const table = this.tableFor(t)
        const id = row.id ?? 'row-' + table.length
        const inserted = { id, createdAt: new Date(), ...row }
        if (t === communityGroups) {
          Object.assign(inserted, { status: 'visible', reportCount: 0, ...row })
        }
        table.push(inserted)
        const chain: any = Promise.resolve(undefined)
        chain.returning = () => Promise.resolve([inserted])
        return chain
      },
    }
  }

  update(t: any) {
    return {
      set: (_fields: FakeRow) => {
        return {
          where: (f: FilterFn) => {
            const rows = this.tableFor(t).filter(f)
            // Simulate the atomic increment + status flip
            rows.forEach((row) => {
              row.reportCount = (row.reportCount || 0) + 1
              row.status = row.reportCount >= 3 ? 'hidden' : 'visible'
            })
            return {
              returning: () => Promise.resolve(rows.map(r => ({
                reportCount: r.reportCount,
                status: r.status,
              }))),
            }
          },
        }
      },
    }
  }

  private tableFor(t: any) {
    if (t === communityGroupReports) return this.reports
    return this.communityGroups
  }
}

describe('communityGroup router', () => {
  it('listByCity: returns only visible groups', async () => {
    const db = new FakeDb()
    db.communityGroups = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        citySlug: 'munich',
        name: 'Salsa Munich',
        platform: 'whatsapp',
        inviteUrl: 'https://chat.whatsapp.com/abc',
        styles: ['salsa'],
        verified: true,
        status: 'visible',
        reportCount: 0,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        citySlug: 'munich',
        name: 'Hidden Group',
        platform: 'telegram',
        inviteUrl: 'https://t.me/hidden',
        styles: [],
        verified: false,
        status: 'hidden',
        reportCount: 5,
      },
    ]

    const caller = appRouter.createCaller({ db: db as any, dancerId: null, isAdmin: false })
    const result = await caller.communityGroup.listByCity({ citySlug: 'munich' })

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Salsa Munich')
  })

  it('report: requires authentication', async () => {
    const db = new FakeDb()
    const groupId = '550e8400-e29b-41d4-a716-446655440001'
    db.communityGroups = [
      { id: groupId, citySlug: 'munich', name: 'G', platform: 'whatsapp', inviteUrl: 'https://example.com', styles: [], verified: false, status: 'visible', reportCount: 0 },
    ]

    const caller = appRouter.createCaller({ db: db as any, dancerId: null, isAdmin: false })
    await expect(caller.communityGroup.report({ groupId })).rejects.toThrow('Not signed in')
  })

  it('report: increments reportCount and hides after 3 reports', async () => {
    const db = new FakeDb()
    const groupId = '550e8400-e29b-41d4-a716-446655440001'
    db.communityGroups = [
      {
        id: groupId,
        citySlug: 'munich',
        name: 'Broken Link Group',
        platform: 'whatsapp',
        inviteUrl: 'https://invalid.example.com',
        styles: [],
        verified: false,
        status: 'visible',
        reportCount: 2,
      },
    ]

    const caller = appRouter.createCaller({ db: db as any, dancerId: 'dancer-1', isAdmin: false })
    const result = await caller.communityGroup.report({ groupId })

    expect(result.reported).toBe(true)
    expect(result.hidden).toBe(true) // 2 + 1 = 3, should be hidden
    expect(db.communityGroups[0].reportCount).toBe(3)
    expect(db.communityGroups[0].status).toBe('hidden')
  })

  it('report: does not hide group until 3 reports', async () => {
    const db = new FakeDb()
    const groupId = '550e8400-e29b-41d4-a716-446655440001'
    db.communityGroups = [
      {
        id: groupId,
        citySlug: 'munich',
        name: 'Group with 0 reports',
        platform: 'telegram',
        inviteUrl: 'https://t.me/example',
        styles: [],
        verified: false,
        status: 'visible',
        reportCount: 0,
      },
    ]

    const caller = appRouter.createCaller({ db: db as any, dancerId: 'dancer-1', isAdmin: false })
    const result = await caller.communityGroup.report({ groupId })

    expect(result.reported).toBe(true)
    expect(result.hidden).toBe(false) // 0 + 1 = 1, should not be hidden
    expect(db.communityGroups[0].reportCount).toBe(1)
    expect(db.communityGroups[0].status).toBe('visible')
  })

  it('report: rejects duplicate reports from the same user', async () => {
    const db = new FakeDb()
    const groupId = '550e8400-e29b-41d4-a716-446655440001'
    db.communityGroups = [
      { id: groupId, citySlug: 'munich', name: 'G', platform: 'whatsapp', inviteUrl: 'https://example.com', styles: [], verified: false, status: 'visible', reportCount: 0 },
    ]

    const caller = appRouter.createCaller({ db: db as any, dancerId: 'dancer-1', isAdmin: false })
    await caller.communityGroup.report({ groupId })
    await expect(caller.communityGroup.report({ groupId })).rejects.toThrow('Already reported')
  })

  it('report: throws error if group not found', async () => {
    const db = new FakeDb()

    const caller = appRouter.createCaller({ db: db as any, dancerId: 'dancer-1', isAdmin: false })
    await expect(caller.communityGroup.report({ groupId: '550e8400-e29b-41d4-a716-446655440099' })).rejects.toThrow('Group not found')
  })
})
