import { describe, it, expect } from 'vitest'
import { eventInput } from './businessEvents'
import { EVENT_ARTISTS_MAX, PRACTICAL_INFO_LINE_MAX } from '../../../shared/utils/eventLimits'

// RAZ-991: saving a real festival (46 artists, a 343-character practical-info line) was refused at 40 / 300.
const festival = (over: Record<string, unknown> = {}) => ({
  name: 'Big Fest', type: 'Festival', date: '2027-05-01', startTime: '18:00', endDate: '2027-05-03',
  artists: Array.from({ length: 46 }, (_, i) => `artist-${i}`),
  festival: { practicalInfo: ['x'.repeat(343)], passes: [{ name: 'Full pass', price: 120, description: 'y'.repeat(500) }] },
  ...over,
})

describe('businessEvents eventInput limits', () => {
  it('accepts a real festival: a big line-up and long practical-info lines', () => {
    expect(eventInput.safeParse(festival()).success).toBe(true)
  })

  it('still caps the line-up and each practical-info line', () => {
    const many = eventInput.safeParse(festival({ artists: Array.from({ length: EVENT_ARTISTS_MAX + 1 }, (_, i) => `a-${i}`) }))
    expect(many.success).toBe(false)
    const long = eventInput.safeParse(festival({ festival: { practicalInfo: ['z'.repeat(PRACTICAL_INFO_LINE_MAX + 1)] } }))
    expect(long.success).toBe(false)
    expect(long.error!.issues[0]!.path).toEqual(['festival', 'practicalInfo', 0])
  })
})
