import { describe, expect, it } from 'vitest'
import { buildDoorList, doorGuestMatches, type DoorRows } from './doorList'

const people = [
  { id: 'a', name: 'Ana Lopez', photo: 'a.jpg' },
  { id: 'b', name: 'Ben', photo: null },
  { id: 'c', name: 'José', photo: null },
]

const empty: DoorRows = { polls: [], attendances: [], plans: [], passes: [], people }

describe('buildDoorList', () => {
  it('keeps one row per dancer and lets a ticket win over the RSVP and Going!', () => {
    const rows = buildDoorList({
      ...empty,
      polls: [{ id: 'r1', dancerId: 'a', answer: 'needLeader', confirmed: true, name: null, partnerName: null, checkedIn: false }],
      attendances: [{ id: 'att-a', dancerId: 'a', status: 'ticket_holder', checkedIn: true }],
      plans: [{ dancerId: 'a' }, { dancerId: 'b' }],
      people,
    })
    expect(rows.map(r => r.dancerId)).toEqual(['a', 'b'])
    expect(rows[0]).toMatchObject({
      name: 'Ana Lopez', photo: 'a.jpg', via: 'ticket', answer: 'needLeader', checkedIn: true,
      attendanceId: 'att-a', dancerId: 'a', rsvpId: null, signupId: null,
    })
    expect(rows[1]).toMatchObject({ name: 'Ben', via: 'going', dancerId: 'b', attendanceId: null })
  })

  it('lists a signed-out guest by the name they typed, and leaves "next time" off', () => {
    const rows = buildDoorList({
      ...empty,
      polls: [
        { id: 'g1', dancerId: null, answer: 'yes', confirmed: false, name: 'Mina Guest', partnerName: 'Kim', checkedIn: false },
        { id: 'g2', dancerId: null, answer: 'partner', confirmed: false, name: '  ', partnerName: 'Luis', checkedIn: true },
        { id: 'n1', dancerId: 'c', answer: 'next', confirmed: true, name: null, partnerName: null, checkedIn: false },
        { id: 'old', dancerId: null, answer: 'bogus', confirmed: false, name: 'Nope', partnerName: null, checkedIn: false },
      ],
      people,
    })
    expect(rows.map(r => r.name)).toEqual(['Mina Guest', 'Guest'])
    expect(rows[0]).toMatchObject({ rsvpId: 'g1', partnerName: null, confirmed: false, answer: 'yes' })
    expect(rows[1]).toMatchObject({ rsvpId: 'g2', partnerName: 'Luis', checkedIn: true, answer: 'partner' })
  })

  it('names an unclaimed ticket and a festival pass, and skips a pass with nothing to attach', () => {
    const rows = buildDoorList({
      ...empty,
      attendances: [
        { id: 'stub', dancerId: null, status: 'ticket_holder', checkedIn: false },
        { id: 'int', dancerId: 'b', status: 'interested', checkedIn: false },
      ],
      passes: [
        { id: 'pass-c', dancerId: 'c', ticket: true, stub: false },
        { id: 'pass-stub', dancerId: null, ticket: true, stub: true },
        { id: 'pass-lost', dancerId: null, ticket: true, stub: false },
      ],
      people,
    })
    expect(rows.map(r => [r.name, r.via, r.attendanceId, r.signupId])).toEqual([
      ['José', 'ticket', null, null],
      ['Ticket', 'ticket', 'stub', null],
      ['Ticket', 'ticket', null, 'pass-stub'],
    ])
  })
})

describe('doorGuestMatches', () => {
  it('matches a name or a partner, accents folded', () => {
    const jose = { name: 'José', partnerName: null }
    expect(doorGuestMatches(jose, 'jose')).toBe(true)
    expect(doorGuestMatches(jose, '  JO')).toBe(true)
    expect(doorGuestMatches({ name: 'Ana', partnerName: 'Kim Lee' }, 'lee')).toBe(true)
    expect(doorGuestMatches(jose, 'ana')).toBe(false)
    expect(doorGuestMatches(jose, '   ')).toBe(true)
  })
})
