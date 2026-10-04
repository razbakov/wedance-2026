import { describe, it, expect } from 'vitest'
import { eventLocalDate, eventLocalTime, eventLocalWeekday, formatEventWhen } from './eventTime'

describe('eventTime', () => {
  // 2026-10-10 18:00Z = 20:00 CEST in Munich
  const sat = '2026-10-10T18:00:00.000Z'

  it('renders wall-clock time in the event zone, not UTC', () => {
    expect(eventLocalTime(sat, 'Europe/Berlin')).toBe('20:00')
    expect(eventLocalDate(sat, 'Europe/Berlin')).toBe('2026-10-10')
    expect(eventLocalWeekday(sat, 'Europe/Berlin')).toBe('Saturday')
  })

  it('honours the CEST → CET switch (last Sunday of October)', () => {
    // 2026-10-26 19:00Z is after the switch → 20:00 CET
    expect(eventLocalTime('2026-10-26T19:00:00.000Z', 'Europe/Berlin')).toBe('20:00')
  })

  it('moves late-UTC instants onto the next local day', () => {
    // 22:30Z on Oct 10 = 00:30 Oct 11 in Berlin
    expect(eventLocalDate('2026-10-10T22:30:00.000Z', 'Europe/Berlin')).toBe('2026-10-11')
  })

  it('formats same-day, overnight and multi-day ranges', () => {
    expect(formatEventWhen(sat, '2026-10-10T21:30:00.000Z', 'Europe/Berlin')).toBe('Sat, Oct 10, 2026 · 20:00–23:30')
    expect(formatEventWhen('2026-10-10T20:00:00.000Z', '2026-10-11T01:00:00.000Z', 'Europe/Berlin')).toBe('Sat, Oct 10, 2026 · 22:00–03:00')
    expect(formatEventWhen('2026-10-09T16:00:00.000Z', '2026-10-11T20:00:00.000Z', 'Europe/Berlin')).toBe('Oct 9 – Oct 11, 2026')
  })

  it('falls back to Europe/Berlin for a missing zone', () => {
    expect(eventLocalTime(sat, '')).toBe('20:00')
  })
})

describe('daysUntil for event datetimes', async () => {
  const { daysUntil } = await import('./festivalDateFormatter')
  it('reads "Today" for an event later today, "Past" once started', () => {
    const later = new Date(Date.now() + 60_000)
    if (later.getDate() === new Date().getDate()) expect(daysUntil(later.toISOString())).toBe('Today')
    expect(daysUntil(new Date(Date.now() - 60_000).toISOString())).toBe('Past')
  })
})
