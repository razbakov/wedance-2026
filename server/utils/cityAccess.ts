import { eq, and, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { cityPages, profiles, profileMembers, cities } from '../database/schema'
import { assertProfileGranted, type Db, type GrantCtx } from './profileAccess'

/**
 * City channels (migration 0067): who runs a city's own WeDance accounts.
 *
 * A city has at most one city page (city_pages → a business profile, e.g. @wedancemunich).
 * The page's team are the city's admins: they write and post the weekly schedule,
 * manage the official channels, and review groups people submit for that city.
 * WeDance admins can do all of it in every city.
 */
export interface CityCtx extends GrantCtx { db: Db; dancerId?: string | null; isAdmin?: boolean }

export async function cityPageOf(db: Db, citySlug: string) {
  const [row] = await db.select({ profile: profiles }).from(cityPages)
    .innerJoin(profiles, eq(profiles.id, cityPages.profileId))
    .where(eq(cityPages.citySlug, citySlug))
  return row?.profile ?? null
}

/** The city a page runs, if it is a city page. */
export async function cityOfPage(db: Db, profileId: string): Promise<string | null> {
  const [row] = await db.select({ citySlug: cityPages.citySlug }).from(cityPages).where(eq(cityPages.profileId, profileId))
  return row?.citySlug ?? null
}

/** Cities whose page this dancer is on the team of. */
export async function citiesManagedBy(db: Db, dancerId: string): Promise<string[]> {
  const rows = await db.select({ citySlug: cityPages.citySlug }).from(cityPages)
    .innerJoin(profileMembers, eq(profileMembers.profileId, cityPages.profileId))
    .where(eq(profileMembers.dancerId, dancerId))
  return rows.map((r: { citySlug: string }) => r.citySlug)
}

export async function isCityAdmin(ctx: CityCtx, citySlug: string): Promise<boolean> {
  if (ctx.isAdmin) return true
  if (!ctx.dancerId) return false
  const page = await cityPageOf(ctx.db, citySlug)
  if (!page) return false
  const [m] = await ctx.db.select({ id: profileMembers.id }).from(profileMembers)
    .where(and(eq(profileMembers.profileId, page.id), eq(profileMembers.dancerId, ctx.dancerId)))
  return !!m
}

/** The city's page (null when it has none yet — only WeDance admins get past that), or FORBIDDEN. */
export async function requireCityAdmin(ctx: CityCtx, citySlug: string) {
  const page = await cityPageOf(ctx.db, citySlug)
  if (ctx.isAdmin) return page
  if (!page || !(await isCityAdmin(ctx, citySlug))) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only this city’s WeDance admins can do that.' })
  }
  assertProfileGranted(ctx, page.id)
  return page
}

/** Display names for city slugs (the cities table, else the slug itself). */
export async function cityNames(db: Db, slugs: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!slugs.length) return out
  const rows = await db.select({ slug: cities.slug, name: cities.name }).from(cities).where(inArray(cities.slug, slugs))
  for (const r of rows) out.set(r.slug, r.name)
  for (const s of slugs) if (!out.has(s)) out.set(s, s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  return out
}
