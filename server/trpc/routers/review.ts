import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { reviews, dancers, events, eventReviewAsks } from '../../database/schema'
import { isUuid } from '../../../shared/utils/eventSlug'
import { reviewOpen, reviewOpensAt } from '../../../shared/utils/eventReview'
import { wentTo } from '../../utils/eventCancel'
import { saidMissed } from '../../utils/reviewAsk'
import { trackServer, eventGroup } from '../../utils/posthog'

export const TARGET_TYPES = ['festival', 'venue', 'artist', 'organizer', 'event'] as const
export type TargetType = (typeof TARGET_TYPES)[number]

/**
 * One review per dancer per target. Denormalizes the reviewer's name + handle
 * onto the row so the list needs no join. Shared by review.create (a normal
 * star review) and askLocals.recommend (an auto-5★ recommendation) — `source`
 * distinguishes them. Manual select-then-insert/update (not onConflictDoUpdate)
 * so it works against the hermetic FakeDb in tests too; the unique constraint
 * is the real backstop.
 */
export async function upsertReview(db: any, p: {
  dancerId: string
  targetType: TargetType
  targetSlug: string
  targetName?: string | null
  citySlug?: string | null
  rating: number
  text?: string | null
  source?: 'review' | 'recommendation'
  /** An event review by someone who signed up, after the night (RAZ-1011). */
  went?: boolean
}) {
  const [dancer] = await db
    .select({ name: dancers.name, username: dancers.username })
    .from(dancers)
    .where(eq(dancers.id, p.dancerId))

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(
      eq(reviews.targetType, p.targetType),
      eq(reviews.targetSlug, p.targetSlug),
      eq(reviews.dancerId, p.dancerId),
    ))

  if (existing) {
    await db.update(reviews)
      .set({ rating: p.rating, text: p.text ?? null, source: p.source ?? 'review', went: p.went ?? false })
      .where(eq(reviews.id, existing.id))
    return { updated: true }
  }

  await db.insert(reviews).values({
    targetType: p.targetType,
    targetSlug: p.targetSlug,
    targetName: p.targetName ?? null,
    citySlug: p.citySlug ?? null,
    dancerId: p.dancerId,
    reviewerName: dancer?.name ?? null,
    reviewerUsername: dancer?.username ?? null,
    rating: p.rating,
    text: p.text ?? null,
    source: p.source ?? 'review',
    went: p.went ?? false,
  })
  return { updated: false }
}

export const reviewRouter = router({
  list: publicProcedure
    .input(z.object({
      targetType: z.enum(TARGET_TYPES),
      targetSlug: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: reviews.id,
          reviewerName: reviews.reviewerName,
          reviewerUsername: reviews.reviewerUsername,
          rating: reviews.rating,
          text: reviews.text,
          source: reviews.source,
          went: reviews.went,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(and(
          eq(reviews.targetType, input.targetType),
          eq(reviews.targetSlug, input.targetSlug),
          eq(reviews.status, 'visible'),
        ))

      const count = rows.length
      const average = count
        ? Math.round((rows.reduce((s: number, r: any) => s + r.rating, 0) / count) * 10) / 10
        : 0

      // Newest first (createdAt may be null in fakes → treat as now).
      const sorted = [...rows].sort((a: any, b: any) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())

      return { reviews: sorted, average, count }
    }),

  create: protectedProcedure
    .input(z.object({
      targetType: z.enum(TARGET_TYPES),
      targetSlug: z.string().min(1),
      targetName: z.string().max(160).optional(),
      citySlug: z.string().optional(),
      rating: z.number().int().min(1).max(5),
      text: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // An event is reviewed only by people who went, once the night is over (RAZ-1011).
      // Festivals, venues, artists and organisers: anyone signed in, as before.
      let ev: any = null
      if (input.targetType === 'event') {
        ev = await loadEvent(ctx.db, input.targetSlug)
        if (!ev) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })
        if (!reviewOpen(ev)) throw new TRPCError({ code: 'FORBIDDEN', message: 'You can review this event once it is over.' })
        if (!(await wentTo(ctx.db, ev, await me(ctx.db, ctx.dancerId)))) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only people who went can review this event.' })
        }
      }
      const r = await upsertReview(ctx.db, {
        dancerId: ctx.dancerId,
        targetType: input.targetType,
        targetSlug: input.targetSlug,
        targetName: input.targetName ?? ev?.name ?? null,
        citySlug: input.citySlug ?? ev?.citySlug ?? null,
        rating: input.rating,
        text: input.text ?? null,
        source: 'review',
        went: !!ev,
      })
      trackServer(ctx, 'review_submitted', {
        target_type: input.targetType,
        rating: input.rating,
        has_text: !!input.text?.trim(),
        updated: r.updated,
        went: !!ev,
        ...(ev ? { event_id: ev.id, ...eventGroup(ev) } : {}),
      })
      return { ok: true }
    }),

  /**
   * The event page's "How was it?" (RAZ-1011): whether this dancer may review the event now.
   * `went` = signed up; `open` = the night is over; `missed` = they said "didn't make it".
   */
  eventAsk: publicProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const ev = await loadEvent(ctx.db, input.eventId)
      if (!ev) return { open: false, opensAt: null, signedIn: !!ctx.dancerId, went: false, missed: false, mine: null }
      const open = reviewOpen(ev)
      const opensAt = reviewOpensAt(ev)?.toISOString() ?? null
      if (!ctx.dancerId) return { open, opensAt, signedIn: false, went: false, missed: false, mine: null }
      const who = await me(ctx.db, ctx.dancerId)
      const [went, missed, [mine]] = await Promise.all([
        wentTo(ctx.db, ev, who),
        saidMissed(ctx.db, ev.id, who.email),
        ctx.db.select({ rating: reviews.rating, text: reviews.text }).from(reviews)
          .where(and(eq(reviews.targetType, 'event'), eq(reviews.targetSlug, ev.id), eq(reviews.dancerId, ctx.dancerId))),
      ])
      return { open, opensAt, signedIn: true, went, missed, mine: mine ?? null }
    }),

  /** "Didn't make it" from the morning-after email: never ask this address about the event again. */
  missed: publicProcedure
    .input(z.object({ token: z.string().min(10).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select({ id: eventReviewAsks.id, eventId: eventReviewAsks.eventId, missedAt: eventReviewAsks.missedAt })
        .from(eventReviewAsks).where(eq(eventReviewAsks.token, input.token))
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'This link has expired.' })
      if (!row.missedAt) {
        await ctx.db.update(eventReviewAsks).set({ missedAt: new Date() }).where(eq(eventReviewAsks.id, row.id))
        trackServer(ctx, 'review_ask_missed', { event_id: row.eventId, signed_in: !!ctx.dancerId })
      }
      return { ok: true, eventId: row.eventId }
    }),
})

async function loadEvent(db: any, id: string) {
  if (!isUuid(id)) return null
  const [ev] = await db.select().from(events).where(eq(events.id, id.toLowerCase()))
  return ev ?? null
}

async function me(db: any, dancerId: string): Promise<{ id: string; email: string | null }> {
  const [d] = await db.select({ email: dancers.email }).from(dancers).where(eq(dancers.id, dancerId))
  return { id: dancerId, email: d?.email ?? null }
}
