/**
 * Service blueprint: setting up an event, from the organiser's first draft to
 * the night. Lanes are who acts, phases are when; each step says how well it
 * is built and where it makes someone wait, carry something by hand, or misses
 * a change upstream. Hand-maintained from the code (routers named in `code`);
 * shown at /docs/blueprints/event-setup.
 */
import type { UxStatus } from './ux-map'

export const BLUEPRINT_UPDATED = '2026-11-13'

export type BpLane = 'organizer' | 'system' | 'venue' | 'artist' | 'dancers'
export type BpPhase = 'draft' | 'venue' | 'lineup' | 'flyer' | 'promote' | 'publish' | 'night'
/** wait: someone is blocked on someone else · manual: a person carries the link or the news · silent: a change or answer doesn't reach the side that needs it */
export type BpMark = 'wait' | 'manual' | 'silent'

export interface BpStep {
  id: string
  phase: BpPhase
  lane: BpLane
  name: string
  status: UxStatus
  note: string
  marks: BpMark[]
  route?: string
  code?: string
  refs?: string[]
}

export interface BpGap {
  title: string
  why: string
  fix: string
  steps: string[]
}

export const bpLanes: { key: BpLane, label: string, hint: string }[] = [
  { key: 'organizer', label: 'Organiser', hint: 'Business → Events' },
  { key: 'system', label: 'WeDance', hint: 'Server, AI, emails' },
  { key: 'venue', label: 'Venue', hint: 'Through /ask/<token>' },
  { key: 'artist', label: 'Artist', hint: 'Through /confirm/<token>' },
  { key: 'dancers', label: 'Dancers', hint: 'City page, event page' },
]

export const bpPhases: { key: BpPhase, label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'venue', label: 'Venue' },
  { key: 'lineup', label: 'Line-up' },
  { key: 'flyer', label: 'Flyer' },
  { key: 'promote', label: 'Promote' },
  { key: 'publish', label: 'Publish' },
  { key: 'night', label: 'The night' },
]

export const bpMarkLabel: Record<BpMark, { icon: string, label: string, hint: string }> = {
  wait: { icon: '⏳', label: 'Waits', hint: 'Someone is blocked on someone else, and nothing chases it.' },
  manual: { icon: '✋', label: 'By hand', hint: 'A person carries the link or the news between lanes.' },
  silent: { icon: '🔇', label: 'Silent', hint: 'An answer or change doesn’t reach the side that needs it.' },
}

