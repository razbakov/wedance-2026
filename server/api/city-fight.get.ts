import { and, eq, desc, inArray } from 'drizzle-orm'
import { useDb } from '../utils/db'
import { cityVideos, profiles } from '../database/schema'

/**
 * City-vs-city video battle for the /cities page. Pairs the current month's
 * winning video (highest-ELO approved, same rule as cityVideo.monthWinner) from
 * two different cities.
 *
 * Returns { fight: null } whenever fewer than two cities have a winner yet — the
 * <CityFight> component renders nothing in that case, so the battle stays hidden
 * until the per-city competition actually has content (today: 0 approved videos).
 * No fabricated matchups.
 */
type Fighter = { citySlug: string; city: string; videoId: string; title: string; videoUrl: string; thumbnailUrl: string | null; danceStyle: string | null; eloScore: number }
export type CityFight = { fight: { month: string; a: Fighter; b: Fighter } | null }

export default defineEventHandler(async (): Promise<CityFight> => {
  const month = new Date().toISOString().slice(0, 7) // YYYY-MM
  const db = useDb()

  const vids = await db
    .select({
      id: cityVideos.id, citySlug: cityVideos.citySlug, title: cityVideos.title,
      videoUrl: cityVideos.videoUrl, thumbnailUrl: cityVideos.thumbnailUrl,
      danceStyle: cityVideos.danceStyle, eloScore: cityVideos.eloScore,
    })
    .from(cityVideos)
    .where(and(eq(cityVideos.status, 'approved'), eq(cityVideos.competitionMonth, month)))
    .orderBy(desc(cityVideos.eloScore))

  // Winner = first (highest-ELO) video seen per city.
  const winners = new Map<string, typeof vids[number]>()
  for (const v of vids) if (!winners.has(v.citySlug)) winners.set(v.citySlug, v)
  const list = [...winners.values()]
  if (list.length < 2) return { fight: null }

  // Two distinct random cities for today's battle.
  const i = Math.floor(Math.random() * list.length)
  let j = Math.floor(Math.random() * (list.length - 1))
  if (j >= i) j++
  const picks = [list[i], list[j]]

  // Real display names for the two cities.
  const names = await db
    .select({ city: profiles.city, citySlug: profiles.citySlug })
    .from(profiles)
    .where(inArray(profiles.citySlug, picks.map(p => p.citySlug)))
  const nameOf = (slug: string) => names.find(n => n.citySlug === slug)?.city
    ?? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const toFighter = (v: typeof vids[number]): Fighter => ({
    citySlug: v.citySlug, city: nameOf(v.citySlug), videoId: v.id, title: v.title,
    videoUrl: v.videoUrl, thumbnailUrl: v.thumbnailUrl, danceStyle: v.danceStyle, eloScore: v.eloScore,
  })
  return { fight: { month, a: toFighter(picks[0]), b: toFighter(picks[1]) } }
})
