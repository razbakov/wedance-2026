import { describe, expect, it } from 'vitest'
import { availabilityLines, fitsAvailability, type ArtistSlot } from './artistAvailability'

const monday: ArtistSlot[] = [
  { dayOfWeek: 1, startTime: '18:00', endTime: '23:00' },
  { dayOfWeek: 6, startTime: '14:00', endTime: '18:00' },
  { dayOfWeek: 6, startTime: '20:00', endTime: '02:00' },
]

describe('availabilityLines', () => {
  it('groups windows by weekday, Monday first, with an en dash', () => {
    expect(availabilityLines(monday)).toEqual([
      { dayOfWeek: 1, label: 'Monday', hours: '18:00–23:00' },
      { dayOfWeek: 6, label: 'Saturday', hours: '14:00–18:00, 20:00–02:00' },
    ])
  })

  it('is empty when the artist has not published times', () => {
    expect(availabilityLines([])).toEqual([])
  })
})

describe('fitsAvailability', () => {
  it('is unknown when nothing is published, so a request is not refused', () => {
    expect(fitsAvailability([], '2026-11-23', '19:00', '21:00')).toBe('unknown')
  })

  it('is free on a Monday inside the published window', () => {
    // 2026-11-23 is a Monday.
    expect(fitsAvailability(monday, '2026-11-23', '19:00', '21:00')).toBe('free')
  })

  it('is outside on a weekday with no window', () => {
    expect(fitsAvailability(monday, '2026-11-24', '19:00', '21:00')).toBe('outside')
  })

  it('is outside when the time starts before the window', () => {
    expect(fitsAvailability(monday, '2026-11-23', '17:00', '19:00')).toBe('outside')
  })

  it('treats a date with no time as free when that weekday has a window', () => {
    expect(fitsAvailability(monday, '2026-11-23')).toBe('free')
    expect(fitsAvailability(monday, '2026-11-24')).toBe('outside')
  })

  it('accepts a time that sits inside an overnight window', () => {
    expect(fitsAvailability(monday, '2026-11-28', '23:00', '23:30')).toBe('free')
    expect(fitsAvailability(monday, '2026-11-28', '01:00', '01:30')).toBe('free')
    expect(fitsAvailability(monday, '2026-11-28', '23:00', '01:00')).toBe('free')
    expect(fitsAvailability(monday, '2026-11-28', '10:00', '12:00')).toBe('outside')
  })

  it('treats 00:00–00:00 as the whole day', () => {
    const allDay: ArtistSlot[] = [{ dayOfWeek: 3, startTime: '00:00', endTime: '00:00' }]
    expect(fitsAvailability(allDay, '2026-11-25', '09:00', '17:00')).toBe('free')
  })
})
