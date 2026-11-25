import { describe, expect, it } from 'vitest'
import {
  ARTIST_SERVICES,
  artistOfferIsEmpty,
  artistOfferToForm,
  artistServiceLabel,
  cleanArtistOffer,
  fillArtistOffer,
  mergeArtistOffer,
  saveArtistOffer,
} from './artistOffer'

const stated = {
  songs: [
    { title: 'El cuarto de Tula', by: 'Los Van Van', url: 'https://youtu.be/tula' },
    { title: 'Candela', url: 'https://open.spotify.com/track/abc' },
  ],
  services: ['live_show', 'wedding'] as const,
  pricing: 'Wedding set from €1,200. Other formats on request.',
}

describe('artist offer (RAZ-1084)', () => {
  it('names the services an organizer can book', () => {
    expect(ARTIST_SERVICES.map(s => s.label)).toEqual([
      'Live show', 'Animation', 'DJ set', 'Wedding set', 'Party set',
    ])
    expect(artistServiceLabel('dj_set')).toBe('DJ set')
  })

  it('keeps a song list, the chosen services and a price the artist wrote', () => {
    expect(cleanArtistOffer({
      songs: [
        { title: '  El cuarto de Tula  ', by: ' Los Van Van ', url: 'https://youtu.be/tula' },
        { title: 'Candela', url: 'https://open.spotify.com/track/abc' },
      ],
      services: ['party', 'live_show', 'live_show'],
      pricing: '  Wedding set from €1,200. Other formats on request.  ',
    })).toEqual({
      songs: stated.songs,
      services: ['live_show', 'party'],
      pricing: stated.pricing,
    })
  })

  it('drops a blank title, a repeated song and a link that is not a web address', () => {
    expect(cleanArtistOffer({
      songs: [
        { title: '   ', by: 'Someone' },
        { title: 'Candela', url: 'javascript:alert(1)' },
        { title: 'Candela', url: 'javascript:alert(1)' },
        { title: 'Candela', url: 'not a link' },
      ],
      services: ['corporate', 'animation'],
      pricing: '   ',
    })).toEqual({
      songs: [{ title: 'Candela' }],
      services: ['animation'],
      pricing: '',
    })
  })

  it('an empty page states nothing, and never invents a price from the services', () => {
    expect(cleanArtistOffer(null)).toEqual({ songs: [], services: [], pricing: '' })
    expect(cleanArtistOffer({ services: ['wedding', 'party'] }).pricing).toBe('')
    expect(artistOfferIsEmpty(cleanArtistOffer({}))).toBe(true)
    expect(artistOfferIsEmpty(cleanArtistOffer(stated))).toBe(false)
  })

  it('a partial save changes only the part that was sent', () => {
    expect(mergeArtistOffer(stated, { pricing: '' })).toEqual({ ...stated, pricing: '' })
    expect(mergeArtistOffer(stated, { services: ['dj_set'] }).songs).toEqual(stated.songs)
    expect(mergeArtistOffer(stated, { songs: [] }).services).toEqual(['live_show', 'wedding'])
    expect(mergeArtistOffer(stated, {})).toEqual(cleanArtistOffer(stated))
  })

  it('a merge keeps the surviving page’s own words and fills a part it left empty', () => {
    expect(fillArtistOffer(
      { songs: [], services: ['party'], pricing: '' },
      { songs: stated.songs, services: ['dj_set'], pricing: 'On request' },
    )).toEqual({ songs: stated.songs, services: ['party'], pricing: 'On request' })
    expect(fillArtistOffer(stated, { pricing: 'Cheaper', songs: [{ title: 'Other' }] })).toEqual(cleanArtistOffer(stated))
  })

  it('the editor keeps a missing “by” as an empty string', () => {
    expect(artistOfferToForm({ songs: [{ title: 'Candela', url: 'https://youtu.be/abc' }], services: ['party'], pricing: 'On request' })).toEqual({
      songs: [{ title: 'Candela', by: '', url: 'https://youtu.be/abc' }],
      services: ['party'],
      pricing: 'On request',
    })
  })

  it('only an artist page can store it', () => {
    expect(saveArtistOffer('artist', {}, { services: ['wedding'], pricing: 'On request' })).toEqual({
      songs: [], services: ['wedding'], pricing: 'On request',
    })
    expect(() => saveArtistOffer('venue', {}, { pricing: '€500' })).toThrow(/artist pages/)
  })
})
