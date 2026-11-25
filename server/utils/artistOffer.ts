/**
 * Song list, services and public pricing (RAZ-1084, shared/types/artistOffer.ts)
 * as tRPC / MCP input. Only the parts given change. Empty pricing clears it.
 */
import { z } from 'zod'
import { ARTIST_OFFER_LIMITS as L, ARTIST_SERVICE_IDS } from '../../shared/types/artistOffer'

const webUrl = z.string().trim().max(L.url).refine((s) => {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}, 'Paste a full link, starting with https://')

export const artistOfferInput = z.object({
  songs: z.array(z.object({
    title: z.string().trim().min(1).max(L.title),
    by: z.string().trim().max(L.by).optional(),
    url: webUrl.optional(),
  })).max(L.songs).optional().describe('Replaces the song list. Each song needs a title; by and a public link are optional.'),
  services: z.array(z.enum(ARTIST_SERVICE_IDS)).max(ARTIST_SERVICE_IDS.length).optional()
    .describe('Replaces what they offer: live_show, animation, dj_set, wedding, party.'),
  pricing: z.string().trim().max(L.pricing).nullable().optional()
    .describe('The artist’s own public pricing words. Empty or null clears it. Do not invent a number.'),
})
