import { describe, expect, it } from 'vitest'
import {
  artistAreaChoices,
  artistMatchesSearch,
  artistTravelsTo,
  cleanEventTypes,
  cleanServiceAreas,
  resolveServiceAreas,
} from './artistSearch'

const los = {
  name: 'Los Filin',
  city: 'Barcelona',
  citySlug: 'barcelona',
  styles: ['Salsa', 'Timba'],
  eventTypes: ['wedding', 'corporate'],
  serviceAreas: [{ city: 'Munich', citySlug: 'munich' }],
}

const claudio = {
  name: 'Claudio Ceraolo',
  city: 'Munich',
  citySlug: 'munich',
  styles: [] as string[],
  eventTypes: ['birthday', 'wedding'],
  serviceAreas: [] as { city: string; citySlug: string }[],
}

const localDj = {
  name: 'Local DJ',
  city: 'Munich',
  citySlug: 'munich',
  styles: ['Salsa LA'],
  eventTypes: [] as string[],
  serviceAreas: [] as { city: string; citySlug: string }[],
}

describe('artistMatchesSearch', () => {
  it('matches every artist when nothing is set', () => {
    expect(artistMatchesSearch(los, {})).toBe(true)
    expect(artistMatchesSearch(claudio, { query: '  ', style: '', eventType: '', serviceArea: '' })).toBe(true)
  })

  it('matches the name and ignores other text', () => {
    expect(artistMatchesSearch(los, { query: 'filin' })).toBe(true)
    expect(artistMatchesSearch(los, { query: 'munich' })).toBe(false)
    expect(artistMatchesSearch(claudio, { query: 'salsa' })).toBe(false)
  })

  it('matches a dance style, including an alias of the same style', () => {
    expect(artistMatchesSearch(los, { style: 'salsa' })).toBe(true)
    expect(artistMatchesSearch(localDj, { style: 'salsaon1' })).toBe(true)
    expect(artistMatchesSearch(los, { style: 'Bachata' })).toBe(false)
    expect(artistMatchesSearch(claudio, { style: 'Salsa' })).toBe(false)
  })

  it('matches wedding, birthday and corporate, and nothing else', () => {
    expect(artistMatchesSearch(los, { eventType: 'Wedding' })).toBe(true)
    expect(artistMatchesSearch(claudio, { eventType: ' birthday ' })).toBe(true)
    expect(artistMatchesSearch(los, { eventType: 'corporate' })).toBe(true)
    expect(artistMatchesSearch(los, { eventType: 'birthday' })).toBe(false)
    expect(artistMatchesSearch(localDj, { eventType: 'wedding' })).toBe(false)
    expect(artistMatchesSearch(los, { eventType: 'party' })).toBe(false)
  })

  it('matches a service area by home city or a city the artist travels to', () => {
    expect(artistMatchesSearch(claudio, { serviceArea: 'Munich' })).toBe(true)
    expect(artistMatchesSearch(claudio, { serviceArea: 'munich' })).toBe(true)
    expect(artistMatchesSearch(los, { serviceArea: 'Munich' })).toBe(true)
    expect(artistMatchesSearch(los, { serviceArea: 'munich' })).toBe(true)
    expect(artistMatchesSearch(los, { serviceArea: 'Barcelona' })).toBe(true)
    expect(artistMatchesSearch(los, { serviceArea: 'Vienna' })).toBe(false)
    expect(artistMatchesSearch(localDj, { serviceArea: 'Barcelona' })).toBe(false)
  })

  it('requires every set filter at once', () => {
    expect(artistMatchesSearch(los, { query: 'filin', style: 'Timba', eventType: 'wedding', serviceArea: 'Munich' })).toBe(true)
    expect(artistMatchesSearch(los, { query: 'filin', style: 'Timba', eventType: 'birthday', serviceArea: 'Munich' })).toBe(false)
    expect(artistMatchesSearch(claudio, { style: 'Salsa', serviceArea: 'Munich' })).toBe(false)
  })
})

describe('artistTravelsTo', () => {
  it('is true only when the area is a travel city, not their home city', () => {
    expect(artistTravelsTo(los, 'Munich')).toBe(true)
    expect(artistTravelsTo(los, 'Barcelona')).toBe(false)
    expect(artistTravelsTo(claudio, 'Munich')).toBe(false)
    expect(artistTravelsTo(los, 'Vienna')).toBe(false)
    expect(artistTravelsTo(los, '')).toBe(false)
  })
})

describe('artistAreaChoices', () => {
  it('lists home cities and travel cities once, alphabetically', () => {
    expect(artistAreaChoices([los, claudio, localDj])).toEqual(['Barcelona', 'Munich'])
  })
})

describe('cleanEventTypes', () => {
  it('keeps wedding, birthday and corporate, in that order, once each', () => {
    expect(cleanEventTypes(['corporate', 'Wedding', 'nope', 'wedding', ' birthday '])).toEqual(['wedding', 'birthday', 'corporate'])
  })
})

describe('cleanServiceAreas', () => {
  it('drops blanks, the home city and duplicate cities', () => {
    expect(cleanServiceAreas([
      { city: ' Munich ' },
      { city: 'munich' },
      { city: 'Barcelona' },
      { city: '  ' },
      { city: 'Vienna' },
    ], 'Barcelona')).toEqual([
      { city: 'Munich', citySlug: 'munich' },
      { city: 'Vienna', citySlug: 'vienna' },
    ])
  })

  it('keeps at most 20 cities', () => {
    const areas = Array.from({ length: 21 }, (_, i) => ({ city: `City ${i}` }))
    expect(cleanServiceAreas(areas, null)).toHaveLength(20)
  })
})

describe('resolveServiceAreas', () => {
  it('stores the canonical city and drops the home city after lookup', async () => {
    const lookup = async (city: string) => city === 'Vienna'
      ? { city: 'Vienna', citySlug: 'vienna' }
      : { city: 'Munich', citySlug: 'munich' }
    expect(await resolveServiceAreas(
      [{ city: 'München' }, { city: 'Munich' }, { city: 'Vienna' }],
      'Munich',
      lookup,
    )).toEqual([{ city: 'Vienna', citySlug: 'vienna' }])
  })
})
