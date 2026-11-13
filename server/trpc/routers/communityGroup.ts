import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and, asc, desc, inArray, ne, or, sql, isNull } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import { communityGroups, communityGroupReports, dancers } from '../../database/schema'
import { GROUP_PLATFORMS, inviteKey, inviteUrlError } from '../../../shared/utils/communityGroups'
import { citiesManagedBy, requireCityAdmin } from '../../utils/cityAccess'
import { batchLooksBroken, checkInviteLink } from '../../utils/groupLinkCheck'
import { trackServer } from '../../utils/posthog'

const PLATFORMS = GROUP_PLATFORMS
// Submissions one person can have waiting at once (spam brake).
const MAX_PENDING_PER_DANCER = 15

/**
 * Community groups directory — the cold-start filler for cities where WeDance
 * has no events yet, and the way into the local scene everywhere.
 *
 * Since 0067 it grows with the community: anyone signed in submits a group
 * (`submit` → status 'pending'), the city's admins (its city page team, or WeDance
 * admins) approve or decline it (`pending` / `review`), and `checkLinks` hides
 * groups whose invite link died. Official channels of the city's own WeDance page
 * (kind 'official') live in the same table but are listed by cityChannels.official.
 */
export const communityGroupRouter = router({
  // Admin: every community group across cities, newest first (dashboard).
  listAll: adminProcedure
    .input(z.object({ citySlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(communityGroups)
        .where(input?.citySlug ? eq(communityGroups.citySlug, input.citySlug) : undefined)
        .orderBy(desc(communityGroups.createdAt))
      return rows
    }),

  listByCity: publicProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: communityGroups.id,
          name: communityGroups.name,
          platform: communityGroups.platform,
          inviteUrl: communityGroups.inviteUrl,
          styles: communityGroups.styles,
          verified: communityGroups.verified,
          description: communityGroups.description,
          // "Added by Anna": credit for the person who shared it (first name only).
          addedBy: sql<string | null>`split_part(${dancers.name}, ' ', 1)`,
        })
        .from(communityGroups)
        .leftJoin(dancers, eq(dancers.id, communityGroups.submittedBy))
        .where(and(
          eq(communityGroups.citySlug, input.citySlug),
          eq(communityGroups.status, 'visible'),
          eq(communityGroups.kind, 'community'),
          ne(communityGroups.linkStatus, 'dead'),
        ))

      // Verified first, then by name.
      return [...rows].sort((a: any, b: any) =>
        (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || String(a.name).localeCompare(String(b.name)))
    }),

  // A dancer shares a group for a city. It waits for the city's admins.
  submit: protectedProcedure
    .input(z.object({
      citySlug: z.string().trim().min(1).max(80),
      name: z.string().trim().min(2).max(120),
      platform: z.enum(PLATFORMS),
      inviteUrl: z.string().trim().url().max(500),
      styles: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
      description: z.string().trim().max(300).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const bad = inviteUrlError(input.platform, input.inviteUrl)
      if (bad) throw new TRPCError({ code: 'BAD_REQUEST', message: bad })
      const key = inviteKey(input.inviteUrl)!
      const [same] = await ctx.db.select({ id: communityGroups.id, status: communityGroups.status, citySlug: communityGroups.citySlug })
        .from(communityGroups).where(eq(communityGroups.inviteKey, key))
      if (same) {
        trackServer(ctx, 'community_group_submitted', { city: input.citySlug, platform: input.platform, duplicate: true })
        return { id: same.id, duplicate: true, status: same.status }
      }
      const [waiting] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(communityGroups)
        .where(and(eq(communityGroups.submittedBy, ctx.dancerId), eq(communityGroups.status, 'pending')))
      if ((waiting?.n ?? 0) >= MAX_PENDING_PER_DANCER) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'You have many groups waiting for review already. Thanks! Try again once they’re checked.' })
      const [row] = await ctx.db.insert(communityGroups).values({
        citySlug: input.citySlug, name: input.name, platform: input.platform, inviteUrl: input.inviteUrl, inviteKey: key,
        styles: input.styles, description: input.description || null, source: 'submitted', submittedBy: ctx.dancerId,
        status: 'pending', kind: 'community', verified: false,
      }).returning({ id: communityGroups.id })
      trackServer(ctx, 'community_group_submitted', { city: input.citySlug, platform: input.platform, duplicate: false })
      return { id: row!.id, duplicate: false, status: 'pending' as const }
    }),

  // Groups waiting for review in the cities I run (all cities for WeDance admins).
  pending: protectedProcedure
    .input(z.object({ citySlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const mine = ctx.isAdmin ? null : await citiesManagedBy(ctx.db, ctx.dancerId)
      if (mine && !mine.length) return []
      const cities = input?.citySlug ? (mine && !mine.includes(input.citySlug) ? [] : [input.citySlug]) : mine
      if (cities && !cities.length) return []
      return ctx.db.select({
        id: communityGroups.id, citySlug: communityGroups.citySlug, name: communityGroups.name, platform: communityGroups.platform,
        inviteUrl: communityGroups.inviteUrl, styles: communityGroups.styles, description: communityGroups.description,
        createdAt: communityGroups.createdAt, linkStatus: communityGroups.linkStatus, submittedBy: dancers.name,
      }).from(communityGroups).leftJoin(dancers, eq(dancers.id, communityGroups.submittedBy))
        .where(and(eq(communityGroups.status, 'pending'), cities ? inArray(communityGroups.citySlug, cities) : undefined))
        .orderBy(asc(communityGroups.createdAt))
    }),

  // Approve (optionally fixing the name / styles) or decline a submitted group.
  review: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      approve: z.boolean(),
      name: z.string().trim().min(2).max(120).optional(),
      styles: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
      verified: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [g] = await ctx.db.select().from(communityGroups).where(eq(communityGroups.id, input.id))
      if (!g) throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
      await requireCityAdmin(ctx as any, g.citySlug)
      await ctx.db.update(communityGroups).set({
        status: input.approve ? 'visible' : 'rejected',
        reviewedBy: ctx.dancerId, reviewedAt: new Date(),
        ...(input.name ? { name: input.name } : {}),
        ...(input.styles ? { styles: input.styles } : {}),
        ...(input.verified !== undefined ? { verified: input.verified } : {}),
      }).where(eq(communityGroups.id, input.id))
      const hours = g.createdAt ? Math.round((Date.now() - new Date(g.createdAt).getTime()) / 36e5) : null
      trackServer(ctx, 'community_group_reviewed', { city: g.citySlug, platform: g.platform, decision: input.approve ? 'approved' : 'rejected', hours_to_review: hours })
      return { status: input.approve ? 'visible' : 'rejected' }
    }),

  // Show again / hide a listed group (city admins), e.g. after a false "dead link".
  setVisible: protectedProcedure
    .input(z.object({ id: z.string().uuid(), visible: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [g] = await ctx.db.select().from(communityGroups).where(eq(communityGroups.id, input.id))
      if (!g) throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found.' })
      await requireCityAdmin(ctx as any, g.citySlug)
      await ctx.db.update(communityGroups).set(input.visible
        ? { status: 'visible', linkStatus: 'unknown', reportCount: 0, reviewedBy: ctx.dancerId, reviewedAt: new Date() }
        : { status: 'hidden', reviewedBy: ctx.dancerId, reviewedAt: new Date() }).where(eq(communityGroups.id, input.id))
      if (input.visible) await ctx.db.delete(communityGroupReports).where(eq(communityGroupReports.groupId, input.id))
      return { ok: true }
    }),

  // The city's groups for its admins: listed, hidden, dead links (not pending — see `pending`).
  forCity: protectedProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await requireCityAdmin(ctx as any, input.citySlug)
      return ctx.db.select({
        id: communityGroups.id, name: communityGroups.name, platform: communityGroups.platform, inviteUrl: communityGroups.inviteUrl,
        styles: communityGroups.styles, verified: communityGroups.verified, status: communityGroups.status, linkStatus: communityGroups.linkStatus,
        linkCheckedAt: communityGroups.linkCheckedAt, reportCount: communityGroups.reportCount, submittedBy: dancers.name,
      }).from(communityGroups).leftJoin(dancers, eq(dancers.id, communityGroups.submittedBy))
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'community'), inArray(communityGroups.status, ['visible', 'hidden'])))
        .orderBy(asc(communityGroups.name))
    }),

  // Check invite links (WhatsApp / Telegram), the longest-unchecked first. A dead link
  // is hidden from the city page until an admin shows it again or it comes back.
  checkLinks: protectedProcedure
    .input(z.object({ citySlug: z.string().min(1).optional(), limit: z.number().int().min(1).max(40).default(20) }))
    .mutation(async ({ ctx, input }) => {
      if (input.citySlug) await requireCityAdmin(ctx as any, input.citySlug)
      else if (!ctx.isAdmin) throw new TRPCError({ code: 'FORBIDDEN', message: 'Pick a city.' })
      const dayAgo = new Date(Date.now() - 20 * 3600_000)
      const rows = await ctx.db.select({ id: communityGroups.id, inviteUrl: communityGroups.inviteUrl, linkStatus: communityGroups.linkStatus })
        .from(communityGroups)
        .where(and(
          input.citySlug ? eq(communityGroups.citySlug, input.citySlug) : undefined,
          inArray(communityGroups.platform, ['whatsapp', 'telegram']),
          inArray(communityGroups.status, ['visible', 'pending']),
          or(isNull(communityGroups.linkCheckedAt), sql`${communityGroups.linkCheckedAt} < ${dayAgo}`),
        ))
        .orderBy(sql`${communityGroups.linkCheckedAt} asc nulls first`)
        .limit(input.limit)
      const results = await Promise.all(rows.map((r: any) => checkInviteLink(r.inviteUrl)))
      const now = new Date()
      if (batchLooksBroken(results)) return { checked: rows.length, ok: 0, dead: 0, unknown: rows.length, skipped: true }
      for (const [i, r] of rows.entries()) {
        const res = results[i]!
        await ctx.db.update(communityGroups).set({ linkCheckedAt: now, ...(res.status === 'unknown' ? {} : { linkStatus: res.status }) })
          .where(eq(communityGroups.id, r.id))
      }
      const count = (s: string) => results.filter(r => r.status === s).length
      return { checked: rows.length, ok: count('ok'), dead: count('dead'), unknown: count('unknown'), skipped: false }
    }),

  create: adminProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      name: z.string().min(1),
      platform: z.enum(PLATFORMS).default('whatsapp'),
      inviteUrl: z.string().url(),
      styles: z.array(z.string()).default([]),
      source: z.string().optional(),
      verified: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const key = inviteKey(input.inviteUrl)
      if (key) {
        const [same] = await ctx.db.select({ id: communityGroups.id, citySlug: communityGroups.citySlug }).from(communityGroups).where(eq(communityGroups.inviteKey, key))
        if (same) throw new TRPCError({ code: 'CONFLICT', message: `That group is already listed (${same.citySlug}).` })
      }
      const [row] = await ctx.db
        .insert(communityGroups)
        .values({
          citySlug: input.citySlug,
          name: input.name,
          platform: input.platform,
          inviteUrl: input.inviteUrl,
          inviteKey: key,
          styles: input.styles,
          source: input.source ?? null,
          verified: input.verified,
          submittedBy: ctx.dancerId,
          reviewedBy: ctx.dancerId,
          reviewedAt: new Date(),
        })
        .returning({ id: communityGroups.id })
      return { id: row!.id }
    }),

  report: protectedProcedure
    .input(z.object({
      groupId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate group exists and is still visible
      const [group] = await ctx.db
        .select({ id: communityGroups.id, status: communityGroups.status })
        .from(communityGroups)
        .where(eq(communityGroups.id, input.groupId))

      if (!group) {
        throw new Error('Group not found')
      }

      if (group.status === 'hidden') {
        throw new Error('Group already reported')
      }

      // Per-user dedupe: unique constraint rejects duplicate reports
      const [existing] = await ctx.db
        .select({ id: communityGroupReports.id })
        .from(communityGroupReports)
        .where(and(
          eq(communityGroupReports.groupId, input.groupId),
          eq(communityGroupReports.dancerId, ctx.dancerId),
        ))

      if (existing) {
        throw new Error('Already reported')
      }

      await ctx.db.insert(communityGroupReports).values({
        groupId: input.groupId,
        dancerId: ctx.dancerId,
      })

      // Atomic increment + conditional status flip in a single UPDATE
      const [updated] = await ctx.db
        .update(communityGroups)
        .set({
          reportCount: sql`COALESCE(${communityGroups.reportCount}, 0) + 1`,
          status: sql`CASE WHEN COALESCE(${communityGroups.reportCount}, 0) + 1 >= 3 THEN 'hidden' ELSE 'visible' END`,
        })
        .where(and(eq(communityGroups.id, input.groupId), eq(communityGroups.status, 'visible')))
        .returning({ reportCount: communityGroups.reportCount, status: communityGroups.status })

      return { reported: true, hidden: updated?.status === 'hidden' }
    }),
})
