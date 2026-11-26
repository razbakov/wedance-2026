import { describe, expect, it } from 'vitest'
import { zonedToUtc } from './eventTime'
import {
  bookingInstants,
  canBook,
  draftEventName,
  dueForReminder,
  eventTypeForBooking,
  hostForBooking,
  REMIND_AFTER_MS,
} from './bookingAccept'

const pages = [
  { id: 'org', name: 'Munich Nights' },
  { id: 'other', name: 'Other Floor' },
]

describe('hostForBooking', () => {
  it('uses the page the asker sent the request as', () => {
    expect(hostForBooking({ askerProfileId: 'org', organization: 'Someone else' }, pages, 'artist')).toBe('org')
  })

  it('uses their only page when they did not send it as one', () => {
    expect(hostForBooking({ askerProfileId: null, organization: '' }, [pages[0]!], 'artist')).toBe('org')
  })

  it('matches the organisation name when they run more than one page', () => {
    expect(hostForBooking({ askerProfileId: null, organization: ' other floor ' }, pages, 'artist')).toBe('other')
  })

  it('does not guess when several pages could be the host, and never hosts the booking on the artist page', () => {
    expect(hostForBooking({ askerProfileId: null, organization: '' }, pages, 'artist')).toBeNull()
    expect(hostForBooking({ askerProfileId: null, organization: 'Munich' }, pages, 'artist')).toBeNull()
    expect(hostForBooking({ askerProfileId: 'artist', organization: '' }, pages, 'artist')).toBeNull()
    expect(hostForBooking({ askerProfileId: null, organization: '' }, [{ id: 'artist', name: 'The band' }], 'artist')).toBeNull()
  })
})

describe('a yes becomes a draft event', () => {
  it('names the draft after what they asked for and the artist', () => {
    expect(draftEventName('Los Filins', 'Show')).toBe('Show · Los Filins')
    expect(draftEventName('Los Filins', '  ')).toBe('Los Filins')
  })

  it('maps the request onto an event type', () => {
    expect(eventTypeForBooking('Workshop or class')).toBe('Workshop')
    expect(eventTypeForBooking('Show')).toBe('Show')
    expect(eventTypeForBooking('DJ set')).toBe('Party')
    expect(eventTypeForBooking('Festival')).toBe('Festival')
    expect(eventTypeForBooking('Something else')).toBe('Party')
  })

  it('puts a dated request at 20:00 in the event’s city, for three hours', () => {
    const window = bookingInstants('2026-07-15', 'Europe/Berlin')
    expect(window).toEqual({
      start: zonedToUtc('2026-07-15', '20:00', 'Europe/Berlin'),
      end: new Date(zonedToUtc('2026-07-15', '20:00', 'Europe/Berlin').getTime() + 3 * 3600_000),
    })
    expect(bookingInstants('', 'Europe/Berlin')).toBeNull()
    expect(bookingInstants('15 July', 'Europe/Berlin')).toBeNull()
  })
})

describe('canBook', () => {
  it('lets a new or email-marked request become a booking, and not a decline', () => {
    expect(canBook('new')).toBe(true)
    expect(canBook('answered')).toBe(true)
    expect(canBook('declined')).toBe(false)
    expect(canBook('booked')).toBe(false)
  })
})

describe('dueForReminder', () => {
  const now = new Date('2026-11-25T12:00:00Z')

  it('reminds an unanswered request once it is three days old, and only once', () => {
    const createdAt = new Date(now.getTime() - REMIND_AFTER_MS)
    expect(dueForReminder({ status: 'new', createdAt, remindedAt: null }, now)).toBe(true)
    expect(dueForReminder({ status: 'new', createdAt: new Date(now.getTime() - REMIND_AFTER_MS + 1000), remindedAt: null }, now)).toBe(false)
    expect(dueForReminder({ status: 'new', createdAt, remindedAt: now }, now)).toBe(false)
    expect(dueForReminder({ status: 'booked', createdAt, remindedAt: null }, now)).toBe(false)
    expect(dueForReminder({ status: 'declined', createdAt, remindedAt: null }, now)).toBe(false)
    expect(dueForReminder({ status: 'new', createdAt: new Date(now.getTime() - 15 * 24 * 3600_000), remindedAt: null }, now)).toBe(false)
  })
})
