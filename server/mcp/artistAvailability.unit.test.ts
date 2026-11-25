import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { TOOLS } from './tools'

const tool = (name: string) => TOOLS.find(t => t.name === name)!

describe('set_artist_availability', () => {
  it('replaces the artist’s windows through booking.setArtistAvailability', async () => {
    const def = tool('set_artist_availability')
    expect(def.scopes).toEqual(['business:write'])
    const args = z.object(def.input).parse({
      profile: '@los.filinsclub',
      slots: [{ day_of_week: 1, start: '18:00', end: '23:00' }],
    })
    const calls: unknown[] = []
    const t = {
      caller: { booking: { setArtistAvailability: async (input: unknown) => { calls.push(input); return { ok: true, published: true } } } },
      ctx: {}, origin: 'https://x',
    } as any
    const out = await def.run(t, args)
    expect(calls).toEqual([{
      username: 'los.filinsclub',
      slots: [{ dayOfWeek: 1, startTime: '18:00', endTime: '23:00' }],
    }])
    expect(out).toMatchObject({ ok: true, published: true })
  })
})

describe('get_profile artist availability', () => {
  it('attaches published windows for an artist and skips them for a venue', async () => {
    const def = tool('get_profile')
    const artistCalls: unknown[] = []
    const artist = {
      caller: {
        entity: { getByHandle: async () => ({ profile: { type: 'artist', username: 'los.filinsclub', name: 'Los Filins' }, spaces: [] }) },
        profile: { getByUsername: async () => null },
        booking: { artistAvailability: async (input: unknown) => { artistCalls.push(input); return { published: true, slots: [{ dayOfWeek: 1, startTime: '18:00', endTime: '23:00' }] } } },
      },
      ctx: {}, origin: 'https://2026.wedance.vip',
    } as any
    const seen: any = await def.run(artist, { handle: 'los.filinsclub' })
    expect(artistCalls).toEqual([{ username: 'los.filinsclub' }])
    expect(seen.availability).toEqual({
      published: true,
      slots: [{ day_of_week: 1, start: '18:00', end: '23:00' }],
    })

    const venue = {
      caller: {
        entity: { getByHandle: async () => ({ profile: { type: 'venue', username: 'pina' }, spaces: [] }) },
        booking: { artistAvailability: async () => { throw new Error('venues have rooms, not artist windows') } },
      },
      ctx: {}, origin: 'https://2026.wedance.vip',
    } as any
    const page: any = await def.run(venue, { handle: 'pina' })
    expect(page.availability).toBeUndefined()
  })
})
