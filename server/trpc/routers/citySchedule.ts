import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, asc, eq, gte, isNotNull, lt } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { citySchedules, communityGroups, events } from '../../database/schema'
import { cityNames, requireCityAdmin } from '../../utils/cityAccess'
import { connectionWithToken, noteError } from '../../utils/meta/instagramConnection'
import { publishImage, MetaError } from '../../utils/meta/graph'
import { instagramImageUrl } from '../../utils/meta/image'
import { scheduleSvg, uploadScheduleImage } from '../../utils/scheduleImage'
import { messageUrl, postPhotoWithText, telegramConfigured, TelegramError } from '../../utils/telegram'
import {
  buildScheduleText, defaultWeekStart, INSTAGRAM_CAPTION_MAX, isWeekStart, pickedByDefault,
  scheduleDays, scheduleImageKey, SCHEDULE_TZ, weekLabel, weekRange, type ScheduleEvent,
} from '../../../shared/utils/citySchedule'
import { profileGroup, trackServer } from '../../utils/posthog'

/**
 * The weekly city schedule (city channels, migration 0067) — what replaced the weekly
 * Telegram DM that was copied into @wedancemunich by hand.
 *
 * A city admin opens the week: every live event of the city that week is listed, the
 * nights out picked (not weekly courses), and the text written from them. They change
 * the picks or the text, draw the picture, then post — to the city page's Instagram
 * (feed or story, #501 connection) and to its official Telegram channels (the WeDance
 * bot). Each destination once per week; nothing is posted without a click.
 */
