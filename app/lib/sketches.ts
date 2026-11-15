/**
 * Registry of UI sketches (app/pages/sketches/*) for the /sketches overview.
 *
 * Every top-level sketch page or folder needs an entry here — sketches.test.ts
 * fails otherwise. Each sketch's decision lives in a Linear ticket in the
 * "WeDance UX" project; once a variant is picked, the user story is a separate
 * ticket in the WeDance project. Update `status`, `decision` and `story` here
 * when that happens.
 */

export type SketchStatus = 'deciding' | 'decided' | 'shipped' | 'parked' | 'archived'

export interface SketchLink { label: string, url: string }

export interface Sketch {
  /** Folder or file name under app/pages/sketches. */
  slug: string
  title: string
  /** What the sketch compares or shows. */
  what: string
  /** The problem it answers. */
  why: string
  requestedBy: string
  builtBy: string
  /** Date the sketch was first committed (YYYY-MM-DD). */
  created: string
  status: SketchStatus
  /** The picked variant, in a few words. */
  decision?: string
  /** Linear ticket in the WeDance UX project where the decision is made. */
  ticket?: SketchLink
  /** User story ticket and/or PR that built the decision. */
  story?: SketchLink[]
  /** Extra screens inside the sketch (besides /sketches/<slug>). */
  pages?: SketchLink[]
}

const linear = (id: string, slug: string): SketchLink => ({ label: id, url: `https://linear.app/alosha/issue/${id}/${slug}` })
const pr = (n: number): SketchLink => ({ label: `PR #${n}`, url: `https://github.com/razbakov/wedance-2026/pull/${n}` })

