/**
 * Selecting plan items that point at mock data (scripts/cleanup-mock-plan-items.ts).
 */
import { describe, it, expect } from 'vitest'
import { collectMockIds, countMockBy, selectMockPlanItems } from './mockPlanCleanup'
import { HISTORICAL_MOCK_IDS } from './historicalMockIds'

describe('collectMockIds', () => {
  it('derives ids and slugs from exported objects, nested anywhere', () => {
    const ids = collectMockIds([{ events: [{ id: 'muc-3' }], city: { slug: 'timba-fest-london-2026' } }])
    expect(ids.has('muc-3')).toBe(true)
    expect(ids.has('timba-fest-london-2026')).toBe(true)
  })

  it('the frozen list still names the old city classes and preview festivals', () => {
    const ids = new Set(HISTORICAL_MOCK_IDS)
    expect(ids.has('muc-3')).toBe(true)
    expect(ids.has('timba-fest-london-2026')).toBe(true)
    expect([...ids].some(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))).toBe(false)
  })

  it('never takes a UUID for a mock id', () => {
    const ids = collectMockIds([{ events: [{ id: '3b3c7260-9a8f-4b80-9466-2aeba8c71ba6' }, { id: 'muc-x' }] }])
    expect([...ids]).toEqual(['muc-x'])
  })
})

describe('selectMockPlanItems', () => {
  const mock = new Set(['muc-3', 'meneate-viena-2026', 'sat-13'])
  const rows = [
    { id: '1', dancerId: 'a', itemType: 'event', itemId: 'muc-3' },
    { id: '2', dancerId: 'a', itemType: 'festival', itemId: 'meneate-viena-2026' },
    { id: '3', dancerId: 'a', itemType: 'workshop', itemId: 'sat-13' },
    { id: '4', dancerId: 'b', itemType: 'event', itemId: '3b3c7260-9a8f-4b80-9466-2aeba8c71ba6' },
    { id: '5', dancerId: 'b', itemType: 'event', itemId: 'muc-3' },
  ]

  it('picks events/festivals with a mock id, keeps ids that are also real rows, never workshops', () => {
    const out = selectMockPlanItems(rows, mock, new Set(['meneate-viena-2026']))
    expect(out.map(r => r.id)).toEqual(['1', '5'])
  })

  it('counts per key, biggest first', () => {
    expect(countMockBy(selectMockPlanItems(rows, mock, new Set()), r => r.itemId)).toEqual([['muc-3', 2], ['meneate-viena-2026', 1]])
  })
})
