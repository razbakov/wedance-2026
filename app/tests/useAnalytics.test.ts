import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the analytics composable.
 *
 * Since useAnalytics depends on the Nuxt runtime ($posthog injection via
 * tryUseNuxtApp auto-import), we mock it at the global level as Nuxt would.
 */

// Provide the Nuxt auto-import as a global, which is how Nuxt makes it available
vi.stubGlobal('tryUseNuxtApp', () => null)

// We need to import after stubbing globals
const { useAnalytics } = await import('~/composables/useAnalytics')

describe('useAnalytics', () => {
  let analytics: ReturnType<typeof useAnalytics>

  beforeEach(() => {
    analytics = useAnalytics()
  })

  it('exports all tracking functions from the spec', () => {
    // Section 4.1: Page and Session Events
    expect(typeof analytics.trackScheduleOpen).toBe('function')

    // Section 4.2: Engagement Events
    expect(typeof analytics.trackFilterUsed).toBe('function')
    expect(typeof analytics.trackWorkshopTapped).toBe('function')
    expect(typeof analytics.trackDaySwitched).toBe('function')

    // Section 4.3: Sharing and Virality Events
    expect(typeof analytics.trackShareInitiated).toBe('function')
    expect(typeof analytics.trackLinkCopied).toBe('function')
    expect(typeof analytics.trackShareCompleted).toBe('function')

    // Section 4.4: Return and Retention (handled inside trackScheduleOpen)

    // Section 4.5: Error and Performance Events
    expect(typeof analytics.trackScheduleLoadError).toBe('function')
    expect(typeof analytics.trackPagePerformance).toBe('function')

    // Scroll depth
    expect(typeof analytics.trackScrollDepth).toBe('function')

    // Festival context setter
    expect(typeof analytics.setFestivalContext).toBe('function')
  })

  it('does not throw when PostHog is not available', () => {
    // All methods should be safe no-ops when $posthog is null
    expect(() => analytics.setFestivalContext({
      name: 'Test Festival',
      startDate: '2026-06-12',
      endDate: '2026-06-14',
      timezone: 'Europe/Berlin',
    })).not.toThrow()

    expect(() => analytics.trackScheduleOpen(3, 18)).not.toThrow()
    expect(() => analytics.trackFilterUsed('style', 'bachata')).not.toThrow()
    expect(() => analytics.trackWorkshopTapped({
      id: 'ws-001',
      name: 'Test Workshop',
      danceStyle: 'bachata',
      artist: 'Test Artist',
      roomName: 'Main Hall',
      startTime: '14:00',
      day: '2026-06-12',
    })).not.toThrow()
    expect(() => analytics.trackDaySwitched(null, '2026-06-12')).not.toThrow()
    expect(() => analytics.trackShareInitiated('copy_link', 'ws-001')).not.toThrow()
    expect(() => analytics.trackLinkCopied('https://example.com', 'ws-001')).not.toThrow()
    expect(() => analytics.trackShareCompleted('whatsapp')).not.toThrow()
    expect(() => analytics.trackScheduleLoadError('network', 'Failed to fetch')).not.toThrow()
    expect(() => analytics.trackPagePerformance()).not.toThrow()
    expect(() => analytics.trackScrollDepth()).not.toThrow()
  })

  it('trackFilterUsed accepts all filter types from the spec', () => {
    const filterTypes: Array<'style' | 'day' | 'room' | 'time'> = ['style', 'day', 'room', 'time']
    for (const filterType of filterTypes) {
      expect(() => analytics.trackFilterUsed(filterType, 'test-value')).not.toThrow()
    }
  })

  it('trackShareInitiated accepts all share methods from the spec', () => {
    const methods: Array<'native_share' | 'copy_link' | 'whatsapp' | 'facebook'> = [
      'native_share', 'copy_link', 'whatsapp', 'facebook',
    ]
    for (const method of methods) {
      expect(() => analytics.trackShareInitiated(method)).not.toThrow()
    }
  })
})

