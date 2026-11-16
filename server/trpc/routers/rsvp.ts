/**
 * The event RSVP as the organiser's poll (RAZ-718). A tap counts at once: a
 * signed-out answer is stored against an anonymous browser token, unconfirmed,
 * and the magic link (auth.requestMagicLink with redirect + do + guest) brings
 * the dancer back to answer again signed in, which confirms it and drops the
 * guest row. Answers, option sets and the summary: shared/utils/rsvp.ts.
 *
 * A confirmed "yes" answer also keeps the dancer's plan in step (plan_items +
 * attendances, like Going! did); "Next time" takes the event off the plan and
 * follows the organiser for the next date.
 */
import { z } from 'zod'
import { and, eq, gt, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { attendances, dancers, eventRsvps, events, festivalWaves, follows, planItems, profiles } from '../../database/schema'
import { publicEventWhere } from '../../utils/eventLookup'
import { eventGroup, trackServer } from '../../utils/posthog'
import { requireEventManager } from './businessEvents'
import {
  RSVP_ANSWERS, UNCONFIRMED_TTL_HOURS, isPartnerEvent, pairingAnswer, rsvpSummaryLine, summarizeRsvps,
  type RsvpAnswer,
} from '../../../shared/utils/rsvp'
import { mergeSignups } from '../../../shared/utils/rsvpPeople'
import { CONTACT_PHONE_MAX, contactPageFor, contactState, recordSignupContact, setContactShared } from '../../utils/rsvpContact'
import { PHONE_MAX, chosenPass, fullNameOk, phoneOk, pricedPasses, signupNeedsPhone } from '../../../shared/utils/eventSignup'
import type { FestivalDetails } from '../../../shared/types/festivalDetails'
import { findPass, isNight, nightCounts, nightPlanChanges, passCovers, plannable, sessionPlanId } from '../../../shared/utils/yourNight'

const eventParam = z.string().min(1).max(160)
const guestToken = z.string().uuid()
/** Faces the poll lists at most; anyone past it is still in the counts. */
const VOTERS_MAX = 60

type Ev = { id: string; styles: string[] | null; organizerUsername: string | null; venueUsername: string | null; hostProfileId: string | null; festival: FestivalDetails | null; type: string | null; isFestival: boolean | null }

async function findEvent(db: any, param: string): Promise<Ev> {
  for (const where of publicEventWhere(param)) {
    const [row] = await db
      .select({ id: events.id, styles: events.styles, organizerUsername: events.organizerUsername, venueUsername: events.venueUsername, hostProfileId: events.hostProfileId, festival: events.festival, type: events.type, isFestival: events.isFestival })
      .from(events).where(where).limit(1)
    if (row) return row
  }
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found' })
}

/** Answers that count: every confirmed one, plus unconfirmed ones younger than the TTL. */
function countedWhere(eventId: string) {
  const fresh = new Date(Date.now() - UNCONFIRMED_TTL_HOURS * 3600_000)
  return and(eq(eventRsvps.eventId, eventId), or(isNotNull(eventRsvps.confirmedAt), gt(eventRsvps.updatedAt, fresh)))
}

async function summary(db: any, eventId: string) {
  const rows = await db
    .select({ answer: eventRsvps.answer, confirmedAt: eventRsvps.confirmedAt })
    .from(eventRsvps).where(countedWhere(eventId))
  return summarizeRsvps(rows.map((r: any) => ({ answer: r.answer, confirmed: !!r.confirmedAt })))
}

/** The poll as one viewer sees it: counts, their own answer, and who pairs with them. */
async function pollFor(db: any, ev: Ev, viewer: { dancerId: string | null; guestToken?: string }) {
  const s = await summary(db, ev.id)
  const mineWhere = viewer.dancerId
    ? eq(eventRsvps.dancerId, viewer.dancerId)
    : viewer.guestToken ? and(isNull(eventRsvps.dancerId), eq(eventRsvps.guestToken, viewer.guestToken)) : null
  const [mine] = mineWhere
    ? await db.select({
        answer: eventRsvps.answer, confirmedAt: eventRsvps.confirmedAt, name: eventRsvps.name, phone: eventRsvps.phone,
        partnerName: eventRsvps.partnerName, pass: eventRsvps.pass, pay: eventRsvps.pay, keepInTouch: eventRsvps.keepInTouch,
      }).from(eventRsvps).where(and(eq(eventRsvps.eventId, ev.id), mineWhere)).limit(1)
    : []

  // Pairing: a confirmed "I need a leader" sees the confirmed "I need a follower"s (and back).
  let matches: { dancerId: string; name: string; photo: string | null; username: string | null; waved: boolean }[] = []
  const want = mine?.confirmedAt ? pairingAnswer(mine.answer) : null
  if (want && viewer.dancerId) {
    const rows = await db
      .select({ dancerId: dancers.id, name: dancers.name, photo: dancers.photo, username: dancers.username })
      .from(eventRsvps)
      .innerJoin(dancers, eq(eventRsvps.dancerId, dancers.id))
      .where(and(
        eq(eventRsvps.eventId, ev.id),
        eq(eventRsvps.answer, want),
        isNotNull(eventRsvps.confirmedAt),
        ne(dancers.id, viewer.dancerId),
        eq(dancers.profilePublic, true),
      ))
      .limit(12)
    const ids = rows.map((r: any) => r.dancerId)
    const waved = ids.length
      ? new Set((await db.select({ id: festivalWaves.targetDancerId }).from(festivalWaves).where(and(
          eq(festivalWaves.festivalSlug, ev.id),
          eq(festivalWaves.dancerId, viewer.dancerId),
          inArray(festivalWaves.targetDancerId, ids),
        ))).map((w: any) => w.id))
      : new Set()
    // First name only: they answered a class poll, not published a profile.
    matches = rows.map((r: any) => ({ dancerId: r.dancerId, name: String(r.name || '').split(' ')[0], photo: r.photo, username: r.username, waved: waved.has(r.dancerId) }))
  }

  // Who's coming (RAZ-974): like a WhatsApp poll, a signed-in viewer sees who
  // answered what. Confirmed answers of dancers whose profile is public, first
  // name + photo only; the rest stay in the counts.
  let voters: { dancerId: string; name: string; photo: string | null; username: string | null; answer: RsvpAnswer; me: boolean }[] = []
  if (viewer.dancerId) {
    const rows = await db
      .select({ dancerId: dancers.id, name: dancers.name, photo: dancers.photo, username: dancers.username, answer: eventRsvps.answer, profilePublic: dancers.profilePublic })
      .from(eventRsvps)
      .innerJoin(dancers, eq(eventRsvps.dancerId, dancers.id))
      .where(and(
        eq(eventRsvps.eventId, ev.id),
        ne(eventRsvps.answer, 'next'),
        isNotNull(eventRsvps.confirmedAt),
        or(eq(dancers.profilePublic, true), eq(dancers.id, viewer.dancerId)),
      ))
      .orderBy(eventRsvps.confirmedAt)
      .limit(VOTERS_MAX)
    voters = rows.map((r: any) => ({
      dancerId: r.dancerId,
      name: String(r.name || '').split(' ')[0],
      photo: r.photo,
      username: r.profilePublic === false ? null : r.username,
      answer: r.answer as RsvpAnswer,
      me: r.dancerId === viewer.dancerId,
    }))
  }

  // "Let <page> keep in touch": for a signed-in dancer who's coming.
  let contact: { page: string; shared: boolean; phone: string | null } | null = null
  if (viewer.dancerId && mine?.confirmedAt && mine.answer !== 'next') {
    const page = await contactPageFor(db, ev)
    if (page) contact = await contactState(db, page, viewer.dancerId)
  }

  return {
    eventId: ev.id,
    partner: isPartnerEvent(ev.styles),
    contact,
    counts: s.counts,
    unconfirmed: s.unconfirmed,
    coming: s.coming,
    mine: mine
      ? {
          answer: mine.answer as RsvpAnswer, confirmed: !!mine.confirmedAt,
          // The sign-up (RAZ-995) — the viewer's own row only.
          signup: { name: mine.name ?? null, phone: mine.phone ?? null, partnerName: mine.partnerName ?? null, pass: mine.pass ?? null, pay: (mine.pay ?? null) as 'now' | 'door' | null, keepInTouch: !!mine.keepInTouch },
        }
      : null,
    // A signed-in viewer's own account, for the sign-up's review card: it only asks for a missing phone.
    me: viewer.dancerId ? await accountOf(db, viewer.dancerId) : null,
    matches,
    voters,
  }
}

async function accountOf(db: any, dancerId: string): Promise<{ name: string, email: string, phone: string | null, photo: string | null } | null> {
  const [d] = await db.select({ name: dancers.name, email: dancers.email, phone: dancers.phone, photo: dancers.photo }).from(dancers).where(eq(dancers.id, dancerId)).limit(1)
  return d ? { name: d.name, email: d.email, phone: d.phone ?? null, photo: d.photo ?? null } : null
}

/**
 * After a sign-up is confirmed: the phone goes on the account (asked once), a fresh magic-link account gets
 * the name typed in the form (it was created with the email's first part), and the page that runs the
 * event gets the contact (recordSignupContact). Best-effort: the sign-up itself is already saved.
 */
async function afterSignup(db: any, ev: Ev, dancerId: string, s: { name?: string | null, phone?: string | null, keepInTouch: boolean }) {
  try {
    const [d] = await db.select({ name: dancers.name, email: dancers.email, phone: dancers.phone }).from(dancers).where(eq(dancers.id, dancerId)).limit(1)
    if (!d) return { created: false }
    const set: Record<string, unknown> = {}
    if (s.phone && s.phone !== d.phone) set.phone = s.phone
    // Only a name we made up from the email is replaced: never a name the dancer chose.
    if (s.name && fullNameOk(s.name) && d.name === String(d.email).split('@')[0]) set.name = s.name.trim()
    if (Object.keys(set).length) await db.update(dancers).set(set).where(eq(dancers.id, dancerId))
    const page = await contactPageFor(db, ev)
    if (!page) return { created: false }
    return await recordSignupContact(db, page, dancerId, { phone: s.phone, name: s.name, eventId: ev.id, keepInTouch: s.keepInTouch })
  } catch (e) {
    console.warn('[rsvp] after-signup failed', (e as Error)?.message ?? e)
    return { created: false }
  }
}

/** This dancer's booking as it was before this write — for nightPlanChanges. */
async function bookingBefore(db: any, eventId: string, dancerId: string): Promise<{ answer: string | null; pass: string | null } | null> {
  const [row] = await db.select({ answer: eventRsvps.answer, pass: eventRsvps.pass }).from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.dancerId, dancerId))).limit(1)
  return row ?? null
}

