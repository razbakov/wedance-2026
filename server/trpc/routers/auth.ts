import { z } from 'zod'
import { eq, and, gt } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { FirebaseScrypt } from 'firebase-scrypt'
import { router, publicProcedure } from '../trpc'
import { dancers, sessions } from '../../database/schema'
import { sendMagicLinkEmail } from '../../utils/email'

// FirebaseScrypt parameters, ported verbatim from wedance-v4
// (server/api/auth/[...].ts). These MUST match v4 exactly so legacy user
// hashes (salt + hash copied from v4's Postgres) verify unchanged. The
// signer key and salt separator are secrets supplied via env — see the
// FIREBASE_SALT_SEPARATOR / FIREBASE_SIGNER_KEY entries in .env (and the
// Vercel project env for deploy).
const firebaseScryptParameters = {
  memCost: 14,
  rounds: 8,
  saltSeparator: String(process.env.FIREBASE_SALT_SEPARATOR),
  signerKey: String(process.env.FIREBASE_SIGNER_KEY),
}

// Mint a 30-day session row for a dancer and return the same shape the whole
// app already consumes via setSession() / auth.me. Extracted so magic-link,
// login, and register all mint sessions identically.
async function createSession(
  db: {
    insert: (table: typeof sessions) => {
      values: (v: Record<string, unknown>) => Promise<unknown>
    }
  },
  dancer: { id: string; name: string; isAdmin: boolean | null },
) {
  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

  await db.insert(sessions).values({
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
}

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

      return createSession(ctx.db, dancer)
    }),

  // Email + password login. Ported functionally from wedance-v4's Credentials
  // `authorize`. Verifies against the stored FirebaseScrypt salt/hash so legacy
  // users keep their existing passwords once their rows are copied into this DB.
  // Never leaks whether the email exists: both "unknown email" and "wrong
  // password" surface the same generic error.
  login: publicProcedure
    .input(z.object({
      email: z.string().email().transform((s) => s.trim().toLowerCase()),
      password: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const invalidCredentials = new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password.',
      })

      const [dancer] = await ctx.db
        .select({
          id: dancers.id,
          name: dancers.name,
          isAdmin: dancers.isAdmin,
          salt: dancers.salt,
          hash: dancers.hash,
        })
        .from(dancers)
        .where(eq(dancers.email, input.email))

      // Unknown email, or a dancer that has no password set (created via
      // magic-link / festival flow) — same generic error either way.
      if (!dancer || !dancer.salt || !dancer.hash) {
        throw invalidCredentials
      }

      const scrypt = new FirebaseScrypt(firebaseScryptParameters)
      const isValid = await scrypt.verify(input.password, dancer.salt, dancer.hash)

      if (!isValid) {
        throw invalidCredentials
      }

      return createSession(ctx.db, dancer)
    }),

  // Email + password registration. Generates salt + hash exactly as wedance-v4
  // does (salt from Math.random, FirebaseScrypt hash), preserving the onboarding
  // fields the magic-link signup already collected so nothing downstream breaks.
  register: publicProcedure
    .input(z.object({
      name: z.string().min(1, 'Name is required.'),
      email: z.string().email().transform((s) => s.trim().toLowerCase()),
      password: z.string().min(8, 'Password must be at least 8 characters.'),
      danceStyles: z.array(z.string()).default([]),
      role: z.enum(['lead', 'follow', 'both']).optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Reject duplicate email up front with a clean message. The unique
      // constraint on dancers.email is the real guard (handled below too), but
      // this gives a friendly error for the common case.
      const [existing] = await ctx.db
        .select({ id: dancers.id })
        .from(dancers)
        .where(eq(dancers.email, input.email))

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already in use.',
        })
      }

      // Salt + hash, identical scheme to wedance-v4.
      const salt = Buffer.from(String(Math.random()).slice(7)).toString('base64')
      const scrypt = new FirebaseScrypt(firebaseScryptParameters)
      const hash = await scrypt.hash(input.password, salt)

      let dancer: { id: string; name: string; isAdmin: boolean | null }
      try {
        const [inserted] = await ctx.db
          .insert(dancers)
          .values({
            name: input.name,
            email: input.email,
            danceStyles: input.danceStyles,
            role: input.role ?? null,
            city: input.city ?? null,
            salt,
            hash,
          })
          .returning({
            id: dancers.id,
            name: dancers.name,
            isAdmin: dancers.isAdmin,
          })
        dancer = inserted
      } catch (error: unknown) {
        // Unique-violation race (two registrations for the same email at once):
        // Postgres error code 23505. Surface the same clean message.
        const code = (error as { code?: string })?.code
        if (code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already in use.',
          })
        }
        throw error
      }

      return createSession(ctx.db, dancer)
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
