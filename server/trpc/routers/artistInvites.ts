import { z } from 'zod'
import { eq, and, inArray, desc, isNotNull, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { profiles, profileMembers, profileSuggestions, profileInvites, events, eventFlyers, planItems, dancers } from '../../database/schema'
import { sendInviteEmail, sendInviteAnswerCopyEmail, sendInviteAnsweredEmail } from '../../utils/email'
import { maskEmail, signAnswerEmail, verifyAnswerEmail } from '../../utils/inviteAnswerSig'
import { createSession } from './auth'
import { answerLines, answerSubjects } from '../../../shared/utils/inviteAnswer'
import { venueTermsText, type VenueTerms } from '../../../shared/types/venueAsk'
import { eventLocalDate, eventLocalTime } from '../../../shared/utils/eventTime'
import { requireEventManager } from './businessEvents'
import { citySlugFor } from './business'
import { grant, logAccess, assertProfileGranted } from '../../utils/profileAccess'
import { addProfileToOwnGrant } from '../../oauth/grants'
import { instagramUrl, parseInstagramHandle } from '../../../shared/utils/instagram'
import { videoEmbedUrl } from '../../../shared/utils/video'
import { contactsFor } from '../../../shared/utils/contacts'
import { isEveningItem, isWorkshop } from '../../../shared/utils/programme'
import { profileGroup, trackServer } from '../../utils/posthog'
import { hostEventCount, venueAskFacts } from '../../utils/venueAskFacts'
import { venueAskLines } from '../../../shared/utils/venueAsk'
import { artistInviteLines, artistInviteMessage, type ArtistInviteFacts } from '../../../shared/utils/artistInvite'
import { artistTermsText, type ArtistTerms } from '../../../shared/types/artistDeal'

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

// Photos and videos add to a list; the rest replace one field.
type Kind = 'photo' | 'video' | 'name' | 'bio' | 'city' | 'styles' | 'instagram' | 'website' | 'facebook'
const SINGLE: Kind[] = ['name', 'bio', 'city', 'styles', 'instagram', 'website', 'facebook']
const SOCIAL: Kind[] = ['instagram', 'website', 'facebook']
const socialOf = (p: any, platform: string) => ((p.socials ?? []) as any[]).find(s => s.platform === platform)?.url ?? ''
/** A profile's current value for a single-value field, as stored in a suggestion. */
function currentOf(p: any, kind: Kind): string {
  if (kind === 'styles') return JSON.stringify(p.styles ?? [])
  if (SOCIAL.includes(kind)) return socialOf(p, kind)
  return (p[kind] as string | null) ?? ''
}
function withSocial(p: any, platform: string, url: string) {
  const others = ((p.socials ?? []) as any[]).filter(s => s.platform !== platform)
  if (!url) return others
  const v = platform === 'instagram' ? (parseInstagramHandle(url) ? instagramUrl(parseInstagramHandle(url)!) : url) : url
  return [...others, { platform, url: v }]
}
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
  if (kind === 'bio') return db.update(profiles).set({ bio: value || null }).where(eq(profiles.id, p.id))
  if (kind === 'city') return db.update(profiles).set({ city: value || null, citySlug: await citySlugFor(db, value || null) }).where(eq(profiles.id, p.id))
  if (kind === 'styles') return db.update(profiles).set({ styles: JSON.parse(value) }).where(eq(profiles.id, p.id))
  if (SOCIAL.includes(kind)) return db.update(profiles).set({ socials: withSocial(p, kind, value) }).where(eq(profiles.id, p.id))
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
  // A connected app acts for a page someone runs only when it was given that
  // page; an unmanaged page is answered with its link, as on the web.
  if (managed || !input.token) assertProfileGranted(ctx, p.id)
  return { invite, p, managed, member, canAnswer: !managed || member || !!ctx.isAdmin }
}

/**
 * What the artist sees first: the event in a few lines, who's organizing,
 * who else is in the line-up — then their own programme and the flyer they're on.
 */
