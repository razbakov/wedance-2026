/**
 * Service blueprint: meeting new friends (RAZ-981), from joining WeDance to
 * dancing with someone you didn't know. Lanes are who acts — you, WeDance,
 * and the other dancer, whose side of every step is the part most often
 * missing. Hand-maintained from the code (procedures named in `code`):
 * /meet (plan.discover, discover_swipes), the festival page's "Shall we
 * dance?" (wave.*, festival_waves), meetMatches (RAZ-985, My plan → Your dance friends),
 * and the in-app match card, toast and bell (RAZ-1071). Shown at
 * /docs/blueprints/meet-friends.
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
  { id: 'show-me', phase: 'findable', lane: 'me', name: '“Show me” for a festival', status: 'partial', marks: [], route: '/events/[id]', code: 'plan_items.share_going · DiscoverDancers', refs: ['#590'],
    note: 'To reach a festival’s dancers you add it to your plan and tap “Show me” in “Shall we dance?” on its page (the same switch as “Who’s going”). It lives on each festival page, one by one; /meet only tells you it exists.' },

  // Browse
  { id: 'deck', phase: 'browse', lane: 'system', name: 'Build the deck', status: 'live', marks: [], refs: ['#608'], code: 'plan.discover → discoverDeck (server/utils/myPlanFeeds.ts)',
    note: 'Only dancers going somewhere: signed up to a night near you in the next 14 days — the same night as you first, then the soonest — and festival-goers who chose “Show me”. Nobody is in it just for living here, and there is no fallback to strangers (#608).' },
  { id: 'swipe', phase: 'browse', lane: 'me', name: 'Yes / Skip / Later', status: 'live', marks: [], route: '/meet', code: 'plan.discoverSwipe · discoverUnswipe',
    note: 'Swipe or buttons, undo. Yes and Skip are stored and never come back; Later moves the card to the end for this visit. Explainer on top: who’s here, whether you are, how it works.' },
  { id: 'fest-deck', phase: 'browse', lane: 'me', name: 'Festival “Shall we dance?”', status: 'live', marks: [], route: '/events/[id]', code: 'wave.discoverPool · wave.send',
    note: 'A second deck per festival on its page: only that festival’s “Show me” dancers, people who waved at you first. A Yes here is a wave (festival_waves), not a deck Yes — the two don’t know about each other.' },
  { id: 'empty', phase: 'browse', lane: 'system', name: 'Deck runs out', status: 'partial', marks: ['wait'], route: '/meet',
    note: 'Says “be the first”: sign up to a night and everyone who joins it meets you here, with Find a night out / pick a festival. Nobody tells you when someone new signs up.' },

  // Say yes
  { id: 'yes-private', phase: 'yes', lane: 'system', name: 'Store the Yes', status: 'live', marks: ['silent'], code: 'discover_swipes (decision yes)', refs: ['#590'],
    note: 'Private by design: the other dancer isn’t told. Two deck Yeses for the same festival become “add it to your year” on My plan.' },
  { id: 'yes-next', phase: 'yes', lane: 'me', name: '“Yes to X. Next: …”', status: 'live', marks: [], route: '/meet', refs: ['#590', '#608'],
    note: 'After a Yes, /meet names their night with a link (“join Salsa Friday Fri 21:00”, or “you’re both at … — say hi there”), or the festival page to wave. The Yes itself still reaches nobody.' },
  { id: 'waved', phase: 'yes', lane: 'other', name: 'Hears about a wave', status: 'partial', marks: ['silent'], code: 'wave.incomingCount · wavesForMe (no caller)',
    note: 'Only on that festival’s page: a count of people who waved and those people first in its deck. No email, no My plan item; wave.wavesForMe exists but no page calls it.' },
  { id: 'deck-yes-them', phase: 'yes', lane: 'other', name: 'Hears about a deck Yes', status: 'missing', marks: ['silent'],
    note: 'Never — and they can’t act on it unless they happen to swipe you too.' },

  // Match
  { id: 'mutual', phase: 'match', lane: 'system', name: 'Find mutual yeses', status: 'live', marks: [], code: 'plan.meetMatches → server/utils/meetMatches.ts', refs: ['RAZ-985'],
    note: 'Merges deck Yeses and waves both ways into one list per dancer, each with a night out both could go to in the next 14 days. Counts yeses from 2026-11-16 (when the deck started saying “we tell you both”).' },
  { id: 'match-me', phase: 'match', lane: 'me', name: 'See “you both said yes”', status: 'live', marks: [], route: '/meet', code: 'MatchNoticeCard.vue · plan.notices', refs: ['RAZ-985', 'RAZ-1071'],
    note: 'On /meet the match is a card: their photo, name, city, role and dances, then the night (picture, title, date and time, venue, how many are going). Before they book, the action is Book the night. After they book, the card stays and the action is See when and where you’ll meet. The deck can move on underneath. My plan still lists them under “Your dance friends”, and My plan’s own icon has no count.' },
  { id: 'match-them', phase: 'match', lane: 'other', name: 'Told about the match', status: 'live', marks: [], route: '/meet', code: 'NoticeCenter.vue · plan.notices', refs: ['RAZ-1071'],
    note: 'The other dancer hears it the next time they open WeDance: the same card on /meet, one small toast at the bottom right (once per match on that browser), and a row under the header bell. The bell badge is the only count, and it clears once they open the meetup. The card and the bell row stay, including after they book. No email and no push.' },

  // Meet on the floor
  { id: 'night', phase: 'floor', lane: 'system', name: 'Suggest a night', status: 'live', marks: [], route: '/my-plan', code: 'meetMatches MatchNight · MeetMatches.vue',
    note: 'Picks both going › they’re going › you’re going › a social in your city that suits both. “I’m going too” adds it and tells that match; “Next time” skips it and shows the next one.' },
  { id: 'contact', phase: 'floor', lane: 'me', name: 'Reach them', status: 'missing', marks: ['manual'],
    note: 'No message, no contact swap, no “see you Friday?”. Only their /u profile, if they have a handle. Agreeing on a night happens outside WeDance or not at all.' },
  { id: 'same-night', phase: 'floor', lane: 'other', name: 'Go the same night', status: 'live', marks: [], route: '/events/[id]', code: 'EventWhosComing · rsvp.people', refs: ['#608'],
    note: 'Every card in the deck is a night someone is going to, and links to it (#608). Going too is one sign-up; the event page then shows them under Who’s coming, with pairing for leaders and followers.' },
  { id: 'dance', phase: 'floor', lane: 'me', name: 'Dance together', status: 'live', marks: [], route: '/meet/ritual', code: 'ritual.vue · nightCopy', refs: ['RAZ-1071'],
    note: 'Where you’ll meet explains the clock (the night’s start, then 23:15 once the floor is going, near the DJ booth), shows the event’s picture and how many are going, and three first-person ticks (I can leave, I’m in a public spot, I’m 18+). The next step is a sentence, not a button: open the screen and turn the phone. The screen is the shared color, shape and number, with no name. Couldn’t meet, including Report someone, is on that screen. The morning-after email is not a link in the app.' },

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
  { title: 'A Yes goes nowhere',
    why: 'A deck Yes is private and a wave is seen only on one festival page. Neither side is told, so the person you said yes to never gets the chance to say yes back.',
    fix: 'Ship RAZ-985: show “You both said yes” on /meet and My plan, and email both people once when a Yes becomes mutual. Show “X waved at you” outside the festival page (wavesForMe is already there).',
    steps: ['yes-private', 'waved', 'deck-yes-them', 'mutual', 'match-me', 'match-them'] },
  { title: 'Two decks that don’t talk',
    why: 'A Yes on /meet and a wave on a festival page are separate records. A Yes to a festival-goer on /meet doesn’t wave at them, so you are told to go and do it again on the festival page.',
    fix: 'A Yes on a festival card also sends the wave for that festival; the festival deck reads deck Yeses too.',
    steps: ['swipe', 'fest-deck', 'yes-next'] },
  { title: 'No way to set a night',
    why: 'Every card now leads to the night its dancer is going to (#608), so meeting no longer relies on luck. But a match still has no message and no “see you there”, and the night computed for a match is never shown.',
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
