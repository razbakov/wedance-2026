import { describe, it, expect } from 'vitest'
import { mergeSignups, signupDisplayName } from './rsvpPeople'

const people = [
  { id: 'a', name: 'Ana Lopez', photo: 'a.jpg', username: 'ana' },
  { id: 'b', name: 'Ben', photo: null, username: null },
  { id: 'c', name: 'Cat', photo: null, username: null },
]

describe('mergeSignups', () => {
  it('one row per dancer across poll, attendance and plan', () => {
    const rows = mergeSignups({
      polls: [{ dancerId: 'a', answer: 'needLeader', confirmed: true }],
      attendances: [{ dancerId: 'a', status: 'going', checkedIn: false }],
      plans: [{ dancerId: 'a' }, { dancerId: 'b' }],
      people,
    })
    expect(rows.map(r => [r.dancerId, r.answer])).toEqual([['a', 'needLeader'], ['b', null]])
    expect(rows[0]).toMatchObject({ name: 'Ana Lopez', photo: 'a.jpg', username: 'ana', confirmed: true })
  })

  it('marks tickets and check-ins, and keeps unclaimed ticket stubs nameless', () => {
    const rows = mergeSignups({
      polls: [],
      attendances: [
        { dancerId: 'c', status: 'ticket_holder', checkedIn: true },
        { dancerId: null, status: 'ticket_holder', checkedIn: false },
        { dancerId: 'b', status: 'interested', checkedIn: false },
      ],
      plans: [],
      people,
    })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ dancerId: 'c', ticket: true, checkedIn: true })
    expect(rows[1]).toMatchObject({ dancerId: null, name: null, ticket: true })
    expect(signupDisplayName(rows[1]!)).toBe('Ticket buyer')
  })

  it('lists signed-out answers as unconfirmed guests, after named people of the same answer', () => {
    const rows = mergeSignups({
      polls: [
        { dancerId: null, answer: 'needFollower', confirmed: false },
        { dancerId: 'b', answer: 'needFollower', confirmed: true },
        { dancerId: 'a', answer: 'partner', confirmed: true },
        { dancerId: 'c', answer: 'next', confirmed: true },
        { dancerId: null, answer: 'bogus', confirmed: false },
      ],
      attendances: [],
      plans: [],
      people,
    })
    expect(rows.map(r => r.dancerId ?? 'guest')).toEqual(['a', 'b', 'guest', 'c'])
    expect(rows[2]).toMatchObject({ confirmed: false, answer: 'needFollower' })
    expect(signupDisplayName(rows[2]!)).toBe('Guest')
  })
})
