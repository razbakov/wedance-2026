import { describe, expect, it } from 'vitest'
import { contrastRatio, wcagLevel } from './contrast'

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(contrastRatio('#dc2626', '#dc2626')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    expect(contrastRatio('#3b1f0d', '#fbf5ea')).toBeCloseTo(contrastRatio('#fbf5ea', '#3b1f0d'), 10)
  })
})

describe('wcagLevel', () => {
  it('maps ratios to WCAG levels', () => {
    expect(wcagLevel(7.2)).toBe('AAA')
    expect(wcagLevel(4.6)).toBe('AA')
    expect(wcagLevel(3.1)).toBe('AA large')
    expect(wcagLevel(2)).toBe('fail')
  })
})
