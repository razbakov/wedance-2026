import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { KNOWN_SEGMENTS, planV3Redirect } from './v3Redirect'

const ROOT = join(__dirname, '../..')
const FSID = 'Ab3dEf6hIj9lMn2pQr5t' // 20 chars, like a Firestore auto id

describe('planV3Redirect', () => {
  it('leaves 2026 pages alone', () => {
    for (const p of ['/', '/cities/munich', '/@moadc', '/events/la-clave-thursday-1ed1a238', '/events/1ed1a238-0000-4000-8000-000000000000',
      '/business/events/new', '/u/alex', '/w/abc123', '/api/trpc/x', '/_nuxt/entry.js', '/favicon.ico', '/robots.txt', '/admin/users', '/settings']) {
      expect(planV3Redirect(p), p).toBeNull()
    }
  })

  it('looks up v3 events by Firestore id, with their old sub-pages', () => {
    expect(planV3Redirect(`/events/${FSID}`)).toEqual({ lookup: { kind: 'event', id: FSID, fallback: null } })
    expect(planV3Redirect(`/events/${FSID}/share`)).toEqual({ lookup: { kind: 'event', id: FSID, fallback: '/cities' } })
    expect(planV3Redirect(`/rsvp/${FSID}`)).toEqual({ lookup: { kind: 'event', id: FSID, fallback: '/cities' } })
    expect(planV3Redirect('/events/-/import')).toEqual({ to: '/business/events/new', code: 301 })
    expect(planV3Redirect('/events')).toEqual({ to: '/cities', code: 301 })
  })

  it('looks up profiles by handle, keeping case and dots', () => {
    expect(planV3Redirect('/MOADC')).toEqual({ lookup: { kind: 'profile', key: 'MOADC', fallback: null } })
    expect(planV3Redirect('/Bachate.ro')).toEqual({ lookup: { kind: 'profile', key: 'Bachate.ro', fallback: null } })
    expect(planV3Redirect('/Migo.bachatero/')).toEqual({ lookup: { kind: 'profile', key: 'Migo.bachatero', fallback: null } })
    expect(planV3Redirect('/MontunoClub/embed')).toEqual({ lookup: { kind: 'profile', key: 'MontunoClub', fallback: '/' } })
    expect(planV3Redirect(`/${FSID}`)).toEqual({ lookup: { kind: 'profile', key: FSID, fallback: null } })
    expect(planV3Redirect('/MOADC/whatever')).toBeNull()
    expect(planV3Redirect('/flyer.png')).toBeNull()
  })

  it('maps explore to city pages', () => {
    expect(planV3Redirect('/explore')).toEqual({ to: '/cities', code: 301 })
    expect(planV3Redirect('/explore/')).toEqual({ to: '/cities', code: 301 })
    expect(planV3Redirect('/explore/Munich')).toEqual({ lookup: { kind: 'city', key: 'Munich', fallback: '/cities' } })
    expect(planV3Redirect('/explore/Munich/classes')).toEqual({ lookup: { kind: 'city', key: 'Munich', fallback: '/cities' } })
    expect(planV3Redirect('/explore/china-shanghai/parties')).toEqual({ lookup: { kind: 'city', key: 'china-shanghai', fallback: '/cities' } })
    expect(planV3Redirect('/explore/global/classes')).toEqual({ to: '/cities', code: 301 })
    expect(planV3Redirect('/explore/undefined')).toEqual({ to: '/cities', code: 301 })
  })

  it('strips v3 locale prefixes', () => {
    expect(planV3Redirect('/de')).toEqual({ to: '/', code: 301 })
    expect(planV3Redirect('/de/explore/Munich')).toEqual({ lookup: { kind: 'city', key: 'Munich', fallback: '/cities' } })
    expect(planV3Redirect('/ru/cities/munich')).toEqual({ to: '/cities/munich', code: 301 })
  })

  it('sends retired sections to their nearest 2026 page', () => {
    expect(planV3Redirect('/dance/salsa')).toEqual({ to: '/find-your-dance', code: 302 })
    expect(planV3Redirect('/blog/chango-aluya-and-a-la-meta-steps')).toEqual({ to: '/whats-new', code: 301 })
    expect(planV3Redirect(`/stories/${FSID}`)).toEqual({ to: '/', code: 301 })
    expect(planV3Redirect('/organize/')).toEqual({ to: '/for-organizers', code: 301 })
    expect(planV3Redirect('/about')).toEqual({ to: '/', code: 302 })
    expect(planV3Redirect('/settings/calendars')).toEqual({ to: '/settings', code: 301 })
    expect(planV3Redirect('/admin/reports')).toEqual({ to: '/admin', code: 301 })
    expect(planV3Redirect('/competition/submit')).toEqual({ to: '/battle', code: 301 })
  })

  it('looks up NFC cards', () => {
    expect(planV3Redirect('/nfc/')).toEqual({ to: '/', code: 301 })
    expect(planV3Redirect(`/nfc/${FSID}`)).toEqual({ lookup: { kind: 'nfc', card: FSID, fallback: '/' } })
  })
})

describe('KNOWN_SEGMENTS', () => {
  // A 2026 section missing here would be looked up as a v3 handle (and 404 or redirect wrongly).
  it('covers every top-level page, server route and public folder', () => {
    const names = (dir: string) => readdirSync(join(ROOT, dir), { withFileTypes: true })
      .map(d => d.name.replace(/\.(vue|ts)$/, ''))
      .filter(n => n !== 'index' && !n.startsWith('@') && !n.includes('.') && !n.endsWith('.test'))
    const publicDirs = readdirSync(join(ROOT, 'public'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    for (const n of [...names('app/pages'), ...names('server/routes'), ...names('server/api').map(() => 'api'), ...publicDirs]) {
      expect(KNOWN_SEGMENTS.has(n), n).toBe(true)
    }
  })
})
