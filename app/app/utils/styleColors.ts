import type { DanceStyle } from '~/types/schedule'

/**
 * Dance style colors per Design System Brief (003), Section 3.
 * Used for style badges, card left borders, and active style chips.
 */
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

/**
 * Human-readable display name for kebab-case dance styles.
 */
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

/**
 * Get the color for a dance style, with fallback.
 */
export function getStyleColor(style?: DanceStyle | string): string {
  if (!style) return styleColorMap['other']
  return styleColorMap[style] ?? styleColorMap['other']
}

/**
 * Get the display name for a dance style, with fallback.
 */
export function getStyleDisplayName(style?: DanceStyle | string): string {
  if (!style) return 'Other'
  return styleDisplayMap[style] ?? style
}
