/**
 * The meetup after "you both said yes" (RAZ-1071): book the night, read when
 * and where, reveal the symbol for the other person, report if it didn't happen,
 * and answer the morning-after email. Web only — not on a connected app's token.
 */
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { trackServer } from '../../utils/posthog'
import { bookRitual, howRitual, loadRitual, reportRitual, revealRitual, RitualNoNight } from '../../utils/ritual'
import { RITUAL_PROBLEMS } from '../../../shared/utils/ritual'

const otherId = z.string().uuid()

export const ritualRouter = router({
  /** The signed-in dancer's meetup with one dance friend. */
  get: protectedProcedure
    .input(z.object({ otherId }))
    .query(async ({ ctx, input }) => {
      const view = await loadRitual(ctx.db, ctx.dancerId, input.otherId)
      if (!view) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not a match' })
      return view
    }),

  /** Book the night you were both pointed at. Puts it on your plan. */
  book: protectedProcedure
    .input(z.object({ otherId }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await bookRitual(ctx.db, ctx.dancerId, input.otherId)
        if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Not a match' })
        if (result.bookedNow) trackServer(ctx, 'ritual_booked', { event_id: result.view.night?.eventId })
        return result.view
      } catch (e) {
        if (e instanceof RitualNoNight) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No night to book' })
        throw e
      }
    }),

  /** They tapped at the venue. The symbol was already fixed when they booked. */
  reveal: protectedProcedure
    .input(z.object({ otherId }))
    .mutation(async ({ ctx, input }) => {
      const result = await revealRitual(ctx.db, ctx.dancerId, input.otherId)
      if (!result) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Book the night first' })
      if (result.revealedNow) trackServer(ctx, 'ritual_revealed', { event_id: result.view.night?.eventId })
      return result.view
    }),

  /** Something went wrong. Saved for WeDance; the other dancer is not told. */
  report: protectedProcedure
    .input(z.object({
      otherId,
      problem: z.enum(RITUAL_PROBLEMS),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = input.note?.trim() || null
      const view = await reportRitual(ctx.db, ctx.dancerId, input.otherId, input.problem, note)
      if (!view) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Book the night first' })
      trackServer(ctx, 'ritual_reported', { problem: input.problem, event_id: view.night?.eventId })
      return view
    }),

  /** The morning-after answer. One tap, no message to the other dancer. */
  how: protectedProcedure
    .input(z.object({ otherId, how: z.enum(['good', 'not']) }))
    .mutation(async ({ ctx, input }) => {
      const view = await howRitual(ctx.db, ctx.dancerId, input.otherId, input.how)
      if (!view) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Book the night first' })
      trackServer(ctx, 'ritual_how', { how: input.how, event_id: view.night?.eventId })
      return view
    }),
})
