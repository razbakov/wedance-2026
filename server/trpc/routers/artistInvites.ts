import { z } from 'zod'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { profiles, profileMembers, profileSuggestions, profileInvites, events } from '../../database/schema'
import { requireEventManager } from './businessEvents'
import { grant, logAccess } from '../../utils/profileAccess'
import { instagramUrl, parseInstagramHandle } from '../../../shared/utils/instagram'
import { videoEmbedUrl } from '../../../shared/utils/video'

/**
 * Artist confirmation. An organizer's photo, video or name for an artist in
 * their line-up is a pending suggestion on the artist's profile (the event
 * uses it right away). The organizer copies a personal link for each artist;
 * the artist opens it, approves or changes what's there, adds more — and, when
 * nobody owns the page yet, creates an account and owns it.
 *
 * Who may answer: anyone with the link while the page has no owner (the link
 * is the invitation); once someone manages the page, only its team, signed in.
 */

type Kind = 'photo' | 'video' | 'name'
const token = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)

async function isMember(db: any, profileId: string, dancerId: string | null) {
  if (!dancerId) return false
  const [m] = await db.select({ id: profileMembers.id }).from(profileMembers)
    .where(and(eq(profileMembers.profileId, profileId), eq(profileMembers.dancerId, dancerId)))
  return !!m
}
async function hasTeam(db: any, profileId: string) {
  const [m] = await db.select({ id: profileMembers.id }).from(profileMembers).where(eq(profileMembers.profileId, profileId)).limit(1)
  return !!m
}

/** Approving a suggestion: what it changes on the profile. */
async function apply(db: any, p: any, kind: Kind, value: string) {
  if (kind === 'name') return db.update(profiles).set({ name: value }).where(eq(profiles.id, p.id))
  if (kind === 'photo') {
    const photos = [...(p.photos ?? [])]
    if (!photos.some((x: any) => x.url === value)) photos.push({ url: value })
    return db.update(profiles).set({ photos, ...(p.photo ? {} : { photo: value }) }).where(eq(profiles.id, p.id))
  }
  const videos = [...(p.videos ?? [])]
  if (!videos.some((x: any) => x.url === value)) videos.push({ url: value })
  return db.update(profiles).set({ videos }).where(eq(profiles.id, p.id))
}

/** The page an invite (or a member, by handle) opens, and whether the viewer may answer. */
async function resolve(ctx: any, input: { token?: string; username?: string }) {
  let invite: any = null
  let p: any
  if (input.token) {
    ;[invite] = await ctx.db.select().from(profileInvites).where(eq(profileInvites.token, input.token))
    if (!invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'This link doesn’t work any more. Ask the organizer for a new one.' })
    ;[p] = await ctx.db.select().from(profiles).where(eq(profiles.id, invite.profileId))
  } else if (input.username) {
    ;[p] = await ctx.db.select().from(profiles).where(eq(profiles.username, input.username))
  }
  if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
  const managed = await hasTeam(ctx.db, p.id)
  const member = await isMember(ctx.db, p.id, ctx.dancerId)
  if (!input.token && !member && !ctx.isAdmin) throw new TRPCError({ code: 'FORBIDDEN', message: 'You don’t manage this profile.' })
  return { invite, p, managed, member, canAnswer: !managed || member || !!ctx.isAdmin }
}

const videoUrl = z.string().trim().max(300).transform((v, c) => {
  const e = videoEmbedUrl(v)
  if (!e) c.addIssue({ code: 'custom', message: 'Paste a YouTube or Vimeo link.' })
  return e ?? ''
})

