/**
 * Service blueprint: meeting new friends (RAZ-981), from joining WeDance to
 * dancing with someone you didn't know. Lanes are who acts — you, WeDance,
 * and the other dancer, whose side of every step is the part most often
 * missing. Hand-maintained from the code (procedures named in `code`):
 * /meet (plan.discover, discover_swipes), the festival page's "Shall we
 * dance?" waves (festival_waves; the festival-page deck itself is gone),
 * meetMatches and the "said yes too" email (RAZ-985, My plan → Your dance friends).
 * Re-read against the code on 2026-11-18 (RAZ-1072). Not run end to end with
 * two test dancers yet. Shown at /docs/blueprints/meet-friends.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const MEET_BLUEPRINT_UPDATED = '2026-11-18'

export type MeetLane = 'me' | 'system' | 'other'
export type MeetPhase = 'join' | 'findable' | 'browse' | 'yes' | 'match' | 'floor' | 'after'

export const meetLanes: BpLaneDef<MeetLane>[] = [
  { key: 'me', label: 'You', hint: 'My plan, /meet, festival pages' },
  { key: 'system', label: 'WeDance', hint: 'Deck, waves, emails' },
  { key: 'other', label: 'The other dancer', hint: 'Their deck, their festival page' },
]

export const meetPhases: BpPhaseDef<MeetPhase>[] = [
  { key: 'join', label: 'Join' },
  { key: 'findable', label: 'Be findable' },
  { key: 'browse', label: 'Browse' },
  { key: 'yes', label: 'Say yes' },
  { key: 'match', label: 'Match' },
  { key: 'floor', label: 'Meet on the floor' },
  { key: 'after', label: 'After' },
]

export const meetSteps: BpStep<MeetLane, MeetPhase>[] = [
  // Join
  { id: 'signup', phase: 'join', lane: 'me', name: 'Sign up', status: 'live', marks: [], route: '/meet', code: 'auth.register · auth.requestMagicLink',
    note: 'Signed out, /meet explains the deck and offers “Join to meet dancers”. My plan links to /meet through the “Meet new friends” card (MeetFriendsEntry), with the first faces waiting.' },
  { id: 'onboard', phase: 'join', lane: 'system', name: 'Onboarding', status: 'partial', marks: [], route: '/onboarding', code: 'auth.completeOnboarding',
    note: 'Asks the intent, then city, styles and role (for “Dance socially”; “Travel to festivals” skips the city). It never asks for a photo — and without one you are in nobody’s deck.' },

  // Be findable
  { id: 'photo', phase: 'findable', lane: 'me', name: 'Photo + public profile', status: 'partial', marks: [], route: '/settings', code: 'shared/utils/meetFriends.ts meetVisibility · EventMeetPrompt', refs: ['#608'],
    note: 'Other decks show only dancers with a public profile AND a photo. /meet’s “You:” line says what is missing, and so does the “Meet who’s going” card after signing up to a night (#608). Onboarding still never asks for a photo.' },
  { id: 'city', phase: 'findable', lane: 'me', name: 'City + styles', status: 'live', marks: [], route: '/settings', refs: ['#608'],
    note: 'Only narrows which nights count as “near you” (the city page’s nights). Living here alone no longer puts anyone in a deck (#608).' },
  { id: 'go-out', phase: 'findable', lane: 'me', name: 'Sign up to a night', status: 'live', marks: [], route: '/events/[id]', code: 'rsvp.signUp · EventMeetPrompt', refs: ['#608'],
    note: 'How you get into the deck: a confirmed sign-up to a night in the next two weeks puts you in the deck of everyone going out near there, as “Going to <night>”. Right after signing up, “Meet who’s going” says so, asks for a missing photo and links to /meet. Same people “Who’s coming” already shows on the event page.' },
  { id: 'show-me', phase: 'findable', lane: 'me', name: '“Show me” for a festival', status: 'partial', marks: [], route: '/events/[id]', code: 'plan.setShareGoing · EventMeetPrompt', refs: ['#590'],
    note: 'To reach a festival’s dancers you add it to your plan and tap “Show me” on its overview (then “Hide me” to leave). That puts you in the /meet deck. It stays off until you tap it, one festival at a time. The old “Shall we dance?” deck on the page is gone.' },

  // Browse
  { id: 'deck', phase: 'browse', lane: 'system', name: 'Build the deck', status: 'live', marks: [], refs: ['#608'], code: 'plan.discover → discoverDeck (server/utils/myPlanFeeds.ts)',
    note: 'Only dancers going somewhere: signed up to a night near you in the next 14 days — the same night as you first, then the soonest — and festival-goers who chose “Show me”. Nobody is in it just for living here, and there is no fallback to strangers (#608).' },
  { id: 'swipe', phase: 'browse', lane: 'me', name: 'Yes / Skip / Later', status: 'live', marks: [], route: '/meet', code: 'plan.discoverSwipe · discoverUnswipe',
    note: 'Swipe or buttons, undo. Yes and Skip are stored and never come back; Later moves the card to the end for this visit. Explainer on top: who’s here, whether you are, how it works.' },
  { id: 'fest-deck', phase: 'browse', lane: 'me', name: 'Festival dancers', status: 'partial', marks: [], route: '/meet', code: 'plan.setShareGoing · discoverDeck · EventWhosComing wave.send',
    note: 'There is no second deck on the festival page. “Show me” puts those dancers in this /meet deck. A Yes to one still links to #discover on the festival, where that deck no longer is. A wave still exists as pairing on Who’s coming (wave.send), a separate record from a deck Yes.' },
  { id: 'empty', phase: 'browse', lane: 'system', name: 'Deck runs out', status: 'partial', marks: ['wait'], route: '/meet',
    note: 'Says “be the first”: sign up to a night and everyone who joins it meets you here, with Find a night out / pick a festival. Nobody tells you when someone new signs up.' },

  // Say yes
  { id: 'yes-private', phase: 'yes', lane: 'system', name: 'Store the Yes', status: 'live', marks: ['silent'], code: 'discover_swipes (decision yes)', refs: ['#590'],
    note: 'Private by design: the other dancer isn’t told. Two deck Yeses for the same festival become “add it to your year” on My plan.' },
  { id: 'yes-next', phase: 'yes', lane: 'me', name: '“Yes to X. Next: …”', status: 'live', marks: [], route: '/meet', refs: ['#590', '#608'],
    note: 'After a Yes, /meet names their night with a link (“join Salsa Friday Fri 21:00”, or “you’re both at … — say hi there”). A festival card still says to wave on the festival page (#discover), where the deck no longer is. A one-way Yes reaches nobody; a match says “It’s a match” and emails the other dancer.' },
  { id: 'waved', phase: 'yes', lane: 'other', name: 'Hears about a wave', status: 'partial', marks: ['silent'], code: 'wave.incomingCount · wavesForMe (no caller) · meetMatchNotify.onYes',
    note: 'A one-way wave still reaches nobody: the festival deck that showed a count is gone, and wave.wavesForMe has no page. A wave back is a match — the other dancer gets the “said yes too” email and both see it on My plan.' },
  { id: 'deck-yes-them', phase: 'yes', lane: 'other', name: 'Hears about a deck Yes', status: 'missing', marks: ['silent'],
    note: 'Never — and they can’t act on it unless they happen to swipe you too.' },

  // Match
  { id: 'mutual', phase: 'match', lane: 'system', name: 'Find mutual yeses', status: 'live', marks: [], code: 'plan.meetMatches → server/utils/meetMatches.ts', refs: ['RAZ-985'],
    note: 'Merges deck Yeses and waves both ways into one list per dancer, each with a night out both could go to in the next 14 days. Counts yeses from 2026-11-16 (when the deck started saying “we tell you both”).' },
  { id: 'match-me', phase: 'match', lane: 'me', name: 'See “you both said yes”', status: 'live', marks: [], route: '/my-plan', code: 'MeetMatches.vue', refs: ['RAZ-985'],
    note: 'My plan → “Your dance friends”: every mutual yes (deck + festival waves), newest first, “New” for a week.' },
  { id: 'match-them', phase: 'match', lane: 'other', name: 'Told about the match', status: 'live', marks: [], route: '/my-plan', code: 'meetMatchNotify.onYes → sendMeetMatchEmail', refs: ['RAZ-985'],
    note: 'The dancer who just said yes sees “It’s a match” at once. The other gets one “<name> said yes too” email (once per pair, at most one a day, off in Settings → Emails) and both see the match on My plan. The email is skipped with no photo, a private profile, or no address.' },

  // Meet on the floor
  { id: 'night', phase: 'floor', lane: 'system', name: 'Suggest a night', status: 'live', marks: [], route: '/my-plan', code: 'meetMatches MatchNight · MeetMatches.vue',
    note: 'Picks both going › they’re going › you’re going › a social in your city that suits both. “I’m going too” adds it and tells that match; “Next time” skips it and shows the next one.' },
  { id: 'contact', phase: 'floor', lane: 'me', name: 'Reach them', status: 'missing', marks: ['manual'],
    note: 'No message, no contact swap, no “see you Friday?”. Only their /u profile, if they have a handle. Agreeing on a night happens outside WeDance or not at all.' },
  { id: 'same-night', phase: 'floor', lane: 'other', name: 'Go the same night', status: 'live', marks: [], route: '/events/[id]', code: 'EventWhosComing · rsvp.people', refs: ['#608'],
    note: 'Every card in the deck is a night someone is going to, and links to it (#608). Going too is one sign-up; the event page then shows them under Who’s coming, with pairing for leaders and followers.' },
  { id: 'dance', phase: 'floor', lane: 'me', name: 'Dance together', status: 'gap', marks: [],
    note: 'Happens off the platform. The festival “My Dance List” can tick “danced”, per festival only.' },

  // After
  { id: 'remember', phase: 'after', lane: 'me', name: 'Keep the friend', status: 'missing', marks: [],
    note: 'No friends list, no “follow” between dancers outside a shared festival plan, nothing that says you met.' },
  { id: 'again', phase: 'after', lane: 'system', name: 'Bring you together again', status: 'missing', marks: ['silent'],
    note: 'Nothing tells you a friend is going to a night or festival; their plan reaches you only if they share a link.' },
]

export const meetGaps: BpGap[] = [
  { title: 'Invisible by default',
    why: 'You get into the deck by signing up to a night (#608), and the “Meet who’s going” card then asks for a photo. But onboarding still never asks for one, and festivals still need “Show me” on each festival page.',
    fix: 'Ask for a photo in onboarding (with “others see you in Meet new friends” as the reason), and turn “Show me” into the same moment as a night: on by default when you add a festival, with a Hide me.',
    steps: ['onboard', 'photo', 'go-out', 'show-me'] },
  { title: 'A one-way Yes still goes nowhere',
    why: 'A mutual yes is told: My plan and one “said yes too” email (RAZ-985). A deck Yes that isn’t returned stays private, and a one-way wave has nowhere to land now that the festival deck is gone.',
    fix: 'Tell the other dancer about a one-way Yes (one email, or put them first in their deck) so they can say yes back. Show “X waved at you” from wavesForMe, which no page calls.',
    steps: ['yes-private', 'waved', 'deck-yes-them', 'yes-next', 'fest-deck'] },
  { title: 'A festival Yes still points at a deck that left',
    why: 'The festival page no longer has its own deck. A Yes on /meet to a festival-goer still says “wave at them” and links to #discover, and a wave from Who’s coming is a different record from a deck Yes.',
    fix: 'Point that Yes at /meet or at the festival’s “Show me”, and count a deck Yes and a wave as the same yes.',
    steps: ['swipe', 'fest-deck', 'yes-next'] },
  { title: 'No way to reach them',
    why: 'Every card leads to the night its dancer is going to (#608), and a match shows one shared night with “I’m going too”. There is still no message and no “see you there” beyond that night.',
    fix: 'On a match, one “see you there” the other dancer is told about. No chat needed for that first step.',
    steps: ['contact'] },
  { title: 'Friends are forgotten',
    why: 'After the night nothing remembers that you met, so the next festival starts from an empty deck.',
    fix: 'Matches you danced with become friends: their going-to shows in your plan, and they come first on the festival pages you share.',
    steps: ['dance', 'remember', 'again'] },
]

export const meetFriendsBlueprint: Blueprint = {
  updated: MEET_BLUEPRINT_UPDATED,
  lanes: meetLanes,
  phases: meetPhases,
  steps: meetSteps,
  gaps: meetGaps,
  systemLane: 'system',
}
