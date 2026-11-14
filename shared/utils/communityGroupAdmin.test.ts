import { describe, it, expect } from 'vitest'
import { checkedAgo, groupByCity, groupState, lastLinkCheck, linksDue, matchesGroup, stateCounts, type AdminGroup } from './communityGroupAdmin'

const g = (over: Partial<AdminGroup>): AdminGroup => ({
  citySlug: 'munich', name: 'Salsa Munich', platform: 'whatsapp', inviteUrl: 'https://chat.whatsapp.com/abc',
  styles: ['Salsa'], source: null, status: 'visible', linkStatus: 'unknown', linkCheckedAt: null, ...over,
})

describe('admin community groups', () => {
  it('tells a group hidden by the link check apart from a listed one', () => {
    expect(groupState(g({}))).toBe('listed')
    expect(groupState(g({ linkStatus: 'ok' }))).toBe('listed')
    expect(groupState(g({ linkStatus: 'dead' }))).toBe('dead')
    // Waiting / hidden / declined win over the link: they aren't on the city page anyway.
    expect(groupState(g({ status: 'pending', linkStatus: 'dead' }))).toBe('pending')
    expect(groupState(g({ status: 'hidden', linkStatus: 'dead' }))).toBe('hidden')
    expect(groupState(g({ status: 'rejected' }))).toBe('rejected')
  })

  it('filters by city, platform, style, state and text', () => {
    const a = g({ name: 'Bachata Berlin', citySlug: 'berlin', styles: ['Bachata'], platform: 'telegram' })
    expect(matchesGroup(a, { city: 'berlin' })).toBe(true)
    expect(matchesGroup(a, { city: 'munich' })).toBe(false)
    expect(matchesGroup(a, { platform: 'whatsapp' })).toBe(false)
    expect(matchesGroup(a, { style: 'bachata' })).toBe(true)
    expect(matchesGroup(a, { style: 'Salsa' })).toBe(false)
    expect(matchesGroup(a, { state: 'dead' })).toBe(false)
    expect(matchesGroup(a, { q: 'bachatá' })).toBe(true)
    expect(matchesGroup(a, { q: 'berl' })).toBe(true)
    expect(matchesGroup(a, { q: 'kizomba' })).toBe(false)
  })

  it('counts each state under the other filters', () => {
    const groups = [g({}), g({ linkStatus: 'dead' }), g({ linkStatus: 'dead', citySlug: 'berlin' }), g({ status: 'pending' })]
    expect(stateCounts(groups, {})).toMatchObject({ all: 4, listed: 1, dead: 2, pending: 1, hidden: 0 })
    // The state filter itself doesn't shrink the chip counts.
    expect(stateCounts(groups, { city: 'munich', state: 'dead' })).toMatchObject({ all: 3, dead: 1, listed: 1 })
  })

  it('lists cities A–Z by name and groups A–Z inside', () => {
    const groups = [g({ name: 'Zouk MUC' }), g({ name: 'Bachata MUC' }), g({ name: 'Salsa VIE', citySlug: 'vienna' }), g({ name: 'Kiz BER', citySlug: 'berlin' })]
    const names: Record<string, string> = { munich: 'Munich', vienna: 'Vienna', berlin: 'Berlin' }
    const out = groupByCity(groups, {}, s => names[s]!)
    expect(out.map(c => c.cityName)).toEqual(['Berlin', 'Munich', 'Vienna'])
    expect(out[1]!.groups.map(x => x.name)).toEqual(['Bachata MUC', 'Zouk MUC'])
    expect(groupByCity(groups, { city: 'vienna' })).toHaveLength(1)
  })

  it('knows the last check and how many links are due', () => {
    const now = Date.parse('2026-11-14T12:00:00Z')
    const groups = [
      g({ linkCheckedAt: '2026-11-14T11:00:00Z' }),
      g({ linkCheckedAt: '2026-11-13T10:00:00Z' }),
      g({}),
      g({ platform: 'facebook' }),
      g({ status: 'rejected' }),
    ]
    expect(lastLinkCheck(groups)?.toISOString()).toBe('2026-11-14T11:00:00.000Z')
    expect(lastLinkCheck([g({})])).toBeNull()
    expect(linksDue(groups, now)).toBe(2)
    expect(checkedAgo('2026-11-14T11:00:00Z', now)).toBe('1 h ago')
    expect(checkedAgo('2026-11-12T12:00:00Z', now)).toBe('2 days ago')
    expect(checkedAgo('2026-11-14T11:59:50Z', now)).toBe('just now')
  })
})
