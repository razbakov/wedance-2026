import { describe, it, expect } from 'vitest'
import * as v from 'valibot'
import { suggestEventName, weekdayName, nextSameWeekday, addDaysIso, daysBetween } from './eventStart'
import { EventStartSchema, EventCopySchema } from '../validation/forms'

describe('suggestEventName', () => {
  it('names a night by its music, type and weekday', () => {
    expect(suggestEventName({ styles: ['Salsa'], type: 'Party', date: '2026-11-19' })).toBe('Salsa Party · Thursday')
  })
  it('joins two styles and shortens more', () => {
    expect(suggestEventName({ styles: ['Salsa', 'Bachata'], type: 'Party', date: '2026-11-21' })).toBe('Salsa & Bachata Party · Saturday')
    expect(suggestEventName({ styles: ['Salsa', 'Bachata', 'Kizomba'], type: 'Workshop' })).toBe('Salsa & Bachata + Workshop')
  })
  it('works with only some fields', () => {
    expect(suggestEventName({ type: 'Course', date: '2026-11-16' })).toBe('Course · Monday')
    expect(suggestEventName({ type: 'Party' })).toBe('New party')
    expect(suggestEventName({})).toBe('New party')
  })
})

describe('dates', () => {
  it('reads the weekday of a calendar date', () => {
    expect(weekdayName('2026-11-14')).toBe('Saturday')
    expect(weekdayName('')).toBe('')
  })
  it('adds days across months', () => {
    expect(addDaysIso('2026-11-28', 7)).toBe('2026-12-05')
    expect(daysBetween('2026-11-14', '2026-12-05')).toBe(21)
  })
  it('suggests the next same weekday after today for a copy', () => {
    // A Thursday party in October, today is Saturday 14 Nov → Thursday 19 Nov.
    expect(nextSameWeekday('2026-10-15', '2026-11-14')).toBe('2026-11-19')
    // A source still ahead: a week after it.
    expect(nextSameWeekday('2026-11-20', '2026-11-14')).toBe('2026-11-27')
  })
})

describe('EventStartSchema', () => {
  const ok = { hostUsername: 'laclave', type: 'Party', styles: ['Salsa'], date: '2026-11-19', startTime: '20:00', name: '', published: false }
  it('accepts the four fields with no name', () => {
    const r = v.safeParse(EventStartSchema, ok)
    expect(r.success).toBe(true)
    if (r.success) expect(r.output.name).toBeUndefined()
  })
  it('flags every missing field at once', () => {
    const r = v.safeParse(EventStartSchema, { ...ok, hostUsername: '', date: '', startTime: '' }, { abortEarly: false })
    expect(r.success).toBe(false)
    const paths = (r.issues ?? []).map(i => i.path?.[0]?.key)
    expect(paths).toEqual(expect.arrayContaining(['hostUsername', 'date', 'startTime']))
  })
})

describe('EventCopySchema', () => {
  it('needs an event and a date', () => {
    expect(v.safeParse(EventCopySchema, { id: 'x', date: '2026-11-19', repeatWeeks: 0 }).success).toBe(true)
    expect(v.safeParse(EventCopySchema, { id: '', date: '', repeatWeeks: 0 }).success).toBe(false)
    expect(v.safeParse(EventCopySchema, { id: 'x', date: '2026-11-19', repeatWeeks: 13 }).success).toBe(false)
  })
})
