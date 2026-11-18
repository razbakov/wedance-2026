import { z } from 'zod'
import { eq, and, sql, inArray, ne, isNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { attendances, dancers, eventRsvps, events } from '../../database/schema'
import { eventGroup, trackServer } from '../../utils/posthog'
import { requireEventManager } from './businessEvents'
import { isPartnerEvent, UNCONFIRMED_TTL_HOURS } from '../../../shared/utils/rsvp'
import { loadDoorGuests, passHolder, passSource, stubWhere, type DoorEvent } from '../../utils/doorGuests'

const visibilityEnum = z.enum(['hidden', 'public_minimal', 'public_full'])
const statusEnum = z.enum(['interested', 'going', 'none'])

export const attendanceRouter = router({
  /**
   * Set attendance status for an event. 'none' removes the attendance.
   * Default visibility = hidden (opt-in, per RAZ-313).
   */
  set: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      status: statusEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify event exists.
      const [event] = await ctx.db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, input.eventId))

      if (!event) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' })
      }

      if (input.status === 'none') {
        // Remove attendance (only if not a ticket_holder — tickets can't be un-attended).
        await ctx.db
          .delete(attendances)
          .where(
            and(
              eq(attendances.eventId, input.eventId),
              eq(attendances.dancerId, ctx.dancerId),
              ne(attendances.status, 'ticket_holder'),
            ),
          )
        return { status: null }
      }

      // Upsert: don't downgrade a ticket_holder.
      const [existing] = await ctx.db
        .select({ id: attendances.id, status: attendances.status })
        .from(attendances)
        .where(
          and(
            eq(attendances.eventId, input.eventId),
            eq(attendances.dancerId, ctx.dancerId),
          ),
        )

      if (existing) {
        // Never downgrade ticket_holder via a click.
        if (existing.status === 'ticket_holder') {
          return { status: 'ticket_holder' as const }
        }
        await ctx.db
          .update(attendances)
          .set({ status: input.status, updatedAt: new Date() })
          .where(eq(attendances.id, existing.id))
        return { status: input.status }
      }

      // Insert new attendance.
      await ctx.db
        .insert(attendances)
        .values({
          eventId: input.eventId,
          dancerId: ctx.dancerId,
          status: input.status,
          source: 'click',
          visibility: 'hidden',
        })
        .onConflictDoNothing()

      return { status: input.status }
    }),

  /**
   * Get the caller's attendance for a specific event.
   */
  mine: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: attendances.id,
          status: attendances.status,
          visibility: attendances.visibility,
          partnerStatus: attendances.partnerStatus,
          travelBookedAt: attendances.travelBookedAt,
          stayBookedAt: attendances.stayBookedAt,
          vacationBookedAt: attendances.vacationBookedAt,
          checkedInAt: attendances.checkedInAt,
          verifiedAt: attendances.verifiedAt,
          source: attendances.source,
        })
        .from(attendances)
        .where(
          and(
            eq(attendances.eventId, input.eventId),
            eq(attendances.dancerId, ctx.dancerId),
          ),
        )

      return row ?? null
    }),

  /**
   * Set the visibility of the caller's attendance.
   */
  setVisibility: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      visibility: visibilityEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(attendances)
        .set({ visibility: input.visibility, updatedAt: new Date() })
        .where(
          and(
            eq(attendances.eventId, input.eventId),
            eq(attendances.dancerId, ctx.dancerId),
          ),
        )
        .returning({ visibility: attendances.visibility })

      if (result.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No attendance for this event' })
      }

      return { visibility: result[0].visibility }
    }),

  /**
   * Update logistics (partner status, travel/stay/vacation booked).
   * These were localStorage toggles; now they're server state.
   */
  updateLogistics: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      partnerStatus: z.enum(['looking', 'found']).nullish(),
      travelBooked: z.boolean().optional(),
      stayBooked: z.boolean().optional(),
      vacationBooked: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const set: Record<string, unknown> = { updatedAt: new Date() }
      if (input.partnerStatus !== undefined) set.partnerStatus = input.partnerStatus
      if (input.travelBooked !== undefined) set.travelBookedAt = input.travelBooked ? new Date() : null
      if (input.stayBooked !== undefined) set.stayBookedAt = input.stayBooked ? new Date() : null
      if (input.vacationBooked !== undefined) set.vacationBookedAt = input.vacationBooked ? new Date() : null

      const result = await ctx.db
        .update(attendances)
        .set(set)
        .where(
          and(
            eq(attendances.eventId, input.eventId),
            eq(attendances.dancerId, ctx.dancerId),
          ),
        )
        .returning({ id: attendances.id })

      if (result.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No attendance for this event' })
      }

      return { ok: true }
    }),

  /**
   * Public attendee list for an event. One public rule (ADR-008):
   * visible = status IN (going, ticket_holder) AND visibility <> hidden AND profile_public.
   * Ticket holders carry a verified badge.
   */
  publicList: publicProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          dancerId: attendances.dancerId,
          name: dancers.name,
          photo: dancers.photo,
          city: dancers.city,
          username: dancers.username,
          status: attendances.status,
          visibility: attendances.visibility,
        })
        .from(attendances)
        .innerJoin(dancers, eq(attendances.dancerId, dancers.id))
        .where(
          and(
            eq(attendances.eventId, input.eventId),
            inArray(attendances.status, ['going', 'ticket_holder']),
            ne(attendances.visibility, 'hidden'),
            eq(dancers.profilePublic, true),
          ),
        )
        .limit(input.limit)

      // Counts include hidden attendees (counted, never listed).
      const [counts] = await ctx.db
        .select({
          going: sql<number>`count(*) filter (where ${attendances.status} = 'going')::int`,
          verified: sql<number>`count(*) filter (where ${attendances.status} = 'ticket_holder')::int`,
          hidden: sql<number>`count(*) filter (where ${attendances.visibility} = 'hidden')::int`,
        })
        .from(attendances)
        .where(
          and(
            eq(attendances.eventId, input.eventId),
            inArray(attendances.status, ['going', 'ticket_holder']),
          ),
        )

      return {
        attendees: rows.map(r => ({
          dancerId: r.dancerId,
          name: r.name,
          photo: r.visibility === 'public_full' ? r.photo : null,
          city: r.city,
          username: r.username,
          verified: r.status === 'ticket_holder',
        })),
        counts: {
          going: counts?.going ?? 0,
          verified: counts?.verified ?? 0,
          hidden: counts?.hidden ?? 0,
        },
      }
    }),

  /**
   * Batch counts for event cards (replaces plan.countBatch for the new model).
   * Returns going + verified counts + up to 10 face URLs per event.
   */
  counts: publicProcedure
    .input(z.object({
      eventIds: z.array(z.string().uuid()).min(1).max(100),
    }))
    .query(async ({ ctx, input }) => {
      // Aggregate counts per event.
      const rows = await ctx.db
        .select({
          eventId: attendances.eventId,
          going: sql<number>`count(*) filter (where ${attendances.status} = 'going')::int`,
          verified: sql<number>`count(*) filter (where ${attendances.status} = 'ticket_holder')::int`,
        })
        .from(attendances)
        .where(
          and(
            inArray(attendances.eventId, input.eventIds),
            inArray(attendances.status, ['going', 'ticket_holder']),
          ),
        )
        .groupBy(attendances.eventId)

      // Faces: up to 10 visible attendees with photos per event.
      const faceRows = await ctx.db
        .select({
          eventId: attendances.eventId,
          photo: dancers.photo,
        })
        .from(attendances)
        .innerJoin(dancers, eq(attendances.dancerId, dancers.id))
        .where(
          and(
            inArray(attendances.eventId, input.eventIds),
            inArray(attendances.status, ['going', 'ticket_holder']),
            eq(attendances.visibility, 'public_full'),
            eq(dancers.profilePublic, true),
            sql`${dancers.photo} IS NOT NULL AND ${dancers.photo} <> ''`,
          ),
        )
        .limit(input.eventIds.length * 10)

      const facesMap = new Map<string, string[]>()
      for (const f of faceRows) {
        const arr = facesMap.get(f.eventId) ?? []
        if (arr.length < 10) arr.push(f.photo!)
        facesMap.set(f.eventId, arr)
      }

      const result: Record<string, { going: number; verified: number; faces: string[] }> = {}
      for (const id of input.eventIds) {
        result[id] = { going: 0, verified: 0, faces: [] }
      }
      for (const r of rows) {
        result[r.eventId] = {
          going: r.going,
          verified: r.verified,
          faces: facesMap.get(r.eventId) ?? [],
        }
      }
      return result
    }),

  /**
   * Proof showcase for the landing page: the first verified ticket holder
   * with a public_full visibility, used as social proof.
   */
  proofShowcase: publicProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({
        dancerName: dancers.name,
        dancerPhoto: dancers.photo,
        dancerCity: dancers.city,
        dancerUsername: dancers.username,
        eventName: events.name,
        eventSlug: events.slug,
      })
      .from(attendances)
      .innerJoin(dancers, eq(attendances.dancerId, dancers.id))
      .innerJoin(events, eq(attendances.eventId, events.id))
      .where(
        and(
          eq(attendances.status, 'ticket_holder'),
          eq(attendances.visibility, 'public_full'),
          eq(dancers.profilePublic, true),
          sql`${dancers.photo} IS NOT NULL AND ${dancers.photo} <> ''`,
          eq(events.archived, false),
        ),
      )
      .orderBy(sql`${attendances.verifiedAt} DESC NULLS LAST`)
      .limit(1)

    return row ?? null
  }),

  /**
   * The door list: RSVPs (not "next time"), Going!, tickets and festival passes.
   * Names only — a guest's typed name, never an email or a phone. Event managers only.
   */
  door: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ev = await requireEventManager(ctx, input.eventId)
      const guests = await loadDoorGuests(ctx.db, ev)
      return {
        eventName: ev.name || 'Event',
        partner: isPartnerEvent(ev.styles),
        here: guests.filter(g => g.checkedIn).length,
        total: guests.length,
        guests,
      }
    }),

  /**
   * Check a guest in, or take it back (`undo`). One of attendanceId (an existing
   * row, including an unclaimed ticket), dancerId (someone on the door list;
   * creates their attendance if the RSVP or Going! never did), rsvpId (a
   * signed-out answer) or signupId (an unclaimed festival pass).
   * Event managers only. Checking in twice records nothing new.
   */
  checkIn: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      attendanceId: z.string().uuid().optional(),
      dancerId: z.string().uuid().optional(),
      rsvpId: z.string().uuid().optional(),
      signupId: z.string().uuid().optional(),
      undo: z.boolean().optional(),
    }).refine(i => [i.attendanceId, i.dancerId, i.rsvpId, i.signupId].filter(Boolean).length === 1, {
      message: 'Name one guest: an attendance, a dancer, an RSVP or a pass.',
    }))
    .mutation(async ({ ctx, input }) => {
      const ev = await requireEventManager(ctx, input.eventId)
      const undo = !!input.undo
      if (input.attendanceId) return markAttendance(ctx, ev, input.attendanceId, undo)
      if (input.rsvpId) return markRsvp(ctx, ev, input.rsvpId, undo)
      if (input.signupId) return markPass(ctx, ev, input.signupId, undo)
      return markDancer(ctx, ev, input.dancerId!, undo)
    }),
})

