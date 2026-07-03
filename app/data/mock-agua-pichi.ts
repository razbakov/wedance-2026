import type { Festival, Teacher, Workshop } from '~/types/festival'

/**
 * Agua Pichi 2027 — Alex's own festival (Edition 1).
 * Munich's Cuban festival. Roots & revolution. Every July.
 *
 * Data drawn from ~/Orgs/AguaPichi/logbook/mission-vision.md and
 * ~/Orgs/AguaPichi/logbook/strategy.md as of 2026-07-03.
 *
 * Confirmed anchors:
 *   Los Van Van (Saturday headliner, 50% deposit due Jul 2026)
 *   La Rumba de Pedro Pablo (Thursday concert)
 *   Westin Grand Munich (target venue, contract open)
 *
 * The workshop lineup below reflects the strategy doc's curation
 * targets (emerging Cuban teachers under 5k IG + established anchors);
 * bookings are being finalised. Treat teacher list + workshop titles
 * as target program, not confirmed roster.
 */
export const mockFestival: Festival = {
  name: 'Agua Pichi 2027',
  slug: 'agua-pichi-2027',
  startDate: '2027-07-01',
  endDate: '2027-07-04',
  description:
    'Munich\'s Cuban festival. Roots & revolution. Every July. Four days of Cuban music and dance — established orchestras on Saturday, emerging teachers Thursday through Sunday. Los Van Van headlines the main night; the rest is curated to discover the next generation of Cuban dance before the European circuit does.',
  logo: 'https://ui-avatars.com/api/?name=AP&size=80&background=c14a1a&color=f5ede0&bold=true&rounded=true',
  accentColor: '#c14a1a',
  socialLinks: [
    { platform: 'instagram', url: 'https://instagram.com/agua.pichi.munich' },
    { platform: 'website', url: 'https://aguapichi.com' },
  ],
  venue: {
    name: 'Westin Grand Munich',
    address: 'Arabellastraße 6, 81925 Munich, Germany',
    coordinates: { lat: 48.1518, lng: 11.6294 },
    practicalInfo: [
      'Main venue: Westin Grand Munich, Arabellastraße 6, 81925 Munich',
      'Thursday concert (Roots): La Rumba de Pedro Pablo — venue TBA',
      'Saturday headliner: Los Van Van, main hall at Westin Grand',
      'Sunday farewell party — venue TBA',
      'Full Pass €170: all workshops + all parties (excl. some Roots evening)',
      'Party Pass €90: all parties incl. Los Van Van concert',
      'Saturday Pass €80: Saturday workshops + Los Van Van concert',
      'Super-Early-Bird Party Pass €50: launched at 23 May 2026 Charanga Habanera concert',
    ],
  },
  attendeeCount: 400,
  ticketUrl: 'https://aguapichi.com',
  tickets: [
    {
      name: 'Full Pass',
      price: 170,
      days: [],
      description: 'All workshops + all parties incl. Los Van Van',
      includesParty: true,
    },
    {
      name: 'Super-Early-Bird Party Pass',
      price: 50,
      days: [],
      description: 'Party access + Los Van Van concert. 100 tickets, launched at the Charanga Habanera concert.',
      soldOut: true,
      includesParty: true,
      workshopCount: 0, // party-only: no workshop access
    },
    {
      name: 'Party Pass',
      price: 90,
      days: [],
      description: 'All parties incl. Los Van Van concert',
      includesParty: true,
      workshopCount: 0, // party-only: no workshop access
    },
    {
      name: 'Saturday Pass',
      price: 80,
      days: ['Saturday'],
      description: 'Saturday workshops + Los Van Van concert',
    },
    {
      name: 'Thursday Roots Pass',
      price: 45,
      days: ['Thursday'],
      description: 'Thursday workshops + La Rumba de Pedro Pablo concert',
    },
  ],
}

