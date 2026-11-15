import { describe, it, expect } from 'vitest'
import { filterContacts, emptyFilter, isFiltered, toggle, byEngagement, type FilterableContact } from './contactFilters'
import { EMPTY_ACTIVITY } from '#shared/utils/contactSegments'

const NOW = new Date('2026-11-15T12:00:00Z')
const c = (over: Partial<FilterableContact>): FilterableContact => ({
  name: null, email: 'x@test.local', phone: null, note: null, sourceKey: 'website', emailBlock: null, account: null,
  status: 'subscribed', source: {}, createdAt: '2026-01-01T00:00:00Z', hasAccount: false, activity: EMPTY_ACTIVITY, ...over,
})

const list = [
  c({ name: 'Ana', sourceKey: 'website' }),
  c({ name: 'Ben', sourceKey: 'hubspot_import', emailBlock: 'not_opted_in', hasAccount: true, account: { name: 'Benjamin' }, activity: { ...EMPTY_ACTIVITY, wentTo: 5, lastEventAt: '2026-11-01T00:00:00Z' } }),
  c({ name: 'Cleo', sourceKey: 'wedance_v3', emailBlock: 'not_opted_in', hasAccount: true, activity: { ...EMPTY_ACTIVITY, follows: true, upcoming: [{ id: 'e', name: 'E', startDate: '2026-11-20T19:00:00Z' }] } }),
]
const names = (l: FilterableContact[]) => l.map(x => x.name)

describe('filterContacts', () => {
  it('no filter = everyone', () => {
    expect(names(filterContacts(list, emptyFilter(), NOW))).toEqual(['Ana', 'Ben', 'Cleo'])
    expect(isFiltered(emptyFilter())).toBe(false)
  })
  it('by source, email, activity and text — all together', () => {
    expect(names(filterContacts(list, { ...emptyFilter(), sources: ['hubspot_import', 'wedance_v3'] }, NOW))).toEqual(['Ben', 'Cleo'])
    expect(names(filterContacts(list, { ...emptyFilter(), email: 'can' }, NOW))).toEqual(['Ana'])
    expect(names(filterContacts(list, { ...emptyFilter(), email: 'cant', activity: ['regular'] }, NOW))).toEqual(['Ben'])
    expect(names(filterContacts(list, { ...emptyFilter(), q: 'benja' }, NOW))).toEqual(['Ben'])
  })
})

describe('helpers', () => {
  it('toggle adds and removes', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
  })
  it('byEngagement: going soon first, then most events', () => {
    expect(names([...list].sort(byEngagement))).toEqual(['Cleo', 'Ben', 'Ana'])
  })
})
