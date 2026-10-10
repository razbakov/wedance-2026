/**
 * WeDance brand palette for JS contexts — mirrors the --wd-* tokens in
 * app/assets/css/tailwind.css (brand.test.ts keeps the two in sync).
 *
 * In CSS (style="", <style>, :style strings) use var(--wd-*) instead. Use WD only
 * where the value is computed in JS — e.g. accent rotations or `WD.red600 + '55'`
 * alpha suffixes, which a CSS variable can't take.
 */
export const WD = {
  cream: '#fbf5ea',
  brown900: '#3b1f0d',
  brown700: '#5b3a1d',
  amber600: '#9a5614',
  red600: '#dc2626',
  red800: '#b91c1c',
  orange500: '#f97316',
  green600: '#16a34a',
  cyan600: '#0891b2',
  amber500: '#f59e0b',
  purple500: '#a855f7',
  pink500: '#ec4899',
  pink400: '#f472b6',
  violet600: '#7c3aed',
  violet400: '#a78bfa',
  brown950: '#2a1f12',
  ink900: '#2a2018',
  brown600: '#5b4830',
  brown500: '#8b4513',
  sand400: '#c9a87a',
  sand100: '#ede4d3',
  black: '#0a0a0a',
  gray500: '#6b7280',
  orange700: '#c2410c',
  amber800: '#92400e',
  amber700: '#b45309',
  amber400: '#fbbf24',
  amber100: '#fef3c7',
  yellow300: '#fde047',
  rose600: '#e11d48',
  rose500: '#f43f5e',
  red900: '#991b1b',
  red100: '#fee2e2',
  red50: '#fdecec',
  green700: '#15803d',
  cyan700: '#0e7490',
  cyan400: '#22d3ee',
  sky500: '#0ea5e9',
  blue600: '#2563eb',
} as const