/**
 * A night's programme follows the booking (RAZ-1007): booking puts what the pass covers
 * on the plan (as the schedule saves it, `<key>:<session>`), a new pass adds only what
 * it newly covers (unticks survive "Change"), cancelling takes them all off.
 */
async function syncNight(db: any, dancerId: string, ev: Ev, before: { answer: string | null; pass: string | null } | null) {
  const f = ev.festival
  if (!f?.key || !isNight(f.sessions)) return
  const [after] = await db.select({ answer: eventRsvps.answer, pass: eventRsvps.pass }).from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.dancerId, dancerId))).limit(1)
  if (!after) return
  const { add, remove } = nightPlanChanges(f.sessions, f.passes, before, { answer: after.answer, pass: after.pass })
  if (remove.length) {
    await db.delete(planItems).where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'workshop'),
      inArray(planItems.itemId, remove.map(id => sessionPlanId(f.key, id)))))
  }
  if (add.length) {
    await db.insert(planItems).values(add.map(id => ({ dancerId, itemType: 'workshop', itemId: sessionPlanId(f.key, id) }))).onConflictDoNothing()
  }
}

/** A dancer's answer also keeps their plan in step: yes → on the plan, next → off it + follow the organiser. */
async function syncPlan(db: any, dancerId: string, ev: Ev, answer: RsvpAnswer, before: { answer: string | null; pass: string | null } | null = null) {
  try {
    if (answer === 'next') {
      await db.delete(planItems).where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'event'), eq(planItems.itemId, ev.id)))
      if (ev.isFestival && ev.festival?.key) {
        await db.delete(planItems).where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'festival'), eq(planItems.itemId, ev.festival.key)))
      }
      await db.delete(attendances).where(and(eq(attendances.eventId, ev.id), eq(attendances.dancerId, dancerId), ne(attendances.status, 'ticket_holder')))
      if (ev.organizerUsername) {
        const [org] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, ev.organizerUsername)).limit(1)
        if (org) await db.insert(follows).values({ dancerId, profileId: org.id }).onConflictDoNothing()
      }
    } else {
      await db.insert(planItems).values({ dancerId, itemType: 'event', itemId: ev.id }).onConflictDoNothing()
      // A festival is planned by the year (My plan → Year), so a booking puts it there too.
      if (ev.isFestival && ev.festival?.key) {
        await db.insert(planItems).values({ dancerId, itemType: 'festival', itemId: ev.festival.key }).onConflictDoNothing()
      }
      await db.insert(attendances).values({ eventId: ev.id, dancerId, status: 'going', source: 'click', visibility: 'hidden' }).onConflictDoNothing()
    }
    await syncNight(db, dancerId, ev, before)
  } catch (e) {
    // The answer itself is saved; the plan mirror is best-effort.
    console.warn('[rsvp] plan sync failed', (e as Error)?.message ?? e)
  }
}

