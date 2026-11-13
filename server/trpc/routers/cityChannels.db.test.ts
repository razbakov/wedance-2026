import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '..'
import { shiftWeek, weekStartOf } from '../../../shared/utils/citySchedule'
import { zonedToUtc } from '../../../shared/utils/eventTime'

// City channels (0067) against a real Postgres (local only):
//   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance NEON_FETCH_ENDPOINT=http://localhost:4444/sql bunx vitest run server/trpc/routers/cityChannels.db.test.ts
const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000', resendApiKey: '' }))

const tag = `cc${Date.now()}`
const city = `${tag}-town`
const ids = {} as Record<'admin' | 'cityAdmin' | 'dancer' | 'stranger', string>
let page: { id: string; username: string }
const eventIds: string[] = []
const as = (dancerId: string, isAdmin = false) => appRouter.createCaller({ db, dancerId, isAdmin, origin: 'https://wedance.test' } as any)
const week = shiftWeek(weekStartOf(new Date(), 'Europe/Berlin'), 1)
const at = (day: number, hhmm: string) => zonedToUtc(new Date(Date.parse(`${week}T12:00:00Z`) + day * 86400_000).toISOString().slice(0, 10), hhmm, 'Europe/Berlin')

describe.skipIf(!DATABASE_URL)('city channels (DB)', () => {
  beforeAll(async () => {
    const rows = await db.insert(schema.dancers).values([
      { email: `${tag}-admin@test.local`, name: 'Ada Admin' },
      { email: `${tag}-city@test.local`, name: 'Carla City' },
      { email: `${tag}-dancer@test.local`, name: 'Dana Dancer' },
      { email: `${tag}-stranger@test.local`, name: 'Sam Stranger' },
    ]).returning({ id: schema.dancers.id })
    ;[ids.admin, ids.cityAdmin, ids.dancer, ids.stranger] = rows.map((r: any) => r.id)
    const { username } = await as(ids.admin).business.create({ type: 'organizer', name: `WeDance ${tag}`, city: 'Munich' })
    const [p] = await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.username, username))
    page = { id: p.id, username }
    const evs = await db.insert(schema.events).values([
      { name: `${tag} Friday Party`, type: 'Party', startDate: at(4, '21:00'), citySlug: city, timezone: 'Europe/Berlin', venueName: 'Club', published: true, archived: false },
      { name: `${tag} Monday Course`, type: 'Course', startDate: at(0, '19:00'), citySlug: city, timezone: 'Europe/Berlin', published: true, archived: false },
      { name: `${tag} Draft`, type: 'Party', startDate: at(5, '21:00'), citySlug: city, published: false, archived: false },
    ]).returning({ id: schema.events.id })
    eventIds.push(...evs.map((e: any) => e.id))
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(schema.citySchedules).where(eq(schema.citySchedules.citySlug, city))
    await db.delete(schema.communityGroups).where(eq(schema.communityGroups.citySlug, city))
    await db.delete(schema.cityPages).where(eq(schema.cityPages.citySlug, city))
    if (eventIds.length) await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    if (page) await db.delete(schema.profiles).where(eq(schema.profiles.id, page.id))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, Object.values(ids)))
  })

  it('an admin makes a page the city page and adds a city admin; others can’t', async () => {
    await expect(as(ids.stranger).cityChannels.setCityPage({ citySlug: city, username: page.username })).rejects.toThrow(/Admin/)
    await as(ids.admin, true).cityChannels.setCityPage({ citySlug: city, username: page.username })
    const added = await as(ids.admin, true).cityChannels.addAdmin({ citySlug: city, who: `${tag}-city@test.local` })
    expect(added).toMatchObject({ name: 'Carla City', role: 'editor', already: false })
    // The page's creator is its owner: adding them as editor never demotes them.
    expect(await as(ids.admin, true).cityChannels.addAdmin({ citySlug: city, who: `${tag}-admin@test.local`, role: 'editor' })).toMatchObject({ role: 'owner', already: true })

    expect(await as(ids.cityAdmin).cityChannels.forPage({ username: page.username })).toMatchObject({ citySlug: city })
    expect(await as(ids.stranger).cityChannels.forPage({ username: page.username })).toBeNull()
    expect((await as(ids.cityAdmin).cityChannels.mine()).map(c => c.citySlug)).toContain(city)
    const row = (await as(ids.admin, true).cityChannels.overview()).find(r => r.citySlug === city)!
    expect(row.page?.username).toBe(page.username)
    expect(row.team.map(m => m.name).sort()).toEqual(['Ada Admin', 'Carla City'])
  })

  it('city admins list official channels; the city page shows them', async () => {
    await expect(as(ids.stranger).cityChannels.saveChannel({ citySlug: city, platform: 'telegram', name: 'X', inviteUrl: 'https://t.me/x_town' })).rejects.toThrow(/admins/)
    await expect(as(ids.cityAdmin).cityChannels.saveChannel({ citySlug: city, platform: 'telegram', name: 'X', inviteUrl: 'https://chat.whatsapp.com/abc' })).rejects.toThrow(/t\.me/)
    const { id } = await as(ids.cityAdmin).cityChannels.saveChannel({ citySlug: city, platform: 'telegram', name: 'WeDance Town', inviteUrl: `https://t.me/${tag}town` })
    const ch = await as(ids.cityAdmin).cityChannels.channels({ citySlug: city })
    // The bot's chat id comes from the public link.
    expect(ch.channels).toEqual([expect.objectContaining({ id, telegramChatId: `@${tag}town` })])
    const pub = await appRouter.createCaller({ db, dancerId: null, isAdmin: false } as any).cityChannels.official({ citySlug: city })
    expect(pub?.channels.map(c => c.name)).toEqual(['WeDance Town'])
    // Official channels aren't in the community list.
    expect(await appRouter.createCaller({ db, dancerId: null, isAdmin: false } as any).communityGroup.listByCity({ citySlug: city })).toEqual([])
  })

  it('a shared group waits for the city admins, then shows with who added it', async () => {
    const link = `https://chat.whatsapp.com/${tag}AbC`
    const r = await as(ids.dancer).communityGroup.submit({ citySlug: city, name: 'Bachata Town', platform: 'whatsapp', inviteUrl: link, styles: ['Bachata'] })
    expect(r).toMatchObject({ duplicate: false, status: 'pending' })
    // The same group again (www., /invite/, a query) is caught.
    expect(await as(ids.stranger).communityGroup.submit({ citySlug: city, name: 'Copy', platform: 'whatsapp', inviteUrl: `https://www.chat.whatsapp.com/invite/${tag}AbC?mode=x` }))
      .toMatchObject({ duplicate: true, status: 'pending', id: r.id })
    const publicList = () => appRouter.createCaller({ db, dancerId: null, isAdmin: false } as any).communityGroup.listByCity({ citySlug: city })
    expect(await publicList()).toEqual([])

    expect(await as(ids.stranger).communityGroup.pending({ citySlug: city })).toEqual([])
    expect((await as(ids.cityAdmin).communityGroup.pending({ citySlug: city })).map(g => g.name)).toEqual(['Bachata Town'])
    await expect(as(ids.stranger).communityGroup.review({ id: r.id, approve: true })).rejects.toThrow(/admins/)
    await as(ids.cityAdmin).communityGroup.review({ id: r.id, approve: true })
    expect(await publicList()).toEqual([expect.objectContaining({ name: 'Bachata Town', addedBy: 'Dana' })])

    // A dead link leaves the city page until it's shown again.
    await db.update(schema.communityGroups).set({ linkStatus: 'dead' }).where(eq(schema.communityGroups.id, r.id))
    expect(await publicList()).toEqual([])
    await as(ids.cityAdmin).communityGroup.setVisible({ id: r.id, visible: true })
    expect(await publicList()).toHaveLength(1)
  })

  it('the weekly post picks nights out, writes the text, and keeps hand edits', async () => {
    await expect(as(ids.stranger).citySchedule.get({ citySlug: city, weekStart: week })).rejects.toThrow(/admins/)
    const w = await as(ids.cityAdmin).citySchedule.get({ citySlug: city, weekStart: week })
    expect(w.events.map(e => [e.name, e.picked])).toEqual([[`${tag} Monday Course`, false], [`${tag} Friday Party`, true]])
    expect(w.text).toContain(`21:00 ${tag} Friday Party · Club`)
    expect(w.text).not.toContain('Course')
    expect(w.text).toContain(`/cities/${city}`)
    expect(w.targets.telegram).toHaveLength(1)

    // Adding the course rewrites the text.
    const course = w.events.find(e => e.course)!.id
    await as(ids.cityAdmin).citySchedule.save({ citySlug: city, weekStart: week, eventIds: w.events.map(e => e.id) })
    const w2 = await as(ids.cityAdmin).citySchedule.get({ citySlug: city, weekStart: week })
    expect(w2.events.find(e => e.id === course)?.picked).toBe(true)
    expect(w2.text).toContain('Monday Course')

    // A hand edit stays when picks change; null goes back to the generated text.
    await as(ids.cityAdmin).citySchedule.save({ citySlug: city, weekStart: week, text: 'Our week!' })
    await as(ids.cityAdmin).citySchedule.save({ citySlug: city, weekStart: week, eventIds: [] })
    const w3 = await as(ids.cityAdmin).citySchedule.get({ citySlug: city, weekStart: week })
    expect([w3.text, w3.textEdited]).toEqual(['Our week!', true])
    await as(ids.cityAdmin).citySchedule.save({ citySlug: city, weekStart: week, text: null })
    expect((await as(ids.cityAdmin).citySchedule.get({ citySlug: city, weekStart: week })).text).toContain('Nothing picked')

    await expect(as(ids.cityAdmin).citySchedule.drawImage({ citySlug: city, weekStart: week })).rejects.toThrow(/Pick at least one/)
    await expect(as(ids.cityAdmin).citySchedule.publishInstagram({ citySlug: city, weekStart: week, to: 'feed' })).rejects.toThrow(/Draw the picture/)
  })
})