export const SKETCHES: Sketch[] = [
  {
    slug: 'business-home',
    title: 'Business home',
    what: 'Four directions for /business: tonight first (today’s events with who’s coming, Door, Share), pulse first (three numbers for the last 7 days + what pulls people), people first (plans, followers, bookings, join requests), and the recommended mix. Tasks shrink to one line; no flyer nags for weekly classes or events < 24 h away. Busy / Quiet week toggle.',
    why: 'Home repeated Events: six chore cards, then the same events again under "Next 14 days", and nothing about how the business is doing or who noticed it.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'deciding',
    ticket: linear('RAZ-973', 'make-business-home-about-tonight-results-and-people-not-a-copy-of'),
  },
  {
    slug: 'my-plan',
    title: 'My plan on a time scale',
    what: 'Five orders and namings of My plan: today’s far → near with "Where you’re …" headlines, near → far with time as the headline, the same plus a sticky Tonight · Week · Month · Year · Goal bar, one merged agenda, and the recommended bar + goal ring + "next up". Each scale gets its own "Post story".',
    why: 'Four headlines mean the same thing ("Where you’re headed / going / dancing", "Where you show up"), "This week" appears twice, and tonight and this week, what people open the page for, sit at the bottom. RAZ-895 also wants each section to post its own story.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'shipped',
    decision: 'B — near → far, the time scale as the headline, to-dos on their rows',
    ticket: linear('RAZ-895', 'let-each-my-plan-section-post-its-own-story-starting-with-the-weekend'),
  },
  {
    slug: 'rider',
    title: 'Artist rider and the agreed sheet',
    what: 'Four directions for what an organiser gets once an artist says yes (one agreed sheet per artist per event) and where the artist keeps their rider: a deal line in the line-up, a one-page agreement, a run sheet with to-dos, or the recommended sheet + short to-do with the rider saved from the first yes.',
    why: 'After an artist agrees, the organiser sees one line ("Fee €120 · Needs: train from Vienna"), and a yes to a booking-page request never reaches WeDance at all.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'deciding',
    ticket: linear('RAZ-965', 'give-organisers-a-full-rider-once-an-artist-says-yes'),
  },
  {
    slug: 'promoter',
    title: 'Promoter page that beats Linktree',
    what: 'Three directions for a promoter/agency profile, using Hummo Productions as the real case: tour-first, roster-first, or tabs (Concerts · Artists · Book) with a promoter view showing sync, clicks per city, auto IG stories and booking requests.',
    why: 'Hummo sends fans to a Linktree of 10 flat links while their WeDance page says "No upcoming events". The page should be good enough to send them so they switch on the spot.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-10-16',
    status: 'deciding',
    ticket: linear('RAZ-435', 'ux-decision-promoter-page-that-beats-linktree-hummo-productions'),
  },
  {
    slug: 'report',
    title: 'Report a problem → co-creation widget',
    what: 'Three directions for turning the bug-only "Report a problem" button into a co-creation hub: hub with two paths, tabbed dialog, or unified form with type chips and a pipeline preview.',
    why: 'People clicking "Report a problem" only see a bug form. They should also learn they can share ideas and co-create the product — agents sketch it, email options, they pick, we ship.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-10-16',
    status: 'decided',
    decision: 'A — Hub with two paths',
    ticket: linear('RAZ-426', 'when-people-click-on-report-a-problem-we-would-like-to-introduce-them'),
    story: [pr(356)],
  },
  {
    slug: 'battle',
    title: 'City Battle — UX and placement',
    what: 'Four directions for the video battle plus a recommended hybrid: fix in place, monthly season under Explore, vertical swipe feed, home team on the city page.',
    why: 'The battle is a vote box on /cities with no result, a leaderboard ranked on 1–5 votes, mixed dance styles per matchup and only July clips. It should make people dance, film, discover cities and compete.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-10-16',
    status: 'decided',
    decision: 'C — vertical swipe feed (Reels-style)',
    ticket: linear('RAZ-416', 'ux-decision-city-battle-ux-and-placement'),
    story: [linear('RAZ-427', 'city-battle-vertical-swipe-feed-reels-style')],
  },
  {
    slug: 'occasions',
    title: 'City occasions',
    what: 'Four ways for a city admin to plan posts about occasions (Tanzverbot, Fasching, New Year’s Eve): an Occasions tab, inside the weekly post, a year planner, a to-do feed.',
    why: 'City admins wrote culture posts (e.g. “What is Tanzverbot?”) from scratch, the weekly post ignored silent days, and there was no way to ask organisers what they plan.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'decided',
    decision: 'C — year planner',
    ticket: linear('RAZ-970', 'dance-and-culture'),
    story: [linear('RAZ-970', 'dance-and-culture')],
  },
  {
    slug: 'nav',
    title: 'Main navigation',
    what: 'Four navigation strategies plus a hybrid: top bar + account menu, app tab bar, dancers/business split, search-first.',
    why: 'Signed-in links were all hidden on phones, and Artists, Find your dance and My year weren\'t reachable from the header.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-10-15',
    status: 'shipped',
    decision: 'E — top bar on desktop, tab bar on phones',
    ticket: linear('RAZ-420', 'ux-decision-main-navigation'),
    story: [linear('RAZ-408', 'network-show-the-artists-venues-and-organizers-you-work-with'), pr(341)],
  },
  {
    slug: 'first-flyer',
    title: 'First flyer for a new organizer',
    what: 'The flow from Business home to the event editor to the flyer panel, for an organizer who has never made a flyer here.',
    why: 'New organizers have events but no flyers. The details on the flyer must be checked before anything is painted.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-10-13',
    status: 'shipped',
    decision: 'Flyer starts from the event editor',
    ticket: linear('RAZ-422', 'ux-decision-first-flyer-for-a-new-organizer'),
    story: [pr(288)],
    pages: [
      { label: 'Event editor', url: '/sketches/first-flyer/edit' },
      { label: 'Flyer screen', url: '/sketches/first-flyer/event' },
    ],
  },
  {
    slug: 'landing',
    title: 'Homepage visual direction',
    what: 'Seven visual directions for the homepage, from editorial magazine to polaroid scrapbook.',
    why: 'The homepage needed one demand-side hero, a persona shelf, live proof and a supply strip in a look that fits WeDance.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-06-30',
    status: 'shipped',
    decision: 'V3 — warm tropical, now the live homepage',
    ticket: linear('RAZ-421', 'ux-decision-homepage-visual-direction'),
    pages: [
      { label: 'V1 Editorial', url: '/sketches/landing/v1' },
      { label: 'V2 Brutalist', url: '/sketches/landing/v2' },
      { label: 'V4 Cinematic', url: '/sketches/landing/v4' },
      { label: 'V7 Postcard', url: '/sketches/landing/v7' },
      { label: 'V9 Liquid glass', url: '/sketches/landing/v9' },
      { label: 'V12 Polaroid', url: '/sketches/landing/v12' },
    ],
  },
  {
    slug: 'year',
    title: 'Plan your year — steal from friends',
    what: 'Assemble your dance year by stealing festivals from friends\' plans, saved as a postcard from future-you on Dec 31.',
    why: 'Planning a year alone is a checklist nobody finishes.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-06-29',
    status: 'deciding',
    ticket: linear('RAZ-423', 'ux-decision-plan-your-year-steal-from-friends-dec-31-postcard'),
  },
  {
    slug: 'legacy',
    title: 'Old homepage (archive)',
    what: 'The homepage as it was before V3 replaced it.',
    why: 'Kept for reference when the new homepage went live.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-06-30',
    status: 'archived',
  },
]

export const STATUS_LABEL: Record<SketchStatus, string> = {
  deciding: 'Waiting for a decision',
  decided: 'Decided · story written',
  shipped: 'Shipped',
  parked: 'Parked',
  archived: 'Archive',
}
