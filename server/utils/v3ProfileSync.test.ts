import { describe, it, expect } from 'vitest'
import { addressKey, isAddressName, planProfiles, toSocials, type ExistingProfile } from './v3ProfileSync'
import { buildCityIndex } from './v3EventSync'

const MUNICH = 'ChIJ2V-Mo_l1nkcRfZixfUq4DAE'
const cityIndex = buildCityIndex([{ city: 'Munich', citySlug: 'munich' }])
const venue = (name: string, address: string, extra: Record<string, any> = {}) => ({
  name, formatted_address: address,
  address_components: [{ long_name: 'München', types: ['locality'] }, { long_name: 'Germany', short_name: 'DE', types: ['country'] }],
  geometry: { location: { lat: 48.14, lng: 11.55 } }, ...extra,
})
const ev = (id: string, v: any, org: any = null, artists: any[] = []) => ({ id, type: 'event', name: 'E', startDate: 2e12, place: MUNICH, venue: v, org, artists })
const row = (p: Partial<ExistingProfile>): ExistingProfile => ({
  id: p.username!, type: 'venue', name: '', city: 'Munich', citySlug: 'munich', photo: null, bio: null, styles: [],
  address: null, socials: [], claimed: false, sourceRef: null, ...p, username: p.username!,
})
const run = (events: any[], existing: ExistingProfile[], v3Profiles: any[] = []) =>
  planProfiles({ events, eligibleIds: new Set(events.map(e => e.id)), v3Profiles, existing, takenHandles: new Set(), cityIndex, placeLocality: new Map([[MUNICH, 'München']]) })

describe('helpers', () => {
  it('normalises street addresses for matching', () => {
    expect(addressKey('Arnulfstraße 195, 80634 München, Germany')).toBe('arnulfstrasse 195')
    expect(addressKey('Arnulfstr. 195, München')).toBe('arnulfstrasse 195')
    expect(addressKey('Hofgarten, München')).toBeNull()
  })
  it('detects address-only venue names', () => {
    expect(isAddressName('Arnulfstraße 195', 'Arnulfstraße 195, 80634 München')).toBe(true)
    expect(isAddressName('Buena Vista Bar', 'Herzog-Wilhelm-Str. 8, München')).toBe(false)
  })
  it('keeps only public social links, turning handles into URLs', () => {
    expect(toSocials({ instagram: 'salsea', facebook: 'https://facebook.com/x', email: 'a@b.c', phone: '+49', whatsapp: '1' }))
      .toEqual([{ platform: 'instagram', url: 'https://instagram.com/salsea' }, { platform: 'facebook', url: 'https://facebook.com/x' }])
  })
})

describe('planProfiles — venues', () => {
  it('links by Google place id (v4 venue handle convention)', () => {
    const p = run([ev('e1', venue('Club', 'X 1, München', { place_id: 'ChIJabc' }))], [row({ username: 'ChIJabc', name: 'Club Old' })])
    expect(p.links.get('e1')!.venueUsername).toBe('ChIJabc')
    expect(p.ops.filter(o => o.op === 'create')).toHaveLength(0)
  })
  it('links by name + city, then by address + city', () => {
    const p = run([
      ev('e1', venue('Buena Vista Bar', 'Herzog-Wilhelm-Straße 8, München')),
      ev('e2', venue('Arnulfstraße 195', 'Arnulfstraße 195, 80634 München')),
    ], [row({ username: 'bvb', name: 'Buena Vista Bar' }), row({ username: 'kizztalk', name: 'Kizztalk', address: 'Arnulfstr. 195, 80634 München' })])
    expect(p.links.get('e1')!.venueUsername).toBe('bvb')
    expect(p.links.get('e2')!.venueUsername).toBe('kizztalk')
    expect(p.how.venue).toMatchObject({ 'name+city': 1, 'address+city': 1 })
  })
  it('matches a contained venue name ("Dianatempel, Hofgarten" → "Dianatempel")', () => {
    const p = run([ev('e1', venue('Dianatempel, Hofgarten', 'Dianatempel, Hofgarten, 80538 München'))], [row({ username: 'dt', name: 'Dianatempel' })])
    expect(p.links.get('e1')!.venueUsername).toBe('dt')
  })
  it('creates one venue named from the address and reuses it for every event there', () => {
    const v = venue('Arnulfstraße 195', 'Arnulfstraße 195, 80634 München, Germany')
    const p = run([ev('e1', v), ev('e2', v)], [])
    const creates = p.ops.filter(o => o.op === 'create')
    expect(creates).toHaveLength(1)
    expect(creates[0]!.op === 'create' && creates[0]!.fields).toMatchObject({ type: 'venue', name: 'Arnulfstraße 195', citySlug: 'munich', sourceRef: { source: 'wedance-v3' } })
    expect(p.links.get('e1')!.venueUsername).toBe(p.links.get('e2')!.venueUsername)
    expect(p.createdFromAddress).toEqual(['Arnulfstraße 195 (Munich)'])
  })
  it('reads the street out of "Venue Name, Street 4, 80799 München"', () => {
    expect(addressKey('Salsamás Maxvorstadt, Schnorrstr. 4, 80799 München')).toBe('schnorrstrasse 4')
  })
  it('uses the organiser profile as venue when the school hosts its own classes', () => {
    const p = run([ev('e1', venue('Mike Dance Tanzschule', 'Klausenburger Str. 9, 81677 München'), { id: 'm1', username: 'mikedancetanzschule' })],
      [row({ username: 'mikedancetanzschule', type: 'organizer', name: 'Mike Dance Tanzschule München', sourceRef: { firebaseId: 'm1' } })])
    expect(p.links.get('e1')).toMatchObject({ venueUsername: 'mikedancetanzschule', organizerUsername: 'mikedancetanzschule' })
    expect(p.ops.filter(o => o.op === 'create')).toHaveLength(0)
  })
  it('never writes to a claimed profile', () => {
    const p = run([ev('e1', venue('Buena Vista Bar', 'Herzog-Wilhelm-Straße 8, München'))], [row({ username: 'bvb', name: 'Buena Vista Bar', claimed: true })])
    expect(p.links.get('e1')!.venueUsername).toBe('bvb')
    expect(p.ops).toHaveLength(0)
  })
})

