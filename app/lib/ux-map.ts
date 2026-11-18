/**
 * The UX map on /docs/ux-map: every user journey (rows) across the six stages a
 * person goes through (columns), with the real pages and features at each step.
 *
 * Hand-maintained. Statuses were first read from the routes in app/pages, the
 * landing-promise stories in docs/issues/P*.md and merged PRs (up to #517,
 * 2026-11-13), then checked by using the site on 2026-11-14 (RAZ-898): signed
 * out on 2026.wedance.vip, signed in as a dancer and an organiser on a local
 * copy of the database, desktop and phone. Items RAZ-898 could not run are
 * listed in RAZ-931. Re-read against the code on 2026-11-17 (RAZ-1035), from
 * #518 through #652: a status moved only where a merged PR changed what the
 * item describes. "gap" = a stage needs something and nothing exists or is
 * planned (a judgement call, not a story). Update the item when you ship or
 * change it.
 */
import { jobById, type JobId } from './jobs'

export type UxStatus = 'live' | 'partial' | 'missing' | 'gap'
export type UxStageKey = 'discover' | 'evaluate' | 'commit' | 'attend' | 'return' | 'spread'
export type UxJourneyId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8'

export interface UxStage { key: UxStageKey, label: string, hint: string }
/** `jobId`: the job (app/lib/jobs.ts) this journey mainly serves; `job` is its statement. */
export interface UxJourney { id: UxJourneyId, who: string, what: string, jobId: JobId, job: string }
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

export const UX_UPDATED = '2026-11-17'

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

const JR: [UxJourneyId, string, string, JobId][] = [
 ['C1','Seeker','Find your dance','J1'],
 ['C2','Student','Find your teacher','J2'],
 ['C3','Regular','Find your floor','J3'],
 ['C4','Traveler','Plan your festival year','J4'],
 ['C5','Artist','Get booked','J5'],
 ['C6','Host & venue','Private event, rent a space','J6'],
 ['C7','Organizer','Run events & festivals','J6'],
 ['C8','Member','Account, identity, trust','J7'],]
export const uxJourneys: UxJourney[] = JR.map(([id, who, what, jobId]) => ({ id, who, what, jobId, job: jobById(jobId).statement }))

