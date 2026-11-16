/**
 * Integration (RAZ-985): a Yes that meets a Yes back is a match — the swiper is told
 * in the response, the other dancer gets one "said yes too" email (logged in
 * meet_match_emails): once per pair, at most one a day, never when turned off.
 * Waves pair per festival. Runs against a local Postgres only (server/test-setup.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray, or } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'
import { verifyMatchEmailsOff, matchEmailsOffSig } from '../../utils/meetMatchNotify'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null
const RUN = Math.random().toString(36).slice(2, 8)
const ids: Record<string, string> = {}
const caller = (dancerId: string) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)

async function addDancer(key: string, values: Partial<typeof schema.dancers.$inferInsert> = {}) {
  const [row] = await db.insert(schema.dancers).values({
    email: `${key}-${RUN}@test.wedance.local`, name: `${key} ${RUN}`, city: 'Matchtown', danceStyles: ['Salsa'],
    profilePublic: true, photo: `https://example.com/${key}.jpg`, ...values,
  }).returning({ id: schema.dancers.id })
  ids[key] = row.id
}
const emailsTo = async (key: string) => db.select().from(schema.meetMatchEmails).where(eq(schema.meetMatchEmails.recipientId, ids[key]))
const yes = (from: string, to: string) => caller(ids[from]).plan.discoverSwipe({ targetKind: 'dancer', targetId: ids[to], decision: 'yes' })

describe.skipIf(!DATABASE_URL)('match email', () => {
  beforeAll(async () => {
    for (const k of ['me', 'gila', 'lena', 'quiet', 'waver']) await addDancer(k)
    await db.update(schema.dancers).set({ matchEmails: false }).where(eq(schema.dancers.id, ids.quiet))
  })
  afterAll(async () => {
    if (!db) return
    const all = Object.values(ids)
    await db.delete(schema.meetMatchEmails).where(or(inArray(schema.meetMatchEmails.recipientId, all), inArray(schema.meetMatchEmails.otherId, all)))
    await db.delete(schema.festivalWaves).where(inArray(schema.festivalWaves.dancerId, all))
    await db.delete(schema.discoverSwipes).where(inArray(schema.discoverSwipes.dancerId, all))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, all))
  })

  it('a one-way Yes is no match and sends nothing', async () => {
    expect(await yes('gila', 'me')).toEqual({ match: false })
    expect(await emailsTo('me')).toHaveLength(0)
  })

  it('the Yes back is a match: the swiper is told, the other one gets the email', async () => {
    expect(await yes('me', 'gila')).toEqual({ match: true })
    const sent = await emailsTo('gila')
    expect(sent).toHaveLength(1)
    expect(sent[0].otherId).toBe(ids.me)
    expect(await emailsTo('me')).toHaveLength(0)
  })

  it('once per pair — swiping again sends nothing new', async () => {
    await caller(ids.me).plan.discoverUnswipe({ targetKind: 'dancer', targetId: ids.gila })
    expect(await yes('me', 'gila')).toEqual({ match: true })
    expect(await emailsTo('gila')).toHaveLength(1)
  })

  it('at most one a day: a second match for Gila today is shown, not emailed', async () => {
    await yes('gila', 'lena')
    expect(await yes('lena', 'gila')).toEqual({ match: true })
    expect(await emailsTo('gila')).toHaveLength(1)
  })

  it('turned off = no email, still a match', async () => {
    await yes('quiet', 'me')
    expect(await yes('me', 'quiet')).toEqual({ match: true })
    expect(await emailsTo('quiet')).toHaveLength(0)
  })

  it('waves pair per festival', async () => {
    const fest = `fest-${RUN}`
    await caller(ids.waver).wave.send({ festivalSlug: fest, targetDancerId: ids.me })
    expect(await caller(ids.me).wave.send({ festivalSlug: `other-${RUN}`, targetDancerId: ids.waver })).toEqual({ match: false })
    expect(await caller(ids.me).wave.send({ festivalSlug: fest, targetDancerId: ids.waver })).toEqual({ match: true })
    expect(await emailsTo('waver')).toHaveLength(1)
  })

  it('Settings switch and the signed unsubscribe link', async () => {
    expect(await caller(ids.lena).plan.emailPrefs()).toEqual({ matchEmails: true })
    await caller(ids.lena).plan.setEmailPrefs({ matchEmails: false })
    expect(await caller(ids.lena).plan.emailPrefs()).toEqual({ matchEmails: false })
    const sig = matchEmailsOffSig(ids.lena)
    expect(verifyMatchEmailsOff(sig)).toBe(ids.lena)
    expect(verifyMatchEmailsOff(`${sig}x`)).toBeNull()
  })
})
