import { describe, expect, it } from 'vitest'
import { buildYearReview, isYearTurn, lookBackYear, screenText, type YearNight } from './yearReview'

const night = (over: Partial<YearNight>): YearNight => ({
  id: Math.random().toString(36).slice(2),
  kind: 'social',
  name: 'Salsa Night',
  start: '2026-03-06T19:00:00Z',
  styles: ['Salsa'],
  city: 'Munich',
  country: 'Germany',
  venue: 'Bar Buena Vista',
  ...over,
})

const kinds = (r: ReturnType<typeof buildYearReview>) => r.screens.map(s => s.kind)

describe('lookBackYear / isYearTurn', () => {
  it('looks back at last year in January, this year otherwise', () => {
    expect(lookBackYear(new Date('2027-01-10T12:00:00Z'))).toBe(2026)
    expect(lookBackYear(new Date('2026-12-20T12:00:00Z'))).toBe(2026)
    expect(lookBackYear(new Date('2026-06-01T12:00:00Z'))).toBe(2026)
  })
  it('the turn of the year is December and January', () => {
    expect(isYearTurn(new Date('2026-12-01T00:00:00Z'))).toBe(true)
    expect(isYearTurn(new Date('2027-01-31T12:00:00Z'))).toBe(true)
    expect(isYearTurn(new Date('2026-11-30T12:00:00Z'))).toBe(false)
    expect(isYearTurn(new Date('2027-02-01T00:00:00Z'))).toBe(false)
  })
})

describe('buildYearReview', () => {
  it('an empty year is only the "plan next year" screen', () => {
    const r = buildYearReview({ year: 2026, name: 'Ana', nights: [], friendsJoined: 0, nextYearFestivals: 0 })
    expect(kinds(r)).toEqual(['next'])
    expect(r.screens[0]).toEqual({ kind: 'next', year: 2027, planned: 0 })
  })

  it('a thin year drops the screens it has nothing for', () => {
    const r = buildYearReview({ year: 2026, name: 'Ana Maria', nights: [night({})], friendsJoined: 0, nextYearFestivals: 0 })
    expect(kinds(r)).toEqual(['intro', 'nights', 'next'])
    expect(r.name).toBe('Ana')
  })

  it('a full year gets every screen, in order, ending on next year', () => {
    const nights = [
      night({ start: '2026-10-02T19:00:00Z' }),
      night({ start: '2026-10-09T19:00:00Z' }),
      night({ start: '2026-10-16T19:00:00Z', name: 'Bachata Sensual Night', styles: ['Bachata'], venue: 'Tanzhaus' }),
      night({ start: '2026-02-14T19:00:00Z', name: 'Valentine Social', city: 'Berlin' }),
      night({ id: 'festival:bfest', kind: 'festival', name: 'Berlin Salsa Congress', start: '2026-05-01', end: '2026-05-03', city: 'Berlin', venue: null }),
      night({ kind: 'class', name: 'Salsa Course', start: '2026-09-01T18:00:00Z' }),
    ]
    const r = buildYearReview({ year: 2026, name: 'Ana', nights, friendsJoined: 3, nextYearFestivals: 2 })
    expect(kinds(r)).toEqual(['intro', 'nights', 'style', 'month', 'floor', 'festivals', 'cities', 'friends', 'first', 'next'])
    expect(r.nights).toBe(6)
    expect(r.festivals).toBe(1)
    expect(r.classes).toBe(1)
    expect(r.family).toBe('salsa')

    const nightsScreen = r.screens.find(s => s.kind === 'nights')!
    // Nights out: the course isn't one.
    expect(nightsScreen).toMatchObject({ nights: 5 })
    expect((nightsScreen as any).months[9]).toBe(3)

    expect(r.screens.find(s => s.kind === 'month')).toEqual({ kind: 'month', month: 'October', nights: 3 })
    expect(r.screens.find(s => s.kind === 'floor')).toEqual({ kind: 'floor', venue: 'Bar Buena Vista', nights: 2, city: 'Munich' })
    expect(r.screens.find(s => s.kind === 'first')).toEqual({ kind: 'first', name: 'Valentine Social', date: '14 February' })
    expect(r.screens.find(s => s.kind === 'cities')).toMatchObject({ cities: ['Berlin', 'Munich'], countries: 1 })
    expect(r.screens.find(s => s.kind === 'style')).toMatchObject({ style: 'Salsa' })
    expect(r.screens.at(-1)).toEqual({ kind: 'next', year: 2027, planned: 2 })
  })

  it('every screen has a plain-text line', () => {
    const r = buildYearReview({
      year: 2026,
      name: 'Ana',
      nights: [night({}), night({ start: '2026-03-13T19:00:00Z', city: 'Berlin' })],
      friendsJoined: 1,
      nextYearFestivals: 0,
    })
    for (const s of r.screens) expect(screenText(s, 2026)).toMatch(/\w/)
    expect(screenText(r.screens[0]!, 2026)).toBe('My 2026 in dance: 2 nights I was going to.')
  })
})
