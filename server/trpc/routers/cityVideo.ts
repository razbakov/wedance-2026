import { z } from 'zod'
import { eq, and, desc, or, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, adminProcedure } from '../trpc'
import { cityVideos, videoVotes } from '../../database/schema'
import { updateElo, INITIAL_ELO } from '../lib/elo'
import { pairKey, selectNextPair } from '../lib/pairSelect'

/** Current competition month key, e.g. '2026-07' (UTC). */
export function currentMonth(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Server-side YouTube thumbnail derivation for `submit`. We keep this minimal
 * copy here rather than import `app/lib/videoEmbed.ts` across the Nuxt
 * app/server boundary. The client uses the richer app helper for rendering.
 */
function deriveThumbnail(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`
  }
  return null
}

// Reasonable per-session vote cap for one city+month. High enough that a real
// enthusiast never hits it, low enough to blunt scripted ballot-stuffing.
const MAX_VOTES_PER_SESSION = 200

export const cityVideoRouter = router({
  // Approved videos for a city (optionally a specific month), best first.
  listApproved: publicProcedure
    .input(z.object({
      citySlug: z.string(),
      competitionMonth: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const month = input.competitionMonth ?? currentMonth()
      return ctx.db
        .select({
          id: cityVideos.id,
          title: cityVideos.title,
          videoUrl: cityVideos.videoUrl,
          thumbnailUrl: cityVideos.thumbnailUrl,
          danceStyle: cityVideos.danceStyle,
          eloScore: cityVideos.eloScore,
          voteCount: cityVideos.voteCount,
          competitionMonth: cityVideos.competitionMonth,
        })
        .from(cityVideos)
        .where(and(
          eq(cityVideos.citySlug, input.citySlug),
          eq(cityVideos.status, 'approved'),
          eq(cityVideos.competitionMonth, month),
        ))
        .orderBy(desc(cityVideos.eloScore))
    }),

  // Video of the Month = highest-ELO approved video for the current month.
  // Returns null (never a fabricated winner) when the city has no entries yet.
  monthWinner: publicProcedure
    .input(z.object({
      citySlug: z.string(),
      competitionMonth: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const month = input.competitionMonth ?? currentMonth()
      const [winner] = await ctx.db
        .select({
          id: cityVideos.id,
          title: cityVideos.title,
          videoUrl: cityVideos.videoUrl,
          thumbnailUrl: cityVideos.thumbnailUrl,
          danceStyle: cityVideos.danceStyle,
          eloScore: cityVideos.eloScore,
          voteCount: cityVideos.voteCount,
          competitionMonth: cityVideos.competitionMonth,
        })
        .from(cityVideos)
        .where(and(
          eq(cityVideos.citySlug, input.citySlug),
          eq(cityVideos.status, 'approved'),
          eq(cityVideos.competitionMonth, month),
        ))
        .orderBy(desc(cityVideos.eloScore))
        .limit(1)

      return winner ?? null
    }),

  // Next pair to vote on for this session — two approved videos this session
  // hasn't already paired. Returns { pair: null, ... } when exhausted.
  getPair: publicProcedure
    .input(z.object({ citySlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const month = currentMonth()
      const sessionId = ctx.voterSessionId

      const videos = await ctx.db
        .select({
          id: cityVideos.id,
          title: cityVideos.title,
          videoUrl: cityVideos.videoUrl,
          thumbnailUrl: cityVideos.thumbnailUrl,
          danceStyle: cityVideos.danceStyle,
        })
        .from(cityVideos)
        .where(and(
          eq(cityVideos.citySlug, input.citySlug),
          eq(cityVideos.status, 'approved'),
          eq(cityVideos.competitionMonth, month),
        ))

      const byId = new Map(videos.map(v => [v.id, v]))
      const ids = videos.map(v => v.id)

      // Pairs this session already voted on (for dedupe).
      const seen = new Set<string>()
      let votesCast = 0
      if (sessionId) {
        const prior = await ctx.db
          .select({
            winnerVideoId: videoVotes.winnerVideoId,
            loserVideoId: videoVotes.loserVideoId,
          })
          .from(videoVotes)
          .where(and(
            eq(videoVotes.citySlug, input.citySlug),
            eq(videoVotes.voterSessionId, sessionId),
          ))
        votesCast = prior.length
        for (const v of prior) seen.add(pairKey(v.winnerVideoId, v.loserVideoId))
      }

      if (votesCast >= MAX_VOTES_PER_SESSION) {
        return { pair: null as null, poolSize: ids.length, exhausted: false, capped: true }
      }

      const chosen = selectNextPair(ids, seen)
      if (!chosen) {
        return { pair: null as null, poolSize: ids.length, exhausted: ids.length >= 2, capped: false }
      }

      return {
        pair: [byId.get(chosen[0])!, byId.get(chosen[1])!] as const,
        poolSize: ids.length,
        exhausted: false,
        capped: false,
      }
    }),

  // Record a pairwise vote: insert the vote row and update BOTH videos' ELO +
  // voteCount. Idempotent per (session, unordered pair) — a duplicate is a
  // no-op rather than a double-count.
  vote: publicProcedure
    .input(z.object({
      citySlug: z.string(),
      winnerVideoId: z.string().uuid(),
      loserVideoId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.winnerVideoId === input.loserVideoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A video cannot beat itself.' })
      }

      const sessionId = ctx.voterSessionId
      if (!sessionId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No voting session.' })
      }

      // Load both videos; they must be approved and in this city.
      const rows = await ctx.db
        .select({
          id: cityVideos.id,
          eloScore: cityVideos.eloScore,
          status: cityVideos.status,
          citySlug: cityVideos.citySlug,
        })
        .from(cityVideos)
        .where(or(
          eq(cityVideos.id, input.winnerVideoId),
          eq(cityVideos.id, input.loserVideoId),
        ))

      const winner = rows.find(r => r.id === input.winnerVideoId)
      const loser = rows.find(r => r.id === input.loserVideoId)

      if (!winner || !loser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Video not found.' })
      }
      if (
        winner.status !== 'approved' || loser.status !== 'approved'
        || winner.citySlug !== input.citySlug || loser.citySlug !== input.citySlug
      ) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Both videos must be approved in this city.' })
      }

      // Dedupe: if this session already voted on this unordered pair, no-op.
      const priorSame = await ctx.db
        .select({ id: videoVotes.id })
        .from(videoVotes)
        .where(and(
          eq(videoVotes.citySlug, input.citySlug),
          eq(videoVotes.voterSessionId, sessionId),
          or(
            and(eq(videoVotes.winnerVideoId, input.winnerVideoId), eq(videoVotes.loserVideoId, input.loserVideoId)),
            and(eq(videoVotes.winnerVideoId, input.loserVideoId), eq(videoVotes.loserVideoId, input.winnerVideoId)),
          ),
        ))
        .limit(1)

      if (priorSame.length > 0) {
        return { recorded: false, duplicate: true }
      }

      const { winner: newWinnerElo, loser: newLoserElo } = updateElo(winner.eloScore, loser.eloScore)

      await ctx.db.insert(videoVotes).values({
        citySlug: input.citySlug,
        winnerVideoId: input.winnerVideoId,
        loserVideoId: input.loserVideoId,
        voterSessionId: sessionId,
        voterDancerId: ctx.dancerId,
      })

      await ctx.db
        .update(cityVideos)
        .set({ eloScore: newWinnerElo, voteCount: sql`${cityVideos.voteCount} + 1` })
        .where(eq(cityVideos.id, input.winnerVideoId))

      await ctx.db
        .update(cityVideos)
        .set({ eloScore: newLoserElo, voteCount: sql`${cityVideos.voteCount} + 1` })
        .where(eq(cityVideos.id, input.loserVideoId))

      return { recorded: true, duplicate: false }
    }),

  // Public submission — enters the current month's competition as `pending`.
  submit: publicProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      title: z.string().min(2).max(120),
      videoUrl: z.string().url(),
      danceStyle: z.string().max(60).optional(),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const month = currentMonth()
      const [row] = await ctx.db
        .insert(cityVideos)
        .values({
          citySlug: input.citySlug,
          submittedByEmail: input.email,
          dancerId: ctx.dancerId,
          title: input.title,
          videoUrl: input.videoUrl,
          thumbnailUrl: deriveThumbnail(input.videoUrl),
          danceStyle: input.danceStyle ?? null,
          competitionMonth: month,
          status: 'pending',
          eloScore: INITIAL_ELO,
        })
        .returning({ id: cityVideos.id })

      return { id: row!.id, status: 'pending' as const }
    }),

  // ---- admin moderation ----

  pendingList: adminProcedure
    .input(z.object({ citySlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.citySlug
        ? and(eq(cityVideos.status, 'pending'), eq(cityVideos.citySlug, input.citySlug))
        : eq(cityVideos.status, 'pending')
      return ctx.db
        .select()
        .from(cityVideos)
        .where(where)
        .orderBy(desc(cityVideos.createdAt))
    }),

  setStatus: adminProcedure
    .input(z.object({
      videoId: z.string().uuid(),
      status: z.enum(['pending', 'approved', 'rejected']),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(cityVideos)
        .set({ status: input.status })
        .where(eq(cityVideos.id, input.videoId))
      return { videoId: input.videoId, status: input.status }
    }),
})
