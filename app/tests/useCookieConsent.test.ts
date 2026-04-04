import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * Tests for the cookie consent composable.
 *
 * We need to stub Vue's ref/computed as Nuxt auto-imports, and also
 * control localStorage and navigator.doNotTrack for each scenario.
 */

// Stub Nuxt auto-imports
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)

const STORAGE_KEY = 'wedance_cookie_consent'

// Fresh import helper -- we re-import the module for each test group
// to ensure clean state (the module has no top-level mutable state
// beyond function definitions, so a single import is fine).
const module = await import('~/composables/useCookieConsent')
const { useCookieConsent, getEffectiveConsent, isAnalyticsAllowed } = module

describe('useCookieConsent', () => {
  beforeEach(() => {
    localStorage.clear()
    // Default: DNT off
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '0',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('starts with pending consent when nothing is stored', () => {
    const { consent, showBanner } = useCookieConsent()
    expect(consent.value).toBe('pending')
    expect(showBanner.value).toBe(true)
  })

  it('accept() stores consent and hides banner', () => {
    const { consent, showBanner, accept } = useCookieConsent()
    accept()
    expect(consent.value).toBe('accepted')
    expect(showBanner.value).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('accepted')
  })

  it('reject() stores rejection and hides banner', () => {
    const { consent, showBanner, reject } = useCookieConsent()
    reject()
    expect(consent.value).toBe('rejected')
    expect(showBanner.value).toBe(false)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('rejected')
  })

  it('reads existing accepted consent from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    const { consent, showBanner } = useCookieConsent()
    expect(consent.value).toBe('accepted')
    expect(showBanner.value).toBe(false)
  })

  it('reads existing rejected consent from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    const { consent, showBanner } = useCookieConsent()
    expect(consent.value).toBe('rejected')
    expect(showBanner.value).toBe(false)
  })

  it('ignores invalid localStorage values', () => {
    localStorage.setItem(STORAGE_KEY, 'maybe')
    const { consent, showBanner } = useCookieConsent()
    expect(consent.value).toBe('pending')
    expect(showBanner.value).toBe(true)
  })
})

describe('Do Not Track support', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '0',
      writable: true,
      configurable: true,
    })
  })

  it('treats DNT=1 as rejected even with no stored choice', () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
      configurable: true,
    })
    const { consent, showBanner } = useCookieConsent()
    expect(consent.value).toBe('rejected')
    expect(showBanner.value).toBe(false)
  })

  it('treats DNT=1 as rejected even if user previously accepted', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
      configurable: true,
    })
    const { consent } = useCookieConsent()
    expect(consent.value).toBe('rejected')
  })
})

describe('getEffectiveConsent', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '0',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns pending when nothing is stored', () => {
    expect(getEffectiveConsent()).toBe('pending')
  })

  it('returns accepted when stored', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    expect(getEffectiveConsent()).toBe('accepted')
  })

  it('returns rejected when DNT is on', () => {
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
      configurable: true,
    })
    expect(getEffectiveConsent()).toBe('rejected')
  })
})

describe('isAnalyticsAllowed', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '0',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns false when consent is pending', () => {
    expect(isAnalyticsAllowed()).toBe(false)
  })

  it('returns true when consent is accepted', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    expect(isAnalyticsAllowed()).toBe(true)
  })

  it('returns false when consent is rejected', () => {
    localStorage.setItem(STORAGE_KEY, 'rejected')
    expect(isAnalyticsAllowed()).toBe(false)
  })

  it('returns false when DNT is on even if accepted', () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    Object.defineProperty(navigator, 'doNotTrack', {
      value: '1',
      writable: true,
      configurable: true,
    })
    expect(isAnalyticsAllowed()).toBe(false)
  })
})
