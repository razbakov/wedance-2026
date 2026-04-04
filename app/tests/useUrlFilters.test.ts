import { describe, it, expect, beforeEach } from 'vitest'
import { readFiltersFromUrl, writeFiltersToUrl } from '~/composables/useUrlFilters'

describe('readFiltersFromUrl', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          search: '',
          href: 'https://app-wedance.vercel.app/',
        },
        history: {
          replaceState: () => {},
        },
      },
      writable: true,
    })
  })

  it('returns null for both when URL has no query params', () => {
    globalThis.window.location.search = ''
    const filters = readFiltersFromUrl()
    expect(filters.day).toBeNull()
    expect(filters.style).toBeNull()
  })

  it('reads day param from URL', () => {
    globalThis.window.location.search = '?day=2026-06-05'
    const filters = readFiltersFromUrl()
    expect(filters.day).toBe('2026-06-05')
    expect(filters.style).toBeNull()
  })

  it('reads style param from URL', () => {
    globalThis.window.location.search = '?style=bachata'
    const filters = readFiltersFromUrl()
    expect(filters.day).toBeNull()
    expect(filters.style).toBe('bachata')
  })

  it('reads both params from URL', () => {
    globalThis.window.location.search = '?day=2026-06-06&style=salsa-linear'
    const filters = readFiltersFromUrl()
    expect(filters.day).toBe('2026-06-06')
    expect(filters.style).toBe('salsa-linear')
  })

  it('ignores UTM params', () => {
    globalThis.window.location.search = '?day=2026-06-05&utm_source=app&utm_medium=share'
    const filters = readFiltersFromUrl()
    expect(filters.day).toBe('2026-06-05')
    // UTM params are not in filter state
    expect(filters.style).toBeNull()
  })
})

describe('writeFiltersToUrl', () => {
  let replaceStateCalls: Array<[unknown, string, string]>

  beforeEach(() => {
    replaceStateCalls = []
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          href: 'https://app-wedance.vercel.app/',
          search: '',
          origin: 'https://app-wedance.vercel.app',
          pathname: '/',
        },
        history: {
          replaceState: (...args: [unknown, string, string]) => {
            replaceStateCalls.push(args)
          },
        },
      },
      writable: true,
    })
  })

  it('sets day param in URL', () => {
    writeFiltersToUrl({ day: '2026-06-05', style: null })
    expect(replaceStateCalls.length).toBe(1)
    const url = replaceStateCalls[0][2]
    expect(url).toContain('day=2026-06-05')
    expect(url).not.toContain('style=')
  })

  it('sets style param in URL', () => {
    writeFiltersToUrl({ day: null, style: 'bachata' })
    expect(replaceStateCalls.length).toBe(1)
    const url = replaceStateCalls[0][2]
    expect(url).toContain('style=bachata')
    expect(url).not.toContain('day=')
  })

  it('sets both params', () => {
    writeFiltersToUrl({ day: '2026-06-06', style: 'salsa-cubana' })
    const url = replaceStateCalls[0][2]
    expect(url).toContain('day=2026-06-06')
    expect(url).toContain('style=salsa-cubana')
  })

  it('removes params when null', () => {
    writeFiltersToUrl({ day: null, style: null })
    const url = replaceStateCalls[0][2]
    expect(url).not.toContain('day=')
    expect(url).not.toContain('style=')
  })

  it('strips UTM params from URL', () => {
    globalThis.window.location.href =
      'https://app-wedance.vercel.app/?utm_source=app&utm_medium=share&utm_campaign=test'
    globalThis.window.location.search =
      '?utm_source=app&utm_medium=share&utm_campaign=test'
    writeFiltersToUrl({ day: '2026-06-05', style: null })
    const url = replaceStateCalls[0][2]
    expect(url).toContain('day=2026-06-05')
    expect(url).not.toContain('utm_source')
    expect(url).not.toContain('utm_medium')
    expect(url).not.toContain('utm_campaign')
  })
})
