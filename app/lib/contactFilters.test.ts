import { describe, it, expect } from 'vitest'
import { describeFilter, filterContacts, comingCounts, emptyFilter, isFiltered, toggle, contactsCsv, sourceDetail, contactSince, CSV_COLUMNS, type FilterableContact } from './contactFilters'
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

describe('the audience (RAZ-963)', () => {
  const other = c({ name: 'Dan', email: '', sourceKey: 'wedance', emailBlock: 'not_a_contact', isContact: false, hasAccount: true, createdAt: null, activity: { ...EMPTY_ACTIVITY, follows: true } })
  const everyone = [...list, other]
  it('"Who" narrows to contacts or the rest; the other filters work on both', () => {
    expect(names(filterContacts(everyone, emptyFilter(), NOW))).toEqual(['Ana', 'Ben', 'Cleo', 'Dan'])
    expect(names(filterContacts(everyone, { ...emptyFilter(), who: 'contacts' }, NOW))).toEqual(['Ana', 'Ben', 'Cleo'])
    expect(names(filterContacts(everyone, { ...emptyFilter(), who: 'others' }, NOW))).toEqual(['Dan'])
    expect(names(filterContacts(everyone, { ...emptyFilter(), activity: ['follows'] }, NOW))).toEqual(['Cleo', 'Dan'])
    expect(names(filterContacts(everyone, { ...emptyFilter(), sources: ['wedance'] }, NOW))).toEqual(['Dan'])
    expect(names(filterContacts(everyone, { ...emptyFilter(), email: 'can' }, NOW))).toEqual(['Ana'])
    expect(isFiltered({ ...emptyFilter(), who: 'others' })).toBe(true)
  })
  it('the CSV leaves non-contacts out', () => {
    const csv = contactsCsv(everyone.map(x => ({ ...x, locale: null, sourceLabel: 'x' })))
    expect(csv.split('\n')).toHaveLength(4)
    expect(csv).not.toContain('Dan')
  })
  it('no join date for a non-contact who doesn\'t follow', () => {
    expect(contactSince(null, {})).toBe('')
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
  it('sourceDetail: UTM, else the referring site, else the form (RAZ-1074)', () => {
    expect(sourceDetail({ form: 'f', referrer: 'https://www.google.com/search' })).toBe('google.com')
    expect(sourceDetail({ form: 'f' })).toBe('f')
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

describe('the event filter', () => {
  const coming = [
    c({ name: 'Ana', activity: { ...EMPTY_ACTIVITY, events: { e1: 'needLeader' } } }),
    c({ name: 'Ben', activity: { ...EMPTY_ACTIVITY, events: { e1: 'ticket', e2: 'going' } } }),
    c({ name: 'Cat', activity: { ...EMPTY_ACTIVITY, events: { e2: 'needLeader' } } }),
    c({ name: 'Dan' }),
  ]
  it('keeps the contacts coming to the event, and narrows by how they come', () => {
    expect(filterContacts(coming, { ...emptyFilter(), event: 'e1' }, NOW).map(x => x.name)).toEqual(['Ana', 'Ben'])
    expect(filterContacts(coming, { ...emptyFilter(), event: 'e1', as: 'needLeader' }, NOW).map(x => x.name)).toEqual(['Ana'])
    expect(isFiltered({ ...emptyFilter(), event: 'e1' })).toBe(true)
  })
  it('counts them by how they come', () => {
    expect(comingCounts(coming, 'e1')).toEqual({ total: 2, by: { needLeader: 1, ticket: 1 } })
    expect(comingCounts(coming, 'nope')).toEqual({ total: 0, by: {} })
  })
})

describe('describeFilter (RAZ-975)', () => {
  it('is empty for everyone and says the filter in words otherwise', async () => {
    const { describeFilter, emptyFilter } = await import('./contactFilters')
    expect(describeFilter(emptyFilter())).toBe('')
    expect(describeFilter({ ...emptyFilter(), event: 'e1', as: 'needFollower', sources: ['website'], activity: ['regular'], q: ' anna ' }, 'Sun 15 Nov · Casino'))
      .toBe('Coming to Sun 15 Nov · Casino · Needs a follower · Your website · Regulars (3+ events) · search “anna”')
  })
})

describe('the channel filter (RAZ-1074)', () => {
  it('keeps the contacts that came through the chosen channels; the audience never matches', () => {
    const l = [
      c({ name: 'Ig', source: { utm_source: 'ig' } }),
      c({ name: 'Mc', source: { utm_source: 'montuno.club', utm_medium: 'schedule' } }),
      c({ name: 'Nobody', source: {} }),
      c({ name: 'Fan', source: {}, isContact: false }),
    ]
    expect(names(filterContacts(l, { ...emptyFilter(), channels: ['instagram'] }, NOW))).toEqual(['Ig'])
    expect(names(filterContacts(l, { ...emptyFilter(), channels: ['montuno.club', 'unknown'] }, NOW))).toEqual(['Mc', 'Nobody'])
    expect(isFiltered({ ...emptyFilter(), channels: ['instagram'] })).toBe(true)
    expect(describeFilter({ ...emptyFilter(), channels: ['instagram'] })).toBe('via Instagram')
  })
})
