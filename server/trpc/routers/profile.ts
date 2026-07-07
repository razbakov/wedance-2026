import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { dancers, cityVideos } from '../../database/schema'

/**
 * Public dancer profiles + self-service editing.
 *
 * - getByUsername: the public /u/<username> page. Returns identity + bio +
 *   social links + the dancer's approved competition videos (their activity).
 *   Honors the privacy flag: a private profile 404s for everyone but its owner.
 *   Never returns email / auth fields.
 * - update: the signed-in dancer edits their own profile. Protected to the
 *   caller's own row — there is no way to edit someone else's.
 */

// A social value may be a full URL or a bare handle; the page normalizes it for
// display. We store it as entered but cap length and allow empty to clear.
const socialField = z.union([z.string().max(200), z.literal('')]).optional()

export const profileRouter = router({
  getByUsername: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [d] = await ctx.db
        .select({
          id: dancers.id,
          username: dancers.username,
          name: dancers.name,
          photo: dancers.photo,
          city: dancers.city,
          danceStyles: dancers.danceStyles,
          role: dancers.role,
          bio: dancers.bio,
          instagram: dancers.instagram,
          youtube: dancers.youtube,
          website: dancers.website,
          profilePublic: dancers.profilePublic,
        })
        .from(dancers)
        .where(eq(dancers.username, input.username))

      if (!d) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
      }

      // Privacy: a private profile is invisible to everyone but its owner.
      const isOwner = !!ctx.dancerId && ctx.dancerId === d.id
      if (d.profilePublic === false && !isOwner) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
      }

      // Activity: the dancer's approved competition videos (submitted while
      // signed in carry dancerId). Anonymous email-only submissions aren't shown.
      const videos = await ctx.db
        .select({
          id: cityVideos.id,
          title: cityVideos.title,
          videoUrl: cityVideos.videoUrl,
          thumbnailUrl: cityVideos.thumbnailUrl,
          danceStyle: cityVideos.danceStyle,
          citySlug: cityVideos.citySlug,
          eloScore: cityVideos.eloScore,
        })
        .from(cityVideos)
        .where(and(eq(cityVideos.dancerId, d.id), eq(cityVideos.status, 'approved')))

      return {
        username: d.username,
        name: d.name,
        photo: d.photo ?? null,
        city: d.city ?? null,
        danceStyles: d.danceStyles ?? [],
        role: d.role ?? null,
        bio: d.bio ?? null,
        instagram: d.instagram ?? null,
        youtube: d.youtube ?? null,
        website: d.website ?? null,
        isPublic: d.profilePublic ?? true,
        isOwner,
        videos,
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
      bio: z.union([z.string().max(500), z.literal('')]).optional(),
      instagram: socialField,
      youtube: socialField,
      website: socialField,
      profilePublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const set: Record<string, unknown> = {}
      if (input.name !== undefined) set.name = input.name
      if (input.city !== undefined) set.city = input.city
      if (input.danceStyles !== undefined) set.danceStyles = input.danceStyles
      if (input.role !== undefined) set.role = input.role
      if (input.photo !== undefined) set.photo = input.photo === '' ? null : input.photo
      if (input.bio !== undefined) set.bio = input.bio === '' ? null : input.bio
      if (input.instagram !== undefined) set.instagram = input.instagram === '' ? null : input.instagram
      if (input.youtube !== undefined) set.youtube = input.youtube === '' ? null : input.youtube
      if (input.website !== undefined) set.website = input.website === '' ? null : input.website
      if (input.profilePublic !== undefined) set.profilePublic = input.profilePublic

      if (Object.keys(set).length > 0) {
        await ctx.db
          .update(dancers)
          .set(set)
          .where(eq(dancers.id, ctx.dancerId))
      }

      return { ok: true }
    }),
})