describe('useAnalytics with PostHog mock', () => {
  it('calls posthog.capture with correct event names and properties', () => {
    const mockCapture = vi.fn()
    const mockGetProperty = vi.fn().mockReturnValue(2)

    // Override the global to return a mock PostHog instance
    vi.stubGlobal('tryUseNuxtApp', () => ({
      $posthog: {
        capture: mockCapture,
        get_property: mockGetProperty,
      },
    }))

    const analytics = useAnalytics()

    // Set festival context first
    analytics.setFestivalContext({
      name: 'Test Fest',
      startDate: '2026-06-12',
      endDate: '2026-06-14',
      timezone: 'Europe/Berlin',
      city: 'Munich',
    })

    // Test schedule_open event
    analytics.trackScheduleOpen(3, 18)
    expect(mockCapture).toHaveBeenCalledWith('schedule_open', expect.objectContaining({
      festival_name: 'Test Fest',
      day_count: 3,
      workshop_count: 18,
    }))

    // Should also fire return_visit since session_count > 1
    // Per tracking spec, return_visit must include festival_phase and days_since_first_visit
    expect(mockCapture).toHaveBeenCalledWith('return_visit', expect.objectContaining({
      session_number: 2,
      festival_phase: expect.stringMatching(/^(pre|during|post)$/),
      days_since_first_visit: expect.any(Number),
    }))

    mockCapture.mockClear()

    // Test filter_used event
    analytics.trackFilterUsed('style', 'bachata')
    expect(mockCapture).toHaveBeenCalledWith('filter_used', expect.objectContaining({
      filter_type: 'style',
      filter_value: 'bachata',
    }))

    mockCapture.mockClear()

    // Test workshop_tapped event
    analytics.trackWorkshopTapped({
      id: 'ws-001',
      name: 'Bachata Basics',
      danceStyle: 'bachata',
      artist: 'Test Artist',
      roomName: 'Main Hall',
      startTime: '14:00',
      day: '2026-06-12',
    })
    expect(mockCapture).toHaveBeenCalledWith('workshop_tapped', expect.objectContaining({
      workshop_id: 'ws-001',
      workshop_name: 'Bachata Basics',
      dance_style: 'bachata',
    }))

    mockCapture.mockClear()

    // Test day_switched event
    analytics.trackDaySwitched('2026-06-12', '2026-06-13')
    expect(mockCapture).toHaveBeenCalledWith('day_switched', expect.objectContaining({
      from_day: '2026-06-12',
      to_day: '2026-06-13',
    }))

    mockCapture.mockClear()

    // Test share events
    analytics.trackShareInitiated('whatsapp', 'ws-001')
    expect(mockCapture).toHaveBeenCalledWith('share_initiated', expect.objectContaining({
      share_method: 'whatsapp',
      workshop_id: 'ws-001',
    }))

    mockCapture.mockClear()

    analytics.trackLinkCopied('https://wedance.vip/test', 'ws-001')
    expect(mockCapture).toHaveBeenCalledWith('link_copied', expect.objectContaining({
      shared_url: 'https://wedance.vip/test',
      workshop_id: 'ws-001',
    }))

    mockCapture.mockClear()

    // Test error tracking
    analytics.trackScheduleLoadError('network', 'Failed to fetch')
    expect(mockCapture).toHaveBeenCalledWith('schedule_load_error', expect.objectContaining({
      error_type: 'network',
      error_message: 'Failed to fetch',
    }))

    // Restore the default mock
    vi.stubGlobal('tryUseNuxtApp', () => null)
  })

  it('does not fire return_visit on first session', () => {
    const mockCapture = vi.fn()
    const mockGetProperty = vi.fn().mockReturnValue(1) // first session

    vi.stubGlobal('tryUseNuxtApp', () => ({
      $posthog: {
        capture: mockCapture,
        get_property: mockGetProperty,
      },
    }))

    const analytics = useAnalytics()
    analytics.trackScheduleOpen(3, 18)

    expect(mockCapture).toHaveBeenCalledWith('schedule_open', expect.any(Object))
    expect(mockCapture).not.toHaveBeenCalledWith('return_visit', expect.any(Object))

    vi.stubGlobal('tryUseNuxtApp', () => null)
  })
})
