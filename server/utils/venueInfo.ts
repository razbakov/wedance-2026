/**
 * The venue's own hints (RAZ-1012, shared/types/venueInfo.ts) as tRPC / MCP input. Every part is
 * optional; empty strings clear (cleanVenueInfo drops them), so a form can always send the whole thing.
 */
import { z } from 'zod'
import { VENUE_INFO_LIMITS as L } from '../../shared/types/venueInfo'

export const venueInfoInput = z.object({
  transit: z.object({
    line: z.string().max(L.line).optional().describe('The line, as on the map: "S2", "U3", "Bus 54". Empty for none.'),
    color: z.string().max(7).optional().describe('The line’s colour as #rrggbb (Munich S2 = #76B82A). Empty = a neutral badge.'),
    stop: z.string().max(L.stop).describe('The nearest stop: "Dachau Bahnhof". Empty removes the hint.'),
    detail: z.string().max(L.detail).optional().describe('How to get from it: "20 min walk or 5 min by bus".'),
  }).nullable().optional(),
  parking: z.object({
    text: z.string().max(L.text).describe('Where to park: "Garage next door". Empty removes the hint.'),
    detail: z.string().max(L.detail).optional().describe('A detail: "Entrance by the Audi dealership".'),
  }).nullable().optional(),
  indoorShoesOnly: z.boolean().optional().describe('Indoor dance shoes only: dancers bring a pair to change into.'),
  cloakroom: z.enum(['yes', 'no']).nullable().optional().describe('"no" shows "No cloakroom"; null = not said.'),
})
export type VenueInfoInput = z.infer<typeof venueInfoInput>

/** Apply a partial update onto what's saved: only the parts given change, null clears a part. */
export function mergeVenueInfo(current: unknown, patch: VenueInfoInput) {
  const next: Record<string, unknown> = { ...((current && typeof current === 'object') ? current : {}) }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    if (v === null) delete next[k]
    else next[k] = v
  }
  return next
}
