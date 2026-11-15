import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '..'
import { occasionsFor } from '../../../shared/utils/cityOccasions'
import { eventLocalDate, zonedToUtc } from '../../../shared/utils/eventTime'

// City occasions (RAZ-970, 0070) against a real Postgres (local / CI only):
//   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance NEON_FETCH_ENDPOINT=http://localhost:4444/sql bunx vitest run server/trpc/routers/cityOccasions.db.test.ts
const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000', resendApiKey: '' }))

const tag = `co${Date.now()}`
const city = `${tag}-burg`
const ids = {} as Record<'admin' | 'cityAdmin' | 'organiser' | 'stranger', string>
const pages: { id: string; username: string }[] = []
const eventIds: string[] = []
let cityRowId: string
const as = (dancerId: string, isAdmin = false) => appRouter.createCaller({ db, dancerId, isAdmin, origin: 'https://wedance.test' } as any)

// The next New Year's Eve and silent day of a Bavarian city, from today.
const today = eventLocalDate(new Date(), 'Europe/Berlin')
const all = occasionsFor({ citySlug: city, countryCode: 'DE', region: 'Bavaria' }, today)
const nye = all.find(o => o.id === 'new-years-eve')!
const silent = all.find(o => o.kind === 'silent')!

describe.skipIf(!DATABASE_URL)('city occasions (DB)', () => {
  beforeAll(async () => {
    const [c] = await db.insert(schema.cities).values({ googlePlaceId: `${tag}-place`, slug: city, name: 'Testburg', countryCode: 'DE', region: 'Bavaria' }).returning({ id: schema.cities.id })
    cityRowId = c.id
    const rows = await db.insert(schema.dancers).values([
      { email: `${tag}-admin@test.local`, name: 'Ada Admin' },
      { email: `${tag}-city@test.local`, name: 'Carla City' },
      { email: `${tag}-org@test.local`, name: 'Olga Organiser' },
      { email: `${tag}-stranger@test.local`, name: 'Sam Stranger' },
    ]).returning({ id: schema.dancers.id })
    ;[ids.admin, ids.cityAdmin, ids.organiser, ids.stranger] = rows.map((r: any) => r.id)
    for (const [who, name] of [[ids.admin, `WeDance ${tag}`], [ids.organiser, `Salsa ${tag}`]] as const) {
      const { username } = await as(who).business.create({ type: 'organizer', name, city: 'Munich' })
      const [p] = await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.username, username))
      pages.push({ id: p.id, username })
    }
    await as(ids.admin, true).cityChannels.setCityPage({ citySlug: city, username: pages[0]!.username })
    await as(ids.admin, true).cityChannels.addAdmin({ citySlug: city, who: `${tag}-city@test.local` })
    const evs = await db.insert(schema.events).values([
      { name: `${tag} NYE Gala`, type: 'Party', startDate: zonedToUtc(nye.start, '21:00', 'Europe/Berlin'), citySlug: city, timezone: 'Europe/Berlin', venueName: 'Ballroom', organizerUsername: pages[1]!.username, published: true, archived: false },
      { name: `${tag} Weekly Course`, type: 'Course', startDate: zonedToUtc(nye.start, '19:00', 'Europe/Berlin'), citySlug: city, timezone: 'Europe/Berlin', organizerUsername: pages[1]!.username, published: true, archived: false },
    ]).returning({ id: schema.events.id })
    eventIds.push(...evs.map((e: any) => e.id))
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(schema.cityOccasionPosts).where(eq(schema.cityOccasionPosts.citySlug, city))
    await db.delete(schema.cityPages).where(eq(schema.cityPages.citySlug, city))
    if (eventIds.length) await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    if (pages.length) await db.delete(schema.profiles).where(inArray(schema.profiles.id, pages.map(p => p.id)))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, Object.values(ids)))
    if (cityRowId) await db.delete(schema.cities).where(eq(schema.cities.id, cityRowId))
  })

  it('shows the plan to city admins only', async () => {
    await expect(as(ids.stranger).cityOccasions.plan({ citySlug: city })).rejects.toThrow(/city’s WeDance admins/)
    const plan = await as(ids.cityAdmin).cityOccasions.plan({ citySlug: city })
    expect(plan.months).toHaveLength(12)
    const items = plan.months.flatMap(m => m.occasions)
    expect(items.find(i => i.key === nye.key)).toMatchObject({ status: 'todo', kind: 'party' })
    expect(items.some(i => i.kind === 'silent')).toBe(true)
  })

  it('writes the Tanzverbot post in the chosen languages', async () => {
    const me = as(ids.cityAdmin)
    let p = await me.cityOccasions.get({ citySlug: city, key: silent.key })
    expect(p.langs).toEqual(['en'])
    expect(p.text).toContain('What is Tanzverbot?')
    await me.cityOccasions.save({ citySlug: city, key: silent.key, langs: ['en', 'ru'] })
    p = await me.cityOccasions.get({ citySlug: city, key: silent.key })
    expect(p.text).toContain('Что такое Tanzverbot?')
    expect(p.textEdited).toBe(false)
    await me.cityOccasions.save({ citySlug: city, key: silent.key, text: 'My own words about the silent day.' })
    expect((await me.cityOccasions.get({ citySlug: city, key: silent.key })).textEdited).toBe(true)
    await me.cityOccasions.save({ citySlug: city, key: silent.key, text: null })
    expect((await me.cityOccasions.get({ citySlug: city, key: silent.key })).text).toContain('Что такое')
    const plan = await me.cityOccasions.plan({ citySlug: city })
    expect(plan.months.flatMap(m => m.occasions).find(i => i.key === silent.key)?.status).toBe('draft')
  })

  it('lists the city’s parties for New Year’s Eve, not its courses', async () => {
    const p = await as(ids.cityAdmin).cityOccasions.get({ citySlug: city, key: nye.key })
    expect(p.text).toContain(`${tag} NYE Gala · Ballroom`)
    expect(p.text).not.toContain('Weekly Course')
    expect(p.events).toBe(1)
  })

  it('refuses occasions that aren’t on this city’s plan', async () => {
    await expect(as(ids.cityAdmin).cityOccasions.get({ citySlug: city, key: 'nope:2026' })).rejects.toThrow(/plan/)
  })

  it('asks the city’s organisers once, without showing their emails', async () => {
    const me = as(ids.cityAdmin)
    const o = await me.cityOccasions.organisers({ citySlug: city, key: nye.key })
    expect(JSON.stringify(o)).not.toContain('@test.local')
    const org = o.pages.find(p => p.username === pages[1]!.username)!
    expect(org).toMatchObject({ events: 2, reachable: true, asked: false })
    expect(o.pages.some(p => p.username === pages[0]!.username)).toBe(false) // not the city page itself
    const r = await me.cityOccasions.ask({ citySlug: city, key: nye.key, profileIds: [org.id], message: o.message })
    expect(r).toEqual({ pages: 1, emails: 1 })
    await expect(me.cityOccasions.ask({ citySlug: city, key: nye.key, profileIds: [org.id], message: o.message })).rejects.toThrow(/already asked/)
    const [row] = await db.select().from(schema.cityOccasionPosts).where(and(eq(schema.cityOccasionPosts.citySlug, city), eq(schema.cityOccasionPosts.occasionKey, nye.key)))
    expect(row.askedProfiles).toEqual([org.id])
    const plan = await me.cityOccasions.plan({ citySlug: city })
    expect(plan.months.flatMap(m => m.occasions).find(i => i.key === nye.key)?.status).toBe('asked')
  })

  it('doesn’t let apps post or send', async () => {
    const app = appRouter.createCaller({ db, dancerId: ids.cityAdmin, isAdmin: false, scopes: ['events:write'], origin: 'https://wedance.test' } as any)
    await expect(app.cityOccasions.publishTelegram({ citySlug: city, key: silent.key })).rejects.toThrow(/connected apps|WeDance itself/)
  })
})
