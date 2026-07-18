import { z } from 'zod'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, adminProcedure } from '../trpc'
import { giveaways, giveawayEntries } from '../../database/schema'

export const giveawayRouter = router({
  // Admin: every giveaway across cities, newest first (moderation dashboard).
  listAll: adminProcedure
    .input(z.object({ citySlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(giveaways)
        .where(input?.citySlug ? eq(giveaways.citySlug, input.citySlug) : undefined)
        .orderBy(desc(giveaways.createdAt))
      return rows
    }),

  // Active giveaways for a city: status='active' AND now within [startsAt, endsAt].
  // Returns [] (never a fabricated sponsor) when the city has none.
  listActive: publicProcedure
    .input(z.object({ citySlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      return ctx.db
        .select({
          id: giveaways.id,
          sponsorName: giveaways.sponsorName,
          title: giveaways.title,
          description: giveaways.description,
          prizeDescription: giveaways.prizeDescription,
          ctaUrl: giveaways.ctaUrl,
          imageUrl: giveaways.imageUrl,
          termsUrl: giveaways.termsUrl,
          startsAt: giveaways.startsAt,
          endsAt: giveaways.endsAt,
        })
        .from(giveaways)
        .where(and(
          eq(giveaways.citySlug, input.citySlug),
          eq(giveaways.status, 'active'),
          lte(giveaways.startsAt, now),
          gte(giveaways.endsAt, now),
        ))
        .orderBy(desc(giveaways.endsAt))
    }),

  // Free-entry (no purchase). One entry per email per giveaway — a duplicate
  // is reported as `alreadyEntered`, not an error.
  enter: publicProcedure
    .input(z.object({
      giveawayId: z.string().uuid(),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date()
      const [g] = await ctx.db
        .select({ id: giveaways.id, status: giveaways.status, startsAt: giveaways.startsAt, endsAt: giveaways.endsAt })
        .from(giveaways)
        .where(eq(giveaways.id, input.giveawayId))

      if (!g) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Giveaway not found.' })
      }
      if (g.status !== 'active' || g.startsAt > now || g.endsAt < now) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This giveaway is not currently open.' })
      }

      try {
        await ctx.db.insert(giveawayEntries).values({
          giveawayId: input.giveawayId,
          dancerId: ctx.dancerId,
          email: input.email,
        })
      } catch (e: any) {
        const msg = (e?.message || '') + (e?.cause?.message || '')
        const code = e?.cause?.code || ''
        if (msg.includes('unique') || msg.includes('duplicate') || code === '23505') {
          return { entered: true, alreadyEntered: true }
        }
        throw e
      }

      return { entered: true, alreadyEntered: false }
    }),

  // ---- admin ----

  create: adminProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      sponsorName: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      prizeDescription: z.string().min(1),
      ctaUrl: z.string().url(),
      imageUrl: z.string().url().optional(),
      termsUrl: z.string().url().optional(),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date(),
      status: z.enum(['active', 'ended', 'draft']).default('active'),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.endsAt <= input.startsAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'endsAt must be after startsAt.' })
      }
      const [row] = await ctx.db
        .insert(giveaways)
        .values({
          citySlug: input.citySlug,
          sponsorName: input.sponsorName,
          title: input.title,
          description: input.description,
          prizeDescription: input.prizeDescription,
          ctaUrl: input.ctaUrl,
          imageUrl: input.imageUrl ?? null,
          termsUrl: input.termsUrl ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          status: input.status,
        })
        .returning({ id: giveaways.id })

      return { id: row!.id }
    }),
})
