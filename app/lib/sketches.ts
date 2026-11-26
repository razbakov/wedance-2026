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
    slug: 'tell-your-story',
    title: 'Tell your story after booking',
    what: 'After Book my spot, one button opens My plan’s week story (a night this week) or the year story (a festival later). Before booking, Going together is only a lift, a room or a dinner. A class has no button. Toggles: before booking / this week / festival later / a class, desktop / mobile.',
    why: '“Coming with friends? Share your plan” sat in Going together and opened a popup. It asked before anyone had booked, in the section for lifts and rooms, and almost nobody would use it.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Cursor)',
    created: '2026-11-21',
    status: 'shipped',
    decision: 'After the spot is booked: “Tell your story” goes to My plan → Week, or Year for a later festival. Not before booking, not for a class, no popup.',
    ticket: linear('RAZ-1010', 'improve-share-plan-flow-after-booking'),
  },
  {
    slug: 'event-review',
    title: 'Event reviews: where the rating shows, who gets asked',
    what: 'The event’s rating as stars under the picture; tapping them opens a Reviews tab next to Overview (the reviews leave the bottom of the page). And what changes after the night: people who went get "How was it?" in place of the Book button and a one-tap email the morning after; people who did not go get the next date. After 4–5★, a tip to the organiser, with a quiet "support WeDance". Toggles: before / after (went, did not go, reviewed), reviews / none, desktop / mobile.',
    why: 'Reviews sat at the bottom of the page as "No reviews yet. Be the first." — anyone could write one before the night, nobody was asked after it, and the rating was not visible where people decide.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-16',
    status: 'decided',
    decision: 'Under the picture (2026-11-16): the stars sit under the event’s picture and open a Reviews tab (next to Overview on a plain event; next to Line-up / Schedule / Passes on a festival). Built first; asking only people who went, the next-day email and the tip follow.',
    ticket: linear('RAZ-1011', 'review-event'),
  },
  {
    slug: 'your-night',
    title: 'Your night: booking an event with a programme',
    what: 'One booking for a night with a programme (19:00 class → 20:00 party → 22:00 band). Before booking, "+ My plan" on the items picks the pass ("Fits your plan"); each pass says what it includes. After "Book my spot", "Your night" ticks what the pass covers, stays editable (skip the class → "Be there around 20:00"), and shows "Not in your pass · +€7" for the rest; Add to calendar. My plan shows one row for the night. The organiser sees counts per item (leaders / followers for the class) and when people arrive. Toggles: booked / not, dancer / organiser, desktop / mobile.',
    why: 'A night with a programme asked lead / follow and partner again on every session row, though "Book my spot" already asks it; and nobody — dancer or organiser — could see who comes to which part.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-16',
    status: 'deciding',
    ticket: linear('RAZ-1007', 'your-night-book-an-event-with-a-programme'),
  },
  {
    slug: 'class-signup',
    title: 'Class sign-up: one button, steps in place',
    what: 'Today’s page and five directions for signing up to a class, a course or a festival: one button and a sheet, a calm poll with the price, ticket first, two numbered steps, and the picked one (E) — one button that opens the steps in place: how you come (alone as leader / follower, or with your partner = couple price), which pass (only when there’s a choice; festival passes marked "Best for your plan" from saved workshops), pay now or at the door, then name, email and phone (signed in: a review card). Who’s coming shows counts to visitors and faces once signed in, at festival scale with search. Toggles: class / course / festival, paid / free, signed out / in / in without a phone.',
    why: 'A class asked three things in three places — "Going?", "Save" and "Get this pass" — and none said whether you still had to pay; the poll card had grown to seven blocks.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'decided',
    decision: 'E (2026-11-16): one button that opens the steps in place, with name, email and phone part of signing up (not of "keep in touch"), a review card when signed in, one signed-out state, Who’s coming once (counts for visitors, faces once signed in), and best pass for your plan on festivals. Built for classes and courses first; festivals and paying without an account follow.',
    ticket: linear('RAZ-995', 'class-sign-up'),
  },
  {
    slug: 'plan-zoom',
    title: 'My plan: Today / Week / Month / Year',
    what: 'My plan as zoom tabs, each a decision horizon: what happens in that span (every kind), the one plan to make at that scale, and the story to post. Plain tabs, smart tabs (opening tab and to-do numbers per dancer), a zoom calendar (year → month grid → day strip → tonight) and the recommended zoom + smart. Regular dancer / newcomer and full / empty toggles.',
    why: 'People think about time and planning by zooming in and out, and each horizon is a story the dancer can post. A newcomer needs to think bigger (a taster this week, a course for the month); a regular needs help around tonight and the week.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-16',
    status: 'decided',
    decision: 'A · Plain tabs: Today / Week / Month / Year, opening on Today',
    ticket: linear('RAZ-1006', 'clarify-time-based-sections-and-displayed-content'),
  },
  {
    slug: 'plan-sections',
    title: 'My plan: Tonight, This week, This month',
    what: 'Four ways to set up My plan’s near-term sections: honest kind names (Hangouts tonight / Your nights out / Your courses / Your festivals), a pure agenda (Tonight / This week / Later, everything by date), the recommended agenda + what you have (Tonight and This week by date incl. classes, then Your courses and This year), and a day strip (one "Your week" block, one day at a time). Busy / nothing today / empty toggles.',
    why: 'The headings name a time but each section holds one kind: Tonight shows only hangouts (tonight’s party sits under This week), This month holds every course whatever its date (a class this Sunday sits there).',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-16',
    status: 'decided',
    decision: 'D · Day strip: one "Your week" block (today first, hangouts under their night), then Your courses and This year',
    ticket: linear('RAZ-1006', 'clarify-time-based-sections-and-displayed-content'),
  },
  {
    slug: 'meet-matches',
    title: 'Meet new friends: when both say yes',
    what: 'Four ways a mutual yes shows up on My plan: a match card above the deck with a night out you could both go to, one "dance friends" list merging deck matches and festival waves with "Say hi", the match card plus an email to the other dancer, and the recommended list with the night as the one next step. Admins can switch to their real matches.',
    why: 'A Yes in the My plan deck goes nowhere: the other dancer is never told and a mutual Yes is never noticed. Only festival waves become "festival friends", on the festival page.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'deciding',
    ticket: linear('RAZ-985', 'meet-new-friends-tell-both-dancers-when-they-say-yes-to-each-other'),
  },
  {
    slug: 'business-home',
    title: 'Business home',
    what: 'Four directions for /business: tonight first (today’s events with who’s coming, Door, Share), pulse first (three numbers for the last 7 days + what pulls people), people first (plans, followers, bookings, join requests), and the recommended mix. Tasks shrink to one line; no flyer nags for weekly classes or events < 24 h away. Busy / Quiet week toggle.',
    why: 'Home repeated Events: six chore cards, then the same events again under "Next 14 days", and nothing about how the business is doing or who noticed it.',
    requestedBy: 'Alösha',
    builtBy: 'Agent (Claude)',
    created: '2026-11-15',
    status: 'shipped',
    decision: 'D — today with faces, last 7 days, from dancers, tasks in one line',
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
