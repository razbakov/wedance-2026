import { describe, expect, it } from 'vitest'
import { festivalYearLine } from './festivalYearLine'

describe('festivalYearLine', () => {
  it('says only the count when there is nothing else to say', () => {
    expect(festivalYearLine({ count: 1, committed: 0, pending: 0, urgentDeadlines: 0 })).toBe('1 festival')
    expect(festivalYearLine({ count: 0, committed: 0, pending: 0, urgentDeadlines: 0 })).toBe('0 festivals')
  })

  it('keeps the money and deadlines the removed stats card used to show', () => {
    expect(festivalYearLine({ count: 3, committed: 180, pending: 95, urgentDeadlines: 1 }))
      .toBe('3 festivals · €180 committed · €95 still owed · 1 early-bird ending this week')
  })

  it('leaves out whichever part is zero', () => {
    expect(festivalYearLine({ count: 2, committed: 0, pending: 120, urgentDeadlines: 2 }))
      .toBe('2 festivals · €120 still owed · 2 early-birds ending this week')
  })
})
