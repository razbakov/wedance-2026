import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { festivals } from '../../database/schema'

/**
 * Single-festival detail from the DB. Used by /festivals/[slug] as a fallback
 * when the slug isn't in the hardcoded mock-data map, so DB-only festivals
 * don't 404.
 *
 * Returns 404 when the slug doesn't exist in the festivals table.
 */
export type FestivalDetail = {
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

export default defineEventHandler(async (event): Promise<FestivalDetail> => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const db = useDb()

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
        select count(*)::int from plan_items
        where plan_items.item_type = 'festival'
          and plan_items.item_id = ${festivals.slug}
      ), 0)`,
    })
    .from(festivals)
    .where(eq(festivals.slug, slug))
    .limit(1)

  if (rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Festival not found' })
  }

  const r = rows[0]
  return {
    ...r,
    styles: r.styles ?? [],
    signupCount: Number(r.signupCount) || 0,
  }
})
