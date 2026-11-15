import { describe, it, expect } from 'vitest'
import {
  contactSourceKey, emailBlock, summariseActivity, contactSegments, matchesActivity, activityLine,
  EMPTY_ACTIVITY, type ActivitySignal, type SegmentContact,
} from './contactSegments'

const NOW = new Date('2026-11-15T12:00:00Z')

describe('contactSourceKey', () => {
  it('reads the import tags, and a website sign-up has none', () => {
    expect(contactSourceKey({ form: 'montuno.club', page: '/de' })).toBe('website')
    expect(contactSourceKey({ from: 'hubspot', hubspot_origin: 'form', form: 'HubSpot · New newsletter form' })).toBe('hubspot_form')
    expect(contactSourceKey({ from: 'hubspot', hubspot_origin: 'import' })).toBe('hubspot_import')
    expect(contactSourceKey({ from: 'hubspot', hubspot_origin: 'crm_ui' })).toBe('hubspot_manual')
    expect(contactSourceKey({ from: 'hubspot' })).toBe('other')
    expect(contactSourceKey({ from: 'wedance-v3', v3_uid: 'x' })).toBe('wedance_v3')
    expect(contactSourceKey({})).toBe('other')
    expect(contactSourceKey(null)).toBe('other')
  })
})

describe('emailBlock', () => {
  it('only self opt-ins that are still subscribed may be emailed', () => {
    expect(emailBlock({ status: 'subscribed', source: { form: 'montuno.club' } })).toBeNull()
    expect(emailBlock({ status: 'subscribed', source: { from: 'hubspot', hubspot_origin: 'form' } })).toBeNull()
    expect(emailBlock({ status: 'subscribed', source: { from: 'hubspot', hubspot_origin: 'import' } })).toBe('not_opted_in')
    expect(emailBlock({ status: 'subscribed', source: { from: 'wedance-v3' } })).toBe('not_opted_in')
    expect(emailBlock({ status: 'unsubscribed', source: { form: 'montuno.club' } })).toBe('unsubscribed')
  })
})

const sig = (eventId: string, startDate: string, kind: ActivitySignal['kind'], detail?: string, checkedInAt?: string): ActivitySignal =>
  ({ eventId, name: `Night ${eventId}`, startDate, kind, detail, checkedInAt })

describe('summariseActivity', () => {
  it('counts past events once per event, upcoming soonest first, ignores interested / next time', () => {
    const a = summariseActivity([
      sig('e1', '2026-09-01T19:00:00Z', 'attendance', 'going'),
      sig('e1', '2026-09-01T19:00:00Z', 'rsvp', 'yes'), // same event twice → once
      sig('e2', '2026-10-01T19:00:00Z', 'attendance', 'interested', '2026-10-01T20:00:00Z'), // checked in wins
      sig('e3', '2026-10-10T19:00:00Z', 'rsvp', 'next'), // not coming
      sig('e4', '2026-10-20T19:00:00Z', 'attendance', 'interested'), // only interested
      sig('e6', '2026-12-01T19:00:00Z', 'plan'),
      sig('e5', '2026-11-22T19:00:00Z', 'rsvp', 'needLeader'),
    ], { at: '2026-01-01T00:00:00Z' }, NOW)
    expect(a.wentTo).toBe(2)
    expect(a.checkedIn).toBe(1)
    expect(a.lastEventAt).toBe('2026-10-01T19:00:00.000Z')
    expect(a.upcoming.map(e => e.id)).toEqual(['e5', 'e6'])
    expect(a.follows).toBe(true)
  })

  it('is empty without signals', () => {
    expect(summariseActivity([], null, NOW)).toEqual(EMPTY_ACTIVITY)
  })
})

const contact = (over: Partial<SegmentContact> = {}): SegmentContact => ({
  status: 'subscribed', source: { form: 'site' }, createdAt: '2026-01-01T00:00:00Z', hasAccount: false, activity: EMPTY_ACTIVITY, ...over,
})

describe('activity filters', () => {
  it('regular, lapsed, new, going', () => {
    const regular = contact({ hasAccount: true, activity: { ...EMPTY_ACTIVITY, wentTo: 4, lastEventAt: '2026-11-01T19:00:00Z' } })
    const lapsed = contact({ hasAccount: true, activity: { ...EMPTY_ACTIVITY, wentTo: 1, lastEventAt: '2026-06-01T19:00:00Z' } })
    const comingBack = contact({ activity: { ...EMPTY_ACTIVITY, wentTo: 1, lastEventAt: '2026-06-01T19:00:00Z', upcoming: [{ id: 'x', name: 'X', startDate: '2026-11-22T19:00:00Z' }] } })
    expect(matchesActivity(regular, 'regular', NOW)).toBe(true)
    expect(matchesActivity(regular, 'lapsed', NOW)).toBe(false)
    expect(matchesActivity(lapsed, 'lapsed', NOW)).toBe(true)
    expect(matchesActivity(comingBack, 'lapsed', NOW)).toBe(false)
    expect(matchesActivity(comingBack, 'going', NOW)).toBe(true)
    expect(matchesActivity(contact({ createdAt: '2026-11-01T00:00:00Z' }), 'new', NOW)).toBe(true)
    expect(matchesActivity(contact(), 'new', NOW)).toBe(false)
    expect(matchesActivity(contact(), 'lapsed', NOW)).toBe(false)
  })
})

describe('contactSegments', () => {
  it('counts each source, email yes/no by reason, and the activity filters', () => {
    const s = contactSegments([
      contact(),
      contact({ status: 'unsubscribed' }),
      contact({ source: { from: 'hubspot', hubspot_origin: 'import' }, hasAccount: true }),
      contact({ source: { from: 'hubspot', hubspot_origin: 'import' }, hasAccount: true, activity: { ...EMPTY_ACTIVITY, follows: true, followedAt: '2026-01-01T00:00:00Z' } }),
      contact({ source: { from: 'wedance-v3' }, hasAccount: true }),
    ], NOW)
    expect(s.total).toBe(5)
    expect(s.sources).toEqual([
      { key: 'website', label: 'Your website', count: 2, selfOptIn: true },
      { key: 'hubspot_import', label: 'HubSpot imported list', count: 2, selfOptIn: false },
      { key: 'wedance_v3', label: 'wedance.vip subscribers', count: 1, selfOptIn: false },
    ])
    expect(s.canEmail).toBe(1)
    expect(s.cantEmail).toBe(4)
    expect(s.blocked).toEqual({ unsubscribed: 1, not_opted_in: 3 })
    expect(s.activity.account).toBe(3)
    expect(s.activity.follows).toBe(1)
  })
})

describe('activityLine', () => {
  it('says it in one line', () => {
    expect(activityLine({
      ...EMPTY_ACTIVITY, wentTo: 4, follows: true,
      upcoming: [{ id: 'a', name: 'A', startDate: '2026-11-21T19:00:00Z' }, { id: 'b', name: 'B', startDate: '2026-11-28T19:00:00Z' }],
    }, { timeZone: 'Europe/Berlin' })).toBe('went to 4 of your events · going Sat 21 Nov +1 · follows you')
    expect(activityLine({ ...EMPTY_ACTIVITY, wentTo: 1 })).toBe('went to 1 of your events')
    expect(activityLine(EMPTY_ACTIVITY)).toBe('')
  })
})
