import { describe, it, expect } from 'vitest'
import { getStyleColor, getStyleDisplayName, styleColorMap, styleDisplayMap } from '~/utils/styleColors'

describe('styleColors utility', () => {
  describe('getStyleColor', () => {
    it('returns the correct color for known styles', () => {
      expect(getStyleColor('bachata')).toBe('#7C3AED')
      expect(getStyleColor('salsa-cubana')).toBe('#DC2626')
      expect(getStyleColor('kizomba')).toBe('#0E7490')
      expect(getStyleColor('zouk')).toBe('#BE185D')
      expect(getStyleColor('reggaeton')).toBe('#4338CA')
      expect(getStyleColor('semba')).toBe('#15803D')
    })

    it('returns fallback gray for unknown styles', () => {
      expect(getStyleColor('unknown-style')).toBe('#6B7280')
    })

    it('returns fallback gray for undefined', () => {
      expect(getStyleColor(undefined)).toBe('#6B7280')
    })

    it('returns fallback gray for "other"', () => {
      expect(getStyleColor('other')).toBe('#6B7280')
    })
  })

  describe('getStyleDisplayName', () => {
    it('returns display name for known styles', () => {
      expect(getStyleDisplayName('bachata')).toBe('Bachata')
      expect(getStyleDisplayName('salsa-cubana')).toBe('Salsa Cubana')
      expect(getStyleDisplayName('body-movement')).toBe('Body Movement')
      expect(getStyleDisplayName('lady-styling')).toBe('Lady Styling')
    })

    it('returns the raw key as fallback for unknown styles', () => {
      expect(getStyleDisplayName('some-new-style')).toBe('some-new-style')
    })

    it('returns "Other" for undefined', () => {
      expect(getStyleDisplayName(undefined)).toBe('Other')
    })
  })

  describe('styleColorMap', () => {
    it('has entries for all standard dance styles', () => {
      const expectedStyles = [
        'salsa-cubana', 'salsa-linear', 'bachata', 'kizomba', 'zouk',
        'afro-cuban', 'reggaeton', 'semba', 'cha-cha-cha', 'son',
        'rumba', 'lady-styling', 'man-styling', 'musicality',
        'body-movement', 'other',
      ]
      for (const style of expectedStyles) {
        expect(styleColorMap[style]).toBeDefined()
        expect(styleColorMap[style]).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })

    it('uses spec-defined solid colors (not pastel)', () => {
      // Per Design System Brief section 3: Dance Style Colors
      expect(styleColorMap['bachata']).toBe('#7C3AED')
      expect(styleColorMap['kizomba']).toBe('#0E7490')
      expect(styleColorMap['zouk']).toBe('#BE185D')
      expect(styleColorMap['reggaeton']).toBe('#4338CA')
    })
  })

  describe('styleDisplayMap', () => {
    it('has entries for all standard dance styles', () => {
      const expectedStyles = [
        'salsa-cubana', 'salsa-linear', 'bachata', 'kizomba', 'zouk',
        'afro-cuban', 'reggaeton', 'semba', 'cha-cha-cha', 'son',
        'rumba', 'lady-styling', 'man-styling', 'musicality',
        'body-movement', 'other',
      ]
      for (const style of expectedStyles) {
        expect(styleDisplayMap[style]).toBeDefined()
        expect(typeof styleDisplayMap[style]).toBe('string')
      }
    })
  })
})
