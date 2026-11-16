import { describe, expect, it } from 'vitest'
import { meetVisibility } from './meetFriends'

const base = { profilePublic: true, photo: 'https://res.cloudinary.com/x.jpg' }
const night = { eventName: 'Salsa Night', city: 'Munich' }

describe('meetVisibility', () => {
  it('going out puts you in the deck of everyone going out there', () => {
    expect(meetVisibility({ ...base, nextNight: night })).toEqual({
      shown: true, missing: [], text: "Dancers going out in Munich see you're going to Salsa Night.",
    })
  })

  it('adds the festivals you chose "Show me" for', () => {
    expect(meetVisibility({ ...base, nextNight: night, festivalsShown: 2 }).text)
      .toBe("Dancers going out in Munich see you're going to Salsa Night. Dancers going to your 2 festivals see you too.")
  })

  it('a festival alone shows you to its dancers, and asks for a night out', () => {
    const v = meetVisibility({ ...base, festivalsShown: 1 })
    expect(v.shown).toBe(true)
    expect(v.missing).toEqual(['night'])
    expect(v.text).toBe('Dancers going to your festival see you. Sign up to a night out and dancers here will too.')
  })

  it('going nowhere keeps you out of every deck', () => {
    const v = meetVisibility(base)
    expect(v.shown).toBe(false)
    expect(v.missing).toEqual(['night'])
    expect(v.text).toMatch(/^Nobody sees you here yet: sign up to a night out/)
  })

  it('no photo keeps you out, even when going', () => {
    const v = meetVisibility({ ...base, photo: '  ', nextNight: night })
    expect(v.shown).toBe(false)
    expect(v.missing).toEqual(['photo'])
    expect(v.text).toBe("Other dancers can't see you here yet: add a photo in Settings.")
  })

  it('a private profile keeps you out; null counts as public', () => {
    expect(meetVisibility({ ...base, profilePublic: false, nextNight: night }).missing).toEqual(['public'])
    expect(meetVisibility({ ...base, profilePublic: null, nextNight: night }).shown).toBe(true)
  })

  it('lists both fixes, photo first', () => {
    const v = meetVisibility({ photo: null, profilePublic: false })
    expect(v.missing).toEqual(['photo', 'public'])
    expect(v.text).toBe("Other dancers can't see you here yet: add a photo and turn on Public profile in Settings.")
  })
})
