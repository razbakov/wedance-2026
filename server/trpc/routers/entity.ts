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
  // All bookable venues (any city) — surfaced on the Private-events page.
  listVenues: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db
        .select({
          username: profiles.username,
          name: profiles.name,
          photo: profiles.photo,
          city: profiles.city,
          floorType: profiles.floorType,
        })
        .from(profiles)
        .where(and(eq(profiles.type, 'venue'), eq(profiles.status, 'visible')))
    }),

  // All artists (any city) — the /artists directory, from migrated real data.
  listArtists: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db
        .select({
          username: profiles.username,
          name: profiles.name,
          photo: profiles.photo,
          city: profiles.city,
          styles: profiles.styles,
          bio: profiles.bio,
        })
        .from(profiles)
        .where(and(eq(profiles.type, 'artist'), eq(profiles.status, 'visible')))
    }),

  // Distinct cities that have any migrated profile — the /cities directory.
  // Counts per type let the card show "N venues · N artists".
  listCities: publicProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          city: profiles.city,
          citySlug: profiles.citySlug,
          type: profiles.type,
        })
        .from(profiles)
        .where(and(eq(profiles.status, 'visible')))
      const map = new Map<string, { city: string; citySlug: string; venues: number; artists: number; organizers: number; total: number }>()
      for (const r of rows) {
        if (!r.citySlug || !r.city) continue
        const e = map.get(r.citySlug) ?? { city: r.city, citySlug: r.citySlug, venues: 0, artists: 0, organizers: 0, total: 0 }
        if (r.type === 'venue') e.venues++
        else if (r.type === 'artist') e.artists++
        else if (r.type === 'organizer') e.organizers++
        e.total++
        map.set(r.citySlug, e)
      }
      return [...map.values()].sort((a, b) => b.total - a.total)
    }),

  // Everything in one city — the real community directory for /cities/[slug].
  // Returns venues/artists/organizers so the city page renders from real data.
  cityDirectory: publicProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          username: profiles.username,
          name: profiles.name,
          photo: profiles.photo,
          type: profiles.type,
          styles: profiles.styles,
          city: profiles.city,
        })
        .from(profiles)
        .where(and(eq(profiles.citySlug, input.citySlug), eq(profiles.status, 'visible')))
      const city = rows.find(r => r.city)?.city ?? null
      const pick = (t: string) => rows.filter(r => r.type === t).map(({ username, name, photo, styles }) => ({ username, name, photo, styles: styles ?? [] }))
      return { city, citySlug: input.citySlug, venues: pick('venue'), artists: pick('artist'), organizers: pick('organizer') }
    }),

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
          venueType: profiles.venueType,
          mapUrl: profiles.mapUrl,
          guidelines: profiles.guidelines,
          bookingModel: profiles.bookingModel,
          moderatorName: profiles.moderatorName,
          moderatorHandle: profiles.moderatorHandle,
          moderatorSince: profiles.moderatorSince,
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
          venueType: p.venueType ?? null,
          mapUrl: p.mapUrl ?? null,
          guidelines: p.guidelines ?? null,
          bookingModel: p.bookingModel ?? 'commercial',
          moderatorName: p.moderatorName ?? null,
          moderatorHandle: p.moderatorHandle ?? null,
          moderatorSince: p.moderatorSince ?? null,
          socials: p.socials ?? [],
          claimed: p.claimed ?? false,
        },
        spaces,
      }
    }),
})
