import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Tests that the global CSS file contains all required design tokens
 * per the Design System Brief (003) and Festival Theming Guide (004).
 */
describe('Design tokens CSS file', () => {
  const cssContent = readFileSync(
    resolve(__dirname, '../app/assets/css/main.css'),
    'utf-8'
  )

  describe('Brand palette tokens', () => {
    it('defines --color-brand-primary (#E8453C)', () => {
      expect(cssContent).toContain('--color-brand-primary: #E8453C')
    })

    it('defines --color-brand-primary-dark (#C23028)', () => {
      expect(cssContent).toContain('--color-brand-primary-dark: #C23028')
    })

    it('defines --color-brand-primary-light (#FEF2F1)', () => {
      expect(cssContent).toContain('--color-brand-primary-light: #FEF2F1')
    })
  })

  describe('Core UI palette tokens', () => {
    it('defines --color-bg-page (#F7F7F8)', () => {
      expect(cssContent).toContain('--color-bg-page: #F7F7F8')
    })

    it('defines --color-text-primary (#1A1A1A)', () => {
      expect(cssContent).toContain('--color-text-primary: #1A1A1A')
    })

    it('defines --color-text-secondary (#4A4A4A)', () => {
      expect(cssContent).toContain('--color-text-secondary: #4A4A4A')
    })

    it('defines --color-text-tertiary (#7A7A7A)', () => {
      expect(cssContent).toContain('--color-text-tertiary: #7A7A7A')
    })

    it('defines --color-border (#E2E2E4)', () => {
      expect(cssContent).toContain('--color-border: #E2E2E4')
    })

    it('defines --color-interactive (#E8453C)', () => {
      expect(cssContent).toContain('--color-interactive: #E8453C')
    })

    it('defines --color-error (#DC2626)', () => {
      expect(cssContent).toContain('--color-error: #DC2626')
    })

    it('defines --color-skeleton (#E5E5E5)', () => {
      expect(cssContent).toContain('--color-skeleton: #E5E5E5')
    })
  })

  describe('Festival theming defaults', () => {
    it('defines --festival-accent', () => {
      expect(cssContent).toContain('--festival-accent:')
    })

    it('defines --festival-accent-hover', () => {
      expect(cssContent).toContain('--festival-accent-hover:')
    })

    it('defines --festival-header-bg', () => {
      expect(cssContent).toContain('--festival-header-bg:')
    })

    it('defines --festival-header-text', () => {
      expect(cssContent).toContain('--festival-header-text:')
    })
  })

  describe('Accessibility', () => {
    it('includes prefers-reduced-motion media query', () => {
      expect(cssContent).toContain('prefers-reduced-motion: reduce')
    })

    it('sets animation-duration to near-zero in reduced motion', () => {
      expect(cssContent).toContain('animation-duration: 0.01ms !important')
    })

    it('sets transition-duration to near-zero in reduced motion', () => {
      expect(cssContent).toContain('transition-duration: 0.01ms !important')
    })
  })

  describe('Animation', () => {
    it('defines the shimmer keyframes animation', () => {
      expect(cssContent).toContain('@keyframes shimmer')
    })

    it('defines the .skeleton-shimmer class', () => {
      expect(cssContent).toContain('.skeleton-shimmer')
    })
  })
})

describe('Tailwind config', () => {
  // Read the tailwind config as text to verify font family override
  const tailwindConfig = readFileSync(
    resolve(__dirname, '../tailwind.config.ts'),
    'utf-8'
  )

  it('sets Inter as the first font in the sans stack', () => {
    expect(tailwindConfig).toContain("'Inter'")
  })

  it('includes system font fallbacks', () => {
    expect(tailwindConfig).toContain("'-apple-system'")
    expect(tailwindConfig).toContain("'BlinkMacSystemFont'")
    expect(tailwindConfig).toContain("'Roboto'")
  })
})

describe('Nuxt config', () => {
  const nuxtConfig = readFileSync(
    resolve(__dirname, '../nuxt.config.ts'),
    'utf-8'
  )

  it('includes the global CSS file', () => {
    expect(nuxtConfig).toContain('~/assets/css/main.css')
  })
})
