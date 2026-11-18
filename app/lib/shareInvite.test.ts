import { describe, expect, it } from 'vitest'
import { eventNoun, shareMode, shareText, withReferral } from './shareInvite'

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
