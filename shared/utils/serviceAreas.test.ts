import { describe, expect, it } from 'vitest'
import {
  artistCityNames,
  cityDisplayName,
  cleanServiceAreas,
  listedInCity,
  matchesArtistCity,
  peopleInCity,
  serviceAreasFor,
  tallyCities,
  unionServiceAreas,
  withoutHomeCity,
  SERVICE_AREAS_MAX,
} from './serviceAreas'

const munich = { slug: 'munich', name: 'Munich' }
const barcelona = { slug: 'barcelona', name: 'Barcelona' }
const berlin = { slug: 'berlin', name: 'Berlin' }

describe('cleanServiceAreas', () => {
  it('keeps canonical cities and drops blanks, duplicates and junk', () => {
    expect(cleanServiceAreas([
      munich,
      { slug: 'Munich', name: 'München' },
      { slug: '', name: 'Nowhere' },
      { slug: 'berlin', name: '  Berlin  ' },
      { slug: '../etc', name: 'Bad' },
      null,
      'munich',
    ])).toEqual([munich, berlin])
  })

  it('stops at the cap', () => {
    const many = Array.from({ length: SERVICE_AREAS_MAX + 5 }, (_, i) => ({ slug: `city-${i}`, name: `City ${i}` }))
    expect(cleanServiceAreas(many)).toHaveLength(SERVICE_AREAS_MAX)
  })
})

describe('serviceAreasFor', () => {
  it('drops the home city so the artist is not listed twice', () => {
    expect(serviceAreasFor([barcelona, munich, munich], 'barcelona')).toEqual([munich])
  })
})

describe('withoutHomeCity', () => {
  it('drops the home city by slug or by the same name', () => {
    expect(withoutHomeCity([munich, berlin], ['barcelona'], 'Munich')).toEqual([berlin])
    expect(withoutHomeCity([munich, berlin], ['munich'], 'Barcelona')).toEqual([berlin])
  })
})

describe('listedInCity', () => {
  const band = { type: 'artist', citySlug: 'barcelona', serviceAreas: [munich] }

  it('includes an artist in their home city and in each service-area city', () => {
    expect(listedInCity(band, 'barcelona')).toBe(true)
    expect(listedInCity(band, 'munich')).toBe(true)
    expect(listedInCity(band, 'berlin')).toBe(false)
  })

  it('does not spread a venue across its service areas', () => {
    const venue = { type: 'venue', citySlug: 'barcelona', serviceAreas: [munich] }
    expect(listedInCity(venue, 'barcelona')).toBe(true)
    expect(listedInCity(venue, 'munich')).toBe(false)
  })
})

describe('cityDisplayName', () => {
  it('names the city from someone based there, not from a traveler’s home city', () => {
    const rows = [
      { city: 'Barcelona', citySlug: 'barcelona', serviceAreas: [munich] },
      { city: 'Munich', citySlug: 'munich', serviceAreas: [] },
    ]
    expect(cityDisplayName(rows, 'munich', null)).toBe('Munich')
  })

  it('still names a city that only a traveler serves', () => {
    const rows = [{ city: 'Barcelona', citySlug: 'barcelona', serviceAreas: [munich] }]
    expect(cityDisplayName(rows, 'munich', null)).toBe('Munich')
  })
})

describe('peopleInCity', () => {
  it('lists a traveling artist once, marked as based elsewhere', () => {
    const rows = [
      { username: 'local', name: 'Local', photo: null, type: 'artist', styles: ['Salsa'], city: 'Munich', citySlug: 'munich', serviceAreas: [] },
      { username: 'los.filinsclub', name: 'Los Filin', photo: null, type: 'artist', styles: ['Timba'], city: 'Barcelona', citySlug: 'barcelona', serviceAreas: [munich] },
      { username: 'hall', name: 'Hall', photo: null, type: 'venue', styles: [], city: 'Barcelona', citySlug: 'barcelona', serviceAreas: [munich] },
    ]
    expect(peopleInCity(rows, 'munich', 'artist')).toEqual([
      { username: 'local', name: 'Local', photo: null, styles: ['Salsa'], basedIn: null },
      { username: 'los.filinsclub', name: 'Los Filin', photo: null, styles: ['Timba'], basedIn: 'Barcelona' },
    ])
    expect(peopleInCity(rows, 'munich', 'venue')).toEqual([])
  })
})

describe('tallyCities', () => {
  it('counts an artist in the home city and each extra city, once', () => {
    const rows = [
      { city: 'Barcelona', citySlug: 'barcelona', type: 'artist', serviceAreas: [munich, barcelona] },
      { city: 'Munich', citySlug: 'munich', type: 'venue', serviceAreas: [berlin] },
    ]
    expect(tallyCities(rows)).toEqual([
      { city: 'Munich', citySlug: 'munich', venues: 1, artists: 1, organizers: 0, total: 2 },
      { city: 'Barcelona', citySlug: 'barcelona', venues: 0, artists: 1, organizers: 0, total: 1 },
    ])
  })
})

describe('artist city filter', () => {
  it('matches the home city and every service-area city', () => {
    expect(artistCityNames('Barcelona', [munich])).toEqual(['Barcelona', 'Munich'])
    expect(matchesArtistCity('Barcelona', [munich], 'Munich')).toBe(true)
    expect(matchesArtistCity('Barcelona', [munich], 'Berlin')).toBe(false)
    expect(matchesArtistCity('Barcelona', [munich], '')).toBe(true)
  })
})

describe('unionServiceAreas', () => {
  it('keeps both pages’ cities and drops the home city of the page that stays', () => {
    expect(unionServiceAreas([munich], [berlin, barcelona], 'barcelona')).toEqual([munich, berlin])
  })
})
