import { describe, it, expect } from 'vitest'
import {
  contactSourceKey, emailBlock, summariseActivity, contactSegments, matchesActivity, activityLine,
  EMPTY_ACTIVITY, audienceOnly, inAudience, cameToEvents, type ActivitySignal, type SegmentContact,
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
    expect(s.blocked).toEqual({ unsubscribed: 1, not_opted_in: 3, not_a_contact: 0 })
    expect(s.activity.account).toBe(3)
    expect(s.activity.follows).toBe(1)
    expect(s.contacts).toBe(5)
    expect(s.others).toBe(0)
  })
})

describe('the audience (RAZ-963)', () => {
  const follower = { ...EMPTY_ACTIVITY, follows: true, followedAt: '2026-11-10T00:00:00Z' }
  const goer = { ...EMPTY_ACTIVITY, wentTo: 2, lastEventAt: '2026-10-01T19:00:00Z' }
  const upcoming = { ...EMPTY_ACTIVITY, upcoming: [{ id: 'e', name: 'E', startDate: '2026-11-20T19:00:00Z' }] }
  const interestedOnly = { ...EMPTY_ACTIVITY } // "Interested" / "Next time" leave nothing behind

  it('audienceOnly: followers and event-goers who aren\'t contacts, once each', () => {
    const by = new Map([['a', follower], ['b', goer], ['c', upcoming], ['d', interestedOnly], ['e', follower]])
    expect(audienceOnly(by, new Set(['e']))).toEqual(['a', 'b', 'c'])
    expect(inAudience(interestedOnly)).toBe(false)
    expect(cameToEvents(upcoming)).toBe(true)
    expect(cameToEvents(follower)).toBe(false)
  })

  it('a non-contact is never mailable, counts as its own source, and "new" means a new follower', () => {
    const other = (activity: typeof EMPTY_ACTIVITY, createdAt: string | null): SegmentContact =>
      ({ status: 'subscribed', source: {}, createdAt, hasAccount: true, isContact: false, activity })
    expect(emailBlock({ status: 'subscribed', source: { form: 'x' }, isContact: false })).toBe('not_a_contact')
    const s = contactSegments([contact(), other(follower, '2026-11-10T00:00:00Z'), other(goer, null)], NOW)
    expect(s.total).toBe(3)
    expect(s.contacts).toBe(1)
    expect(s.others).toBe(2)
    expect(s.canEmail).toBe(1)
    expect(s.blocked.not_a_contact).toBe(2)
    expect(s.sources.find(x => x.key === 'wedance')).toMatchObject({ count: 2, selfOptIn: false })
    expect(s.activity.came).toBe(1)
    expect(s.activity.follows).toBe(1)
    expect(matchesActivity(other(goer, null), 'new', NOW)).toBe(false)
    expect(matchesActivity(other(follower, '2026-11-10T00:00:00Z'), 'new', NOW)).toBe(true)
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

describe('RSVP opt-in (Let <page> keep in touch)', () => {
  it('a contact made at an event is its own, mailable source', () => {
    expect(contactSourceKey({ from: 'rsvp', event: 'e1' })).toBe('rsvp')
    expect(emailBlock({ status: 'subscribed', source: { from: 'rsvp', event: 'e1' } })).toBeNull()
  })
  it('an imported contact who opts in keeps its source and becomes mailable, until unsubscribed', () => {
    const src = { from: 'hubspot', hubspot_origin: 'import', opted_in: 'rsvp' }
    expect(contactSourceKey(src)).toBe('hubspot_import')
    expect(emailBlock({ status: 'subscribed', source: src })).toBeNull()
    expect(emailBlock({ status: 'unsubscribed', source: src })).toBe('unsubscribed')
  })
})

describe('summariseActivity → events (the event filter)', () => {
  const sig = (eventId: string, startDate: string, kind: ActivitySignal['kind'], detail?: string): ActivitySignal => ({ eventId, name: eventId, startDate, kind, detail })
  it('keeps how they come to each recent or upcoming event: ticket over poll answer over Going!', () => {
    const a = summariseActivity([
      sig('fri', '2026-11-21T19:00:00Z', 'plan'),
      sig('fri', '2026-11-21T19:00:00Z', 'rsvp', 'needLeader'),
      sig('sat', '2026-11-22T19:00:00Z', 'rsvp', 'partner'),
      sig('sat', '2026-11-22T19:00:00Z', 'attendance', 'ticket_holder'),
      sig('sun', '2026-11-23T19:00:00Z', 'plan'),
      sig('mon', '2026-11-24T19:00:00Z', 'rsvp', 'next'),
      sig('last-week', '2026-11-08T19:00:00Z', 'attendance', 'going'),
      sig('long-ago', '2026-09-01T19:00:00Z', 'attendance', 'going'),
    ], null, NOW)
    expect(a.events).toEqual({ 'fri': 'needLeader', 'sat': 'ticket', 'sun': 'going', 'last-week': 'going' })
  })
})
