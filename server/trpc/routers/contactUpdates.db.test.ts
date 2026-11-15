import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '..'

// Contacts → "Send an update" (RAZ-960) against a real Postgres (local only):
//   DATABASE_URL=postgresql://dev:dev@localhost:5441/wedance NEON_FETCH_ENDPOINT=http://localhost:4444/sql bunx vitest run server/trpc/routers/contactUpdates.db.test.ts
const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

// No Resend key: emails are logged, which the test reads back.
vi.stubGlobal('useRuntimeConfig', () => ({ siteUrl: 'http://localhost:3000', resendApiKey: '' }))

const tag = `upd${Date.now()}`
const ids = {} as Record<'owner' | 'stranger' | 'mod', string>
const page = {} as { id: string, username: string }
const contactIds = {} as Record<'site' | 'rsvp' | 'gone' | 'imported' | 'importedYes', string>
let eventId = ''
const web = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false, origin: 'https://wedance.test' } as any)
const app = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false, scopes: ['business:read', 'business:write', 'business:publish'], origin: 'https://wedance.test' } as any)
const seg = (over: Record<string, unknown> = {}) => ({ sources: [], activity: [], event: null, as: null, includeImported: false, ...over }) as any
const draft = (over: Record<string, unknown> = {}) => ({ username: page.username, segment: seg(), subject: 'News for {name}', body: 'Hi {name},\n\nWe have news.', eventId: null, ...over })

