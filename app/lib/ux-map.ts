/**
 * The UX map on /docs/ux-map: every user journey (rows) across the six stages a
 * person goes through (columns), with the real pages and features at each step.
 *
 * Hand-maintained. Statuses were read from the routes in app/pages, the
 * landing-promise stories in docs/issues/P*.md and merged PRs (up to #517,
 * 2026-11-13). "gap" = a stage needs something and nothing exists or is planned
 * (a judgement call, not a story). Update the item when you ship or change it.
 */
export type UxStatus = 'live' | 'partial' | 'missing' | 'gap'
export type UxStageKey = 'discover' | 'evaluate' | 'commit' | 'attend' | 'return' | 'spread'
export type UxJourneyId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8'

export interface UxStage { key: UxStageKey, label: string, hint: string }
export interface UxJourney { id: UxJourneyId, who: string, what: string, job: string }
export interface UxItem {
  journey: UxJourneyId
  stage: UxStageKey
  name: string
  /** Route or surface, '' when nothing exists. */
  route: string
  status: UxStatus
  note: string
  /** Story ids (P…, RAZ-…) and PRs (#…). */
  refs: string[]
}
export interface UxHandoff { route: string, name: string, status: UxStatus, why: string }

export const UX_UPDATED = '2026-11-13'

export const uxStatusLabel: Record<UxStatus, string> = {
  live: 'Live, real data',
  partial: 'Partial or mock data',
  missing: 'Promised, not built',
  gap: 'Gap: nothing planned',
}

const S: [UxStageKey, string, string][] = [
 ['discover','Discover','first hears of it'],
 ['evaluate','Evaluate','is this for me?'],
 ['commit','Commit','sign up · RSVP · buy'],
 ['attend','Show up','the night / the event'],
 ['return','Come back','the next week'],
 ['spread','Bring others','friends, partners, crew'],]
export const uxStages: UxStage[] = S.map(([key, label, hint]) => ({ key, label, hint }))

const JR: [UxJourneyId, string, string, string][] = [
 ['C1','Seeker','Find your dance','Start dancing without feeling lost'],
 ['C2','Student','Find your teacher','Get better and keep momentum'],
 ['C3','Regular','Find your floor','Never dance alone'],
 ['C4','Traveler','Plan your festival year','Plan and afford dance travel'],
 ['C5','Artist','Get booked','Get discovered and booked'],
 ['C6','Host & venue','Private event, rent a space','Throw a great night'],
 ['C7','Organizer','Run events & festivals','Run a great event'],
 ['C8','Member','Account, identity, trust','Trust it is real'],]
export const uxJourneys: UxJourney[] = JR.map(([id, who, what, job]) => ({ id, who, what, job }))

