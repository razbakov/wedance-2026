import type { Config } from 'tailwindcss'

export default {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        'ds-brand': 'var(--color-brand-primary)',
        'ds-brand-dark': 'var(--color-brand-primary-dark)',
        'ds-brand-light': 'var(--color-brand-primary-light)',
        'ds-bg': 'var(--color-bg)',
        'ds-bg-page': 'var(--color-bg-page)',
        'ds-text-primary': 'var(--color-text-primary)',
        'ds-text-secondary': 'var(--color-text-secondary)',
        'ds-text-tertiary': 'var(--color-text-tertiary)',
        'ds-text-inverse': 'var(--color-text-inverse)',
        'ds-border': 'var(--color-border)',
        'ds-interactive': 'var(--color-interactive)',
        'ds-error': 'var(--color-error)',
        'ds-skeleton': 'var(--color-skeleton)',
        'festival-accent': 'var(--festival-accent)',
      },
    },
  },
  plugins: [],
} satisfies Config
