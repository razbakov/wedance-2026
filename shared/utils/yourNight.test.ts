import { describe, expect, it } from 'vitest'
import { arrivalTime, includesLine, isNight, nightCounts, nightPlanChanges, passCovers, upgradeFor, nightSummary } from './yourNight'
import type { FestivalPass, FestivalSession } from '../types/festivalDetails'

const s = (id: string, time: string, duration: number, type: FestivalSession['type'], date = '2026-11-19'): FestivalSession =>
  ({ id, date, time, duration, type, title: id, artist: '', style: 'Salsa' })

// La Timberia: 19:00 class (60) → 20:00 party (240) → 22:00 band (15, during the party)
const doors = s('doors', '18:45', 0, 'doors')
const cls = s('class', '19:00', 60, 'workshop')
const party = s('party', '20:00', 240, 'party')
const band = s('band', '22:00', 15, 'concert')
const night = [doors, band, cls, party]

const full: FestivalPass = { name: 'Class + party', price: 15, days: [] }
const partyOnly: FestivalPass = { name: 'Party only', price: 8, days: [], sessions: ['party', 'band'] }

describe('isNight', () => {
  it('is a night when the classes follow one another — a band during the party is part of it', () => {
    expect(isNight(night)).toBe(true)
  })
  it('is not a night when two classes run at the same time (festival rooms)', () => {
    expect(isNight([s('a', '14:00', 60, 'workshop'), s('b', '14:00', 60, 'workshop')])).toBe(false)
  })
  it('needs two items, and ignores doors', () => {
    expect(isNight([doors, cls])).toBe(false)
  })
})

describe('passCovers', () => {
  it('covers what it names, else its days, else everything — never doors', () => {
    expect(passCovers(partyOnly, night).map(x => x.id)).toEqual(['party', 'band'])
    expect(passCovers(full, night).map(x => x.id)).toEqual(['class', 'party', 'band'])
    expect(passCovers({ days: ['Friday'] }, night)).toEqual([])
    expect(passCovers(null, night).map(x => x.id)).toEqual(['class', 'party', 'band'])
  })
  it('says what it includes', () => {
    expect(includesLine(partyOnly, night)).toBe('20:00 party · 22:00 concert')
  })
})

describe('arrivalTime', () => {
  it('is 10 minutes before a class, else the first start', () => {
    expect(arrivalTime([party, cls])).toBe('18:50')
    expect(arrivalTime([band, party])).toBe('20:00')
    expect(arrivalTime([])).toBeNull()
  })
})

describe('upgradeFor', () => {
  it('finds the cheapest pass that adds the item, with the difference', () => {
    expect(upgradeFor([full, partyOnly], partyOnly, night, 'class')).toEqual({ pass: full, extra: 7 })
    expect(upgradeFor([partyOnly], partyOnly, night, 'class')).toBeNull()
  })
})

describe('nightPlanChanges', () => {
  const seq = [cls, party, s('show', '23:00', 30, 'show')]
  const passes = [full, { ...partyOnly, sessions: ['party', 'show'] }]
  it('booking adds what the pass covers', () => {
    expect(nightPlanChanges(seq, passes, null, { answer: 'needFollower', pass: 'Party only' })).toEqual({ add: ['party', 'show'], remove: ['class'] })
  })
  it('changing the pass adds only newly covered items, so unticks survive', () => {
    expect(nightPlanChanges(seq, passes, { answer: 'yes', pass: 'Party only' }, { answer: 'yes', pass: 'Class + party' }))
      .toEqual({ add: ['class'], remove: [] })
  })
  it('cancelling drops every item', () => {
    expect(nightPlanChanges(seq, passes, { answer: 'yes', pass: 'Class + party' }, { answer: 'next', pass: null }))
      .toEqual({ add: [], remove: ['class', 'party', 'show'] })
  })
  it('does nothing for a festival programme with parallel rooms', () => {
    expect(nightPlanChanges([s('a', '14:00', 60, 'workshop'), s('b', '14:00', 60, 'workshop')], [], null, { answer: 'yes', pass: null }))
      .toEqual({ add: [], remove: [] })
  })
})

describe('nightCounts', () => {
  it('counts people per item (a couple = 2, lead + follow) and when they arrive', () => {
    const c = nightCounts([cls, party, band], [
      { answer: 'partner', items: ['class', 'party', 'band'] },
      { answer: 'needFollower', items: ['class', 'party'] },
      { answer: 'needLeader', items: ['party'] },
      { answer: 'next', items: ['party'] },
    ])
    expect(c.items).toEqual([
      { id: 'class', people: 3, leaders: 2, followers: 1 },
      { id: 'party', people: 4, leaders: 2, followers: 2 },
      { id: 'band', people: 2, leaders: 1, followers: 1 },
    ])
    expect(c.arrivals).toEqual([{ id: 'class', time: '18:50', people: 3 }, { id: 'party', time: '20:00', people: 1 }])
  })
})

describe('nightSummary', () => {
  it("gives My plan's row: the pass, when to come, the parts you're at", () => {
    expect(nightSummary([cls, party, band], [full, partyOnly], 'Party only', ['party', 'band']))
      .toEqual({ pass: 'Party only', arrival: '20:00', parts: ['party', 'concert'] })
    expect(nightSummary([cls, party], [], null, [])).toEqual({ pass: null, arrival: null, parts: [] })
    expect(nightSummary([s('a', '14:00', 60, 'workshop'), s('b', '14:00', 60, 'workshop')], [], null, [])).toBeNull()
  })
})
