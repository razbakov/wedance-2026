import { describe, expect, it } from 'vitest'
import { meetEntryLine, toMeetCards, type DiscoverCardIn } from './meetDeck'

const dancer = (over: Record<string, unknown>): DiscoverCardIn => ({
  kind: 'dancer-going-out', targetKind: 'dancer', targetId: 'd1',
  dancerName: 'Tanja', dancerPhoto: 'p.jpg', dancerCity: 'Munich', dancerStyles: ['Salsa'],
  eventId: '0b8c7a52-1111-4222-8333-444455556666', eventName: 'Salsa Night', eventDateISO: '2026-11-20T20:00:00Z', eventTimezone: 'Europe/Berlin', eventVenue: 'La Rumba',
  ...over,
} as DiscoverCardIn)

describe('toMeetCards', () => {
  it('keeps people only — festival and social cards live in My plan', () => {
    const cards = toMeetCards([
      dancer({}),
      { kind: 'event-social', targetKind: 'event', targetId: 'e1' },
      { kind: 'event-festival', targetKind: 'festival', targetId: 'f1' },
    ], { styles: ['Salsa'] })
    expect(cards.map(c => c.id)).toEqual(['dancer:d1'])
  })

  it('stores decisions against the dancer, with the festival they were met through', () => {
    const [card] = toMeetCards([dancer({ kind: 'dancer-your-fest', festivalSlug: 'meneate', festivalName: 'Menéate' })], {})
    expect(card!.target).toEqual({ kind: 'dancer', id: 'd1', festivalSlug: 'meneate' })
    expect(card!.reason).toBe('Also going to Menéate — you\'ll be at the same festival.')
  })

  it('a night out leads to the night, in its own zone', () => {
    const [card] = toMeetCards([dancer({})], { styles: ['Salsa'] })
    expect(card!.kind).toBe('dancer-going-out')
    expect(card && 'night' in card ? card.night : null).toEqual({
      path: '/events/salsa-night-0b8c7a52', name: 'Salsa Night', when: 'Fri 21:00', venue: 'La Rumba',
    })
    expect(card!.reason).toBe('Going to Salsa Night. Join them, and you\'ll meet there. You both dance Salsa.')
  })

  it('says when you are going to the same night', () => {
    const [card] = toMeetCards([dancer({ kind: 'dancer-same-night', dancerStyles: ['Tango'] })], { styles: ['Salsa'] })
    expect(card!.reason).toBe('You\'re both going to Salsa Night — say hi there.')
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
    expect(meetEntryLine(null)).toMatch(/^Dancers going out near you/)
    expect(meetEntryLine(0)).toMatch(/^Nobody new is going out yet/)
    expect(meetEntryLine(1)).toMatch(/^1 dancer going out/)
    expect(meetEntryLine(13)).toMatch(/^13 dancers going out/)
  })
})
