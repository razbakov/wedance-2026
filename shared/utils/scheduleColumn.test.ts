import { describe, expect, it } from 'vitest'
import { schedulePeople } from './scheduleColumn'

describe('schedule people column (RAZ-1094)', () => {
  it('uses Artist for an artist page, including an orchestra filed as an artist', () => {
    expect(schedulePeople({ type: 'artist', roles: [] })).toBe('artist')
    expect(schedulePeople({ type: 'artist', roles: ['teacher'] })).toBe('artist')
  })

  it('uses Artist for a band or orchestra even when the page is not typed artist', () => {
    expect(schedulePeople({ type: 'organizer', roles: ['orchestra'] })).toBe('artist')
    expect(schedulePeople({ type: 'organizer', roles: ['band'] })).toBe('artist')
    expect(schedulePeople({ type: 'venue', roles: ['performer'] })).toBe('artist')
  })

  it('keeps Teacher for a school or other organizer', () => {
    expect(schedulePeople({ type: 'organizer', roles: [] })).toBe('teacher')
    expect(schedulePeople({ type: 'organizer', roles: ['school'] })).toBe('teacher')
    expect(schedulePeople({ type: 'venue', roles: ['teacher'] })).toBe('teacher')
  })

  it('uses a neutral label for a venue, a promoter, or any other known type', () => {
    expect(schedulePeople({ type: 'venue', roles: [] })).toBe('with')
    expect(schedulePeople({ type: 'promoter', roles: [] })).toBe('with')
  })

  it('keeps Teacher when an older feed has no type and no roles', () => {
    expect(schedulePeople(null)).toBe('teacher')
    expect(schedulePeople({})).toBe('teacher')
  })
})
