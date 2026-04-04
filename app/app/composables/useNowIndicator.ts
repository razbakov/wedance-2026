/**
 * "Now" indicator composable for the Festival Schedule.
 *
 * Per story 007:
 * - Highlights the current time slot during the festival
 * - Auto-scrolls to "happening now" on page load
 * - Default view on festival days shows the current day
 * - Before the festival starts, shows the first day
 *
 * Uses the device's local time compared against the festival timezone.
 * Time comparison uses simple HH:MM string comparison which works for 24h format.
 */

export interface NowIndicatorOptions {
  /** Festival start date (ISO, e.g. "2026-06-05") */
  startDate: string
  /** Festival end date (ISO, e.g. "2026-06-08") */
  endDate: string
  /** Festival IANA timezone (e.g. "Europe/Zagreb") */
  timezone: string
}

/**
 * Get the current date and time in the festival's timezone.
 * Returns { date: "YYYY-MM-DD", time: "HH:MM" }.
 */
export function getNowInTimezone(timezone: string): { date: string; time: string } {
  const now = new Date()

  // Format date as YYYY-MM-DD in the festival timezone
  const dateStr = now.toLocaleDateString('sv-SE', { timeZone: timezone })

  // Format time as HH:MM in the festival timezone
  const timeStr = now.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return { date: dateStr, time: timeStr }
}

/**
 * Check whether a workshop is currently happening.
 */
export function isWorkshopHappeningNow(
  workshopDay: string,
  workshopStart: string,
  workshopEnd: string,
  nowDate: string,
  nowTime: string
): boolean {
  if (workshopDay !== nowDate) return false
  return nowTime >= workshopStart && nowTime < workshopEnd
}

/**
 * Check whether a workshop has already ended.
 */
export function isWorkshopPast(
  workshopDay: string,
  workshopEnd: string,
  nowDate: string,
  nowTime: string
): boolean {
  if (workshopDay < nowDate) return true
  if (workshopDay === nowDate && workshopEnd <= nowTime) return true
  return false
}

export function useNowIndicator(options: NowIndicatorOptions) {
  const { startDate, endDate, timezone } = options

  /** Reactive "now" that updates every minute. */
  const now = ref(getNowInTimezone(timezone))

  let intervalId: ReturnType<typeof setInterval> | null = null

  /**
   * Whether the festival is currently happening (today is within the date range).
   */
  const isFestivalLive = computed(() => {
    return now.value.date >= startDate && now.value.date <= endDate
  })

  /**
   * Whether we are before the festival.
   */
  const isBeforeFestival = computed(() => {
    return now.value.date < startDate
  })

  /**
   * The day that should be selected by default.
   * During the festival: current day.
   * Before the festival: first day.
   * After the festival: null (show all).
   */
  const defaultDay = computed<string | null>(() => {
    if (isFestivalLive.value) {
      return now.value.date
    }
    if (isBeforeFestival.value) {
      return startDate
    }
    return null
  })

  /**
   * Check whether a specific workshop is happening now.
   */
  function isNow(workshopDay: string, workshopStart: string, workshopEnd: string): boolean {
    return isWorkshopHappeningNow(workshopDay, workshopStart, workshopEnd, now.value.date, now.value.time)
  }

  /**
   * Check whether a specific workshop is in the past.
   */
  function isPast(workshopDay: string, workshopEnd: string): boolean {
    return isWorkshopPast(workshopDay, workshopEnd, now.value.date, now.value.time)
  }

  /**
   * Start updating the clock every minute.
   * Call this in onMounted.
   */
  function startClock() {
    // Update immediately
    now.value = getNowInTimezone(timezone)

    // Then update every 60 seconds
    intervalId = setInterval(() => {
      now.value = getNowInTimezone(timezone)
    }, 60_000)
  }

  /**
   * Stop the clock interval.
   * Call this in onUnmounted.
   */
  function stopClock() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  /**
   * Scroll to the first "happening now" workshop card.
   * Uses a data attribute [data-now="true"] on workshop cards.
   */
  function scrollToNow() {
    if (typeof document === 'undefined') return

    // Wait for DOM to update after filters are applied
    nextTick(() => {
      setTimeout(() => {
        const nowEl = document.querySelector('[data-now="true"]')
        if (nowEl) {
          nowEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    })
  }

  return {
    now,
    isFestivalLive,
    isBeforeFestival,
    defaultDay,
    isNow,
    isPast,
    startClock,
    stopClock,
    scrollToNow,
  }
}