describe('planProfiles — organisers & artists', () => {
  const v = venue('Buena Vista Bar', 'Herzog-Wilhelm-Straße 8, München')
  it('links an organiser by v3 profile id (source_ref.firebaseId) and only fills empty fields', () => {
    const p = run([ev('e1', v, { id: 'v3org', username: 'MontunoClub', name: 'Montuno Club', photo: 'https://img/x.png' })],
      [row({ username: 'montunoclub', type: 'organizer', name: 'MontunoClub', bio: 'mine', sourceRef: { firebaseId: 'v3org' } })],
      [{ id: 'v3org', type: 'Organiser', username: 'MontunoClub', name: 'Montuno Club', photo: 'https://img/x.png', bio: 'theirs', visibility: 'Public', place: MUNICH, email: 'x@y.z', phone: '1' }])
    expect(p.links.get('e1')!.organizerUsername).toBe('montunoclub')
    const fill = p.ops.find(o => o.op === 'fill')!
    expect(fill.fields).toMatchObject({ photo: 'https://img/x.png' })
    expect((fill.fields as any).bio).toBeUndefined() // not empty → untouched
    expect((fill.fields as any).name).toBeUndefined() // never renamed
    expect(JSON.stringify(p.ops)).not.toMatch(/x@y\.z|"phone"/)
  })
  it('creates an unclaimed organiser from a public v3 profile and never links the seeding bot', () => {
    const p = run([ev('e1', v, { id: 'o2', username: 'NewSchool' }), ev('e2', v, { username: 'wedance-bot' })], [],
      [{ id: 'o2', type: 'Organiser', username: 'NewSchool', name: 'New School', visibility: 'Public', place: MUNICH, instagram: 'newschool' }])
    expect(p.links.get('e1')!.organizerUsername).toBe('newschool')
    expect(p.links.get('e2')!.organizerUsername).toBeNull()
    const c = p.ops.find(o => o.op === 'create' && o.fields.type === 'organizer')!
    expect(c.op === 'create' && c.fields).toMatchObject({ name: 'New School', citySlug: 'munich', socials: [{ platform: 'instagram', url: 'https://instagram.com/newschool' }], sourceRef: { source: 'wedance-v3', sourceId: 'o2' } })
  })
  it('skips private (Members-only) v3 artists that no public event names', () => {
    const p = run([ev('e1', v)], [], [{ id: 'a1', type: 'Artist', username: 'hidden', name: 'Hidden', visibility: 'Members', place: MUNICH }])
    expect(p.stats.artist.skippedPrivate).toBe(1)
    expect(p.ops.filter(o => o.op === 'create' && o.fields.type === 'artist')).toHaveLength(0)
  })
  it('links artists named on the event', () => {
    const p = run([ev('e1', v, null, [{ id: 'a2', username: 'Migo.bachatero', name: 'Migo' }])], [],
      [{ id: 'a2', type: 'Artist', username: 'Migo.bachatero', name: 'Migo', visibility: 'Public', place: MUNICH }])
    expect(p.links.get('e1')!.artists).toEqual(['migo.bachatero'])
  })
})
