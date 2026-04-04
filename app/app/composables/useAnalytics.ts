/**
 * Analytics composable for the Festival Schedule B2C pilot.
 *
 * Wraps PostHog event tracking with typed helper functions matching
 * the tracking spec at:
 *   01_Domains/Festival_Experience/Metrics/001_Analytics_Tracking_Spec.md
 *
 * Usage:
 *   const { trackScheduleOpen, trackWorkshopTapped, ... } = useAnalytics()
 *
 * If PostHog is not initialized (no API key), all calls are safe no-ops.
 */
import type { DanceStyle, FestivalMetadata } from '~/types/schedule'

type PostHog = {
  capture: (event: string, properties?: Record<string, unknown>) => void
  get_property: (key: string) => unknown
}

function getPostHog(): PostHog | null {
  const nuxtApp = tryUseNuxtApp()
  return (nuxtApp?.$posthog as PostHog) ?? null
}

/**
 * Global properties attached to every event per the tracking spec.
 * Call setFestivalContext() once when the schedule data loads.
 */
let festivalContext: Record<string, unknown> = {}

function withContext(props: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...festivalContext, ...props }
}

export function useAnalytics() {
  /**
   * Set the global festival context that will be attached to every event.
   * Call this once when the schedule data is loaded.
   */
  function setFestivalContext(festival: FestivalMetadata) {
    festivalContext = {
      festival_id: `${festival.city?.toLowerCase() ?? 'unknown'}-${festival.startDate}`,
      festival_name: festival.name,
    }
  }

  // --- Section 4.1: Page and Session Events ---

  /**
   * schedule_open: fires when the schedule page renders with data.
   * NOT the same as $pageview (which fires on route change).
   */
  function trackScheduleOpen(dayCount: number, workshopCount: number) {
    const ph = getPostHog()
    if (!ph) return

    const sessionNumber = (ph.get_property('$session_count') as number) ?? 1

    ph.capture('schedule_open', withContext({
      day_count: dayCount,
      workshop_count: workshopCount,
    }))

    // Fire return_visit if this is not the first session (Section 4.4)
    if (sessionNumber > 1) {
      ph.capture('return_visit', withContext({
        session_number: sessionNumber,
      }))
    }
  }

  // --- Section 4.2: Engagement Events ---

  /**
   * filter_used: fires when the user applies any filter.
   */
  function trackFilterUsed(filterType: 'style' | 'day' | 'room' | 'time', filterValue: string) {
    getPostHog()?.capture('filter_used', withContext({
      filter_type: filterType,
      filter_value: filterValue,
    }))
  }

  /**
   * workshop_tapped: fires when the user taps/clicks a workshop for details.
   */
  function trackWorkshopTapped(workshop: {
    id: string
    name: string
    danceStyle?: DanceStyle
    artist?: string
    roomName: string
    startTime: string
    day: string
  }) {
    getPostHog()?.capture('workshop_tapped', withContext({
      workshop_id: workshop.id,
      workshop_name: workshop.name,
      dance_style: workshop.danceStyle,
      artist: workshop.artist,
      room: workshop.roomName,
      time_slot: `${workshop.day}T${workshop.startTime}`,
    }))
  }

  /**
   * day_switched: fires when the user switches between days.
   */
  function trackDaySwitched(fromDay: string | null, toDay: string | null) {
    getPostHog()?.capture('day_switched', withContext({
      from_day: fromDay,
      to_day: toDay,
    }))
  }

  // --- Section 4.3: Sharing and Virality Events ---

  /**
   * share_initiated: fires when the user taps a share button.
   */
  function trackShareInitiated(
    shareMethod: 'native_share' | 'copy_link' | 'whatsapp' | 'facebook',
    workshopId?: string
  ) {
    getPostHog()?.capture('share_initiated', withContext({
      share_method: shareMethod,
      workshop_id: workshopId,
    }))
  }

  /**
   * link_copied: fires when a link is copied to the clipboard.
   */
  function trackLinkCopied(sharedUrl: string, workshopId?: string) {
    getPostHog()?.capture('link_copied', withContext({
      shared_url: sharedUrl,
      workshop_id: workshopId,
    }))
  }

  /**
   * share_completed: fires when the native share dialog completes.
   */
  function trackShareCompleted(shareTarget?: string) {
    getPostHog()?.capture('share_completed', withContext({
      share_target: shareTarget,
    }))
  }

  // --- Section 4.5: Error and Performance Events ---

  /**
   * schedule_load_error: fires when schedule data fails to load.
   */
  function trackScheduleLoadError(errorType: string, errorMessage: string) {
    getPostHog()?.capture('schedule_load_error', withContext({
      error_type: errorType,
      error_message: errorMessage,
    }))
  }

  /**
   * page_performance: fires after page load with performance metrics.
   */
  function trackPagePerformance() {
    if (typeof window === 'undefined' || !window.performance) return

    // Wait for the load event to complete
    const measure = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (!nav) return

      getPostHog()?.capture('page_performance', withContext({
        load_time_ms: Math.round(nav.loadEventEnd - nav.startTime),
        ttfb_ms: Math.round(nav.responseStart - nav.startTime),
      }))
    }

    if (document.readyState === 'complete') {
      setTimeout(measure, 0)
    } else {
      window.addEventListener('load', () => setTimeout(measure, 0))
    }
  }

  // --- Section 4.2: Scroll Depth (25/50/75/100%) ---

  /**
   * Set up scroll depth tracking. Call once on the schedule page.
   * Fires scroll_depth events at 25%, 50%, 75%, and 100% thresholds.
   */
  function trackScrollDepth() {
    if (typeof window === 'undefined') return

    const thresholds = [25, 50, 75, 100]
    const fired = new Set<number>()

    const handler = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return

      const percent = Math.round((scrollTop / docHeight) * 100)

      for (const threshold of thresholds) {
        if (percent >= threshold && !fired.has(threshold)) {
          fired.add(threshold)
          getPostHog()?.capture('scroll_depth', withContext({
            depth_percent: threshold,
          }))
        }
      }
    }

    window.addEventListener('scroll', handler, { passive: true })

    // Return cleanup function
    return () => window.removeEventListener('scroll', handler)
  }

  return {
    setFestivalContext,
    trackScheduleOpen,
    trackFilterUsed,
    trackWorkshopTapped,
    trackDaySwitched,
    trackShareInitiated,
    trackLinkCopied,
    trackShareCompleted,
    trackScheduleLoadError,
    trackPagePerformance,
    trackScrollDepth,
  }
}
