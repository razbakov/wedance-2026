import { describe, expect, it } from 'vitest'
import { matchNotice, unactedNotices, type Notice } from './notices'

const anna = {
  dancerId: 'anna-id',
  name: 'Anna Test',
  photo: 'https://example.com/anna.jpg',
  matchedAt: '2026-11-18T12:00:00.000Z',
  booked: false,
  night: { name: 'Hello Weekend am Stachus', whenLabel: 'Friday 19:00', venue: 'Stachus' },
}

describe('matchNotice', () => {
  it('nudges both dancers to book until someone has booked', () => {
    const n = matchNotice(anna)
    expect(n.id).toBe('match:anna-id')
    expect(n.prominent).toBe(true)
    expect(n.title).toBe("It's a match with Anna")
    expect(n.body).toContain('said yes to you too')
    expect(n.action).toBe('Book the night and see where you’ll meet')
    expect(n.href).toBe('/meet/ritual?with=anna-id')
    expect(n.booked).toBe(false)
  })

  it('gives a booked dancer a reason to come instead of another booking nudge', () => {
    const n = matchNotice({ ...anna, booked: true })
    expect(n.body).toBe("You'll meet Anna at Hello Weekend am Stachus, Friday 19:00 · Stachus.")
    expect(n.action).toBe('See when and where you’ll meet')
    expect(n.href).toBe('/meet/ritual?with=anna-id')
  })

  it('still asks them to book when there is no night to point at', () => {
    const n = matchNotice({ ...anna, booked: true, night: null })
    expect(n.booked).toBe(false)
    expect(n.action).toContain('Book the night')
  })
})

describe('unactedNotices', () => {
  it('keeps a dismissed toast in the history until it is opened', () => {
    const notices = [matchNotice(anna), matchNotice({ ...anna, dancerId: 'ben-id', name: 'Ben Test' })]
    expect(unactedNotices(notices, []).map(n => n.id)).toEqual(['match:anna-id', 'match:ben-id'])
    expect(unactedNotices(notices, ['match:anna-id']).map(n => n.name)).toEqual(['Ben Test'])
    const history: Notice[] = notices
    expect(history).toHaveLength(2)
  })
})
