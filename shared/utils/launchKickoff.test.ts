import { describe, it, expect } from 'vitest'
import { STEPS, VISIBLE_STEPS, stepByKey, copyText, doneBlocker } from './launch'
import {
  EMPTY_KNOWN, KICKOFF_KEYS, kickoffQuestions, kickoffPatches, kickoffSelection, knownFills,
  launchKnown, derivedDisplayName, encodePicks, decodePicks, mainVenueUsername,
  type LaunchKnown,
} from './launchKickoff'

const known: LaunchKnown = {
  ...EMPTY_KNOWN,
  profileName: 'Corazón Cubano',
  profileType: 'organizer',
  city: 'Munich',
  styles: ['Salsa', 'Bachata'],
  instagram: 'corazon',
  website: 'https://corazon.example',
  eventName: 'Thursday Social',
  night: 'Every Thursday',
  hours: '19:00–00:00',
  price: '€10',
  venueName: 'Luma',
  venueAddress: 'Neuhauser Str. 47',
  venueCity: 'Munich',
  venueInstagram: 'luma.munich',
}

describe('kickoff questions', () => {
  it('asks eight questions, in the same order, and the friend one is a sentence not a form', () => {
    const qs = kickoffQuestions(EMPTY_KNOWN, {})
    expect(qs.map(q => q.key)).toEqual([...KICKOFF_KEYS])
    expect(qs).toHaveLength(8)
    const friend = qs.find(q => q.key === 'friend')!
    expect(friend.prompt).toBe('When a friend asks what this night is, what do you say?')
    expect(friend.ownWords?.max).toBeLessThanOrEqual(140)
  })

  it('prefills the venue, the evening and the styles from what we already know', () => {
    const qs = kickoffQuestions(known, {})
    expect(kickoffSelection(qs.find(q => q.key === 'room')!, {}, [], {})).toEqual({ optionIds: ['venue'], custom: '' })
    expect(kickoffSelection(qs.find(q => q.key === 'when')!, {}, [], {}).optionIds).toEqual([expect.stringContaining('thursday')])
    expect(kickoffSelection(qs.find(q => q.key === 'dances')!, {}, [], {}).optionIds).toEqual(['salsa', 'bachata'])
    expect(kickoffSelection(qs.find(q => q.key === 'door')!, {}, [], {}).optionIds).toEqual(['10'])
    expect(kickoffSelection(qs.find(q => q.key === 'call')!, {}, [], {}).optionIds).toEqual(['page'])
  })

  it('a skipped question is not prefilled again', () => {
    const q = kickoffQuestions(known, {}).find(x => x.key === 'door')!
    expect(kickoffSelection(q, {}, ['door'], {}).optionIds).toEqual([])
  })

  it('the friend answers use only facts already given — no venue we were not told', () => {
    const withVenue = kickoffQuestions(EMPTY_KNOWN, { music: 'Salsa', venueName: 'Luma', placeName: 'La Clave' })
    const labels = withVenue.find(q => q.key === 'friend')!.options.map(o => o.label)
    expect(labels.some(l => l.includes('Luma'))).toBe(true)
    const without = kickoffQuestions(EMPTY_KNOWN, { music: 'Salsa', placeName: 'La Clave' })
    for (const o of without.find(q => q.key === 'friend')!.options) expect(o.label).not.toMatch(/Luma|Munich|€/)
  })

  it('with nothing known, the friend question does not invent a sentence', () => {
    const friend = kickoffQuestions(EMPTY_KNOWN, {}).find(q => q.key === 'friend')!
    expect(friend.options).toEqual([])
  })
})

describe('kickoff answers become fields, and nothing else', () => {
  const qs = () => kickoffQuestions(known, {})

  it('a tap writes only that question’s fields', () => {
    const q = qs().find(x => x.key === 'room')!
    const patches = kickoffPatches(q, { skip: false, optionIds: ['venue'] }, {})
    const keys = patches.flatMap(p => [...p.clear, ...Object.keys(p.set)])
    expect(new Set(keys)).toEqual(new Set(['venueName', 'address', 'city', 'venueInstagram']))
    expect(patches[0]!.set).toMatchObject({ venueName: 'Luma', address: 'Neuhauser Str. 47', venueInstagram: 'luma.munich' })
  })

  it('dances are joined in tap order into the music and the search words', () => {
    const q = qs().find(x => x.key === 'dances')!
    const patches = kickoffPatches(q, { skip: false, optionIds: ['bachata', 'salsa'] }, { placeName: 'La Clave' })
    const music = patches.find(p => p.step === 'brand.where')!.set.music
    expect(music).toBe('Bachata, Salsa')
    expect(patches.find(p => p.step === 'brand.pitch')!.set.searchWords).toBe('Bachata, Salsa')
    expect(patches.find(p => p.step === 'brand.where')!.set.displayName).toBe('La Clave – Bachata')
  })

  it('a skip clears the question and does not keep the prefill', () => {
    const q = qs().find(x => x.key === 'door')!
    const [patch] = kickoffPatches(q, { skip: true }, { price: '€10' })
    expect(patch!.set).toEqual({})
    expect(patch!.clear).toContain('price')
  })

  it('own words win, and stay inside the field’s limit', () => {
    const q = qs().find(x => x.key === 'friend')!
    const [patch] = kickoffPatches(q, { skip: false, optionIds: ['nope'], custom: 'x'.repeat(200) }, {})
    expect(patch!.set.pitchShort).toHaveLength(140)
  })

  it('“no separate brand” clears the brand instead of inventing one', () => {
    const q = kickoffQuestions(known, { placeName: 'La Clave' }).find(x => x.key === 'who')!
    const [patch] = kickoffPatches(q, { skip: false, optionIds: ['none'] }, { brandName: 'Old', brandInstagram: 'old' })
    expect(patch!.set).toEqual({})
    expect(patch!.clear).toEqual(expect.arrayContaining(['brandName', 'brandInstagram', 'brandWebsite']))
  })

  it('the drafts that follow use the answers and do not invent a price or a time', () => {
    const values = {
      placeName: 'La Clave', displayName: 'La Clave – Salsa', city: 'Munich',
      music: 'Salsa', searchWords: 'Salsa', pitchShort: 'Salsa at Luma', venueName: 'Luma',
    }
    const description = copyText(stepByKey('maps.description')!, stepByKey('maps.description')!.copy[0]!, values).text
    expect(description).toContain('Salsa at Luma')
    expect(description).toContain('Luma')
    expect(description).not.toMatch(/€|\d{2}:\d{2}|Thursday/)
    expect(copyText(stepByKey('maps.weekly_post')!, stepByKey('maps.weekly_post')!.copy[0]!, values).text).not.toMatch(/€|\d{2}:\d{2}/)
  })
})

