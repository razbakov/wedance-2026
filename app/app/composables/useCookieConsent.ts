/**
 * Cookie consent composable for GDPR-compliant analytics gating.
 *
 * Manages the user's analytics consent preference via localStorage.
 * Respects the browser's Do Not Track (DNT) setting: if DNT is enabled,
 * consent is treated as rejected and the banner is not shown.
 *
 * The PostHog plugin reads this state to decide whether to initialize.
 */

const STORAGE_KEY = 'wedance_cookie_consent'

export type ConsentStatus = 'accepted' | 'rejected' | 'pending'

/**
 * Check if the browser's Do Not Track signal is active.
 */
function isDntEnabled(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.doNotTrack === '1'
}

/**
 * Read the stored consent value from localStorage.
 */
function readConsent(): ConsentStatus {
  if (typeof localStorage === 'undefined') return 'pending'

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'accepted' || stored === 'rejected') {
    return stored
  }
  return 'pending'
}

/**
 * Get the effective consent status, factoring in DNT.
 * If DNT is enabled, always return 'rejected' regardless of stored value.
 */
export function getEffectiveConsent(): ConsentStatus {
  if (isDntEnabled()) return 'rejected'
  return readConsent()
}

/**
 * Returns true if analytics tracking is allowed.
 * Convenience function for the PostHog plugin.
 */
export function isAnalyticsAllowed(): boolean {
  return getEffectiveConsent() === 'accepted'
}

export function useCookieConsent() {
  const consent = ref<ConsentStatus>(
    typeof window !== 'undefined' ? getEffectiveConsent() : 'pending'
  )

  const showBanner = computed(() => {
    // Don't show banner if DNT is on (auto-rejected)
    if (isDntEnabled()) return false
    // Only show if no decision has been made yet
    return consent.value === 'pending'
  })

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    consent.value = 'accepted'
  }

  function reject() {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    consent.value = 'rejected'
  }

  return {
    consent,
    showBanner,
    accept,
    reject,
  }
}