// Target teacher lineup — curated per strategy. Names reflect the
// discovery-led programming direction (established + emerging Cuban
// teachers). Confirmed roster is being finalised.
export const mockTeachers: Teacher[] = [
  {
    id: 'los-van-van',
    name: 'Los Van Van',
    photo: 'https://ui-avatars.com/api/?name=LVV&size=120&background=dc2626&color=fff&bold=true&rounded=true',
    bio: 'Cuba\'s legendary songo orchestra, founded 1969 by Juan Formell. Grammy-winning, decades of hits, and still the reference point for modern Cuban dance music. Saturday headliner.',
    styles: ['Songo', 'Timba', 'Salsa Cubana'],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/losvanvanoficial' },
    ],
  },
  {
    id: 'pedro-pablo',
    name: 'La Rumba de Pedro Pablo',
    photo: 'https://ui-avatars.com/api/?name=PP&size=120&background=9a5614&color=fff&bold=true&rounded=true',
    bio: 'Traditional Cuban rumba ensemble opening the festival on Thursday night. Rumba, Guaguancó, Yambú, Columbia — the roots the rest of the weekend builds on.',
    styles: ['Rumba', 'Guaguancó', 'Columbia'],
  },
  {
    id: 'maykel-fonts',
    name: 'Maykel Fonts (target)',
    photo: 'https://ui-avatars.com/api/?name=MF&size=120&background=f59e0b&color=fff&bold=true&rounded=true',
    bio: 'Established name on Europe\'s Cuban festival circuit — Timba, Casino, and body-movement fundamentals. Curation target: anchors the Revolution track credibility.',
    styles: ['Timba', 'Casino', 'Cuban Body Movement'],
  },
  {
    id: 'eneris',
    name: 'Eneris (target)',
    photo: 'https://ui-avatars.com/api/?name=EN&size=120&background=0891b2&color=fff&bold=true&rounded=true',
    bio: 'Cuban dancer and choreographer. Rueda de Casino specialist. Curation target for Friday\'s rueda block.',
    styles: ['Casino', 'Rueda', 'Ladies Styling'],
  },
  {
    id: 'milaila',
    name: 'Milaila (emerging)',
    photo: 'https://ui-avatars.com/api/?name=ML&size=120&background=a855f7&color=fff&bold=true&rounded=true',
    bio: 'Emerging Cuban teacher (under 5k IG). Timba fundamentals + Cuban feel. First European festival — the discovery slot the brand is built around.',
    styles: ['Timba', 'Cuban Feel'],
  },
  {
    id: 'thalia',
    name: 'Thalía (emerging)',
    photo: 'https://ui-avatars.com/api/?name=TH&size=120&background=ec4899&color=fff&bold=true&rounded=true',
    bio: 'Emerging Cuban teacher. Bachata Dominicana + Ladies-styling formats. Curation target for the Revolution track.',
    styles: ['Bachata Dominicana', 'Ladies Styling'],
  },
  {
    id: 'joao-del-monte',
    name: 'Joao Del Monte (emerging)',
    photo: 'https://ui-avatars.com/api/?name=JD&size=120&background=16a34a&color=fff&bold=true&rounded=true',
    bio: 'Emerging Cuban teacher. Timba theory, clave, and history-before-steps formats. Curation target for the "roots before revolution" workshops.',
    styles: ['Timba', 'Clave', 'Cuban History'],
  },
  {
    id: 'emilito',
    name: 'Emilito',
    photo: 'https://ui-avatars.com/api/?name=EM&size=120&background=dc2626&color=fff&bold=true&rounded=true',
    bio: 'Workshop Coordinator (Yo Vengo de Cuba). Casino + Cuban Son fundamentals. Anchors Friday\'s emerging-teacher block.',
    styles: ['Casino', 'Cuban Son'],
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/yovengodecuba' },
    ],
  },
]