describe('known facts', () => {
  it('reads the weekday, hours, price and venue from events, in the event’s zone', () => {
    const got = launchKnown(
      { username: 'corazon', name: 'Corazón Cubano', type: 'organizer', city: 'Munich', styles: ['Salsa'], instagram: '@corazon', website: '' },
      [
        { name: 'Thursday Social', start: '2026-11-19T18:00:00Z', end: '2026-11-19T23:00:00Z', timezone: 'Europe/Berlin', price: '€10', styles: ['Bachata', 'Salsa'], venueName: 'Luma', venueAddress: 'Neuhauser Str. 47', venueUsername: 'luma', city: 'Munich' },
        { name: 'Thursday Social', start: '2026-11-26T18:00:00Z', end: '2026-11-26T23:00:00Z', timezone: 'Europe/Berlin', price: '€10', styles: ['Salsa'], venueName: 'Luma', venueUsername: 'luma' },
      ],
      { name: 'Luma', address: 'Neuhauser Str. 47', city: 'Munich', instagram: 'luma.munich' },
    )
    expect(got.night).toBe('Every Thursday')
    expect(got.hours).toBe('19:00–00:00')
    expect(got.price).toBe('€10')
    expect(got.venueName).toBe('Luma')
    expect(got.venueInstagram).toBe('luma.munich')
    expect(got.styles.slice(0, 2)).toEqual(['Salsa', 'Bachata'])
    expect(got.instagram).toBe('corazon')
    expect(mainVenueUsername('corazon', 'organizer', [{ venueUsername: 'luma' }, { venueUsername: 'luma' }])).toBe('luma')
    expect(mainVenueUsername('luma', 'venue', [])).toBe('')
  })

  it('fills only empty fields, and only the brand link when the brand is the page', () => {
    const fills = knownFills(known, { brandName: 'Corazón Cubano', placeName: 'La Clave', searchWords: 'Salsa' })
    const flat = Object.assign({}, ...fills.map(f => f.set))
    expect(flat.city).toBe('Munich')
    expect(flat.igHandle).toBe('corazon')
    expect(flat.brandInstagram).toBe('corazon')
    expect(flat.brandWebsite).toBe('https://corazon.example')
    expect(flat.displayName).toBe('La Clave – Salsa')
    const again = knownFills(known, { ...flat, brandName: 'Someone else' })
    expect(Object.assign({}, ...again.map(f => f.set)).brandInstagram).toBeUndefined()
  })

  it('does not replace a display name the organiser already set', () => {
    expect(derivedDisplayName('La Clave', 'Salsa, Bachata')).toBe('La Clave – Salsa')
    const fills = knownFills(known, { placeName: 'La Clave', searchWords: 'Salsa', displayName: 'My own sign' })
    expect(fills.some(f => f.set.displayName)).toBe(false)
  })
})

describe('picks round-trip', () => {
  it('encodes and decodes tap ids', () => {
    expect(decodePicks(encodePicks({ dances: ['bachata', 'salsa'], who: ['none'] }))).toEqual({ dances: ['bachata', 'salsa'], who: ['none'] })
  })
})

describe('step kinds', () => {
  it('every visible step says who does it, and the login-bound ones are the you steps', () => {
    for (const s of VISIBLE_STEPS) expect(s.actor, s.key).toMatch(/^(we|approve|you)$/)
    expect(VISIBLE_STEPS.filter(s => s.actor === 'you').map(s => s.key)).toEqual([
      'maps.name', 'maps.basics', 'maps.reviews', 'ig.handle', 'ig.profile',
    ])
    expect(stepByKey('name.pick')!.actor).toBe('we')
    expect(VISIBLE_STEPS.filter(s => s.key.startsWith('listing.')).every(s => s.actor === 'approve' && !s.proof)).toBe(true)
    expect(stepByKey('kickoff')!.hidden).toBe(true)
    expect(STEPS.filter(s => s.hidden).map(s => s.key)).toEqual(['kickoff'])
  })

  it('approving a listing text does not wait on a live link; a login step still does', () => {
    expect(doneBlocker(stepByKey('listing.salsavida')!, [])).toBeNull()
    expect(doneBlocker(stepByKey('maps.name')!, [])).toMatch(/link/)
    expect(doneBlocker(stepByKey('ig.handle')!, [])).toMatch(/link/)
  })
})