export async function eventContext(db: any, eventId: string, p: any) {
  const [e] = await db.select().from(events).where(eq(events.id, eventId))
  if (!e) return null
  const tz = e.timezone || 'Europe/Berlin'
  const [host] = e.hostProfileId ? await db.select({ id: profiles.id, name: profiles.name, username: profiles.username, socials: profiles.socials, city: profiles.city }).from(profiles).where(eq(profiles.id, e.hostProfileId)) : [null]
  const hostEvents = host ? await hostEventCount(db, host) : 0
  const handles: string[] = e.artists ?? []
  const others = handles.length
    ? await db.select({ username: profiles.username, name: profiles.name, photo: profiles.photo }).from(profiles).where(inArray(profiles.username, handles))
    : []
  const sessions = ((e.festival?.sessions ?? []) as any[])
  // Their programme: festival sessions they're on, else agenda lines naming them.
  const myName = (e.flyerOptions?.names?.[p.username] || p.name || '').toLowerCase()
  const programme = sessions.length
    ? sessions.filter(s => s.artist === p.username || (s.with ?? []).includes(p.username)).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .map(s => ({
        date: s.date, time: s.time, duration: s.duration, title: s.title, room: s.room ?? '', style: s.style ?? '', level: isWorkshop(s.type) ? (s.level ?? '') : '', venue: s.venue ?? '', type: s.type,
        // Who they teach it with, by name.
        with: [s.artist, ...(s.with ?? [])].filter(h => h && h !== p.username).map(h => e.flyerOptions?.names?.[h] || others.find((o: any) => o.username === h)?.name || h),
      }))
    : ((e.agenda ?? []) as { time: string; what: string }[]).filter(a => myName && a.what.toLowerCase().includes(myName))
      .map(a => ({ date: eventLocalDate(e.startDate, tz), time: a.time, duration: 0, title: a.what, room: '', style: '', level: '', venue: '', type: 'workshop', with: [] as string[] }))
  const [kept] = await db.select({ url: eventFlyers.url, pictured: eventFlyers.pictured }).from(eventFlyers)
    .where(and(eq(eventFlyers.eventId, eventId), isNotNull(eventFlyers.keptAt))).limit(1)
  const [planning] = e.festival?.key
    ? await db.select({ n: sql<number>`count(*)::int` }).from(planItems).where(and(eq(planItems.itemType, 'festival'), eq(planItems.itemId, e.festival.key)))
    : [{ n: 0 }]
  return {
    name: e.name ?? '', type: e.type ?? '', description: String(e.description ?? '').slice(0, 700),
    startDate: e.startDate, endDate: e.endDate, timezone: tz,
    startDay: eventLocalDate(e.startDate, tz), endDay: e.endDate ? eventLocalDate(e.endDate, tz) : null,
    startTime: eventLocalTime(e.startDate, tz),
    venue: e.venueName ?? '', address: e.venueAddress ?? '', city: e.city ?? '',
    otherVenues: [...new Set(sessions.map(s => s.venue).filter(Boolean))] as string[],
    styles: (e.styles ?? []) as string[],
    host: host ? { name: host.name, username: host.username, instagram: ((host.socials ?? []) as any[]).find(x => x.platform === 'instagram')?.url ?? null } : (e.organizerName ? { name: e.organizerName, username: null, instagram: null } : null),
    /** The organizer's track record, shown to whoever they ask. */
    hostEvents,
    hostCity: host?.city || e.city || null,
    lineup: others.filter((o: any) => o.username !== p.username).map((o: any) => ({ username: o.username, name: e.flyerOptions?.names?.[o.username] || o.name, photo: o.photo })),
    stats: { workshops: sessions.filter(s => isWorkshop(s.type)).length, parties: sessions.filter(s => isEveningItem(s.type)).length, planning: planning?.n ?? 0 },
    path: `/events/${e.festival?.key ?? e.id}`,
    /** A draft: the page link needs ?preview=<token> to open. */
    published: !!e.published,
    programme,
    /** Their name as this event spells it (the flyer's names), else the page's. */
    lineupName: (e.flyerOptions?.names?.[p.username] || p.name || '') as string,
    /** The photo this event's flyer uses for them: undefined = their main photo, null = name only. */
    flyerPhoto: (p.username in (e.flyerOptions?.photos ?? {}) ? e.flyerOptions.photos[p.username] : undefined) as string | null | undefined,
    flyer: kept?.url ? { url: kept.url, pictured: ((kept.pictured ?? []) as string[]).some(n => n.toLowerCase() === myName) } : null,
  }
}

/** The artist's message and email, from what their page shows of the event. */
export function artistFacts(ev: NonNullable<Awaited<ReturnType<typeof eventContext>>>, artistName: string, offer = ''): ArtistInviteFacts {
  const day = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' })
  const multi = !!ev.endDay && ev.endDay !== ev.startDay && +new Date(ev.endDate!) - +new Date(ev.startDate) >= 24 * 3600_000
  const days = [...new Set(ev.programme.map(s => s.date))]
  return {
    artistName,
    host: ev.host?.name ?? null,
    hostEvents: ev.hostEvents,
    hostCity: ev.hostCity,
    eventName: ev.name || 'our event',
    when: multi ? `${day(ev.startDay, { weekday: 'long', day: 'numeric', month: 'long' })} – ${day(ev.endDay!, { weekday: 'long', day: 'numeric', month: 'long' })}` : day(ev.startDay, { weekday: 'long', day: 'numeric', month: 'long' }),
    place: [ev.venue, ev.city].filter(Boolean).join(', '),
    slots: ev.programme.map(s => ({ date: s.date, time: s.time, title: s.title, type: s.type, style: s.style })),
    dayLabels: Object.fromEntries(days.map(d => [d, day(d, { weekday: 'short' })])),
    flyer: ev.flyer ? (ev.flyer.pictured ? 'pictured' : 'named') : null,
    offer,
  }
}

