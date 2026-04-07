import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.dancerId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not signed in' })
  }
  return next({ ctx: { ...ctx, dancerId: ctx.dancerId } })
})

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({ ctx: { ...ctx, dancerId: ctx.dancerId! } })
})
