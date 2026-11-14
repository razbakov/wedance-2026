import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc'
import { cityPages, citySchedules, communityGroups, dancers, instagramConnections, profileMembers, profiles } from '../../database/schema'
import { grant, logAccess, membershipOf, profileByHandle } from '../../utils/profileAccess'
import { cityNames, cityOfPage, citiesManagedBy, cityPageOf, requireCityAdmin } from '../../utils/cityAccess'
import { checkChat, telegramConfigured, TelegramError } from '../../utils/telegram'
import { cityPageHandle, inviteKey, inviteUrlError, telegramNameOf } from '../../../shared/utils/communityGroups'
import { handleError } from '../../../shared/utils/handle'
import { handleTaken } from './business'
import { profileGroup, trackServer } from '../../utils/posthog'

/**
 * City channels (migration 0067) — a city's own WeDance accounts.
 *
 * - WeDance admins pick the city page (an existing business page, e.g. @wedancemunich)
 *   and add the city's admins to its team. Admin → Cities shows every city at once.
 * - The city's admins list its official channels (Telegram, WhatsApp, Instagram…) and
 *   connect the bot to Telegram ones. Instagram itself is the page's #501 connection.
 * - Dancers see the official channels first on the city page (`official`).
 */
const OFFICIAL_PLATFORMS = ['telegram', 'whatsapp', 'instagram', 'facebook', 'other'] as const

const igUrl = (handle: string) => `https://instagram.com/${handle.replace(/^@/, '')}`

