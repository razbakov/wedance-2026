import { describe, it, expect } from 'vitest'
import { cancelRecipients, isOver } from './eventCancel'

// RAZ-948: who gets the "cancelled" email.
describe('cancelRecipients', () => {
  const people = [
    { id: 'a', name: 'Ana Lopez', email: 'ana@example.com' },
    { id: 'b', name: 'Ben', email: 'BEN@example.com' },
    { id: 'org', name: 'Olga Organiser', email: 'olga@example.com' },
    { id: 'nomail', name: 'No Mail', email: null },
  ]

  it('emails each address once, by first name, and a ticket wins', () => {
    const r = cancelRecipients({
      dancers: [{ id: 'a', ticket: false }, { id: 'a', ticket: true }, { id: 'b', ticket: false }, { id: 'nomail', ticket: false }],
      emails: [{ email: 'ben@example.com', ticket: true }, { email: 'stub@example.com', ticket: true }, { email: 'not-an-email', ticket: false }],
      people,
    })
    expect(r).toEqual([
      { email: 'ana@example.com', name: 'Ana', ticket: true },
      { email: 'BEN@example.com', name: 'Ben', ticket: true },
      { email: 'stub@example.com', name: '', ticket: true },
    ])
  })

  it('never emails whoever cancelled it, also not by their email', () => {
    const r = cancelRecipients({
      dancers: [{ id: 'org', ticket: false }, { id: 'a', ticket: false }],
      emails: [{ email: 'Olga@Example.com', ticket: true }],
      people,
      exclude: 'org',
    })
    expect(r.map(x => x.email)).toEqual(['ana@example.com'])
  })

  it('nobody signed up → nobody to email', () => {
    expect(cancelRecipients({ dancers: [], emails: [], people: [] })).toEqual([])
  })

  it('it’s on again: skips both the canceller and whoever undoes it', () => {
    const r = cancelRecipients({
      dancers: [{ id: 'org', ticket: false }, { id: 'a', ticket: false }, { id: 'b', ticket: false }],
      emails: [{ email: 'ben@example.com', ticket: true }, { email: 'stub@example.com', ticket: true }],
      people,
      exclude: ['org', 'b', null as any],
    })
    expect(r.map(x => x.email)).toEqual(['ana@example.com', 'stub@example.com'])
  })
})

// RAZ-969: no "it's on again" email once the event is over.
describe('isOver', () => {
  const now = Date.parse('2026-11-15T20:00:00Z')
  it('uses the end, else the start', () => {
    expect(isOver({ startDate: '2026-11-15T18:00:00Z', endDate: '2026-11-15T23:00:00Z' }, now)).toBe(false)
    expect(isOver({ startDate: '2026-11-15T18:00:00Z', endDate: '2026-11-15T19:00:00Z' }, now)).toBe(true)
    expect(isOver({ startDate: '2026-11-15T18:00:00Z' }, now)).toBe(true)
    expect(isOver({ startDate: null, endDate: null }, now)).toBe(false)
  })
})
