import { gte, sql } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { festivals, festivalSignups } from '../database/schema'

/**
 * SSR-friendly festivals directory. Mirrors the cities.get.ts pattern so the
 * /festivals page can fetch with useFetch during SSR (no spinner on mount).
 *
 * Returns upcoming festivals sorted by start date ascending (nearest first).
 * Past festivals (endDate < today) are excluded server-side.
 * Signup counts are computed from festivalSignups.
 */
export type FestivalRow = {
  slug: string
  name: string
  startDate: string | null
  endDate: string | null
  city: string | null
  country: string | null
  description: string | null
  styles: string[]
  logo: string | null
  accentColor: string | null
  ticketUrl: string | null
  signupCount: number
}

export default defineEventHandler(async (): Promise<FestivalRow[]> => {
  const db = useDb()
  const today = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select({
      slug: festivals.slug,
      name: festivals.name,
      startDate: festivals.startDate,
      endDate: festivals.endDate,
      city: festivals.city,
      country: festivals.country,
      description: festivals.description,
      styles: festivals.styles,
      logo: festivals.logo,
      accentColor: festivals.accentColor,
      ticketUrl: festivals.ticketUrl,
      signupCount: sql<number>`coalesce((
        select count(*)::int from festival_signups
        where festival_signups.festival_id = ${festivals.id}
      ), 0)`,
    })
    .from(festivals)
    .where(gte(festivals.endDate, today))
    .orderBy(festivals.startDate)

  return rows.map(r => ({
    ...r,
    styles: r.styles ?? [],
    signupCount: Number(r.signupCount) || 0,
  }))
})
