import { describe, it, expect } from 'vitest'
import { mutualPairs, pickNight, type NightCandidate } from './meetMatches'

const ME = 'me'
const d = (iso: string) => new Date(iso)

describe('mutualPairs', () => {
  it('a one-way deck yes is not a match', () => {
    expect(mutualPairs(ME, [{ from: ME, to: 'gila', at: d('2026-11-01') }], [])).toEqual([])
    expect(mutualPairs(ME, [{ from: 'gila', to: ME, at: d('2026-11-01') }], [])).toEqual([])
  })

  it('yes both ways in the deck → a match dated by the second yes', () => {
    const [m] = mutualPairs(ME, [
      { from: ME, to: 'gila', at: d('2026-11-01') },
      { from: 'gila', to: ME, at: d('2026-11-05') },
    ], [])
    expect(m).toEqual({ other: 'gila', matchedAt: d('2026-11-05'), deck: true, festivalSlugs: [] })
  })

  it('waves pair per festival — a wave at A and a wave back at B is not a match', () => {
    expect(mutualPairs(ME, [], [
      { from: ME, to: 'ana', at: d('2026-11-01'), festivalSlug: 'a' },
      { from: 'ana', to: ME, at: d('2026-11-02'), festivalSlug: 'b' },
    ])).toEqual([])
  })

  it('deck and festival yeses with the same dancer merge into one match', () => {
    const res = mutualPairs(ME, [
      { from: ME, to: 'ana', at: d('2026-11-01') },
      { from: 'ana', to: ME, at: d('2026-11-02') },
    ], [
      { from: ME, to: 'ana', at: d('2026-10-01'), festivalSlug: 'fest' },
      { from: 'ana', to: ME, at: d('2026-11-09'), festivalSlug: 'fest' },
    ])
    expect(res).toHaveLength(1)
    expect(res[0]).toMatchObject({ other: 'ana', deck: true, festivalSlugs: ['fest'], matchedAt: d('2026-11-09') })
  })

  it('newest match first; never matches myself', () => {
    const res = mutualPairs(ME, [
      { from: ME, to: 'old', at: d('2026-01-01') },
      { from: 'old', to: ME, at: d('2026-01-02') },
      { from: ME, to: 'new', at: d('2026-11-01') },
      { from: 'new', to: ME, at: d('2026-11-02') },
      { from: ME, to: ME, at: d('2026-11-03') },
    ], [])
    expect(res.map(r => r.other)).toEqual(['new', 'old'])
  })
})

describe('pickNight', () => {
  const ev = (id: string, day: number, over: Partial<NightCandidate> = {}): NightCandidate => ({
    id, name: `Night ${id}`, type: 'Party', citySlug: 'munich',
    startDate: new Date(Date.UTC(2026, 10, day, 20)), timezone: 'Europe/Berlin', venueName: 'Club', styles: ['Salsa'], ...over,
  })
  const base = { myCitySlug: 'munich', myStyles: ['Salsa'], theirStyles: ['Salsa'], mine: new Set<string>(), theirs: new Set<string>() }

  it('both going beats sooner nights', () => {
    const n = pickNight([ev('soon', 16), ev('both', 20)], { ...base, mine: new Set(['both']), theirs: new Set(['both']) })
    expect(n).toMatchObject({ eventId: 'both', youGoing: true, theyGoing: true })
    expect(n?.path).toMatch(/^\/events\//)
  })

  it("they're going beats I'm going beats a city suggestion", () => {
    const evs = [ev('city', 16), ev('mine', 17), ev('theirs', 18)]
    expect(pickNight(evs, { ...base, mine: new Set(['mine']), theirs: new Set(['theirs']) })?.eventId).toBe('theirs')
    expect(pickNight(evs, { ...base, mine: new Set(['mine']) })?.eventId).toBe('mine')
    expect(pickNight(evs, base)?.eventId).toBe('city')
  })

  it('a city suggestion must suit both dancers and be a social in my city', () => {
    const evs = [
      ev('kiz', 16, { styles: ['Kizomba'] }),
      ev('course', 16, { type: 'Course' }),
      ev('berlin', 16, { citySlug: 'berlin' }),
      ev('ok', 19),
    ]
    expect(pickNight(evs, base)?.eventId).toBe('ok')
    expect(pickNight([ev('salsa', 16)], { ...base, theirStyles: ['Tango'] })).toBeNull()
  })

  it('no city and no plans → nothing', () => {
    expect(pickNight([ev('x', 16)], { ...base, myCitySlug: '' })).toBeNull()
  })
})
