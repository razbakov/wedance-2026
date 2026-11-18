import { describe, it, expect } from 'vitest'
import { inAskWindow, rateFromQuery, reviewAskSubject, reviewOpen, reviewOpensAt } from './eventReview'

const H = 3_600_000
const now = Date.parse('2026-11-20T09:00:00Z') // Friday 10:00 in Munich

describe('reviewOpensAt / reviewOpen', () => {
  it('opens at the end, else three hours after the start', () => {
    expect(reviewOpensAt({ startDate: '2026-11-19T19:00:00Z', endDate: '2026-11-19T23:00:00Z' })?.toISOString()).toBe('2026-11-19T23:00:00.000Z')
    expect(reviewOpensAt({ startDate: '2026-11-19T19:00:00Z' })?.toISOString()).toBe('2026-11-19T22:00:00.000Z')
    expect(reviewOpensAt({})).toBeNull()
  })
  it('is closed before the night is over', () => {
    expect(reviewOpen({ startDate: new Date(now - H), endDate: new Date(now + H) }, now)).toBe(false)
    expect(reviewOpen({ startDate: new Date(now - 5 * H), endDate: new Date(now - H) }, now)).toBe(true)
    expect(reviewOpen({}, now)).toBe(false)
  })
})

describe('inAskWindow', () => {
  it('asks the morning after: over 4–30 hours ago', () => {
    const ended = (h: number) => ({ startDate: new Date(now - (h + 4) * H), endDate: new Date(now - h * H) })
    expect(inAskWindow(ended(3), now)).toBe(false)
    expect(inAskWindow(ended(4), now)).toBe(true)
    expect(inAskWindow(ended(10), now)).toBe(true)
    expect(inAskWindow(ended(29.9), now)).toBe(true)
    expect(inAskWindow(ended(30), now)).toBe(false)
  })
  it('leaves no night out between two daily runs', () => {
    // A night that ends any time is in the window of exactly one or two 09:00 runs, never none.
    for (let m = 0; m < 24 * 60; m += 15) {
      const end = now - m * 60_000
      const ev = { endDate: new Date(end), startDate: new Date(end - 3 * H) }
      expect(inAskWindow(ev, now) || inAskWindow(ev, now + 24 * H)).toBe(true)
    }
  })
})

describe('reviewAskSubject', () => {
  it('names the night in the event’s zone and the host', () => {
    expect(reviewAskSubject({ startDate: '2026-11-19T19:00:00Z', timezone: 'Europe/Berlin', name: 'Timba Thursday' }, 'La Timberia')).toBe('How was Thursday at La Timberia?')
    // 23:30 UTC Saturday is already Sunday in Munich.
    expect(reviewAskSubject({ startDate: '2026-11-21T23:30:00Z', timezone: 'Europe/Berlin', name: 'Late' }, null)).toBe('How was Sunday at Late?')
    // A weekender: by its name.
    expect(reviewAskSubject({ startDate: '2026-11-20T17:00:00Z', endDate: '2026-11-22T20:00:00Z', name: 'Zouk Weekender' }, 'Miriam')).toBe('How was Zouk Weekender?')
  })
})

describe('rateFromQuery', () => {
  it('takes 1..5 only', () => {
    expect(rateFromQuery('4')).toBe(4)
    expect(rateFromQuery(['5'])).toBe(5)
    expect(rateFromQuery('0')).toBeNull()
    expect(rateFromQuery('6')).toBeNull()
    expect(rateFromQuery('2.5')).toBeNull()
    expect(rateFromQuery(undefined)).toBeNull()
  })
})
