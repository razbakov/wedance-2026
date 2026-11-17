import { describe, it, expect } from 'vitest'
import { festivalSessionEvent } from './sessionEvent'

const view = {
  festival: {
    slug: 'meneate-viena-2026',
    name: 'Menéate Viena',
    startDate: '2026-11-26',
    endDate: '2026-11-29',
    ticketUrl: 'https://example.com/tickets',
    venue: { name: 'wolke19' },
  },
  teachers: [{ id: 'silvio', name: 'Silvio Leroy' }],
  workshops: [
    { id: 'fri-1', title: 'Rumba', type: 'workshop', style: 'Rumba', teacherId: 'silvio', day: 'Friday', time: '11:00', duration: 75, room: 'Hall A', goingCount: 12 },
  ],
}

describe('festivalSessionEvent', () => {
  it('maps one programme item of a real event', () => {
    const ev = festivalSessionEvent(view, 'fri-1')
    expect(ev).toMatchObject({
      id: 'f~meneate-viena-2026~fri-1',
      title: 'Rumba',
      eventType: 'Workshop',
      styles: ['Rumba'],
      artists: ['Silvio Leroy'],
      eventDate: '2026-11-27',
      startTime: '11:00',
      venueName: 'wolke19',
      parentFestival: { name: 'Menéate Viena', slug: 'meneate-viena-2026' },
    })
  })

  it('is null when the session is not on the event', () => {
    expect(festivalSessionEvent(view, 'nope')).toBeNull()
  })
})
