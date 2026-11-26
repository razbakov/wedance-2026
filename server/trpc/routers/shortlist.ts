import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, desc, eq } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { artistShortlist, profiles } from '../../database/schema'
import { parseNote, parseOccasion, SHORTLIST_OCCASIONS, type ShortlistOccasion } from '../../../shared/utils/artistShortlist'
import { trackServer } from '../../utils/posthog'

/**
 * A signed-in person's private booking shortlist (RAZ-1085).
 * Follow stays the way to see an artist's events. This list does not follow
 * them, and they are not told.
 */
const surface = z.enum(['profile_page', 'artists', 'shortlist'])

function bad(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message })
}

function readOccasion(value: unknown): ShortlistOccasion | null {
  try { return parseOccasion(value) }
  catch (e) { bad((e as Error).message) }
}

function readNote(value: unknown): string | null {
  try { return parseNote(value) }
  catch (e) { bad((e as Error).message) }
}

async function visibleArtist(ctx: { db: any }, username: string) {
  const [p] = await ctx.db.select({
    id: profiles.id,
    username: profiles.username,
    type: profiles.type,
    status: profiles.status,
  }).from(profiles).where(eq(profiles.username, username)).limit(1)
  if (!p || p.status !== 'visible') {
    throw new TRPCError({ code: 'NOT_FOUND', message: "That artist isn't on WeDance." })
  }
  if (p.type !== 'artist') {
    bad('Only an artist can be shortlisted. Follow a venue to see their events.')
  }
  return p
}

export const shortlistRouter = router({
  toggle: protectedProcedure
    .input(z.object({ username: z.string().min(1).max(80), surface }))
    .mutation(async ({ ctx, input }) => {
      const artist = await visibleArtist(ctx, input.username)
      const [existing] = await ctx.db.select({ id: artistShortlist.id }).from(artistShortlist)
        .where(and(eq(artistShortlist.dancerId, ctx.dancerId), eq(artistShortlist.profileId, artist.id)))
      if (existing) {
        await ctx.db.delete(artistShortlist).where(eq(artistShortlist.id, existing.id))
        trackServer(ctx, 'shortlist_remove', { profile: artist.username, surface: input.surface })
        return { shortlisted: false }
      }
      await ctx.db.insert(artistShortlist).values({ dancerId: ctx.dancerId, profileId: artist.id }).onConflictDoNothing()
      trackServer(ctx, 'shortlist_add', { profile: artist.username, surface: input.surface })
      return { shortlisted: true }
    }),

  save: protectedProcedure
    .input(z.object({
      username: z.string().min(1).max(80),
      occasion: z.union([z.enum(SHORTLIST_OCCASIONS), z.null()]),
      note: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const artist = await visibleArtist(ctx, input.username)
      const occasion = readOccasion(input.occasion)
      const note = readNote(input.note)
      const [row] = await ctx.db.update(artistShortlist)
        .set({ occasion, note, updatedAt: new Date() })
        .where(and(eq(artistShortlist.dancerId, ctx.dancerId), eq(artistShortlist.profileId, artist.id)))
        .returning({ id: artistShortlist.id })
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Shortlist them first.' })
      return { occasion, note }
    }),

  mine: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db.select({
        username: profiles.username,
        name: profiles.name,
        photo: profiles.photo,
        city: profiles.city,
        styles: profiles.styles,
        occasion: artistShortlist.occasion,
        note: artistShortlist.note,
        createdAt: artistShortlist.createdAt,
      }).from(artistShortlist)
        .innerJoin(profiles, eq(artistShortlist.profileId, profiles.id))
        .where(and(
          eq(artistShortlist.dancerId, ctx.dancerId),
          eq(profiles.type, 'artist'),
          eq(profiles.status, 'visible'),
        ))
        .orderBy(desc(artistShortlist.createdAt), profiles.username)
      return rows.map((row: { styles: string[] | null }) => ({ ...row, styles: row.styles ?? [] }))
    }),
})
