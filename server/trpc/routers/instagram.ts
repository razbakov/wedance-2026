import { z } from 'zod'
import { eq, and, isNotNull, inArray, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { eventPosts, eventFlyers, instagramConnections, profiles, profileMembers } from '../../database/schema'
import { requireOwner, requireProfileRole, profileByHandle, isProfileGranted } from '../../utils/profileAccess'
import { requireEventManager } from './businessEvents'
import { instagramConfigured, instagramRedirectUri } from '../../utils/meta/config'
import { instagramLoginUrl, publishImage, MetaError } from '../../utils/meta/graph'
import { signConnectState, connectionWithToken, publicConnection, noteError } from '../../utils/meta/instagramConnection'
import { eventGroup, profileGroup, trackServer } from '../../utils/posthog'

/**
 * Connect Instagram (#501) — a business page's Instagram professional account,
 * through WeDance's official Meta app (Unified login). Owners connect and
 * disconnect; anyone who manages an event can publish its content-plan posts
 * to the account of the page that runs it. Nothing is ever posted without a
 * click: publishing is one post per call, from the web only (not connected apps).
 */
const site = () => (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')

/** Instagram wants a JPEG: ask Cloudinary for one (the flyers are PNGs). */
export function jpegUrl(url: string): string {
  return url.replace(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?!f_jpg)/, '$1f_jpg,q_90/')
}

/** The caption Instagram gets: the post's own, or the event's for the flyer. */
function captionText(p: any, ev: any): string {
  const c = p.kind === 'announcement' ? (ev.caption ?? p.caption) : p.caption
  return (c?.text ?? '').slice(0, 2200)
}

/** The page whose Instagram an event posts from: the host, else organiser, else venue — the first one connected. */
async function postingConnection(ctx: any, ev: any) {
  const handles = [ev.organizerUsername, ev.venueUsername].filter(Boolean) as string[]
  const pages = handles.length || ev.hostProfileId
    ? await ctx.db.select({ id: profiles.id, username: profiles.username }).from(profiles)
      .where(ev.hostProfileId ? eq(profiles.id, ev.hostProfileId) : inArray(profiles.username, handles))
    : []
  const order = (p: any) => (p.id === ev.hostProfileId ? 0 : p.username === ev.organizerUsername ? 1 : 2)
  pages.sort((a: any, b: any) => order(a) - order(b))
  for (const page of pages) {
    if (!isProfileGranted(ctx, page.id)) continue
    const c = await connectionWithToken(ctx.db, page.id)
    if (c) return { page, c }
  }
  return { page: pages[0] ?? null, c: null }
}

export const instagramRouter = router({
  // The page editor's Instagram card.
  status: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const p = await profileByHandle(ctx.db, input.username)
      await requireProfileRole(ctx as any, p.id, 'editor')
      const [c] = await ctx.db.select().from(instagramConnections).where(eq(instagramConnections.profileId, p.id))
      const [m] = await ctx.db.select({ role: profileMembers.role }).from(profileMembers)
        .where(and(eq(profileMembers.profileId, p.id), eq(profileMembers.dancerId, ctx.dancerId)))
      return { configured: instagramConfigured(), connection: publicConnection(c), canManage: !!ctx.isAdmin || m?.role === 'owner' }
    }),

  // Where "Connect Instagram" sends the owner: Meta's dialog with a signed state.
  connectUrl: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.scopes) throw new TRPCError({ code: 'FORBIDDEN', message: 'Connect Instagram on WeDance itself (Business → your page).' })
      if (!instagramConfigured()) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Instagram isn’t switched on yet. Try again soon.' })
      const p = await requireOwner(ctx as any, input.username)
      const state = signConnectState({ profileId: p.id, dancerId: ctx.dancerId, username: p.username })
      return { url: instagramLoginUrl(instagramRedirectUri(site()), state) }
    }),

  disconnect: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const p = await requireOwner(ctx as any, input.username)
      const [gone] = await ctx.db.delete(instagramConnections).where(eq(instagramConnections.profileId, p.id)).returning({ username: instagramConnections.igUsername })
      if (gone) trackServer(ctx, 'instagram_disconnected', { profile: p.username, profile_type: p.type, ...profileGroup(p.username) })
      return { disconnected: !!gone }
    }),

  // Which account an event's posts would go to (the content plan's button).
  forEvent: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const ev = await requireEventManager(ctx as any, input.eventId)
      const { page, c } = await postingConnection(ctx, ev)
      return { page: page?.username ?? null, account: c ? c.igUsername : null }
    }),

  // Publish one content-plan post: its kept flyer and caption, now.
  publishPost: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.scopes) throw new TRPCError({ code: 'FORBIDDEN', message: 'Publish to Instagram from WeDance itself, after looking at the post.' })
      const [p] = await ctx.db.select().from(eventPosts).where(eq(eventPosts.id, input.postId))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found.' })
      const ev = await requireEventManager(ctx as any, p.eventId)
      if (p.igMediaId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This post is already on Instagram.' })
      const [flyer] = await ctx.db.select({ url: eventFlyers.url }).from(eventFlyers)
        .where(and(eq(eventFlyers.postId, p.id), isNotNull(eventFlyers.keptAt))).orderBy(desc(eventFlyers.keptAt)).limit(1)
      if (!flyer?.url) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Make and keep the picture for this post first.' })
      const story = p.format === 'story'
      const caption = captionText(p, ev)
      if (!story && !caption) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Write the caption first.' })
      const { page, c } = await postingConnection(ctx, ev)
      if (!c) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: page ? `Connect Instagram on @${page.username} first (Business → @${page.username}).` : 'This event has no page to post from.' })

      try {
        const r = await publishImage(c.token, c.igUserId, { imageUrl: jpegUrl(flyer.url), caption, story })
        await ctx.db.update(eventPosts).set({ status: 'posted', igMediaId: r.mediaId, igPermalink: r.permalink, publishedAt: new Date(), publishError: null, updatedAt: new Date() }).where(eq(eventPosts.id, p.id))
        trackServer(ctx, 'instagram_post_published', { event_id: ev.id, post_kind: p.kind, format: p.format, profile: page?.username, ...eventGroup(ev) })
        return { permalink: r.permalink, account: c.igUsername }
      } catch (e: any) {
        const message = e instanceof MetaError ? e.message : 'Instagram didn’t take the post. Try again.'
        await ctx.db.update(eventPosts).set({ publishError: message.slice(0, 500), updatedAt: new Date() }).where(eq(eventPosts.id, p.id))
        // A revoked or broken connection shows on the page's Instagram card.
        if (e instanceof MetaError && (e.code === 190 || e.code === 10 || e.code === 200)) await noteError(ctx.db, c.profileId, message)
        throw new TRPCError({ code: 'BAD_REQUEST', message })
      }
    }),
})
