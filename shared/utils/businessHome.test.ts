import { describe, expect, it } from 'vitest'
import { wantsFlyerReminder, visiblePulse, greetingFor, namesLine, isTask } from './businessHome'

const now = new Date('2026-11-15T17:00:00Z')
const inDays = (d: number) => new Date(now.getTime() + d * 86400_000)

describe('wantsFlyerReminder', () => {
  it('skips events that start within 24 hours', () => {
    expect(wantsFlyerReminder({ startDate: inDays(0.5), type: 'Party' }, now)).toBe(false)
  })
  it('skips weekly classes', () => {
    expect(wantsFlyerReminder({ startDate: inDays(3), type: 'Course', seriesId: 's1' }, now)).toBe(false)
    expect(wantsFlyerReminder({ startDate: inDays(3), type: 'Practica', seriesId: 's1' }, now)).toBe(false)
  })
  it('keeps parties, workshops and one-off classes', () => {
    expect(wantsFlyerReminder({ startDate: inDays(3), type: 'Party', seriesId: 's1' }, now)).toBe(true)
    expect(wantsFlyerReminder({ startDate: inDays(3), type: 'Workshop' }, now)).toBe(true)
    expect(wantsFlyerReminder({ startDate: inDays(3), type: 'Course', seriesId: null }, now)).toBe(true)
  })
})

describe('visiblePulse', () => {
  it('hides numbers below 3', () => {
    const list = [
      { id: 'plans' as const, label: '', value: 23, delta: 8 },
      { id: 'followers' as const, label: '', value: 1, delta: 1 },
      { id: 'answers' as const, label: '', value: 3, delta: 0 },
    ]
    expect(visiblePulse(list).map(p => p.id)).toEqual(['plans', 'answers'])
  })
})

describe('greetingFor', () => {
  it('follows the hour', () => {
    expect(greetingFor(8)).toBe('Good morning')
    expect(greetingFor(14)).toBe('Good afternoon')
    expect(greetingFor(19)).toBe('Good evening')
    expect(greetingFor(2)).toBe('Good evening')
  })
})

describe('namesLine', () => {
  it('names up to two people by first name', () => {
    expect(namesLine(['Maria Lopez'], 1)).toBe('Maria')
    expect(namesLine(['Maria', 'Jonas Weber'], 2)).toBe('Maria and Jonas')
    expect(namesLine(['Maria', 'Jonas', 'Olga'], 5)).toBe('Maria, Jonas and 3 others')
    expect(namesLine(['Maria', 'Jonas'], 3)).toBe('Maria, Jonas and 1 other')
  })
  it('falls back when nobody has a name', () => {
    expect(namesLine([null], 1)).toBe('Someone')
    expect(namesLine([], 4)).toBe('4 dancers')
  })
})

describe('isTask', () => {
  it('splits chores from people waiting', () => {
    expect(['draft', 'missing', 'flyer'].every(isTask)).toBe(true)
    expect(['booking', 'join', 'claim', 'suggestions', 'venue-ask', 'lineup-ask'].some(isTask)).toBe(false)
  })
})
