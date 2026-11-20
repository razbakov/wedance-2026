import { describe, expect, it } from 'vitest'
import { entryNoun, entryWords } from './entryWord'

describe('entryNoun', () => {
  it('calls a party or class tickets', () => {
    for (const type of ['Party', 'Workshop', 'Course', 'Concert', 'Show', 'class', 'party', '']) {
      expect(entryNoun({ type })).toBe('ticket')
    }
    expect(entryNoun({})).toBe('ticket')
    expect(entryNoun({ isFestival: false, type: 'Party' })).toBe('ticket')
  })

  it('keeps passes for a festival, weekender or congress', () => {
    for (const type of ['Festival', 'Weekender', 'Congress', 'festival', 'weekender']) {
      expect(entryNoun({ type })).toBe('pass')
    }
    expect(entryNoun({ isFestival: true, type: 'Party' })).toBe('pass')
  })

  it('gives the sentence its four forms', () => {
    expect(entryWords('ticket')).toEqual({ one: 'ticket', One: 'Ticket', many: 'tickets', Many: 'Tickets' })
    expect(entryWords('pass')).toEqual({ one: 'pass', One: 'Pass', many: 'passes', Many: 'Passes' })
  })
})
