import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { dancers, events, profileContacts, profileSites, profileSiteVersions } from '../../database/schema'
import { profileSiteSchema, type ProfileSite } from '../../../shared/types/profileSite'
import { requireMember } from './business'
import { profileGroup, trackServer } from '../../utils/posthog'
import { MAX_SITE_VERSIONS, siteVersion, writeSite } from '../../utils/siteVersions'
import { TRPCError } from '@trpc/server'
import { sitePreviewToken } from '../../utils/sitePreview'
import { SITE_PREVIEW_TTL_S, hostedSiteUrl } from '../../../shared/utils/hostedSite'
import { isPublished } from '../../../shared/types/profileSite'
import { loadContactActivity, loadPageEvents, activityFor } from '../../utils/contactActivity'
import { audienceOnly, contactSegments, contactSourceKey, emailBlock, sourceLabelFor, SOURCE_LABEL } from '../../../shared/utils/contactSegments'

/**
 * A profile's website and contacts, managed on WeDance (RAZ-412):
 * /business/network/<username>/website edits the page (sections, words in
 * every language, the welcome email), /business/network/<username>/contacts
 * lists who signed up on it. The site reads /api/profiles/<username>/site.
 */
// A new site starts as a draft: it's public only once its team presses Publish.
const blank = (): ProfileSite => ({ locales: ['en'], sections: [], published: false })

