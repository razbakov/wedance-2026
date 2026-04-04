/**
 * URL filter state composable.
 *
 * Reads filter state (day, style) from URL query parameters on page load,
 * and writes filter changes back to the URL (without page reload) for shareability.
 *
 * Per story 008: shared links preserve the current filter view.
 */
import type { DanceStyle } from '~/types/schedule'

export interface UrlFilterState {
  day: string | null
  style: DanceStyle | null
}

/**
 * Read filter state from the current URL query parameters.
 */
export function readFiltersFromUrl(): UrlFilterState {
  if (typeof window === 'undefined') {
    return { day: null, style: null }
  }

  const params = new URLSearchParams(window.location.search)
  const day = params.get('day')
  const style = params.get('style') as DanceStyle | null

  return {
    day: day || null,
    style: style || null,
  }
}

/**
 * Write filter state to the URL query parameters without triggering a page reload.
 * Uses replaceState to avoid polluting browser history with every filter change.
 */
export function writeFiltersToUrl(state: UrlFilterState) {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  // Preserve any existing non-filter params (like UTM params from inbound links)
  // but strip UTM params from displayed URL per story 008
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
  for (const key of utmKeys) {
    url.searchParams.delete(key)
  }

  // Set or remove filter params
  if (state.day) {
    url.searchParams.set('day', state.day)
  } else {
    url.searchParams.delete('day')
  }

  if (state.style) {
    url.searchParams.set('style', state.style)
  } else {
    url.searchParams.delete('style')
  }

  window.history.replaceState({}, '', url.toString())
}

export function useUrlFilters() {
  /**
   * Read the initial filter state from the URL.
   * Called once during setup to initialize filters from a shared link.
   */
  function getInitialFilters(): UrlFilterState {
    return readFiltersFromUrl()
  }

  /**
   * Sync the current filter state to the URL.
   * Called whenever filters change.
   */
  function syncToUrl(day: string | null, style: DanceStyle | null) {
    writeFiltersToUrl({ day, style })
  }

  return {
    getInitialFilters,
    syncToUrl,
  }
}
