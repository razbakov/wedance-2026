/**
 * A city on a site sign-up (RAZ-1093). Fans type whatever city they mean —
 * demand often comes from places WeDance has no page for — and we keep those
 * words. A unique match against the cities table is stored beside them, so a
 * later service area (RAZ-1083) can use it. Two cities with the same name
 * (Paris, France and Paris, Texas) stay unmatched.
 */
import type { ProfileSite, SiteSection } from '../types/profileSite'

export type CityRow = {
  id: string
  name: string
  localName: string | null
  slug: string
  altNames: string[]
}

const key = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/**
 * The city from a sign-up: the field itself, else a `source.city` a caller
 * tucked in. Taken off `source` so it is not only loose metadata.
 */
export function takeSignupCity(bodyCity: string | undefined, source: Record<string, string>): string {
  const city = (bodyCity || source.city || '').trim()
  delete source.city
  return city
}

/** The one city `text` names, or null when it names none or more than one. */
export function matchCity(text: string, cities: readonly CityRow[]): { id: string } | null {
  const q = key(text)
  if (!q) return null
  const ids = new Set<string>()
  for (const c of cities) {
    const names = [c.name, c.localName, c.slug, ...c.altNames]
    if (names.some(n => key(n) === q)) ids.add(c.id)
  }
  if (ids.size !== 1) return null
  return { id: [...ids][0]! }
}

/**
 * The stopgap on los.filinsclub stored cities in the promo code of that
 * site's only sign-up form. Imported lists (HubSpot, wedance.vip) are not
 * that form, and a contact that already has a city is left as it is.
 */
export function shouldMovePromoToCity(row: {
  username: string
  promoCode?: string | null
  city?: string | null
  source?: Record<string, string> | null
}): boolean {
  const promo = (row.promoCode ?? row.source?.promo_code ?? '').trim()
  if (row.username !== 'los.filinsclub' || !promo || (row.city ?? '').trim()) return false
  const from = row.source?.from
  if (from === 'hubspot' || from === 'wedance-v3' || row.source?.hubspot_origin) return false
  return true
}

const INTEREST = (s: SiteSection) => s.kind === 'signup' && (s.anchor === 'interest' || s.id === 'mhbks74k')

/** The los.filinsclub interest form: real City field, promo code hidden. */
export function enableInterestCityField(site: ProfileSite): ProfileSite {
  return {
    ...site,
    sections: site.sections.map((s) => {
      if (!INTEREST(s)) return s
      const label = s.city?.label
      return {
        ...s,
        city: { label: label && Object.keys(label).length ? label : { en: 'Your city' } },
        hidePromo: true,
      }
    }),
  }
}
