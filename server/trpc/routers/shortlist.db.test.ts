/**
 * Organiser shortlist (RAZ-1085): a private booking list. Saving an artist
 * does not follow them, and another dancer cannot see the note.
 *
 * Postgres only (server/test-setup.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, inArray, sql } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const ids: Record<string, string> = {}
const caller = (dancerId: string | null) => appRouter.createCaller({ db, dancerId, isAdmin: false } as any)

describe.skipIf(!DATABASE_URL)('artist shortlist', () => {
  beforeAll(async () => {
    for (const key of ['organiser', 'other']) {
      const [d] = await db.insert(schema.dancers).values({
        email: `${key}-${RUN}@test.wedance.local`,
        name: `${key} ${RUN}`,
      }).returning({ id: schema.dancers.id })
      ids[key] = d.id
    }
    const pages = [
      { key: 'artist', username: `sl-artist-${RUN}`, name: `Artist ${RUN}`, type: 'artist' as const, status: 'visible' as const },
      { key: 'second', username: `sl-second-${RUN}`, name: `Second ${RUN}`, type: 'artist' as const, status: 'visible' as const },
      { key: 'venue', username: `sl-venue-${RUN}`, name: `Venue ${RUN}`, type: 'venue' as const, status: 'visible' as const },
      { key: 'hidden', username: `sl-hidden-${RUN}`, name: `Hidden ${RUN}`, type: 'artist' as const, status: 'hidden' as const },
    ]
    for (const page of pages) {
      const [row] = await db.insert(schema.profiles).values({
        username: page.username,
        name: page.name,
        type: page.type,
        status: page.status,
        city: 'Munich',
        styles: ['Salsa'],
      }).returning({ id: schema.profiles.id })
      ids[page.key] = row.id
    }
  })

  afterAll(async () => {
    if (!db) return
    const dancerIds = [ids.organiser, ids.other].filter(Boolean)
    const profileIds = [ids.artist, ids.second, ids.venue, ids.hidden].filter(Boolean)
    await db.execute(sql`delete from artist_shortlist where dancer_id in (${sql.join(dancerIds.map(id => sql`${id}::uuid`), sql`, `)})`).catch(() => {})
    await db.delete(schema.follows).where(inArray(schema.follows.dancerId, dancerIds))
    await db.delete(schema.profiles).where(inArray(schema.profiles.id, profileIds))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, dancerIds))
  })

  it('saves an artist without following them', async () => {
    const added = await caller(ids.organiser).shortlist.toggle({
      username: `sl-artist-${RUN}`,
      surface: 'profile_page',
    })
    expect(added).toEqual({ shortlisted: true })
    const follows = await db.select().from(schema.follows).where(eq(schema.follows.dancerId, ids.organiser))
    expect(follows).toEqual([])
  })

  it('refuses a venue, a hidden page, and a handle that is not on WeDance', async () => {
    await expect(caller(ids.organiser).shortlist.toggle({ username: `sl-venue-${RUN}`, surface: 'artists' }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(caller(ids.organiser).shortlist.toggle({ username: `sl-hidden-${RUN}`, surface: 'profile_page' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(caller(ids.organiser).shortlist.toggle({ username: `missing-${RUN}`, surface: 'profile_page' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('stores a private tag and note, and keeps another dancer’s list separate', async () => {
    await caller(ids.organiser).shortlist.toggle({ username: `sl-second-${RUN}`, surface: 'artists' })
    const saved = await caller(ids.organiser).shortlist.save({
      username: `sl-artist-${RUN}`,
      occasion: 'wedding',
      note: '  Ask about travel  ',
    })
    expect(saved).toEqual({ occasion: 'wedding', note: 'Ask about travel' })

    const mine = await caller(ids.organiser).shortlist.mine()
    expect(mine.map((row: { username: string }) => row.username).sort()).toEqual([
      `sl-artist-${RUN}`,
      `sl-second-${RUN}`,
    ])
    const artist = mine.find((row: { username: string }) => row.username === `sl-artist-${RUN}`)
    expect(artist).toMatchObject({
      name: `Artist ${RUN}`,
      city: 'Munich',
      styles: ['Salsa'],
      occasion: 'wedding',
      note: 'Ask about travel',
    })

    const other = await caller(ids.other).shortlist.mine()
    expect(other).toEqual([])
  })

  it('refuses a note that is too long, and a save for someone not shortlisted', async () => {
    await expect(caller(ids.organiser).shortlist.save({
      username: `sl-artist-${RUN}`,
      occasion: null,
      note: 'a'.repeat(501),
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
    await expect(caller(ids.other).shortlist.save({
      username: `sl-artist-${RUN}`,
      occasion: 'birthday',
      note: '',
    })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    const still = await caller(ids.organiser).shortlist.mine()
    expect(still.find((row: { username: string }) => row.username === `sl-artist-${RUN}`)?.note).toBe('Ask about travel')
  })

  it('removes them without touching follows', async () => {
    const removed = await caller(ids.organiser).shortlist.toggle({
      username: `sl-artist-${RUN}`,
      surface: 'shortlist',
    })
    expect(removed).toEqual({ shortlisted: false })
    const mine = await caller(ids.organiser).shortlist.mine()
    expect(mine.map((row: { username: string }) => row.username)).toEqual([`sl-second-${RUN}`])
    const follows = await db.select().from(schema.follows).where(eq(schema.follows.dancerId, ids.organiser))
    expect(follows).toEqual([])
  })
})
