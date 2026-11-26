import { describe, expect, it } from 'vitest'
import type { ProfileSite } from '../types/profileSite'
import { cityFromSignup, enableInterestCityField, matchCity, shouldMovePromoToCity, takeSignupCity, type CityRow } from './contactCity'

const city = (over: Partial<CityRow> & Pick<CityRow, 'id' | 'name'>): CityRow => ({
  localName: null, slug: over.name.toLowerCase(), altNames: [], ...over,
})

describe('takeSignupCity', () => {
  it('prefers the city field and does not leave it in the source', () => {
    const source = { form: 'sites.wedance.vip', city: 'Berlin', promo_code: 'SUMMER' }
    expect(takeSignupCity('Munich', source)).toBe('Munich')
    expect(source).toEqual({ form: 'sites.wedance.vip', promo_code: 'SUMMER' })
  })
  it('lifts a city that arrived only inside the source', () => {
    const source = { city: '  Hamburg ' }
    expect(takeSignupCity('', source)).toBe('Hamburg')
    expect(source).toEqual({})
  })
})

describe('cityFromSignup', () => {
  it('keeps a real city field and a promo code apart', () => {
    const source = { form: 'sites.wedance.vip', promo_code: 'SUMMER' }
    expect(cityFromSignup('los.filinsclub', 'Berlin', source)).toEqual({
      city: 'Berlin',
      source: { form: 'sites.wedance.vip', promo_code: 'SUMMER' },
    })
  })
  it('treats the los.filinsclub promo code as the city until the form field ships', () => {
    const source = { form: 'sites.wedance.vip', page: '/los.filinsclub', promo_code: ' Munich ' }
    expect(cityFromSignup('los.filinsclub', '', source)).toEqual({
      city: 'Munich',
      source: { form: 'sites.wedance.vip', page: '/los.filinsclub' },
    })
  })
  it('does not take a promo code from another page', () => {
    const source = { promo_code: 'SUMMER' }
    expect(cityFromSignup('other', '', source)).toEqual({ city: '', source: { promo_code: 'SUMMER' } })
  })
})

describe('matchCity (RAZ-1093)', () => {
  const munich = city({ id: 'm', name: 'Munich', localName: 'München', slug: 'munich', altNames: ['Muenchen'] })
  const parisFr = city({ id: 'pf', name: 'Paris', slug: 'paris-fr' })
  const parisTx = city({ id: 'pt', name: 'Paris', slug: 'paris-tx' })

  it('links a unique name, local name, slug or alternate name', () => {
    expect(matchCity('  Munich ', [munich])?.id).toBe('m')
    expect(matchCity('münchen', [munich])?.id).toBe('m')
    expect(matchCity('muenchen', [munich])?.id).toBe('m')
    expect(matchCity('munich', [munich])?.id).toBe('m')
  })

  it('stays free text when nothing matches or the name is shared', () => {
    expect(matchCity('Havana', [munich])).toBeNull()
    expect(matchCity('Paris', [parisFr, parisTx])).toBeNull()
    expect(matchCity('   ', [munich])).toBeNull()
  })
})

describe('shouldMovePromoToCity', () => {
  const row = (over: Partial<Parameters<typeof shouldMovePromoToCity>[0]> = {}) => ({
    username: 'los.filinsclub',
    promoCode: 'Munich',
    city: null as string | null,
    source: { form: 'sites.wedance.vip', page: '/los.filinsclub', promo_code: 'Munich' },
    ...over,
  })

  it('moves a promo code typed on the los.filinsclub site form when city is empty', () => {
    expect(shouldMovePromoToCity(row())).toBe(true)
    expect(shouldMovePromoToCity(row({ promoCode: '  Berlin  ' }))).toBe(true)
  })

  it('leaves real contacts, other pages and imports alone', () => {
    expect(shouldMovePromoToCity(row({ username: 'other' }))).toBe(false)
    expect(shouldMovePromoToCity(row({ promoCode: '  ' }))).toBe(false)
    expect(shouldMovePromoToCity(row({ city: 'Munich' }))).toBe(false)
    expect(shouldMovePromoToCity(row({ source: { from: 'hubspot', hubspot_origin: 'import', promo_code: 'SUMMER' } }))).toBe(false)
    expect(shouldMovePromoToCity(row({ source: { from: 'wedance-v3', promo_code: 'OLD' } }))).toBe(false)
  })
})

describe('enableInterestCityField', () => {
  const site = (): ProfileSite => ({
    locales: ['en'],
    sections: [
      { id: 'hero', kind: 'hero', title: { en: 'Los Filin' } },
      { id: 'mhbks74k', kind: 'signup', anchor: 'interest', title: { en: 'Want Los Filin in your city?' } },
      { id: 'other', kind: 'signup', anchor: 'join', title: { en: 'Join' } },
    ],
  })

  it('turns on City with its label and hides the promo code on the interest form only', () => {
    const next = enableInterestCityField(site())
    expect(next.sections[0]).toEqual(site().sections[0])
    expect(next.sections[1]).toMatchObject({
      city: { label: { en: 'Your city' } },
      hidePromo: true,
    })
    expect(next.sections[2]).toEqual(site().sections[2])
  })

  it('keeps a label the owner already wrote', () => {
    const s = site()
    s.sections[1] = { ...s.sections[1]!, city: { label: { en: 'Stadt', de: 'Stadt' } } }
    expect(enableInterestCityField(s).sections[1]!.city).toEqual({ label: { en: 'Stadt', de: 'Stadt' } })
  })
})
