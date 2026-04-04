/**
 * Share composable for the Festival Schedule.
 *
 * Implements the share flow per story 008:
 * - Web Share API on supported browsers (mobile)
 * - Clipboard fallback with toast confirmation
 * - Organic UTM parameters for dancer-to-dancer shares
 *   (utm_source=dancer_share, utm_medium=referral, utm_campaign=organic)
 * - Filter state encoded in the URL so shared links preserve the view
 */
import type { DanceStyle } from '~/types/schedule'

export interface ShareOptions {
  festivalSlug: string
  festivalName: string
  city?: string
  currentDay: string | null
  currentStyle: DanceStyle | null
  /** Optional workshop ID for workshop-specific shares */
  workshopId?: string
}

/**
 * Build a shareable URL with organic UTM parameters and filter state.
 *
 * Per Analytics Tracking Spec Section 5.3, dancer-initiated shares use:
 *   utm_source=dancer_share, utm_medium=referral, utm_campaign=organic
 *   utm_content={workshop_id} (when sharing a specific workshop)
 */
export function buildShareUrl(options: ShareOptions): string {
  if (typeof window === 'undefined') return ''

  const url = new URL(window.location.origin + window.location.pathname)

  // Encode current filter state
  if (options.currentDay) {
    url.searchParams.set('day', options.currentDay)
  }
  if (options.currentStyle) {
    url.searchParams.set('style', options.currentStyle)
  }

  // Append organic share UTM parameters (per tracking spec)
  url.searchParams.set('utm_source', 'dancer_share')
  url.searchParams.set('utm_medium', 'referral')
  url.searchParams.set('utm_campaign', 'organic')
  if (options.workshopId) {
    url.searchParams.set('utm_content', options.workshopId)
  }

  return url.toString()
}

/**
 * Build a clean display URL (without UTM params) for showing to the user.
 */
export function buildDisplayUrl(options: ShareOptions): string {
  if (typeof window === 'undefined') return ''

  const url = new URL(window.location.origin + window.location.pathname)

  if (options.currentDay) {
    url.searchParams.set('day', options.currentDay)
  }
  if (options.currentStyle) {
    url.searchParams.set('style', options.currentStyle)
  }

  return url.toString()
}

/**
 * Build the share text suggestion.
 */
function buildShareText(options: ShareOptions): string {
  const cityPart = options.city ? ` in ${options.city}` : ''
  return `Check out the ${options.festivalName} schedule${cityPart}!`
}

export function useShare() {
  const toastVisible = ref(false)
  const toastMessage = ref('')

  /** Whether the Web Share API is available. */
  const canNativeShare = computed(() => {
    if (typeof navigator === 'undefined') return false
    return !!navigator.share
  })

  /**
   * Show a toast notification that auto-hides after a delay.
   */
  function showToast(message: string, duration = 3000) {
    toastMessage.value = message
    toastVisible.value = true
    setTimeout(() => {
      toastVisible.value = false
    }, duration)
  }

  /**
   * Trigger the share flow.
   * Uses Web Share API if available, otherwise copies to clipboard.
   * Returns the share method used for analytics tracking.
   */
  async function share(
    options: ShareOptions
  ): Promise<'native_share' | 'copy_link'> {
    const shareUrl = buildShareUrl(options)
    const shareText = buildShareText(options)

    if (canNativeShare.value) {
      try {
        await navigator.share({
          title: options.festivalName,
          text: shareText,
          url: shareUrl,
        })
        return 'native_share'
      } catch (err) {
        // User cancelled the share dialog -- not an error
        if (err instanceof Error && err.name === 'AbortError') {
          return 'native_share'
        }
        // Fall through to clipboard fallback if share fails
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link copied!')
    } catch {
      // Final fallback: select text from a temporary input
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      showToast('Link copied!')
    }

    return 'copy_link'
  }

  return {
    canNativeShare,
    toastVisible,
    toastMessage,
    share,
    showToast,
    buildShareUrl,
    buildDisplayUrl,
  }
}
