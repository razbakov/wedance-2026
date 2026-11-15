import { describe, it, expect } from 'vitest'
import { EMPTY_ACTIVITY, type ContactActivity } from './contactSegments'
import { emptySegment, inviteTemplate, personalise, segmentLabel, updateAudience, updateEmailHtml, updateEmailText, type UpdateCandidate } from './contactUpdate'

const now = new Date('2026-11-15T12:00:00Z')
let n = 0
const c = (source: Record<string, string>, over: Partial<UpdateCandidate> & { activity?: Partial<ContactActivity> } = {}): UpdateCandidate => ({
  id: `c${++n}`, email: `p${n}@test.local`, status: 'subscribed', source, createdAt: '2026-01-01T00:00:00Z', hasAccount: false,
  ...over, activity: { ...EMPTY_ACTIVITY, ...over.activity },
})

const website = { form: 'school.test' }
const rsvp = { from: 'rsvp' }
const hubForm = { from: 'hubspot', hubspot_origin: 'form' }
const hubImport = { from: 'hubspot', hubspot_origin: 'import' }
const v3 = { from: 'wedance-v3' }

describe('updateAudience', () => {
  it('sends only to people the page may email', () => {
    const list = [c(website), c(rsvp), c(hubForm), c(website, { status: 'unsubscribed' }), c(hubImport), c(v3)]
    const a = updateAudience(list, emptySegment(), now)
    expect(a.to.map(x => x.source)).toEqual([website, rsvp, hubForm])
    expect(a.cantEmail).toBe(3) // unsubscribed + two never asked
    expect(a.imported).toBe(0)
  })

  it('leaves imported lists out by default, even those who opted in', () => {
    const optedIn = c({ ...hubImport, opted_in: '2026-11-01' })
    const optedInV3 = c({ ...v3, opted_in: '2026-11-01' })
    const a = updateAudience([c(website), optedIn, optedInV3], emptySegment(), now)
    expect(a.to).toHaveLength(1)
    expect(a.imported).toBe(2)
    const b = updateAudience([c(website), optedIn, optedInV3], { ...emptySegment(), includeImported: true }, now)
    expect(b.to.map(x => x.id)).toEqual(expect.arrayContaining([optedIn.id, optedInV3.id]))
    expect(b.imported).toBe(0)
  })

  it('never includes an imported contact who did not opt in, even when ticked in', () => {
    const a = updateAudience([c(hubImport), c(v3)], { ...emptySegment(), includeImported: true }, now)
    expect(a.to).toHaveLength(0)
    expect(a.cantEmail).toBe(2)
  })

  it('narrows to the segment: source, activity and one event', () => {
    const regular = c(website, { hasAccount: true, activity: { wentTo: 4, events: { ev1: 'needLeader' } } })
    const going = c(rsvp, { hasAccount: true, activity: { events: { ev1: 'yes' }, upcoming: [{ id: 'ev1', name: 'Night', startDate: '2026-11-20T19:00:00Z' }] } })
    const other = c(hubForm)
    const list = [regular, going, other]
    expect(updateAudience(list, { ...emptySegment(), sources: ['rsvp'] }, now).to).toEqual([going])
    expect(updateAudience(list, { ...emptySegment(), activity: ['regular'] }, now).to).toEqual([regular])
    expect(updateAudience(list, { ...emptySegment(), event: 'ev1' }, now).to).toEqual([regular, going])
    expect(updateAudience(list, { ...emptySegment(), event: 'ev1', as: 'needLeader' }, now).to).toEqual([regular])
  })

  it('emails an address once', () => {
    const a = updateAudience([c(website, { email: 'Ana@Test.local' }), c(rsvp, { email: 'ana@test.local ' })], emptySegment(), now)
    expect(a.to).toHaveLength(1)
  })
})

describe('segmentLabel', () => {
  it('says who it went to, for the send log', () => {
    expect(segmentLabel(emptySegment())).toBe('Everyone who can be emailed')
    expect(segmentLabel({ sources: ['website', 'rsvp'], activity: ['regular'], event: 'e', as: 'needLeader', includeImported: true }, 'Salsa Night'))
      .toBe('Your website, Shared at an event · Regulars (3+ events) · coming to Salsa Night (Needs a leader) · imported lists included')
  })
})

const ev = { id: 'ev1', name: 'Salsa <Night>', startDate: '2026-11-20T19:00:00Z', endDate: '2026-11-20T23:00:00Z', timezone: 'Europe/Berlin', venueName: 'Bar Buena Vista', cover: 'https://img.test/c.jpg' }

describe('the email', () => {
  it('fills {name} with the first name, else "there"', () => {
    expect(personalise('Hi {name}!', 'Ana Maria Lopez')).toBe('Hi Ana!')
    expect(personalise('Hi {name}!', null)).toBe('Hi there!')
  })

  it('has the invite template with the event in its zone', () => {
    const t = inviteTemplate(ev, 'Montuno')
    expect(t.subject).toBe('You’re invited: Salsa <Night>')
    expect(t.body).toContain('20:00')
    expect(t.body).toContain('at Bar Buena Vista')
    expect(t.body).toContain('{name}')
  })

  it('carries the event card, the RSVP button and a one-click unsubscribe for the page', () => {
    const html = updateEmailHtml({ pageName: 'Montuno', subject: 's', body: 'Hi {name},\n\nSee https://x.test', name: 'Ana', event: ev, eventUrl: 'https://w.test/events/ev1', unsubscribeUrl: 'https://w.test/api/contacts/unsubscribe?id=c1' })
    expect(html).toContain('Hi Ana,')
    expect(html).toContain('<a href="https://x.test">')
    expect(html).toContain('Salsa &lt;Night&gt;')
    expect(html).toContain('href="https://w.test/events/ev1#rsvp"')
    expect(html).toContain('I’m coming')
    expect(html).toContain('href="https://w.test/api/contacts/unsubscribe?id=c1"')
    expect(html).toContain('Unsubscribe from Montuno')
    expect(html).not.toContain('This is a test')
    const text = updateEmailText({ pageName: 'Montuno', subject: 's', body: 'Hi {name}', name: 'Ana', event: ev, eventUrl: 'https://w.test/events/ev1', unsubscribeUrl: 'https://w.test/u' })
    expect(text).toContain('I’m coming: https://w.test/events/ev1#rsvp')
    expect(text).toContain('Unsubscribe from Montuno: https://w.test/u')
  })

  it('escapes what the organiser wrote and marks a test', () => {
    const html = updateEmailHtml({ pageName: 'A&B', subject: 's', body: '<script>x</script>', unsubscribeUrl: '#', test: true })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('This is a test')
    expect(html).not.toContain('I’m coming')
  })
})