export const rsvpRouter = router({
  /** Counts (visible before you answer), my answer, and who pairs with me. */
  poll: publicProcedure
    .input(z.object({ event: eventParam, guestToken: guestToken.optional() }))
    .query(async ({ ctx, input }) => {
      const ev = await findEvent(ctx.db, input.event)
      return pollFor(ctx.db, ev, { dancerId: ctx.dancerId ?? null, guestToken: input.guestToken })
    }),

  /**
   * Answer the poll. Signed in: saved confirmed (and any answer this browser
   * gave before signing in is folded in — that is the magic-link confirmation).
   * Signed out: saved against `guestToken`, unconfirmed.
   */
  answer: publicProcedure
    .input(z.object({ event: eventParam, answer: z.enum(RSVP_ANSWERS), guestToken: guestToken.optional() }))
    .mutation(async ({ ctx, input }) => {
      const ev = await findEvent(ctx.db, input.event)
      const now = new Date()
      const dancerId = ctx.dancerId ?? null

      if (!dancerId) {
        if (!input.guestToken) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing guest token' })
        // An email this browser already left on another answer comes along (RAZ-948).
        const [known] = await ctx.db.select({ email: eventRsvps.guestEmail }).from(eventRsvps)
          .where(and(eq(eventRsvps.guestToken, input.guestToken), isNull(eventRsvps.dancerId), isNotNull(eventRsvps.guestEmail))).limit(1)
        await ctx.db.insert(eventRsvps)
          .values({ eventId: ev.id, guestToken: input.guestToken, answer: input.answer, guestEmail: known?.email ?? null })
          .onConflictDoUpdate({ target: [eventRsvps.eventId, eventRsvps.guestToken], set: { answer: input.answer, updatedAt: now } })
        trackServer(ctx, 'rsvp_answered', { event_id: ev.id, answer: input.answer, signed_in: false, confirmed: false, ...eventGroup(ev) })
        return pollFor(ctx.db, ev, { dancerId: null, guestToken: input.guestToken })
      }

      // The unconfirmed answer this browser (or this magic link) gave before signing in.
      const [guest] = input.guestToken
        ? await ctx.db.select({
            id: eventRsvps.id, createdAt: eventRsvps.createdAt, name: eventRsvps.name, phone: eventRsvps.phone,
            partnerName: eventRsvps.partnerName, pass: eventRsvps.pass, pay: eventRsvps.pay, keepInTouch: eventRsvps.keepInTouch,
          }).from(eventRsvps)
            .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.guestToken, input.guestToken), isNull(eventRsvps.dancerId))).limit(1)
        : []
      if (guest) await ctx.db.delete(eventRsvps).where(eq(eventRsvps.id, guest.id))
      // A guest's sign-up (RAZ-995) comes along into the account: pass, how they pay, partner, phone.
      const signup = guest?.name
        ? { phone: guest.phone, partnerName: guest.partnerName, pass: guest.pass, pay: guest.pay, keepInTouch: !!guest.keepInTouch }
        : {}

      const before = await bookingBefore(ctx.db, ev.id, dancerId)
      await ctx.db.insert(eventRsvps)
        .values({ eventId: ev.id, dancerId, answer: input.answer, confirmedAt: now, ...signup })
        .onConflictDoUpdate({
          target: [eventRsvps.eventId, eventRsvps.dancerId],
          set: { answer: input.answer, updatedAt: now, confirmedAt: sql`coalesce(${eventRsvps.confirmedAt}, ${now})`, ...signup },
        })
      await syncPlan(ctx.db, dancerId, ev, input.answer, before)
      if (guest?.name && input.answer !== 'next') await afterSignup(ctx.db, ev, dancerId, { name: guest.name, phone: guest.phone, keepInTouch: !!guest.keepInTouch })

      if (guest) {
        const hours = guest.createdAt ? Math.round((now.getTime() - new Date(guest.createdAt).getTime()) / 360_000) / 10 : null
        trackServer(ctx, 'rsvp_confirmed', { event_id: ev.id, answer: input.answer, hours_to_confirm: hours, ...eventGroup(ev) })
      } else {
        trackServer(ctx, 'rsvp_answered', { event_id: ev.id, answer: input.answer, signed_in: true, confirmed: true, ...eventGroup(ev) })
      }
      return pollFor(ctx.db, ev, { dancerId })
    }),

  /**
   * Sign up (RAZ-995): the answer to "How are you coming?" plus the pass, pay now / at the door, and the
   * contact the organiser gets for this event. Signed in: confirmed at once, the phone goes on the account
   * and the page's Contacts. Signed out: saved against the browser's guest token, unconfirmed, with name
   * and phone; the client then sends the magic link (auth.requestMagicLink with `guest`), which folds it
   * into the account (rsvp.answer above). Payment itself is festivalSignup.ticketCheckout.
   */
  signUp: publicProcedure
    .input(z.object({
      event: eventParam,
      answer: z.enum(RSVP_ANSWERS).refine(a => a !== 'next', 'Pick how you are coming.'),
      guestToken: guestToken.optional(),
      pass: z.string().trim().max(80).optional(),
      pay: z.enum(['now', 'door']).optional(),
      name: z.string().trim().max(120).optional(),
      phone: z.string().trim().max(PHONE_MAX).default(''),
      partnerName: z.string().trim().max(120).optional(),
      keepInTouch: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const ev = await findEvent(ctx.db, input.event)
      const bad = (message: string) => new TRPCError({ code: 'BAD_REQUEST', message })
      let pass: string | null = null
      let pay: 'now' | 'door' | null = null
      if (pricedPasses(ev.festival?.passes).length) {
        const p = chosenPass(ev.festival?.passes ?? [], input.pass, input.answer)
        if (!p) throw bad(input.pass ? 'That pass isn’t for how you’re coming. Pick another.' : 'Pick a pass.')
        if (p.soldOut) throw bad('That pass is sold out.')
        if (!input.pay) throw bad('Choose how you pay.')
        if (input.pay === 'door' && !ev.festival?.payAtDoor) throw bad('This organiser takes payment online only.')
        pass = p.name
        pay = input.pay
      }
      if (signupNeedsPhone({ type: ev.type, passes: ev.festival?.passes }) ? !phoneOk(input.phone) : (!!input.phone && !phoneOk(input.phone))) {
        throw bad('Enter your phone, so the organiser can reach you about this event.')
      }
      const fields = {
        answer: input.answer,
        phone: input.phone || null,
        partnerName: input.answer === 'partner' ? (input.partnerName || null) : null,
        pass,
        pay,
        keepInTouch: input.keepInTouch,
      }
      const dancerId = ctx.dancerId ?? null
      const now = new Date()
      const track = (signedIn: boolean) => trackServer(ctx, 'event_signed_up', {
        event_id: ev.id, answer: input.answer, signed_in: signedIn, has_pass: !!pass, pay, people: input.answer === 'partner' ? 2 : 1,
        keep_in_touch: input.keepInTouch, ...eventGroup(ev),
      })

      if (!dancerId) {
        if (!input.guestToken) throw bad('Missing guest token')
        if (!fullNameOk(input.name)) throw bad('Enter your first and last name.')
        const [known] = await ctx.db.select({ email: eventRsvps.guestEmail }).from(eventRsvps)
          .where(and(eq(eventRsvps.guestToken, input.guestToken), isNull(eventRsvps.dancerId), isNotNull(eventRsvps.guestEmail))).limit(1)
        await ctx.db.insert(eventRsvps)
          .values({ eventId: ev.id, guestToken: input.guestToken, guestEmail: known?.email ?? null, name: input.name!, ...fields })
          .onConflictDoUpdate({ target: [eventRsvps.eventId, eventRsvps.guestToken], set: { name: input.name!, ...fields, updatedAt: now } })
        track(false)
        return pollFor(ctx.db, ev, { dancerId: null, guestToken: input.guestToken })
      }

      const before = await bookingBefore(ctx.db, ev.id, dancerId)
      await ctx.db.insert(eventRsvps)
        .values({ eventId: ev.id, dancerId, confirmedAt: now, ...fields })
        .onConflictDoUpdate({
          target: [eventRsvps.eventId, eventRsvps.dancerId],
          set: { ...fields, updatedAt: now, confirmedAt: sql`coalesce(${eventRsvps.confirmedAt}, ${now})` },
        })
      await syncPlan(ctx.db, dancerId, ev, input.answer, before)
      await afterSignup(ctx.db, ev, dancerId, { phone: input.phone, keepInTouch: input.keepInTouch })
      track(true)
      return pollFor(ctx.db, ev, { dancerId })
    }),

  /**
   * "Let <page> keep in touch": share my email (and optionally a phone) with the
   * page running the event, as its contact — or stop. Signed in, and only for an
   * event I'm coming to.
   */
  shareContact: protectedProcedure
    .input(z.object({ event: eventParam, share: z.boolean(), phone: z.string().trim().max(CONTACT_PHONE_MAX).optional() }))
    .mutation(async ({ ctx, input }) => {
      const ev = await findEvent(ctx.db, input.event)
      const [mine] = await ctx.db.select({ answer: eventRsvps.answer }).from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.dancerId, ctx.dancerId))).limit(1)
      if (input.share && (!mine || mine.answer === 'next')) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Answer the poll first.' })
      const page = await contactPageFor(ctx.db, ev)
      if (!page) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event has no page to keep in touch with.' })
      const { created } = await setContactShared(ctx.db, page, ctx.dancerId, input.share, { phone: input.phone, eventId: ev.id })
      trackServer(ctx, 'rsvp_contact_shared', { event_id: ev.id, share: input.share, has_phone: !!input.phone, new_contact: created, ...eventGroup(ev) })
      return pollFor(ctx.db, ev, { dancerId: ctx.dancerId })
    }),

  /** The organiser's view: the same buckets plus a one-line read. Event managers only. */
  summary: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ev = await requireEventManager(ctx, input.eventId)
      const s = await summary(ctx.db, ev.id)
      const partner = isPartnerEvent(ev.styles)
      return { ...s, partner, festival: !!ev.isFestival, line: rsvpSummaryLine(s, partner) }
    }),

  /**
   * A night's programme for the organiser (RAZ-1007): how many come to each item
   * (bookings × what each dancer ticked; a guest counts for what their pass covers),
   * leaders / followers, and when they arrive. Null when the programme isn't a night.
   * Event managers only; counts, never names.
   */
  night: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ev = await requireEventManager(ctx, input.eventId)
      const f = ev.festival as FestivalDetails | null
      if (!f?.key || !isNight(f.sessions)) return null
      const rows = await ctx.db.select({ dancerId: eventRsvps.dancerId, answer: eventRsvps.answer, pass: eventRsvps.pass })
        .from(eventRsvps).where(and(countedWhere(ev.id), ne(eventRsvps.answer, 'next')))
      const dancerIds = rows.map((r: any) => r.dancerId).filter(Boolean) as string[]
      const picks = dancerIds.length
        ? await ctx.db.select({ dancerId: planItems.dancerId, itemId: planItems.itemId }).from(planItems)
            .where(and(eq(planItems.itemType, 'workshop'), inArray(planItems.dancerId, dancerIds), sql`${planItems.itemId} like ${`${f.key}:%`}`))
        : []
      const prefix = `${f.key}:`
      const byDancer = new Map<string, string[]>()
      for (const p of picks as any[]) byDancer.set(p.dancerId, [...(byDancer.get(p.dancerId) ?? []), String(p.itemId).slice(prefix.length)])
      const bookings = rows.map((r: any) => ({
        answer: r.answer,
        items: r.dancerId ? (byDancer.get(r.dancerId) ?? []) : passCovers(findPass(f.passes, r.pass), f.sessions).map(x => x.id),
      }))
      const counts = nightCounts(f.sessions, bookings)
      const items = plannable(f.sessions)
      return {
        items: counts.items.map(c => { const s = items.find(x => x.id === c.id)!; return { ...c, time: s.time, title: s.title, type: s.type } }),
        arrivals: counts.arrivals,
      }
    }),

  /**
   * The organiser's list behind the counts: who answered the poll, put it on
   * their plan or holds a ticket, with name and photo (never email). Event managers only.
   */
  people: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ev = await requireEventManager(ctx, input.eventId)
      const [polls, att, plans] = await Promise.all([
        ctx.db.select({ dancerId: eventRsvps.dancerId, answer: eventRsvps.answer, confirmedAt: eventRsvps.confirmedAt })
          .from(eventRsvps).where(countedWhere(ev.id)),
        ctx.db.select({ dancerId: attendances.dancerId, status: attendances.status, checkedInAt: attendances.checkedInAt })
          .from(attendances).where(and(eq(attendances.eventId, ev.id), inArray(attendances.status, ['going', 'ticket_holder']))),
        ctx.db.select({ dancerId: planItems.dancerId }).from(planItems)
          .where(and(eq(planItems.itemType, 'event'), eq(planItems.itemId, ev.id))),
      ])
      const ids = [...new Set<string>([...polls, ...att, ...plans].map((r: any) => r.dancerId).filter(Boolean))]
      const people = ids.length
        ? await ctx.db.select({ id: dancers.id, name: dancers.name, photo: dancers.photo, username: dancers.username })
            .from(dancers).where(inArray(dancers.id, ids))
        : []
      return mergeSignups({
        polls: polls.map((r: any) => ({ dancerId: r.dancerId, answer: r.answer, confirmed: !!r.confirmedAt })),
        attendances: att.map((a: any) => ({ dancerId: a.dancerId, status: a.status, checkedIn: !!a.checkedInAt })),
        plans,
        people,
      })
    }),
})
