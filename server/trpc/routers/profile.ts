import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { dancers } from '../../database/schema'

/**
 * Public dancer profiles + self-service editing.
 *
 * - getByUsername: the public /u/<username> page. Returns identity fields only
 *   (never email / auth). 404 if the handle doesn't resolve.
 * - update: the signed-in user edits their own profile (the onboarding fields,
 *   changeable over time, + display name + photo URL). Protected to the caller's
 *   own row — there is no way to edit someone else's.
 */
export const profileRouter = router({
  getByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [d] = await ctx.db
        .select({
          username: dancers.username,
          name: dancers.name,
          photo: dancers.photo,
          city: dancers.city,
          danceStyles: dancers.danceStyles,
          role: dancers.role,
        })
        .from(dancers)
        .where(eq(dancers.username, input.username))

      if (!d) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
      }

      return {
        username: d.username,
        name: d.name,
        photo: d.photo ?? null,
        city: d.city ?? null,
        danceStyles: d.danceStyles ?? [],
        role: d.role ?? null,
      }
    }),

  update: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Name is required.').optional(),
      city: z.string().optional(),
      danceStyles: z.array(z.string()).optional(),
      role: z.enum(['lead', 'follow', 'both']).optional(),
      // A URL, or an empty string to clear the photo.
      photo: z.union([z.string().url('Enter a valid image URL.'), z.literal('')]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const set: Record<string, unknown> = {}
      if (input.name !== undefined) set.name = input.name
      if (input.city !== undefined) set.city = input.city
      if (input.danceStyles !== undefined) set.danceStyles = input.danceStyles
      if (input.role !== undefined) set.role = input.role
      if (input.photo !== undefined) set.photo = input.photo === '' ? null : input.photo

      if (Object.keys(set).length > 0) {
        await ctx.db
          .update(dancers)
          .set(set)
          .where(eq(dancers.id, ctx.dancerId))
      }

      return { ok: true }
    }),
})
