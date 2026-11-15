/**
 * The passes an organiser sells on a festival page, as saved in the Business
 * event editor (`events.festival.passes`, prices in euros). Ticket checkout
 * reads prices from here so a pass added in the editor can be bought at once
 * (RAZ-946); `server/utils/ticket-prices.ts` is only the fallback for the
 * festivals whose passes were hard-coded before.
 */
import { and, eq, sql } from 'drizzle-orm'
import { events } from '../database/schema'
import type { FestivalPass } from '../../shared/types/festivalDetails'

/**
 * The passes of the live (published, not archived) festival event with this
 * key or slug. `null` = no such live event.
 */
export async function livePasses(db: any, key: string): Promise<FestivalPass[] | null> {
  const [ev] = await db
    .select({ festival: events.festival })
    .from(events)
    .where(and(
      sql`${events.festival} IS NOT NULL AND (${events.festival}->>'key' = ${key} OR ${events.slug} = ${key})`,
      eq(events.published, true),
      eq(events.archived, false),
    ))
    .limit(1)
  if (!ev) return null
  return (ev.festival?.passes ?? []) as FestivalPass[]
}

/** A pass's price in euro cents, by its exact name. `null` = no such pass. */
export function passPriceCents(passes: FestivalPass[], name: string): { priceCents: number; soldOut: boolean } | null {
  const pass = passes.find(p => p.name.trim() === name.trim())
  if (!pass) return null
  const euros = Number(pass.price)
  if (!Number.isFinite(euros) || euros < 0) return null
  return { priceCents: Math.round(euros * 100), soldOut: !!pass.soldOut }
}
