import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { router, publicProcedure, adminProcedure } from '../trpc'
import { communityGroups } from '../../database/schema'

const PLATFORMS = ['whatsapp', 'telegram', 'facebook', 'other'] as const

/**
 * Community groups directory — the cold-start filler for cities where WeDance
 * has no events yet. Public read per city; admin/bulk create (the Commander's
 * existing list is imported via the seed / an admin import).
 */
export const communityGroupRouter = router({
  // Admin: every community group across cities, newest first (dashboard).
  listAll: adminProcedure
    .input(z.object({ citySlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(communityGroups)
        .where(input?.citySlug ? eq(communityGroups.citySlug, input.citySlug) : undefined)
        .orderBy(desc(communityGroups.createdAt))
      return rows
    }),

  listByCity: publicProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: communityGroups.id,
          name: communityGroups.name,
          platform: communityGroups.platform,
          inviteUrl: communityGroups.inviteUrl,
          styles: communityGroups.styles,
          verified: communityGroups.verified,
        })
        .from(communityGroups)
        .where(and(
          eq(communityGroups.citySlug, input.citySlug),
          eq(communityGroups.status, 'visible'),
        ))

      // Verified first, then by name.
      return [...rows].sort((a: any, b: any) =>
        (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || String(a.name).localeCompare(String(b.name)))
    }),

  create: adminProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      name: z.string().min(1),
      platform: z.enum(PLATFORMS).default('whatsapp'),
      inviteUrl: z.string().url(),
      styles: z.array(z.string()).default([]),
      source: z.string().optional(),
      verified: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(communityGroups)
        .values({
          citySlug: input.citySlug,
          name: input.name,
          platform: input.platform,
          inviteUrl: input.inviteUrl,
          styles: input.styles,
          source: input.source ?? null,
          verified: input.verified,
        })
        .returning({ id: communityGroups.id })
      return { id: row!.id }
    }),

  report: publicProcedure
    .input(z.object({
      groupId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Increment report count and hide group if it gets 3+ reports
      const group = await ctx.db
        .select({ reportCount: communityGroups.reportCount })
        .from(communityGroups)
        .where(eq(communityGroups.id, input.groupId))

      if (!group.length) {
        throw new Error('Group not found')
      }

      const newCount = (group[0].reportCount || 0) + 1
      const newStatus = newCount >= 3 ? 'hidden' : 'visible'

      await ctx.db
        .update(communityGroups)
        .set({ reportCount: newCount, status: newStatus as any })
        .where(eq(communityGroups.id, input.groupId))

      return { reported: true, hidden: newStatus === 'hidden' }
    }),
})
