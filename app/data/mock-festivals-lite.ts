/**
 * Lightweight festival entries — the "aspirational year" festivals shown as
 * cards across /festivals, /my-plan and /my-year (Bachata Stars Barcelona,
 * Timba Fest London, Kizomba & Urban Kiz Prague).
 *
 * They previously had no detail-page data, so /festivals/[slug] silently fell
 * back to ¡Menéate! Vienna — a card linking to the wrong festival. These give
 * each one a real (if schedule-less) festival page so every card resolves to
 * what it advertises. Workshops/teachers are intentionally empty until a real
 * lineup exists; the detail page renders its empty states for those.
 */
import type { Festival, Teacher, Workshop } from '~/types/festival'

const EMPTY_TEACHERS: Teacher[] = []
const EMPTY_WORKSHOPS: Workshop[] = []

export const liteFestivals: Record<string, { festival: Festival; workshops: Workshop[]; teachers: Teacher[] }> = {
  'bachata-stars-barcelona-2026': {
    festival: {
      name: 'Bachata Stars Barcelona',
      slug: 'bachata-stars-barcelona-2026',
      startDate: '2026-07-03',
      endDate: '2026-07-06',
      description: 'The biggest Bachata event in Southern Europe — four days of Bachata and Bachata Sensual with international artists, socials every night, and the Mediterranean summer as a backdrop.',
      logo: 'https://ui-avatars.com/api/?name=BSB&size=80&background=7c3aed&color=fff&bold=true&rounded=true',
      accentColor: '#7c3aed',
      socialLinks: [],
      venue: {
        name: 'Barcelona, Spain',
        address: 'Barcelona, Spain',
        coordinates: { lat: 41.3874, lng: 2.1686 },
        practicalInfo: ['Full lineup and passes announced soon.'],
      },
      attendeeCount: 620,
    },
    workshops: EMPTY_WORKSHOPS,
    teachers: EMPTY_TEACHERS,
  },
  'timba-fest-london-2026': {
    festival: {
      name: 'Timba Fest London',
      slug: 'timba-fest-london-2026',
      startDate: '2026-09-18',
      endDate: '2026-09-21',
      description: 'Cuban music and dance in the heart of London — Timba, Son and Rumba workshops, live music and parties across a long September weekend.',
      logo: 'https://ui-avatars.com/api/?name=TFL&size=80&background=0ea5e9&color=fff&bold=true&rounded=true',
      accentColor: '#0ea5e9',
      socialLinks: [],
      venue: {
        name: 'London, UK',
        address: 'London, UK',
        coordinates: { lat: 51.5072, lng: -0.1276 },
        practicalInfo: ['Full lineup and passes announced soon.'],
      },
      attendeeCount: 310,
    },
    workshops: EMPTY_WORKSHOPS,
    teachers: EMPTY_TEACHERS,
  },
  'kizomba-prague-2026': {
    festival: {
      name: 'Kizomba & Urban Kiz Prague',
      slug: 'kizomba-prague-2026',
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      description: 'Kizomba, Urban Kiz and Semba in beautiful Prague — a warm weekend of workshops and late-night socials in the heart of the city.',
      logo: 'https://ui-avatars.com/api/?name=KPR&size=80&background=ec4899&color=fff&bold=true&rounded=true',
      accentColor: '#ec4899',
      socialLinks: [],
      venue: {
        name: 'Prague, Czech Republic',
        address: 'Prague, Czech Republic',
        coordinates: { lat: 50.0755, lng: 14.4378 },
        practicalInfo: ['Full lineup and passes announced soon.'],
      },
      attendeeCount: 275,
    },
    workshops: EMPTY_WORKSHOPS,
    teachers: EMPTY_TEACHERS,
  },
}