type DoorCtx = { db: any; dancerId: string; waitUntil?: (p: Promise<unknown>) => void }

function trackCheckIn(ctx: DoorCtx, ev: { id: string; isFestival?: boolean | null; organizerUsername?: string | null; venueUsername?: string | null }) {
  trackServer(ctx, 'checked_in', { event_id: ev.id, is_festival: !!ev.isFestival, ...eventGroup(ev) })
}

/** Set checked_in_at only when it was empty, so a second tap does not count again. */
async function stampAttendance(db: any, where: any, now: Date): Promise<{ checkedInAt: Date | null; fresh: boolean }> {
  const updated = await db.update(attendances)
    .set({ checkedInAt: now, updatedAt: now })
    .where(and(where, isNull(attendances.checkedInAt)))
    .returning({ checkedInAt: attendances.checkedInAt })
  if (updated.length) return { checkedInAt: updated[0].checkedInAt, fresh: true }
  const [row] = await db.select({ checkedInAt: attendances.checkedInAt }).from(attendances).where(where).limit(1)
  if (!row?.checkedInAt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance not found' })
  return { checkedInAt: row.checkedInAt, fresh: false }
}

async function clearAttendance(db: any, where: any) {
  await db.update(attendances).set({ checkedInAt: null, updatedAt: new Date() }).where(where)
  return { checkedInAt: null, checkedIn: false as const }
}

async function markAttendance(ctx: DoorCtx, ev: DoorEvent & { id: string; isFestival?: boolean | null; organizerUsername?: string | null; venueUsername?: string | null }, attendanceId: string, undo: boolean) {
  const where = and(eq(attendances.id, attendanceId), eq(attendances.eventId, ev.id))
  if (undo) {
    const [row] = await ctx.db.select({ id: attendances.id }).from(attendances).where(where).limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Attendance not found' })
    return clearAttendance(ctx.db, where)
  }
  const now = new Date()
  const { checkedInAt, fresh } = await stampAttendance(ctx.db, where, now)
  if (fresh) trackCheckIn(ctx, ev)
  return { checkedInAt, checkedIn: true as const }
}

async function markRsvp(ctx: DoorCtx, ev: any, rsvpId: string, undo: boolean) {
  const [row] = await ctx.db.select({
    id: eventRsvps.id, dancerId: eventRsvps.dancerId, answer: eventRsvps.answer,
    confirmedAt: eventRsvps.confirmedAt, updatedAt: eventRsvps.updatedAt, checkedInAt: eventRsvps.checkedInAt,
  }).from(eventRsvps).where(and(eq(eventRsvps.id, rsvpId), eq(eventRsvps.eventId, ev.id))).limit(1)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'That RSVP isn’t for this event.' })
  if (row.dancerId) return markDancer(ctx, ev, row.dancerId, undo)
  if (!undo) {
    if (row.answer === 'next') throw new TRPCError({ code: 'BAD_REQUEST', message: 'They said next time, so they’re not on the door list.' })
    const fresh = !!row.confirmedAt || (row.updatedAt && new Date(row.updatedAt).getTime() > Date.now() - UNCONFIRMED_TTL_HOURS * 3600_000)
    if (!fresh) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That answer expired before it was confirmed.' })
  }
  if (undo) {
    await ctx.db.update(eventRsvps).set({ checkedInAt: null, updatedAt: new Date() }).where(eq(eventRsvps.id, row.id))
    return { checkedInAt: null, checkedIn: false as const }
  }
  if (row.checkedInAt) return { checkedInAt: row.checkedInAt, checkedIn: true as const }
  const now = new Date()
  await ctx.db.update(eventRsvps).set({ checkedInAt: now, updatedAt: now }).where(eq(eventRsvps.id, row.id))
  trackCheckIn(ctx, ev)
  return { checkedInAt: now, checkedIn: true as const }
}