export const businessSiteRouter = router({
  get: protectedProcedure.input(z.object({ username: z.string().min(1) })).query(async ({ ctx, input }) => {
    const p = await requireMember(ctx, input.username)
    const [row] = await ctx.db.select().from(profileSites).where(eq(profileSites.profileId, p.id))
    const contact = ((p as any).contact ?? {}) as { email?: string; phone?: string }
    return {
      profile: { username: p.username, name: p.name },
      site: (row?.content as ProfileSite | undefined) ?? blank(),
      exists: !!row,
      updatedAt: row?.updatedAt ?? null,
      /** Where WeDance hosts it. */
      hostedUrl: hostedSiteUrl(p.username),
      /** What the page already knows, to fill the site's legal details from. */
      legalHints: { name: p.name ?? '', address: (p as any).address ?? '', email: contact.email ?? '', phone: contact.phone ?? '' },
    }
  }),

  save: protectedProcedure
    .input(z.object({ username: z.string().min(1), site: profileSiteSchema }))
    .mutation(async ({ ctx, input }) => {
      const p = await requireMember(ctx, input.username)
      const site = input.site as ProfileSite
      const r = await writeSite(ctx, p.id, site)
      if (!r.unchanged) trackServer(ctx, 'site_saved', { profile: p.username, profile_type: p.type, first_save: r.firstSave, sections: site.sections?.length ?? 0, locales: site.locales?.length ?? 0, restored: false, ...profileGroup(p.username) })
      return { updatedAt: r.updatedAt, unchanged: r.unchanged, versionId: r.versionId, summary: r.summary }
    }),

  // Version history (0062): newest first, without the content.
  history: protectedProcedure
    .input(z.object({ username: z.string().min(1), limit: z.number().int().min(1).max(MAX_SITE_VERSIONS).default(50) }))
    .query(async ({ ctx, input }) => {
      const p = await requireMember(ctx, input.username)
      const rows = await ctx.db.select({
        id: profileSiteVersions.id, savedAt: profileSiteVersions.savedAt, via: profileSiteVersions.via, clientApp: profileSiteVersions.clientApp,
        summary: profileSiteVersions.summary, restoredFrom: profileSiteVersions.restoredFrom, byName: dancers.name, byId: profileSiteVersions.savedBy,
      }).from(profileSiteVersions).leftJoin(dancers, eq(dancers.id, profileSiteVersions.savedBy))
        .where(eq(profileSiteVersions.profileId, p.id)).orderBy(desc(profileSiteVersions.savedAt)).limit(input.limit)
      return {
        profile: { username: p.username, name: p.name },
        versions: rows.map((r: any, i: number) => ({ ...r, by: r.byId ? { id: r.byId, name: r.byName ?? 'Someone' } : null, byId: undefined, byName: undefined, current: i === 0 })),
      }
    }),

  /** One version's full content (to look at it before restoring). */
  version: protectedProcedure
    .input(z.object({ username: z.string().min(1), id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const p = await requireMember(ctx, input.username)
      const v = await siteVersion(ctx.db, p.id, input.id)
      if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'No such version of this website.' })
      return { id: v.id, savedAt: v.savedAt, summary: v.summary, site: v.content as ProfileSite }
    }),

  /** Put an earlier version live again — saved as a new version, so it can be undone too. */
  restore: protectedProcedure
    .input(z.object({ username: z.string().min(1), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const p = await requireMember(ctx, input.username)
      const v = await siteVersion(ctx.db, p.id, input.id)
      if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'No such version of this website.' })
      const site = v.content as ProfileSite
      const r = await writeSite(ctx, p.id, site, { restoredFrom: v.id })
      if (!r.unchanged) trackServer(ctx, 'site_saved', { profile: p.username, profile_type: p.type, first_save: false, sections: site.sections?.length ?? 0, locales: site.locales?.length ?? 0, restored: true, ...profileGroup(p.username) })
      return { updatedAt: r.updatedAt, unchanged: r.unchanged, versionId: r.versionId, restoredFrom: v.id, summary: r.summary }
    }),

  /**
   * Where the site lives on WeDance (sites.wedance.vip/<handle>) and a link
   * that shows it even while it's a draft — for the page's team, valid 7 days.
   */
  previewLink: protectedProcedure.input(z.object({ username: z.string().min(1) })).query(async ({ ctx, input }) => {
    const p = await requireMember(ctx, input.username)
    const [row] = await ctx.db.select({ content: profileSites.content }).from(profileSites).where(eq(profileSites.profileId, p.id))
    const token = sitePreviewToken(p.id)
    const url = hostedSiteUrl(p.username)
    return {
      url,
      previewUrl: `${url}?preview=${encodeURIComponent(token)}`,
      published: row ? isPublished(row.content as any) : false,
      exists: !!row,
      expiresAt: new Date(Date.now() + SITE_PREVIEW_TTL_S * 1000),
    }
  }),

  contacts: protectedProcedure.input(z.object({ username: z.string().min(1) })).query(async ({ ctx, input }) => {
    const p = await requireMember(ctx, input.username)
    return ctx.db.select().from(profileContacts).where(eq(profileContacts.profileId, p.id)).orderBy(desc(profileContacts.createdAt)).limit(2000)
  }),

  /**
   * The Contacts page (RAZ-949): every contact with its source segment, whether
   * the page may email it, its account and its WeDance activity around the
   * page's events, plus the segment counts — computed here so they stay right
   * past the 2000-row list.
   *
   * One audience (RAZ-963): `contacts` also holds everyone else connected to the
   * page — followers and people who went / are going to its events — once each,
   * as `isContact: false` rows. Like the event's "Who's coming" (`rsvp.people`),
   * organisers see their name, photo, handle and city whatever their attendee
   * visibility; never an email or phone, and they can't be mailed.
   */
  contactsOverview: protectedProcedure.input(z.object({ username: z.string().min(1) })).query(async ({ ctx, input }) => {
    const p = await requireMember(ctx, input.username)
    const [rows, act, pageEvents] = await Promise.all([
      ctx.db.select({
        id: profileContacts.id, email: profileContacts.email, name: profileContacts.name, phone: profileContacts.phone,
        locale: profileContacts.locale, source: profileContacts.source, note: profileContacts.note, status: profileContacts.status, bouncedAt: profileContacts.bouncedAt,
        createdAt: profileContacts.createdAt, dancerId: profileContacts.dancerId,
        accountName: dancers.name, accountPhoto: dancers.photo, accountUsername: dancers.username, accountCity: dancers.city,
      }).from(profileContacts).leftJoin(dancers, eq(dancers.id, profileContacts.dancerId))
        .where(eq(profileContacts.profileId, p.id)).orderBy(desc(profileContacts.createdAt)),
      loadContactActivity(ctx.db, { id: p.id, username: p.username }),
      loadPageEvents(ctx.db, { id: p.id, username: p.username }),
    ])
    // The event a sign-up / poll contact came through, by name (RAZ-1074): "Signed up for La Timberia".
    const eventIds = [...new Set<string>(rows.map((r: any) => r.source?.event).filter((id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))]
    const eventNames = new Map<string, string>(eventIds.length
      ? (await ctx.db.select({ id: events.id, name: events.name }).from(events).where(inArray(events.id, eventIds))).map((e: any) => [e.id, e.name])
      : [])
    const contacts = rows.map((r: any) => {
      const sourceKey = contactSourceKey(r.source)
      return {
        id: r.id, email: r.email, name: r.name, phone: r.phone, locale: r.locale, source: r.source as Record<string, string>,
        note: r.note, status: r.status as 'subscribed' | 'unsubscribed', bouncedAt: (r.bouncedAt as Date | null) ?? null, createdAt: r.createdAt as Date | null,
        sourceKey, sourceLabel: sourceLabelFor(sourceKey, eventNames.get(r.source?.event)),
        emailBlock: emailBlock(r),
        isContact: true,
        dancerId: (r.dancerId as string | null) ?? null,
        hasAccount: !!r.dancerId,
        account: r.dancerId ? { name: r.accountName as string | null, photo: r.accountPhoto as string | null, username: r.accountUsername as string | null, city: r.accountCity as string | null } : null,
        activity: activityFor(act.byDancer, r.dancerId),
      }
    })
    const contactDancers = new Set<string>(rows.map((r: any) => r.dancerId).filter(Boolean))
    const otherIds = audienceOnly(act.byDancer, contactDancers)
    const otherPeople: any[] = otherIds.length
      ? await ctx.db.select({ id: dancers.id, name: dancers.name, photo: dancers.photo, username: dancers.username, city: dancers.city })
          .from(dancers).where(inArray(dancers.id, otherIds))
      : []
    const others: typeof contacts = otherPeople.map((d) => {
      const activity = activityFor(act.byDancer, d.id)
      return {
        id: `dancer:${d.id}`, email: '', name: d.name ?? null, phone: null, locale: null, source: {} as Record<string, string>,
        note: null, status: 'subscribed' as const, bouncedAt: null, createdAt: activity.followedAt ? new Date(activity.followedAt) : null,
        sourceKey: 'wedance' as const, sourceLabel: SOURCE_LABEL.wedance,
        emailBlock: 'not_a_contact' as const,
        isContact: false,
        dancerId: d.id as string,
        hasAccount: true,
        account: { name: d.name ?? null, photo: d.photo ?? null, username: d.username ?? null, city: d.city ?? null },
        activity,
      }
    })
    // Who's been around most recently first: going next, then the last time they came.
    others.sort((a, b) => (a.activity.upcoming[0]?.startDate ?? '9').localeCompare(b.activity.upcoming[0]?.startDate ?? '9')
      || (b.activity.lastEventAt ?? '').localeCompare(a.activity.lastEventAt ?? ''))
    const followersNotContacts = others.filter(o => o.activity.follows).length
    return {
      profile: { username: p.username, name: p.name, type: p.type },
      segments: contactSegments([...contacts, ...others]),
      followers: { total: act.followers, notContacts: followersNotContacts },
      // For the event filter: who signed up, contacts or not ("12 coming · 5 in your contacts").
      events: pageEvents,
      // The list stays capped; the counts above cover everyone.
      contacts: [...contacts.slice(0, 2000), ...others.slice(0, 2000)],
      truncated: contacts.length > 2000 || others.length > 2000,
    }
  }),

  updateContact: protectedProcedure
    .input(z.object({ username: z.string().min(1), id: z.string().uuid(), note: z.string().max(2000).optional(), status: z.enum(['subscribed', 'unsubscribed']).optional() }))
    .mutation(async ({ ctx, input }) => {
      const p = await requireMember(ctx, input.username)
      await ctx.db.update(profileContacts)
        .set({ ...(input.note !== undefined ? { note: input.note } : {}), ...(input.status ? { status: input.status } : {}), updatedAt: new Date() })
        .where(and(eq(profileContacts.id, input.id), eq(profileContacts.profileId, p.id)))
      return { ok: true }
    }),

  removeContact: protectedProcedure
    .input(z.object({ username: z.string().min(1), id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const p = await requireMember(ctx, input.username)
      await ctx.db.delete(profileContacts).where(and(eq(profileContacts.id, input.id), eq(profileContacts.profileId, p.id)))
      return { ok: true }
    }),
})
