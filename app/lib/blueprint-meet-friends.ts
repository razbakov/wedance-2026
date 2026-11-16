/**
 * Service blueprint: meeting new friends (RAZ-981), from joining WeDance to
 * dancing with someone you didn't know. Lanes are who acts — you, WeDance,
 * and the other dancer, whose side of every step is the part most often
 * missing. Hand-maintained from the code (procedures named in `code`):
 * /meet (plan.discover, discover_swipes), the festival page's "Shall we
 * dance?" (wave.*, festival_waves), meetMatches (RAZ-985, only on a sketch).
 * Not run end to end with two test dancers yet. Shown at
 * /docs/blueprints/meet-friends.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const MEET_BLUEPRINT_UPDATED = '2026-11-16'

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
  { id: 'photo', phase: 'findable', lane: 'me', name: 'Photo + public profile', status: 'partial', marks: ['silent'], route: '/settings', code: 'shared/utils/meetFriends.ts meetVisibility',
    note: 'Other decks show only dancers with a public profile AND a photo. /meet’s “You:” line says what is missing with a link to Settings, but only once you open /meet — nothing tells a new dancer earlier, and nothing says when others could have seen you.' },
  { id: 'city', phase: 'findable', lane: 'me', name: 'City + styles', status: 'live', marks: [], route: '/settings',
    note: 'Locals are matched on the city text; shared styles sort them first. No city = you never appear as a local.' },
  { id: 'show-me', phase: 'findable', lane: 'me', name: '“Show me” for a festival', status: 'partial', marks: [], route: '/events/[id]', code: 'plan_items.share_going · DiscoverDancers', refs: ['#590'],
    note: 'To reach a festival’s dancers you add it to your plan and tap “Show me” in “Shall we dance?” on its page (the same switch as “Who’s going”). It lives on each festival page, one by one; /meet only tells you it exists.' },

  // Browse
  { id: 'deck', phase: 'browse', lane: 'system', name: 'Build the deck', status: 'live', marks: [], refs: ['#608'], code: 'plan.discover → discoverDeck (server/utils/myPlanFeeds.ts)',
    note: 'Festival-goers who chose “Show me” (your festivals, then ones you haven’t picked), then locals in your city under any of its names (Munich = München), most shared styles first. No city or nobody left → no locals, and /meet says why (#608). Locals don’t opt in: a public profile with a photo is enough.' },
  { id: 'swipe', phase: 'browse', lane: 'me', name: 'Yes / Skip / Later', status: 'live', marks: [], route: '/meet', code: 'plan.discoverSwipe · discoverUnswipe',
    note: 'Swipe or buttons, undo. Yes and Skip are stored and never come back; Later moves the card to the end for this visit. Explainer on top: who’s here, whether you are, how it works.' },
  { id: 'fest-deck', phase: 'browse', lane: 'me', name: 'Festival “Shall we dance?”', status: 'live', marks: [], route: '/events/[id]', code: 'wave.discoverPool · wave.send',
    note: 'A second deck per festival on its page: only that festival’s “Show me” dancers, people who waved at you first. A Yes here is a wave (festival_waves), not a deck Yes — the two don’t know about each other.' },
  { id: 'empty', phase: 'browse', lane: 'system', name: 'Deck runs out', status: 'partial', marks: ['wait'], route: '/meet',
    note: '“That’s it for this pass” with links to go dancing or add a festival. Nobody tells you when new dancers join.' },

  // Say yes
  { id: 'yes-private', phase: 'yes', lane: 'system', name: 'Store the Yes', status: 'live', marks: ['silent'], code: 'discover_swipes (decision yes)', refs: ['#590'],
    note: 'Private by design: the other dancer isn’t told. Two deck Yeses for the same festival become “add it to your year” on My plan.' },
  { id: 'yes-next', phase: 'yes', lane: 'me', name: '“Yes to X. Next: …”', status: 'partial', marks: ['manual'], route: '/meet', refs: ['#590'],
    note: 'After a Yes, /meet points to the festival page (wave there) or to a night out this week. It is generic — not a night they are going to — and you have to carry the Yes over to the festival page yourself.' },
  { id: 'waved', phase: 'yes', lane: 'other', name: 'Hears about a wave', status: 'partial', marks: ['silent'], code: 'wave.incomingCount · wavesForMe (no caller)',
    note: 'Only on that festival’s page: a count of people who waved and those people first in its deck. No email, no My plan item; wave.wavesForMe exists but no page calls it.' },
  { id: 'deck-yes-them', phase: 'yes', lane: 'other', name: 'Hears about a deck Yes', status: 'missing', marks: ['silent'],
    note: 'Never — and they can’t act on it unless they happen to swipe you too.' },

  // Match
  { id: 'mutual', phase: 'match', lane: 'system', name: 'Find mutual yeses', status: 'partial', marks: [], code: 'plan.meetMatches → server/utils/meetMatches.ts', refs: ['RAZ-985'],
    note: 'Merges deck Yeses and waves both ways into one list per dancer, each with a night out both could go to in the next 14 days. Built and tested, but only /sketches/meet-matches calls it.' },
  { id: 'match-me', phase: 'match', lane: 'me', name: 'See “you both said yes”', status: 'missing', marks: ['silent'], refs: ['RAZ-985'],
    note: 'Not on /meet or My plan. The one place a match shows today is a festival page’s “My Dance List” (mutual waves for that festival).' },
  { id: 'match-them', phase: 'match', lane: 'other', name: 'Told about the match', status: 'missing', marks: ['silent'], refs: ['RAZ-985'],
    note: 'No email or notification to either side when a Yes becomes mutual.' },

  // Meet on the floor
  { id: 'night', phase: 'floor', lane: 'system', name: 'Suggest a night', status: 'partial', marks: [], code: 'meetMatches MatchNight',
    note: 'Picks both going › they’re going › you’re going › a social in your city that suits both. Computed, not shown (see Match).' },
  { id: 'contact', phase: 'floor', lane: 'me', name: 'Reach them', status: 'missing', marks: ['manual'],
    note: 'No message, no contact swap, no “see you Friday?”. Only their /u profile, if they have a handle. Agreeing on a night happens outside WeDance or not at all.' },
  { id: 'same-night', phase: 'floor', lane: 'other', name: 'Go the same night', status: 'partial', marks: ['wait'], route: '/events/[id]', code: 'EventWhosComing · rsvp.people',
    note: 'An event page shows who’s coming to signed-in dancers, with pairing waves. Whether you both end up there is luck.' },
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
    why: 'You enter other decks only with a photo and a public profile, onboarding never asks for a photo, and you learn this only on /meet. New dancers are in nobody’s deck without knowing it.',
    fix: 'Ask for a photo in onboarding (with “others see you in Meet new friends” as the reason), and show the “You:” state on the My plan entry card.',
    steps: ['onboard', 'photo', 'show-me'] },
  { title: 'A Yes goes nowhere',
    why: 'A deck Yes is private and a wave is seen only on one festival page. Neither side is told, so the person you said yes to never gets the chance to say yes back.',
    fix: 'Ship RAZ-985: show “You both said yes” on /meet and My plan, and email both people once when a Yes becomes mutual. Show “X waved at you” outside the festival page (wavesForMe is already there).',
    steps: ['yes-private', 'waved', 'deck-yes-them', 'mutual', 'match-me', 'match-them'] },
  { title: 'Two decks that don’t talk',
    why: 'A Yes on /meet and a wave on a festival page are separate records. A Yes to a festival-goer on /meet doesn’t wave at them, so you are told to go and do it again on the festival page.',
    fix: 'A Yes on a festival card also sends the wave for that festival; the festival deck reads deck Yeses too.',
    steps: ['swipe', 'fest-deck', 'yes-next'] },
  { title: 'No way to set a night',
    why: 'Even a match ends with nothing to do together: no message, no “I’m going Friday, you?”. The suggested night is computed but never shown, and meeting relies on luck.',
    fix: 'On a match, show the shared night with one “I’m going” for each side, and tell the other when one says it. No chat needed for the first step.',
    steps: ['night', 'contact', 'same-night'] },
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
