import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, asc, eq, gte, inArray, isNotNull, isNull, lt, ne } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { cities, cityOccasionPosts, communityGroups, dancers, events, profileMembers, profiles } from '../../database/schema'
import { cityNames, requireCityAdmin } from '../../utils/cityAccess'
import { connectionWithToken, noteError } from '../../utils/meta/instagramConnection'
import { publishImage, MetaError } from '../../utils/meta/graph'
import { instagramImageUrl } from '../../utils/meta/image'
import { scheduleSvg, uploadScheduleImage } from '../../utils/scheduleImage'
import { messageUrl, postPhotoWithText, telegramConfigured, TelegramError } from '../../utils/telegram'
import { sendOccasionAskEmail } from '../../utils/email'
import { INSTAGRAM_CAPTION_MAX, scheduleDays, SCHEDULE_TZ } from '../../../shared/utils/citySchedule'
import { eventLocalDate, zonedToUtc } from '../../../shared/utils/eventTime'
import {
  addDays, isLang, monthLabel, occasionByKey, occasionPicture, occasionPostText, occasionsFor, planMonths, rangeLabel,
  type CityPlace, type Lang, type Occasion,
} from '../../../shared/utils/cityOccasions'
import { profileGroup, trackServer } from '../../utils/posthog'

/**
 * City occasions (RAZ-970) — the Plan tab of a city page: the next 12 months of occasions worth a
 * post (Bavarian silent days, Fasching, Halloween, New Year's Eve, Oktoberfest, open-air season),
 * each with a post written in the languages the admin picks, posted like the weekly post
 * (Instagram feed / story through the city page's connection, Telegram through the WeDance bot),
 * and a question to the city's organisers ("New Year's Eve is coming — planning something?").
 * Nothing is posted or sent without a click; apps (MCP tokens) can't post or send.
 */
