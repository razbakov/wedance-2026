/**
 * The "My plan" badge (SiteHeader) and the city page's "N in your week" pill
 * (RAZ-889): counts of what /my-plan actually lists, from `plan.counts` —
 * upcoming festivals, courses and this week's socials. Not the size of
 * useWeekPlan / useYearPlan's id sets, which hold every event or festival ever
 * added (past ones too), so the badge kept growing past what the page showed.
 *
 * Loaded by plugins/04.plan.client.ts after hydration (SSR and the first client
 * render both show 0) and refetched whenever a plan mutation succeeds
 * (app/lib/planChanged.ts, wired in the tRPC client).
 */
type Counts = { total: number; week: number }

const counts = ref<Counts>({ total: 0, week: 0 })
let inFlight: Promise<void> | null = null
let again = false

export function usePlanCounts() {
  /**
   * Fetch the counts. Calls made while a fetch is running collapse into one
   * more fetch after it, so the last answer always reflects the last change.
   */
  function refresh(): Promise<void> {
    if (inFlight) {
      again = true
      return inFlight
    }
    const { $trpc } = useNuxtApp()
    inFlight = $trpc.plan.counts
      .query()
      .then((c) => {
        counts.value = { total: c.total, week: c.week }
      })
      .catch((err) => {
        console.warn('[usePlanCounts] refresh failed:', err)
      })
      .finally(() => {
        inFlight = null
        if (again) {
          again = false
          refresh()
        }
      })
    return inFlight
  }

  function reset() {
    again = false
    counts.value = { total: 0, week: 0 }
  }

  return {
    /** Everything upcoming that /my-plan shows — the header badge. */
    planTotal: computed(() => counts.value.total),
    /** Planned things in the next 7 days — the "in your week" pill. */
    planWeek: computed(() => counts.value.week),
    refresh,
    reset,
  }
}
