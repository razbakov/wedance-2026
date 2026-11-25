import { describe, expect, it } from 'vitest'
import { metDayLabel, relativeNightWhen } from './nightWhen'

/** Wednesday 25 Nov 2026, noon in Berlin (CET, UTC+1). */
const NOW = new Date('2026-11-25T11:00:00.000Z')
const TZ = 'Europe/Berlin'

describe('relativeNightWhen', () => {
  it('says tonight and the event-zone clock, not the UTC hour', () => {
    // 18:00 Berlin is 17:00 UTC. A page that prints the UTC hour would say 17:00 or, an hour the other way, 19:00.
    expect(relativeNightWhen('2026-11-25T17:00:00.000Z', TZ, NOW)).toBe('Tonight · 18:00')
    expect(relativeNightWhen('2026-11-25T18:00:00.000Z', TZ, NOW)).toBe('Tonight · 19:00')
  })

  it('names tomorrow with the weekday and the date', () => {
    expect(relativeNightWhen('2026-11-26T17:00:00.000Z', TZ, NOW)).toBe('Tomorrow · Thu 26 Nov · 18:00')
  })

  it('drops the relative word once the night is further out', () => {
    expect(relativeNightWhen('2026-12-03T17:00:00.000Z', TZ, NOW)).toBe('Thu 3 Dec · 18:00')
  })

  it('uses the event zone when none is stored', () => {
    expect(relativeNightWhen('2026-11-25T17:00:00.000Z', null, NOW)).toBe('Tonight · 18:00')
  })
})

describe('metDayLabel', () => {
  it('is the weekday and the date, with no clock', () => {
    expect(metDayLabel('2026-11-19T17:00:00.000Z', TZ)).toBe('Thu 19 Nov')
  })
})