export const artistInvitesRouter = router({
  // The organizer suggests a photo, video or name for an artist in their line-up.
  // On a page they manage themselves it applies straight away.
  suggest: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      handle: z.string().min(1).max(200),
      kind: z.enum(['photo', 'video', 'name']),
      value: z.string().trim().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      const [p] = await ctx.db.select().from(profiles).where(eq(profiles.username, input.handle))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'That artist isn’t on WeDance.' })
      let value = input.value
      if (input.kind === 'video') {
        const e = videoEmbedUrl(value)
        if (!e) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Paste a YouTube or Vimeo link.' })
        value = e
      }
      if (input.kind === 'name' && value === p.name) return { status: 'same' as const }
      if (await isMember(ctx.db, p.id, ctx.dancerId)) {
        await apply(ctx.db, p, input.kind, value)
        return { status: 'applied' as const }
      }
      // A newer name replaces an older pending one.
      if (input.kind === 'name') {
        await ctx.db.update(profileSuggestions).set({ status: 'rejected', decidedAt: new Date() })
          .where(and(eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.kind, 'name'), eq(profileSuggestions.status, 'pending')))
      }
      await ctx.db.insert(profileSuggestions)
        .values({ profileId: p.id, kind: input.kind, value, eventId: input.eventId, suggestedBy: ctx.dancerId })
        .onConflictDoNothing()
      return { status: 'pending' as const }
    }),

  // Pending suggestions per artist in an event's line-up, for the editor's chips.
  pending: protectedProcedure
    .input(z.object({ eventId: z.string().uuid(), handles: z.array(z.string().min(1).max(200)).max(60) }))
    .query(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      if (!input.handles.length) return {}
      const rows = await ctx.db.select({ username: profiles.username, kind: profileSuggestions.kind, value: profileSuggestions.value })
        .from(profileSuggestions).innerJoin(profiles, eq(profiles.id, profileSuggestions.profileId))
        .where(and(inArray(profiles.username, input.handles), eq(profileSuggestions.status, 'pending')))
      const out: Record<string, { photos: string[]; videos: string[]; name: string | null }> = {}
      for (const r of rows) {
        const o = (out[r.username] ??= { photos: [], videos: [], name: null })
        if (r.kind === 'name') o.name = r.value
        else (r.kind === 'photo' ? o.photos : o.videos).push(r.value)
      }
      return out
    }),

  // The personal link for an artist in this event's line-up (the same one each time).
  link: protectedProcedure
    .input(z.object({ eventId: z.string().uuid(), handle: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      const [p] = await ctx.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.username, input.handle))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'That artist isn’t on WeDance.' })
      const [existing] = await ctx.db.select({ token: profileInvites.token }).from(profileInvites)
        .where(and(eq(profileInvites.eventId, input.eventId), eq(profileInvites.profileId, p.id)))
      const t = existing?.token ?? token()
      if (!existing) await ctx.db.insert(profileInvites).values({ token: t, profileId: p.id, eventId: input.eventId, createdBy: ctx.dancerId })
      const site = (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
      return { url: `${site}/confirm/${t}` }
    }),

  // What the confirmation page shows.
  get: publicProcedure
    .input(z.object({ token: z.string().min(10).max(80).optional(), username: z.string().min(1).max(200).optional() }))
    .query(async ({ ctx, input }) => {
      const { invite, p, managed, member, canAnswer } = await resolve(ctx, input)
      const pending = await ctx.db.select({
        id: profileSuggestions.id, kind: profileSuggestions.kind, value: profileSuggestions.value,
        eventName: events.name, eventId: profileSuggestions.eventId,
      }).from(profileSuggestions).leftJoin(events, eq(events.id, profileSuggestions.eventId))
        .where(and(eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.status, 'pending')))
        .orderBy(desc(profileSuggestions.createdAt))
      let event: { name: string; startDate: Date | null; timezone: string | null; host: string | null } | null = null
      if (invite?.eventId) {
        const [e] = await ctx.db.select({ name: events.name, startDate: events.startDate, timezone: events.timezone, hostProfileId: events.hostProfileId, organizerName: events.organizerName })
          .from(events).where(eq(events.id, invite.eventId))
        const [h] = e?.hostProfileId ? await ctx.db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, e.hostProfileId)) : [null]
        if (e) event = { name: e.name ?? '', startDate: e.startDate, timezone: e.timezone, host: h?.name ?? e.organizerName ?? null }
      }
      if (invite) await ctx.db.update(profileInvites).set({ lastUsedAt: new Date() }).where(eq(profileInvites.id, invite.id))
      return {
        profile: {
          username: p.username, name: p.name, type: p.type, photo: p.photo, photos: (p.photos ?? []) as { url: string }[],
          videos: (p.videos ?? []) as { url: string }[], bio: p.bio ?? '', styles: (p.styles ?? []) as string[],
          instagram: ((p.socials ?? []) as any[]).find(s => s.platform === 'instagram')?.url ?? '',
        },
        pending, event, managed, member, canAnswer, signedIn: !!ctx.dancerId,
      }
    }),

  // The artist's answer: approve or turn down each suggestion, and their own edits.
  respond: publicProcedure
    .input(z.object({
      token: z.string().min(10).max(80).optional(),
      username: z.string().min(1).max(200).optional(),
      decisions: z.array(z.object({ id: z.string().uuid(), approve: z.boolean() })).max(100).default([]),
      name: z.string().trim().min(1).max(120).optional(),
      bio: z.string().trim().max(2000).optional(),
      instagram: z.string().trim().max(300).optional(),
      addPhotos: z.array(z.string().url()).max(20).default([]),
      addVideos: z.array(videoUrl).max(10).default([]),
      // Photos already on the page may be site paths ("/people/silvio.jpg"), not URLs.
      removePhotos: z.array(z.string().min(1).max(500)).max(50).default([]),
      mainPhoto: z.string().min(1).max(500).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { p: profile, canAnswer } = await resolve(ctx, input)
      if (!canAnswer) throw new TRPCError({ code: 'FORBIDDEN', message: 'This page has an owner now. Sign in as them to answer.' })
      let p = profile
      const reload = async () => { [p] = await ctx.db.select().from(profiles).where(eq(profiles.id, profile.id)) }
      const ids = input.decisions.map(d => d.id)
      const rows = ids.length ? await ctx.db.select().from(profileSuggestions)
        .where(and(inArray(profileSuggestions.id, ids), eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.status, 'pending'))) : []
      for (const s of rows) {
        const approve = input.decisions.find(d => d.id === s.id)!.approve
        if (approve) { await apply(ctx.db, p, s.kind, s.value); await reload() }
        await ctx.db.update(profileSuggestions).set({ status: approve ? 'approved' : 'rejected', decidedAt: new Date() }).where(eq(profileSuggestions.id, s.id))
      }
      for (const url of input.addPhotos) { await apply(ctx.db, p, 'photo', url); await reload() }
      for (const url of input.addVideos.filter(Boolean)) { await apply(ctx.db, p, 'video', url); await reload() }
      const set: Record<string, unknown> = {}
      if (input.name && input.name !== p.name) set.name = input.name
      if (input.bio !== undefined) set.bio = input.bio || null
      if (input.instagram !== undefined) {
        const ig = parseInstagramHandle(input.instagram)
        const others = ((p.socials ?? []) as any[]).filter(s => s.platform !== 'instagram')
        set.socials = ig ? [...others, { platform: 'instagram', url: instagramUrl(ig) }] : others
      }
      if (input.removePhotos.length) {
        const photos = (p.photos ?? []).filter((x: any) => !input.removePhotos.includes(x.url))
        set.photos = photos
        if (input.removePhotos.includes(p.photo)) set.photo = photos[0]?.url ?? null
      }
      if (input.mainPhoto) set.photo = input.mainPhoto
      if (Object.keys(set).length) await ctx.db.update(profiles).set(set).where(eq(profiles.id, p.id))
      return { saved: true }
    }),

  // After answering: create an account (auth.register) and own the page — only
  // while nobody does; otherwise the usual claim (/business/claim).
  claim: protectedProcedure
    .input(z.object({ token: z.string().min(10).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const { p, invite } = await resolve(ctx, input)
      if (await hasTeam(ctx.db, p.id)) {
        if (await isMember(ctx.db, p.id, ctx.dancerId)) return { username: p.username, owner: true }
        throw new TRPCError({ code: 'CONFLICT', message: 'Someone already manages this page. Ask them to add you to the team.' })
      }
      await grant(ctx.db, p.id, ctx.dancerId, 'owner', { by: invite?.createdBy ?? null })
      await logAccess(ctx.db, { profileId: p.id, actorId: ctx.dancerId, subjectId: ctx.dancerId, action: 'approved', role: 'owner', note: 'Took over the page through an organizer’s invite link.' })
      return { username: p.username, owner: true }
    }),
})
