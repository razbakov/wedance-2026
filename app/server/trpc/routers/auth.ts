import { z } from 'zod'
import { eq, and, gt } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { dancers, sessions } from '../../database/schema'
import { sendMagicLinkEmail } from '../../utils/email'

export const authRouter = router({
  requestMagicLink: publicProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().transform((s) => s.trim().toLowerCase()),
      danceStyles: z.array(z.string()).default([]),
      role: z.enum(['lead', 'follow', 'both']).optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const magicToken = crypto.randomUUID()
      const magicTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      const updateSet: Record<string, unknown> = {
        magicToken,
        magicTokenExpiresAt,
      }
      if (input.name) updateSet.name = input.name
      if (input.danceStyles.length > 0) updateSet.danceStyles = input.danceStyles
      if (input.role) updateSet.role = input.role
      if (input.city) updateSet.city = input.city

      await ctx.db
        .insert(dancers)
        .values({
          name: input.name || input.email.split('@')[0],
          email: input.email,
          danceStyles: input.danceStyles,
          role: input.role ?? null,
          city: input.city ?? null,
          magicToken,
          magicTokenExpiresAt,
        })
        .onConflictDoUpdate({
          target: dancers.email,
          set: updateSet,
        })

      // Get the dancer name for the email greeting
      const [dancer] = await ctx.db
        .select({ name: dancers.name })
        .from(dancers)
        .where(eq(dancers.email, input.email))

      const config = useRuntimeConfig()
      const siteUrl = config.siteUrl || 'http://localhost:3000'
      const magicLinkUrl = `${siteUrl}/auth/verify?token=${magicToken}`

      await sendMagicLinkEmail(input.email, dancer?.name || 'Dancer', magicLinkUrl)

      return { sent: true }
    }),

  verifyMagicLink: publicProcedure
    .input(z.object({
      token: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = input.token

      // Look up dancer by magic token, check not expired
      const [dancer] = await ctx.db
        .select({
          id: dancers.id,
          name: dancers.name,
          isAdmin: dancers.isAdmin,
        })
        .from(dancers)
        .where(
          and(
            eq(dancers.magicToken, token),
            gt(dancers.magicTokenExpiresAt, new Date()),
          ),
        )

      if (!dancer) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired link. Please request a new one.',
        })
      }

      // Clear magic token (single-use)
      await ctx.db
        .update(dancers)
        .set({ magicToken: null, magicTokenExpiresAt: null })
        .where(eq(dancers.id, dancer.id))

      // Create session
      const sessionToken = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

      await ctx.db.insert(sessions).values({
        dancerId: dancer.id,
        token: sessionToken,
        expiresAt,
      })

      return {
        sessionToken,
        dancerId: dancer.id,
        name: dancer.name,
        isAdmin: dancer.isAdmin ?? false,
      }
    }),

  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.dancerId) return null

      const [dancer] = await ctx.db
        .select({
          id: dancers.id,
          name: dancers.name,
          isAdmin: dancers.isAdmin,
        })
        .from(dancers)
        .where(eq(dancers.id, ctx.dancerId))

      if (!dancer) return null

      return {
        id: dancer.id,
        name: dancer.name,
        isAdmin: dancer.isAdmin ?? false,
      }
    }),
})
