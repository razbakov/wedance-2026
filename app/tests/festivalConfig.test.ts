import { describe, it, expect } from 'vitest'
import { getActiveFestival, getFestivalBySlug } from '~/data/festivals'
import { rovinjFestival } from '~/data/festivals/rovinj-summer-bachata-2026'

describe('Festival config loader', () => {
  it('getActiveFestival returns the Rovinj festival', () => {
    const config = getActiveFestival()
    expect(config.slug).toBe('rovinj-summer-bachata-2026')
    expect(config.schedule.festival.name).toBe('Summer Bachata Festival')
    expect(config.schedule.festival.city).toBe('Rovinj')
  })

  it('getFestivalBySlug returns the correct festival', () => {
    const config = getFestivalBySlug('rovinj-summer-bachata-2026')
    expect(config).toBeDefined()
    expect(config!.slug).toBe('rovinj-summer-bachata-2026')
  })

  it('getFestivalBySlug returns undefined for unknown slug', () => {
    const config = getFestivalBySlug('unknown-festival')
    expect(config).toBeUndefined()
  })
})

describe('Rovinj festival theme config', () => {
  it('has a valid theme with all required properties', () => {
    const theme = rovinjFestival.theme
    expect(theme.accent).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.accentHover).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.headerBg).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(theme.headerText).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('uses teal accent per the Designer spec (Section 8)', () => {
    // 004_Festival_Theming.md Section 8 specifies teal for Rovinj
    expect(rovinjFestival.theme.accent).toBe('#0891B2')
    expect(rovinjFestival.theme.accentHover).toBe('#0E7490')
  })

  it('has a white header background per spec', () => {
    expect(rovinjFestival.theme.headerBg).toBe('#FFFFFF')
    expect(rovinjFestival.theme.headerText).toBe('#1A1A1A')
  })
})