export const bpSteps: BpStep[] = [
  // Draft
  { id: 'start', phase: 'draft', lane: 'organizer', name: 'Start an event', status: 'live', marks: [], route: '/business/events/new', code: 'businessEvents.create · eventImport.fromInstagram · MCP create_event', refs: ['#453'],
    note: 'Three doors: the form, pasting an Instagram post (Gemini reads the caption into a draft), or an assistant over MCP. All three land as a draft.' },
  { id: 'gaps', phase: 'draft', lane: 'system', name: 'Draft + what’s missing', status: 'live', marks: [], code: 'shared/utils/eventChecklist.ts · server/mcp/checklist.ts',
    note: 'One checklist: cover, ticket or “free”, venue, line-up, artist Instagram, artist photo. Shown in the editor, events list and Business inbox; MCP adds the tool that fixes each one. It checks that fields are filled, not that anyone agreed.' },

  // Venue
  { id: 'ask', phase: 'venue', lane: 'organizer', name: 'Ask venues', status: 'live', marks: [], code: 'venueAsks.ask · MCP suggest_venues', refs: ['#514'],
    note: 'Needs, guests and an offer per venue; several venues can be asked for the same night.' },
  { id: 'ask-link', phase: 'venue', lane: 'system', name: 'Venue link + email', status: 'partial', marks: ['manual'], code: 'venueAsks.ask · artistInvites.notify',
    note: 'A personal link and a ready message to copy. WeDance emails it only when the venue page has a team (once a day at most). Most synced venues have none, so the organiser sends it by WhatsApp or Instagram.' },
  { id: 'ask-answer', phase: 'venue', lane: 'venue', name: 'Answer the ask', status: 'live', marks: ['wait'], route: '/confirm/[token]', code: 'artistInvites.respond (venueAnswer)', refs: ['#514', '#517'],
    note: 'Can host / other date / no, with terms. Signed out, they leave an email (required for a yes) and get the answer in writing with “That’s me, confirm”. Managed venues also see open asks under “Needs you” on their Business home.' },
  { id: 'ask-back', phase: 'venue', lane: 'system', name: 'Answer reaches organiser', status: 'partial', marks: [], code: 'artistInvites.respond → sendInviteAnsweredEmail · businessEvents.inbox — no invite items', refs: ['#521'],
    note: 'The organiser gets an email per answer (“Salsea suggests another date…”), saying whether it’s email-confirmed. The Business inbox still doesn’t list answers or who is still silent.' },
  { id: 'book', phase: 'venue', lane: 'organizer', name: 'Book one', status: 'live', marks: [], code: 'venueAsks.book',
    note: 'Writes the venue’s page, name and address onto the event.' },
  { id: 'unbooked', phase: 'venue', lane: 'venue', name: 'Other venues told', status: 'partial', marks: ['silent'], code: 'venueAsks.book',
    note: 'The other links say “booked elsewhere”, but only if the venue opens them again. The booked venue gets no confirmation either.' },
  { id: 'ask-nudge', phase: 'venue', lane: 'system', name: 'Chase silence', status: 'gap', marks: ['wait'],
    note: 'No deadline, reminder or expiry on an ask. A venue that never answers stays “waiting” until the event is over.' },

  // Line-up
  { id: 'lineup', phase: 'lineup', lane: 'organizer', name: 'Add artists', status: 'live', marks: [], code: 'BusinessLineupPicker · businessEvents.addFromInstagram · artistInvites.saveProfile', refs: ['#452'],
    note: 'From WeDance or an Instagram handle (filled from the public profile). Edits to pages the organiser doesn’t run become suggestions for the artist.' },
  { id: 'suggest-now', phase: 'lineup', lane: 'system', name: 'Use suggestions right away', status: 'live', marks: [], code: 'events.flyerOptions.photos',
    note: 'The event and flyer use the organiser’s photo before the artist approves, so setup never blocks on the artist.' },
  { id: 'invite-link', phase: 'lineup', lane: 'system', name: 'Artist link + email', status: 'partial', marks: ['manual'], code: 'artistInvites.link · artistInvites.notify',
    note: 'Same as venues: an email only when someone runs the artist’s page. Otherwise the organiser copies the link and message.' },
  { id: 'invite-answer', phase: 'lineup', lane: 'artist', name: 'Review the invite', status: 'live', marks: ['wait'], route: '/confirm/[token]', code: 'artistInvites.get · respond', refs: ['#515', '#516', '#520', '#521'],
    note: 'Flyer up top; pick the photo and name for this event’s flyer, add classes and terms, confirm or decline. The page itself changes only for its team. Signed out, they leave an email and get the answer in writing.' },
  { id: 'claim', phase: 'lineup', lane: 'artist', name: 'Take over the page', status: 'live', marks: [], code: 'artistInvites.claim · confirmEmail', refs: ['#521'],
    note: '“That’s me, confirm” in the answer copy signs them in and, while nobody runs the page, makes them its owner.' },
  { id: 'invite-back', phase: 'lineup', lane: 'organizer', name: 'See who answered', status: 'live', marks: [], code: 'sendInviteAnsweredEmail · BusinessLineupPicker', refs: ['#521'],
    note: 'An email per answer (“Milaila Capote is in for…”), and a chip per artist in the line-up: can’t make it, terms, email confirmed or not yet.' },
  { id: 'decline', phase: 'lineup', lane: 'system', name: 'A “no” changes the event', status: 'gap', marks: ['silent'], code: 'artistInvites.respond — events.artists untouched',
    note: 'A declined artist stays on the line-up and the published event until the organiser removes them by hand.' },

  // Flyer
  { id: 'paint', phase: 'flyer', lane: 'organizer', name: 'Pick a look, paint', status: 'live', marks: [], route: '/business/events/[id]/flyer', code: 'businessFlyers.make / directions · MCP make_flyer',
    note: 'Saved brand looks or new directions; can be started before the venue or artists said yes.' },
  { id: 'painting', phase: 'flyer', lane: 'system', name: 'Paint variants', status: 'live', marks: ['wait'], code: 'server/utils/flyer/paint.ts',
    note: 'Gemini paints from the line-up photos, venue, date and prices. Takes a while; the page picks a running batch up after a reload.' },
  { id: 'keep', phase: 'flyer', lane: 'organizer', name: 'Keep one', status: 'live', marks: [], code: 'businessFlyers.keep',
    note: 'The kept flyer becomes the cover option and the first post in the content plan.' },
  { id: 'stale', phase: 'flyer', lane: 'system', name: 'Spot changes since kept', status: 'partial', marks: ['silent'], code: 'flyerChanges · BusinessFlyerPanel',
    note: 'Compares the kept flyer with today’s details and shows “Out of date” with a one-click refresh, but only in the flyer panel. A posted flyer with a declined artist on it isn’t flagged anywhere else.' },

  // Promote
  { id: 'plan', phase: 'promote', lane: 'organizer', name: 'Content plan + captions', status: 'live', marks: [], code: 'businessPosts.propose · writeCaptions',
    note: 'Proposed posts for the run-up, captions in one or two languages, tagging the venue and artists’ Instagram.' },
  { id: 'ig', phase: 'promote', lane: 'organizer', name: 'Post to Instagram', status: 'partial', marks: [], code: 'instagram.publishPost', refs: ['#501'],
    note: 'Feed or story in one click once the page’s Instagram is connected. The Meta app is in dev mode: only people with a role on it can connect.' },
  { id: 'kit', phase: 'promote', lane: 'system', name: 'Promo kit for the line-up', status: 'partial', marks: ['manual'], code: 'referral.promoKit',
    note: 'A tracked link and the flyer for each artist and venue, but nobody is sent it. It reaches them only if the organiser passes it on.' },
  { id: 'share', phase: 'promote', lane: 'artist', name: 'Share the event', status: 'partial', marks: ['manual'],
    note: 'Artists and venues are the biggest audience, and sharing depends entirely on the organiser asking them.' },

  // Publish
  { id: 'publish', phase: 'publish', lane: 'organizer', name: 'Publish', status: 'live', marks: [], code: 'businessEvents.update (draft → live) · MCP publish_event',
    note: 'Not gated: an event publishes with unanswered venues, unconfirmed artists or an out-of-date flyer, and nothing warns.' },
  { id: 'listed', phase: 'publish', lane: 'system', name: 'Listed everywhere', status: 'live', marks: [], route: '/cities/[city]',
    note: 'City page (this week, coming up), the event page, the RSVP poll, the organiser’s and venue’s /@handle schedule.' },
  { id: 'announce', phase: 'publish', lane: 'system', name: 'Tell followers', status: 'missing', marks: ['silent'],
    note: 'Followers of the organiser, venue or artists get nothing when the event goes live. Discovery is pull only.' },
  { id: 'told-live', phase: 'publish', lane: 'artist', name: 'Line-up told it’s live', status: 'gap', marks: ['silent'],
    note: 'Neither the artists nor the booked venue hear that the event is published, with the link to share.' },
  { id: 'rsvp', phase: 'publish', lane: 'dancers', name: 'Find it, answer, plan', status: 'live', marks: [], route: '/events/[id]', code: 'rsvp.answer · useWeekPlan',
    note: 'RSVP poll (partner / need a leader / follower), Going!, week plan, who’s going.' },

  // Night
  { id: 'remind', phase: 'night', lane: 'dancers', name: 'Reminder before', status: 'missing', marks: ['silent'],
    note: 'Dancers who answered or pressed Going! get no reminder. See “Come back” on the UX map.' },
  { id: 'door', phase: 'night', lane: 'organizer', name: 'Door check-in', status: 'live', marks: [], code: 'attendance.checkIn',
    note: 'The organiser checks people in at the door.' },
  { id: 'after', phase: 'night', lane: 'dancers', name: 'After the night', status: 'missing', marks: [],
    note: 'No review, photo or “next date” prompt for the people who came; the venue and artists get no recap.' },
]

