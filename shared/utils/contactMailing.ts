/**
 * A page's email to its contacts (RAZ-975 / RAZ-960): Contacts → "Email N". Pure — the
 * Contacts page renders the preview with it and the server renders the real email with it,
 * so what the organiser sees is what people get.
 *
 * The text is plain: paragraphs, line breaks, bare links become links. `{first_name}` is
 * replaced per person ("there" when we don't know it). An event, when picked, comes as a
 * card under the text with an "I'm coming" button to the event page (its poll = the RSVP).
 */
import { emailBlock, type ContactSource } from './contactSegments'

export const MAILING_SUBJECT_MAX = 150
export const MAILING_BODY_MAX = 5000
/** One send goes to at most this many people (the Contacts list is capped at 2000 too). */
export const MAILING_MAX_RECIPIENTS = 2000
export const FIRST_NAME_TOKEN = '{first_name}'

export interface MailingEventCard {
  name: string
  when: string
  place?: string | null
  cover?: string | null
  url: string
}

export interface MailingContent {
  profileName: string
  subject: string
  body: string
  event?: MailingEventCard | null
  /** The page's website or WeDance page, in the footer. */
  pageUrl?: string | null
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** "Rita Regular" → "Rita"; nothing → "there". */
export function greetingName(name: string | null | undefined): string {
  const n = (name ?? '').trim().split(/\s+/)[0] ?? ''
  return n || 'there'
}

export const personalise = (text: string, name: string | null | undefined) => text.split(FIRST_NAME_TOKEN).join(greetingName(name))

/** Plain text → paragraphs, with bare links made clickable. */
export function textToHtml(text: string): string {
  return text.trim().split(/\n{2,}/).filter(Boolean)
    .map(p => `<p style="margin: 0 0 14px;">${esc(p).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #b42318;">$1</a>')}</p>`)
    .join('')
}

/** The email's HTML for one person. `unsubscribeUrl` null = the preview / a test (shown, not live). */
export function renderMailingHtml(c: MailingContent, to: { name?: string | null, unsubscribeUrl?: string | null }): string {
  const ev = c.event
  const card = ev
    ? `<div style="border: 1px solid #e7e2da; border-radius: 14px; overflow: hidden; margin: 20px 0;">
        ${ev.cover ? `<img src="${esc(ev.cover)}" alt="" width="520" style="display: block; width: 100%; max-height: 280px; object-fit: cover;">` : ''}
        <div style="padding: 16px;">
          <p style="margin: 0; font-size: 18px; font-weight: bold;">${esc(ev.name)}</p>
          <p style="margin: 4px 0 0; color: #555;">${esc(ev.when)}${ev.place ? ` · ${esc(ev.place)}` : ''}</p>
          <p style="margin: 14px 0 0;"><a href="${esc(ev.url)}" style="display: inline-block; background: #000; color: #fff; padding: 11px 22px; border-radius: 999px; text-decoration: none; font-weight: bold;">I’m coming</a></p>
        </div>
      </div>`
    : ''
  const unsub = to.unsubscribeUrl
    ? `<a href="${esc(to.unsubscribeUrl)}" style="color: #999;">Unsubscribe</a>`
    : '<span style="text-decoration: underline;">Unsubscribe</span>'
  return `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; color: #222; line-height: 1.6; font-size: 15px;">
    ${textToHtml(personalise(c.body, to.name))}
    ${card}
    <p style="color: #999; font-size: 12px; margin-top: 32px;">${esc(c.profileName)}${c.pageUrl ? ` · <a href="${esc(c.pageUrl)}" style="color: #999;">${esc(c.pageUrl.replace(/^https?:\/\//, ''))}</a>` : ''} · via WeDance<br>
    You get this because you gave ${esc(c.profileName)} your email. ${unsub}</p>
  </div>`
}

/** The same email as plain text (the multipart alternative). */
export function renderMailingText(c: MailingContent, to: { name?: string | null, unsubscribeUrl?: string | null }): string {
  const ev = c.event
  return [
    personalise(c.body, to.name).trim(),
    ev ? `${ev.name}\n${ev.when}${ev.place ? ` · ${ev.place}` : ''}\nI’m coming: ${ev.url}` : '',
    `— ${c.profileName} · via WeDance${to.unsubscribeUrl ? `\nUnsubscribe: ${to.unsubscribeUrl}` : ''}`,
  ].filter(Boolean).join('\n\n')
}

/** The "Invite to my next event" template. */
export function inviteTemplate(event: { name: string, when: string }, profileName: string): { subject: string, body: string } {
  return {
    subject: `${event.name} · ${event.when.split(' · ')[0]}`,
    body: `Hi ${FIRST_NAME_TOKEN},\n\nWe’d love to see you at ${event.name} — ${event.when}.\n\nTap “I’m coming” below so we know you’re there.\n\nSee you on the floor,\n${profileName}`,
  }
}

export interface MailableContact { id: string, email: string, name: string | null, status: string, source: ContactSource }

/** Who of `contacts` actually gets it: only those the page may email, each address once. */
export function mailingRecipients<T extends MailableContact>(contacts: readonly T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const c of contacts) {
    const key = c.email.trim().toLowerCase()
    if (!key || emailBlock(c) || seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}
