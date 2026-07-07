/**
 * Unit tests for the profile router (getByUsername + update) and the username
 * slug helper. Hermetic FakeDb pattern (same as auth.test.ts) — no live Neon.
 */
import { describe, it, expect, vi } from 'vitest'
import { dancers, sessions, cityVideos } from '../../database/schema'
import { slugify, generateUsername } from '../../utils/slug'

// Replace drizzle's opaque `eq` with a predicate builder so FakeDb.where() runs
// a plain JS check (mirrors auth.test.ts).
type FilterFn = (row: Record<string, any>) => boolean

vi.mock('drizzle-orm', async () => {
  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
  const resolveKey = (col: any): string | undefined => (col?.name ? snakeToCamel(col.name) : undefined)
  const eq = (col: any, val: any): FilterFn => {
    const jsKey = resolveKey(col)
    return (row) => (jsKey ? row[jsKey] === val : false)
  }
  const and = (...preds: FilterFn[]): FilterFn => (row) => preds.every(p => p(row))
  return { eq, and, gt: () => () => false, sql: (..._args: any[]) => ({}) }
})

import { appRouter } from '../index'

interface FakeRow { [k: string]: any }

class FakeDb {
  dancers: FakeRow[] = []
  sessions: FakeRow[] = []
  cityVideos: FakeRow[] = []

  seedDancer(row: Partial<FakeRow> & { id: string }) {
    const full: FakeRow = {
      name: 'Test Dancer', username: null, photo: null, city: null,
      danceStyles: [], role: null, email: `${row.id}@example.com`,
      bio: null, instagram: null, youtube: null, website: null, profilePublic: true,
      ...row,
    }
    this.dancers.push(full)
    return row.id
  }

  seedVideo(row: Partial<FakeRow> & { id: string; dancerId: string }) {
    this.cityVideos.push({
      title: 'Clip', videoUrl: 'https://y.t/x', thumbnailUrl: null,
      danceStyle: null, citySlug: 'munich', eloScore: 1500, status: 'approved', ...row,
    })
  }

  select(_columns: any) {
    return {
      from: (table: any) => ({
        where: (filter: FilterFn) => Promise.resolve(this.tableFor(table).filter(filter)),
      }),
    }
  }

  update(table: any) {
    return {
      set: (patch: FakeRow) => ({
        where: (filter: FilterFn) => {
          for (const row of this.tableFor(table)) if (filter(row)) Object.assign(row, patch)
          return Promise.resolve()
        },
      }),
    }
  }

  private tableFor(table: any): FakeRow[] {
    if (table === dancers) return this.dancers
    if (table === sessions) return this.sessions
    if (table === cityVideos) return this.cityVideos
    throw new Error('unexpected table in FakeDb')
  }
}

function createCaller(db: any, opts: { dancerId?: string | null; isAdmin?: boolean } = {}) {
  return appRouter.createCaller({ db, dancerId: opts.dancerId ?? null, isAdmin: opts.isAdmin ?? false })
}

describe('slug helper', () => {
  it('slugifies names, stripping accents and punctuation', () => {
    expect(slugify('Alösha Razbakov')).toBe('alosha-razbakov')
    expect(slugify('  A.  B! ')).toBe('a-b')
    expect(slugify('日本')).toBe('dancer') // no latin chars → fallback
  })

  it('generateUsername appends a random suffix to the slug', () => {
    const u = generateUsername('Ada Lovelace')
    expect(u).toMatch(/^ada-lovelace-[a-z0-9]{5}$/)
    // two calls differ (random suffix)
    expect(generateUsername('Ada Lovelace')).not.toBe(u)
  })
})

describe('profile.getByUsername', () => {
  it('returns public identity fields for an existing handle', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', name: 'Ana', username: 'ana-x1', city: 'Munich', danceStyles: ['Salsa'], role: 'follow', email: 'ana@x.com' })
    const caller = createCaller(db)

    const p = await caller.profile.getByUsername({ username: 'ana-x1' })
    expect(p.name).toBe('Ana')
    expect(p.city).toBe('Munich')
    expect(p.danceStyles).toEqual(['Salsa'])
    expect(p.role).toBe('follow')
    // never leaks email
    expect((p as any).email).toBeUndefined()
  })

  it('throws NOT_FOUND for an unknown handle', async () => {
    const db = new FakeDb()
    const caller = createCaller(db)
    await expect(caller.profile.getByUsername({ username: 'nobody' })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('profile.getByUsername — videos & privacy', () => {
  it('includes the dancer\'s approved videos, excluding pending', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', username: 'ana-x1' })
    db.seedVideo({ id: 'v1', dancerId: 'd1', title: 'Salsa run', status: 'approved' })
    db.seedVideo({ id: 'v2', dancerId: 'd1', title: 'Pending clip', status: 'pending' })
    const caller = createCaller(db)

    const p = await caller.profile.getByUsername({ username: 'ana-x1' })
    expect(p.videos.map((v: any) => v.id)).toEqual(['v1'])
  })

  it('hides a private profile from other viewers but shows it to the owner', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', username: 'ana-x1', profilePublic: false })
    // Anonymous / other viewer → 404
    await expect(createCaller(db).profile.getByUsername({ username: 'ana-x1' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
    // Owner → visible, flagged private + owned
    const own = await createCaller(db, { dancerId: 'd1' }).profile.getByUsername({ username: 'ana-x1' })
    expect(own.isPublic).toBe(false)
    expect(own.isOwner).toBe(true)
  })
})

describe('profile.update', () => {
  it('rejects an unauthenticated caller', async () => {
    const db = new FakeDb()
    const caller = createCaller(db) // no dancerId
    await expect(caller.profile.update({ city: 'Berlin' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('updates only the provided fields on the caller\'s own row', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', name: 'Old Name', username: 'u1', city: 'Munich', role: 'lead' })
    const caller = createCaller(db, { dancerId: 'd1' })

    await caller.profile.update({ name: 'New Name', city: 'Berlin', danceStyles: ['Bachata'] })

    const row = db.dancers[0]
    expect(row.name).toBe('New Name')
    expect(row.city).toBe('Berlin')
    expect(row.danceStyles).toEqual(['Bachata'])
    // untouched field preserved
    expect(row.role).toBe('lead')
  })

  it('clears the photo when passed an empty string', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', photo: 'https://x.com/a.jpg' })
    const caller = createCaller(db, { dancerId: 'd1' })
    await caller.profile.update({ photo: '' })
    expect(db.dancers[0].photo).toBeNull()
  })

  it('sets bio, socials, and the privacy flag', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1' })
    const caller = createCaller(db, { dancerId: 'd1' })
    await caller.profile.update({
      bio: 'I dance timba.', instagram: '@ana', youtube: '@anadance', website: 'ana.com',
      profilePublic: false,
    })
    const row = db.dancers[0]
    expect(row.bio).toBe('I dance timba.')
    expect(row.instagram).toBe('@ana')
    expect(row.youtube).toBe('@anadance')
    expect(row.website).toBe('ana.com')
    expect(row.profilePublic).toBe(false)
  })

  it('clears bio/socials when passed empty strings', async () => {
    const db = new FakeDb()
    db.seedDancer({ id: 'd1', bio: 'x', instagram: '@ana' })
    const caller = createCaller(db, { dancerId: 'd1' })
    await caller.profile.update({ bio: '', instagram: '' })
    expect(db.dancers[0].bio).toBeNull()
    expect(db.dancers[0].instagram).toBeNull()
  })
})