export const bpGaps: BpGap[] = [
  { title: 'The organiser is the messenger',
    why: 'WeDance can only email pages that have a team. For the rest (most synced venues and artists) the organiser copies each link into WhatsApp or Instagram, and WeDance can’t tell whether it arrived.',
    fix: 'Show “opened / not opened” per link, and offer an Instagram DM or WhatsApp share with the message filled in.',
    steps: ['ask-link', 'invite-link', 'kit', 'share'] },
  { title: 'Nothing chases silence',
    why: 'Answers now arrive by email (#521), but silence doesn’t: asks and invites have no deadline or reminder, and the Business inbox lists neither answers nor who is still waiting.',
    fix: 'An answer-by date on the ask, a reminder after a few days, and a “3 haven’t answered” item in the Business inbox.',
    steps: ['ask-nudge', 'ask-back', 'ask-answer', 'invite-answer'] },
  { title: 'A “no” doesn’t flow downstream',
    why: 'A declined artist stays on the line-up, the published event and any posted flyer. Venues that weren’t booked only learn it if they reopen their link.',
    fix: 'On decline, ask the organiser to remove or replace (one click); tell unbooked venues when another one is booked.',
    steps: ['decline', 'unbooked', 'stale'] },
  { title: 'Publish neither checks nor announces',
    why: 'Publishing doesn’t warn about unanswered asks or an out-of-date flyer, and once live nobody is told: not followers, not the line-up.',
    fix: 'A pre-publish check (answers, flyer up to date) and, on publish, a note to the line-up and venue with their promo kit, and to followers.',
    steps: ['publish', 'announce', 'told-live'] },
]
