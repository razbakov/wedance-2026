import { z } from 'zod'
import { eq, and, or, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { gigs } from '../../database/schema'

/**
 * Gigs — the dance scene's opportunity board.
 * Organizers post open roles; artists post service offerings.
 * Public listing; authenticated users can post their own gigs.
 */
export const gigsRouter = router({
  // List all gigs, optionally filtered by kind and/or category
  list: publicProcedure
    .input(z.object({
      kind: z.enum(['role', 'offer']).optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .select()
        .from(gigs)
        .where(eq(gigs.status, 'open'))

      const conditions: any[] = [eq(gigs.status, 'open')]

      if (input.kind) {
        conditions.push(eq(gigs.kind, input.kind))
      }

      if (input.category) {
        conditions.push(eq(gigs.category, input.category))
      }

      const rows = await ctx.db
        .select()
        .from(gigs)
        .where(and(...conditions))
        .orderBy(desc(gigs.createdAt))

      return rows
    }),

  // Get a single gig by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(gigs)
        .where(eq(gigs.id, input.id))

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gig not found' })
      }

      return row
    }),

  // Create a new gig (authenticated users only)
  create: protectedProcedure
    .input(z.object({
      kind: z.enum(['role', 'offer']),
      category: z.string().min(1),
      title: z.string().min(1),
      posterName: z.string().min(1),
      posterType: z.string().min(1),
      location: z.string().min(1),
      styles: z.array(z.string()).default([]),
      when: z.string().min(1),
      compensation: z.string().min(1),
      deadline: z.string().optional(),
      contactEmail: z.string().email(),
      contactUrl: z.string().url().optional(),
      entityUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .insert(gigs)
        .values({
          kind: input.kind,
          category: input.category,
          title: input.title,
          posterName: input.posterName,
          posterType: input.posterType,
          location: input.location,
          styles: input.styles,
          when: input.when,
          compensation: input.compensation,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
          contactEmail: input.contactEmail,
          contactUrl: input.contactUrl,
          entityUrl: input.entityUrl,
          dancerId: ctx.dancerId,
          status: 'open',
        })
        .returning()

      if (!result) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create gig' })
      }

      return result
    }),

  // Close a gig (authenticated owner only)
  close: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [gig] = await ctx.db
        .select()
        .from(gigs)
        .where(eq(gigs.id, input.id))

      if (!gig) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gig not found' })
      }

      if (gig.dancerId !== ctx.dancerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only close your own gigs' })
      }

      await ctx.db
        .update(gigs)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(gigs.id, input.id))

      return { success: true }
    }),
})