async function markDancer(ctx: DoorCtx, ev: any, dancerId: string, undo: boolean) {
  const guests = await loadDoorGuests(ctx.db, ev)
  const guest = guests.find(g => g.dancerId === dancerId)
  if (!guest) throw new TRPCError({ code: 'BAD_REQUEST', message: 'They’re not on this event’s list.' })
  const where = and(eq(attendances.eventId, ev.id), eq(attendances.dancerId, dancerId))
  if (undo) return clearAttendance(ctx.db, where)
  const now = new Date()
  const ticket = guest.via === 'ticket'
  const inserted = await ctx.db.insert(attendances).values({
    eventId: ev.id,
    dancerId,
    status: ticket ? 'ticket_holder' : 'going',
    source: ticket ? await passSource(ctx.db, ev, dancerId) : 'click',
    visibility: 'hidden',
    checkedInAt: now,
    ...(ticket ? { verifiedAt: now } : {}),
  }).onConflictDoNothing({ target: [attendances.eventId, attendances.dancerId] }).returning({ checkedInAt: attendances.checkedInAt })
  if (inserted.length) {
    trackCheckIn(ctx, ev)
    return { checkedInAt: inserted[0].checkedInAt, checkedIn: true as const }
  }
  const stamped = await stampAttendance(ctx.db, where, now)
  if (stamped.fresh) trackCheckIn(ctx, ev)
  // A festival pass is a paid order: the attendance shows as a ticket in Who's coming.
  if (ticket) {
    await ctx.db.update(attendances).set({
      status: 'ticket_holder',
      verifiedAt: sql`coalesce(${attendances.verifiedAt}, ${now})`,
      updatedAt: now,
    }).where(and(where, ne(attendances.status, 'ticket_holder')))
  }
  return { checkedInAt: stamped.checkedInAt, checkedIn: true as const }
}

