/**
 * The morning-after "How was it?" email (RAZ-1011). A daily Vercel cron
 * (`/api/cron/review-asks`, vercel.json) finds the nights that have been over for 4–30 hours
 * and emails everyone who went (`signupsOf`: plan, poll, attendances, tickets). Each address
 * gets it once per event: the `event_review_asks` row is inserted first (unique on event +
 * email) and only a fresh insert sends. Festivals (`is_festival`) are left out — they are
 * reviewed as a festival; an event with a programme is asked like any night. Cancelled,
 * archived and unpublished events too.
 */
import { randomBytes } from 'node:crypto'
import { and, eq, gt, inArray, isNull, lt } from 'drizzle-orm'
import { eventReviewAsks, events, profiles } from '../database/schema'
import { eventPath } from '../../shared/utils/eventSlug'
import { inAskWindow, reviewAskSubject } from '../../shared/utils/eventReview'
import { signupsOf } from './eventCancel'
import { sendReviewAskEmail } from './email'

/** Look back this far for start dates (a long event can still end inside the window). */
const LOOKBACK_DAYS = 7

export const newAskToken = () => randomBytes(18).toString('base64url')

/** Published, not cancelled / archived / festival events whose night is due an ask at `now`. */
export async function dueEvents(db: any, now = new Date()): Promise<any[]> {
  const rows = await db.select().from(events).where(and(
    eq(events.published, true),
    eq(events.archived, false),
    eq(events.isFestival, false),
    isNull(events.cancelledAt),
    gt(events.startDate, new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000)),
    lt(events.startDate, now),
  ))
  return rows.filter((ev: any) => inAskWindow(ev, now.getTime()))
}

/** The name the email speaks for: the hosting page, else the organiser, else the venue. */
export async function hostName(db: any, ev: any): Promise<string | null> {
  const handles = [ev.organizerUsername, ev.venueUsername].filter(Boolean) as string[]
  if (ev.hostProfileId) {
    const [h] = await db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, ev.hostProfileId))
    if (h?.name) return h.name
  }
  if (handles.length) {
    const rows = await db.select({ username: profiles.username, name: profiles.name }).from(profiles).where(inArray(profiles.username, handles))
    const h = rows.find((r: any) => r.username === ev.organizerUsername) ?? rows.find((r: any) => r.username === ev.venueUsername)
    if (h?.name) return h.name
  }
  return ev.organizerName || ev.venueName || null
}

export type AskRun = { events: number; asked: number; skipped: number; failed: number; perEvent: { eventId: string; asked: number; failed: number }[] }

/** Send every due ask. Safe to re-run: an address already asked about an event is skipped. */
export async function sendReviewAsks(db: any, opts: { siteUrl: string; now?: Date }): Promise<AskRun> {
  const now = opts.now ?? new Date()
  const due = await dueEvents(db, now)
  const run: AskRun = { events: due.length, asked: 0, skipped: 0, failed: 0, perEvent: [] }
  for (const ev of due) {
    const people = await signupsOf(db, ev)
    if (!people.length) continue
    const host = await hostName(db, ev)
    const subject = reviewAskSubject(ev, host)
    const link = `${opts.siteUrl}${eventPath(ev)}`
    let asked = 0
    let failed = 0
    for (const p of people) {
      const email = p.email.trim().toLowerCase()
      const token = newAskToken()
      const [row] = await db.insert(eventReviewAsks).values({ eventId: ev.id, email, token })
        .onConflictDoNothing().returning({ id: eventReviewAsks.id })
      if (!row) { run.skipped++; continue }
      try {
        await sendReviewAskEmail({ to: p.email, name: p.name, subject, eventName: ev.name || 'the event', host, link, missedLink: `${link}?review=missed&t=${token}` })
        await db.update(eventReviewAsks).set({ sentAt: new Date() }).where(eq(eventReviewAsks.id, row.id))
        asked++
      } catch (e) {
        // The row stays without sent_at: never retried (once at most, never twice).
        console.error('[review-ask] email failed', ev.id, e)
        failed++
      }
    }
    run.asked += asked
    run.failed += failed
    run.perEvent.push({ eventId: ev.id, asked, failed })
  }
  return run
}

/** Has this address said "didn't make it" for the event? */
export async function saidMissed(db: any, eventId: string, email: string | null | undefined): Promise<boolean> {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return false
  const [row] = await db.select({ missedAt: eventReviewAsks.missedAt }).from(eventReviewAsks)
    .where(and(eq(eventReviewAsks.eventId, eventId), eq(eventReviewAsks.email, e)))
  return !!row?.missedAt
}
