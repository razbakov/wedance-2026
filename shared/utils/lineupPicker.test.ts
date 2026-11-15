import { describe, it, expect } from 'vitest'
import { pickLineupEvents } from './lineupPicker'

const ev = (id: string, day: number, styles: string[], extra: Record<string, any> = {}) =>
  ({ id, startDate: new Date(Date.UTC(2026, 11, day, 20)), styles, ...extra })

describe('pickLineupEvents', () => {
  it('keeps only events that share one of the artist styles (case-insensitive)', () => {
    const out = pickLineupEvents([ev('a', 1, ['Kizomba']), ev('b', 2, ['timba', 'Salsa']), ev('c', 3, [])], ['Timba'])
    expect(out.map(e => e.id)).toEqual(['b'])
  })

  it('keeps every event when the artist has no styles', () => {
    expect(pickLineupEvents([ev('a', 1, ['Kizomba']), ev('b', 2, [])], []).map(e => e.id)).toEqual(['a', 'b'])
  })

  it('shows one row per series: its next date, with the number of dates', () => {
    const out = pickLineupEvents([
      ev('w3', 15, ['Salsa'], { seriesId: 's1' }),
      ev('w1', 1, ['Salsa'], { seriesId: 's1' }),
      ev('one', 5, ['Salsa']),
      ev('w2', 8, ['Salsa'], { seriesId: 's1' }),
    ], ['Salsa'])
    expect(out.map(e => [e.id, e.dates])).toEqual([['w1', 3], ['one', 1]])
  })

  it('puts the pages the asker owns before the ones they help run', () => {
    const out = pickLineupEvents([ev('team', 1, ['Salsa'], { role: 'editor' }), ev('mine', 9, ['Salsa'], { role: 'owner' })], ['Salsa'])
    expect(out.map(e => e.id)).toEqual(['mine', 'team'])
  })

  it('stops at the limit (5 by default)', () => {
    const many = Array.from({ length: 9 }, (_, i) => ev(`e${i}`, i + 1, ['Salsa']))
    expect(pickLineupEvents(many, ['Salsa'])).toHaveLength(5)
    expect(pickLineupEvents(many, ['Salsa'], 2).map(e => e.id)).toEqual(['e0', 'e1'])
  })
})
