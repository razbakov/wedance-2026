/**
 * Homepage audience tabs (RAZ-1095). Everyone is `/`; Artists, Organizers
 * and Venues are `?tab=`. Signed-out `/my-plan` does not show the tabs.
 * Copy is the approved table in the RAZ-1095 plan.
 */

export const LANDING_TABS = ['everyone', 'artists', 'organizers', 'venues'] as const
export type LandingTab = (typeof LANDING_TABS)[number]
export type LandingTabVia = 'nav' | 'link' | 'load'
export type LandingCalloutId = 'start_event' | 'book_date' | 'post_event' | 'list_space'

export interface LandingTabRead {
  tab: LandingTab
  /** Drop `?tab=` — explicit everyone, or a value that is not a tab. */
  replace: boolean
  via: 'link' | 'load'
}

const AUDIENCE_TABS = new Set<string>(['artists', 'organizers', 'venues'])

function queryValue(raw: unknown): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value == null || value === '') return undefined
  return String(value)
}

/** The tab SSR and the first paint should render, plus whether the URL needs a replace. */
export function landingTabFromQuery(raw: unknown): LandingTabRead {
  const value = queryValue(raw)
  if (value == null) return { tab: 'everyone', replace: false, via: 'load' }
  if (AUDIENCE_TABS.has(value)) return { tab: value as LandingTab, replace: false, via: 'link' }
  return { tab: 'everyone', replace: true, via: 'link' }
}

/** Next query for a tab change. Everyone drops `tab`; other keys stay. */
export function landingTabQuery(current: Record<string, unknown>, tab: LandingTab): Record<string, unknown> {
  const query: Record<string, unknown> = { ...current }
  if (tab === 'everyone') delete query.tab
  else query.tab = tab
  return query
}

/** Audience tabs are a homepage structure. Signed-out My plan stays the dancer pitch. */
export function showsLandingTabs(surface: string): boolean {
  return surface === 'home'
}

export interface LandingCalloutCopy {
  cta: LandingCalloutId
  label: string
  to: string
  /** Style A (Everyone): the card headline. */
  headline?: string
  /** Style A supporting line. */
  line?: string
  /** Style B: the handwritten line under the hero button. */
  hand?: string
}

export const LANDING_CALLOUTS: Record<LandingTab, LandingCalloutCopy> = {
  everyone: {
    cta: 'start_event',
    label: 'Start your own event',
    to: '/business/events/new',
    headline: 'Make the night yours.',
    line: 'Private party, wedding or company night.',
  },
  artists: {
    cta: 'book_date',
    label: 'Book your next date',
    to: '/gigs',
    hand: 'Add the next date to your year.',
  },
  organizers: {
    cta: 'post_event',
    label: 'Post your event in minutes',
    to: '/business/events/new',
    hand: 'A social, a course, a festival — post it tonight.',
  },
  venues: {
    cta: 'list_space',
    label: 'List your space',
    to: '/business/new?type=venue',
    hand: "Studios, clubs and halls — they'll find you.",
  },
}

export function landingCallout(tab: LandingTab): LandingCalloutCopy {
  return LANDING_CALLOUTS[tab]
}

export type LandingIcon = 'globe' | 'image' | 'calendar' | 'calendarPlus' | 'megaphone' | 'users' | 'pin' | 'inbox' | 'sparkles'
export type LandingTone = 'purple' | 'orange' | 'cyan'

export interface LandingPanelCopy {
  tab: Exclude<LandingTab, 'everyone'>
  eyebrow: string
  headline: string
  accent: string
  line: string
  tone: LandingTone
  sample: { title: string, rows: { when: string, what: string }[] }
  points: { icon: LandingIcon, title: string, detail: string }[]
  learnMore: { label: string, to: string }
}

export const LANDING_PANELS: Record<Exclude<LandingTab, 'everyone'>, LandingPanelCopy> = {
  artists: {
    tab: 'artists',
    eyebrow: 'For artists',
    headline: 'Your year,',
    accent: 'told in one place.',
    line: 'Teachers, DJs and performers: a website, flyers and a tour calendar for the whole year, so organizers and dancers see where you are next.',
    tone: 'purple',
    sample: {
      title: 'Luis · 2027 tour',
      rows: [
        { when: 'Mar', what: 'Salsa festival, Vienna' },
        { when: 'Jun', what: 'Workshops, Munich' },
        { when: 'Sep', what: 'Timba weekend, Berlin' },
      ],
    },
    points: [
      { icon: 'globe', title: 'Your website', detail: 'A page with your bio, videos and what you teach.' },
      { icon: 'image', title: 'Flyers and posts', detail: 'One flyer per date, painted in your look.' },
      { icon: 'calendar', title: 'Year and tour calendar', detail: 'Your programme for the year, and who is hosting.' },
    ],
    learnMore: { label: 'How artist pages work', to: '/artists' },
  },
  organizers: {
    tab: 'organizers',
    eyebrow: 'For organizers',
    headline: 'Every post for your event,',
    accent: 'made for you.',
    line: 'Put your event on WeDance and get the flyer, a post per artist and a countdown, painted in your look.',
    tone: 'orange',
    sample: {
      title: 'Salsa night',
      rows: [
        { when: 'Fri · 21:00', what: 'Doors open' },
        { when: 'Fri · 22:30', what: 'Live set' },
      ],
    },
    points: [
      { icon: 'calendarPlus', title: 'Post in minutes', detail: 'Date, place and artists. The event page is ready to share.' },
      { icon: 'megaphone', title: 'The whole campaign', detail: 'Flyer, line-up and countdown drafted in one click.' },
      { icon: 'users', title: 'See who is going', detail: 'Dancers plan your event and bring their friends.' },
    ],
    learnMore: { label: 'More for organizers', to: '/for-organizers' },
  },
  venues: {
    tab: 'venues',
    eyebrow: 'For venues',
    headline: 'Fill your space',
    accent: 'with dancers.',
    line: 'List your floor and get booking requests from organizers who need a space for classes, socials, festivals and private events.',
    tone: 'cyan',
    sample: {
      title: 'Studio Sol',
      rows: [
        { when: 'Capacity', what: '120 dancers' },
        { when: 'Open', what: 'Thu, Fri, Sat' },
      ],
    },
    points: [
      { icon: 'pin', title: 'Be found', detail: 'Organizers search by city, size and the music they play.' },
      { icon: 'inbox', title: 'Requests in one inbox', detail: 'Dates, headcount and terms in each request.' },
      { icon: 'sparkles', title: 'Your terms', detail: 'You set the price and the rules. You choose who books.' },
    ],
    learnMore: { label: 'More for venues', to: '/for-venues' },
  },
}

export function landingPanel(tab: Exclude<LandingTab, 'everyone'>): LandingPanelCopy {
  return LANDING_PANELS[tab]
}

export const LANDING_TAB_LABELS: { tab: LandingTab, label: string }[] = [
  { tab: 'everyone', label: 'Everyone' },
  { tab: 'artists', label: 'Artists' },
  { tab: 'organizers', label: 'Organizers' },
  { tab: 'venues', label: 'Venues' },
]
