import { describe, it, expect } from 'vitest'
import { filterContacts, emptyFilter, isFiltered, toggle, contactsCsv, sourceDetail, contactSince, CSV_COLUMNS, type FilterableContact } from './contactFilters'
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
})

describe('search over source details', () => {
  it('finds a contact by its form, UTM or promo code', () => {
    const l = [c({ name: 'Dora', source: { form: 'newsletter', promo_code: 'SUMMER' } }), c({ name: 'Eli' })]
    expect(names(filterContacts(l, { ...emptyFilter(), q: 'summer' }, NOW))).toEqual(['Dora'])
    expect(names(filterContacts(l, { ...emptyFilter(), q: 'newsl' }, NOW))).toEqual(['Dora'])
  })
})

describe('contactsCsv', () => {
  it('one header and one quoted row per contact, with can-email and WeDance activity', () => {
    const csv = contactsCsv([
      { ...c({ name: 'Ann "A"', email: 'a@test.local', source: { utm_source: 'ig', utm_medium: 'story' } }), locale: 'de', sourceLabel: 'Your website' },
      { ...c({ email: 'b@test.local', emailBlock: 'not_opted_in', hasAccount: true, account: { name: 'Bo' }, activity: { ...EMPTY_ACTIVITY, wentTo: 4, follows: true, upcoming: [{ id: 'e', name: 'E', startDate: '2026-11-20T19:00:00.000Z' }] } }), locale: null, sourceLabel: 'HubSpot imported list' },
    ])
    const [head, a, b] = csv.split('\n')
    expect(head).toBe(CSV_COLUMNS.join(','))
    expect(a).toContain('"Ann ""A"""')
    expect(a).toContain('"yes"')
    expect(a).toContain('"ig / story"')
    expect(b).toContain('"Bo"')
    expect(b).toContain('"no: Never asked for your emails"')
    expect(b).toContain('"4","2026-11-20","yes"')
  })
  it('sourceDetail: UTM, else form, else referrer', () => {
    expect(sourceDetail({ form: 'f', referrer: 'r' })).toBe('f')
    expect(sourceDetail({ referrer: 'r' })).toBe('r')
    expect(sourceDetail(null)).toBe('')
    expect(sourceDetail({ from: 'wedance-v3', form: 'WeDance v3 · subscribers' })).toBe('')
  })
})

describe('contactSince', () => {
  it('the day they joined, or only a bound when the import has no date', () => {
    expect(contactSince('2024-07-08T13:36:43Z', { from: 'wedance-v3', subscribed_at: '2024-07-08T13:36:43Z' })).toBe('8 Jul 2024')
    expect(contactSince('2024-03-24T15:23:00Z', { from: 'wedance-v3', subscribed_before: '2024-03-24T15:23:43Z' })).toBe('before Mar 2024')
    expect(contactSince('2026-11-15T11:00:00Z', null)).toBe('15 Nov 2026')
  })

  it('CSV writes the bound, not a made-up day', () => {
    const csv = contactsCsv([{ ...c({ name: 'Old', source: { from: 'wedance-v3', subscribed_before: '2024-03-24T15:23:43Z' } }), locale: null, sourceLabel: 'wedance.vip subscribers' }])
    expect(csv).toContain('"before 2024-03-24"')
  })
})