/** "Saturday 6 December 2026 · 20:00", or the two days of a multi-day event. */
function whenText(e: any): string {
  if (!e?.startDate) return ''
  const tz = e.timezone || 'Europe/Berlin'
  const day = (d: Date) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz })
  return e.endDate && eventLocalDate(e.endDate, tz) !== eventLocalDate(e.startDate, tz) ? `${day(e.startDate)} – ${day(e.endDate)}` : `${day(e.startDate)} · ${eventLocalTime(e.startDate, tz)}`
}
const siteUrl = () => (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')

/**
 * After an answer: the answerer's copy (with "That's me" unless their account
 * already proves it) and a note to the organiser who asked. Only when the answer
 * itself changed (or the address did), so re-saving a photo sends nothing.
 * Never throws: a failed email must not lose the answer.
 */
async function sendAnswerEmails(ctx: any, inv: any, p: any, opts: { email: string | null; confirmed: boolean; flyerName: string; resend: boolean; notifyOrganiser: boolean }) {
  try {
    const [e] = inv.eventId ? await ctx.db.select().from(events).where(eq(events.id, inv.eventId)) : [null]
    if (!e) return
    const [h] = e.hostProfileId ? await ctx.db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, e.hostProfileId)) : [null]
    const host = h?.name || e.organizerName || 'The organizer'
    const venue = inv.kind === 'venue'
    const facts = {
      kind: inv.kind as 'artist' | 'venue', status: inv.status as 'confirmed' | 'declined' | 'proposed',
      profileName: p.name as string, eventName: (e.name as string) || 'the event', when: whenText(e),
      place: venue ? '' : [e.venueName, e.city].filter(Boolean).join(', '),
      offer: ((inv.request as { offer?: string } | null)?.offer ?? '') as string,
      terms: venue ? venueTermsText(inv.terms as VenueTerms | null) : artistTermsText(inv.terms as ArtistTerms | null),
      alternative: (inv.alternative ?? '') as string, programmeNote: (inv.programmeNote ?? '') as string, message: (inv.message ?? '') as string,
      flyerName: opts.flyerName,
    }
    const subjects = answerSubjects(facts)
    const lines = answerLines(facts)
    const link = `${siteUrl()}/${venue ? 'ask' : 'confirm'}/${inv.token}`
    // Each email on its own: one failing doesn't cost the other.
    if (opts.email && opts.resend) {
      await Promise.resolve().then(() => sendInviteAnswerCopyEmail({
        to: opts.email, name: p.name, subject: subjects.you, host, lines, link,
        confirmUrl: opts.confirmed ? null : `${link}?that=${signAnswerEmail(inv.id, opts.email!)}`,
      })).catch(err => console.error('[artistInvites] answer copy email failed for invite', inv.id, err))
    }
    if (opts.notifyOrganiser && inv.createdBy) {
      const [o] = await ctx.db.select({ email: dancers.email, name: dancers.name }).from(dancers).where(eq(dancers.id, inv.createdBy))
      // Not when they answered their own ask (an organiser testing their link).
      if (o?.email && o.email !== opts.email) {
        await sendInviteAnsweredEmail({ to: o.email, name: o.name, subject: subjects.them, lines, confirmed: opts.confirmed, link: `${siteUrl()}/business/events/${e.id}` })
          .catch(err => console.error('[artistInvites] organiser answer email failed for invite', inv.id, err))
      }
    }
  } catch (err) {
    console.error('[artistInvites] answer emails failed for invite', inv.id, err)
  }
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
      kind: z.enum(['photo', 'video', 'name', 'bio', 'city', 'styles', 'instagram', 'website', 'facebook']),
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
      // A newer value for a field replaces an older pending one.
      if (SINGLE.includes(input.kind)) {
        await ctx.db.update(profileSuggestions).set({ status: 'rejected', decidedAt: new Date() })
          .where(and(eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.kind, input.kind), eq(profileSuggestions.status, 'pending')))
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
      type Answer = { status: string; programmeOk: boolean | null; programmeNote: string | null; postsOk: boolean; message: string | null; respondedAt: Date | null; terms: string; emailConfirmed: boolean } | null
      const out: Record<string, { photos: string[]; videos: string[]; name: string | null; fields: string[]; answer: Answer }> = {}
      const answers = await ctx.db.select({
        username: profiles.username, status: profileInvites.status, programmeOk: profileInvites.programmeOk, programmeNote: profileInvites.programmeNote,
        postsOkAt: profileInvites.postsOkAt, message: profileInvites.message, respondedAt: profileInvites.respondedAt, terms: profileInvites.terms, emailConfirmedAt: profileInvites.emailConfirmedAt,
      }).from(profileInvites).innerJoin(profiles, eq(profiles.id, profileInvites.profileId))
        .where(and(eq(profileInvites.eventId, input.eventId), inArray(profiles.username, input.handles)))
      for (const a of answers) {
        out[a.username] = { photos: [], videos: [], name: null, fields: [], answer: { status: a.status, programmeOk: a.programmeOk, programmeNote: a.programmeNote, postsOk: !!a.postsOkAt, message: a.message, respondedAt: a.respondedAt, terms: artistTermsText(a.terms as ArtistTerms | null), emailConfirmed: !!a.emailConfirmedAt } }
      }
      for (const r of rows) {
        const o = (out[r.username] ??= { photos: [], videos: [], name: null, fields: [], answer: null })
        if (r.kind === 'name') o.name = r.value
        else if (r.kind === 'photo') o.photos.push(r.value)
        else if (r.kind === 'video') o.videos.push(r.value)
        else o.fields.push(r.kind)
      }
      return out
    }),

  // An artist's page as the line-up's editor shows it, with what's waiting to be approved.
  profile: protectedProcedure
    .input(z.object({ eventId: z.string().uuid(), handle: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      const [p] = await ctx.db.select().from(profiles).where(eq(profiles.username, input.handle))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'That artist isn’t on WeDance.' })
      const pending = await ctx.db.select({ kind: profileSuggestions.kind, value: profileSuggestions.value }).from(profileSuggestions)
        .where(and(eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.status, 'pending')))
      return {
        username: p.username, name: p.name, city: p.city ?? '', bio: p.bio ?? '', styles: (p.styles ?? []) as string[],
        // The main photo first, then the gallery (the main one isn't always in it).
        photo: p.photo as string | null, photos: [...new Set([p.photo, ...((p.photos ?? []) as { url: string }[]).map(x => x.url)].filter(Boolean))] as string[],
        videos: ((p.videos ?? []) as { url: string }[]).map(x => x.url),
        instagram: socialOf(p, 'instagram'), website: socialOf(p, 'website'), facebook: socialOf(p, 'facebook'),
        // My own page (I'm on its team): changes save directly.
        mine: await isMember(ctx.db, p.id, ctx.dancerId),
        managed: await hasTeam(ctx.db, p.id),
        pending: pending as { kind: Kind; value: string }[],
      }
    }),

  // Save the line-up editor's changes to an artist's page: directly on a page I
  // manage, else as suggestions the artist approves through their link.
  saveProfile: protectedProcedure
    .input(z.object({
      eventId: z.string().uuid(),
      handle: z.string().min(1).max(200),
      name: z.string().trim().min(1).max(120).optional(),
      city: z.string().trim().max(120).optional(),
      bio: z.string().trim().max(4000).optional(),
      styles: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      instagram: z.string().trim().max(300).optional(),
      website: z.string().trim().max(300).optional(),
      facebook: z.string().trim().max(300).optional(),
      addPhotos: z.array(z.string().url()).max(20).default([]),
      addVideos: z.array(videoUrl).max(10).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      let [p] = await ctx.db.select().from(profiles).where(eq(profiles.username, input.handle))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'That artist isn’t on WeDance.' })
      const mine = await isMember(ctx.db, p.id, ctx.dancerId)
      const changes: { kind: Kind; value: string }[] = []
      for (const k of SINGLE) {
        const v = (input as any)[k]
        if (v === undefined) continue
        const value = k === 'styles' ? JSON.stringify(v) : String(v)
        if (value !== currentOf(p, k)) changes.push({ kind: k, value })
      }
      for (const url of input.addPhotos) changes.push({ kind: 'photo', value: url })
      for (const url of input.addVideos.filter(Boolean)) changes.push({ kind: 'video', value: url })
      if (mine) {
        for (const c of changes) { await apply(ctx.db, p, c.kind, c.value); p = (await ctx.db.select().from(profiles).where(eq(profiles.id, p.id)))[0] ?? p }
        return { status: 'applied' as const, count: changes.length }
      }
      for (const c of changes) {
        // A newer value for a field replaces an older pending one.
        if (SINGLE.includes(c.kind)) {
          await ctx.db.update(profileSuggestions).set({ status: 'rejected', decidedAt: new Date() })
            .where(and(eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.kind, c.kind), eq(profileSuggestions.status, 'pending')))
        }
        await ctx.db.insert(profileSuggestions)
          .values({ profileId: p.id, kind: c.kind, value: c.value, eventId: input.eventId, suggestedBy: ctx.dancerId })
          .onConflictDoNothing()
      }
      return { status: 'pending' as const, count: changes.length }
    }),

  // The personal link for an artist in this event's line-up (the same one each time).
  link: protectedProcedure
    // offer: what the organizer offers them ("€80 per class + free pass"); left out = keep what's saved.
    .input(z.object({ eventId: z.string().uuid(), handle: z.string().min(1).max(200), offer: z.string().trim().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      const [p] = await ctx.db.select({ id: profiles.id, name: profiles.name, username: profiles.username, city: profiles.city, socials: profiles.socials, contact: profiles.contact, mapUrl: profiles.mapUrl }).from(profiles).where(eq(profiles.username, input.handle))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'That artist isn’t on WeDance.' })
      const [existing] = await ctx.db.select({ id: profileInvites.id, token: profileInvites.token, status: profileInvites.status, notifiedAt: profileInvites.notifiedAt, request: profileInvites.request }).from(profileInvites)
        .where(and(eq(profileInvites.eventId, input.eventId), eq(profileInvites.profileId, p.id)))
      const t = existing?.token ?? token()
      const offer = input.offer ?? ((existing?.request as { offer?: string } | null)?.offer ?? '')
      if (!existing) await ctx.db.insert(profileInvites).values({ token: t, profileId: p.id, eventId: input.eventId, createdBy: ctx.dancerId, request: offer ? { offer } : null })
      else if (input.offer !== undefined) await ctx.db.update(profileInvites).set({ request: { ...(existing.request ?? {}), offer } }).where(eq(profileInvites.id, existing.id))
      const site = (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
      // For the popup's instructions and the message to paste.
      const [full] = await ctx.db.select().from(profiles).where(eq(profiles.id, p.id))
      const ev = await eventContext(ctx.db, input.eventId, full)
      const url = `${site}/confirm/${t}`
      // Built here so the message, the page and the email say the same thing.
      const message = ev ? artistInviteMessage(artistFacts(ev, ev.lineupName || p.name, offer), url) : ''
      return { url, message, offer, eventName: ev?.name ?? '', host: ev?.host?.name ?? null, managed: await hasTeam(ctx.db, p.id), answered: !!existing && existing.status !== 'invited', notifiedAt: existing?.notifiedAt ?? null, contacts: contactsFor(p) }
    }),

  // Email the people who run the page about its link (an artist's line-up
  // link or a venue ask): only pages with a team, at most once a day per link.
  // Their addresses stay private; the organizer sees how many were emailed.
  notify: protectedProcedure
    .input(z.object({ eventId: z.string().uuid(), handle: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await requireEventManager(ctx, input.eventId)
      const [inv] = await ctx.db.select({ id: profileInvites.id, token: profileInvites.token, kind: profileInvites.kind, request: profileInvites.request, notifiedAt: profileInvites.notifiedAt, profileId: profiles.id, profileName: profiles.name })
        .from(profileInvites).innerJoin(profiles, eq(profiles.id, profileInvites.profileId))
        .where(and(eq(profileInvites.eventId, input.eventId), eq(profiles.username, input.handle)))
      if (!inv) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Make their link first.' })
      if (inv.notifiedAt && Date.now() - +new Date(inv.notifiedAt) < 24 * 3600_000) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'They were emailed about it in the last day.' })
      }
      const team = await ctx.db.select({ email: dancers.email, name: dancers.name }).from(profileMembers)
        .innerJoin(dancers, eq(dancers.id, profileMembers.dancerId)).where(eq(profileMembers.profileId, inv.profileId))
      if (!team.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nobody runs their page on WeDance yet: send them the message instead.' })
      const [e] = await ctx.db.select().from(events).where(eq(events.id, input.eventId))
      const [h] = e?.hostProfileId ? await ctx.db.select({ name: profiles.name }).from(profiles).where(eq(profiles.id, e.hostProfileId)) : [null]
      const tz = e?.timezone || 'Europe/Berlin'
      const day = (d: Date) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz })
      const when = e?.startDate
        ? (e.endDate && eventLocalDate(e.endDate, tz) !== eventLocalDate(e.startDate, tz) ? `${day(e.startDate)} – ${day(e.endDate)}` : `${day(e.startDate)} · ${eventLocalTime(e.startDate, tz)}`)
        : ''
      const facts = inv.kind === 'venue' ? await venueAskFacts(ctx.db, input.eventId, { name: inv.profileName }, (inv.request ?? {}) as import('../../../shared/types/venueAsk').VenueRequest) : null
      let lines: string[]
      if (facts) lines = venueAskLines(facts)
      else {
        const [full] = await ctx.db.select().from(profiles).where(eq(profiles.id, inv.profileId))
        const ev = await eventContext(ctx.db, input.eventId, full)
        lines = ev ? artistInviteLines(artistFacts(ev, ev.lineupName || inv.profileName, (inv.request as { offer?: string } | null)?.offer ?? '')) : []
      }
      const site = (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
      for (const m of team) {
        await sendInviteEmail({ to: m.email, name: m.name, kind: inv.kind as 'artist' | 'venue', host: h?.name || 'An organizer', profileName: inv.profileName, eventName: e?.name ?? 'their event', when, lines, link: `${site}/${inv.kind === 'venue' ? 'ask' : 'confirm'}/${inv.token}` })
      }
      const at = new Date()
      await ctx.db.update(profileInvites).set({ notifiedAt: at }).where(eq(profileInvites.id, inv.id))
      return { sent: team.length, notifiedAt: at }
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
        .where(and(eq(profileSuggestions.profileId, p.id), eq(profileSuggestions.status, 'pending'), sql`${events.archived} is not true`))
        .orderBy(desc(profileSuggestions.createdAt))
      const event = invite?.eventId ? await eventContext(ctx.db, invite.eventId, p) : null
      if (invite) await ctx.db.update(profileInvites).set({ lastUsedAt: new Date() }).where(eq(profileInvites.id, invite.id))
      return {
        profile: {
          username: p.username, name: p.name, type: p.type, photo: p.photo, photos: (p.photos ?? []) as { url: string }[],
          videos: (p.videos ?? []) as { url: string }[], bio: p.bio ?? '', styles: (p.styles ?? []) as string[],
          instagram: socialOf(p, 'instagram'), website: socialOf(p, 'website'), facebook: socialOf(p, 'facebook'), city: p.city ?? '',
          address: p.address ?? '', floorType: p.floorType ?? '',
        },
        pending, event, managed, member, canAnswer, signedIn: !!ctx.dancerId,
        // An artist's line-up link, or a venue being asked to host the event.
        kind: (invite?.kind ?? 'artist') as 'artist' | 'venue',
        ask: invite?.kind === 'venue' ? {
          request: (invite.request ?? {}) as import('../../../shared/types/venueAsk').VenueRequest,
          // The plan at this venue, the hours the room is needed, who's asking.
          facts: invite.eventId ? await venueAskFacts(ctx.db, invite.eventId, { name: p.name }, (invite.request ?? {}) as import('../../../shared/types/venueAsk').VenueRequest) : null,
          terms: (invite.terms ?? null) as import('../../../shared/types/venueAsk').VenueTerms | null,
          alternative: invite.alternative as string | null,
          outcome: invite.outcome as 'booked' | 'elsewhere' | null,
        } : null,
        // An artist's deal: what the organizer offers, and their terms if they set any.
        deal: invite && invite.kind !== 'venue' ? {
          offer: ((invite.request as { offer?: string } | null)?.offer ?? '') as string,
          terms: (invite.terms ?? null) as ArtistTerms | null,
        } : null,
        answer: invite ? {
          status: invite.status as 'invited' | 'confirmed' | 'declined' | 'proposed',
          // Where their written copy went, half hidden (the link may have been forwarded).
          email: invite.answerEmail ? maskEmail(invite.answerEmail) : null,
          emailConfirmed: !!invite.emailConfirmedAt,
          programmeOk: invite.programmeOk as boolean | null,
          programmeNote: invite.programmeNote as string | null,
          postsOk: !!invite.postsOkAt,
          message: invite.message as string | null,
        } : null,
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
      city: z.string().trim().max(120).optional(),
      styles: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
      website: z.string().trim().max(300).optional(),
      facebook: z.string().trim().max(300).optional(),
      addPhotos: z.array(z.string().url()).max(20).default([]),
      addVideos: z.array(videoUrl).max(10).default([]),
      // Photos already on the page may be site paths ("/people/silvio.jpg"), not URLs.
      removePhotos: z.array(z.string().min(1).max(500)).max(50).default([]),
      mainPhoto: z.string().min(1).max(500).nullable().optional(),
      // The line-up answers (an invite for an event only).
      participation: z.enum(['confirmed', 'declined']).optional(),
      programmeOk: z.boolean().optional(),
      programmeNote: z.string().trim().max(2000).optional(),
      postsOk: z.boolean().optional(),
      message: z.string().trim().max(2000).optional(),
      // A venue's answer (an ask to host the event): can host · another date · can't.
      venueAnswer: z.enum(['confirmed', 'proposed', 'declined']).optional(),
      alternative: z.string().trim().max(500).optional(),
      terms: z.object({
        rent: z.string().trim().max(200).optional(),
        minSpend: z.string().trim().max(200).optional(),
        doorSplit: z.string().trim().max(200).optional(),
        deposit: z.string().trim().max(200).optional(),
        includes: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        capacity: z.number().int().min(1).max(100_000).nullable().optional(),
        notes: z.string().trim().max(2000).optional(),
      }).optional(),
      // An artist's terms, when theirs differ from the offer (or there's none).
      artistTerms: z.object({
        fee: z.string().trim().max(200).optional(),
        needs: z.string().trim().max(1000).optional(),
      }).optional(),
      address: z.string().trim().max(300).optional(),
      floorType: z.string().trim().max(60).optional(),
      // Where the answer goes in writing (not signed in; signed in = the account's).
      email: z.string().trim().toLowerCase().email().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { p: profile, canAnswer, invite, member } = await resolve(ctx, input)
      if (!canAnswer) throw new TRPCError({ code: 'FORBIDDEN', message: 'This page has an owner now. Sign in as them to answer.' })
      // Only the page's team (signed in) changes the page itself. Anyone else with
      // the link — it may have been forwarded — changes this event only: the name
      // and photo its flyer uses. Organizer suggestions wait for the team.
      const verified = member || !!ctx.isAdmin
      if (!verified) {
        const pageWide = ['bio', 'instagram', 'website', 'facebook', 'city', 'styles', 'address', 'floorType'].some(k => (input as any)[k] !== undefined)
          || input.removePhotos.length || input.addVideos.length || input.decisions.some(d => d.approve)
        if (pageWide) throw new TRPCError({ code: 'FORBIDDEN', message: 'Make the page yours first to change it.' })
      }
      if (invite?.kind === 'venue' && (input.venueAnswer || input.message !== undefined)) {
        await ctx.db.update(profileInvites).set({
          ...(input.venueAnswer ? { status: input.venueAnswer } : {}),
          alternative: input.venueAnswer === 'proposed' ? (input.alternative || null) : null,
          terms: input.venueAnswer && input.venueAnswer !== 'declined' ? (input.terms ?? null) : null,
          ...(input.message !== undefined ? { message: input.message || null } : {}),
          respondedAt: new Date(),
        }).where(eq(profileInvites.id, invite.id))
      } else if (invite && (input.participation || input.programmeOk !== undefined || input.postsOk !== undefined || input.message !== undefined || input.artistTerms)) {
        const terms = input.artistTerms && (input.artistTerms.fee || input.artistTerms.needs) ? input.artistTerms : null
        await ctx.db.update(profileInvites).set({
          ...(input.participation ? { status: input.participation } : {}),
          ...(input.participation === 'declined' ? { terms: null } : input.artistTerms ? { terms } : {}),
          ...(input.programmeOk !== undefined ? { programmeOk: input.programmeOk, programmeNote: input.programmeOk ? null : (input.programmeNote || null) } : {}),
          ...(input.postsOk !== undefined ? { postsOkAt: input.postsOk ? new Date() : null } : {}),
          ...(input.message !== undefined ? { message: input.message || null } : {}),
          respondedAt: new Date(),
        }).where(eq(profileInvites.id, invite.id))
      }
      const answered = invite && (invite.kind === 'venue' ? input.venueAnswer : input.participation)
      if (invite && answered) {
        // Who answered: the account when signed in (proven), else the address they left.
        const [me] = ctx.dancerId ? await ctx.db.select({ email: dancers.email }).from(dancers).where(eq(dancers.id, ctx.dancerId)) : [null]
        const email: string | null = me?.email ?? input.email ?? invite.answerEmail ?? null
        const newEmail = !!email && email !== invite.answerEmail
        const confirmed = !!me || (!newEmail && !!invite.emailConfirmedAt)
        await ctx.db.update(profileInvites).set({
          answerEmail: email,
          ...(me ? { answeredBy: ctx.dancerId, emailConfirmedAt: new Date() } : newEmail ? { emailConfirmedAt: null } : {}),
        }).where(eq(profileInvites.id, invite.id))
        const [fresh] = await ctx.db.select().from(profileInvites).where(eq(profileInvites.id, invite.id))
        const changed = answered !== invite.status
        const work = sendAnswerEmails(ctx, fresh, profile, {
          email, confirmed, flyerName: !verified && input.name ? input.name : '',
          resend: changed || newEmail, notifyOrganiser: changed,
        })
        if (ctx.waitUntil) ctx.waitUntil(work)
        else await work
        trackServer(ctx, 'invite_answered', { kind: invite.kind, answer: answered, changed, has_email: !!email, signed_in: !!me, member, has_terms: !!fresh?.terms, event_id: invite.eventId, ...profileGroup(profile.username) })
      }
      if (!verified) {
        // This event's flyer: their name as it should appear and the photo it uses.
        if (invite?.eventId && (input.name || input.mainPhoto !== undefined)) {
          const [e] = await ctx.db.select({ flyerOptions: events.flyerOptions }).from(events).where(eq(events.id, invite.eventId))
          const fo = { ...(e?.flyerOptions ?? {}) } as { names?: Record<string, string>; photos?: Record<string, string | null> }
          const h = profile.username as string
          if (input.name) {
            const names = { ...(fo.names ?? {}) }
            if (input.name === profile.name) delete names[h]
            else names[h] = input.name
            fo.names = names
          }
          if (input.mainPhoto) {
            // Their page's photos, the organizer's suggestions for them, or one they just uploaded to us.
            const [sugg] = await ctx.db.select({ id: profileSuggestions.id }).from(profileSuggestions)
              .where(and(eq(profileSuggestions.profileId, profile.id), eq(profileSuggestions.kind, 'photo'), eq(profileSuggestions.value, input.mainPhoto)))
            const own = input.mainPhoto === profile.photo || ((profile.photos ?? []) as { url: string }[]).some(x => x.url === input.mainPhoto)
            if (!own && !sugg && !input.mainPhoto.startsWith('https://res.cloudinary.com/')) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick one of the photos, or upload one.' })
          }
          if (input.mainPhoto !== undefined) {
            const photos = { ...(fo.photos ?? {}) }
            if (input.mainPhoto && input.mainPhoto === profile.photo) delete photos[h]
            else photos[h] = input.mainPhoto
            fo.photos = photos
          }
          await ctx.db.update(events).set({ flyerOptions: fo as any }).where(eq(events.id, invite.eventId))
        }
        return { saved: true, scope: 'event' as const }
      }
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
      let socials = p.socials ?? []
      for (const k of ['instagram', 'website', 'facebook'] as const) {
        if (input[k] !== undefined) socials = withSocial({ socials }, k, input[k]!)
      }
      if (['instagram', 'website', 'facebook'].some(k => (input as any)[k] !== undefined)) set.socials = socials
      if (input.city !== undefined && input.city !== (p.city ?? '')) { set.city = input.city || null; set.citySlug = await citySlugFor(ctx.db, input.city || null) }
      if (input.styles !== undefined) set.styles = input.styles
      if (input.address !== undefined) set.address = input.address || null
      if (input.floorType !== undefined) set.floorType = input.floorType || null
      if (input.removePhotos.length) {
        const photos = (p.photos ?? []).filter((x: any) => !input.removePhotos.includes(x.url))
        set.photos = photos
        if (input.removePhotos.includes(p.photo)) set.photo = photos[0]?.url ?? null
      }
      if (input.mainPhoto) set.photo = input.mainPhoto
      if (Object.keys(set).length) await ctx.db.update(profiles).set(set).where(eq(profiles.id, p.id))
      return { saved: true, scope: 'page' as const }
    }),

  // "That's me" from the answer email: the address is theirs. Marks the answer
  // confirmed, signs them in (creating the account the first time) and, while
  // nobody runs the page, makes it theirs — as answering and claiming would.
  confirmEmail: publicProcedure
    .input(z.object({ token: z.string().min(10).max(80), that: z.string().min(10).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const v = verifyAnswerEmail(input.that)
      const [invite] = await ctx.db.select().from(profileInvites).where(eq(profileInvites.token, input.token))
      if (!v || !invite || invite.id !== v.inviteId || invite.answerEmail !== v.email) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This confirmation link doesn’t work any more. Open your answer and save it again to get a new one.' })
      }
      const [p] = await ctx.db.select().from(profiles).where(eq(profiles.id, invite.profileId))
      if (!p) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found.' })
      let [d] = await ctx.db.select().from(dancers).where(eq(dancers.email, v.email))
      const isNew = !d
      if (!d) {
        ;[d] = await ctx.db.insert(dancers).values({ name: invite.kind === 'venue' ? v.email.split('@')[0] : p.name, email: v.email, emailVerifiedAt: new Date() }).returning()
      } else if (!d.emailVerifiedAt) {
        await ctx.db.update(dancers).set({ emailVerifiedAt: new Date() }).where(eq(dancers.id, d.id))
      }
      if (isNew) trackServer(ctx, 'signup_completed', { method: 'invite_email', has_city: false, via_link: false }, { distinctId: d.id })
      const first = !invite.emailConfirmedAt
      await ctx.db.update(profileInvites).set({ answeredBy: d.id, emailConfirmedAt: invite.emailConfirmedAt ?? new Date() }).where(eq(profileInvites.id, invite.id))
      let owner = await isMember(ctx.db, p.id, d.id)
      if (!owner && !(await hasTeam(ctx.db, p.id))) {
        await grant(ctx.db, p.id, d.id, 'owner', { by: invite.createdBy ?? null })
        await logAccess(ctx.db, { profileId: p.id, actorId: d.id, subjectId: d.id, action: 'approved', role: 'owner', note: 'Confirmed their answer to an organizer’s invite from their email.' })
        trackServer(ctx, 'profile_claimed', { profile: p.username, via: 'invite_email', ...profileGroup(p.username) }, { distinctId: d.id })
        owner = true
      }
      if (first) trackServer(ctx, 'invite_email_confirmed', { kind: invite.kind, answer: invite.status, new_account: isNew, owner, event_id: invite.eventId, ...profileGroup(p.username) }, { distinctId: d.id })
      return { ...(await createSession(ctx.db, d)), isNew, owner, username: p.username }
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
      // Taken over through a connected app: that app may run it right away (#447).
      await addProfileToOwnGrant(ctx, p.id)
      trackServer(ctx, 'profile_claimed', { profile: p.username, via: 'invite', ...profileGroup(p.username) })
      return { username: p.username, owner: true }
    }),
})
