import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { router, adminProcedure } from '../trpc'
import { dinners, dinnerSignups, dinnerGroups, dinnerGroupMembers, dancers, festivals } from '../../database/schema'

export const adminRouter = router({
  dinnerSignups: adminProcedure
    .input(z.object({ dinnerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const signups = await ctx.db
        .select({
          signupId: dinnerSignups.id,
          dancerId: dancers.id,
          name: dancers.name,
          email: dancers.email,
          photo: dancers.photo,
          createdAt: dinnerSignups.createdAt,
        })
        .from(dinnerSignups)
        .innerJoin(dancers, eq(dinnerSignups.dancerId, dancers.id))
        .where(eq(dinnerSignups.dinnerId, input.dinnerId))

      return signups
    }),

  assignGroups: adminProcedure
    .input(z.object({
      dinnerId: z.string().uuid(),
      groupSize: z.number().min(4).max(6).default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get all signups for this dinner
      const signups = await ctx.db
        .select({ dancerId: dinnerSignups.dancerId })
        .from(dinnerSignups)
        .where(eq(dinnerSignups.dinnerId, input.dinnerId))

      if (signups.length < 4) {
        // Not enough for a group — clean up any stale groups
        const staleGroups = await ctx.db
          .select({ id: dinnerGroups.id })
          .from(dinnerGroups)
          .where(eq(dinnerGroups.dinnerId, input.dinnerId))
        for (const g of staleGroups) {
          await ctx.db.delete(dinnerGroupMembers).where(eq(dinnerGroupMembers.groupId, g.id))
        }
        await ctx.db.delete(dinnerGroups).where(eq(dinnerGroups.dinnerId, input.dinnerId))
        return { groups: [] }
      }

      // Delete existing groups before reassigning
      const existingGroups = await ctx.db
        .select({ id: dinnerGroups.id })
        .from(dinnerGroups)
        .where(eq(dinnerGroups.dinnerId, input.dinnerId))

      for (const group of existingGroups) {
        await ctx.db.delete(dinnerGroupMembers).where(eq(dinnerGroupMembers.groupId, group.id))
      }
      await ctx.db.delete(dinnerGroups).where(eq(dinnerGroups.dinnerId, input.dinnerId))

      // Chunk dancers into balanced groups of 4-6
      const dancerIds = signups.map((s) => s.dancerId)
      const gs = input.groupSize
      // Use ceil to get enough groups, then adjust so all groups stay within 4-6
      let numGroups = Math.ceil(dancerIds.length / gs)
      if (numGroups === 0) numGroups = 1
      // Increase groups if any would exceed groupSize
      while (numGroups > 0 && Math.ceil(dancerIds.length / numGroups) > gs) {
        numGroups++
      }
      // Decrease groups if any would be below 4
      while (numGroups > 1 && Math.floor(dancerIds.length / numGroups) < 4) {
        numGroups--
      }
      const groups: string[][] = Array.from({ length: numGroups }, () => [])

      // Round-robin distribute
      dancerIds.forEach((id, i) => {
        groups[i % numGroups].push(id)
      })

      // Create groups in DB — clear chat links since membership may have changed
      const createdGroups = []
      for (let gi = 0; gi < groups.length; gi++) {
        const memberIds = groups[gi]
        const chatLink = null

        const [group] = await ctx.db
          .insert(dinnerGroups)
          .values({ dinnerId: input.dinnerId, chatLink })
          .returning()

        for (const dancerId of memberIds) {
          await ctx.db.insert(dinnerGroupMembers).values({
            groupId: group.id,
            dancerId,
          })
        }

        createdGroups.push({
          groupId: group.id,
          memberCount: memberIds.length,
        })
      }

      return { groups: createdGroups }
    }),

  setGroupChatLink: adminProcedure
    .input(z.object({
      groupId: z.string().uuid(),
      chatLink: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(dinnerGroups)
        .set({ chatLink: input.chatLink })
        .where(eq(dinnerGroups.id, input.groupId))

      return { updated: true }
    }),

  revealRestaurant: adminProcedure
    .input(z.object({ dinnerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date().toISOString().slice(0, 10)
      await ctx.db
        .update(dinners)
        .set({ revealDate: today })
        .where(eq(dinners.id, input.dinnerId))

      return { revealed: true }
    }),

  listDinners: adminProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select()
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) return []

      const rows = await ctx.db
        .select({
          id: dinners.id,
          day: dinners.day,
          date: dinners.date,
          timeSlot: dinners.timeSlot,
          restaurant: dinners.restaurant,
          restaurantAddress: dinners.restaurantAddress,
          revealDate: dinners.revealDate,
          maxSize: dinners.maxSize,
          signupCount: sql<number>`(SELECT COUNT(*) FROM ${dinnerSignups} WHERE ${dinnerSignups.dinnerId} = ${dinners.id})`,
        })
        .from(dinners)
        .where(eq(dinners.festivalId, festival.id))

      return rows.map((r) => ({ ...r, signupCount: Number(r.signupCount) }))
    }),

  dinnerGroups: adminProcedure
    .input(z.object({ dinnerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const groups = await ctx.db
        .select({
          id: dinnerGroups.id,
          chatLink: dinnerGroups.chatLink,
        })
        .from(dinnerGroups)
        .where(eq(dinnerGroups.dinnerId, input.dinnerId))

      const result = await Promise.all(groups.map(async (group) => {
        const members = await ctx.db
          .select({
            id: dancers.id,
            name: dancers.name,
            photo: dancers.photo,
            email: dancers.email,
          })
          .from(dinnerGroupMembers)
          .innerJoin(dancers, eq(dinnerGroupMembers.dancerId, dancers.id))
          .where(eq(dinnerGroupMembers.groupId, group.id))

        return { ...group, members }
      }))

      return result
    }),
})
