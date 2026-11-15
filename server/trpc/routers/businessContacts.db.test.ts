import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '..'

// The Contacts page's segments + activity (RAZ-949) against a real Postgres (local only):
//   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance NEON_FETCH_ENDPOINT=http://localhost:4444/sql bunx vitest run server/trpc/routers/businessContacts.db.test.ts
const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000', resendApiKey: '' }))

const tag = `contacts${Date.now()}`
const ids = {} as Record<'owner' | 'regular' | 'fan' | 'stranger', string>
const page = {} as { id: string, username: string }
const eventIds: string[] = []
const web = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false, origin: 'https://wedance.test' } as any)
const day = (n: number) => new Date(Date.now() + n * 86_400_000)

describe.skipIf(!DATABASE_URL)('businessSite.contactsOverview (DB)', () => {
  beforeAll(async () => {
    const rows = await db.insert(schema.dancers).values([
      { email: `${tag}-owner@test.local`, name: 'Owner' },
      { email: `${tag}-regular@test.local`, name: 'Rita Regular' },
      { email: `${tag}-fan@test.local`, name: 'Fan' },
      { email: `${tag}-stranger@test.local`, name: 'Stranger' },
    ]).returning({ id: schema.dancers.id })
    ;[ids.owner, ids.regular, ids.fan, ids.stranger] = rows.map((r: any) => r.id)
    const { username } = await web(ids.owner).business.create({ type: 'organizer', name: `Contacts School ${tag}`, city: 'Munich' })
    const [p] = await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.username, username))
    Object.assign(page, { id: p.id, username })

    // Three past nights + one coming up, all run by the page; one event of another page.
    const evs = await db.insert(schema.events).values([
      { name: 'Night 1', startDate: day(-60), hostProfileId: page.id },
      { name: 'Night 2', startDate: day(-30), organizerUsername: username },
      { name: 'Night 3', startDate: day(-7), hostProfileId: page.id },
      { name: 'Next night', startDate: day(6), hostProfileId: page.id },
      { name: 'Someone else', startDate: day(-3) },
    ]).returning({ id: schema.events.id })
    eventIds.push(...evs.map((e: any) => e.id))
    const [n1, n2, n3, next, other] = eventIds
    await db.insert(schema.attendances).values([
      { eventId: n1, dancerId: ids.regular, status: 'going' },
      { eventId: n2, dancerId: ids.regular, status: 'interested', checkedInAt: day(-30) },
      { eventId: other, dancerId: ids.regular, status: 'going' }, // not this page's
    ])
    await db.insert(schema.eventRsvps).values([
      { eventId: n3, dancerId: ids.regular, answer: 'yes', confirmedAt: new Date() },
      { eventId: next, dancerId: ids.regular, answer: 'needLeader', confirmedAt: new Date() },
    ])
    await db.insert(schema.follows).values([{ dancerId: ids.fan, profileId: page.id }, { dancerId: ids.stranger, profileId: page.id }])
    await db.insert(schema.profileContacts).values([
      { profileId: page.id, dancerId: ids.regular, email: `${tag}-regular@test.local`, source: { form: 'school.test' } },
      { profileId: page.id, dancerId: ids.fan, email: `${tag}-fan@test.local`, source: { from: 'hubspot', hubspot_origin: 'import', form: 'HubSpot · imported list' } },
      { profileId: page.id, email: `${tag}-wv@test.local`, source: { from: 'wedance-v3', form: 'WeDance v3 · subscribers' } },
      { profileId: page.id, email: `${tag}-gone@test.local`, source: { from: 'hubspot', hubspot_origin: 'form' }, status: 'unsubscribed' },
    ])
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    if (page.id) {
      await db.delete(schema.follows).where(eq(schema.follows.profileId, page.id))
      await db.delete(schema.profiles).where(eq(schema.profiles.id, page.id))
    }
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, Object.values(ids)))
  })

  it('counts sources and who can be emailed, and shows each account’s activity on this page only', async () => {
    const r = await web(ids.owner).businessSite.contactsOverview({ username: page.username })
    // 4 contacts + the stranger, who follows the page without being a contact (RAZ-963).
    expect(r.segments.total).toBe(5)
    expect(r.segments.contacts).toBe(4)
    expect(r.segments.others).toBe(1)
    expect(Object.fromEntries(r.segments.sources.map(s => [s.key, s.count]))).toEqual({ website: 1, hubspot_import: 1, wedance_v3: 1, hubspot_form: 1, wedance: 1 })
    expect(r.segments.canEmail).toBe(1)
    expect(r.segments.blocked).toEqual({ unsubscribed: 1, not_opted_in: 2, not_a_contact: 1 })
    const stranger = r.contacts.find(c => c.dancerId === ids.stranger)!
    expect(stranger).toMatchObject({ isContact: false, email: '', phone: null, emailBlock: 'not_a_contact' })
    expect(stranger.account?.name).toBe('Stranger')
    expect(stranger.activity.follows).toBe(true)
    expect(r.followers).toEqual({ total: 2, notContacts: 1 })

    const rita = r.contacts.find(c => c.email.startsWith(`${tag}-regular`))!
    expect(rita.account?.name).toBe('Rita Regular')
    expect(rita.emailBlock).toBeNull()
    expect(rita.activity.wentTo).toBe(3) // Night 1 going, Night 2 checked in, Night 3 RSVP — not the other page's
    expect(rita.activity.checkedIn).toBe(1)
    expect(rita.activity.upcoming.map(e => e.name)).toEqual(['Next night'])
    expect(r.segments.activity.regular).toBe(1)
    expect(r.segments.activity.going).toBe(1)
    expect(r.segments.activity.follows).toBe(2)

    const fan = r.contacts.find(c => c.email.startsWith(`${tag}-fan`))!
    expect(fan.emailBlock).toBe('not_opted_in')
    expect(fan.activity.follows).toBe(true)
  })

  it('is only for the page’s team', async () => {
    await expect(web(ids.stranger).businessSite.contactsOverview({ username: page.username })).rejects.toThrow()
  })
})
