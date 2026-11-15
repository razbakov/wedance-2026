import { describe, expect, it } from 'vitest'
import { meetEntryLine, toMeetCards, type DiscoverCardIn } from './meetDeck'

const dancer = (over: Partial<Extract<DiscoverCardIn, { targetKind: 'dancer' }>>): DiscoverCardIn => ({
  kind: 'dancer-local', targetKind: 'dancer', targetId: 'd1',
  dancerName: 'Tanja', dancerPhoto: 'p.jpg', dancerCity: 'Munich', dancerStyles: ['Salsa'],
  ...over,
})

describe('toMeetCards', () => {
  it('keeps people only — festival and social cards live in My plan', () => {
    const cards = toMeetCards([
      dancer({}),
      { kind: 'event-social', targetKind: 'event', targetId: 'e1' },
      { kind: 'event-festival', targetKind: 'festival', targetId: 'f1' },
    ], { city: 'Munich', styles: ['Salsa'] })
    expect(cards.map(c => c.id)).toEqual(['dancer:d1'])
  })

  it('stores decisions against the dancer, with the festival they were met through', () => {
    const [card] = toMeetCards([dancer({ kind: 'dancer-your-fest', festivalSlug: 'meneate', festivalName: 'Menéate' })], {})
    expect(card!.target).toEqual({ kind: 'dancer', id: 'd1', festivalSlug: 'meneate' })
    expect(card!.reason).toBe('Also going to Menéate — you\'ll be at the same festival.')
  })

  it('says what a local shares with you, and the city only when it is yours', () => {
    expect(toMeetCards([dancer({})], { city: 'munich', styles: ['Salsa'] })[0]!.reason).toBe('You both dance Salsa in Munich.')
    expect(toMeetCards([dancer({ dancerCity: 'Berlin' })], { city: 'Munich', styles: ['Salsa'] })[0]!.reason).toBe('You both dance Salsa.')
    expect(toMeetCards([dancer({ dancerStyles: ['Tango'] })], { city: 'Munich', styles: ['Salsa'] })[0]!.reason).toBe('')
  })

  it('names a festival you have not picked', () => {
    const [shared] = toMeetCards([dancer({ kind: 'dancer-new-fest', festivalSlug: 't', festivalName: 'Timba Fest' })], { styles: ['Salsa'] })
    expect(shared!.reason).toBe('Salsa dancer heading to Timba Fest — a festival not in your year yet.')
    const [other] = toMeetCards([dancer({ kind: 'dancer-new-fest', festivalSlug: 't', festivalName: 'Timba Fest' })], { styles: [] })
    expect(other!.reason).toBe('Heading to Timba Fest — a festival you haven\'t explored.')
  })
})

describe('meetEntryLine', () => {
  it('counts who is waiting', () => {
    expect(meetEntryLine(null)).toMatch(/^Dancers going where you go/)
    expect(meetEntryLine(0)).toMatch(/^No one new right now/)
    expect(meetEntryLine(1)).toMatch(/^1 dancer to meet/)
    expect(meetEntryLine(13)).toMatch(/^13 dancers to meet/)
  })
})
