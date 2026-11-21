/**
 * A sign-up for an event nobody on WeDance manages (RAZ-1016) is refused with
 * a message that says where to book. The link itself rides on the error.
 */
import { describe, expect, it } from 'vitest'
import { bookElsewhereMessage, unbookableError } from './eventBookable'

describe('bookElsewhereMessage', () => {
  it('names the site the event was copied from', () => {
    expect(bookElsewhereMessage('https://www.megano-tanzschule.de/kurs')).toBe(
      'Nobody on WeDance takes bookings for this event. Book on megano-tanzschule.de.',
    )
  })

  it('asks the organiser when there is no site to send them to', () => {
    expect(bookElsewhereMessage(null)).toBe('Nobody on WeDance takes bookings for this event. Ask the organiser directly.')
    expect(bookElsewhereMessage('')).toBe('Nobody on WeDance takes bookings for this event. Ask the organiser directly.')
    expect(bookElsewhereMessage('not a url')).toBe('Nobody on WeDance takes bookings for this event. Ask the organiser directly.')
  })
})

describe('unbookableError', () => {
  it('is a precondition failure carrying the event link', () => {
    const err = unbookableError('https://www.megano-tanzschule.de/kurs')
    expect(err.code).toBe('PRECONDITION_FAILED')
    expect(err.message).toBe('Nobody on WeDance takes bookings for this event. Book on megano-tanzschule.de.')
    expect(err.cause).toMatchObject({ name: 'BookElsewhere', link: 'https://www.megano-tanzschule.de/kurs' })
  })

  it('carries a null link when the event has none', () => {
    const err = unbookableError(null)
    expect(err.cause).toMatchObject({ name: 'BookElsewhere', link: null })
  })
})
