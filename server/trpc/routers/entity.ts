import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { router, publicProcedure } from '../trpc'
import { profiles, bookableSpaces } from '../../database/schema'

/**
 * Professional profiles (venue / artist / organizer) resolved by handle for the
 * unified /@<handle> route. Returns the profile + its bookable spaces (venues).
 * Dancers are resolved separately (profile.getByUsername); the /@handle page
 * tries this first, then the dancer.
 */
export const entityRouter = router({
  // Bookable venues in a city — surfaced on the city page.
  listByCity: publicProcedure
    .input(z.object({ citySlug: z.string().min(1), type: z.enum(['venue', 'artist', 'organizer']).default('venue') }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          username: profiles.username,
          name: profiles.name,
          photo: profiles.photo,
          floorType: profiles.floorType,
        })
        .from(profiles)
        .where(and(
          eq(profiles.citySlug, input.citySlug),
          eq(profiles.type, input.type),
          eq(profiles.status, 'visible'),
        ))
      return rows
    }),

  getByHandle: publicProcedure
    .input(z.object({ handle: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [p] = await ctx.db
        .select({
          id: profiles.id,
          username: profiles.username,
          type: profiles.type,
          name: profiles.name,
          city: profiles.city,
          citySlug: profiles.citySlug,
          photo: profiles.photo,
          bio: profiles.bio,
          styles: profiles.styles,
          address: profiles.address,
          floorType: profiles.floorType,
          socials: profiles.socials,
          claimed: profiles.claimed,
        })
        .from(profiles)
        .where(and(eq(profiles.username, input.handle), eq(profiles.status, 'visible')))

      if (!p) return null

      const spacesRaw = await ctx.db
        .select({
          id: bookableSpaces.id,
          name: bookableSpaces.name,
          capacity: bookableSpaces.capacity,
          floorType: bookableSpaces.floorType,
          priceInfo: bookableSpaces.priceInfo,
          description: bookableSpaces.description,
          imageUrl: bookableSpaces.imageUrl,
          sortOrder: bookableSpaces.sortOrder,
        })
        .from(bookableSpaces)
        .where(eq(bookableSpaces.profileId, p.id))

      const spaces = [...spacesRaw].sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

      return {
        profile: {
          id: p.id,
          username: p.username,
          type: p.type,
          name: p.name,
          city: p.city ?? null,
          citySlug: p.citySlug ?? null,
          photo: p.photo ?? null,
          bio: p.bio ?? null,
          styles: p.styles ?? [],
          address: p.address ?? null,
          floorType: p.floorType ?? null,
          socials: p.socials ?? [],
          claimed: p.claimed ?? false,
        },
        spaces,
      }
    }),
})