const IT: [UxJourneyId, UxStageKey, string, string, UxStatus, string, string][] = [
// C1 Seeker
['C1','discover','Landing "Find your dance" CTA','/','live','Hero and journey section point beginners to /find-your-dance.','P101 P401'],
['C1','discover','City pages in search','/cities/[city]','live','SEO city directory pages bring local search traffic.','RAZ-169'],
['C1','evaluate','Style picks with videos','/find-your-dance','live','Salsa, bachata, kizomba cards with video previews.','P1001 P1003 P1004 P1005'],
['C1','evaluate','Dance-match quiz','/find-your-dance','missing','Promised as "coming soon" on the page.','P1002 RAZ-18'],
['C1','commit','Free taster class','/find-your-dance','partial','The CTA exists, but there is no real taster-class inventory behind it. It leads to the city page.','P1006 P401'],
['C1','commit','Beginner-friendly filter','/cities/[city]','gap','A beginner has no way to see which classes or socials suit their level.',''],
['C1','attend','"Your first class" guide','','gap','Nothing tells a beginner what to expect, what to wear, or whether to bring a partner.',''],
['C1','return','Goals','/my-plan','partial','The goals block exists, but it is a static compass and nothing nudges you toward it.','P227'],
['C1','return','Follow-up after first class','','gap','No email or prompt after a first class. This is the moment a Seeker becomes a Regular or drops out.',''],
['C1','spread','Bring a friend to a taster','','gap','',''],
// C2 Student
['C2','discover','Artist directory + search','/artists','live','Search by name and style, filter by city.','P219 P221 P222'],
['C2','discover','City artists tab','/cities/[city]/artists','live','','RAZ-169'],
['C2','evaluate','Teacher profile','/@handle','live','Bio, styles, schedule of their classes and events, reviews.','P501'],
['C2','evaluate','Reviews','/@handle','live','ReviewsSection on profiles.',''],
['C2','commit','Follow a teacher','/@handle','partial','Follow works, but nothing comes of it: no feed or notification when they teach.','P220'],
['C2','commit','Request a private class','/book/[handle]','live','Booking request form; also an MCP tool.',''],
['C2','attend','Workshop plan at a festival','festival page','live','Pick workshops from a festival schedule.','P228'],
['C2','return','My courses this month','/my-plan','partial','Shows real courses since #387, but my-plan still imports mock festivals.','P230'],
['C2','return','Progress / level tracking','','gap','Nothing records what you have learned or what level you are at.',''],
['C2','spread','Share my plan','/my-plan','live','',''],
// C3 Regular
['C3','discover','City page this week','/cities/[city]','live','About 1,000 upcoming Munich events, synced from wedance.vip.','P216 P217 P601'],
['C3','discover','Venues & organisers tabs','/cities/[city]/venues','live','"Who\'s on the floor" tabs.','RAZ-168'],
['C3','evaluate','Event page','/events/[id]','live','Time in the event\'s zone, venue, line-up, organiser.',''],
['C3','evaluate','Who\'s going (opt-in faces)','/events/[id]','live','GoingSection with a share toggle. The July audit marked it not built; it has shipped since.','P205 P207 P211 RAZ-19'],
['C3','evaluate','Ask the locals, community groups','/cities/[city]','live','',''],
['C3','commit','Going! / organiser\'s RSVP poll','/events/[id]','live','Works signed out and survives sign-up.','RAZ-718 RAZ-731'],
['C3','attend','Hangouts tonight','/my-plan','live','Event-linked hangouts.','P232 RAZ-439'],
['C3','attend','Door check-in','organiser side','live','The organiser checks guests in.',''],
['C3','return','This week\'s socials','/my-plan','partial','Real since #377, but the page mixes in mock festival data.','P231'],
['C3','return','Reminders / new events from people I follow','','gap','No dancer-facing email or push exists. Every email sent today goes to businesses or is about auth.',''],
['C3','return','City video vote · City Battle','/cities/[city]','live','',''],
['C3','spread','Wave / partner pairing','/events/[id]','live','Waves and leader/follower pairing from the RSVP poll.',''],
['C3','spread','Discover dancers deck','/my-plan','live','',''],
// C4 Traveler
['C4','discover','Festival list + search','/festivals','partial','DB-backed, but few festivals have rich data. Search by city, style and name.','P214 P213 P301'],
['C4','discover','Europe-wide map','/','partial','','P209 P303'],
['C4','evaluate','Festival page','/events/[id]','partial','Line-up, schedule, planning count; still has a mock fallback.','P306'],
['C4','evaluate','See who\'s going before booking','festival page','partial','GoingSection exists, but there are few real attendees per festival.','P302 P306'],
['C4','commit','Buy a ticket','festival page','partial','Stripe and TicketTailor checkout work, for the few festivals ticketed on WeDance.','P210 P309 RAZ-205'],
['C4','commit','Add to year plan','/festivals','live','"Going?" toggle.','P215 P237'],
['C4','attend','Ride share · roommates · dinners','/my-plan','partial','Built, but empty without other travellers on the same festival.','P304 P311 P312'],
['C4','attend','Arrive with friends','','missing','','P305 RAZ-20'],
['C4','attend','Partner matching','/my-plan','missing','Swipe deck exists; real matching does not.','P229 P236 RAZ-124'],
['C4','return','My year in numbers','/my-year','partial','Stats are partly mock.','P233 P234 P235 P314 P315 P317'],
['C4','return','Early-bird alerts','/my-year','partial','Shown on the page, but never sent.','P316'],
['C4','spread','Share plan / year','SharePlanModal','live','Shared plan view → sign-up.','P318'],
['C4','spread','Friend\'s link discount','','partial','Tracked promoter links exist; the friend-to-friend discount does not.','P319'],
// C5 Artist
['C5','discover','Page made for them (v3 sync / Instagram)','/@handle','live','Most artists first meet WeDance as an unclaimed page someone else made.',''],
['C5','discover','Invited by an organiser','invite link','live','Artist invite: their classes first, the flyer next.','#515 #516 #517'],
['C5','evaluate','Review the invite','/confirm/[token]','live','One review page, one answer.','#516'],
['C5','commit','Claim my page','/business/claim','live','Structured evidence, admin review.','RAZ-321'],
['C5','commit','Offers, terms, availability','/business','live','','#517'],
['C5','attend','Gigs board: apply','/gigs','partial','Board works, but has few real gigs.','P102 P103 P901 P902'],
['C5','attend','Booking requests & inquiries inbox','/business','live','',''],
['C5','return','My schedule on my page','/@handle','live','Line-up events are listed on the profile.','#484'],
['C5','return','Who follows me / demand','','gap','An artist cannot see their audience.','RAZ-12'],
['C5','spread','Promo kit + tracked link','/business','live','',''],
// C6 Host & venue
['C6','discover','For events / for venues','/for-events','live','Weddings, birthdays, corporate.','P801 P802 P803 P701'],
['C6','discover','Venue directory','/venues','live','','P815 P816 P817'],
['C6','evaluate','Services menu','/for-events','live','Venue, MC, DJ, show, catering, photo.','P804 P805 P806 P807 P808 P809'],
['C6','commit','Event inquiry','/for-events','live','Goes to the founder through Linear; it is an offline service.','P812 P813 P814'],
['C6','commit','Request a date at a venue','/venues','live','Bookable areas, opening-hours checks.',''],
['C6','commit','Venue owner answers a venue ask','invite link','live','Facts, plan, offer, draft preview.','#514'],
['C6','attend','We run the door','','partial','Promised as a service; check-in exists, but the client has no tool for it.','P810 P811'],
['C6','return','Venue bookings & availability','/business/network/[u]/bookings','live','',''],
['C6','return','Client sees their past night','','gap','',''],
['C6','spread','Referral for hosts','','gap','',''],
// C7 Organizer
['C7','discover','For organizers','/for-organizers','live','','P707 P708 P714'],
['C7','discover','AI app (ChatGPT / Claude via MCP)','/docs/mcp','live','A second front door: the AI sets up the whole event.','#393 #446'],
['C7','evaluate','Pricing: Starter free','/for-organizers','live','','P729 P734'],
['C7','evaluate','Pro €49 / Network €199','/for-organizers','missing','Checkout exists, but the paid feature set it sells is mostly unbuilt.','P730 P731 P732'],
['C7','commit','Create / claim my page','/business/new','live','Duplicate warnings, Instagram import.','#458 #452'],
['C7','commit','Create event (form · Instagram post · AI)','/business/events/new','live','Co-organisers, series, venue asks, artist invites.','P715 P709 #453 #456'],
['C7','attend','Flyer generator','/business/events/[id]/flyer','live','',''],
['C7','attend','Content plan → Instagram feed / story','/business','live','Dev-mode Meta app: only people with a role on the app can connect.','#501'],
['C7','attend','Ticketing','event page','partial','Works but is used by few events.','P705 P706 P713 P735'],
['C7','attend','Hosted website','/business/network/[u]/website','live','Drafts, preview, version history.','#493 #498'],
['C7','return','Insights','/organizers/insights','partial','Planning counts only.','P718'],
['C7','return','Demand, geography, post-event signal','','missing','','P725 P726 P727 P728'],
['C7','return','Contacts / CRM','/business/contacts','live','',''],
['C7','spread','Team roles','/business/network/[u]/team','live','',''],
['C7','spread','Promoter links & roster · giveaways','/business','live','',''],
// C8 Member
['C8','discover','Landing','/','live','','P101 P201 P203 P204 P212'],
['C8','evaluate','Open metrics','/open','live','Public numbers build trust.','#402'],
['C8','evaluate','"Every face real"','/','partial','The promise rests on attendee faces, which are still thin.','P202 P206'],
['C8','commit','Sign up (password · magic link)','SignUpModal','live','',''],
['C8','commit','Onboarding: intent, city, styles','/onboarding','live','',''],
['C8','attend','My public page / handle','/u/[username]','live','One handle per person.','#474'],
['C8','attend','Settings, connected apps','/settings','live','',''],
['C8','return','Notifications of any kind','','gap','There is no in-app inbox or digest for dancers.','RAZ-14 RAZ-17'],
['C8','return','What\'s new','/whats-new','live','',''],
['C8','spread','Invite friends','','partial','Only through shared plans; no general invite.','RAZ-15'],]
export const uxItems: UxItem[] = IT.map(([journey, stage, name, route, status, note, refs]) =>
  ({ journey, stage, name, route, status, note, refs: refs ? refs.split(' ') : [] }))

const HO: [string, string, UxStatus, string][] = [
 ['C1 → C3','Seeker becomes a Regular','gap','After a first class, nothing leads to the weekly socials at the same school or venue.'],
 ['C3 → C4','Regular goes to a first festival','partial','The city page shows festivals, but there is no "people from your scene are going" signal.'],
 ['C3 → C5','Regular starts teaching or DJing','partial','A dancer\'s page can become a business page (#474), but no flow invites it.'],
 ['C7 → C5','Organizer invites an artist','live','An invite link lands on a review page the artist can answer (#515–517).'],
 ['C7 → C6','Organizer asks a venue','live','A venue ask lands on a page the owner can answer (#514).'],
 ['C4 → C8','Shared plan turns a friend into a member','live','Shared plan view → "add friend" → sign-up.'],
 ['C7 → C3','Organizer\'s RSVP poll brings dancers in','live','The poll works signed out and confirms on sign-up.'],]
export const uxHandoffs: UxHandoff[] = HO.map(([route, name, status, why]) => ({ route, name, status, why }))
