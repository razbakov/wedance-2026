/**
 * RAZ-889 — the My plan badge and the "in your week" pill count what /my-plan
 * lists, not every plan item ever added.
 */
import { describe, it, expect } from 'vitest'
import { countPlan, isUpcomingFestival } from './planCounts'

const NOW = new Date('2026-11-14T12:00:00Z')
const inDays = (d: number) => new Date(NOW.getTime() + d * 86400_000).toISOString()

describe('isUpcomingFestival', () => {
  it('keeps a festival until its last day has passed', () => {
    expect(isUpcomingFestival({ startDate: '2026-11-12', endDate: '2026-11-14' }, NOW)).toBe(true)
    expect(isUpcomingFestival({ startDate: '2026-11-11', endDate: '2026-11-13' }, NOW)).toBe(false)
    expect(isUpcomingFestival({ startDate: '2027-03-01', endDate: '2027-03-03' }, NOW)).toBe(true)
  })

  it('uses the start date when there is no end date, and counts a festival without dates', () => {
    expect(isUpcomingFestival({ startDate: '2026-11-13', endDate: null }, NOW)).toBe(false)
    expect(isUpcomingFestival({ startDate: '2026-11-14', endDate: null }, NOW)).toBe(true)
    expect(isUpcomingFestival({ startDate: null, endDate: null }, NOW)).toBe(true)
  })
})

describe('countPlan', () => {
  it('is zero for an empty plan', () => {
    expect(countPlan({ festivals: [], courses: [], socials: [] }, NOW))
      .toEqual({ festivals: 0, courses: 0, socials: 0, week: 0, total: 0 })
  })

  it('reproduces the review: 1 festival + 2 socials this week = 3, not the 15 plan items', () => {
    const counts = countPlan({
      festivals: [
        { startDate: '2027-02-10', endDate: '2027-02-14' },
        { startDate: '2026-06-01', endDate: '2026-06-03' }, // over
      ],
      courses: [],
      socials: [{}, {}],
    }, NOW)
    expect(counts).toEqual({ festivals: 1, courses: 0, socials: 2, week: 2, total: 3 })
  })

  it('counts every listed course in the total, but only this week\'s classes in the week', () => {
    const counts = countPlan({
      festivals: [],
      courses: [{ startDate: inDays(1) }, { startDate: inDays(6.9) }, { startDate: inDays(12) }],
      socials: [{}],
    }, NOW)
    expect(counts.total).toBe(4)
    expect(counts.week).toBe(3)
  })

  it('the week pill never exceeds the badge', () => {
    const counts = countPlan({ festivals: [{ startDate: null, endDate: null }], courses: [{ startDate: inDays(2) }], socials: [{}, {}, {}] }, NOW)
    expect(counts.week).toBeLessThanOrEqual(counts.total)
  })
})
