import { describe, it, expect, beforeEach } from 'vitest'
import { buildShareUrl, buildDisplayUrl } from '~/composables/useShare'

/**
 * Tests for the share composable.
 * We test the URL-building functions directly since they are pure functions.
 * The share() method itself requires browser APIs (navigator.share, clipboard)
 * which are tested via integration/e2e tests.
 */

describe('buildShareUrl', () => {
  beforeEach(() => {
    // Mock window.location for URL building
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          origin: 'https://app-wedance.vercel.app',
          pathname: '/',
        },
      },
      writable: true,
    })
  })

  it('includes UTM parameters', () => {
    const url = buildShareUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: null,
      currentStyle: null,
    })
    expect(url).toContain('utm_source=app')
    expect(url).toContain('utm_medium=share')
    expect(url).toContain('utm_campaign=rovinj-summer-bachata-2026')
  })

  it('includes day filter in URL when active', () => {
    const url = buildShareUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: '2026-06-05',
      currentStyle: null,
    })
    expect(url).toContain('day=2026-06-05')
  })

  it('includes style filter in URL when active', () => {
    const url = buildShareUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: null,
      currentStyle: 'bachata',
    })
    expect(url).toContain('style=bachata')
  })

  it('includes both filters when both are active', () => {
    const url = buildShareUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: '2026-06-06',
      currentStyle: 'salsa-linear',
    })
    expect(url).toContain('day=2026-06-06')
    expect(url).toContain('style=salsa-linear')
    expect(url).toContain('utm_source=app')
  })

  it('does not include day or style params when null', () => {
    const url = buildShareUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: null,
      currentStyle: null,
    })
    expect(url).not.toContain('day=')
    expect(url).not.toContain('style=')
  })
})

describe('buildDisplayUrl', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          origin: 'https://app-wedance.vercel.app',
          pathname: '/',
        },
      },
      writable: true,
    })
  })

  it('does NOT include UTM parameters', () => {
    const url = buildDisplayUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: null,
      currentStyle: null,
    })
    expect(url).not.toContain('utm_source')
    expect(url).not.toContain('utm_medium')
    expect(url).not.toContain('utm_campaign')
  })

  it('includes filter state', () => {
    const url = buildDisplayUrl({
      festivalSlug: 'rovinj-summer-bachata-2026',
      festivalName: 'Summer Bachata Festival',
      currentDay: '2026-06-05',
      currentStyle: 'bachata',
    })
    expect(url).toContain('day=2026-06-05')
    expect(url).toContain('style=bachata')
    expect(url).not.toContain('utm_source')
  })
})
