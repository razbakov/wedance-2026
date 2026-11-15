/**
 * Send an update to a segment of a page's contacts (RAZ-960). Pure — the
 * server (contactUpdates router) picks the recipients and renders the email
 * with these, the Contacts page uses them for the counts and the template.
 *
 * Who gets it: the contacts in the segment the organiser picked on Contacts
 * (where they came from, WeDance activity, one event) that the page may email
 * (`emailBlock` — RAZ-959: people who signed up themselves, or opted in later).
 * Imported lists (HubSpot imports / by hand, wedance.vip subscribers, unknown)
 * are left out unless the organiser ticks them in — off by default, even for
 * the few of them who opted in.
 */
import { formatEventWhen } from './eventTime'
import {
  emailBlock, contactSourceKey, matchesActivity, ACTIVITY_FILTER_LABEL, COMING_AS_LABEL, SOURCE_LABEL,
  type ActivityFilter, type ComingAs, type ContactSourceKey, type SegmentContact,
} from './contactSegments'

/** Sources that came from a list, not from the person signing up with this page. */
export const IMPORTED_SOURCES: readonly ContactSourceKey[] = ['hubspot_import', 'hubspot_manual', 'wedance_v3', 'other']

export const isImportedSource = (k: ContactSourceKey) => IMPORTED_SOURCES.includes(k)

export const UPDATE_SUBJECT_MAX = 150
export const UPDATE_BODY_MAX = 5000
/** One send reaches at most this many people (the Contacts list cap). */
export const UPDATE_MAX_RECIPIENTS = 2000

export interface UpdateSegment {
  /** Empty = every source. */
  sources: ContactSourceKey[]
  /** All must match. */
  activity: ActivityFilter[]
  /** Only contacts coming to this event of the page… */
  event: string | null
  /** …and coming this way. */
  as: ComingAs | null
  /** Imported lists are off unless this is ticked. */
  includeImported: boolean
}

export const emptySegment = (): UpdateSegment => ({ sources: [], activity: [], event: null, as: null, includeImported: false })

export interface UpdateCandidate extends SegmentContact {
  id: string
  email: string
}

export interface UpdateAudience<T> {
  to: T[]
  /** In the segment, but the page may not email them (unsubscribed / never asked). */
  cantEmail: number
  /** In the segment and mailable, but from an imported list while those are off. */
  imported: number
}

function inSegment(c: SegmentContact, s: UpdateSegment, now: Date): boolean {
  const key = contactSourceKey(c.source)
  if (s.sources.length && !s.sources.includes(key)) return false
  if (!s.activity.every(a => matchesActivity(c, a, now))) return false
  if (s.event) {
    const as = c.activity.events?.[s.event]
    if (!as || (s.as && as !== s.as)) return false
  }
  return true
}

/** Who an update to `s` goes to, and who in the segment it leaves out. One email per address. */
export function updateAudience<T extends UpdateCandidate>(list: readonly T[], s: UpdateSegment, now = new Date()): UpdateAudience<T> {
  const to: T[] = []
  const seen = new Set<string>()
  let cantEmail = 0
  let imported = 0
  for (const c of list) {
    if (!inSegment(c, s, now)) continue
    if (emailBlock(c)) { cantEmail++; continue }
    if (!s.includeImported && isImportedSource(contactSourceKey(c.source))) { imported++; continue }
    const addr = c.email.trim().toLowerCase()
    if (!addr || seen.has(addr)) continue
    seen.add(addr)
    to.push(c)
  }
  return { to, cantEmail, imported }
}

/** "Your website, Shared at an event · Regulars · coming to Salsa Night (Needs a leader)" — for the send log. */
export function segmentLabel(s: UpdateSegment, eventName?: string | null): string {
  const parts: string[] = []
  parts.push(s.sources.length ? s.sources.map(k => SOURCE_LABEL[k]).join(', ') : 'Everyone who can be emailed')
  for (const a of s.activity) parts.push(ACTIVITY_FILTER_LABEL[a])
  if (s.event) parts.push(`coming to ${eventName || 'an event'}${s.as ? ` (${COMING_AS_LABEL[s.as]})` : ''}`)
  if (s.includeImported) parts.push('imported lists included')
  return parts.join(' · ')
}

// ---------------------------------------------------------------------------
// The "invite to my next event" template and the email itself.
// ---------------------------------------------------------------------------

export interface UpdateEvent {
  id: string
  name: string
  startDate: string | Date
  endDate?: string | Date | null
  timezone?: string | null
  venueName?: string | null
  venueAddress?: string | null
  /** Already sized (sizedImage). */
  cover?: string | null
  price?: string | null
}

