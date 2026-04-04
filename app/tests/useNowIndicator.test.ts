import { describe, it, expect } from 'vitest'
import {
  isWorkshopHappeningNow,
  isWorkshopPast,
} from '~/composables/useNowIndicator'

describe('isWorkshopHappeningNow', () => {
  it('returns true when current time is within the workshop window', () => {
    expect(
      isWorkshopHappeningNow('2026-06-05', '14:00', '15:00', '2026-06-05', '14:30')
    ).toBe(true)
  })

  it('returns true at exact start time', () => {
    expect(
      isWorkshopHappeningNow('2026-06-05', '14:00', '15:00', '2026-06-05', '14:00')
    ).toBe(true)
  })

  it('returns false at exact end time (exclusive)', () => {
    expect(
      isWorkshopHappeningNow('2026-06-05', '14:00', '15:00', '2026-06-05', '15:00')
    ).toBe(false)
  })

  it('returns false when on a different day', () => {
    expect(
      isWorkshopHappeningNow('2026-06-05', '14:00', '15:00', '2026-06-06', '14:30')
    ).toBe(false)
  })

  it('returns false when before the workshop', () => {
    expect(
      isWorkshopHappeningNow('2026-06-05', '14:00', '15:00', '2026-06-05', '13:59')
    ).toBe(false)
  })

  it('returns false when after the workshop', () => {
    expect(
      isWorkshopHappeningNow('2026-06-05', '14:00', '15:00', '2026-06-05', '16:00')
    ).toBe(false)
  })
})

describe('isWorkshopPast', () => {
  it('returns true when workshop day is before current day', () => {
    expect(
      isWorkshopPast('2026-06-05', '15:00', '2026-06-06', '10:00')
    ).toBe(true)
  })

  it('returns true when workshop has ended today', () => {
    expect(
      isWorkshopPast('2026-06-05', '15:00', '2026-06-05', '15:30')
    ).toBe(true)
  })

  it('returns true when workshop just ended (exact time)', () => {
    expect(
      isWorkshopPast('2026-06-05', '15:00', '2026-06-05', '15:00')
    ).toBe(true)
  })

  it('returns false when workshop has not ended yet', () => {
    expect(
      isWorkshopPast('2026-06-05', '15:00', '2026-06-05', '14:30')
    ).toBe(false)
  })

  it('returns false when workshop is on a future day', () => {
    expect(
      isWorkshopPast('2026-06-07', '15:00', '2026-06-05', '18:00')
    ).toBe(false)
  })
})
