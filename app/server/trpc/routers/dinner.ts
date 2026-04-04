import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { dinners, dinnerSignups, dinnerGroups, dinnerGroupMembers, dancers, festivals } from '../../database/schema'

export const dinnerRouter = router({
  list: publicProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
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
          joined: sql<number>`(SELECT COUNT(*) FROM ${dinnerSignups} WHERE ${dinnerSignups.dinnerId} = ${dinners.id})`.as('joined'),
        })
        .from(dinners)
        .where(eq(dinners.festivalId, festival.id))

      const today = new Date().toISOString().slice(0, 10)

      const result = await Promise.all(rows.map(async (row) => {
        let userJoined = false
        let groupChatLink: string | null = null
        let groupMembers: { name: string; photo: string | null }[] = []

        if (ctx.dancerId) {
          const [signup] = await ctx.db
            .select()
            .from(dinnerSignups)
            .where(and(
              eq(dinnerSignups.dinnerId, row.id),
              eq(dinnerSignups.dancerId, ctx.dancerId),
            ))
          userJoined = !!signup

          if (userJoined) {
            const [membership] = await ctx.db
              .select({
                groupId: dinnerGroupMembers.groupId,
                chatLink: dinnerGroups.chatLink,
              })
              .from(dinnerGroupMembers)
              .innerJoin(dinnerGroups, eq(dinnerGroupMembers.groupId, dinnerGroups.id))
              .where(and(
                eq(dinnerGroupMembers.dancerId, ctx.dancerId),
                eq(dinnerGroups.dinnerId, row.id),
              ))

            if (membership) {
              groupChatLink = membership.chatLink
              const members = await ctx.db
                .select({ name: dancers.name, photo: dancers.photo })
                .from(dinnerGroupMembers)
                .innerJoin(dancers, eq(dinnerGroupMembers.dancerId, dancers.id))
                .where(eq(dinnerGroupMembers.groupId, membership.groupId))
              groupMembers = members.filter(m => m.name !== null)
            }
          }
        }

        // Show restaurant if no revealDate set (always visible) or if revealed
        const showRestaurant = !row.revealDate || today >= row.revealDate

        return {
          id: row.id,
          day: row.day,
          date: row.date,
          timeSlot: row.timeSlot,
          restaurant: showRestaurant ? row.restaurant : null,
          restaurantAddress: showRestaurant ? row.restaurantAddress : null,
          joined: Number(row.joined),
          maxSize: row.maxSize,
          userJoined,
          groupChatLink,
          groupMembers: groupMembers.length > 0 ? groupMembers : undefined,
        }
      }))

      return result
    }),

  join: protectedProcedure
    .input(z.object({ dinnerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [dinner] = await ctx.db
        .select()
        .from(dinners)
        .where(eq(dinners.id, input.dinnerId))

      if (!dinner) throw new Error('Dinner not found')

      // Atomic check-and-insert using unique constraint
      // If duplicate, the unique constraint catches it
      const [{ count }] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(dinnerSignups)
        .where(eq(dinnerSignups.dinnerId, input.dinnerId))

      if (Number(count) >= dinner.maxSize) throw new Error('Dinner is full')

      try {
        await ctx.db.insert(dinnerSignups).values({
          dinnerId: input.dinnerId,
          dancerId: ctx.dancerId,
        })
      } catch (e: any) {
        // Unique constraint violation = already joined
        const msg = e.message || ''
        const causeMsg = e.cause?.message || ''
        const code = e.cause?.code || ''
        if (msg.includes('unique') || msg.includes('duplicate') ||
            causeMsg.includes('unique') || causeMsg.includes('duplicate') ||
            code === '23505') {
          return { alreadyJoined: true }
        }
        throw e
      }

      return { joined: true }
    }),

  leave: protectedProcedure
    .input(z.object({ dinnerId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Also remove from any assigned group
      const groupMemberships = await ctx.db
        .select({ groupId: dinnerGroupMembers.groupId })
        .from(dinnerGroupMembers)
        .innerJoin(dinnerGroups, eq(dinnerGroupMembers.groupId, dinnerGroups.id))
        .where(and(
          eq(dinnerGroupMembers.dancerId, ctx.dancerId),
          eq(dinnerGroups.dinnerId, input.dinnerId),
        ))

      for (const m of groupMemberships) {
        await ctx.db
          .delete(dinnerGroupMembers)
          .where(and(
            eq(dinnerGroupMembers.groupId, m.groupId),
            eq(dinnerGroupMembers.dancerId, ctx.dancerId),
          ))
      }

      await ctx.db
        .delete(dinnerSignups)
        .where(and(
          eq(dinnerSignups.dinnerId, input.dinnerId),
          eq(dinnerSignups.dancerId, ctx.dancerId),
        ))

      return { left: true }
    }),
})
