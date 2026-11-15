/**
 * Pure helpers behind /my-plan's week socials and discover deck (no database needed). The
 * DB-backed behaviour — swipe persistence, discover exclusion, the planned
 * week — is covered in server/trpc/routers/plan-myPlanFeeds.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { eventIdForNonFestival, isClaimableFestival, isClassType, pickFestivalSlugs, resolveWeekOccurrences, slugifyCity, stylesForDancer, stylesMatch } from './myPlanFeeds'

describe('stylesMatch', () => {
  it('matches the same style and its variants', () => {
    expect(stylesMatch(['Salsa'], ['salsa'])).toBe(true)
    expect(stylesMatch(['Rueda de Casino'], ['Salsa'])).toBe(true)
  })
  it('does not match unrelated styles or empty lists', () => {
    expect(stylesMatch(['Kizomba'], ['Salsa'])).toBe(false)
    expect(stylesMatch([], ['Salsa'])).toBe(false)
    expect(stylesMatch(['Salsa'], [])).toBe(false)
  })
})

describe('slugifyCity', () => {
  it('turns a free-text city into an events.city_slug', () => {
    expect(slugifyCity('München')).toBe('munchen')
    expect(slugifyCity(' Frankfurt am Main ')).toBe('frankfurt-am-main')
  })
})

describe('resolveWeekOccurrences', () => {
  const at = (d: number) => new Date(Date.UTC(2026, 9, 17 + d, 20))

  it('shows a planned occurrence that falls in the week', () => {
    const out = resolveWeekOccurrences([{ id: 'a', seriesId: null }], [{ id: 'a', seriesId: null, startDate: at(1) }])
    expect(out).toEqual([{ eventId: 'a', planItemId: 'a' }])
  })

  it('shows the next occurrence of a recurring event planned on another date', () => {
    const out = resolveWeekOccurrences(
      [{ id: 'last-week', seriesId: 's1' }],
      [{ id: 'thu', seriesId: 's1', startDate: at(2) }, { id: 'next-thu', seriesId: 's1', startDate: at(6) }],
    )
    expect(out).toEqual([{ eventId: 'thu', planItemId: 'last-week' }])
  })

  it('does not repeat a series already planned directly this week', () => {
    const out = resolveWeekOccurrences(
      [{ id: 'thu', seriesId: 's1' }, { id: 'old', seriesId: 's1' }],
      [{ id: 'thu', seriesId: 's1', startDate: at(2) }],
    )
    expect(out).toEqual([{ eventId: 'thu', planItemId: 'thu' }])
  })

  it('returns nothing for planned events outside the week', () => {
    expect(resolveWeekOccurrences([{ id: 'x', seriesId: null }], [])).toEqual([])
  })
})

describe('stylesForDancer', () => {
  it('puts the dancer\'s styles first', () => {
    expect(stylesForDancer(['Ballroom', 'Salsa'], ['Salsa'])).toEqual(['Salsa', 'Ballroom'])
    expect(stylesForDancer(['Ballroom', 'Salsa'], [])).toEqual(['Ballroom', 'Salsa'])
  })
})

describe('isClassType', () => {
  it('puts courses and workshops in My plan\'s courses section (RAZ-891)', () => {
    expect(isClassType('Course')).toBe(true)
    expect(isClassType('Workshop')).toBe(true)
  })
  it('leaves nights out and festivals to their own sections', () => {
    for (const t of ['Party', 'Concert', 'Show', 'Festival', null, undefined]) expect(isClassType(t)).toBe(false)
  })
})

// RAZ-982: "Going to Casino Partnerwork — you're not" on a dancer card — a
// one-hour workshop (is_festival false) that had a festival plan item and a
// legacy festivals row. Only a real, upcoming festival may be claimed.
describe('isClaimableFestival', () => {
  const now = new Date('2026-11-15T12:00:00Z')
  const fest = {
    isFestival: true, published: true, archived: false, cancelledAt: null,
    startDate: new Date('2026-11-27T18:00:00Z'), endDate: new Date('2026-11-29T22:00:00Z'),
  }

  it('claims a published, upcoming festival', () => {
    expect(isClaimableFestival(fest, now)).toBe(true)
  })
  it('claims a festival that is on right now, until its last day is over', () => {
    expect(isClaimableFestival({ ...fest, startDate: new Date('2026-11-14T18:00:00Z'), endDate: new Date('2026-11-16T22:00:00Z') }, now)).toBe(true)
    expect(isClaimableFestival({ ...fest, endDate: null, startDate: new Date('2026-11-15T20:00:00Z') }, now)).toBe(true)
  })
  it('never claims a workshop, class or party — even with a programme', () => {
    expect(isClaimableFestival({ ...fest, isFestival: false, startDate: new Date('2026-11-15T18:00:00Z'), endDate: new Date('2026-11-15T19:00:00Z') }, now)).toBe(false)
    expect(isClaimableFestival({ ...fest, isFestival: null }, now)).toBe(false)
  })
  it('never claims a festival that is over', () => {
    expect(isClaimableFestival({ ...fest, startDate: new Date('2026-10-16T18:00:00Z'), endDate: new Date('2026-10-18T13:00:00Z') }, now)).toBe(false)
  })
  it('never claims a draft, archived or cancelled festival', () => {
    expect(isClaimableFestival({ ...fest, published: false }, now)).toBe(false)
    expect(isClaimableFestival({ ...fest, archived: true }, now)).toBe(false)
    expect(isClaimableFestival({ ...fest, cancelledAt: new Date('2026-11-01T00:00:00Z') }, now)).toBe(false)
  })
  it('never claims a festival without dates', () => {
    expect(isClaimableFestival({ ...fest, startDate: null, endDate: null }, now)).toBe(false)
  })
})

// RAZ-983: festival plan items whose event is not a festival (a workshop, a class).
describe('pickFestivalSlugs', () => {
  const rows = [
    { id: 'e1', slug: 'dance-fest-2027', key: 'dance-fest', isFestival: true },
    { id: 'e2', slug: 'casino-partnerwork-a0e56', key: 'casino-partnerwork-a0e56', isFestival: false },
    { id: 'e3', slug: 'salsa-from-zero-a73d4', key: null, isFestival: null },
  ]
  it('keeps festival keys and slugs of real festivals only', () => {
    expect(pickFestivalSlugs(['dance-fest', 'dance-fest-2027', 'casino-partnerwork-a0e56', 'salsa-from-zero-a73d4', 'gone'], rows))
      .toEqual(new Set(['dance-fest', 'dance-fest-2027']))
  })
})

describe('eventIdForNonFestival', () => {
  it('maps a workshop or class slug to its event id', () => {
    expect(eventIdForNonFestival('casino-partnerwork-a0e56', [{ id: 'e2', slug: 'casino-partnerwork-a0e56', key: 'casino-partnerwork-a0e56', isFestival: false }])).toBe('e2')
    expect(eventIdForNonFestival('clave', [{ id: 'e3', slug: 'clave-872c0', key: 'clave', isFestival: null }])).toBe('e3')
  })
  it('keeps a festival, or a slug with no event, a festival', () => {
    expect(eventIdForNonFestival('dance-fest', [{ id: 'e1', slug: 'dance-fest-2027', key: 'dance-fest', isFestival: true }])).toBeNull()
    expect(eventIdForNonFestival('dance-fest', [
      { id: 'e1', slug: 'dance-fest-2027', key: 'dance-fest', isFestival: true },
      { id: 'e4', slug: 'dance-fest-2026', key: 'dance-fest', isFestival: false },
    ])).toBeNull()
    expect(eventIdForNonFestival('no-such', [])).toBeNull()
  })
})
