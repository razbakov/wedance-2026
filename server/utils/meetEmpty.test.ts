/**
 * An empty Meet deck's next step (RAZ-1002): the stage rule, and the city data
 * behind it against a local Postgres (see server/test-setup.ts), in throwaway
 * cities removed again in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { inArray, like } from 'drizzle-orm'
import * as schema from '../database/schema'
import { meetEmpty, meetEmptyStage } from './meetEmpty'

describe('meetEmptyStage', () => {
  it('nights first, then organisers, then venues, then nothing', () => {
    expect(meetEmptyStage('munich', { nights: 2, organisers: 3, venues: 4 })).toBe('nights')
    expect(meetEmptyStage('munich', { nights: 0, organisers: 3, venues: 4 })).toBe('organisers')
    expect(meetEmptyStage('munich', { nights: 0, organisers: 0, venues: 4 })).toBe('venues')
    expect(meetEmptyStage('munich', { nights: 0, organisers: 0, venues: 0 })).toBe('nothing')
  })
  it('no city comes before anything', () => {
    expect(meetEmptyStage('', { nights: 2, organisers: 3, venues: 4 })).toBe('no-city')
  })
})

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null
const RUN = Math.random().toString(36).slice(2, 8)
const DAY = 86400_000
const NIGHTS = `nights-${RUN}`, ORGS = `orgs-${RUN}`, VENUES = `venues-${RUN}`, NOTHING = `nothing-${RUN}`
const eventIds: string[] = []

async function addEvent(values: Partial<typeof schema.events.$inferInsert>) {
  const [row] = await db.insert(schema.events).values({
    name: `Night ${RUN}`, type: 'Party', timezone: 'Europe/Berlin', styles: ['Salsa'], published: true, archived: false, ...values,
  }).returning({ id: schema.events.id })
  eventIds.push(row.id)
  return row.id as string
}

describe.skipIf(!DATABASE_URL)('meetEmpty', () => {
  beforeAll(async () => {
    const now = Date.now()
    await db.insert(schema.profiles).values([
      { username: `org-${RUN}`, type: 'organizer', name: `Org ${RUN}`, citySlug: ORGS },
      { username: `venue-${RUN}`, type: 'venue', name: `Venue ${RUN}`, citySlug: VENUES },
    ])
    await addEvent({ citySlug: NIGHTS, name: `Soon ${RUN}`, startDate: new Date(now + 3 * DAY) })
    await addEvent({ citySlug: NIGHTS, name: `Course ${RUN}`, type: 'Course', startDate: new Date(now + 2 * DAY) })
    await addEvent({ citySlug: NIGHTS, name: `Far ${RUN}`, startDate: new Date(now + 30 * DAY) })
    // The organiser's city had a night last month, none coming.
    await addEvent({ citySlug: ORGS, organizerUsername: `org-${RUN}`, startDate: new Date(now - 30 * DAY) })
  })

  afterAll(async () => {
    if (!db) return
    if (eventIds.length) await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    await db.delete(schema.profiles).where(like(schema.profiles.username, `%-${RUN}`))
  })

  it('offers the next nights out, not courses or nights weeks away', async () => {
    const r = await meetEmpty(db, NIGHTS)
    expect(r.stage).toBe('nights')
    expect(r.nights.map(n => n.name)).toEqual([`Soon ${RUN}`])
  })

  it('no nights coming: the organisers who ran nights here', async () => {
    const r = await meetEmpty(db, ORGS)
    expect(r.stage).toBe('organisers')
    expect(r.organisers.map(o => o.username)).toEqual([`org-${RUN}`])
  })

  it('no organisers: the venues', async () => {
    const r = await meetEmpty(db, VENUES)
    expect(r.stage).toBe('venues')
    expect(r.venues.map(v => v.username)).toEqual([`venue-${RUN}`])
  })

  it('nothing listed, and no city', async () => {
    expect((await meetEmpty(db, NOTHING)).stage).toBe('nothing')
    expect((await meetEmpty(db, '')).stage).toBe('no-city')
  })
})
