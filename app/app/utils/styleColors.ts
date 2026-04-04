/**
 * Dance style color map — solid palette from the design system (003).
 *
 * Used for:
 *  - WorkshopCard left border accent (3px)
 *  - Style badge backgrounds (white text on colored bg)
 *  - StyleChipRow active chip backgrounds
 *
 * All colors pass WCAG AA contrast (4.5:1) against white text.
 */
import type { DanceStyle } from '~/types/schedule'

/** Hex color for each dance style. */
export const styleColorMap: Record<string, string> = {
  'salsa-cubana': '#DC2626',
  'salsa-linear': '#DC2626',
  'bachata': '#7C3AED',
  'kizomba': '#0E7490',
  'zouk': '#BE185D',
  'afro-cuban': '#92400E',
  'reggaeton': '#4338CA',
  'semba': '#15803D',
  'cha-cha-cha': '#DC2626',
  'son': '#C2410C',
  'rumba': '#C2410C',
  'lady-styling': '#BE185D',
  'man-styling': '#4338CA',
  'musicality': '#15803D',
  'body-movement': '#0E7490',
  'other': '#6B7280',
}

const defaultColor = '#6B7280'

/** Get the solid hex color for a dance style. */
export function getStyleColor(style?: DanceStyle | string): string {
  if (!style) return defaultColor
  return styleColorMap[style] ?? defaultColor
}

/** Human-readable display name for kebab-case dance styles. */
export const styleDisplayMap: Record<string, string> = {
  'salsa-cubana': 'Salsa Cubana',
  'salsa-linear': 'Salsa Linear',
  'bachata': 'Bachata',
  'kizomba': 'Kizomba',
  'zouk': 'Zouk',
  'afro-cuban': 'Afro-Cuban',
  'reggaeton': 'Reggaeton',
  'semba': 'Semba',
  'cha-cha-cha': 'Cha Cha Cha',
  'son': 'Son',
  'rumba': 'Rumba',
  'lady-styling': 'Lady Styling',
  'man-styling': 'Man Styling',
  'musicality': 'Musicality',
  'body-movement': 'Body Movement',
  'other': 'Other',
}

/** Get display name for a dance style. */
export function getStyleDisplayName(style?: DanceStyle | string): string {
  if (!style) return ''
  return styleDisplayMap[style] ?? style
}

/** Level display names. */
export const levelDisplayMap: Record<string, string> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'all-levels': 'All Levels',
}

export function getLevelDisplayName(level?: string): string | null {
  if (!level) return null
  return levelDisplayMap[level] ?? level
}