const site = () => (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
const cityLink = (citySlug: string) => `${site()}/cities/${citySlug}`
const ASK_LOOKBACK_DAYS = 180
const ROUNDUP_MAX = 25

const keyInput = z.object({ citySlug: z.string().min(1).max(80), key: z.string().min(3).max(60) })

function noApps(ctx: any) {
  if (ctx.scopes) throw new TRPCError({ code: 'FORBIDDEN', message: 'Post and ask from WeDance itself, after looking at it.' })
}

async function placeOf(db: any, citySlug: string): Promise<CityPlace> {
  const [c] = await db.select({ countryCode: cities.countryCode, region: cities.region }).from(cities).where(eq(cities.slug, citySlug))
  return { citySlug, countryCode: c?.countryCode ?? null, region: c?.region ?? null }
}

const today = () => eventLocalDate(new Date(), SCHEDULE_TZ)

/** The city's events an occasion post lists: its nights (from two days before), at most 25. */
async function occasionEvents(db: any, citySlug: string, o: Occasion) {
  if (o.post !== 'roundup') return []
  const from = zonedToUtc(addDays(o.start, o.kind === 'party' ? -2 : 0), '06:00', SCHEDULE_TZ)
  const to = zonedToUtc(addDays(o.end, 1), '06:00', SCHEDULE_TZ)
  const rows = await db.select({
    id: events.id, name: events.name, type: events.type, startDate: events.startDate, timezone: events.timezone, venueName: events.venueName,
  }).from(events)
    .where(and(eq(events.citySlug, citySlug), eq(events.published, true), eq(events.archived, false), isNull(events.cancelledAt), isNotNull(events.startDate), gte(events.startDate, from), lt(events.startDate, to)))
    .orderBy(asc(events.startDate))
  // A season is long: open-air season lists what says so; courses never.
  const fit = rows.filter((e: any) => (e.type ?? '').toLowerCase() !== 'course')
    .filter((e: any) => o.id !== 'open-air' || /open.?air|outdoor|draußen|park|isar|beach|strand/i.test(`${e.name} ${e.venueName ?? ''}`))
  return fit.slice(0, ROUNDUP_MAX)
}

async function postRow(db: any, citySlug: string, key: string) {
  const [row] = await db.select().from(cityOccasionPosts).where(and(eq(cityOccasionPosts.citySlug, citySlug), eq(cityOccasionPosts.occasionKey, key)))
  return row ?? null
}

/** The occasion as it stands for this city: the generated text in the chosen languages, the saved row. */
async function load(ctx: any, citySlug: string, key: string) {
  const place = await placeOf(ctx.db, citySlug)
  const occasion = occasionByKey(place, key)
  if (!occasion) throw new TRPCError({ code: 'NOT_FOUND', message: 'That occasion isn’t on this city’s plan.' })
  const cityName = (await cityNames(ctx.db, [citySlug])).get(citySlug)!
  const upcoming = occasionsFor(place, addDays(occasion.start, -1), 12)
  const evs = await occasionEvents(ctx.db, citySlug, occasion)
  const row = await postRow(ctx.db, citySlug, key)
  const langs = ((row?.langs ?? ['en']) as string[]).filter(isLang) as Lang[]
  const generated = occasionPostText({ occasion, langs, cityName, upcoming, events: evs, link: cityLink(citySlug), tz: SCHEDULE_TZ })
  const text = row?.textEdited ? row.text : generated
  const picture = occasionPicture(occasion, langs[0] ?? 'en', cityName)
  const days = scheduleDays(evs, SCHEDULE_TZ)
  const imageKey = JSON.stringify([picture, days.map(d => [d.date, d.items.map(i => [i.time, i.name, i.where])])])
  return { place, occasion, cityName, evs, row, langs: langs.length ? langs : (['en'] as Lang[]), generated, text, picture, days, imageKey }
}

async function upsert(ctx: any, citySlug: string, key: string, set: Record<string, unknown>) {
  const [row] = await ctx.db.insert(cityOccasionPosts)
    .values({ citySlug, occasionKey: key, createdBy: ctx.dancerId, updatedBy: ctx.dancerId, ...set })
    .onConflictDoUpdate({ target: [cityOccasionPosts.citySlug, cityOccasionPosts.occasionKey], set: { ...set, updatedBy: ctx.dancerId, updatedAt: new Date() } })
    .returning()
  return row
}

type Status = 'todo' | 'draft' | 'posted' | 'asked'
function statusOf(row: any): Status {
  if (!row) return 'todo'
  if (row.igPublishedAt || row.igStoryPublishedAt || (row.telegram?.length ?? 0) > 0) return 'posted'
  if (row.askedAt) return 'asked'
  return 'draft'
}

/**
 * Organiser pages with events in the city (the last 180 days or coming up), not the city page
 * itself, with the team members we can email (owners and editors).
 */
async function cityOrganisers(db: any, citySlug: string, cityPageId: string | null) {
  const since = new Date(Date.now() - ASK_LOOKBACK_DAYS * 86400_000)
  const evs = await db.select({ username: events.organizerUsername }).from(events)
    .where(and(eq(events.citySlug, citySlug), eq(events.published, true), isNotNull(events.organizerUsername), gte(events.startDate, since)))
  const counts = new Map<string, number>()
  for (const e of evs) counts.set(e.username, (counts.get(e.username) ?? 0) + 1)
  if (!counts.size) return []
  const pages = await db.select({ id: profiles.id, username: profiles.username, name: profiles.name, sourceRef: profiles.sourceRef }).from(profiles)
    .where(and(inArray(profiles.username, [...counts.keys()]), ...(cityPageId ? [ne(profiles.id, cityPageId)] : [])))
  const live = pages.filter((p: any) => !(p.sourceRef as any)?.mergedInto)
  if (!live.length) return []
  const members = await db.select({ profileId: profileMembers.profileId, name: dancers.name, email: dancers.email }).from(profileMembers)
    .innerJoin(dancers, eq(dancers.id, profileMembers.dancerId))
    .where(and(inArray(profileMembers.profileId, live.map((p: any) => p.id)), inArray(profileMembers.role, ['owner', 'editor'])))
  return live.map((p: any) => ({
    id: p.id as string,
    username: p.username as string,
    name: p.name as string,
    events: counts.get(p.username) ?? 0,
    people: members.filter((m: any) => m.profileId === p.id && m.email).map((m: any) => ({ name: m.name as string, email: m.email as string })),
  })).sort((a: any, b: any) => b.events - a.events || a.name.localeCompare(b.name))
}

function defaultAsk(o: Occasion, cityName: string, handle: string | null) {
  const where = handle ? ` on @${handle}` : ''
  return `${o.name} is coming (${rangeLabel(o)}). Are you planning something in ${cityName}? Add it on WeDance and it goes into our ${o.name} post and the weekly post${where} by itself.`
}

export const cityOccasionsRouter = router({
  // The planner: 12 months, each with its occasions and where each stands.
  plan: protectedProcedure
    .input(z.object({ citySlug: z.string().min(1).max(80) }))
    .query(async ({ ctx, input }) => {
      await requireCityAdmin(ctx as any, input.citySlug)
      const place = await placeOf(ctx.db, input.citySlug)
      const day = today()
      const list = occasionsFor(place, day, 12)
      const rows = list.length
        ? await ctx.db.select().from(cityOccasionPosts).where(and(eq(cityOccasionPosts.citySlug, input.citySlug), inArray(cityOccasionPosts.occasionKey, list.map(o => o.key))))
        : []
      const byKey = new Map(rows.map((r: any) => [r.occasionKey, r]))
      const items = list.map(o => {
        const status = statusOf(byKey.get(o.key))
        const posted = status === 'posted'
        return {
          key: o.key, id: o.id, name: o.name, localName: o.localName, kind: o.kind, start: o.start, end: o.end,
          when: rangeLabel(o), note: o.note, postBy: o.postBy, askBy: o.askBy, status,
          // What needs doing next, and whether it's due (within a week) or late.
          next: posted ? null
            : o.askBy && status === 'todo' && o.askBy >= day ? { what: 'ask' as const, by: o.askBy, due: o.askBy <= addDays(day, 7) }
            : { what: 'post' as const, by: o.postBy, due: o.postBy <= addDays(day, 7), late: o.postBy < day },
        }
      })
      return {
        today: day,
        months: planMonths(day, 12).map(m => ({ month: m, label: monthLabel(m), occasions: items.filter(i => i.start.slice(0, 7) === m) })),
      }
    }),

  // One occasion: its post (text, picture, where it went) and where it can go.
  get: protectedProcedure
    .input(keyInput)
    .query(async ({ ctx, input }) => {
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      const w = await load(ctx, input.citySlug, input.key)
      const ig = page ? await connectionWithToken(ctx.db, page.id).catch(() => null) : null
      const telegram = await ctx.db.select({ id: communityGroups.id, name: communityGroups.name, chatId: communityGroups.telegramChatId }).from(communityGroups)
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official'), eq(communityGroups.platform, 'telegram'), isNotNull(communityGroups.telegramChatId)))
      const o = w.occasion
      return {
        citySlug: input.citySlug,
        cityName: w.cityName,
        page: page ? { username: page.username, name: page.name } : null,
        occasion: { key: o.key, id: o.id, name: o.name, localName: o.localName, kind: o.kind, post: o.post, when: rangeLabel(o), note: o.note, postBy: o.postBy, askBy: o.askBy, start: o.start },
        langs: w.langs,
        text: w.text,
        textEdited: !!w.row?.textEdited,
        events: w.evs.length,
        image: w.row?.imageUrl ? { url: w.row.imageUrl, stale: w.row.imageKey !== w.imageKey } : null,
        posted: {
          feed: w.row?.igPublishedAt ? { at: w.row.igPublishedAt, permalink: w.row.igPermalink } : null,
          story: w.row?.igStoryPublishedAt ? { at: w.row.igStoryPublishedAt } : null,
          telegram: w.row?.telegram ?? [],
        },
        asked: w.row?.askedAt ? { at: w.row.askedAt, pages: (w.row.askedProfiles ?? []).length } : null,
        publishError: w.row?.publishError ?? null,
        targets: {
          instagram: ig ? ig.igUsername : null,
          telegram: telegram.map((t: any) => ({ id: t.id, name: t.name, chatId: t.chatId })),
          telegramConfigured: telegramConfigured(),
        },
      }
    }),

  // Languages and/or text. text: null goes back to the generated text.
  save: protectedProcedure
    .input(keyInput.extend({ langs: z.array(z.enum(['en', 'es', 'ru', 'de'])).min(1).max(4).optional(), text: z.string().max(6000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireCityAdmin(ctx as any, input.citySlug)
      const set: Record<string, unknown> = {}
      if (input.langs) set.langs = [...new Set(input.langs)]
      if (input.text === null) Object.assign(set, { text: '', textEdited: false })
      else if (typeof input.text === 'string') {
        // Compare with the text of the languages being saved.
        if (input.langs) await upsert(ctx, input.citySlug, input.key, { langs: set.langs })
        const w = await load(ctx, input.citySlug, input.key)
        Object.assign(set, input.text.trim() !== w.generated.trim() ? { text: input.text, textEdited: true } : { text: '', textEdited: false })
      }
      else await load(ctx, input.citySlug, input.key) // the occasion must exist
      await upsert(ctx, input.citySlug, input.key, set)
      return { ok: true }
    }),

  drawImage: protectedProcedure
    .input(keyInput)
    .mutation(async ({ ctx, input }) => {
      await requireCityAdmin(ctx as any, input.citySlug)
      const w = await load(ctx, input.citySlug, input.key)
      const p = w.picture
      const svg = scheduleSvg({
        cityName: p.title, weekLabel: p.subtitle, eyebrow: p.eyebrow, days: w.days, lines: p.lines ?? undefined,
        dark: p.dark, empty: p.empty, footer: `wedance.vip · ${w.cityName}`,
      })
      const url = await uploadScheduleImage(svg, `${input.citySlug}-${input.key.replace(':', '-')}`)
      await upsert(ctx, input.citySlug, input.key, { imageUrl: url, imageKey: w.imageKey })
      return { url }
    }),

  publishInstagram: protectedProcedure
    .input(keyInput.extend({ to: z.enum(['feed', 'story']) }))
    .mutation(async ({ ctx, input }) => {
      noApps(ctx)
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      if (!page) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This city has no WeDance page yet.' })
      const w = await load(ctx, input.citySlug, input.key)
      const story = input.to === 'story'
      if (story ? w.row?.igStoryMediaId : w.row?.igMediaId) throw new TRPCError({ code: 'BAD_REQUEST', message: story ? 'Already in the story.' : 'Already on the feed.' })
      if (!w.row?.imageUrl) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Draw the picture first.' })
      if (w.row.imageKey !== w.imageKey) throw new TRPCError({ code: 'BAD_REQUEST', message: 'The post changed since the picture was drawn. Redraw it first.' })
      const c = await connectionWithToken(ctx.db, page.id)
      if (!c) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: `Connect Instagram on @${page.username} first.` })
      try {
        const r = await publishImage(c.token, c.igUserId, {
          imageUrl: instagramImageUrl(w.row.imageUrl, { width: 1080, height: 1350 }, input.to),
          caption: w.text.slice(0, INSTAGRAM_CAPTION_MAX),
          story,
        })
        const now = new Date()
        await upsert(ctx, input.citySlug, input.key, story
          ? { igStoryMediaId: r.mediaId, igStoryPublishedAt: now, publishError: null }
          : { igMediaId: r.mediaId, igPermalink: r.permalink, igPublishedAt: now, publishError: null })
        trackServer(ctx, 'city_occasion_published', { city: input.citySlug, occasion: w.occasion.id, kind: w.occasion.kind, to: story ? 'instagram_story' : 'instagram_feed', langs: w.langs.join(','), ...profileGroup(page.username) })
        return { permalink: r.permalink, account: c.igUsername }
      } catch (e: any) {
        const message = e instanceof MetaError ? e.message : 'Instagram didn’t take the post. Try again.'
        await upsert(ctx, input.citySlug, input.key, { publishError: message.slice(0, 500) })
        if (e instanceof MetaError && (e.code === 190 || e.code === 10 || e.code === 200)) await noteError(ctx.db, page.id, message)
        throw new TRPCError({ code: 'BAD_REQUEST', message })
      }
    }),

  publishTelegram: protectedProcedure
    .input(keyInput)
    .mutation(async ({ ctx, input }) => {
      noApps(ctx)
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      if (!telegramConfigured()) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'The WeDance Telegram bot isn’t set up yet (TELEGRAM_BOT_TOKEN).' })
      const w = await load(ctx, input.citySlug, input.key)
      const imageFresh = w.row?.imageUrl && w.row.imageKey === w.imageKey ? w.row.imageUrl : null
      const chans = await ctx.db.select({ id: communityGroups.id, name: communityGroups.name, chatId: communityGroups.telegramChatId }).from(communityGroups)
        .where(and(eq(communityGroups.citySlug, input.citySlug), eq(communityGroups.kind, 'official'), eq(communityGroups.platform, 'telegram'), isNotNull(communityGroups.telegramChatId)))
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
      await upsert(ctx, input.citySlug, input.key, { telegram: done, publishError: failed.length ? failed.map(f => `${f.name}: ${f.error}`).join(' · ').slice(0, 500) : null })
      if (results.some(r => r.ok)) trackServer(ctx, 'city_occasion_published', { city: input.citySlug, occasion: w.occasion.id, kind: w.occasion.kind, to: 'telegram', langs: w.langs.join(','), channels: results.filter(r => r.ok).length, ...profileGroup(page?.username) })
      return { results }
    }),

  // Who "Ask organisers" would reach, and the suggested message.
  organisers: protectedProcedure
    .input(keyInput)
    .query(async ({ ctx, input }) => {
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      const w = await load(ctx, input.citySlug, input.key)
      const list = await cityOrganisers(ctx.db, input.citySlug, page?.id ?? null)
      const asked = new Set<string>((w.row?.askedProfiles ?? []) as string[])
      return {
        message: w.row?.askMessage || defaultAsk(w.occasion, w.cityName, page?.username ?? null),
        pages: list.map(p => ({ id: p.id, username: p.username, name: p.name, events: p.events, reachable: p.people.length > 0, asked: asked.has(p.id) })),
      }
    }),

  // Email the chosen organiser pages' owners and editors. Each page once per occasion.
  ask: protectedProcedure
    .input(keyInput.extend({ profileIds: z.array(z.string().uuid()).min(1).max(200), message: z.string().trim().min(10).max(1500) }))
    .mutation(async ({ ctx, input }) => {
      noApps(ctx)
      const page = await requireCityAdmin(ctx as any, input.citySlug)
      const w = await load(ctx, input.citySlug, input.key)
      const asked = new Set<string>((w.row?.askedProfiles ?? []) as string[])
      const wanted = new Set(input.profileIds)
      const list = (await cityOrganisers(ctx.db, input.citySlug, page?.id ?? null)).filter(p => wanted.has(p.id) && !asked.has(p.id) && p.people.length)
      if (!list.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'None of these organisers can be reached, or they were already asked.' })
      const link = `${site()}/business/events/new`
      let sent = 0
      const seen = new Set<string>()
      for (const p of list) {
        for (const person of p.people) {
          if (seen.has(person.email)) continue
          seen.add(person.email)
          try {
            await sendOccasionAskEmail({ to: person.email, name: person.name, pageName: p.name, cityName: w.cityName, occasion: w.occasion.name, when: rangeLabel(w.occasion), message: input.message, link })
            sent++
          } catch (e) {
            console.error('[cityOccasions.ask] email failed', p.username, e)
          }
        }
        asked.add(p.id)
      }
      await upsert(ctx, input.citySlug, input.key, { askedAt: new Date(), askedProfiles: [...asked], askMessage: input.message })
      trackServer(ctx, 'city_occasion_asked', { city: input.citySlug, occasion: w.occasion.id, kind: w.occasion.kind, pages: list.length, emails: sent, ...profileGroup(page?.username) })
      return { pages: list.length, emails: sent }
    }),
})
