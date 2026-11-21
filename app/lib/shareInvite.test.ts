import { describe, expect, it } from 'vitest'
import { eventNoun, shareMode, shareText, storyAfterBooking, withReferral } from './shareInvite'

// Saturday 21 Nov 2026, 18:00 UTC. Week on My plan is today and the next six days.
const NOW = new Date('2026-11-21T18:00:00Z')
const TZ = 'Europe/Berlin'

describe('shareMode', () => {
  it('sends the event when the schedule has one item', () => {
    expect(shareMode(1, 1)).toBe('event')
    expect(shareMode(1, 0)).toBe('event')
  })
  it('sends the event when nothing is picked yet', () => {
    expect(shareMode(12, 0)).toBe('event')
  })
  it('sends the plan when workshops are picked', () => {
    expect(shareMode(12, 3)).toBe('plan')
  })
})

describe('eventNoun', () => {
  it('names classes, festivals and the rest', () => {
    expect(eventNoun('Class')).toBe('class')
    expect(eventNoun('course')).toBe('class')
    expect(eventNoun('Congress')).toBe('festival')
    expect(eventNoun(null)).toBe('festival')
    expect(eventNoun('party')).toBe('event')
  })
})

describe('withReferral', () => {
  it('adds ref only when there is a discount', () => {
    expect(withReferral('https://x/events/a', 'alex', 0)).toBe('https://x/events/a')
    expect(withReferral('https://x/events/a', 'alex', 10)).toBe('https://x/events/a?ref=alex')
    expect(withReferral('https://x/events/a?invite=t', 'a b', 10)).toBe('https://x/events/a?invite=t&ref=a%20b')
    expect(withReferral('https://x/events/a', '', 10)).toBe('https://x/events/a')
  })
})

describe('shareText', () => {
  it('words the plan and the event', () => {
    expect(shareText('plan', 'DDF', 1)).toBe('My plan for DDF: 1 workshop. Join me?')
    expect(shareText('plan', 'DDF', 4)).toBe('My plan for DDF: 4 workshops. Join me?')
    expect(shareText('event', 'Casino Partnerwork', 0)).toBe('Join me at Casino Partnerwork?')
  })
})

describe('storyAfterBooking', () => {
  const booked = { booked: true, signedIn: true, now: NOW, timezone: TZ }

  it('says nothing before they have booked, and nothing to someone signed out', () => {
    expect(storyAfterBooking({ ...booked, booked: false, type: 'party', startDate: '2026-11-22T20:00:00Z' })).toBeNull()
    expect(storyAfterBooking({ ...booked, signedIn: false, type: 'party', startDate: '2026-11-22T20:00:00Z' })).toBeNull()
  })

  it('sends a night this week to My plan’s week story', () => {
    // Friday night in Berlin is still inside today + 6 days.
    const prompt = storyAfterBooking({ ...booked, type: 'party', startDate: '2026-11-27T22:00:00Z' })
    expect(prompt).toMatchObject({
      href: '/my-plan#share-week',
      where: 'week',
      label: 'Tell your story',
    })
    expect(prompt?.line).toMatch(/going/i)
    expect(prompt?.line).not.toMatch(/coming with friends/i)
  })

  it('sends a later festival to the year story, and a later party nowhere', () => {
    const later = '2026-12-18T18:00:00Z'
    expect(storyAfterBooking({ ...booked, type: 'congress', startDate: later })?.href).toBe('/my-plan#share-year')
    expect(storyAfterBooking({ ...booked, type: 'party', isFestival: true, startDate: later })?.where).toBe('year')
    expect(storyAfterBooking({ ...booked, type: 'party', startDate: later })).toBeNull()
  })

  it('offers no story for a class, even this week', () => {
    for (const type of ['class', 'course', 'practica', 'workshop']) {
      expect(storyAfterBooking({ ...booked, type, startDate: '2026-11-22T18:00:00Z' })).toBeNull()
    }
  })

  it('treats a night with no date as this week', () => {
    expect(storyAfterBooking({ ...booked, type: 'social' })?.where).toBe('week')
  })

  it('sends a festival that already started to the year, and skips a party that already started', () => {
    const started = '2026-11-19T18:00:00Z'
    expect(storyAfterBooking({ ...booked, type: 'festival', startDate: started })?.where).toBe('year')
    expect(storyAfterBooking({ ...booked, type: 'party', startDate: started })).toBeNull()
  })
})
