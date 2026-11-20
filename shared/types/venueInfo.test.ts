import { describe, it, expect } from 'vitest'
import { cleanVenueInfo, venueHints, lineBadgeInk, venueInfoToForm, venueInfoFromForm } from './venueInfo'
import { mergeVenueInfo } from '../../server/utils/venueInfo'

describe('venue hints (RAZ-1012)', () => {
  const DDF = { transit: { line: 'S2', color: '#76B82A', stop: 'Dachau Bahnhof', detail: '20 min walk or 5 min by bus' }, parking: { text: 'Garage next door', detail: 'Entrance by the Audi dealership' }, indoorShoesOnly: true, cloakroom: 'no' as const }

  it('shows one row per filled-in hint, in order, the missing cloakroom struck through', () => {
    expect(venueHints(DDF)).toEqual([
      { kind: 'transit', title: 'Dachau Bahnhof', detail: '20 min walk or 5 min by bus', line: 'S2', color: '#76b82a' },
      { kind: 'parking', title: 'Garage next door', detail: 'Entrance by the Audi dealership' },
      { kind: 'shoes', title: 'Indoor dance shoes only', detail: 'Bring a pair to change into' },
      { kind: 'cloakroom', title: 'Cloakroom', missing: true },
    ])
  })

  it('a venue with none, or a cloakroom that exists, shows nothing', () => {
    expect(venueHints(null)).toEqual([])
    expect(venueHints({})).toEqual([])
    expect(venueHints({ cloakroom: 'yes', indoorShoesOnly: false })).toEqual([])
  })

  it('drops empty parts and bad colours; a colour needs a line', () => {
    expect(cleanVenueInfo({ transit: { stop: '  ', line: 'S2' }, parking: { text: '' } })).toEqual({})
    expect(cleanVenueInfo({ transit: { stop: 'Odeonsplatz', line: 'U3', color: 'orange' } })).toEqual({ transit: { stop: 'Odeonsplatz', line: 'U3' } })
    expect(cleanVenueInfo({ transit: { stop: 'Odeonsplatz', color: '#ff0000' } })).toEqual({ transit: { stop: 'Odeonsplatz' } })
    expect(cleanVenueInfo({ cloakroom: 'maybe', indoorShoesOnly: 'yes' })).toEqual({})
  })

  it('the badge text stays readable: white on S-Bahn green, dark on U-Bahn yellow', () => {
    expect(lineBadgeInk('#76b82a')).toBe('#ffffff')
    expect(lineBadgeInk('#f9dd00')).toBe('#111111')
    expect(lineBadgeInk(undefined)).toBe('#ffffff')
  })

  it('the form round-trips, and clearing a field clears that hint', () => {
    const f = venueInfoToForm(DDF)
    expect(cleanVenueInfo(venueInfoFromForm(f))).toEqual(cleanVenueInfo(DDF))
    const cleared = venueInfoFromForm({ ...f, parking: '', cloakroom: '' })
    expect(cleanVenueInfo(mergeVenueInfo(DDF, cleared))).toEqual(cleanVenueInfo({ transit: DDF.transit, indoorShoesOnly: true }))
  })

  it('a partial update keeps the parts it doesn’t name', () => {
    expect(mergeVenueInfo(DDF, { cloakroom: null })).toEqual({ transit: DDF.transit, parking: DDF.parking, indoorShoesOnly: true })
    expect(mergeVenueInfo({}, { indoorShoesOnly: true })).toEqual({ indoorShoesOnly: true })
  })
})
