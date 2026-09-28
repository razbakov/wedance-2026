import { z } from 'zod'
import { eq, and, gt } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { FirebaseScrypt } from 'firebase-scrypt'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import {
  dancers, sessions, dinnerSignups, dinnerGroupMembers, videoVotes,
  cityBattleVotes, giveawayEntries, reviews, bookingRequests,
  electionCandidates, electionVotes, electionVoteHistory,
  recommendationRequests, festivalSubmissions, festivalSignups, cityVideos,
  guidelineVersions, moderatorElections,
} from '../../database/schema'
import { sendMagicLinkEmail } from '../../utils/email'
import { generateUsername } from '../../utils/slug'

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

      // Insert with a generated username. A 23505 unique violation is either
      // the email (→ clean "already in use") or a username collision (~1e-6) —
      // in the latter case we regenerate the handle and retry rather than
      // surfacing a wrong "email in use" error and failing the signup.
      let dancer: { id: string; name: string; isAdmin: boolean | null } | undefined
      const MAX_USERNAME_TRIES = 5
      for (let attempt = 0; attempt < MAX_USERNAME_TRIES && !dancer; attempt++) {
        try {
          const [inserted] = await ctx.db
            .insert(dancers)
            .values({
              name: input.name,
              email: input.email,
              username: generateUsername(input.name),
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
          const e = error as { code?: string; constraint?: string }
          if (e?.code === '23505') {
            // Username clash: regenerate and retry. Any other unique violation
            // (email, or an unknown constraint) is the email-in-use case.
            if (e.constraint === 'dancers_username_unique') continue
            throw new TRPCError({ code: 'CONFLICT', message: 'Email already in use.' })
          }
          throw error
        }
      }

      if (!dancer) {
        // Exhausted retries on username collisions — astronomically unlikely.
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create your account. Please try again.',
        })
      }

      return createSession(ctx.db, dancer)
    }),

  // Change the signed-in dancer's password: verify the current one, then
  // re-hash the new one with a fresh salt (same FirebaseScrypt scheme as
  // register). A dancer with no password set (magic-link signup) has empty
  // salt/hash and will fail the current-password check — they recover via the
  // magic link instead.
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
    }))
    .mutation(async ({ ctx, input }) => {
      const [dancer] = await ctx.db
        .select({ salt: dancers.salt, hash: dancers.hash })
        .from(dancers)
        .where(eq(dancers.id, ctx.dancerId))

      const scrypt = new FirebaseScrypt(firebaseScryptParameters)
      const ok = dancer && dancer.salt && dancer.hash
        && await scrypt.verify(input.currentPassword, dancer.salt, dancer.hash)
      if (!ok) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Current password is incorrect.' })
      }

      const salt = Buffer.from(String(Math.random()).slice(7)).toString('base64')
      const hash = await scrypt.hash(input.newPassword, salt)
      await ctx.db.update(dancers).set({ salt, hash }).where(eq(dancers.id, ctx.dancerId))
      return { ok: true }
    }),

  // Persist the onboarding choice. Protected: requires a signed-in dancer.
  // Sets the chosen persona + any collected fields and stamps onboardedAt so
  // the onboarding guard never nags again (Skip calls this too, intent-only).
  completeOnboarding: protectedProcedure
    .input(z.object({
      intent: z.string().min(1),
      city: z.string().optional(),
      danceStyles: z.array(z.string()).optional(),
      role: z.enum(['lead', 'follow', 'both']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateSet: Record<string, unknown> = {
        intent: input.intent,
        onboardedAt: new Date(),
      }
      // Only overwrite collected fields when the branch actually provided them,
      // so a Skip (intent-only) doesn't wipe anything already on the profile.
      if (input.city !== undefined) updateSet.city = input.city
      if (input.danceStyles !== undefined) updateSet.danceStyles = input.danceStyles
      if (input.role !== undefined) updateSet.role = input.role

      // Backfill a username for dancers created before the field existed
      // (magic-link / festival-claim signups). New registrations already have
      // one; this ensures anyone who reaches onboarding gets a profile URL.
      const [current] = await ctx.db
        .select({ username: dancers.username, name: dancers.name })
        .from(dancers)
        .where(eq(dancers.id, ctx.dancerId))
      if (current && !current.username) {
        updateSet.username = generateUsername(current.name)
      }

      await ctx.db
        .update(dancers)
        .set(updateSet)
        .where(eq(dancers.id, ctx.dancerId))

      return { ok: true }
    }),

  me: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.dancerId) return null

      const [dancer] = await ctx.db
        .select({
          id: dancers.id,
          name: dancers.name,
          username: dancers.username,
          isAdmin: dancers.isAdmin,
          city: dancers.city,
          danceStyles: dancers.danceStyles,
          role: dancers.role,
          intent: dancers.intent,
          onboardedAt: dancers.onboardedAt,
          bio: dancers.bio,
          instagram: dancers.instagram,
          youtube: dancers.youtube,
          website: dancers.website,
          profilePublic: dancers.profilePublic,
        })
        .from(dancers)
        .where(eq(dancers.id, ctx.dancerId))

      if (!dancer) return null

      return {
        id: dancer.id,
        name: dancer.name,
        username: dancer.username ?? null,
        isAdmin: dancer.isAdmin ?? false,
        city: dancer.city ?? null,
        danceStyles: dancer.danceStyles ?? [],
        role: dancer.role ?? null,
        intent: dancer.intent ?? null,
        onboardedAt: dancer.onboardedAt ? dancer.onboardedAt.toISOString() : null,
        bio: dancer.bio ?? null,
        instagram: dancer.instagram ?? null,
        youtube: dancer.youtube ?? null,
        website: dancer.website ?? null,
        profilePublic: dancer.profilePublic ?? true,
      }
    }),

  // GDPR account deletion: permanently remove the dancer and cascade delete or
  // anonymize referencing rows in FK-safe order. All writes execute atomically
  // in a transaction. Session is invalidated immediately on return.
  //
  // Deletion strategy:
  // - Hard delete: sessions, dinnerSignups, dinnerGroupMembers, giveawayEntries,
  //   bookingRequests, electionVotes (where voter is this dancer),
  //   electionVoteHistory (where voter is this dancer), electionCandidates,
  //   recommendationRequests, festivalSubmissions.
  // - Handle FK constraints: null moderator_dancer_id in guidelineVersions,
  //   null winner_candidate_id in moderatorElections, delete votes targeting
  //   deleted candidates.
  // - Anonymize: set dancerId=null or clear emails in videoVotes,
  //   cityBattleVotes, festivalSignups, cityVideos, reviews.
  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const dancerId = ctx.dancerId
      if (!dancerId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be signed in to delete your account.',
        })
      }

      try {
        await ctx.db.transaction(async (tx) => {
          // FK-safe deletion order (deepest dependencies first):

          // 1. Delete votes cast by this dancer (both tables)
          await tx.delete(electionVoteHistory).where(eq(electionVoteHistory.voterDancerId, dancerId))
          await tx.delete(electionVotes).where(eq(electionVotes.voterDancerId, dancerId))

          // 2. Find all candidate IDs for this dancer before deleting them
          const candidateIds = await tx
            .select({ id: electionCandidates.id })
            .from(electionCandidates)
            .where(eq(electionCandidates.dancerId, dancerId))

          // Delete votes that target those candidates
          for (const candidate of candidateIds) {
            await tx.delete(electionVotes).where(eq(electionVotes.candidateId, candidate.id))
            await tx.delete(electionVoteHistory).where(eq(electionVoteHistory.candidateId, candidate.id))
          }

          // 3. Null out any winner_candidate_id references for candidates from this dancer
          if (candidateIds.length > 0) {
            const candidateIdList = candidateIds.map(c => c.id)
            // For each candidate, find elections where that candidate won and null the winner
            for (const candidateId of candidateIdList) {
              await tx.update(moderatorElections)
                .set({ winnerCandidateId: null })
                .where(eq(moderatorElections.winnerCandidateId, candidateId))
            }
          }

          // 4. Delete candidates from this dancer
          await tx.delete(electionCandidates).where(eq(electionCandidates.dancerId, dancerId))

          // 5. Delete other direct FK references to this dancer
          await tx.delete(recommendationRequests).where(eq(recommendationRequests.askerId, dancerId))
          await tx.delete(dinnerGroupMembers).where(eq(dinnerGroupMembers.dancerId, dancerId))
          await tx.delete(dinnerSignups).where(eq(dinnerSignups.dancerId, dancerId))
          await tx.delete(giveawayEntries).where(eq(giveawayEntries.dancerId, dancerId))
          await tx.delete(reviews).where(eq(reviews.dancerId, dancerId))

          // 6. Handle bookingRequests: delete where requester is this dancer, set moderatedById=null where this dancer is moderator
          await tx.delete(bookingRequests).where(eq(bookingRequests.requesterId, dancerId))
          await tx.update(bookingRequests).set({ moderatedById: null }).where(eq(bookingRequests.moderatedById, dancerId))

          // 7. Null out guidelineVersions.moderator_dancer_id before deleting the dancer
          await tx.update(guidelineVersions).set({ moderatorDancerId: null }).where(eq(guidelineVersions.moderatorDancerId, dancerId))

          // 8. Anonymize rows where the dancer is a voter/submitter but the row should survive:
          //    - videoVotes: keep the vote record but clear voterDancerId (anonymous vote)
          //    - cityBattleVotes: keep the vote record but clear voterDancerId (anonymous vote)
          //    - festivalSignups: clear dancerId and anonymize email
          //    - cityVideos: clear dancerId and anonymize email
          await tx.update(videoVotes).set({ voterDancerId: null }).where(eq(videoVotes.voterDancerId, dancerId))
          await tx.update(cityBattleVotes).set({ voterDancerId: null }).where(eq(cityBattleVotes.voterDancerId, dancerId))
          await tx.update(festivalSignups)
            .set({ dancerId: null, tickettailorBuyerEmail: null })
            .where(eq(festivalSignups.dancerId, dancerId))
          await tx.update(cityVideos)
            .set({ dancerId: null, submittedByEmail: 'anonymized@wedance.local' })
            .where(eq(cityVideos.dancerId, dancerId))

          // 9. Handle festivalSubmissions: delete submissions from this dancer
          await tx.delete(festivalSubmissions).where(eq(festivalSubmissions.submittedById, dancerId))

          // 10. Finally, delete sessions and the dancer row
          await tx.delete(sessions).where(eq(sessions.dancerId, dancerId))
          await tx.delete(dancers).where(eq(dancers.id, dancerId))
        })

        return { ok: true, deleted: true }
      } catch (error) {
        console.error('Account deletion error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not delete your account. Please try again or contact support.',
        })
      }
    }),
})
