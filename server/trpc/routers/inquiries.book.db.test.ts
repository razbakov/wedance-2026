/**
 * A yes on a booking request becomes a draft event and a confirmed line-up
 * place (RAZ-1089). Postgres only (server/test-setup.ts).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import * as schema from '../../database/schema'
import { appRouter } from '../index'
import { remindBookingInquiries } from '../../utils/bookingReminders'

vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000', resendApiKey: '' }))

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const ids: Record<string, string> = {}
const caller = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)

describe.skipIf(!DATABASE_URL)('booking yes (RAZ-1089)', () => {
  beforeAll(async () => {
    for (const key of ['artist', 'asker']) {
      const [d] = await db.insert(schema.dancers).values({ email: `${key}-${RUN}@test.wedance.local`, name: `${key} ${RUN}` }).returning({ id: schema.dancers.id })
      ids[key] = d.id
    }
    const [org] = await db.insert(schema.profiles).values({ username: `host-${RUN}`, name: `Host ${RUN}`, type: 'organizer', claimed: true, city: 'Munich' }).returning({ id: schema.profiles.id })
    const [artist] = await db.insert(schema.profiles).values({ username: `band-${RUN}`, name: `Band ${RUN}`, type: 'artist', claimed: true, styles: ['Salsa'] }).returning({ id: schema.profiles.id })
    ids.org = org.id
    ids.artist = artist.id
    await db.insert(schema.profileMembers).values([
      { profileId: ids.org, dancerId: ids.asker, role: 'owner' },
      { profileId: ids.artist, dancerId: ids.artist, role: 'owner' },
    ])
    const [ask] = await db.insert(schema.bookingInquiries).values({
      profileId: ids.artist, requesterId: ids.asker, askerProfileId: ids.org,
      name: 'Ada', email: `ada-${RUN}@test.wedance.local`, organization: `Host ${RUN}`,
      what: 'Show', eventDate: '2026-12-01', city: 'Munich', guests: 80, budget: '€800',
      message: 'We would like the band for our party.',
    }).returning({ id: schema.bookingInquiries.id })
    ids.ask = ask.id
    const [loose] = await db.insert(schema.bookingInquiries).values({
      profileId: ids.artist, name: 'No Page', email: `loose-${RUN}@test.wedance.local`,
      what: 'Private event', message: 'A small party at home, please.',
    }).returning({ id: schema.bookingInquiries.id })
    ids.loose = loose.id
    const [no] = await db.insert(schema.bookingInquiries).values({
      profileId: ids.artist, name: 'No', email: `no-${RUN}@test.wedance.local`,
      what: 'Show', message: 'Another night, if you can.', status: 'declined',
    }).returning({ id: schema.bookingInquiries.id })
    ids.no = no.id
    const old = new Date(Date.now() - 4 * 24 * 3600_000)
    const [wait] = await db.insert(schema.bookingInquiries).values({
      profileId: ids.artist, name: 'Waiting', email: `wait-${RUN}@test.wedance.local`,
      what: 'DJ set', message: 'Friday if you are free that week.', createdAt: old,
    }).returning({ id: schema.bookingInquiries.id })
    ids.wait = wait.id
  })

  afterAll(async () => {
    if (!db || !ids.artist) return
    const inquiries = [ids.ask, ids.loose, ids.no, ids.wait].filter(Boolean)
    const evs = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.hostProfileId, ids.org))
    if (evs.length) {
      await db.delete(schema.profileInvites).where(inArray(schema.profileInvites.eventId, evs.map((e: { id: string }) => e.id)))
      await db.delete(schema.events).where(inArray(schema.events.id, evs.map((e: { id: string }) => e.id)))
    }
    await db.delete(schema.bookingInquiries).where(inArray(schema.bookingInquiries.id, inquiries))
    await db.delete(schema.profileMembers).where(inArray(schema.profileMembers.profileId, [ids.org, ids.artist]))
    await db.delete(schema.profiles).where(inArray(schema.profiles.id, [ids.org, ids.artist]))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, [ids.artist, ids.asker]))
  })

  it('turns a yes into a draft on the asker’s page, with the artist confirmed and the budget as the offer', async () => {
    const res = await caller(ids.artist).inquiries.book({ username: `band-${RUN}`, id: ids.ask })
    expect(res.emailed).toBe(true)
    expect(res.created).toBe(true)
    const [ev] = await db.select().from(schema.events).where(eq(schema.events.id, res.eventId))
    expect(ev).toMatchObject({
      hostProfileId: ids.org, published: false, archived: false, price: '€800', type: 'Show',
      artists: [`band-${RUN}`], source: 'booking-inquiry',
    })
    expect(ev.name).toBe(`Show · Band ${RUN}`)
    const [inv] = await db.select().from(schema.profileInvites).where(and(eq(schema.profileInvites.eventId, ev.id), eq(schema.profileInvites.profileId, ids.artist)))
    expect(inv.status).toBe('confirmed')
    expect((inv.request as { offer?: string }).offer).toBe('€800')
    const again = await caller(ids.artist).inquiries.book({ username: `band-${RUN}`, id: ids.ask })
    expect(again.eventId).toBe(res.eventId)
    expect(again.created).toBe(false)
    const rows = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.hostProfileId, ids.org))
    expect(rows).toHaveLength(1)
  })

  it('saves a yes when the asker has no page, and refuses a decline', async () => {
    const res = await caller(ids.artist).inquiries.book({ username: `band-${RUN}`, id: ids.loose })
    expect(res.eventId).toBeNull()
    expect(res.emailed).toBe(true)
    await expect(caller(ids.artist).inquiries.book({ username: `band-${RUN}`, id: ids.no })).rejects.toBeInstanceOf(TRPCError)
  })

  it('reminds an unanswered request once, after three days', async () => {
    const run = await remindBookingInquiries(db, { siteUrl: 'http://localhost:3000' })
    expect(run.reminded.map(r => r.inquiryId)).toContain(ids.wait)
    const [row] = await db.select({ remindedAt: schema.bookingInquiries.remindedAt }).from(schema.bookingInquiries).where(eq(schema.bookingInquiries.id, ids.wait))
    expect(row.remindedAt).toBeTruthy()
    const again = await remindBookingInquiries(db, { siteUrl: 'http://localhost:3000' })
    expect(again.reminded.map(r => r.inquiryId)).not.toContain(ids.wait)
  })
})
