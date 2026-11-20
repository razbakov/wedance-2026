import { describe, it, expect } from 'vitest'
import { greetingName, inviteTemplate, mailingRecipients, personalise, renderMailingHtml, renderMailingText, textToHtml } from './contactMailing'

const web = { form: 'newsletter' }
const contact = (id: string, email: string, extra: Partial<{ name: string | null, status: string, source: Record<string, string> }> = {}) =>
  ({ id, email, name: 'Rita Regular', status: 'subscribed', source: web, ...extra })

describe('mailingRecipients', () => {
  it('keeps only contacts the page may email, each address once', () => {
    const list = [
      contact('1', 'rita@x.de'),
      contact('2', 'RITA@x.de'), // same address
      contact('3', 'gone@x.de', { status: 'unsubscribed' }),
      contact('4', 'import@x.de', { source: { from: 'hubspot', hubspot_origin: 'import' } }), // never opted in
      contact('5', 'optin@x.de', { source: { from: 'hubspot', hubspot_origin: 'import', opted_in: 'rsvp' } }),
      contact('6', 'rsvp@x.de', { source: { from: 'rsvp' } }),
    ]
    expect(mailingRecipients(list).map(c => c.id)).toEqual(['1', '5', '6'])
  })
  it('never mails someone who is only in the audience (RAZ-963)', () => {
    expect(mailingRecipients([{ ...contact('7', 'f@x.de'), isContact: false }, { ...contact('8', ''), source: web }])).toEqual([])
  })
})

describe('personalising', () => {
  it('uses the first name, else "there"', () => {
    expect(greetingName('Rita Regular')).toBe('Rita')
    expect(greetingName('  ')).toBe('there')
    expect(greetingName(null)).toBe('there')
    expect(personalise('Hi {first_name}, {first_name}!', 'Ana')).toBe('Hi Ana, Ana!')
  })
})

describe('rendering', () => {
  const c = { profileName: 'Montuno <Club>', subject: 'Hi', body: 'Hi {first_name},\n\nSee https://montuno.club now.\nBye <b>', pageUrl: 'https://2026.wedance.vip/@montuno' }

  it('escapes the text, keeps paragraphs and makes links clickable', () => {
    const html = textToHtml(c.body)
    expect(html).toContain('&lt;b&gt;')
    expect(html).toContain('<a href="https://montuno.club"')
    expect(html.match(/<p /g)).toHaveLength(2)
  })

  it('personalises and adds a live unsubscribe link', () => {
    const html = renderMailingHtml(c, { name: 'Rita', unsubscribeUrl: 'https://x/api/contacts/unsubscribe?id=1' })
    expect(html).toContain('Hi Rita,')
    expect(html).toContain('Montuno &lt;Club&gt;')
    expect(html).toContain('href="https://x/api/contacts/unsubscribe?id=1"')
    expect(renderMailingHtml(c, { name: null })).not.toContain('unsubscribe?id')
  })

  it('shows the event card with a "Book my spot" link', () => {
    const event = { name: 'Casino Night', when: 'Sun, Nov 15, 2026 · 20:00', place: 'Rote Sonne', cover: null, url: 'https://x/events/casino-1' }
    const html = renderMailingHtml({ ...c, event }, { name: 'Rita' })
    expect(html).toContain('Casino Night')
    expect(html).toContain('Rote Sonne')
    expect(html).toContain('href="https://x/events/casino-1"')
    expect(renderMailingText({ ...c, event }, { name: 'Rita', unsubscribeUrl: 'https://u' })).toContain('Book my spot: https://x/events/casino-1')
  })

  it('writes an invite from the event', () => {
    const t = inviteTemplate({ name: 'Casino Night', when: 'Sun, Nov 15, 2026 · 20:00' }, 'MontunoClub')
    expect(t.subject).toBe('Casino Night · Sun, Nov 15, 2026')
    expect(t.body).toMatch(/^Hi \{first_name\},/)
    expect(t.body).toContain('MontunoClub')
  })
})
