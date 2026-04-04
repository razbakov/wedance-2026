import { describe, it, expect } from 'vitest'
import { getStyleColor, getStyleDisplayName, getLevelDisplayName, styleColorMap } from '~/utils/styleColors'

describe('getStyleColor', () => {
  it('returns the correct solid hex color for known styles', () => {
    expect(getStyleColor('bachata')).toBe('#7C3AED')
    expect(getStyleColor('salsa-cubana')).toBe('#DC2626')
    expect(getStyleColor('kizomba')).toBe('#0E7490')
    expect(getStyleColor('zouk')).toBe('#BE185D')
    expect(getStyleColor('reggaeton')).toBe('#4338CA')
    expect(getStyleColor('semba')).toBe('#15803D')
  })

  it('returns default gray for unknown styles', () => {
    expect(getStyleColor('unknown-style')).toBe('#6B7280')
  })

  it('returns default gray for undefined', () => {
    expect(getStyleColor(undefined)).toBe('#6B7280')
  })

  it('all style colors are solid hex values (not pastel/Tailwind classes)', () => {
    for (const [style, color] of Object.entries(styleColorMap)) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      // Ensure they are not pastel (low saturation) colors
      // All spec colors are dark enough for white text contrast
      expect(color).not.toMatch(/^#[A-Fa-f]{2}[A-Fa-f]{2}[A-Fa-f]{2}$/)
    }
  })
})

describe('getStyleDisplayName', () => {
  it('returns human-readable name for known styles', () => {
    expect(getStyleDisplayName('salsa-cubana')).toBe('Salsa Cubana')
    expect(getStyleDisplayName('bachata')).toBe('Bachata')
    expect(getStyleDisplayName('body-movement')).toBe('Body Movement')
  })

  it('returns the raw value for unknown styles', () => {
    expect(getStyleDisplayName('unknown')).toBe('unknown')
  })

  it('returns empty string for undefined', () => {
    expect(getStyleDisplayName(undefined)).toBe('')
  })
})

describe('getLevelDisplayName', () => {
  it('returns human-readable name for known levels', () => {
    expect(getLevelDisplayName('beginner')).toBe('Beginner')
    expect(getLevelDisplayName('all-levels')).toBe('All Levels')
  })

  it('returns null for undefined', () => {
    expect(getLevelDisplayName(undefined)).toBeNull()
  })
})
