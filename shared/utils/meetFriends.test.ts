import { describe, expect, it } from 'vitest'
import { meetVisibility } from './meetFriends'

const base = { profilePublic: true, photo: 'https://res.cloudinary.com/x.jpg' }
const night = { eventName: 'Salsa Night', city: 'Munich' }

describe('meetVisibility', () => {
  it('going out makes you visible, with the night', () => {
    expect(meetVisibility({ ...base, nextNight: night })).toEqual({
      shown: true, missing: [], text: 'You’re visible — others can see you’re going to Salsa Night.',
    })
  })

  it('a festival alone shows you to its dancers, and asks for a night out', () => {
    const v = meetVisibility({ ...base, festivalsShown: 1 })
    expect(v.shown).toBe(true)
    expect(v.missing).toEqual(['night'])
  })

  it('going nowhere keeps you out of every deck', () => {
    const v = meetVisibility(base)
    expect(v.shown).toBe(false)
    expect(v.missing).toEqual(['night'])
    expect(v.text).toBe('Others can’t see you yet. Go to a night out and you’ll show up here.')
  })

  it('no photo keeps you out, even when going — the photo comes first', () => {
    const v = meetVisibility({ ...base, photo: '  ', profilePublic: false, nextNight: night })
    expect(v.shown).toBe(false)
    expect(v.missing).toEqual(['photo', 'public'])
    expect(v.text).toBe('Add a photo so other dancers can see you here.')
  })

  it('a private profile keeps you out; null counts as public', () => {
    expect(meetVisibility({ ...base, profilePublic: false, nextNight: night }).missing).toEqual(['public'])
    expect(meetVisibility({ ...base, profilePublic: null, nextNight: night }).shown).toBe(true)
  })
})
