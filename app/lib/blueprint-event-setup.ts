/**
 * Service blueprint: setting up an event, from getting the organiser's page to
 * the night. Lanes are who acts, phases are when; each step says how well it
 * is built and where it makes someone wait, carry something by hand, or misses
 * a change upstream. Hand-maintained from the code (routers named in `code`),
 * then run end to end on 2026-11-14 (RAZ-898) with a test organiser page, a
 * venue and an artist on a local copy of the database. Not run yet: flyer,
 * content plan, Instagram, admin claim review, emails (RAZ-931). Shown at
 * /docs/blueprints/event-setup.
 */
import type { UxStatus } from './ux-map'

export const BLUEPRINT_UPDATED = '2026-11-14'

export type BpLane = 'organizer' | 'system' | 'venue' | 'artist' | 'dancers'
export type BpPhase = 'page' | 'draft' | 'venue' | 'lineup' | 'flyer' | 'promote' | 'publish' | 'night'
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
  { key: 'page', label: 'Get the page' },
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
  // Get the page — most organisers already have an unclaimed page from the v3 sync
  { id: 'reach-out', phase: 'page', lane: 'system', name: 'Invite to the page', status: 'gap', marks: ['manual'], route: '/@[handle]',
    note: 'WeDance (in practice, an admin) messages the organiser by hand with their /@handle link. Unlike artist and venue invites there’s no personal link that hands the page over, so “claim it” is one more form to fill.' },
  { id: 'self-serve', phase: 'page', lane: 'organizer', name: 'Come in from /for-organizers', status: 'live', marks: [], route: '/for-organizers', code: 'business.myProfiles · business.findExisting · business.create',
    note: '“Create your event” → /business/events/new, which with no page offers “Create a profile” (instant) or “Find my profile” (a claim). Create warns when the page already exists and points to “Claim it”; creating anyway makes a duplicate. Most organisers already have a synced page, so most land on the claim.' },
  { id: 'claim-request', phase: 'page', lane: 'organizer', name: 'Claim the page', status: 'live', marks: ['wait'], route: '/business/claim', code: 'businessTeam.requestAccess',
    note: '“Is this you? Claim this page” on /@handle → /business/claim: “This is me”, say how we can confirm it, pick an evidence type, “Send request”. It only files a request; the organiser can’t create events for that page until it’s approved.' },
  { id: 'claim-review', phase: 'page', lane: 'system', name: 'Review the claim', status: 'partial', marks: ['wait', 'silent'], route: '/admin/claims', code: 'business.decideClaim → notifyDecision · admin.addPageOwner',
    note: 'An admin approves, rejects or asks for more in /admin/claims, and the organiser gets an email either way. No one is alerted when a claim comes in, so it waits until an admin looks. When the organiser already has an account, admin.addPageOwner skips the claim.' },

  // Draft
  { id: 'start', phase: 'draft', lane: 'organizer', name: 'Start an event', status: 'live', marks: [], route: '/business/events/new', code: 'businessEvents.create · businessEvents.copy · eventImport.fromInstagram · MCP create_event', refs: ['#453', 'RAZ-939'],
    note: 'One question: “I have a post” (Gemini reads the Instagram caption into a draft), “Like my last event” (a draft copy on a new date, or a weekly series of drafts) or “From scratch” (Run by, type and music, date and time; the name is suggested). All make a draft (“Publish it now” is there for a simple weekly social) and open the editor on its steps: venue, line-up, entry, flyer, publish. An assistant over MCP follows the same order (RAZ-939).' },
  { id: 'gaps', phase: 'draft', lane: 'system', name: 'Draft + what’s missing', status: 'live', marks: [], code: 'shared/utils/eventChecklist.ts · server/mcp/checklist.ts',
    note: 'One checklist: cover, ticket or “free”, venue, line-up, artist Instagram, artist photo. Shown in the editor, events list and Business inbox; MCP adds the tool that fixes each one. It checks that fields are filled, not that anyone agreed.' },

  // Venue
  { id: 'ask', phase: 'venue', lane: 'organizer', name: 'Ask venues', status: 'live', marks: [], code: 'venueAsks.ask · MCP suggest_venues', refs: ['#514'],
    note: 'Needs, guests and an offer per venue; several venues can be asked for the same night.' },
  { id: 'ask-link', phase: 'venue', lane: 'system', name: 'Venue link + email', status: 'partial', marks: ['manual'], code: 'venueAsks.ask · artistInvites.notify',
    note: 'A personal link and a ready message to copy. WeDance emails it only when the venue page has a team (once a day at most). Most synced venues have none, so the organiser sends it by WhatsApp or Instagram.' },
  { id: 'ask-answer', phase: 'venue', lane: 'venue', name: 'Answer the ask', status: 'live', marks: ['wait'], route: '/ask/[token]', code: 'artistInvites.respond (venueAnswer)', refs: ['#514', '#517', 'RAZ-924'],
    note: 'Can host / other date / no, with rent, bar spend, door split and what’s included. Signed out, they leave an email (required for a yes) and get the answer in writing with “That’s me, confirm”. Managed venues also see open asks under “Needs you” on their Business home. On a phone the answer buttons sit under the tab bar (RAZ-924).' },
  { id: 'ask-back', phase: 'venue', lane: 'system', name: 'Answer reaches organiser', status: 'partial', marks: [], code: 'artistInvites.respond → sendInviteAnsweredEmail · businessEvents.inbox — no invite items', refs: ['#521'],
    note: 'The organiser gets an email per answer (“Salsea suggests another date…”), saying whether it’s email-confirmed. In the app the answer shows only once the editor’s “Where” panel is opened (“Venues you asked”); Business home and the collapsed editor don’t mention it.' },
  { id: 'book', phase: 'venue', lane: 'organizer', name: 'Book one', status: 'live', marks: [], code: 'venueAsks.book',
    note: 'One click in “Venues you asked”: writes the venue’s page, name and address onto the event and the flyer details; “Undo” puts it back.' },
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
  { id: 'invite-answer', phase: 'lineup', lane: 'artist', name: 'Review the invite', status: 'live', marks: ['wait'], route: '/confirm/[token]', code: 'artistInvites.get · respond', refs: ['#515', '#516', '#520', '#521', 'RAZ-924'],
    note: 'Flyer up top (once there is one); their slot, fee and needs, the name and photo for this event’s flyer, confirm or decline. The page itself changes only for its team. Signed out, they leave an email and get the answer in writing. On a phone the answer buttons sit under the tab bar (RAZ-924).' },
  { id: 'claim', phase: 'lineup', lane: 'artist', name: 'Take over the page', status: 'live', marks: [], code: 'artistInvites.claim · confirmEmail', refs: ['#521'],
    note: '“That’s me, confirm” in the answer copy signs them in and, while nobody runs the page, makes them its owner.' },
  { id: 'invite-back', phase: 'lineup', lane: 'organizer', name: 'See who answered', status: 'live', marks: [], code: 'sendInviteAnsweredEmail · BusinessLineupPicker', refs: ['#521'],
    note: 'An email per answer (“Milaila Capote is in for…”), and a chip per artist in the line-up: can’t make it, terms, email confirmed or not yet.' },
  { id: 'decline', phase: 'lineup', lane: 'system', name: 'A “no” changes the event', status: 'gap', marks: ['silent'], code: 'artistInvites.respond — events.artists untouched',
    note: 'A declined artist stays on the line-up and the published event until the organiser removes them by hand; the editor only shows a “Can’t make it” chip.' },

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
  { id: 'kit', phase: 'promote', lane: 'system', name: 'Promo kit for the line-up', status: 'partial', marks: ['manual'], code: 'referral.promoKit · MCP promo_kit', refs: ['RAZ-929'],
    note: 'A tracked link and the flyer for each artist and venue, but only through the AI app: no web page shows it, and nobody is sent it.' },
  { id: 'share', phase: 'promote', lane: 'artist', name: 'Share the event', status: 'partial', marks: ['manual'],
    note: 'Artists and venues are the biggest audience, and sharing depends entirely on the organiser asking them.' },

  // Publish
  { id: 'publish', phase: 'publish', lane: 'organizer', name: 'Publish', status: 'live', marks: [], code: 'businessEvents.update (draft → live) · MCP publish_event',
    note: 'Not gated: an event publishes with unanswered venues, unconfirmed artists or an out-of-date flyer, and nothing warns. From the form it is live from the first save (RAZ-927).' },
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
  { id: 'door', phase: 'night', lane: 'organizer', name: 'Door check-in', status: 'missing', marks: [], code: 'attendance.checkIn — no caller', refs: ['RAZ-928'],
    note: 'The server can record a check-in, but no page or AI-app tool calls it, so the organiser can’t check anyone in.' },
  { id: 'after', phase: 'night', lane: 'dancers', name: 'After the night', status: 'missing', marks: [],
    note: 'No review, photo or “next date” prompt for the people who came; the venue and artists get no recap.' },
]

export const bpGaps: BpGap[] = [
  { title: 'Getting the page waits on an admin',
    why: 'Most organisers already have an unclaimed page, but taking it over is a request that sits in /admin/claims, and no admin is told it arrived. Whether we invited them or they came in from /for-organizers and pressed “Create your event”, the organiser hits a wall at step one.',
    fix: 'A personal claim link for outreach (like the artist invite: confirm by email → owner while nobody runs the page), and an alert to admins on every new claim.',
    steps: ['reach-out', 'self-serve', 'claim-request', 'claim-review'] },
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