describe.skipIf(!DATABASE_URL)('contactUpdates (DB)', () => {
  beforeAll(async () => {
    const rows = await db.insert(schema.dancers).values([
      { email: `${tag}-owner@test.local`, name: 'Olga Owner' },
      { email: `${tag}-stranger@test.local`, name: 'Stranger' },
      { email: `${tag}-mod@test.local`, name: 'Moe Moderator' },
    ]).returning({ id: schema.dancers.id })
    ;[ids.owner, ids.stranger, ids.mod] = rows.map((r: any) => r.id)
    const { username } = await web(ids.owner).business.create({ type: 'organizer', name: `Update School ${tag}`, city: 'Munich' })
    const [p] = await db.select({ id: schema.profiles.id }).from(schema.profiles).where(eq(schema.profiles.username, username))
    Object.assign(page, { id: p.id, username })
    await db.insert(schema.profileMembers).values({ profileId: page.id, dancerId: ids.mod, role: 'moderator' })
    const [ev] = await db.insert(schema.events).values({ name: 'Next night', startDate: new Date(Date.now() + 6 * 86_400_000), hostProfileId: page.id, published: true, archived: false, timezone: 'Europe/Berlin' })
      .returning({ id: schema.events.id })
    eventId = ev.id
    const cs = await db.insert(schema.profileContacts).values([
      { profileId: page.id, email: `${tag}-site@test.local`, name: 'Sita Site', source: { form: 'school.test' } },
      { profileId: page.id, email: `${tag}-rsvp@test.local`, name: 'Rafa', source: { from: 'rsvp' } },
      { profileId: page.id, email: `${tag}-gone@test.local`, source: { form: 'school.test' }, status: 'unsubscribed' },
      { profileId: page.id, email: `${tag}-imp@test.local`, source: { from: 'hubspot', hubspot_origin: 'import' } },
      { profileId: page.id, email: `${tag}-impyes@test.local`, source: { from: 'wedance-v3', opted_in: '2026-11-01' } },
    ]).returning({ id: schema.profileContacts.id })
    ;[contactIds.site, contactIds.rsvp, contactIds.gone, contactIds.imported, contactIds.importedYes] = cs.map((r: any) => r.id)
  })

  afterAll(async () => {
    if (!db) return
    if (eventId) await db.delete(schema.events).where(eq(schema.events.id, eventId))
    if (page.id) await db.delete(schema.profiles).where(eq(schema.profiles.id, page.id))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, Object.values(ids)))
  })

  it('counts only people the page may email, imported lists off by default', async () => {
    const p = await web(ids.owner).contactUpdates.preview(draft())
    expect(p.recipients).toBe(2)
    expect(p.cantEmail).toBe(2) // unsubscribed + imported never asked
    expect(p.imported).toBe(1) // the wedance.vip one who opted in
    expect(p.subject).toBe('News for Olga')
    const withImported = await web(ids.owner).contactUpdates.preview(draft({ segment: seg({ includeImported: true }) }))
    expect(withImported.recipients).toBe(3)
  })

  it('offers the next event for the template and puts its card + RSVP in the preview', async () => {
    const c = await web(ids.owner).contactUpdates.compose({ username: page.username })
    expect(c.events.map(e => e.id)).toEqual([eventId])
    expect(c.myEmail).toBe(`${tag}-owner@test.local`)
    const p = await web(ids.owner).contactUpdates.preview(draft({ eventId }))
    expect(p.html).toContain(`/events/${eventId}`)
    expect(p.html).toContain('#rsvp')
  })

  it('sends a test to yourself only, without logging it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const r = await web(ids.owner).contactUpdates.sendTest(draft())
    expect(r.to).toBe(`${tag}-owner@test.local`)
    const out = log.mock.calls.map(c => String(c[0])).join('\n')
    log.mockRestore()
    expect(out).toContain(`${tag}-owner@test.local: [Test] News for Olga`)
    expect(out).not.toContain(`${tag}-site@test.local`)
    const rows = await db.select().from(schema.contactUpdateSends).where(eq(schema.contactUpdateSends.profileId, page.id))
    expect(rows).toHaveLength(0)
  })

  it('refuses when the count changed since the organiser looked', async () => {
    await expect(web(ids.owner).contactUpdates.send(draft({ expected: 5 }))).rejects.toThrow(/now has 2 people/)
  })

  it('sends with a personal unsubscribe link each and logs who, when, which segment, how many', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const r = await web(ids.owner).contactUpdates.send(draft({ expected: 2, eventId, template: 'invite_next_event' }))
    const out = log.mock.calls.map(c => String(c[0])).join('\n')
    log.mockRestore()
    expect(r).toMatchObject({ sent: 2, failed: 0, segmentLabel: 'Everyone who can be emailed' })
    expect(out).toContain(`${tag}-site@test.local: News for Sita`)
    expect(out).toContain(`unsubscribe?id=${contactIds.site}`)
    expect(out).toContain(`${tag}-rsvp@test.local: News for Rafa`)
    expect(out).toContain(`unsubscribe?id=${contactIds.rsvp}`)
    for (const no of ['gone', 'imp', 'impyes']) expect(out).not.toContain(`${tag}-${no}@test.local`)

    const [row] = await db.select().from(schema.contactUpdateSends).where(eq(schema.contactUpdateSends.profileId, page.id))
    expect(row).toMatchObject({ sentBy: ids.owner, recipients: 2, failed: 0, eventId, template: 'invite_next_event', segmentLabel: 'Everyone who can be emailed' })
    expect(row.segment).toMatchObject({ includeImported: false })
    const c = await web(ids.owner).contactUpdates.compose({ username: page.username })
    expect(c.sends[0]).toMatchObject({ subject: 'News for {name}', recipients: 2, byName: 'Olga Owner' })

    // The same update again right away is a double click.
    await expect(web(ids.owner).contactUpdates.send(draft({ expected: 2 }))).rejects.toThrow(/a few minutes ago/)
  })

  it('narrows to the segment picked on Contacts', async () => {
    const p = await web(ids.owner).contactUpdates.preview(draft({ segment: seg({ sources: ['rsvp'] }) }))
    expect(p.recipients).toBe(1)
  })

  it('is only for the page’s team, and never for connected apps', async () => {
    await expect(web(ids.stranger).contactUpdates.preview(draft())).rejects.toThrow()
    // A moderator sees the count, but only owners and editors send.
    expect((await web(ids.mod).contactUpdates.preview(draft())).recipients).toBe(2)
    await expect(web(ids.mod).contactUpdates.send(draft({ expected: 2, subject: 'Mod' }))).rejects.toThrow(/editor/)
    await expect(web(ids.mod).contactUpdates.sendTest(draft())).rejects.toThrow(/editor/)
    await expect(app(ids.owner).contactUpdates.send(draft({ expected: 2, subject: 'Other' }))).rejects.toThrow()
    await expect(app(ids.owner).contactUpdates.sendTest(draft())).rejects.toThrow()
  })
})
