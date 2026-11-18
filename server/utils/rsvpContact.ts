/**
 * "Let <page> keep in touch" under an event's poll: a signed-in dancer who's
 * coming shares their email (and, if they want, a phone / WhatsApp number) with
 * the page that runs the event, as one of its Contacts. Their own choice, so the
 * page may email them (`contactSegments` SELF_OPT_IN). Stopping sets the contact
 * to unsubscribed; the page keeps the row (it may have notes) but can't email it.
 *
 * The page: the event's host, else its organiser. Never the venue — a bar that
 * hosts a salsa night didn't ask the dancers anything.
 */
import { and, eq, or, sql } from 'drizzle-orm'
import { dancers, profileContacts, profiles } from '../database/schema'
import { emailBlock } from '../../shared/utils/contactSegments'

export const CONTACT_PHONE_MAX = 40

export interface ContactPage { id: string, name: string, username: string }

export async function contactPageFor(db: any, ev: { hostProfileId?: string | null, organizerUsername?: string | null }): Promise<ContactPage | null> {
  const where = ev.hostProfileId ? eq(profiles.id, ev.hostProfileId) : ev.organizerUsername ? eq(profiles.username, ev.organizerUsername) : null
  if (!where) return null
  const [p] = await db.select({ id: profiles.id, name: profiles.name, username: profiles.username }).from(profiles).where(where).limit(1)
  return p ? { id: p.id, name: p.name || p.username, username: p.username } : null
}

async function findRow(db: any, pageId: string, dancer: { id: string, email: string }) {
  const [row] = await db.select({ id: profileContacts.id, dancerId: profileContacts.dancerId, phone: profileContacts.phone, status: profileContacts.status, source: profileContacts.source })
    .from(profileContacts)
    .where(and(eq(profileContacts.profileId, pageId), or(eq(profileContacts.dancerId, dancer.id), sql`lower(${profileContacts.email}) = lower(${dancer.email})`)))
    .limit(1)
  return row ?? null
}

async function dancerOf(db: any, dancerId: string) {
  const [d] = await db.select({ id: dancers.id, email: dancers.email, name: dancers.name }).from(dancers).where(eq(dancers.id, dancerId)).limit(1)
  return d ?? null
}

/** What the poll shows a signed-in dancer: the page, and whether it can reach them. */
export async function contactState(db: any, page: ContactPage, dancerId: string) {
  const d = await dancerOf(db, dancerId)
  const row = d ? await findRow(db, page.id, d) : null
  return { page: page.name, shared: !!row && !emailBlock(row), phone: (row?.phone as string | null) ?? null }
}

/**
 * Signing up for one of the page's events (RAZ-995): the page gets the dancer's name, email and phone to
 * run THAT event (changes, its WhatsApp group). A new contact gets source `signup`, which is not mailable;
 * "tell me about next ones" (`keepInTouch`) opts them in. Never unsubscribes or downgrades a contact:
 * an earlier opt-in stays.
 */
export async function recordSignupContact(db: any, page: ContactPage, dancerId: string, opts: { phone?: string | null, name?: string | null, eventId: string, keepInTouch: boolean }): Promise<{ created: boolean }> {
  const d = await dancerOf(db, dancerId)
  if (!d) return { created: false }
  const row = await findRow(db, page.id, d)
  const now = new Date()
  const phone = opts.phone?.trim() || null
  const optIn = opts.keepInTouch ? { opted_in: 'signup', opted_in_at: now.toISOString(), opted_in_event: opts.eventId } : {}
  if (row) {
    await db.update(profileContacts).set({
      dancerId: row.dancerId ?? d.id,
      ...(phone ? { phone } : {}),
      ...(opts.keepInTouch ? { status: 'subscribed', source: { ...(row.source ?? {}), ...optIn } } : {}),
      updatedAt: now,
    }).where(eq(profileContacts.id, row.id))
    return { created: false }
  }
  await db.insert(profileContacts).values({
    profileId: page.id, dancerId: d.id, email: d.email, name: opts.name?.trim() || d.name || null, phone,
    source: { from: 'signup', event: opts.eventId, ...optIn },
  })
  return { created: true }
}

/** Share (or stop sharing) the dancer's contact with the page. Returns whether a new contact was made. */
export async function setContactShared(db: any, page: ContactPage, dancerId: string, share: boolean, opts: { phone?: string | null, eventId: string }): Promise<{ created: boolean }> {
  const d = await dancerOf(db, dancerId)
  if (!d) return { created: false }
  const row = await findRow(db, page.id, d)
  const now = new Date()
  const phone = opts.phone?.trim() || null

  if (!share) {
    if (row) await db.update(profileContacts).set({ status: 'unsubscribed', updatedAt: now }).where(eq(profileContacts.id, row.id))
    return { created: false }
  }
  if (row) {
    await db.update(profileContacts).set({
      dancerId: row.dancerId ?? d.id,
      ...(phone ? { phone } : {}),
      status: 'subscribed',
      // Keeps where they first came from; the opt-in makes them mailable.
      source: { ...(row.source ?? {}), opted_in: 'rsvp', opted_in_at: now.toISOString(), opted_in_event: opts.eventId },
      updatedAt: now,
    }).where(eq(profileContacts.id, row.id))
    return { created: false }
  }
  await db.insert(profileContacts).values({
    profileId: page.id, dancerId: d.id, email: d.email, name: d.name || null, phone,
    source: { from: 'rsvp', event: opts.eventId },
  })
  return { created: true }
}
