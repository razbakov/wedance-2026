import { describe, expect, it } from 'vitest'
import { meetVisibility } from './meetFriends'

const base = { profilePublic: true, photo: 'https://res.cloudinary.com/x.jpg', city: 'Munich' }

describe('meetVisibility', () => {
  it('a public profile with a photo is shown to dancers in the same city', () => {
    const v = meetVisibility(base)
    expect(v).toEqual({ shown: true, missing: [], text: 'Dancers in Munich see you in their deck too.' })
  })

  it('without a city you are shown, but not as a local', () => {
    const v = meetVisibility({ ...base, city: '  ' })
    expect(v.shown).toBe(true)
    expect(v.missing).toEqual(['city'])
    expect(v.text).toContain('add your city in Settings')
  })

  it('no photo keeps you out of every deck', () => {
    const v = meetVisibility({ ...base, photo: '  ' })
    expect(v.shown).toBe(false)
    expect(v.missing).toEqual(['photo'])
    expect(v.text).toBe("Other dancers can't see you here yet: add a photo in Settings.")
  })

  it('a private profile keeps you out; null counts as public', () => {
    expect(meetVisibility({ ...base, profilePublic: false }).missing).toEqual(['public'])
    expect(meetVisibility({ ...base, profilePublic: null }).shown).toBe(true)
  })

  it('lists both fixes, photo first', () => {
    const v = meetVisibility({ ...base, photo: null, profilePublic: false, city: null })
    expect(v.missing).toEqual(['photo', 'public'])
    expect(v.text).toBe("Other dancers can't see you here yet: add a photo and turn on Public profile in Settings.")
  })
})
