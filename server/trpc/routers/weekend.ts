/**
 * Share my weekend (#527). A dancer shares the parties they're going to this
 * week as /w/<code> plus an Instagram story made in the browser. Friends open
 * the link and tap "I'm in" on a party — signed in (it goes on their plan) or
 * as a guest with a first name (an unconfirmed "yes" on the event's poll) —
 * and the sharer gets an email for each new friend. The share is a snapshot
 * of event ids, so a posted story never changes under the people reading it.
 */
import { z } from 'zod'
import { and, desc, eq, gte, inArray, isNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { attendances, dancers, eventRsvps, events, planItems, weekendShareJoins, weekendShares } from '../../database/schema'
import { weekSocials } from '../../utils/myPlanFeeds'
import { sendWeekendJoinEmail } from '../../utils/email'
import { trackServer } from '../../utils/posthog'
import { eventPath } from '../../../shared/utils/eventSlug'
import { formatEventWhen } from '../../../shared/utils/eventTime'
import {
  WEEKEND_CODE_RE, WEEKEND_MAX_EVENTS, WEEKEND_REUSE_DAYS,
  cleanGuestName, firstName, newWeekendCode, sameEventSet,
} from '../../../shared/utils/weekendShare'

const code = z.string().regex(WEEKEND_CODE_RE)
const guestToken = z.string().uuid()
const siteUrl = () => (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
export const weekendUrl = (c: string) => `${siteUrl()}/w/${c}`

type Db = any

async function findShare(db: Db, c: string) {
  const [s] = await db.select().from(weekendShares).where(eq(weekendShares.code, c)).limit(1)
  return s as typeof weekendShares.$inferSelect | undefined
}

export type WeekendParty = {
  id: string
  path: string
  name: string
  startDate: string
  endDate: string | null
  timezone: string | null
  venueName: string
  city: string
  styles: string[]
  cover: string
  price: string
  ended: boolean
  coming: { name: string; photo: string | null }[]
  joinedByMe: boolean
}

export type WeekendView = {
  code: string
  url: string
  isOwner: boolean
  sharer: { name: string; photo: string | null }
  events: WeekendParty[]
  friends: number
  createdAt: string | null
}

/** The page as one viewer sees it. */
async function view(db: Db, share: typeof weekendShares.$inferSelect, viewer: { dancerId: string | null; guestToken?: string }): Promise<WeekendView> {
  const [owner] = await db
    .select({ name: dancers.name, photo: dancers.photo })
    .from(dancers).where(eq(dancers.id, share.dancerId)).limit(1)

  const ids = share.eventIds ?? []
  const rows = ids.length
    ? await db
        .select({
          id: events.id, name: events.name, startDate: events.startDate, endDate: events.endDate,
          timezone: events.timezone, venueName: events.venueName, city: events.city, styles: events.styles,
          cover: events.cover, price: events.price, published: events.published, archived: events.archived,
        })
        .from(events).where(inArray(events.id, ids))
    : []

  const joins = await db
    .select({
      eventId: weekendShareJoins.eventId, name: weekendShareJoins.name, dancerId: weekendShareJoins.dancerId,
      guestToken: weekendShareJoins.guestToken, photo: dancers.photo, profilePublic: dancers.profilePublic,
    })
    .from(weekendShareJoins)
    .leftJoin(dancers, eq(weekendShareJoins.dancerId, dancers.id))
    .where(eq(weekendShareJoins.shareId, share.id))
    .orderBy(weekendShareJoins.createdAt)

  const mine = (j: any) => (viewer.dancerId && j.dancerId === viewer.dancerId) || (!j.dancerId && viewer.guestToken && j.guestToken === viewer.guestToken)
  const now = Date.now()
  const list: WeekendParty[] = rows
    .filter((e: any) => e.published && !e.archived)
    .map((e: any): WeekendParty => {
      const start = new Date(e.startDate)
      const end = e.endDate ? new Date(e.endDate) : new Date(start.getTime() + 4 * 3600_000)
      const js = joins.filter((j: any) => j.eventId === e.id)
      return {
        id: e.id as string,
        path: eventPath({ id: e.id, name: e.name }),
        name: (e.name as string) || 'Party',
        startDate: start.toISOString(),
        endDate: e.endDate ? new Date(e.endDate).toISOString() : null,
        timezone: (e.timezone as string | null) ?? null,
        venueName: (e.venueName as string) ?? '',
        city: (e.city as string) ?? '',
        styles: ((e.styles as string[] | null) ?? []).slice(0, 3),
        cover: (e.cover as string) || '',
        price: (e.price as string) || '',
        ended: end.getTime() < now,
        // First names; a photo only for signed-in friends with a public profile.
        coming: js.map((j: any) => ({ name: j.name, photo: j.dancerId && j.profilePublic !== false ? (j.photo ?? null) : null })),
        joinedByMe: js.some(mine),
      }
    })
    .sort((a: WeekendParty, b: WeekendParty) => a.startDate.localeCompare(b.startDate))

  return {
    code: share.code,
    url: weekendUrl(share.code),
    isOwner: !!viewer.dancerId && viewer.dancerId === share.dancerId,
    sharer: { name: firstName(owner?.name) || 'A dancer', photo: owner?.photo ?? null },
    events: list,
    friends: new Set(joins.map((j: any) => j.dancerId ?? `g:${j.guestToken}`)).size,
    createdAt: share.createdAt ? new Date(share.createdAt).toISOString() : null,
  }
}

/** Upcoming, live parties among `ids` (keeps the given order). */
async function liveUpcoming(db: Db, ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  const rows = await db
    .select({ id: events.id, startDate: events.startDate, endDate: events.endDate })
    .from(events)
    .where(and(inArray(events.id, ids), eq(events.published, true), eq(events.archived, false)))
  const now = Date.now()
  const ok = new Set(rows
    .filter((r: any) => new Date(r.endDate ?? new Date(new Date(r.startDate).getTime() + 4 * 3600_000)).getTime() >= now)
    .map((r: any) => r.id))
  return ids.filter(id => ok.has(id))
}

/**
 * Put a party on a signed-in friend's plan, as Going! does, and count them as a
 * confirmed "yes" on the event's poll (an answer they already gave there stays). Best-effort.
 */
async function addToPlan(db: Db, dancerId: string, eventId: string) {
  try {
    await db.insert(planItems).values({ dancerId, itemType: 'event', itemId: eventId }).onConflictDoNothing()
    await db.insert(attendances).values({ eventId, dancerId, status: 'going', source: 'click', visibility: 'hidden' }).onConflictDoNothing()
    await db.insert(eventRsvps).values({ eventId, dancerId, answer: 'yes', confirmedAt: new Date() }).onConflictDoNothing()
  } catch (e) {
    console.warn('[weekend] plan add failed', (e as Error)?.message ?? e)
  }
}

/**
 * The magic link came back: this browser's guest joins on the share become
 * the dancer's own (their account's first name, on their plan), and the
 * unconfirmed "yes" each one put on the event's poll becomes a confirmed one.
 */
async function foldGuestJoins(db: Db, shareId: string, dancerId: string, name: string, token: string): Promise<{ eventId: string; at: number }[]> {
  const rows = await db
    .select({ id: weekendShareJoins.id, eventId: weekendShareJoins.eventId, createdAt: weekendShareJoins.createdAt })
    .from(weekendShareJoins)
    .where(and(eq(weekendShareJoins.shareId, shareId), isNull(weekendShareJoins.dancerId), eq(weekendShareJoins.guestToken, token)))
  const now = new Date()
  for (const r of rows) {
    await db.delete(weekendShareJoins).where(eq(weekendShareJoins.id, r.id))
    await db.insert(weekendShareJoins).values({ shareId, eventId: r.eventId, dancerId, name }).onConflictDoNothing()
    try {
      await db.delete(eventRsvps).where(and(
        eq(eventRsvps.eventId, r.eventId), eq(eventRsvps.guestToken, token), isNull(eventRsvps.dancerId), eq(eventRsvps.answer, 'yes')))
    } catch (e) {
      console.warn('[weekend] guest rsvp cleanup failed', (e as Error)?.message ?? e)
    }
    await addToPlan(db, dancerId, r.eventId)
  }
  return rows.map((r: any) => ({ eventId: r.eventId as string, at: r.createdAt ? new Date(r.createdAt).getTime() : now.getTime() }))
}

export const weekendRouter = router({
  /**
   * Share this week's parties. With no `eventIds`, takes the dancer's
   * "Where you're dancing" list (plan.weekSocials). Sharing the same parties
   * again within a few days returns the same link, so a posted story keeps working.
   */
  share: protectedProcedure
    .input(z.object({ eventIds: z.array(z.string().uuid()).min(1).max(WEEKEND_MAX_EVENTS).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const wanted = input?.eventIds?.length
        ? [...new Set(input.eventIds)]
        : (await weekSocials(ctx.db, ctx.dancerId)).socials.map(s => s.id)
      const ids = (await liveUpcoming(ctx.db, wanted)).slice(0, WEEKEND_MAX_EVENTS)
      if (!ids.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing planned this week yet — add the parties you’re going to first.' })
      }

      const since = new Date(Date.now() - WEEKEND_REUSE_DAYS * 86400_000)
      const recent = await ctx.db
        .select().from(weekendShares)
        .where(and(eq(weekendShares.dancerId, ctx.dancerId), gte(weekendShares.createdAt, since)))
        .orderBy(desc(weekendShares.createdAt)).limit(10)
      const same = recent.find((s: any) => sameEventSet(s.eventIds ?? [], ids))
      if (same) return { code: same.code, url: weekendUrl(same.code), events: ids.length, created: false }

      for (let attempt = 0; attempt < 5; attempt++) {
        const c = newWeekendCode()
        const [row] = await ctx.db.insert(weekendShares)
          .values({ code: c, dancerId: ctx.dancerId, eventIds: ids })
          .onConflictDoNothing().returning({ code: weekendShares.code })
        if (row) {
          trackServer(ctx, 'weekend_shared', { events: ids.length, replaced_previous: recent.length > 0 })
          return { code: row.code, url: weekendUrl(row.code), events: ids.length, created: true }
        }
      }
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not make a link, try again.' })
    }),

  /** The page: who shared, the parties, and who's coming to each. Public. */
  get: publicProcedure
    .input(z.object({ code, guestToken: guestToken.optional() }))
    .query(async ({ ctx, input }) => {
      const share = await findShare(ctx.db, input.code)
      if (!share) return null
      return view(ctx.db, share, { dancerId: ctx.dancerId ?? null, guestToken: input.guestToken })
    }),

  /**
   * "I'm in" on one party. Signed in: it goes on the friend's plan. Signed
   * out: a first name + this browser's token, and an unconfirmed "yes" on the
   * event's poll (it counts for the organiser like any signed-out answer).
   * Signed in WITH a guest token (the magic link from the reminder sheet came
   * back): this browser's guest joins on the share are folded into the account
   * first. The sharer gets an email the first time each friend joins a party —
   * a confirmation is not a new join.
   */
  join: publicProcedure
    .input(z.object({ code, eventId: z.string().uuid(), name: z.string().max(80).optional(), guestToken: guestToken.optional() }))
    .mutation(async ({ ctx, input }) => {
      const share = await findShare(ctx.db, input.code)
      if (!share) throw new TRPCError({ code: 'NOT_FOUND', message: 'This weekend plan doesn’t exist.' })
      if (!(share.eventIds ?? []).includes(input.eventId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That party isn’t in this plan.' })
      const dancerId = ctx.dancerId ?? null
      if (dancerId && dancerId === share.dancerId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'It’s your own plan — you’re already going.' })
      if ((await liveUpcoming(ctx.db, [input.eventId])).length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This party is over.' })

      let name: string
      let inserted: any[]
      // Parties this browser already joined as a guest, now confirmed by the magic link: no second email.
      let confirmed = new Set<string>()
      if (dancerId) {
        const [me] = await ctx.db.select({ name: dancers.name }).from(dancers).where(eq(dancers.id, dancerId)).limit(1)
        name = firstName(me?.name) || 'A friend'
        if (input.guestToken) {
          const folded = await foldGuestJoins(ctx.db, share.id, dancerId, name, input.guestToken)
          confirmed = new Set(folded.map(f => f.eventId))
          if (folded.length) {
            const hours = Math.round((Date.now() - Math.min(...folded.map(f => f.at))) / 360_000) / 10
            trackServer(ctx, 'weekend_join_confirmed', { parties: folded.length, hours_to_confirm: hours })
          }
        }
        inserted = await ctx.db.insert(weekendShareJoins)
          .values({ shareId: share.id, eventId: input.eventId, dancerId, name })
          .onConflictDoNothing().returning({ id: weekendShareJoins.id })
        await addToPlan(ctx.db, dancerId, input.eventId)
        if (confirmed.has(input.eventId)) inserted = []
      } else {
        name = cleanGuestName(input.name)
        if (!input.guestToken) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing guest token' })
        if (!name) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tell your friend who you are — your first name is enough.' })
        inserted = await ctx.db.insert(weekendShareJoins)
          .values({ shareId: share.id, eventId: input.eventId, guestToken: input.guestToken, name })
          .onConflictDoNothing().returning({ id: weekendShareJoins.id })
        try {
          await ctx.db.insert(eventRsvps)
            .values({ eventId: input.eventId, guestToken: input.guestToken, answer: 'yes' })
            .onConflictDoNothing()
        } catch (e) {
          console.warn('[weekend] rsvp mirror failed', (e as Error)?.message ?? e)
        }
      }

      const result = await view(ctx.db, share, { dancerId, guestToken: input.guestToken })
      if (inserted.length) {
        const ev = result.events.find(e => e.id === input.eventId)
        trackServer(ctx, 'weekend_joined', { signed_in: !!dancerId, coming: ev?.coming.length ?? 1, friends: result.friends })
        const [owner] = await ctx.db.select({ email: dancers.email, name: dancers.name }).from(dancers).where(eq(dancers.id, share.dancerId)).limit(1)
        if (owner?.email && ev) {
          const mail = sendWeekendJoinEmail({
            to: owner.email,
            name: firstName(owner.name) || 'there',
            joiner: name,
            eventName: ev.name,
            when: formatEventWhen(ev.startDate, ev.endDate, ev.timezone || undefined),
            coming: ev.coming.map(c => c.name),
            link: weekendUrl(share.code),
          }).catch(e => console.warn('[weekend] join email failed', (e as Error)?.message ?? e))
          if (ctx.waitUntil) ctx.waitUntil(mail)
          else await mail
        }
      }
      return result
    }),

  /** Take back an "I'm in" (only your own). The event stays on a signed-in friend's plan. */
  leave: publicProcedure
    .input(z.object({ code, eventId: z.string().uuid(), guestToken: guestToken.optional() }))
    .mutation(async ({ ctx, input }) => {
      const share = await findShare(ctx.db, input.code)
      if (!share) throw new TRPCError({ code: 'NOT_FOUND', message: 'This weekend plan doesn’t exist.' })
      const dancerId = ctx.dancerId ?? null
      if (dancerId) {
        await ctx.db.delete(weekendShareJoins).where(and(
          eq(weekendShareJoins.shareId, share.id), eq(weekendShareJoins.eventId, input.eventId), eq(weekendShareJoins.dancerId, dancerId)))
      } else if (input.guestToken) {
        await ctx.db.delete(weekendShareJoins).where(and(
          eq(weekendShareJoins.shareId, share.id), eq(weekendShareJoins.eventId, input.eventId),
          isNull(weekendShareJoins.dancerId), eq(weekendShareJoins.guestToken, input.guestToken)))
        // The unconfirmed "yes" this join put on the event's poll goes too.
        await ctx.db.delete(eventRsvps).where(and(
          eq(eventRsvps.eventId, input.eventId), eq(eventRsvps.guestToken, input.guestToken),
          isNull(eventRsvps.dancerId), eq(eventRsvps.answer, 'yes')))
      }
      return view(ctx.db, share, { dancerId, guestToken: input.guestToken })
    }),
})
