/**
 * Service blueprint: getting better and keeping momentum (job J2), from
 * setting a goal to moving up a level. Lanes are who acts — the student,
 * WeDance, and the teacher or school, who mostly learns about the student
 * from a sign-up list. Hand-maintained from the code (procedures named in
 * `code`): My plan's Goals and Courses (useGoals, plan.myCourses),
 * /artists and /@handle (follow.*, review.*), /@handle/book and MCP
 * request_private_class (inquiries.*), course series
 * (businessEvents.createSeries, MCP recurring_series), sign-ups (rsvp.signUp)
 * and the school's Contacts. Re-read against the code on 2026-11-25
 * (RAZ-1089: a yes on a private-class request emails the student). Not run end to end with a test student and school yet.
 * Shown at /docs/blueprints/keep-progressing.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const KEEP_PROGRESSING_BLUEPRINT_UPDATED = '2026-11-25'

export type KeepLane = 'student' | 'system' | 'school'
export type KeepPhase = 'goal' | 'find' | 'enroll' | 'weekly' | 'practise' | 'private' | 'progress' | 'next'

export const keepLanes: BpLaneDef<KeepLane>[] = [
  { key: 'student', label: 'Student', hint: 'My plan, /artists, /@handle, event pages' },
  { key: 'system', label: 'WeDance', hint: 'Plan feeds, sign-ups, emails' },
  { key: 'school', label: 'Teacher / school', hint: 'Business: events, Contacts, Bookings' },
]

export const keepPhases: BpPhaseDef<KeepPhase>[] = [
  { key: 'goal', label: 'Set a goal' },
  { key: 'find', label: 'Find a teacher' },
  { key: 'enroll', label: 'Enroll in a course' },
  { key: 'weekly', label: 'Weekly classes' },
  { key: 'practise', label: 'Practise at socials' },
  { key: 'private', label: 'Private class / workshop' },
  { key: 'progress', label: 'See progress' },
  { key: 'next', label: 'Next level' },
]

export const keepSteps: BpStep<KeepLane, KeepPhase>[] = [
  // Set a goal
  { id: 'set-goal', phase: 'goal', lane: 'student', name: 'Add a goal', status: 'partial', marks: [], route: '/my-plan', code: 'useGoals.addGoal → plan.add (itemType goal, dual-write dancer_goals)',
    note: 'My plan → Goals: a title, a why and one optional style (goal_added). You have to find it yourself: onboarding never asks what you want to get better at, and nothing suggests a goal.' },
  { id: 'goal-link', phase: 'goal', lane: 'system', name: 'Tie the goal to plans', status: 'partial', marks: [], route: '/my-plan', code: 'my-plan.vue goalsForStyle (relatedDanceStyles)',
    note: 'The only use of a goal: a course or festival in your plan with the same style gets “Serves your goal: …”. A goal never suggests a teacher, a course or a social.' },
  { id: 'school-goal', phase: 'goal', lane: 'school', name: 'Knows what the student wants', status: 'missing', marks: ['silent'],
    note: 'Goals stay private on My plan. A school sees a self-declared level per style only in aggregate (the “style & level mix” insight), never what one of its students is working towards.' },

  // Find a teacher
  { id: 'artists', phase: 'find', lane: 'student', name: 'Browse /artists', status: 'live', marks: [], route: '/artists', code: 'entity.listArtists', refs: ['P219', 'P221', 'P222'],
    note: 'Search by name, filter by city and style. Teachers sit next to DJs and performers: no “teaches” filter, no level, nothing that says who runs a weekly class near you.' },
  { id: 'teacher-page', phase: 'find', lane: 'student', name: 'Teacher page', status: 'live', marks: [], route: '/@handle', code: 'entity.getByHandle · EventSchedule', refs: ['P501'],
    note: 'Bio, styles, languages, socials and the schedule of their classes and events, then reviews. “Book <name>” and Follow sit under the photo.' },
  { id: 'reviews', phase: 'find', lane: 'student', name: 'Read / write reviews', status: 'partial', marks: [], route: '/@handle', code: 'ReviewsSection · review.create (MCP write_review)',
    note: '1–5 stars with text. Anyone signed in can review anyone: nothing checks they ever took a class with the teacher, so a review says little about teaching.' },
  { id: 'follow', phase: 'find', lane: 'student', name: 'Follow the teacher', status: 'partial', marks: ['silent'], route: '/@handle', code: 'follow.toggle', refs: ['P220'],
    note: 'On artist and promoter pages only (not venues or schools that are venues). Nothing comes of it: no feed, email or My plan item when they announce a new course or workshop.' },
  { id: 'school-listed', phase: 'find', lane: 'school', name: 'Classes are listed', status: 'live', marks: [], route: '/@handle', code: 'v3EventSync · businessEvents.create',
    note: 'Classes synced from wedance.vip or created in Business show on the page, the city page and the enroll picker. New followers show on Business → Home (last 7 days) — the page hears about the follower, not the other way round.' },

  // Enroll in a course
  { id: 'picker', phase: 'enroll', lane: 'student', name: 'Add a course on My plan', status: 'partial', marks: [], route: '/my-plan#courses', code: 'events.byCity → plan.add (metadata type class)',
    note: 'Courses → “Upcoming classes in <city>”: every dated class in your city, one row per date, read as “All levels” unless the event says otherwise (week_plan_add, source enroll_picker). No filter by style, level, teacher or your goal.' },
  { id: 'series', phase: 'enroll', lane: 'school', name: 'Publish a course', status: 'live', marks: [], route: '/business/events/new', code: 'businessEvents.createSeries · copy (MCP recurring_series)',
    note: 'Every week / 2 weeks / month until a date or count, holidays skipped; each date is its own event in one series. A series has no level, no “course of 8 classes” and no price for the whole course.' },
  { id: 'my-courses', phase: 'enroll', lane: 'system', name: 'Show the course', status: 'partial', marks: [], route: '/my-plan#courses', code: 'plan.myCourses (server/utils/myPlanFeeds.ts)',
    note: 'One card per series with its next class, venue and price. The card leaves teacher and level empty, even when the event’s line-up names the teacher.' },
  { id: 'signup', phase: 'enroll', lane: 'student', name: 'Book my spot', status: 'partial', marks: ['manual'], route: '/events/[id]', code: 'EventSignup → rsvp.signUp',
    note: 'How you come, pass, pay now or at the door, phone. The steps exist. It books ONE date: the course card checks only the next class, so next week you book again, by hand, every week.' },
  { id: 'school-contact', phase: 'enroll', lane: 'school', name: 'Student lands in Contacts', status: 'live', marks: [], route: '/business/network/[username]/contacts', code: 'recordSignupContact · rsvp.people',
    note: 'Name, email and phone for that event (source signup), not mailable unless they ticked “Also tell me about next events”. Who’s coming on the event shows them with leader / follower.' },

  // Weekly classes
  { id: 'reminder', phase: 'weekly', lane: 'system', name: 'Remind before class', status: 'missing', marks: ['silent'],
    note: 'No email, push or Telegram before a class. The daily jobs send the morning-after review and the meetup follow-up. “Said yes too” goes out when a Meet yes becomes mutual, not as a class reminder.' },
  { id: 'go-class', phase: 'weekly', lane: 'student', name: 'Go to class', status: 'partial', marks: [], route: '/business/events/[id]/door', code: 'attendance.checkIn',
    note: 'The organiser can record that you were there on the door list (RAZ-928). Your goal still doesn’t count those classes.' },
  { id: 'school-attend', phase: 'weekly', lane: 'school', name: 'Track who comes and pays', status: 'partial', marks: ['manual'], route: '/business/network/[username]/contacts', code: 'contactActivity (wentTo, checkedIn)',
    note: 'The door list records who came, and Contacts counts those check-ins for people with an account. Monthly payment isn’t tracked on the course card. Payments stay on paper or WhatsApp.' },
  { id: 'course-ends', phase: 'weekly', lane: 'system', name: 'Course runs out', status: 'partial', marks: ['silent'], code: 'myCourses (series with nothing upcoming is left out)',
    note: 'When the last date passes, the card just disappears from My plan. Neither side is told the course ended.' },

  // Practise at socials
  { id: 'socials', phase: 'practise', lane: 'student', name: 'Find a social this week', status: 'live', marks: [], route: '/cities/[city]', code: 'events.byCity · plan.weekSocials',
    note: 'The city page’s this-week calendar and My plan’s “This week” (what you put in with + My plan).' },
  { id: 'socials-link', phase: 'practise', lane: 'system', name: 'Link class and social', status: 'missing', marks: [],
    note: 'Nothing points from a course to where you can dance what you learned: not the school’s own party, not a social in the same style this week. Only the goal’s “Serves” tag on things you already added.' },
  { id: 'school-social', phase: 'practise', lane: 'school', name: 'Invite students out', status: 'partial', marks: ['manual'], route: '/business/network/[username]/contacts', code: 'contactMailing.send (event card)',
    note: 'Contacts → Email N with an “I’m coming” card works, but only for contacts the page may email — most class sign-ups aren’t. So the invite goes out in the class WhatsApp group instead.' },

  // Private class / workshop
  { id: 'book', phase: 'private', lane: 'student', name: 'Ask for a private class', status: 'live', marks: [], route: '/@handle/book', code: 'BookingInquiryForm → inquiries.send (MCP request_private_class)',
    note: '“Book <name>” → “Workshop or class”, date, message. Works signed out; also from ChatGPT or Claude with the account email.' },
  { id: 'inbox', phase: 'private', lane: 'school', name: 'Get and answer the request', status: 'partial', marks: ['manual'], route: '/business/network/[username]/bookings', code: 'sendBookingInquiryEmail · inquiries.book · inquiries.setStatus',
    note: 'The team is emailed and sees it under Bookings. “Yes, book it” saves the booking and emails the student, and when the student has a page puts the teacher on a draft event (RAZ-1089). “I replied by email” is still only a mark, and a decline doesn’t email the student.' },
  { id: 'answer', phase: 'private', lane: 'student', name: 'Hear back', status: 'partial', marks: ['wait'],
    note: 'A yes emails the student. There is still no list of requests on My plan, a decline doesn’t email them, and agreeing a time and paying happen outside WeDance. The teacher is reminded once, three days after an unanswered request.' },
  { id: 'workshop', phase: 'private', lane: 'student', name: 'Plan festival workshops', status: 'live', marks: [], route: '/events/[id]', code: 'FestivalView (workshop_plan_add)', refs: ['P228'],
    note: 'Pick workshops from a festival’s schedule into your plan, with partner status. Only for festivals with a schedule; a city school’s one-off workshop is just another event.' },

  // See progress
  { id: 'goal-slider', phase: 'progress', lane: 'student', name: 'Move the progress bar', status: 'partial', marks: ['manual'], route: '/my-plan', code: 'useGoals.updateGoal → plan.updateMetadata',
    note: 'A goal’s progress is a percentage you set yourself. No class, social or workshop moves it.' },
  { id: 'level', phase: 'progress', lane: 'student', name: 'Your level per style', status: 'partial', marks: [], route: '/settings', code: 'dancers.dance_levels',
    note: 'Self-declared on Settings and the dance card (Lead / Follow + level). Nothing ever asks whether it changed.' },
  { id: 'year', phase: 'progress', lane: 'system', name: 'Your year in dance', status: 'partial', marks: [], route: '/my-year', code: 'plan.yearReview',
    note: 'The look back counts the nights you were going to, your style, your home floor. Intent, not proof — and classes count like parties, so it says nothing about what you learned.' },
  { id: 'teacher-feedback', phase: 'progress', lane: 'school', name: 'Teacher’s view of progress', status: 'missing', marks: ['silent'],
    note: 'No way for a teacher to note a student’s level, what to work on, or “ready for the next level”.' },

  // Next level
  { id: 'next-level', phase: 'next', lane: 'system', name: 'Suggest the next course', status: 'missing', marks: ['silent'],
    note: 'When a course ends, nothing offers the same school’s next course or the next level up.' },
  { id: 'school-next', phase: 'next', lane: 'school', name: 'Open the next course', status: 'partial', marks: ['manual'], route: '/business/events/new', code: 'businessEvents.copy · contactMailing.send',
    note: '“Like my last event” + N more weeks makes the next run in a minute. Telling last term’s students is Contacts → filter by the old event → Email N, and reaches only the mailable ones.' },
  { id: 'rejoin', phase: 'next', lane: 'student', name: 'Sign up again', status: 'gap', marks: ['wait'],
    note: 'The student starts over in the enroll picker — or waits for the school’s WhatsApp message.' },
]

export const keepGaps: BpGap[] = [
  { title: 'Every class is a new booking',
    why: 'A course is a series of separate events, and “Book my spot” books one date. My plan checks only the next class, so a weekly student books by hand every week — and the school’s list for each date is only whoever remembered.',
    fix: 'Book the course, not the date: a series sign-up (one rsvp for the series, “skip this week” per date) that My plan and Who’s coming read for every date still to come.',
    steps: ['picker', 'my-courses', 'signup', 'school-contact'] },
  { title: 'Silence between classes',
    why: 'Following a teacher, a course ending and the week’s socials never reach the student, so momentum depends on the class WhatsApp group. The daily jobs cover reviews and meetups.',
    fix: 'One weekly “your week” email (and the same block on My plan): your next class, a social in its style this week, new dates from teachers you follow, and “your course ends next week”. Needs a Vercel cron.',
    steps: ['reminder', 'follow', 'course-ends', 'socials-link'] },
  { title: 'Progress is a slider you move yourself',
    why: 'The door list now records who came, and Who’s coming and Contacts count those check-ins. The goal bar, the level and the year review still don’t read them, so a student’s progress is still a guess.',
    fix: 'Count checked-in classes on the goal (“9 timba classes since September”), and let the teacher mark “ready for the next level”.',
    steps: ['go-class', 'school-attend', 'goal-slider', 'level', 'year', 'teacher-feedback'] },
  { title: 'A private-class request vanishes',
    why: 'A yes emails the student, but a decline doesn’t, and the request never appears on My plan. A missed email is still a lost lesson.',
    fix: 'List sent requests on My plan with their status, and email the student when the team declines.',
    steps: ['book', 'inbox', 'answer'] },
  { title: 'No path to the next level',
    why: 'A series has no level and no “next course”. When it ends the card disappears, and the school re-gathers its students by hand from Contacts — reaching only those who opted in.',
    fix: 'Give a series a level and an optional follow-on course. When the last date passes, My plan offers the follow-on, and the school’s Contacts shows “N students finishing” with a one-click invite (a service email to the course’s own sign-ups, not marketing).',
    steps: ['series', 'course-ends', 'next-level', 'school-next', 'rejoin'] },
  { title: 'The course card doesn’t name the teacher',
    why: 'Goals only tag things by style, and the course card leaves teacher and level empty, so the student can’t see which teacher their progress depends on or find their other classes.',
    fix: 'Show the event’s line-up as the teacher on the course card (linking /@handle) and let a goal suggest courses in its style from teachers you follow.',
    steps: ['goal-link', 'my-courses', 'artists', 'teacher-page'] },
]

export const keepProgressingBlueprint: Blueprint = {
  updated: KEEP_PROGRESSING_BLUEPRINT_UPDATED,
  lanes: keepLanes,
  phases: keepPhases,
  steps: keepSteps,
  gaps: keepGaps,
  systemLane: 'system',
}