// Sample program — dual-track: Thursday Roots, Fri+Sun Revolution,
// Saturday headliner. Reflects the strategy doc's programming split.
export const mockWorkshops: Workshop[] = [
  // ─── Thursday · Roots ───────────────────────────────────────────────
  { id: 'thu-1', day: 'Thursday', time: '17:00', duration: 75, room: 'Hall A', title: 'Danzón — the first dance', style: 'Danzón',   level: 'Beginner',     teacherId: 'joao-del-monte', goingCount: 22 },
  { id: 'thu-2', day: 'Thursday', time: '18:30', duration: 75, room: 'Hall A', title: 'Cuban Son body movement',   style: 'Son',      level: 'Intermediate', teacherId: 'emilito',        goingCount: 34 },
  { id: 'thu-3', day: 'Thursday', time: '20:00', duration: 75, room: 'Hall A', title: 'Afro-Cuban Orishas intro',  style: 'Afro',     level: 'Beginner',     teacherId: 'pedro-pablo',    goingCount: 28 },
  { id: 'thu-party', day: 'Thursday', time: '22:00', duration: 180, room: 'Hall A', title: 'La Rumba de Pedro Pablo — concert', style: 'Rumba', level: 'Beginner', teacherId: 'pedro-pablo', goingCount: 220, type: 'party', venue: 'Roots venue TBA', description: 'Live rumba ensemble opens the festival. Guaguancó, Yambú, Columbia — the roots the rest of the weekend builds on.' },

  // ─── Friday · Revolution ────────────────────────────────────────────
  { id: 'fri-1', day: 'Friday', time: '11:00', duration: 75, room: 'Hall A', title: 'Timba fundamentals',           style: 'Timba',              level: 'Beginner',     teacherId: 'milaila',      goingCount: 46 },
  { id: 'fri-2', day: 'Friday', time: '11:00', duration: 75, room: 'Hall B', title: 'Rueda de Casino — basics',     style: 'Casino',             level: 'Beginner',     teacherId: 'eneris',       goingCount: 38 },
  { id: 'fri-3', day: 'Friday', time: '13:00', duration: 75, room: 'Hall A', title: 'Bachata Dominicana',           style: 'Bachata Dominicana', level: 'Intermediate', teacherId: 'thalia',       goingCount: 42 },
  { id: 'fri-4', day: 'Friday', time: '13:00', duration: 75, room: 'Hall B', title: 'Casino intermediate figures',  style: 'Casino',             level: 'Intermediate', teacherId: 'emilito',      goingCount: 35 },
  { id: 'fri-5', day: 'Friday', time: '15:00', duration: 75, room: 'Hall A', title: 'Ladies styling — Timba',       style: 'Ladies',             level: 'Intermediate', teacherId: 'thalia',       goingCount: 30 },
  { id: 'fri-6', day: 'Friday', time: '17:00', duration: 75, room: 'Hall A', title: 'Cuban body isolation',         style: 'Cuban Feel',         level: 'Intermediate', teacherId: 'milaila',      goingCount: 28 },
  { id: 'fri-7', day: 'Friday', time: '19:00', duration: 60, room: 'Hall A', title: 'Warm-up before the floor',     style: 'Timba',              level: 'Beginner',     teacherId: 'emilito',      goingCount: 40 },
  { id: 'fri-party', day: 'Friday', time: '22:00', duration: 300, room: 'Hall A', title: 'Welcome party — Revolution night', style: 'Timba', level: 'Beginner', teacherId: 'milaila', goingCount: 380, type: 'party', venue: 'Westin Grand Munich · main hall', description: 'DJ sets from Cuba + Munich residents. Timba, Casino, Bachata Dominicana until 3am.' },

  // ─── Saturday · Headliner ───────────────────────────────────────────
  { id: 'sat-1', day: 'Saturday', time: '11:00', duration: 75, room: 'Hall A', title: 'Timba advanced footwork',     style: 'Timba',   level: 'Advanced',     teacherId: 'maykel-fonts',   goingCount: 55 },
  { id: 'sat-2', day: 'Saturday', time: '11:00', duration: 75, room: 'Hall B', title: 'Show choreography — Timba',   style: 'Show',    level: 'Advanced',     teacherId: 'eneris',         goingCount: 32 },
  { id: 'sat-3', day: 'Saturday', time: '13:00', duration: 75, room: 'Hall A', title: 'Timba theory + clave',        style: 'Timba',   level: 'Intermediate', teacherId: 'joao-del-monte', goingCount: 40 },
  { id: 'sat-4', day: 'Saturday', time: '13:00', duration: 75, room: 'Hall B', title: 'Cuban Body Movement — men',   style: 'Cuban Feel', level: 'Intermediate', teacherId: 'maykel-fonts',   goingCount: 34 },
  { id: 'sat-5', day: 'Saturday', time: '15:00', duration: 75, room: 'Hall A', title: 'Warm-up class — pre-concert', style: 'Timba',   level: 'Beginner',     teacherId: 'emilito',        goingCount: 60 },
  { id: 'sat-party', day: 'Saturday', time: '21:00', duration: 240, room: 'Hall A', title: 'Los Van Van — main concert', style: 'Songo', level: 'Beginner', teacherId: 'los-van-van', goingCount: 900, type: 'party', venue: 'Westin Grand Munich · main hall', description: 'The headliner night. Los Van Van live from Cuba — songo, timba, and hits from 1969 to today.' },

  // ─── Sunday · Revolution + close ────────────────────────────────────
  { id: 'sun-1', day: 'Sunday', time: '12:00', duration: 75, room: 'Hall A', title: 'Rumba Columbia — men\'s style', style: 'Rumba',   level: 'Advanced',     teacherId: 'pedro-pablo',    goingCount: 24 },
  { id: 'sun-2', day: 'Sunday', time: '12:00', duration: 75, room: 'Hall B', title: 'Sunday jam — social casino',    style: 'Casino',  level: 'Intermediate', teacherId: 'eneris',         goingCount: 40 },
  { id: 'sun-3', day: 'Sunday', time: '14:00', duration: 75, room: 'Hall A', title: 'Emerging teacher showcase',     style: 'Timba',   level: 'Intermediate', teacherId: 'milaila',        goingCount: 46 },
  { id: 'sun-4', day: 'Sunday', time: '16:00', duration: 60, room: 'Hall A', title: 'Cool-down + Q&A with teachers', style: 'Cuban Feel', level: 'Beginner',     teacherId: 'joao-del-monte', goingCount: 34 },
  { id: 'sun-party', day: 'Sunday', time: '20:00', duration: 240, room: 'Hall A', title: 'Farewell party', style: 'Timba', level: 'Beginner', teacherId: 'emilito', goingCount: 300, type: 'party', venue: 'Farewell venue TBA', description: 'The closing floor. Every teacher on the DJ booth back-to-back. Until we do it again next July.' },
]
