/**
 * Service blueprint: an artist (teacher, DJ, band, performer) getting
 * discovered and booked, from having a page to being booked again. Lanes are
 * who acts — the artist, WeDance, and the organiser who books them. Venues
 * aren't drawn: they book artists the same way organisers do. Hand-maintained
 * from the code (procedures named in `code`): /@handle/book (inquiries.*,
 * RAZ-964), line-up invites (artistInvites.*), /gigs (gigs.*), /artists,
 * /@handle, the MCP tools (invite_artist, respond_invite, find_lineup), the
 * Instagram import (#452) and claiming a page. Not run end to end yet.
 * Shown at /docs/blueprints/artist-booking.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const ARTIST_BLUEPRINT_UPDATED = '2026-11-16'

export type ArtistLane = 'artist' | 'system' | 'organizer'
export type ArtistPhase = 'listed' | 'found' | 'asked' | 'answer' | 'lineup' | 'night' | 'after'

export const artistLanes: BpLaneDef<ArtistLane>[] = [
  { key: 'artist', label: 'Artist', hint: 'Their /@handle, Bookings, /confirm/<token>' },
  { key: 'system', label: 'WeDance', hint: 'Sync, emails, line-ups' },
  { key: 'organizer', label: 'Organiser', hint: '/artists, /@handle/book, the event editor' },
]

export const artistPhases: BpPhaseDef<ArtistPhase>[] = [
  { key: 'listed', label: 'Be listed' },
  { key: 'found', label: 'Be found' },
  { key: 'asked', label: 'Asked or invited' },
  { key: 'answer', label: 'Answer' },
  { key: 'lineup', label: 'On the line-up' },
  { key: 'night', label: 'The night' },
  { key: 'after', label: 'After' },
]

export const artistSteps: BpStep<ArtistLane, ArtistPhase>[] = [
  // Be listed — most artists already have a page they have never seen
  { id: 'synced', phase: 'listed', lane: 'system', name: 'A page made for them', status: 'live', marks: ['silent'], route: '/@[handle]', code: 'server/utils/v3ProfileSync.ts · businessEvents.addFromInstagram · server/utils/instagram/profileImport.ts', refs: ['#452'],
    note: 'Artist pages come from the v4 migration, the wedance.vip sync, and organisers adding a line-up from an Instagram handle, which fills name, photo, bio and city from the public profile (#452). Nobody tells the artist the page exists, so most artist pages have nobody running them.' },
  { id: 'own-page', phase: 'listed', lane: 'artist', name: 'Create or claim the page', status: 'partial', marks: ['wait'], route: '/business/claim', code: 'business.create · MCP create_my_page · businessTeam.requestAccess → business.decideClaim',
    note: 'A new artist creates a page (warned when a likely copy exists). One already listed taps “Is this you? Claim this page” on /@handle, which files a request for an admin in /admin/claims. No admin is alerted, so it waits. An invite link skips all this (see Answer).' },
  { id: 'booking-link', phase: 'listed', lane: 'artist', name: 'Share the booking link', status: 'live', marks: ['manual'], route: '/business/network/[username]/bookings',
    note: 'Business → the page → Bookings shows “Your booking link”, /@handle/book, a page of its own for an Instagram bio, a website or an email signature. The artist pastes it there themselves.' },

  // Be found
  { id: 'directory', phase: 'found', lane: 'organizer', name: 'Browse /artists', status: 'partial', marks: [], route: '/artists', code: 'entity.listArtists',
    note: 'Every visible artist page, filtered by city, style and name in the browser; the city page’s “Who’s on the floor” has the same people. It shows no fee, no availability and no past line-ups, and nothing says whether the artist runs the page and will see a request.' },
  { id: 'profile', phase: 'found', lane: 'organizer', name: 'Look at /@handle', status: 'live', marks: [], route: '/@[handle]', code: 'entity.getByHandle · ReviewsSection',
    note: 'Bio, photos, videos and socials, the upcoming events they are in the line-up of, reviews, and a Book button that opens /@handle/book.' },
  { id: 'assistant', phase: 'found', lane: 'system', name: 'Found through an AI app', status: 'live', marks: [], code: 'MCP find_lineup → businessEvents.searchProfiles · list_artists',
    note: 'An organiser’s assistant searches pages by name or handle for a line-up, or lists a city’s artists. If nothing is found, add_profile_from_instagram makes the page.' },
  { id: 'offer', phase: 'found', lane: 'artist', name: 'Post an offer on /gigs', status: 'partial', marks: ['manual'], route: '/gigs', code: 'gigs.create (kind offer)',
    note: 'An artist can post what they offer (DJ sets, workshops, shows). An organiser answers it by email only, through a mailto: link. WeDance keeps no record, so the artist never sees who replied.' },

  // Asked or invited — three doors that don't lead to each other
  { id: 'inquiry', phase: 'asked', lane: 'organizer', name: 'Send a booking request', status: 'live', marks: [], route: '/@[handle]/book', code: 'BookingInquiryForm → inquiries.send · MCP request_private_class', refs: ['RAZ-964'],
    note: 'What, when, where, guests, budget, a message. No account is needed. Signed in, it is filled in and sent as one of the asker’s pages. Rate-limited per asker and per page. The asker gets no copy of what they sent.' },
  { id: 'inquiry-route', phase: 'asked', lane: 'system', name: 'Deliver the request', status: 'partial', marks: ['manual', 'silent'], code: 'inquiries.send → sendBookingInquiryEmail · businessEvents.inbox (booking)',
    note: 'To the page’s team by email (Reply-To the asker) and as “X wants to book …” under Needs you. When nobody runs the page, it goes to its private booking email. Without one, it goes to hello@wedance.vip for someone at WeDance to pass on by hand, and the asker is told only “WeDance passes it on”.' },
  { id: 'add-to-lineup', phase: 'asked', lane: 'organizer', name: '“Add to an event’s line-up”', status: 'live', marks: ['manual', 'silent'], route: '/@[handle]/book', code: 'inquiries.me · inquiries.addToEvent', refs: ['RAZ-964'],
    note: 'Under the request form, an organiser can add the artist to one of their upcoming events with the same styles (one row per series), or draft a new event with them. That puts them in events.artists and opens the editor. The artist is not asked or told: “Then send the link from your event.”' },
  { id: 'invite', phase: 'asked', lane: 'organizer', name: 'Invite from the line-up', status: 'partial', marks: ['manual'], route: '/business/events/[id]', code: 'artistInvites.link · artistInvites.notify · MCP invite_artist',
    note: 'A personal /confirm/<token> link with the offer and a ready message. WeDance emails it only when someone runs the artist’s page. Otherwise the organiser copies it into WhatsApp or Instagram, and most synced artists have nobody running their page.' },
  { id: 'role', phase: 'asked', lane: 'organizer', name: 'Post a role on /gigs', status: 'live', marks: [], route: '/gigs', code: 'gigs.create (kind role) · MCP post_gig_offer',
    note: 'An open role (“DJ for our Friday social”) with a contact email and a deadline. Artists apply on the page.' },

  // Answer
  { id: 'inquiry-reply', phase: 'answer', lane: 'artist', name: 'Answer a request', status: 'partial', marks: ['manual', 'silent'], route: '/business/network/[username]/bookings', code: 'inquiries.setStatus · MCP inquiries / mark_inquiry',
    note: '“Answer them by email, then mark it answered.” The conversation happens in email. Marking it answered or declined is a note to the team only: the asker isn’t told, and nothing links the request to an event.' },
  { id: 'invite-answer', phase: 'answer', lane: 'artist', name: 'Confirm or decline the invite', status: 'live', marks: ['wait'], route: '/confirm/[token]', code: 'artistInvites.get · artistInvites.respond · MCP respond_invite', refs: ['#515', '#520', '#521'],
    note: 'The event, who else is on it, their slot, the offer or their own fee and needs, the name and photo for this flyer, and whether posts may tag them. A team sees it as “Is X in?” under Needs you. Signed out, they leave an email and get their answer in writing.' },
  { id: 'take-over', phase: 'answer', lane: 'artist', name: 'Take over the page', status: 'live', marks: [], code: 'artistInvites.claim · artistInvites.confirmEmail · MCP claim_profile', refs: ['#521'],
    note: '“That’s me, confirm” in the answer copy signs them in and, while nobody runs the page, makes them its owner, with no admin review. This is the only fast way in, and it only opens when an organiser invites them.' },
  { id: 'apply', phase: 'answer', lane: 'artist', name: 'Apply to a role', status: 'live', marks: [], route: '/gigs', code: 'gigs.applyTo → sendGigApplicationEmail · MCP apply_to_gig',
    note: 'A message, optionally as their artist page. The poster is emailed with a link to the page. One application per gig; closed or past-deadline gigs refuse it.' },
  { id: 'answer-back', phase: 'answer', lane: 'organizer', name: 'Hear the answer', status: 'live', marks: [], code: 'sendInviteAnsweredEmail · BusinessLineupPicker · gigs.decideApplication → sendGigDecisionEmail', refs: ['#521'],
    note: 'An invite answer arrives by email and as a chip in the line-up (in, can’t make it, terms, email confirmed). Gig posters accept or decline on /gigs?mine=1, and the artist is emailed either way.' },
  { id: 'nudge', phase: 'answer', lane: 'system', name: 'Chase the silence', status: 'missing', marks: ['wait'],
    note: 'Unanswered invites, requests and gig applications have no deadline and no reminder. A request sent to hello@wedance.vip has no status the asker can see.' },

  // On the line-up
  { id: 'deal-to-lineup', phase: 'lineup', lane: 'system', name: 'A yes becomes a booking', status: 'gap', marks: ['manual'],
    note: 'A request answered by email or an accepted gig application doesn’t create an invite or put the artist in a line-up. The organiser adds them again by hand in the event editor, then sends the invite link.' },
  { id: 'schedule', phase: 'lineup', lane: 'system', name: 'On their page and the event', status: 'live', marks: [], route: '/@[handle]', code: 'events.artists · MCP profile_schedule',
    note: 'Being in events.artists puts the event on the artist’s /@handle schedule, and the artist in the event page’s Lineup and the city page. This already happens before they confirm.' },
  { id: 'flyer', phase: 'lineup', lane: 'system', name: 'Their name on the flyer', status: 'live', marks: [], code: 'events.flyerOptions (names, photos)',
    note: 'The flyer uses the name and photo the artist chose in the invite, or the organiser’s suggestion until they answer.' },
  { id: 'told-live', phase: 'lineup', lane: 'artist', name: 'Told it’s live', status: 'gap', marks: ['silent'],
    note: 'Nothing tells the line-up that the event is published, so they don’t get a link to share with their students and followers.' },
  { id: 'decline-stays', phase: 'lineup', lane: 'organizer', name: 'A “no” leaves the line-up', status: 'gap', marks: ['silent'], code: 'artistInvites.respond — events.artists untouched',
    note: 'A declined artist stays on the published event, their /@handle schedule and any posted flyer until the organiser removes them by hand.' },
  { id: 'changes', phase: 'lineup', lane: 'artist', name: 'Hears of changes', status: 'missing', marks: ['silent'], code: 'server/utils/eventCancel.ts signupsOf',
    note: 'Cancelling emails everyone who signed up, but the line-up isn’t in that list. A new date, time or venue reaches nobody either. The artist finds out from the organiser, or doesn’t.' },

  // The night
  { id: 'perform', phase: 'night', lane: 'artist', name: 'Teach, DJ or play', status: 'gap', marks: [], route: '/confirm/[token]',
    note: 'Happens off the platform. The invite page is the only place with their slot and terms, and there’s no day-before note with the time, address and who to call.' },
  { id: 'pay', phase: 'night', lane: 'organizer', name: 'Pay the fee', status: 'gap', marks: ['manual'],
    note: 'The fee agreed in the invite is paid outside WeDance, which holds no money. Nothing records whether it was paid.' },

  // After
  { id: 'review', phase: 'after', lane: 'system', name: 'Ask for a review', status: 'missing', marks: ['silent'], code: 'review.create · ReviewsSection',
    note: 'Dancers can review an artist on /@handle or the event on its page, but nobody is asked after the night, and the artist isn’t told when a review arrives.' },
  { id: 'recap', phase: 'after', lane: 'artist', name: 'See how it went', status: 'missing', marks: [],
    note: 'No recap: how many signed up and came, reviews, or a link to share. Nothing on the artist’s page builds up a track record either, beyond the schedule of past events.' },
  { id: 'book-again', phase: 'after', lane: 'organizer', name: 'Book them again', status: 'live', marks: [], code: 'app/lib/eventSteps.ts pastEventHints · businessEvents.copy',
    note: 'The line-up step of a new event suggests the artists the host booked before, and “Like my last event” starts from the last one. A new invite is still needed each time.' },
]

export const artistGaps: BpGap[] = [
  { title: 'Requests to pages nobody runs',
    why: 'Most artist pages were made for them (sync, migration, Instagram import) and have no team. A booking request then goes to the page’s private email or to hello@wedance.vip for someone to forward by hand. Claiming the page from /@handle waits for an admin nobody alerts.',
    fix: 'Treat a request to an unrun page like an invite: give the artist a personal link that shows the request and lets them answer and take over the page, and show it to the asker to send. Alert admins about every request forwarded to hello@ and every new claim. Send the asker a copy that says who it reached.',
    steps: ['synced', 'own-page', 'inquiry', 'inquiry-route'] },
  { title: 'The deal leaves WeDance',
    why: 'A request is answered in email and “marked answered” for nobody. An accepted gig application tells the artist, but neither one becomes a line-up invite, so the organiser rebuilds the booking in the event editor.',
    fix: 'In Bookings, give each request a “Yes, book it” that creates the line-up invite on the asker’s event (or a draft) with the budget as the offer, and emails the asker. An accepted gig application does the same.',
    steps: ['inquiry-reply', 'deal-to-lineup', 'apply', 'answer-back', 'offer'] },
  { title: 'Added, but not asked',
    why: '“Add to an event’s line-up” on /@handle/book and the line-up picker put the artist on a public event and their page’s schedule without asking. The invite is a separate link the organiser must remember to send, and for most artists sends by hand.',
    fix: 'Make inquiries.addToEvent create the invite the way invite_artist does: email it when the page has a team, otherwise show the link and message right there on /book. In the line-up, mark artists who haven’t been asked yet.',
    steps: ['add-to-lineup', 'invite', 'schedule', 'booking-link'] },
  { title: 'Silence is never chased',
    why: 'Invites, requests and gig applications have no deadline and no reminder, so an organiser planning a line-up waits without knowing whether a link even arrived.',
    fix: 'A reminder after three days to whoever owes the answer (the artist’s team, or the poster of a role), and a “waiting on” list in the organiser’s Business inbox with the date each one was sent.',
    steps: ['nudge', 'invite-answer', 'inquiry-reply', 'apply'] },
  { title: 'The line-up hears nothing after yes',
    why: 'Once an artist confirms, nothing reaches them: not that the event is live, not a new date or venue, not a cancellation. A declined artist stays on the public event.',
    fix: 'Email the confirmed line-up when the event is published (with the link and flyer to share), when its date, time or venue changes, and when it is cancelled (add confirmed invites to signupsOf). A decline takes the artist off the line-up, with an undo. Send the line-up a short note the day before.',
    steps: ['told-live', 'decline-stays', 'changes', 'perform'] },
  { title: 'Nothing comes back after the night',
    why: 'Reviews exist but nobody is asked for one, the artist isn’t told when one arrives, and there’s no recap. An artist’s page never builds the record that would get them booked again.',
    fix: 'The day after, ask the dancers who signed up to review the night and its artists. Email the artist each review and a recap (sign-ups, reviews, a link to share), and show past line-ups and reviews on /@handle and /artists.',
    steps: ['review', 'recap', 'directory', 'book-again'] },
]

export const artistBookingBlueprint: Blueprint = {
  updated: ARTIST_BLUEPRINT_UPDATED,
  lanes: artistLanes,
  phases: artistPhases,
  steps: artistSteps,
  gaps: artistGaps,
  systemLane: 'system',
}
