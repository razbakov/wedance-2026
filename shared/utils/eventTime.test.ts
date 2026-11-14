import { describe, it, expect } from 'vitest'
import { eventEndsAt, eventLocalDate, eventLocalTime, eventLocalWeekday, eventPhase, formatEventWhen } from './eventTime'

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
  // Zouk Munich Weekender: Fri 13 Nov 19:00 → Sun 15 Nov 23:00, Munich (CET = UTC+1).
  const start = '2026-11-13T18:00:00.000Z'
  const end = '2026-11-15T22:00:00.000Z'
  const at = (iso: string) => new Date(iso)

  it('reads "Today" for an event later today', () => {
    expect(daysUntil(start, 'Europe/Berlin', end, at('2026-11-13T09:00:00Z'))).toBe('Today')
    expect(daysUntil(start, 'Europe/Berlin', end, at('2026-11-12T09:00:00Z'))).toBe('Tomorrow')
  })

  it('a running weekender is not "Past" (RAZ-893)', () => {
    expect(daysUntil(start, 'Europe/Berlin', end, at('2026-11-13T20:00:00Z'))).toBe('Today')
    expect(daysUntil(start, 'Europe/Berlin', end, at('2026-11-14T12:00:00Z'))).toBe('On now')
    expect(daysUntil(start, 'Europe/Berlin', end, at('2026-11-15T21:59:00Z'))).toBe('On now')
    expect(daysUntil(start, 'Europe/Berlin', end, at('2026-11-15T22:01:00Z'))).toBe('Past')
  })

  it('date-only festivals run to the end of their last day in the event zone', () => {
    expect(daysUntil('2026-11-13', 'Europe/Berlin', '2026-11-15', at('2026-11-14T12:00:00Z'))).toBe('On now')
    // 23:30 Munich on the 15th = 22:30Z, still on; 00:30 on the 16th = 23:30Z, over.
    expect(daysUntil('2026-11-13', 'Europe/Berlin', '2026-11-15', at('2026-11-15T22:30:00Z'))).toBe('On now')
    expect(daysUntil('2026-11-13', 'Europe/Berlin', '2026-11-15', at('2026-11-15T23:30:00Z'))).toBe('Past')
  })

  it('without an end, an event runs to the end of its start day', () => {
    expect(daysUntil(start, 'Europe/Berlin', null, at('2026-11-13T22:00:00Z'))).toBe('Today')
    expect(daysUntil(start, 'Europe/Berlin', null, at('2026-11-13T23:30:00Z'))).toBe('Past')
  })
})

describe('eventPhase / eventEndsAt', () => {
  const start = '2026-11-13T18:00:00.000Z'
  it('is upcoming, on, then past — decided by the end, not the start', () => {
    const end = '2026-11-15T22:00:00.000Z'
    expect(eventPhase(start, end, 'Europe/Berlin', new Date('2026-11-13T17:00:00Z'))).toBe('upcoming')
    expect(eventPhase(start, end, 'Europe/Berlin', new Date('2026-11-14T12:00:00Z'))).toBe('on')
    expect(eventPhase(start, end, 'Europe/Berlin', new Date('2026-11-16T00:00:00Z'))).toBe('past')
  })

  it('falls back to the end of the start day in the event zone', () => {
    // Next Munich midnight after Fri 19:00 = Sat 00:00 CET = Fri 23:00Z
    expect(eventEndsAt(start, null, 'Europe/Berlin').toISOString()).toBe('2026-11-13T23:00:00.000Z')
    // An end at or before the start is ignored
    expect(eventEndsAt(start, start, 'Europe/Berlin').toISOString()).toBe('2026-11-13T23:00:00.000Z')
    // A date-only end (the event page fills it from the start day) = that whole day
    expect(eventEndsAt(start, '2026-11-13', 'Europe/Berlin').toISOString()).toBe('2026-11-13T23:00:00.000Z')
    expect(eventEndsAt(start, null, 'America/New_York').toISOString()).toBe('2026-11-14T05:00:00.000Z')
  })
})