/** The template's subject and words; the event card + RSVP buttons come with the event. */
export function inviteTemplate(ev: UpdateEvent, pageName: string): { subject: string, body: string } {
  const when = formatEventWhen(ev.startDate, ev.endDate, ev.timezone || undefined)
  return {
    subject: `You’re invited: ${ev.name}`,
    body: `Hi {name},\n\nOur next event is coming up: ${ev.name}, ${when}${ev.venueName ? ` at ${ev.venueName}` : ''}.\n\nWe’d love to see you there. Tap “I’m coming” below so we know you’re in.\n\n${pageName}`,
  }
}

/** `{name}` → the contact's first name, or "there" when we don't know it. */
export function personalise(text: string, name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] || 'there'
  return text.replaceAll('{name}', first)
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const linkify = (html: string) => html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')

export interface UpdateEmailInput {
  pageName: string
  subject: string
  body: string
  /** The contact's name, for {name}. */
  name?: string | null
  event?: UpdateEvent | null
  /** Where the event lives: https://…/events/<id>. */
  eventUrl?: string | null
  /** One click, this page only. */
  unsubscribeUrl: string
  /** A test send: says so, and the unsubscribe link does nothing. */
  test?: boolean
}

/** The update as HTML: the words, the event card with RSVP buttons, then the page's name and the unsubscribe link. */
export function updateEmailHtml(p: UpdateEmailInput): string {
  const words = personalise(p.body, p.name).split(/\n{2,}/).filter(s => s.trim())
    .map(par => `<p style="margin:0 0 16px">${linkify(esc(par).replace(/\n/g, '<br>'))}</p>`).join('')
  const ev = p.event
  const url = p.eventUrl ? esc(p.eventUrl) : ''
  const btn = (href: string, label: string, primary: boolean) =>
    `<a href="${href}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold;${primary ? 'background:#c8102e;color:#fff' : 'border:1px solid #ccc;color:#333'}">${label}</a>`
  const card = ev && url
    ? `<div style="border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;margin:8px 0 24px">
        ${ev.cover ? `<a href="${url}"><img src="${esc(ev.cover)}" alt="" width="560" style="display:block;width:100%;max-height:320px;object-fit:cover"></a>` : ''}
        <div style="padding:16px">
          <p style="margin:0 0 4px;font-size:18px;font-weight:bold"><a href="${url}" style="color:#111;text-decoration:none">${esc(ev.name)}</a></p>
          <p style="margin:0 0 4px;color:#555">${esc(formatEventWhen(ev.startDate, ev.endDate, ev.timezone || undefined))}</p>
          ${ev.venueName || ev.venueAddress ? `<p style="margin:0 0 4px;color:#555">${esc([ev.venueName, ev.venueAddress].filter(Boolean).join(', '))}</p>` : ''}
          ${ev.price ? `<p style="margin:0 0 4px;color:#555">${esc(ev.price)}</p>` : ''}
          <div style="margin-top:12px">${btn(`${url}#rsvp`, 'I’m coming', true)}${btn(url, 'See the event', false)}</div>
        </div>
      </div>`
    : ''
  const testNote = p.test ? `<p style="margin:0 0 16px;padding:8px 12px;border-radius:8px;background:#fff4d6;color:#6b4e00;font-size:13px">This is a test. Only you got it.</p>` : ''
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#333;line-height:1.6">
    ${testNote}${words}${card}
    <p style="color:#999;font-size:12px;margin-top:32px">${esc(p.pageName)} · via WeDance<br>
    You get this because you signed up with ${esc(p.pageName)}. <a href="${esc(p.unsubscribeUrl)}" style="color:#999">Unsubscribe from ${esc(p.pageName)}</a></p>
  </div>`
}

/** The plain-text part, for mail apps that don't show HTML. */
export function updateEmailText(p: UpdateEmailInput): string {
  const ev = p.event
  const lines = [personalise(p.body, p.name).trim()]
  if (ev && p.eventUrl) {
    lines.push('', ev.name, formatEventWhen(ev.startDate, ev.endDate, ev.timezone || undefined))
    if (ev.venueName || ev.venueAddress) lines.push([ev.venueName, ev.venueAddress].filter(Boolean).join(', '))
    lines.push(`I’m coming: ${p.eventUrl}#rsvp`)
  }
  lines.push('', `— ${p.pageName} · via WeDance`, `Unsubscribe from ${p.pageName}: ${p.unsubscribeUrl}`)
  return lines.join('\n')
}