async function markPass(ctx: DoorCtx, ev: any, signupId: string, undo: boolean) {
  const holder = await passHolder(ctx.db, ev, signupId)
  if (!holder) throw new TRPCError({ code: 'NOT_FOUND', message: 'That pass isn’t for this event.' })
  if ('dancerId' in holder) return markDancer(ctx, ev, holder.dancerId, undo)
  const where = stubWhere(ev.id, holder.email)
  if (undo) return clearAttendance(ctx.db, where)
  const now = new Date()
  const [existing] = await ctx.db.select({ id: attendances.id, checkedInAt: attendances.checkedInAt }).from(attendances).where(where).limit(1)
  if (existing?.checkedInAt) return { checkedInAt: existing.checkedInAt, checkedIn: true as const }
  if (existing) {
    const stamped = await stampAttendance(ctx.db, where, now)
    if (stamped.fresh) trackCheckIn(ctx, ev)
    return { checkedInAt: stamped.checkedInAt, checkedIn: true as const }
  }
  await ctx.db.insert(attendances).values({
    eventId: ev.id, buyerEmail: holder.email, status: 'ticket_holder', source: holder.source,
    visibility: 'hidden', checkedInAt: now, verifiedAt: now,
  })
  trackCheckIn(ctx, ev)
  return { checkedInAt: now, checkedIn: true as const }
}