export const cityChannelsRouter = router({
  // Admin → Cities: every city with a page, groups or a schedule.
  overview: adminProcedure.query(async ({ ctx }) => {
    const pages = await ctx.db.select({ citySlug: cityPages.citySlug, profileId: profiles.id, username: profiles.username, name: profiles.name })
      .from(cityPages).innerJoin(profiles, eq(profiles.id, cityPages.profileId))
    const groupRows = await ctx.db.select({
      citySlug: communityGroups.citySlug,
      kind: communityGroups.kind,
      status: communityGroups.status,
      linkStatus: communityGroups.linkStatus,
      n: sql<number>`count(*)::int`,
    }).from(communityGroups).groupBy(communityGroups.citySlug, communityGroups.kind, communityGroups.status, communityGroups.linkStatus)
    const lastSchedules = await ctx.db.selectDistinctOn([citySchedules.citySlug], {
      citySlug: citySchedules.citySlug, weekStart: citySchedules.weekStart,
      igPublishedAt: citySchedules.igPublishedAt, telegram: citySchedules.telegram,
    }).from(citySchedules).orderBy(citySchedules.citySlug, desc(citySchedules.weekStart))

    const profileIds = pages.map((p: any) => p.profileId)
    const team = profileIds.length
      ? await ctx.db.select({ profileId: profileMembers.profileId, dancerId: dancers.id, name: dancers.name, role: profileMembers.role })
        .from(profileMembers).innerJoin(dancers, eq(dancers.id, profileMembers.dancerId)).where(inArray(profileMembers.profileId, profileIds))
      : []
    const ig = profileIds.length
      ? await ctx.db.select({ profileId: instagramConnections.profileId, username: instagramConnections.igUsername, lastError: instagramConnections.lastError })
        .from(instagramConnections).where(inArray(instagramConnections.profileId, profileIds))
      : []
    const official = profileIds.length || groupRows.length
      ? await ctx.db.select({ id: communityGroups.id, citySlug: communityGroups.citySlug, name: communityGroups.name, platform: communityGroups.platform, inviteUrl: communityGroups.inviteUrl, telegramChatId: communityGroups.telegramChatId })
        .from(communityGroups).where(eq(communityGroups.kind, 'official'))
      : []

    const slugs = [...new Set([...pages.map((p: any) => p.citySlug), ...groupRows.map((g: any) => g.citySlug)])]
    const names = await cityNames(ctx.db, slugs)
    return slugs.map((slug) => {
      const page = pages.find((p: any) => p.citySlug === slug) ?? null
      const g = groupRows.filter((r: any) => r.citySlug === slug && r.kind !== 'official')
      const count = (f: (r: any) => boolean) => g.filter(f).reduce((n: number, r: any) => n + r.n, 0)
      const last = lastSchedules.find((s: any) => s.citySlug === slug) ?? null
      return {
        citySlug: slug,
        cityName: names.get(slug)!,
        page: page ? { username: page.username, name: page.name } : null,
        team: page ? team.filter((m: any) => m.profileId === page.profileId).map((m: any) => ({ dancerId: m.dancerId, name: m.name, role: m.role })) : [],
        instagram: page ? (ig.find((c: any) => c.profileId === page.profileId) ?? null) : null,
        channels: official.filter((c: any) => c.citySlug === slug),
        groups: {
          visible: count(r => r.status === 'visible' && r.linkStatus !== 'dead'),
          pending: count(r => r.status === 'pending'),
          dead: count(r => r.status === 'visible' && r.linkStatus === 'dead'),
          hidden: count(r => r.status === 'hidden'),
        },
        lastSchedule: last ? { weekStart: last.weekStart, instagram: !!last.igPublishedAt, telegram: (last.telegram ?? []).length > 0 } : null,
      }
    }).sort((a: any, b: any) => (b.page ? 1 : 0) - (a.page ? 1 : 0) || b.groups.visible - a.groups.visible || a.cityName.localeCompare(b.cityName))
  }),

  // Make a business page the city's page (or unset it with username = null).
  setCityPage: adminProcedure
    .input(z.object({ citySlug: z.string().trim().min(1).max(80), username: z.string().trim().min(1).max(60).nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (!input.username) {
        await ctx.db.delete(cityPages).where(eq(cityPages.citySlug, input.citySlug))
        return { citySlug: input.citySlug, page: null }
      }
      const handle = input.username.replace(/^@/, '').toLowerCase()
      const [found] = await ctx.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, handle)).limit(1)
      if (!found) throw new TRPCError({ code: 'NOT_FOUND', message: `There is no page @${handle}. Check the spelling, or click “Create @${cityPageHandle(input.citySlug)}” to make the city page.` })
      const p = await profileByHandle(ctx.db, handle)
      const other = await cityOfPage(ctx.db, p.id)
      if (other && other !== input.citySlug) throw new TRPCError({ code: 'CONFLICT', message: `@${p.username} already runs ${other}. Unset it there first.` })
      await ctx.db.insert(cityPages).values({ citySlug: input.citySlug, profileId: p.id, createdBy: ctx.dancerId })
        .onConflictDoUpdate({ target: cityPages.citySlug, set: { profileId: p.id, createdBy: ctx.dancerId, createdAt: new Date() } })
      // The page's own official channels move with it.
      await ctx.db.update(communityGroups).set({ profileId: p.id }).where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official')))
      return { citySlug: input.citySlug, page: { username: p.username, name: p.name } }
    }),

  // No page yet: create the city's own page (an organizer page "WeDance <City>",
  // @wedance<city> unless another handle is given, the admin as its owner) and make it the city page.
  createCityPage: adminProcedure
    .input(z.object({ citySlug: z.string().trim().toLowerCase().min(1).max(80), handle: z.string().trim().max(60).optional() }))
    .mutation(async ({ ctx, input }) => {
      const handle = (input.handle?.replace(/^@/, '').toLowerCase() || cityPageHandle(input.citySlug))
      const bad = handleError(handle)
      if (bad) throw new TRPCError({ code: 'BAD_REQUEST', message: bad })
      if (await handleTaken(ctx.db, handle)) throw new TRPCError({ code: 'CONFLICT', message: `@${handle} already exists. If it is the city’s page, use “Set page” instead.` })
      const existing = await cityPageOf(ctx.db, input.citySlug)
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: `${input.citySlug} already has a page: @${existing.username}.` })
      const cityName = (await cityNames(ctx.db, [input.citySlug])).get(input.citySlug)!
      const [p] = await ctx.db.insert(profiles).values({
        type: 'organizer', name: `WeDance ${cityName}`, username: handle, city: cityName, citySlug: input.citySlug, claimed: true, socials: [],
      }).returning({ id: profiles.id, username: profiles.username, name: profiles.name })
      await ctx.db.insert(profileMembers).values({ profileId: p!.id, dancerId: ctx.dancerId, role: 'owner' })
      await logAccess(ctx.db, { profileId: p!.id, actorId: ctx.dancerId, subjectId: ctx.dancerId, action: 'created', role: 'owner', note: `city page (${input.citySlug})` })
      await ctx.db.insert(cityPages).values({ citySlug: input.citySlug, profileId: p!.id, createdBy: ctx.dancerId })
      await ctx.db.update(communityGroups).set({ profileId: p!.id }).where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official')))
      trackServer(ctx, 'business_profile_created', { profile: p!.username, profile_type: 'organizer', ...profileGroup(p!.username) })
      return { citySlug: input.citySlug, page: { username: p!.username, name: p!.name } }
    }),

  // Add a city admin: someone on the city page's team (editor by default).
  addAdmin: adminProcedure
    .input(z.object({ citySlug: z.string().min(1), who: z.string().trim().min(1).max(200), role: z.enum(['owner', 'editor']).default('editor') }))
    .mutation(async ({ ctx, input }) => {
      const page = await cityPageOf(ctx.db, input.citySlug)
      if (!page) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Pick the city’s WeDance page first.' })
      const who = input.who.replace(/^@/, '').toLowerCase()
      const [d] = await ctx.db.select({ id: dancers.id, name: dancers.name }).from(dancers)
        .where(sql`lower(${dancers.email}) = ${who} or lower(${dancers.username}) = ${who}`).limit(1)
      if (!d) throw new TRPCError({ code: 'NOT_FOUND', message: 'No user with that email or @handle.' })
      // Already on the team: never demote an owner here.
      const current = await membershipOf(ctx.db, page.id, d.id)
      if (current && (current.role === input.role || current.role === 'owner')) return { name: d.name, role: current.role, already: true }
      await grant(ctx.db, page.id, d.id, input.role, { by: ctx.dancerId })
      await logAccess(ctx.db, { profileId: page.id, actorId: ctx.dancerId, subjectId: d.id, action: 'approved', role: input.role, note: `city admin (${input.citySlug})` })
      trackServer(ctx, 'city_admin_added', { city: input.citySlug, role: input.role, ...profileGroup(page.username) })
      return { name: d.name, role: input.role, already: false }
    }),

  // The cities I run (Business home, the city page tools).
  mine: protectedProcedure.query(async ({ ctx }) => {
    const slugs = ctx.isAdmin
      ? (await ctx.db.select({ citySlug: cityPages.citySlug }).from(cityPages)).map((r: any) => r.citySlug)
      : await citiesManagedBy(ctx.db, ctx.dancerId)
    if (!slugs.length) return []
    const names = await cityNames(ctx.db, slugs)
    const rows = await ctx.db.select({ citySlug: cityPages.citySlug, username: profiles.username, name: profiles.name })
      .from(cityPages).innerJoin(profiles, eq(profiles.id, cityPages.profileId)).where(inArray(cityPages.citySlug, slugs))
    return rows.map((r: any) => ({ citySlug: r.citySlug, cityName: names.get(r.citySlug)!, username: r.username, name: r.name }))
  }),

  // Is this business page a city page (and may I run it)? For the page editor's card.
  forPage: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const p = await profileByHandle(ctx.db, input.username)
      const citySlug = await cityOfPage(ctx.db, p.id)
      if (!citySlug) return null
      try { await requireCityAdmin(ctx as any, citySlug) } catch { return null }
      return { citySlug, cityName: (await cityNames(ctx.db, [citySlug])).get(citySlug)! }
    }),

  // The city's official channels, for its admins.
  channels: protectedProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      const rows = await ctx.db.select().from(communityGroups)
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official')))
        .orderBy(communityGroups.createdAt)
      const [ig] = page ? await ctx.db.select({ username: instagramConnections.igUsername, lastError: instagramConnections.lastError }).from(instagramConnections).where(eq(instagramConnections.profileId, page.id)) : []
      return {
        cityName: (await cityNames(ctx.db, [input.citySlug])).get(input.citySlug)!,
        page: page ? { username: page.username, name: page.name } : null,
        instagram: ig ?? null,
        telegramConfigured: telegramConfigured(),
        channels: rows.map((r: any) => ({ id: r.id, name: r.name, platform: r.platform, inviteUrl: r.inviteUrl, telegramChatId: r.telegramChatId, description: r.description })),
      }
    }),

  saveChannel: protectedProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      id: z.string().uuid().optional(),
      platform: z.enum(OFFICIAL_PLATFORMS),
      name: z.string().trim().min(1).max(120),
      inviteUrl: z.string().trim().url().max(500),
      telegramChatId: z.string().trim().max(80).optional().nullable(),
      description: z.string().trim().max(300).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      const bad = inviteUrlError(input.platform, input.inviteUrl)
      if (bad) throw new TRPCError({ code: 'BAD_REQUEST', message: bad })
      const key = inviteKey(input.inviteUrl)
      const chatId = input.platform === 'telegram' ? (input.telegramChatId?.trim() || telegramNameOf(input.inviteUrl)) : null
      if (chatId && !/^(@[a-z][a-z0-9_]{3,}|-?\d{5,})$/i.test(chatId)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The chat id is the channel’s @name or its number (-100…).' })
      const values = {
        citySlug: input.citySlug, name: input.name, platform: input.platform, inviteUrl: input.inviteUrl, inviteKey: key,
        telegramChatId: chatId, description: input.description || null, kind: 'official' as const, profileId: page?.id ?? null,
        verified: true, status: 'visible' as const,
      }
      // One row per group: an existing community listing of the same link becomes official.
      const [same] = key ? await ctx.db.select({ id: communityGroups.id }).from(communityGroups).where(eq(communityGroups.inviteKey, key)) : []
      const id = input.id ?? same?.id
      if (input.id && same && same.id !== input.id) throw new TRPCError({ code: 'CONFLICT', message: 'That link is already listed as another channel.' })
      if (id) {
        const [row] = await ctx.db.update(communityGroups).set(values)
          .where(and(eq(communityGroups.id, id), eq(communityGroups.citySlug, input.citySlug))).returning({ id: communityGroups.id })
        if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found.' })
        return { id: row.id }
      }
      const [row] = await ctx.db.insert(communityGroups).values({ ...values, source: 'city-admin', submittedBy: ctx.dancerId }).returning({ id: communityGroups.id })
      return { id: row!.id }
    }),

  removeChannel: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [g] = await ctx.db.select().from(communityGroups).where(eq(communityGroups.id, input.id))
      if (!g || g.kind !== 'official') throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found.' })
      await requireCityAdmin(ctx as any, g.citySlug)
      await ctx.db.delete(communityGroups).where(eq(communityGroups.id, input.id))
      return { removed: true }
    }),

  // Can the WeDance bot post in this Telegram channel?
  checkTelegram: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [g] = await ctx.db.select().from(communityGroups).where(eq(communityGroups.id, input.id))
      if (!g || g.kind !== 'official' || g.platform !== 'telegram') throw new TRPCError({ code: 'NOT_FOUND', message: 'Telegram channel not found.' })
      await requireCityAdmin(ctx as any, g.citySlug)
      if (!g.telegramChatId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Add the channel’s @name or chat id first.' })
      try {
        const r = await checkChat(g.telegramChatId)
        return { ok: r.canPost, title: r.chat.title ?? null, bot: r.bot, message: r.canPost ? `@${r.bot} can post in “${r.chat.title ?? g.name}”.` : `@${r.bot} is in “${r.chat.title ?? g.name}” but can’t post. Make it an administrator allowed to post messages.` }
      } catch (e: any) {
        return { ok: false, title: null, bot: null, message: e instanceof TelegramError ? e.message : 'Telegram didn’t answer. Try again.' }
      }
    }),

  // Public: the city's own WeDance channels, for the city page ("Follow WeDance Munich").
  official: publicProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const page = await cityPageOf(ctx.db, input.citySlug)
      const rows = await ctx.db.select({ id: communityGroups.id, name: communityGroups.name, platform: communityGroups.platform, inviteUrl: communityGroups.inviteUrl, description: communityGroups.description })
        .from(communityGroups)
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official'), eq(communityGroups.status, 'visible')))
        .orderBy(communityGroups.createdAt)
      let channels = rows
      if (page && !rows.some((r: any) => r.platform === 'instagram')) {
        // The connected (or linked) Instagram of the city page counts as a channel.
        const [ig] = await ctx.db.select({ username: instagramConnections.igUsername }).from(instagramConnections).where(eq(instagramConnections.profileId, page.id))
        const linked = (page.socials ?? []).find((s: any) => s.platform?.toLowerCase() === 'instagram')?.url
        const url = ig ? igUrl(ig.username) : linked
        if (url) channels = [{ id: `ig-${page.id}`, name: ig ? `@${ig.username}` : page.name, platform: 'instagram', inviteUrl: url, description: null }, ...rows]
      }
      if (!page && !channels.length) return null
      return { page: page ? { username: page.username, name: page.name, photo: page.photo } : null, channels }
    }),
})
