/**
 * Service blueprint: planning and affording a year of dance travel (job J4),
 * from finding festivals to the year looked back on. Lanes are who acts —
 * the dancer, WeDance, the festival organiser, friends and other dancers, and
 * the ticket provider (Stripe, TicketTailor, or the organiser's own shop).
 * Hand-maintained from the code (procedures named in `code`): /festivals
 * (listFestivals), the festival page (FestivalView: + My plan, workshops,
 * passes, rides, roommates, dinners, hangouts, sharing), My plan's Year
 * tab, festivalSignup.*, the Stripe and TicketTailor webhooks,
 * /charanga/claim, and the MCP tools. Re-read against the code on 2026-11-26
 * (RAZ-1072). An external ticket link is “Get tickets” beside the sign-up
 * (RAZ-1102); buying it still never comes back. Not run end to end with a
 * test dancer and a real checkout yet.
 * Shown at /docs/blueprints/festival-travel.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const TRAVEL_BLUEPRINT_UPDATED = '2026-11-26'

export type TravelLane = 'me' | 'system' | 'organiser' | 'friends' | 'provider'
export type TravelPhase = 'find' | 'year' | 'workshops' | 'tickets' | 'travel' | 'share' | 'festival' | 'after'

export const travelLanes: BpLaneDef<TravelLane>[] = [
  { key: 'me', label: 'Dancer', hint: '/festivals, the festival page, My plan' },
  { key: 'system', label: 'WeDance', hint: 'Listing, plan, passes, emails' },
  { key: 'organiser', label: 'Festival organiser', hint: 'Event editor, insights' },
  { key: 'friends', label: 'Friends / other dancers', hint: 'Shared links, the same festival page' },
  { key: 'provider', label: 'Ticket provider', hint: 'Stripe, TicketTailor, the festival’s own shop' },
]

export const travelPhases: BpPhaseDef<TravelPhase>[] = [
  { key: 'find', label: 'Find festivals' },
  { key: 'year', label: 'Pick the year' },
  { key: 'workshops', label: 'Plan workshops' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'travel', label: 'Travel and room' },
  { key: 'share', label: 'Share with friends' },
  { key: 'festival', label: 'The festival' },
  { key: 'after', label: 'After' },
]

export const travelSteps: BpStep<TravelLane, TravelPhase>[] = [
  // Find festivals
  { id: 'browse', phase: 'find', lane: 'me', name: 'Browse /festivals', status: 'partial', marks: [], route: '/festivals', code: '/api/festivals → listFestivals (server/utils/festivalListing.ts)',
    note: 'Real festival, congress and weekender events that haven’t ended, soonest first; search by name, city or style, style chips, how many plan to go and the first verified faces. The list itself is real festivals. No price on a card, no month or “near me” filter — you can’t see what a festival costs until you open it.' },
  { id: 'mirror', phase: 'find', lane: 'system', name: 'Mirror wedance.vip', status: 'live', marks: [], code: 'scripts/sync-v3-events.ts · server/utils/v3EventSync.ts',
    note: 'Festivals typed on wedance.vip arrive as events with is_festival. They carry name, dates, venue and a ticket link — not passes or a programme, which only an organiser adds in the event editor.' },
  { id: 'list', phase: 'find', lane: 'organiser', name: 'List the festival', status: 'partial', marks: ['wait'], route: '/business/events/new', code: 'businessEvents.create · festival.submitDraft',
    note: 'In the event editor a festival is an event with a type; passes and programme are its own tabs. The older /organizers/create wizard sends a draft the team has to mark onboarded before the organiser sees insights.' },
  { id: 'mcp-find', phase: 'find', lane: 'me', name: 'Ask an assistant', status: 'live', marks: [], code: 'MCP find_festivals · get_festival · add_to_plan',
    note: 'The same list and festival page through ChatGPT or Claude. (MCP my_festivals is the organiser’s list, not the dancer’s.)' },

  // Pick the year
  { id: 'going', phase: 'year', lane: 'me', name: '+ My plan', status: 'live', marks: [], route: '/events/[id]', code: 'useYearPlan.toggleFestival → plan.add (festival)',
    note: 'One tap on the festival page or a /festivals card puts it in the year plan; signed out it opens sign-up first. A festival event without festival details is saved as an event instead, by its id.' },
  { id: 'this-year', phase: 'year', lane: 'system', name: 'My plan, Year tab', status: 'partial', marks: [], route: '/my-plan', code: 'plan.myPlan',
    note: 'Lists the picked festivals with dates and place. Price and early-bird live on the festival page (its passes), which the ticket row opens. The year tab itself still has no price (RAZ-1006 shipped the tabs).' },
  { id: 'checklist', phase: 'year', lane: 'me', name: 'Tick ticket / travel / stay', status: 'partial', marks: ['manual'], route: '/my-plan', code: 'localStorage wedance-plan-progress · attendance.updateLogistics (no caller)',
    note: 'Per festival: ticket bought, travel, stay, partner, holiday — ticked by hand and kept in this browser only. Only “ticket bought” syncs, from festivalSignup.myTickets. attendance.updateLogistics would store the rest but nothing calls it.' },
  { id: 'budget', phase: 'year', lane: 'system', name: 'What the year costs', status: 'missing', marks: [], code: 'YearDrawer (not mounted)',
    note: 'No total anywhere: not passes, not travel, not a budget. YearDrawer has a budget field, but no page renders it.' },

  // Plan workshops
  { id: 'programme', phase: 'workshops', lane: 'organiser', name: 'Programme + passes', status: 'partial', marks: [], route: '/business/events/[id]', code: 'BusinessFestivalEditor (passes, programme) · events.festival',
    note: 'The organiser enters passes (price, days, workshops, party, couple price) and the programme by day, and a dancer can check out. A mirrored festival has neither until its organiser claims the page and fills them in.' },
  { id: 'pick', phase: 'workshops', lane: 'me', name: 'Pick workshops', status: 'live', marks: [], route: '/events/[id]?tab=schedule', code: 'plan.add (workshop, <festival>:<id>) · RolePickerModal',
    note: 'Tap a workshop: lead or follow, with a partner or looking (remembered once). Same-time picks replace each other. Saved per workshop in plan_items.' },
  { id: 'plan-workshops', phase: 'workshops', lane: 'me', name: 'Workshops on My plan', status: 'partial', marks: ['silent'], route: '/my-plan', code: 'localStorage wedance-plan-workshops',
    note: 'My plan has its own workshop picker kept in this browser, not in plan_items — picks made there don’t reach the festival page or another device, and the reverse.' },
  { id: 'recommend', phase: 'workshops', lane: 'system', name: 'Best pass for my picks', status: 'partial', marks: [], route: '/events/[id]?tab=tickets', code: 'FestivalView recommendation (cheapestDayCoverage)',
    note: 'From the days, workshops and parties picked, the cheapest pass or day-pass combo, with the saving. Shown only when the passes say what they cover; passes entered as name + price get no advice.' },

  // Tickets
  { id: 'checkout', phase: 'tickets', lane: 'me', name: 'Get pass', status: 'live', marks: [], route: '/events/[id]?tab=tickets', code: 'festivalSignup.ticketCheckout · MCP buy_ticket',
    note: 'On the Passes tab, signed in, pick a pass (or two people) → Stripe Checkout with your email filled in. Price is worked out on the server from the saved passes; a referral code and earned credit come off as one coupon.' },
  { id: 'stripe', phase: 'tickets', lane: 'provider', name: 'Stripe webhook', status: 'live', marks: [], code: '/api/stripe/webhook (checkout.session.completed)',
    note: 'Writes the festival_signups row as a verified ticket holder, completes the referral, credits a promoter link and emails the ticket. Redeliveries collapse.' },
  { id: 'paid', phase: 'tickets', lane: 'system', name: 'Back on the page', status: 'live', marks: ['wait'], route: '/events/[id]?payment=success', code: 'festivalSignup.status · sendTicketConfirmationEmail',
    note: 'Waits up to five seconds for the webhook, then “You have a pass” and a success screen; a late webhook still lands, the page just doesn’t know yet.' },
  { id: 'payout', phase: 'tickets', lane: 'organiser', name: 'Hear about the sale', status: 'missing', marks: ['silent', 'manual'],
    note: 'The money lands in WeDance’s own Stripe account (no Connect) and the organiser gets no email and no sales list for the festival — paying them out is by hand.' },
  { id: 'own-shop', phase: 'tickets', lane: 'provider', name: 'The festival’s own shop', status: 'gap', marks: ['silent'], code: 'FestivalView “Get tickets” (festival.ticketUrl)',
    note: 'Most festivals (all mirrored ones) have no passes here, only “Get tickets” beside the sign-up, linking to their own site. What you buy there never comes back: the plan still says “Not bought” until you tick it.' },
  { id: 'tickettailor', phase: 'tickets', lane: 'provider', name: 'TicketTailor webhook', status: 'partial', marks: [], code: '/api/webhooks/tickettailor · TICKETTAILOR_FESTIVAL_MAP',
    note: 'An order makes a verified row, matched to a dancer by email or left as a stub. The event map is in code and has one festival (Charanga Habanera Munich).' },
  { id: 'claim', phase: 'tickets', lane: 'me', name: 'Claim a TicketTailor ticket', status: 'partial', marks: ['manual', 'wait'], route: '/charanga/claim', code: 'claim.claimMyTicketHolderRows',
    note: 'Sign in by magic link, then the stub rows for your email become yours. WeDance sends no email with this link; you find it under “Verified attendees” on that one festival’s page.' },

  // Travel and room
  { id: 'ride', phase: 'travel', lane: 'me', name: 'Offer or look for a ride', status: 'partial', marks: ['manual'], route: '/events/[id]', code: 'rideShare.create · MCP offer_ride',
    note: 'From city, date, seats and a contact link. Agreeing happens on that link, outside WeDance; the contact shows only to signed-in dancers.' },
  { id: 'rides-seen', phase: 'travel', lane: 'friends', name: 'Find a ride', status: 'partial', marks: ['silent'], code: 'rideShare.list · MCP list_rides',
    note: 'A list on the festival page’s Overview, not matched by city or date. Nobody is told when a ride from their city is posted.' },
  { id: 'roommate', phase: 'travel', lane: 'me', name: 'Look for a roommate', status: 'partial', marks: ['manual'], route: '/events/[id]', code: 'roommate.toggle · MCP toggle_roommate_search',
    note: 'A switch, then the names of others looking. No way to reach them but their profile; when nobody is looking, a Google Hotels search for the venue and dates.' },
  { id: 'roommate-seen', phase: 'travel', lane: 'friends', name: 'Hear someone needs a room', status: 'missing', marks: ['silent'], code: 'roommate.list',
    note: 'Only by opening the festival page — no email or My plan item when someone going starts looking.' },
  { id: 'dinners', phase: 'travel', lane: 'system', name: 'Group dinners', status: 'missing', marks: [], code: 'dinner.list · dinner.join (no create)',
    note: 'Join and leave work, but no procedure or admin page creates a dinner, so the list is empty on real festivals.' },
  { id: 'hangout', phase: 'travel', lane: 'friends', name: 'Going together', status: 'partial', marks: ['silent'], route: '/events/[id]', code: 'hangouts.create · hangouts.toggleRsvp',
    note: 'Anyone can post a dinner, coffee or bar for the festival and others tap going. The host isn’t told when someone joins.' },
  { id: 'book-stay', phase: 'travel', lane: 'me', name: 'Book travel and stay', status: 'gap', marks: ['manual'],
    note: 'Off the platform; only the checklist tick on My plan (this browser) remembers it.' },

  // Share with friends
  { id: 'share-plan', phase: 'share', lane: 'me', name: 'Share my festival plan', status: 'live', marks: ['manual'], route: '/events/[id]', code: 'SharePlanModal · useSharePlan (plan in the link)',
    note: '“Bring friends”: one link — your workshops encoded in it (?invite=) when you picked some, else the event itself; ?ref= only when the festival has a referral discount. Send to friends opens the share sheet.' },
  { id: 'open-shared', phase: 'share', lane: 'friends', name: 'Open a shared plan', status: 'live', marks: [], route: '/events/[id]?invite=…', code: 'SharedPlanView · follow.toggleDancer',
    note: 'Sees your picks and pass, can add the sharer as a friend and sign up.' },
  { id: 'year-story', phase: 'share', lane: 'me', name: 'Share the festival year', status: 'live', marks: ['manual'], route: '/my-plan', code: 'YearStory · shared/utils/yearStory.ts', refs: ['RAZ-897'],
    note: 'A story picture of the festivals still ahead, with a link to /my-year?user=<you>.' },
  { id: 'shared-year', phase: 'share', lane: 'friends', name: 'See a friend’s year', status: 'live', marks: [], route: '/my-year?user=…', code: 'plan.sharedPlan · SharedYearPlan · MCP view_shared_plan',
    note: 'Their festivals, whether they have a ticket and, where the festival set one, the referral discount; open a festival to add it to your own year, or start your own.' },
  { id: 'referral', phase: 'share', lane: 'system', name: 'Referral discount', status: 'partial', marks: ['silent'], code: 'getReferralDiscountPercent (ticket-prices.ts) · referral.myReferrals',
    note: 'The festival page’s share modal says you both get a discount, but the percent is a code registry with four festivals; elsewhere it is 0. The sharer isn’t told when a friend buys — only my_referrals shows it, when asked.' },
  { id: 'friend-going', phase: 'share', lane: 'friends', name: 'Told a friend is going', status: 'missing', marks: ['silent'],
    note: 'When a friend adds the same festival or buys a pass, nothing reaches you; their plan reaches you only through a link they send.' },

  // The festival
  { id: 'whos-going', phase: 'festival', lane: 'me', name: 'Meet who’s going', status: 'partial', marks: [], route: '/events/[id]', code: 'plan.setShareGoing · festivalSignup.publicRoster',
    note: 'On the Overview, “Show me” puts you in Meet new friends for the festival (see the meet new friends blueprint); the per-festival deck is gone. The verified-ticket roster shows on one festival only.' },
  { id: 'my-schedule', phase: 'festival', lane: 'me', name: 'My workshops on the day', status: 'partial', marks: [], route: '/events/[id]?tab=schedule',
    note: 'Your picks are marked on the festival schedule. No day view of just your plan, no change alerts if the organiser moves a workshop.' },
  { id: 'check-in', phase: 'festival', lane: 'organiser', name: 'Door check-in', status: 'live', marks: [], route: '/business/events/[id]/door', code: 'attendance.door · attendance.checkIn', refs: ['RAZ-928'],
    note: 'The door list includes festival passes (festival_signups) as well as RSVPs, Going! and event tickets. Checking a pass in records it on attendances, and Who’s coming counts it.' },

  // After
  { id: 'review', phase: 'after', lane: 'me', name: 'Review the festival', status: 'live', marks: [], route: '/events/[id]', code: 'ReviewsSection (festival) · reviewAsk (skips is_festival)',
    note: 'Ratings and reviews on the festival page. The morning-after “How was it?” email skips festivals, so nobody asks for one after it ends.' },
  { id: 'year-review', phase: 'after', lane: 'system', name: 'Your year in dance', status: 'live', marks: [], route: '/my-year', code: 'plan.yearReview (server/utils/yearReview.ts)', refs: ['RAZ-966'],
    note: 'Real festivals in the year plan count as nights in the Wrapped-style look back, ending on “Plan <next year>”.' },
  { id: 'next-edition', phase: 'after', lane: 'system', name: 'Next year’s edition', status: 'missing', marks: ['silent'],
    note: 'Editions aren’t linked: going to this year’s festival doesn’t put next year’s on your radar or tell you when its early-bird opens.' },
]

export const travelGaps: BpGap[] = [
  { title: 'No money in the plan',
    why: 'The job is to plan AND afford the year, but no price reaches the planning surfaces: /festivals cards have none, the Year tab’s rows for real festivals have none, and the budget field sits in a component no page renders.',
    fix: 'Carry the cheapest live pass (livePasses) and any early-bird deadline into listFestivals and plan.myPlan; on the Year tab, show each festival’s pass price and a year total, with travel and stay as optional amounts.',
    steps: ['browse', 'this-year', 'budget', 'recommend'] },
  { title: 'Tickets bought elsewhere stay unknown',
    why: 'Most festivals sell on their own shop, and TicketTailor is mapped for one festival in code. A pass bought there never reaches the plan, and the TicketTailor claim link is never sent.',
    fix: 'An “I have my pass” answer on the festival page that writes an unverified festival_signups row; move the TicketTailor event id onto the event (set by the organiser); email the claim link from the webhook when the buyer has no account.',
    steps: ['own-shop', 'tickettailor', 'claim', 'checklist'] },
  { title: 'The organiser doesn’t see the sale',
    why: 'Passes sold here land in WeDance’s Stripe account with no email or list for the organiser, and payout is by hand — the organiser has no reason to put passes on WeDance.',
    fix: 'Email the organiser per sale and list the festival’s signups (who, pass, paid) in Business → the event; then Stripe Connect so the money goes to them directly.',
    steps: ['payout', 'stripe', 'programme', 'check-in'] },
  { title: 'Rides and rooms are notice boards',
    why: 'Rides, roommates and hangouts are lists on the festival page. Nobody is matched or told, and the deal happens on a contact link outside WeDance — while group dinners can’t be created at all.',
    fix: 'Email dancers going to the festival when a ride from their city or a roommate search is posted, add “Ask to join” that shares contacts both ways, and tell the host of a hangout who joined. Drop dinners into hangouts.',
    steps: ['ride', 'rides-seen', 'roommate', 'roommate-seen', 'dinners', 'hangout'] },
  { title: 'The plan lives in one browser',
    why: 'The travel / stay / partner ticks and My plan’s workshop picker are localStorage, so a second device (or the festival page) sees a different plan. attendance.updateLogistics was written for this and has no caller.',
    fix: 'Save the ticks on the server (plan_items fields or updateLogistics) and make My plan’s workshop picker read and write plan_items like the festival page.',
    steps: ['checklist', 'plan-workshops', 'pick', 'book-stay'] },
  { title: 'Friends hear only what you send',
    why: 'Sharing is a link you paste. When a friend adds the same festival or buys with your referral, nobody is told, and the referral promise holds for four hard-coded festivals.',
    fix: 'Tell followed friends “<name> is going to <festival> too” once, tell the sharer when a referral pays, and show the referral discount only where the festival set one.',
    steps: ['share-plan', 'open-shared', 'referral', 'friend-going'] },
]

export const festivalTravelBlueprint: Blueprint = {
  updated: TRAVEL_BLUEPRINT_UPDATED,
  lanes: travelLanes,
  phases: travelPhases,
  steps: travelSteps,
  gaps: travelGaps,
  systemLane: 'system',
}