const site = () => (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
const cityLink = (citySlug: string) => `${site()}/cities/${citySlug}`

const weekInput = z.object({
  citySlug: z.string().min(1).max(80),
  weekStart: z.string().refine(isWeekStart, 'Pick the Monday of a week.'),
})

async function weekEvents(db: any, citySlug: string, weekStart: string): Promise<(ScheduleEvent & { organizerName: string | null; styles: string[] })[]> {
  const { from, to } = weekRange(weekStart, SCHEDULE_TZ)
  return db.select({
    id: events.id, name: events.name, type: events.type, startDate: events.startDate, timezone: events.timezone,
    venueName: events.venueName, organizerName: events.organizerName, styles: events.styles,
  }).from(events)
    .where(and(eq(events.citySlug, citySlug), eq(events.published, true), eq(events.archived, false), isNotNull(events.startDate), gte(events.startDate, from), lt(events.startDate, to)))
    .orderBy(asc(events.startDate))
}

async function scheduleRow(db: any, citySlug: string, weekStart: string) {
  const [row] = await db.select().from(citySchedules).where(and(eq(citySchedules.citySlug, citySlug), eq(citySchedules.weekStart, weekStart)))
  return row ?? null
}

/** The week as it stands: the events, the picks (saved, else the default), the text and picture state. */
async function loadWeek(ctx: any, citySlug: string, weekStart: string) {
  const cityName = (await cityNames(ctx.db, [citySlug])).get(citySlug)!
  const all = await weekEvents(ctx.db, citySlug, weekStart)
  const row = await scheduleRow(ctx.db, citySlug, weekStart)
  // Default: the nights out still ahead (opened mid-week, the past days stay unpicked).
  const now = Date.now()
  const pickedIds = new Set<string>(row ? row.eventIds : all.filter(e => pickedByDefault(e) && new Date(e.startDate as any).getTime() >= now).map(e => e.id))
  const picked = all.filter(e => pickedIds.has(e.id))
  const generated = buildScheduleText({ cityName, weekStart, events: picked, link: cityLink(citySlug) })
  const text = row?.textEdited ? row.text : generated
  const imageKey = scheduleImageKey({ cityName, weekStart, events: picked })
  return { cityName, all, row, picked, pickedIds, text, generated, imageKey }
}

/** Save (or create) the week's row. */
async function upsert(ctx: any, citySlug: string, weekStart: string, set: Record<string, unknown>) {
  const now = new Date()
  const [row] = await ctx.db.insert(citySchedules)
    .values({ citySlug, weekStart, createdBy: ctx.dancerId, updatedBy: ctx.dancerId, ...set })
    .onConflictDoUpdate({ target: [citySchedules.citySlug, citySchedules.weekStart], set: { ...set, updatedBy: ctx.dancerId, updatedAt: now } })
    .returning()
  return row
}

function noApps(ctx: any) {
  if (ctx.scopes) throw new TRPCError({ code: 'FORBIDDEN', message: 'Post the city schedule from WeDance itself, after looking at it.' })
}

export const cityScheduleRouter = router({
  get: protectedProcedure
    .input(z.object({ citySlug: z.string().min(1).max(80), weekStart: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      const weekStart = input.weekStart && isWeekStart(input.weekStart) ? input.weekStart : defaultWeekStart(new Date(), SCHEDULE_TZ)
      const w = await loadWeek(ctx, input.citySlug, weekStart)
      const ig = page ? await connectionWithToken(ctx.db, page.id).catch(() => null) : null
      const telegram = await ctx.db.select({ id: communityGroups.id, name: communityGroups.name, chatId: communityGroups.telegramChatId }).from(communityGroups)
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official'), eq(communityGroups.platform, 'telegram'), isNotNull(communityGroups.telegramChatId)))
      return {
        citySlug: input.citySlug,
        cityName: w.cityName,
        page: page ? { username: page.username, name: page.name } : null,
        weekStart,
        weekLabel: weekLabel(weekStart),
        events: w.all.map(e => ({ ...e, picked: w.pickedIds.has(e.id), course: !pickedByDefault(e) })),
        text: w.text,
        textEdited: !!w.row?.textEdited,
        generatedText: w.generated,
        saved: !!w.row,
        image: w.row?.imageUrl ? { url: w.row.imageUrl, stale: w.row.imageKey !== w.imageKey } : null,
        posted: {
          feed: w.row?.igPublishedAt ? { at: w.row.igPublishedAt, permalink: w.row.igPermalink } : null,
          story: w.row?.igStoryPublishedAt ? { at: w.row.igStoryPublishedAt } : null,
          telegram: w.row?.telegram ?? [],
        },
        publishError: w.row?.publishError ?? null,
        targets: {
          instagram: ig ? ig.igUsername : null,
          telegram: telegram.map((t: any) => ({ id: t.id, name: t.name, chatId: t.chatId })),
          telegramConfigured: telegramConfigured(),
        },
      }
    }),

  // Picks and/or text. text: null goes back to the generated text.
  save: protectedProcedure
    .input(weekInput.extend({ eventIds: z.array(z.string().uuid()).max(500).optional(), text: z.string().max(6000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireCityAdmin(ctx as any, input.citySlug)
      const w = await loadWeek(ctx, input.citySlug, input.weekStart)
      const known = new Set(w.all.map(e => e.id))
      const eventIds = input.eventIds ? input.eventIds.filter(id => known.has(id)) : [...w.pickedIds]
      const set: Record<string, unknown> = { eventIds }
      if (input.text === null) Object.assign(set, { text: '', textEdited: false })
      else if (typeof input.text === 'string' && input.text.trim() !== w.generated.trim()) Object.assign(set, { text: input.text, textEdited: true })
      else if (typeof input.text === 'string') Object.assign(set, { text: '', textEdited: false })
      await upsert(ctx, input.citySlug, input.weekStart, set)
      return { ok: true }
    }),

  // Draw (or redraw) the picture from the picked events.
  drawImage: protectedProcedure
    .input(weekInput)
    .mutation(async ({ ctx, input }) => {
      await requireCityAdmin(ctx as any, input.citySlug)
      const w = await loadWeek(ctx, input.citySlug, input.weekStart)
      if (!w.picked.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick at least one event first.' })
      const svg = scheduleSvg({ cityName: w.cityName, weekLabel: weekLabel(input.weekStart), days: scheduleDays(w.picked, SCHEDULE_TZ), footer: `wedance.vip · ${w.cityName}` })
      const url = await uploadScheduleImage(svg, `${input.citySlug}-${input.weekStart}`)
      await upsert(ctx, input.citySlug, input.weekStart, { eventIds: [...w.pickedIds], imageUrl: url, imageKey: w.imageKey })
      return { url }
    }),

  // Post to the city page's Instagram: the feed (picture + text) or a story (picture).
  publishInstagram: protectedProcedure
    .input(weekInput.extend({ to: z.enum(['feed', 'story']) }))
    .mutation(async ({ ctx, input }) => {
      noApps(ctx)
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      if (!page) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This city has no WeDance page yet.' })
      const w = await loadWeek(ctx, input.citySlug, input.weekStart)
      const story = input.to === 'story'
      if (story ? w.row?.igStoryMediaId : w.row?.igMediaId) throw new TRPCError({ code: 'BAD_REQUEST', message: story ? 'This week is already in the story.' : 'This week is already on the feed.' })
      if (!w.row?.imageUrl) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draw the picture first.' })
      if (w.row.imageKey !== w.imageKey) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The events changed since the picture was drawn. Redraw it first.' })
      const c = await connectionWithToken(ctx.db, page.id)
      if (!c) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: `Connect Instagram on @${page.username} first.` })
      try {
        const r = await publishImage(c.token, c.igUserId, {
          imageUrl: instagramImageUrl(w.row.imageUrl, { width: 1080, height: 1350 }, input.to),
          caption: w.text.slice(0, INSTAGRAM_CAPTION_MAX),
          story,
        })
        const now = new Date()
        await upsert(ctx, input.citySlug, input.weekStart, story
          ? { igStoryMediaId: r.mediaId, igStoryPublishedAt: now, publishError: null }
          : { igMediaId: r.mediaId, igPermalink: r.permalink, igPublishedAt: now, publishError: null })
        trackServer(ctx, 'city_schedule_published', { city: input.citySlug, to: story ? 'instagram_story' : 'instagram_feed', events: w.picked.length, ...profileGroup(page.username) })
        return { permalink: r.permalink, account: c.igUsername }
      } catch (e: any) {
        const message = e instanceof MetaError ? e.message : 'Instagram didn’t take the post. Try again.'
        await upsert(ctx, input.citySlug, input.weekStart, { publishError: message.slice(0, 500) })
        if (e instanceof MetaError && (e.code === 190 || e.code === 10 || e.code === 200)) await noteError(ctx.db, page.id, message)
        throw new TRPCError({ code: 'BAD_REQUEST', message })
      }
    }),

  // Post to the city's official Telegram channels (all of them, or one), each once a week.
  publishTelegram: protectedProcedure
    .input(weekInput.extend({ channelId: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      noApps(ctx)
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      if (!telegramConfigured()) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'The WeDance Telegram bot isn’t set up yet (TELEGRAM_BOT_TOKEN).' })
      const w = await loadWeek(ctx, input.citySlug, input.weekStart)
      if (!w.picked.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick at least one event first.' })
      const imageFresh = w.row?.imageUrl && w.row.imageKey === w.imageKey ? w.row.imageUrl : null
      const chans = await ctx.db.select({ id: communityGroups.id, name: communityGroups.name, chatId: communityGroups.telegramChatId }).from(communityGroups)
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official'), eq(communityGroups.platform, 'telegram'), isNotNull(communityGroups.telegramChatId),
          ...(input.channelId ? [eq(communityGroups.id, input.channelId)] : [])))
      if (!chans.length) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Add a Telegram channel with its @name under Channels first.' })
      const done = [...(w.row?.telegram ?? [])]
      const results: { name: string; ok: boolean; url?: string | null; error?: string }[] = []
      for (const ch of chans) {
        if (done.some(d => d.chatId === ch.chatId)) { results.push({ name: ch.name, ok: true, url: done.find(d => d.chatId === ch.chatId)?.url ?? null }); continue }
        try {
          const r = await postPhotoWithText(ch.chatId!, { photoUrl: imageFresh, text: w.text })
          const url = messageUrl(r.chat, r.messageId)
          done.push({ chatId: ch.chatId!, messageId: r.messageId, url, at: new Date().toISOString() })
          results.push({ name: ch.name, ok: true, url })
        } catch (e: any) {
          results.push({ name: ch.name, ok: false, error: e instanceof TelegramError ? e.message : 'Telegram didn’t answer.' })
        }
      }
      const failed = results.filter(r => !r.ok)
      await upsert(ctx, input.citySlug, input.weekStart, { eventIds: [...w.pickedIds], telegram: done, publishError: failed.length ? failed.map(f => `${f.name}: ${f.error}`).join(' · ').slice(0, 500) : null })
      if (results.some(r => r.ok)) trackServer(ctx, 'city_schedule_published', { city: input.citySlug, to: 'telegram', events: w.picked.length, channels: results.filter(r => r.ok).length, with_picture: !!imageFresh, ...profileGroup(page?.username) })
      return { results }
    }),
})

