import { describe, expect, it } from 'vitest'
import { artistDiscoveryFields } from './artistAreas'

describe('artistDiscoveryFields', () => {
  it('does nothing when the caller leaves both lists out', async () => {
    await expect(artistDiscoveryFields({} as any, 'venue', 'Munich', {})).resolves.toEqual({})
  })

  it('refuses event types and travel cities on a page that is not an artist', async () => {
    await expect(artistDiscoveryFields({} as any, 'venue', 'Munich', { eventTypes: ['wedding'] }))
      .rejects.toThrow(/Only artist pages/)
  })

  it('keeps a known event type on an artist', async () => {
    await expect(artistDiscoveryFields({} as any, 'artist', 'Barcelona', { eventTypes: ['Wedding', 'nope'] }))
      .resolves.toEqual({ eventTypes: ['wedding'] })
  })
})
