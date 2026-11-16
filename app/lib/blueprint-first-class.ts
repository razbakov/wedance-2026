/**
 * Service blueprint: a first dance class (job J1), from being curious to
 * coming back for a second one. Lanes are who acts — the newcomer, WeDance,
 * and the school or teacher running the class, who hears about the newcomer
 * far less often than the newcomer thinks. Hand-maintained from the code
 * (procedures named in `code`): /find-your-dance, /cities?taster=1 →
 * /cities/[city] "Your first class" (shared/utils/taster.ts), /events/[id]
 * EventSignup → rsvp.signUp (RAZ-995), auth.requestMagicLink, recordSignupContact
 * (server/utils/rsvpContact.ts), contactMailing (RAZ-975), My plan courses.
 * Not run end to end yet. Shown at /docs/blueprints/first-class.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const FIRST_CLASS_BLUEPRINT_UPDATED = '2026-11-16'

export type FirstClassLane = 'newcomer' | 'system' | 'school'
export type FirstClassPhase = 'curious' | 'style' | 'find' | 'signup' | 'before' | 'back'

export const firstClassLanes: BpLaneDef<FirstClassLane>[] = [
  { key: 'newcomer', label: 'Newcomer', hint: '/find-your-dance, city page, event page' },
  { key: 'system', label: 'WeDance', hint: 'Taster list, sign-up, emails' },
  { key: 'school', label: 'School / teacher', hint: 'Business → event, Contacts' },
]

export const firstClassPhases: BpPhaseDef<FirstClassPhase>[] = [
  { key: 'curious', label: 'Curious' },
  { key: 'style', label: 'Pick a style' },
  { key: 'find', label: 'Find a first class' },
  { key: 'signup', label: 'Sign up' },
  { key: 'before', label: 'Go to the class' },
  { key: 'back', label: 'Come back' },
]

export const firstClassSteps: BpStep<FirstClassLane, FirstClassPhase>[] = [
  // Curious
  { id: 'arrive', phase: 'curious', lane: 'newcomer', name: 'Land on WeDance', status: 'partial', marks: [], route: '/',
    note: 'The homepage is the My plan landing (ChatGPT, Meet new friends, My plan); it says nothing to someone who has never danced. “Find your dance” is a header / Explore link, and the /about page still has the beginner CTA. City pages from search are the other way in.' },
  { id: 'onboard', phase: 'curious', lane: 'system', name: 'Onboarding: “Learn a dance”', status: 'partial', marks: [], route: '/onboarding', code: 'auth.completeOnboarding',
    note: 'Only after signing up, which a newcomer rarely does first. “Learn a dance” collects nothing — no city, no style — and sends you to /find-your-dance, where you pick a city again.' },

  // Pick a style
  { id: 'videos', phase: 'style', lane: 'newcomer', name: 'Watch the three styles', status: 'live', marks: [], route: '/find-your-dance', code: 'find_your_dance_started',
    note: 'Salsa, bachata, kizomba: a one-line blurb and a YouTube video each. No quiz (the “dance-match quiz” is still only a landing promise), nothing on what a class is like.' },
  { id: 'choose', phase: 'style', lane: 'newcomer', name: 'Choose a style, or “just try”', status: 'live', marks: [], route: '/cities?style=Salsa · /cities?taster=1', code: 'find_your_dance_completed',
    note: '“Choose Salsa” → pick your city → the city page filtered to salsa: parties and classes together, no taster list. Only “try a free taster class” (?taster=1) opens “Your first class”. Neither choice is saved: signed in, your styles and city stay as they were.' },

  // Find a first class
  { id: 'taster-list', phase: 'find', lane: 'system', name: '“Your first class” list', status: 'partial', marks: [], route: '/cities/[city]?taster=1', code: 'shared/utils/taster.ts isTasterCandidate · isFreePrice',
    note: 'Up to 8 upcoming classes, workshops and practicas, one per course, “Free” first. But “Free” means “no price listed” (isFreePrice(\'\') is true), so most synced classes get a Free badge that the school never gave. No level, so an improver class shows next to a beginner one.' },
  { id: 'week', phase: 'find', lane: 'newcomer', name: 'Browse the city’s week', status: 'partial', marks: [], route: '/cities/[city]', code: 'WeeklyCalendar',
    note: 'The real week (synced from wedance.vip): classes are a chip among parties, workshops and practicas. No beginner filter, no “first time? start here” on a class card.' },
  { id: 'class-page', phase: 'find', lane: 'newcomer', name: 'Open the class', status: 'partial', marks: [], route: '/events/[id]',
    note: 'Date, time, venue and map, line-up, price if any. Nothing on level, what to wear, whether a partner is needed, or how a first class goes — the taster list’s “no partner, just ask at the door” line isn’t here.' },
  { id: 'school-lists', phase: 'find', lane: 'school', name: 'Class is on WeDance', status: 'partial', marks: ['silent'], route: '/business/events/new', code: 'businessEvents.create · sync:v3-events',
    note: 'Most classes are mirrored from wedance.vip onto unclaimed organiser pages: nobody at the school runs them here. A school that creates its own class can’t mark it “beginners welcome” or “first class free”.' },

  // Sign up
  { id: 'book', phase: 'signup', lane: 'newcomer', name: '“Book my spot”', status: 'live', marks: [], route: '/events/[id]', code: 'EventSignup · rsvp.signUp', refs: ['RAZ-995', 'RAZ-1003'],
    note: 'One button opens the steps in place: how you come (alone / with a partner), pass and pay now / at the door when priced, then contact. For a class the phone is required (signupNeedsPhone): “for changes and its WhatsApp group”.' },
  { id: 'magic', phase: 'signup', lane: 'system', name: 'Magic link confirms the spot', status: 'partial', marks: ['wait', 'silent'], code: 'auth.requestMagicLink (do + guest) · rsvp.answer',
    note: 'Signed out, the sign-up is saved unconfirmed against the browser and an email goes out titled “Sign in to WeDance” — no class name, no time, no address — and the link expires in 15 minutes. Until it is clicked, the spot isn’t on an account and the school doesn’t see the person.' },
  { id: 'contact', phase: 'signup', lane: 'system', name: 'Give the school the contact', status: 'partial', marks: ['silent'], code: 'recordSignupContact (server/utils/rsvpContact.ts)',
    note: 'On a confirmed sign-up the host page (else the organiser page) gets name, email and phone as a Contact, source “signup”, not mailable unless “Also tell me about next events” was ticked. It goes to that page even when nobody manages it — the case for most synced classes.' },
  { id: 'school-hears', phase: 'signup', lane: 'school', name: 'Hears about the sign-up', status: 'missing', marks: ['silent', 'wait'], route: '/business/events/[id]', code: 'rsvp.people · BusinessWhosComing',
    note: 'No email, no notification. The school sees a new face only by opening the event’s “Who’s coming” — which lists confirmed accounts only, so an unconfirmed guest isn’t there at all.' },
  { id: 'enroll', phase: 'signup', lane: 'newcomer', name: 'Enrol from My plan', status: 'partial', marks: ['silent'], route: '/my-plan', code: 'plan.add (itemType event, type class) · plan.myCourses',
    note: 'My plan’s enrol picker only adds the class to your plan: no sign-up, no contact, no phone. The school never knows you plan to come.' },

  // Go to the class
  { id: 'confirm', phase: 'before', lane: 'newcomer', name: '“You’re in”', status: 'partial', marks: [], route: '/events/[id]', code: 'EventSignup · EventMeetPrompt',
    note: 'On screen only: “<page> has your name, email and phone for this event”, Cancel my spot, and a “Meet who’s going” card. No confirmation email with the time and address, no calendar file.' },
  { id: 'reminder', phase: 'before', lane: 'system', name: 'Remind before the class', status: 'missing', marks: ['silent'],
    note: 'Nothing runs on a schedule (no cron in vercel.json): no reminder the day before, no “what to bring”, no directions. Only a cancellation reaches you (sendEventCancelledEmail).' },
  { id: 'whatsapp', phase: 'before', lane: 'school', name: 'Add to the class group', status: 'gap', marks: ['manual'], route: '/business/network/[handle]/contacts',
    note: 'The phone was asked for “its WhatsApp group”, but the school has to open Contacts, find the person and add them by hand — and only if they look.' },
  { id: 'door', phase: 'before', lane: 'school', name: 'Welcome at the door', status: 'partial', marks: [], code: 'attendance.checkIn',
    note: 'Door check-in exists for the organiser. Nothing marks someone as a first-timer, so the teacher can’t spot the newcomer who needs a hand.' },
  { id: 'attend', phase: 'before', lane: 'newcomer', name: 'Dance the first class', status: 'gap', marks: [],
    note: 'Happens off the platform. Pay at the door if that was the choice.' },

  // Come back
  { id: 'follow-up', phase: 'back', lane: 'system', name: 'Ask “how was it?”', status: 'missing', marks: ['silent'],
    note: 'No email or prompt after the first class — the moment a newcomer becomes a regular or drops out. Reviews exist on pages, but nothing asks for one.' },
  { id: 'next-class', phase: 'back', lane: 'newcomer', name: 'Book the next one', status: 'partial', marks: ['manual'], route: '/my-plan', code: 'plan.myCourses',
    note: 'A weekly class is a sign-up per date: next week means finding the class again and booking again. My plan shows the course with its next class once it is on the plan.' },
  { id: 'school-invite', phase: 'back', lane: 'school', name: 'Invite them back', status: 'partial', marks: ['wait'], route: '/business/network/[handle]/contacts', code: 'contactMailing.send', refs: ['RAZ-975'],
    note: 'The school can email contacts (with an event card), but a sign-up contact is mailable only if they ticked “Also tell me about next events”, which starts unticked. Everyone else needs WhatsApp, by hand.' },
  { id: 'goals', phase: 'back', lane: 'newcomer', name: 'Goals and progress', status: 'partial', marks: [], route: '/my-plan', code: 'useGoals',
    note: 'A goals block on My plan; nothing records that you took a first class or nudges you to a second.' },
]

export const firstClassGaps: BpGap[] = [
  { title: 'The school never hears',
    why: 'A sign-up becomes a row in Contacts and a face in “Who’s coming”, but no one is told. Most classes sit on synced pages nobody manages, so the contact lands nowhere; and a guest who doesn’t click the email isn’t listed at all.',
    fix: 'Email the page’s team on each sign-up (“Anna is coming to Salsa Beginners on Thu, first time”), and when the page has no team, send the sign-up to the class’s source (the v3 organiser) or say on the event page that the school isn’t on WeDance yet.',
    steps: ['school-lists', 'contact', 'school-hears', 'enroll'] },
  { title: 'Nothing arrives before the class',
    why: 'The only email is “Sign in to WeDance” with a 15-minute link. No confirmation with time and address, no reminder, nothing on what to wear — the exact things a first-timer worries about.',
    fix: 'Make the magic-link email the booking confirmation (class, time, address, map, “Confirm my spot”, a longer-lived link), send a reminder the day before with a short “your first class” guide, and attach an .ics.',
    steps: ['magic', 'confirm', 'reminder'] },
  { title: '“Free” and “beginner” are guesses',
    why: 'The taster list badges any class without a price as Free and has no level, so a newcomer can walk into a paid improvers’ class expecting a free first lesson.',
    fix: 'Show “Free” only for a price the school set to 0; let schools mark a class “beginners welcome” and “first class free”, and list those first in “Your first class” and on the city page.',
    steps: ['taster-list', 'week', 'school-lists'] },
  { title: 'The newcomer’s first steps are thrown away',
    why: 'Picking a style on /find-your-dance and “Learn a dance” in onboarding save nothing, the style choice skips the taster list, and the class page lacks the “no partner needed” reassurance.',
    fix: 'Save the chosen style and city (to the account, or the browser until sign-up), send every style choice to that city’s “Your first class”, and show a “first time?” box on class pages.',
    steps: ['arrive', 'onboard', 'choose', 'class-page'] },
  { title: 'No second class',
    why: 'After the first class nobody asks how it went, a weekly class must be booked again date by date, and the school can only email people who ticked an unticked box.',
    fix: 'The day after, email “How was it?” with “Book next week” (one tap, same details) and “Keep me posted about this course”; let the sign-up cover the course, not one date.',
    steps: ['follow-up', 'next-class', 'school-invite', 'whatsapp'] },
]

export const firstClassBlueprint: Blueprint = {
  updated: FIRST_CLASS_BLUEPRINT_UPDATED,
  lanes: firstClassLanes,
  phases: firstClassPhases,
  steps: firstClassSteps,
  gaps: firstClassGaps,
  systemLane: 'system',
}