const IT: [UxJourneyId, UxStageKey, string, string, UxStatus, string, string][] = [
// C1 Seeker
['C1','discover','Landing "Find your dance" CTA','/','partial','The homepage since #572 is the My plan landing (story pictures, ChatGPT, Meet new friends) and does not link to /find-your-dance. The link is in the header and the phone Explore tab; the old journey page is /about.','P101 P401 #572'],
['C1','discover','City pages in search','/cities/[city]','live','SEO city directory pages bring local search traffic.','RAZ-169'],
['C1','evaluate','Style picks with videos','/find-your-dance','live','Salsa, bachata, kizomba cards with video previews.','P1001 P1003 P1004 P1005'],
['C1','evaluate','Dance-match quiz','','missing','Still a landing promise, but /find-your-dance no longer mentions it: three style cards with videos and a taster link.','P1002 RAZ-18 RAZ-899'],
['C1','commit','Free taster class','/cities/[city]?taster=1','partial','"Try a free taster class" → pick a city → "Your first class": upcoming classes, workshops and practicas, free-priced ones first. Nothing is flagged as an official free taster, so paid classes are in the list too. Parties and weekenders are not. The week list below can be filtered to parties or classes (#648).','P1006 P401 #648'],
['C1','commit','Beginner-friendly filter','/cities/[city]','gap','No level filter on the city page. Parties and classes can be filtered (#648), and ?taster=1 lists classes, but neither is sorted by level.','#648'],
['C1','attend','"Your first class" guide','/cities/[city]?taster=1','partial','The taster list says no partner or experience is needed and to ask at the door. Nothing on what to wear or what happens in a class. An event\'s Overview can show "Good to know" when the organiser wrote it (#631).','#631'],
['C1','return','Goals','/my-plan','partial','The goals block exists, but it is a static compass and nothing nudges you toward it.','P227'],
['C1','return','Follow-up after first class','','partial','The morning after a class or party, everyone who signed up gets "How was it?" (#632). It asks for a review; it does not point a first-timer at next week\'s social at the same school.','#632'],
['C1','spread','Bring a friend to a taster','event page','partial','The class page has Bring friends: one link, the story card (#638 #642). The taster list itself has no invite.','#638 #642'],
// C2 Student
['C2','discover','Artist directory + search','/artists','live','Search by name and style, filter by city.','P219 P221 P222'],
['C2','discover','City artists tab','/cities/[city]/artists','live','','RAZ-169'],
['C2','evaluate','Teacher profile','/@handle','live','Bio, styles, schedule of their classes and events, reviews.','P501'],
['C2','evaluate','Reviews','/@handle','live','ReviewsSection on profiles.',''],
['C2','commit','Follow a teacher','/@handle','partial','Follow is on artist pages (not on venue pages), but nothing comes of it: no feed or notification when they teach.','P220'],
['C2','commit','Request a private class','/@handle/book','live','"Book <name>" on the artist\'s page: a form that works signed out; also an MCP tool.',''],
['C2','attend','Workshop plan at a festival','festival page','live','Pick workshops from a festival schedule.','P228'],
['C2','return','My courses this month','/my-plan','live','Real courses you added (plan.myCourses, #387), on the Today / Week / Month tabs (#618). A signed-in plan does not use the mock catalogue; that is only ?preview=1.','P230 #387 #618'],
['C2','return','Progress / level tracking','','gap','Nothing records what you have learned or what level you are at.',''],
['C2','spread','Share my plan','/my-plan','live','',''],
// C3 Regular
['C3','discover','City page this week','/cities/[city]','live','Real week and "Coming up", with a parties / classes filter (#648) and Pick a date to jump to one day (RAZ-1021). The going counts fail to load on big cities: plan.countBatch accepts 100 ids and the page sends every event at once (RAZ-923).','P216 P217 P601 RAZ-923 #648 RAZ-1021'],
['C3','discover','Venues & organisers tabs','/cities/[city]/venues','live','"Who\'s on the floor" tabs.','RAZ-168'],
['C3','evaluate','Event page','/events/[id]','live','One layout for every event (#645): time in the event\'s zone, venue, line-up, organiser, Overview and Reviews tabs (#615 #629). Practical notes sit under Good to know (#631).','#615 #629 #631 #645'],
['C3','evaluate','Who\'s going (opt-in faces)','/events/[id]','live','Signed-in viewers see faces and first names of people who answered and have a public profile (#605). Everyone else sees the counts. Meet who\'s going opens /meet (#615).','P205 P207 P211 RAZ-19 #605 #615'],
['C3','evaluate','Ask the locals, community groups','/cities/[city]','live','',''],
['C3','commit','+ My plan / Book my spot','/events/[id]','live','Book my spot is the sign-up (a class is one button, #605 #612). + My plan saves it without booking (#610). The organiser\'s poll is still partner / need a leader / need a follower; signed-out answers show as unconfirmed and survive sign-up.','RAZ-718 RAZ-731 #605 #610 #612'],
['C3','attend','Hangouts tonight','/my-plan','live','Event-linked hangouts.','P232 RAZ-439'],
['C3','attend','Door check-in','/business/events/[id]/door','live','The organiser opens the door list on a phone, finds a guest (RSVP, Going!, ticket) and checks them in. The count shows on Who’s coming. The AI app has door_list and check_in.','RAZ-928'],
['C3','return','This week\'s socials','/my-plan','live','The nights and classes you added, on Today / Week / Month (#618). A signed-in plan is only your own events; mock socials are ?preview=1.','P231 RAZ-907 #618'],
['C3','return','Reminders / new events from people I follow','','partial','Dancers do get email: a review the morning after (#632), a mutual dance friend (#636), and a cancellation or "it\'s on again" (#569 #575 #578). Nothing tells you when someone you follow announces a new event, and there is no push.','#632 #636 #569 #575 #578'],
['C3','return','City video vote · City Battle','/cities/[city]','live','',''],
['C3','spread','Wave / partner pairing','/events/[id]','live','Waves and leader/follower pairing from the RSVP poll.',''],
['C3','spread','Meet new friends deck','/meet','live','Its own page since RAZ-989; My plan links to it. Mutual yeses show on My plan as Your dance friends (#634) and the other dancer gets one email (#636).','RAZ-989 #634 #636'],
// C4 Traveler
['C4','discover','Festival list + search','/festivals','partial','Search by city, style and name. The list is festivals, congresses and weekenders (#609): parties and classes with passes stay off it. A running multi-day event is not labelled Past (#550). Few synced festivals have a logo, line-up or passes.','P214 P213 P301 RAZ-893 RAZ-925 #609 #550'],
['C4','discover','Europe-wide map','','missing','"Every festival mapped" is promised on the landing and /festivals, but neither has a map.','P209 P303'],
['C4','evaluate','Festival page','/events/[id]','partial','Line-up, schedule and planning count where we have them; synced festivals show only dates, styles and a link. Still has a mock fallback.','P306'],
['C4','evaluate','See who\'s going before booking','festival page','partial','Signed-in viewers see faces under Who\'s coming (#605); Meet who\'s going opens /meet (#615). The old swipe deck is gone. Most synced festivals still show few or no people going.','P302 P306 #605 #615'],
['C4','commit','Buy a ticket','festival page','partial','Passes an organiser adds in the editor sell through Stripe (#562). Festivals book through the same steps as classes (#633), and the steps suggest a pass for the workshops you picked (#635). Most synced festivals are not ticketed here.','P210 P309 RAZ-205 #562 #633 #635'],
['C4','commit','Add to year plan','/festivals','live','"+ My plan" toggle.','P215 P237'],
['C4','attend','Ride share · roommates · dinners','/my-plan','partial','Built, but empty without other travellers on the same festival.','P304 P311 P312'],
['C4','attend','Arrive with friends','','missing','','P305 RAZ-20'],
['C4','attend','Partner matching','/my-plan','partial','Mutual yeses from the Meet deck and from festival waves show on My plan as Your dance friends, with a night you could both attend (#634). The other dancer gets one email (#636). There is no message thread, and the festival page does not present it as partner matching.','P229 P236 RAZ-124 #634 #636'],
['C4','return','Your year in dance','/my-year','live','A story of your past year (nights you were going to, style, busiest month, home floor, festivals, cities, friends) to post at New Year, ending on planning next year. Found in My plan; up front in December and January.','P233 P234 P235 P314 P315 P317 RAZ-966'],
['C4','return','Early-bird alerts','/my-plan','partial','A deadline shows only where a festival has one (none of the synced ones); nothing is ever sent.','P316 RAZ-899'],
['C4','spread','Share plan / year','SharePlanModal','live','Shared plan view → sign-up.','P318'],
['C4','spread','Friend\'s link discount','','partial','Tracked promoter links exist; the friend-to-friend discount does not.','P319'],
// C5 Artist
['C5','discover','Page made for them (v3 sync / Instagram)','/@handle','live','Most artists first meet WeDance as an unclaimed page someone else made.',''],
['C5','discover','Invited by an organiser','invite link','live','Artist invite: their classes first, the flyer next.','#515 #516 #517'],
['C5','evaluate','Review the invite','/confirm/[token]','live','Slot, fee, name and photo for the flyer, one answer; works signed out. On a phone the answer bar sits above the tab bar (#551).','#516 #551'],
['C5','commit','Claim my page','/business/claim','live','Structured evidence, admin review.','RAZ-321'],
['C5','commit','Offers, terms, availability','/business','live','','#517'],
['C5','attend','Gigs board: apply','/gigs','partial','Board works, but has 7 gigs, several from deleted or test accounts.','P102 P103 P901 P902'],
['C5','attend','Booking requests & inquiries inbox','/business','live','',''],
['C5','return','My schedule on my page','/@handle','live','Line-up events are listed on the profile.','#484'],
['C5','return','Who follows me / demand','/business/network/[u]/contacts','partial','Contacts lists followers and event-goers by name, without their email unless they shared it (#597). No separate demand or "people near you want you" view.','RAZ-12 #597'],
['C5','spread','Promo kit + tracked link','MCP promo_kit','partial','Only in the AI app; no web page shows an artist or venue their kit.','RAZ-929'],
// C6 Host & venue
['C6','discover','For events / for venues','/for-events','live','Weddings, birthdays, corporate.','P801 P802 P803 P701'],
['C6','discover','Venue directory','/venues','live','','P815 P816 P817'],
['C6','evaluate','Services menu','/for-events','live','Venue, MC, DJ, show, catering, photo.','P804 P805 P806 P807 P808 P809'],
['C6','commit','Event inquiry','/for-events','live','Goes to the founder through Linear; it is an offline service.','P812 P813 P814'],
['C6','commit','Request a date at a venue','/venues','live','Bookable areas, opening-hours checks.',''],
['C6','commit','Venue owner answers a venue ask','/ask/[token]','live','Facts, plan, offer, their terms; works signed out. On a phone the answer bar sits above the tab bar (#551).','#514 #551'],
['C6','attend','We run the door','/business/events/[id]/door','partial','The event’s team checks guests in on a phone (RSVP, Going!, ticket). Asking WeDance to staff the door is still the inquiry on /for-events.','P810 P811 RAZ-928'],
['C6','return','Venue bookings & availability','/business/network/[u]/bookings','live','',''],
['C6','return','Client sees their past night','','gap','',''],
['C6','spread','Referral for hosts','','gap','',''],
// C7 Organizer
['C7','discover','For organizers','/for-organizers','live','','P707 P708 P714'],
['C7','discover','AI app (ChatGPT / Claude via MCP)','/docs/mcp','live','A second front door: the AI sets up the whole event.','#393 #446'],
['C7','evaluate','Pricing: first event free','/for-organizers','live','"Start with one event free and upgrade later."','P729 P734'],
['C7','evaluate','Network €199 / year','/for-organizers','partial','The page sells it by email ("Talk to us"), not checkout; no Pro €49 any more. Cross-event insights and an account manager aren\'t built.','P730 P731 P732 RAZ-899'],
['C7','commit','Create / claim my page','/business/new','live','Duplicate warnings, Instagram import.','#458 #452'],
['C7','commit','Create event (post · like my last · from scratch · AI)','/business/events/new','live','One question (where are you starting from?), at most four fields, always a draft; the editor then leads through venue, line-up, entry, flyer and publish (RAZ-939). Back stays on the page, and what was typed is kept in this browser until the draft exists (RAZ-1024).','P715 P709 #453 #456 RAZ-927 RAZ-939 RAZ-1024'],
['C7','attend','Flyer generator','/business/events/[id]/flyer','live','',''],
['C7','attend','Content plan → Instagram feed / story','/business','live','Dev-mode Meta app: only people with a role on the app can connect.','#501'],
['C7','attend','Ticketing','event page','partial','Passes added in the event editor sell through Stripe (#562), including festivals (#633). Still used by few events; most synced events are not ticketed here.','P705 P706 P713 P735 #562 #633'],
['C7','attend','Hosted website','/business/network/[u]/website','live','Drafts, preview, version history.','#493 #498'],
['C7','return','Insights','/organizers/insights','partial','Style and level mix of who is coming, and only for a festival the team onboarded. An organiser of weekly parties sees "No festivals on your account yet". Business Home shows today, the last 7 days and dancers for any page (#582).','P718 #582'],
['C7','return','Demand, geography, post-event signal','','missing','Workshop demand and where dancers travel from are not built. Reviews on the event page (#629) and the morning-after ask (#632) are a post-event signal, not this dashboard.','P725 P726 P727 P728 #629 #632'],
['C7','return','Contacts','/business/contacts','live','One audience: website sign-ups, imported lists, followers and event-goers (#570 #597). Filter by source, who can be emailed, activity and event (#581). Email writes to the people shown who can be emailed: preview, a test to yourself, then send (#593). Note, unsubscribe, delete, CSV.','#570 #581 #593 #597'],
['C7','spread','Team roles','/business/network/[u]/team','live','',''],
['C7','spread','Promoter links & roster · giveaways','/business','live','',''],
// C8 Member
['C8','discover','Landing','/','live','Homepage is the My plan landing: story pictures, WeDance in ChatGPT, Meet new friends (#572). The old journey page is /about.','P101 P201 P203 P204 P212 #572'],
['C8','evaluate','Open metrics','/open','live','Public numbers build trust.','#402'],
['C8','evaluate','"Every face real"','/','partial','The homepage shows example Meet faces (stock photos) and made-up story pictures, with no Sample label (#572). /about still falls back to a Sample who\'s-coming card for a July festival when there are not enough real attendees (RAZ-926).','P202 P206 RAZ-926 #572'],
['C8','commit','Sign up (password · magic link)','SignUpModal','live','',''],
['C8','commit','Onboarding: intent, city, styles','/onboarding','live','',''],
['C8','attend','My public page / handle','/u/[username]','live','One handle per person.','#474'],
['C8','attend','Settings, connected apps','/settings','live','',''],
['C8','return','Notifications of any kind','','partial','No in-app inbox or push. Email does go to dancers: review the morning after (#632), a mutual dance friend (#636), cancellation and "it\'s on again" (#569 #575 #578).','RAZ-14 RAZ-17 #632 #636 #569 #575 #578'],
['C8','return','What\'s new','/whats-new','live','',''],
['C8','spread','Invite friends','','partial','Shared plans, the weekend and year stories, and Bring friends on an event (#638). No invite that is not tied to a plan or an event.','RAZ-15 #638'],]
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
