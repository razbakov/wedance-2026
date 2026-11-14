/**
 * The numbers on the "My plan" badge (header) and the "N in your week" pill
 * (city page) — RAZ-889.
 *
 * They used to be the raw size of the dancer's plan_items (every festival and
 * event ever added, past ones included), so the badge kept growing while
 * /my-plan showed a handful of things. Now both count exactly what /my-plan
 * lists, from the same feeds the page uses:
 *
 *  - festivals: the planned festivals that resolve to a real festival
 *    (`plan.myPlan`) and haven't ended yet;
 *  - courses:   "Where you show up" (`myCourses` — each with an upcoming class);
 *  - socials:   "Where you're dancing" (`weekSocials` — the next 7 days).
 *
 * `week` = socials + courses whose next class is in the same 7 days — what the
 * city page's "in your week" pill shows. `total` = festivals + courses + socials
 * — the header badge. Goals are not "upcoming things" and are not counted.
 * Any section that later shows more (RAZ-891: classes) is counted through its feed.
 */
import { and, eq, inArray } from 'drizzle-orm'
import { festivals, planItems } from '../database/schema'
import { myCourses, weekSocials } from './myPlanFeeds'

type Db = any

const DAY = 86400_000
export const WEEK_DAYS = 7

export type PlanCounts = {
  festivals: number
  courses: number
  socials: number
  /** Planned things in the next 7 days (socials + courses with a class this week). */
  week: number
  /** Everything upcoming that /my-plan shows (the header badge). */
  total: number
}

/** 'YYYY-MM-DD' of `now` in UTC — festival dates are plain dates. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * A planned festival is still upcoming until its last day (or its first day
 * when there is no end date, UTC) has passed. A festival without dates is shown on
 * /my-plan and counted. Pure — unit-tested.
 */
export function isUpcomingFestival(f: { startDate: string | null; endDate: string | null }, now: Date): boolean {
  const last = f.endDate || f.startDate
  if (!last) return true
  return last >= isoDay(now)
}

/** Pure — unit-tested. */
export function countPlan(
  input: {
    festivals: Array<{ startDate: string | null; endDate: string | null }>
    courses: Array<{ startDate: string }>
    socials: unknown[]
  },
  now: Date,
): PlanCounts {
  const until = now.getTime() + WEEK_DAYS * DAY
  const festivalCount = input.festivals.filter(f => isUpcomingFestival(f, now)).length
  const coursesThisWeek = input.courses.filter(c => new Date(c.startDate).getTime() < until).length
  const courses = input.courses.length
  const socials = input.socials.length
  return {
    festivals: festivalCount,
    courses,
    socials,
    week: socials + coursesThisWeek,
    total: festivalCount + courses + socials,
  }
}

/** The dancer's planned festivals that exist in the festivals table (as `plan.myPlan` lists them). */
async function plannedFestivals(db: Db, dancerId: string) {
  const items = await db
    .select({ itemId: planItems.itemId })
    .from(planItems)
    .where(and(eq(planItems.dancerId, dancerId), eq(planItems.itemType, 'festival')))
  if (!items.length) return []
  return db
    .select({ startDate: festivals.startDate, endDate: festivals.endDate })
    .from(festivals)
    .where(inArray(festivals.slug, items.map((i: any) => i.itemId)))
}

export async function planCounts(db: Db, dancerId: string, now = new Date()): Promise<PlanCounts> {
  const [fests, { courses }, { socials }] = await Promise.all([
    plannedFestivals(db, dancerId),
    myCourses(db, dancerId, now),
    weekSocials(db, dancerId, now, WEEK_DAYS, { friends: false }),
  ])
  return countPlan({ festivals: fests, courses, socials }, now)
}
