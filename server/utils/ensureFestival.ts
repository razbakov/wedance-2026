/**
 * Ensure a row exists in the `festivals` table for the given slug.
 *
 * Many social features (roommate matching, ride sharing, dinners) reference
 * `festivals.id` via foreign key. Festival-type events store their key in
 * `events.festival->>'key'`, but a corresponding `festivals` row is only
 * created by the seed script for a handful of hardcoded festivals. This
 * helper auto-creates the row on demand so the features work for every
 * festival event.
 */
import { eq, sql } from 'drizzle-orm'
import { festivals, events } from '../database/schema'

export async function ensureFestival(db: any, festivalSlug: string): Promise<string | null> {
  const [existing] = await db
    .select({ id: festivals.id })
    .from(festivals)
    .where(eq(festivals.slug, festivalSlug))

  if (existing) return existing.id

  // Look up the event whose festival JSON key matches this slug.
  const [ev] = await db
    .select({
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      city: events.city,
      ticketUrl: events.ticketUrl,
    })
    .from(events)
    .where(sql`${events.festival}->>'key' = ${festivalSlug}`)
    .limit(1)

  if (!ev) return null

  // startDate/endDate come back as Date objects from the events table
  // (timestamp columns); the festivals table uses date (text) columns.
  const startDate = ev.startDate instanceof Date ? ev.startDate.toISOString().slice(0, 10) : ev.startDate
  const endDate = ev.endDate instanceof Date ? ev.endDate.toISOString().slice(0, 10) : ev.endDate

  const [created] = await db
    .insert(festivals)
    .values({
      slug: festivalSlug,
      name: ev.name || festivalSlug,
      startDate,
      endDate,
      city: ev.city || null,
      ticketUrl: ev.ticketUrl || null,
      maxFreeSpots: 10,
    })
    .onConflictDoNothing()
    .returning({ id: festivals.id })

  // Race condition: another request created it between our SELECT and INSERT.
  if (!created) {
    const [raced] = await db
      .select({ id: festivals.id })
      .from(festivals)
      .where(eq(festivals.slug, festivalSlug))
    return raced?.id ?? null
  }

  return created.id
}
