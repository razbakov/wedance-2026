<script setup lang="ts">
/**
 * /my-plan — signed-in dashboard: the whole planning cascade.
 * Sections top-to-bottom follow the mental model that big motivates small:
 *   Heat strip -> Goals -> Year (festivals) -> Month (courses)
 *   -> Week (socials) -> Tonight (hangouts)
 * Every section uses the V3 tropical style + accordion / compact-list
 * pattern established by the Year cards. Data is currently local +
 * preview-seeded; wire real backend when the pieces exist.
 */
import { ArrowRight, MapPin, Calendar, Search, Ticket, Plane, Home, GraduationCap, Heart, Coffee, CalendarPlus, Check, ExternalLink, ChevronDown, Target, Flame, Sparkles, MoonStar, UtensilsCrossed, GlassWater, Car, X, Star, Users as UsersIcon, Undo2 } from 'lucide-vue-next'
import * as salsaOpen from '~/data/mock-festival'
import * as meneate from '~/data/mock-meneate'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — My plan',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const { isSignedIn: isSignedInReal, dancerName: dancerNameReal } = useAuth()
const { yearPlanIds, removeFestival, toggleFestival } = useYearPlan()

// ?preview=1 — dev shortcut. Fakes signed-in + seeds picks so we can
// eyeball the strip + cards without running the real magic-link flow.
// Doesn't mutate real auth or year-plan state.
const route = useRoute()
const previewMode = computed(() => route.query.preview === '1')
const PREVIEW_PICK_SLUGS = new Set([
  'meneate-viena-2026',
  'bachata-stars-barcelona-2026',
  'kizomba-prague-2026',
])

const isSignedIn = computed(() => isSignedInReal.value || previewMode.value)
const dancerName = computed(() => previewMode.value ? 'Alex' : dancerNameReal.value)
const effectivePickIds = computed(() => previewMode.value ? PREVIEW_PICK_SLUGS : yearPlanIds.value)

// Catalogue of festivals — same source /festivals uses. Extract to a
// composable once this data starts to matter.
function cheapestPrice(tickets: Array<{ price: number; soldOut?: boolean }>) {
  const available = tickets.filter(t => !t.soldOut).map(t => t.price)
  return available.length ? Math.min(...available) : undefined
}

const catalogue = [
  {
    slug: meneate.mockFestival.slug,
    name: meneate.mockFestival.name,
    startDate: meneate.mockFestival.startDate,
    endDate: meneate.mockFestival.endDate,
    location: 'Vienna, Austria',
    venue: meneate.mockFestival.venue.name,
    logo: meneate.mockFestival.logo,
    accentColor: meneate.mockFestival.accentColor,
    workshopCount: meneate.mockWorkshops.filter(w => w.type !== 'party').length,
    ticketUrl: meneate.mockFestival.ticketUrl,
    ticketFromPrice: cheapestPrice(meneate.mockFestival.tickets),
    earlyBirdDeadline: undefined as string | undefined,
  },
  {
    slug: cubanFire.mockFestival.slug,
    name: cubanFire.mockFestival.name,
    startDate: cubanFire.mockFestival.startDate,
    endDate: cubanFire.mockFestival.endDate,
    location: 'Munich, Germany',
    venue: cubanFire.mockFestival.venue.name,
    logo: '',
    accentColor: cubanFire.mockFestival.accentColor,
    workshopCount: cubanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    ticketUrl: (cubanFire.mockFestival as any).ticketUrl,
    ticketFromPrice: cheapestPrice(cubanFire.mockFestival.tickets),
    earlyBirdDeadline: undefined as string | undefined,
  },
  {
    slug: caribbeanUrbanFire.mockFestival.slug,
    name: caribbeanUrbanFire.mockFestival.name,
    startDate: caribbeanUrbanFire.mockFestival.startDate,
    endDate: caribbeanUrbanFire.mockFestival.endDate,
    location: 'Munich, Germany',
    venue: caribbeanUrbanFire.mockFestival.venue.name,
    logo: '',
    accentColor: caribbeanUrbanFire.mockFestival.accentColor,
    workshopCount: caribbeanUrbanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    ticketUrl: (caribbeanUrbanFire.mockFestival as any).ticketUrl,
    ticketFromPrice: cheapestPrice(caribbeanUrbanFire.mockFestival.tickets),
    earlyBirdDeadline: undefined as string | undefined,
  },
  {
    slug: salsaOpen.mockFestival.slug,
    name: salsaOpen.mockFestival.name,
    startDate: salsaOpen.mockFestival.startDate,
    endDate: salsaOpen.mockFestival.endDate,
    location: 'Berlin, Germany',
    venue: salsaOpen.mockFestival.venue.name,
    logo: salsaOpen.mockFestival.logo,
    accentColor: salsaOpen.mockFestival.accentColor,
    workshopCount: salsaOpen.mockWorkshops.length,
    ticketUrl: (salsaOpen.mockFestival as any).ticketUrl,
    ticketFromPrice: cheapestPrice((salsaOpen.mockFestival as any).tickets || []),
    earlyBirdDeadline: '2026-06-01',
  },
  {
    slug: 'bachata-stars-barcelona-2026',
    name: 'Bachata Stars Barcelona',
    startDate: '2026-07-03',
    endDate: '2026-07-06',
    location: 'Barcelona, Spain',
    venue: 'Sala Apolo',
    logo: 'https://ui-avatars.com/api/?name=BSB&size=80&background=7c3aed&color=fff&bold=true&rounded=true',
    accentColor: '#7c3aed',
    workshopCount: 24,
    ticketUrl: 'https://bachatastarsbarcelona.com/tickets',
    ticketFromPrice: 145,
    // Set close to "today" so the urgent-deadline UI has something to
    // fire on in the preview demo. When real data lands this becomes
    // whatever the organizer sets.
    earlyBirdDeadline: '2026-07-06',
  },
  {
    slug: 'timba-fest-london-2026',
    name: 'Timba Fest London',
    startDate: '2026-09-18',
    endDate: '2026-09-21',
    location: 'London, UK',
    venue: 'Village Underground',
    logo: 'https://ui-avatars.com/api/?name=TFL&size=80&background=0ea5e9&color=fff&bold=true&rounded=true',
    accentColor: '#0ea5e9',
    workshopCount: 18,
    ticketUrl: 'https://timbafestlondon.co.uk/tickets',
    ticketFromPrice: 95,
    earlyBirdDeadline: undefined as string | undefined,
  },
  {
    slug: 'kizomba-prague-2026',
    name: 'Kizomba & Urban Kiz Prague',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    location: 'Prague, Czech Republic',
    venue: 'La Loca Prague',
    logo: 'https://ui-avatars.com/api/?name=KPR&size=80&background=ec4899&color=fff&bold=true&rounded=true',
    accentColor: '#ec4899',
    workshopCount: 16,
    ticketUrl: 'https://kizombaprague.com/tickets',
    ticketFromPrice: 110,
    earlyBirdDeadline: undefined as string | undefined,
  },
]

type CatalogueEntry = typeof catalogue[number]

const picked = computed(() =>
  catalogue
    .filter(f => effectivePickIds.value.has(f.slug))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
)

function onRemove(slug: string) {
  // In preview mode we don't mutate real state.
  if (previewMode.value) return
  removeFestival(slug)
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

function daysUntilLabel(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: 'Happened', urgent: false }
  if (diff === 0) return { text: 'Today', urgent: true }
  if (diff === 1) return { text: 'Tomorrow', urgent: true }
  if (diff <= 7) return { text: `In ${diff} days`, urgent: true }
  if (diff <= 30) return { text: `In ${diff} days`, urgent: false }
  if (diff <= 60) return { text: `In ${Math.ceil(diff / 7)} weeks`, urgent: false }
  return { text: `In ${Math.ceil(diff / 30)} months`, urgent: false }
}

// Short label for the year-at-a-glance strip. Prefer the "brand short"
// (initials of significant words), fall back to first 3 chars.
function shortLabel(name: string) {
  const words = name
    .replace(/[¡¿!?().,]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !/^(the|and|of|de|la|el|los|las|for|with|to|in|on|at|by)$/i.test(w))
  if (words.length >= 2) return words.map(w => w[0]).join('').slice(0, 3).toUpperCase()
  return (name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3) || '?').toUpperCase()
}

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// Year-at-a-glance grid. Each of the 12 months owns any picked
// festivals that START in that month (a fest spanning May → June
// lives under May).
const monthsGrid = computed(() =>
  MONTH_LABELS.map((label, i) => {
    const entries = picked.value
      .filter(f => new Date(f.startDate).getMonth() === i)
      .map(f => {
        const s = new Date(f.startDate)
        const e = new Date(f.endDate)
        const sameMonth = s.getMonth() === e.getMonth()
        return {
          slug: f.slug,
          name: f.name,
          short: shortLabel(f.name),
          accentColor: f.accentColor,
          dayRange: sameMonth
            ? `${s.getDate()}–${e.getDate()}`
            : `${s.getDate()} → ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        }
      })
    return { label, entries }
  })
)

// Client-only: which month index (0–11) is today. Server-render as
// -1 so the "you're here" chip doesn't hydrate-mismatch.
const todayMonth = ref(-1)
onMounted(() => {
  todayMonth.value = new Date().getMonth()
})

// -----------------------------------------------------------------------
// Progress store — per-festival "done" toggles kept in localStorage.
// The rows show honest current state (ticket price, workshop count,
// early-bird deadline). The user checks tracks off manually as they
// complete them. No fake progress data.
// -----------------------------------------------------------------------
type TrackKey = 'ticketBought' | 'travelBooked' | 'stayBooked' | 'partnerFound' | 'vacationBooked'
type Progress = Partial<Record<TrackKey, boolean>>
const STORAGE_KEY = 'wedance-plan-progress'

// Preview seed — applied synchronously during setup so the SSR paint
// already shows a rich mix of done/urgent/todo states in demo mode.
const PREVIEW_SEED: Record<string, Progress> = {
  'meneate-viena-2026':          { ticketBought: true, travelBooked: true, vacationBooked: true },
  'bachata-stars-barcelona-2026': {},
  'kizomba-prague-2026':          {},
}

const isPreviewInitial = route.query.preview === '1'
const progressStore = ref<Record<string, Progress>>(isPreviewInitial ? PREVIEW_SEED : {})

function persistProgress() {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progressStore.value)) } catch { /* quota */ }
}

onMounted(() => {
  // Real user: load persisted state. Preview mode skips localStorage.
  if (previewMode.value) return
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) progressStore.value = JSON.parse(raw)
  } catch { /* corrupt payload — will be overwritten on next toggle */ }
})

function getProgress(slug: string): Progress {
  return progressStore.value[slug] ?? {}
}

function toggleTrack(slug: string, key: TrackKey) {
  const current = getProgress(slug)
  progressStore.value = {
    ...progressStore.value,
    [slug]: { ...current, [key]: !current[key] },
  }
  if (!previewMode.value) persistProgress()
}

// -----------------------------------------------------------------------
// Helpers.
// -----------------------------------------------------------------------
function daysBetween(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Google Calendar prefill URL for an all-day vacation block.
// dates=YYYYMMDD/YYYYMMDD, end exclusive.
function gcalLink(f: CatalogueEntry) {
  const start = f.startDate.replace(/-/g, '')
  const endDate = new Date(f.endDate)
  endDate.setDate(endDate.getDate() + 1)
  const endStr = endDate.toISOString().slice(0, 10).replace(/-/g, '')
  const title = encodeURIComponent(`Vacation · ${f.name}`)
  const details = encodeURIComponent(`Dance festival — ${f.location}\nSee your plan: /my-plan`)
  const loc = encodeURIComponent(`${f.venue}, ${f.location}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${endStr}&details=${details}&location=${loc}`
}

function flightsLink(f: CatalogueEntry) {
  return `https://www.google.com/travel/flights?q=flights%20to%20${encodeURIComponent(f.location)}%20${f.startDate}`
}

function staysLink(f: CatalogueEntry) {
  return `https://www.google.com/travel/hotels/${encodeURIComponent(f.location)}?q=${encodeURIComponent(f.venue)}&checkin=${f.startDate}&checkout=${f.endDate}`
}

// -----------------------------------------------------------------------
// Per-festival tracks. Each row: icon · label · state (color-coded) ·
// action (button/link). Real state where the data supports it; local
// toggle where it doesn't (we don't fake booking status).
// -----------------------------------------------------------------------
type TrackAction = { label: string; href: string; external: boolean }
type Track = {
  key: TrackKey | 'workshops' | 'community'
  icon: any
  label: string
  state: { text: string; tone: 'done' | 'urgent' | 'todo' | 'muted' }
  action: TrackAction | null
  altAction?: TrackAction  // "or X" fallback — used on tracks where WeDance has a native path (sharing) and Google is the fallback
  toggleKey?: TrackKey
  done: boolean
}

function tracks(f: CatalogueEntry): Track[] {
  const p = getProgress(f.slug)
  const daysToStart = daysBetween(f.startDate)
  const daysToEarlyBird = f.earlyBirdDeadline ? daysBetween(f.earlyBirdDeadline) : null
  const earlyBirdActive = daysToEarlyBird !== null && daysToEarlyBird >= 0 && daysToEarlyBird <= 7
  const priceText = f.ticketFromPrice ? `€${f.ticketFromPrice}` : ''

  return [
    // Ticket
    {
      key: 'ticketBought',
      icon: Ticket,
      label: 'Ticket',
      state: p.ticketBought
        ? { text: 'Bought', tone: 'done' }
        : earlyBirdActive
          ? { text: `Early-bird ends in ${daysToEarlyBird}d${priceText ? ` · from ${priceText}` : ''}`, tone: 'urgent' }
          : f.ticketFromPrice
            ? { text: `From ${priceText}`, tone: 'todo' }
            : { text: 'Not bought', tone: 'todo' },
      // WeDance is the ticketing platform — buy on the festival page's
      // Tickets section, not on the organizer's own site.
      action: p.ticketBought
        ? null
        : { label: f.ticketFromPrice ? `Buy ${priceText}` : 'Buy', href: `/festivals/${f.slug}#tickets`, external: false },
      toggleKey: 'ticketBought',
      done: !!p.ticketBought,
    },
    // Vacation from work
    {
      key: 'vacationBooked',
      icon: CalendarPlus,
      label: 'Vacation',
      state: p.vacationBooked
        ? { text: 'On the calendar', tone: 'done' }
        : daysToStart <= 60 && daysToStart >= 0
          ? { text: 'Not booked from work', tone: 'urgent' }
          : { text: 'Not booked from work', tone: 'todo' },
      action: p.vacationBooked ? null : { label: 'Add to calendar', href: gcalLink(f), external: true },
      toggleKey: 'vacationBooked',
      done: !!p.vacationBooked,
    },
    // Travel — WeDance ride shares first, external flights as fallback
    {
      key: 'travelBooked',
      icon: Plane,
      label: 'Travel',
      state: p.travelBooked ? { text: 'Booked', tone: 'done' } : { text: 'Not booked', tone: 'todo' },
      action: p.travelBooked ? null : { label: 'Find a ride', href: `/festivals/${f.slug}#activities`, external: false },
      altAction: p.travelBooked ? undefined : { label: 'or flights', href: flightsLink(f), external: true },
      toggleKey: 'travelBooked',
      done: !!p.travelBooked,
    },
    // Stay — WeDance roommate matching first, external hotels as fallback
    {
      key: 'stayBooked',
      icon: Home,
      label: 'Stay',
      state: p.stayBooked ? { text: 'Booked', tone: 'done' } : { text: 'Not booked', tone: 'todo' },
      action: p.stayBooked ? null : { label: 'Share a room', href: `/festivals/${f.slug}#activities`, external: false },
      altAction: p.stayBooked ? undefined : { label: 'or hotel', href: staysLink(f), external: true },
      toggleKey: 'stayBooked',
      done: !!p.stayBooked,
    },
    // Workshops
    {
      key: 'workshops',
      icon: GraduationCap,
      label: 'Workshops',
      state: { text: `${f.workshopCount} on the schedule`, tone: 'todo' },
      action: { label: 'Pick some', href: `/festivals/${f.slug}#schedule`, external: false },
      done: false,
    },
    // Partner
    {
      key: 'partnerFound',
      icon: Heart,
      label: 'Partner',
      state: p.partnerFound ? { text: 'Matched', tone: 'done' } : { text: 'Not looking yet', tone: 'todo' },
      action: p.partnerFound ? null : { label: 'Find one', href: `/festivals/${f.slug}#discover`, external: false },
      toggleKey: 'partnerFound',
      done: !!p.partnerFound,
    },
    // Community (dinners, rides, roommate)
    {
      key: 'community',
      icon: Coffee,
      label: 'Community',
      state: { text: 'Rides, dinners, roommate', tone: 'muted' },
      action: { label: 'Browse', href: `/festivals/${f.slug}#activities`, external: false },
      done: false,
    },
  ]
}

// -----------------------------------------------------------------------
// Cross-festival summary. Real math, no invented totals.
// -----------------------------------------------------------------------
const summary = computed(() => {
  const list = picked.value
  const committed = list.reduce((sum, f) => {
    const paid = getProgress(f.slug).ticketBought
    return sum + (paid && f.ticketFromPrice ? f.ticketFromPrice : 0)
  }, 0)
  const pending = list.reduce((sum, f) => {
    const paid = getProgress(f.slug).ticketBought
    return sum + (!paid && f.ticketFromPrice ? f.ticketFromPrice : 0)
  }, 0)
  const urgentDeadlines = list.filter(f => {
    if (!f.earlyBirdDeadline) return false
    const d = daysBetween(f.earlyBirdDeadline)
    return d >= 0 && d <= 7 && !getProgress(f.slug).ticketBought
  }).length
  return { count: list.length, committed, pending, urgentDeadlines }
})

const toneStyle = (tone: 'done' | 'urgent' | 'todo' | 'muted') => {
  if (tone === 'done')   return { color: '#16a34a', background: '#16a34a18' }
  if (tone === 'urgent') return { color: '#dc2626', background: '#dc262618' }
  if (tone === 'muted')  return { color: '#9a5614', background: '#9a561418' }
  return { color: '#5b3a1d', background: '#3b1f0d0a' }
}

// -----------------------------------------------------------------------
// Accordion — collapsed by default; click any card header to expand.
// Preview mode expands the "urgent" festival so both states are visible.
// -----------------------------------------------------------------------
const expandedSlugs = ref<Set<string>>(new Set(
  isPreviewInitial ? ['bachata-stars-barcelona-2026'] : [],
))

function toggleExpanded(slug: string) {
  const s = new Set(expandedSlugs.value)
  if (s.has(slug)) s.delete(slug); else s.add(slug)
  expandedSlugs.value = s
}

// -----------------------------------------------------------------------
// GOALS · long arcs above the year. Editing not yet wired — content is
// user-owned data that will live server-side. Preview seeds a mix.
// -----------------------------------------------------------------------
type Goal = { id: string; title: string; why: string; progress: number; nudge?: string; icon: any; color: string }
const previewGoals: Goal[] = [
  { id: 'g1', title: 'Learn timba (advanced)',   why: 'Feel at home in a Cuban rueda.',             progress: 55, nudge: 'Book 2 more privates before Cuban Fire.', icon: Flame,     color: '#dc2626' },
  { id: 'g2', title: 'Perform at Cuban Fire',    why: 'Duet with Emilia — 3-minute son piece.',    progress: 20, nudge: 'Choose the song this week.',                icon: Sparkles,  color: '#f59e0b' },
  { id: 'g3', title: 'Teach my first class',     why: 'Kids salsa Saturdays at 15x4.',              progress: 10, nudge: 'Sit in on Anna\'s lesson Sunday.',           icon: GraduationCap, color: '#16a34a' },
]
const goals = ref<Goal[]>(isPreviewInitial ? previewGoals : [])

// -----------------------------------------------------------------------
// COURSES · monthly cadence: school + teacher + level + next class.
// -----------------------------------------------------------------------
type Course = {
  id: string; school: string; teacher: string; style: string; level: string
  weekday: string; time: string; venue: string
  nextClassDate: string
  attended: number; total: number
  paidThroughMonth: boolean
  color: string
}
const previewCourses: Course[] = [
  {
    id: 'c1',
    school: 'Cubaila Munich', teacher: 'Yordana + Alexei',
    style: 'Timba', level: 'Beginner+',
    weekday: 'Wed', time: '19:00',
    venue: 'La Rumba',
    nextClassDate: '2026-07-08',
    attended: 6, total: 8,
    paidThroughMonth: true,
    color: '#dc2626',
  },
  {
    id: 'c2',
    school: '15x4 Munich', teacher: 'Emilia',
    style: 'Cuban Son', level: 'Intermediate',
    weekday: 'Mon', time: '20:00',
    venue: 'Buena Vista',
    nextClassDate: '2026-07-06',
    attended: 3, total: 4,
    paidThroughMonth: false,
    color: '#0891b2',
  },
]
const courses = ref<Course[]>(isPreviewInitial ? previewCourses : [])

// -----------------------------------------------------------------------
// SOCIALS · this-week horizon. Fri/Sat/Sun parties + practicas.
// -----------------------------------------------------------------------
type Social = {
  id: string; name: string; dayLabel: string; dateISO: string; time: string
  venue: string; city: string; style: string
  friendsGoing: number; rsvpd: boolean
  color: string
}
const previewSocials: Social[] = [
  { id: 's1', name: 'La Rumba Fri',           dayLabel: 'Fri', dateISO: '2026-07-03', time: '21:00', venue: 'La Rumba',   city: 'Munich', style: 'Cuban',   friendsGoing: 5, rsvpd: true,  color: '#dc2626' },
  { id: 's2', name: 'Rueda flashmob',         dayLabel: 'Sat', dateISO: '2026-07-04', time: '14:00', venue: 'Diana Tempel', city: 'Munich', style: 'Rueda',   friendsGoing: 12, rsvpd: true, color: '#f59e0b' },
  { id: 's3', name: 'Bailala Sat',            dayLabel: 'Sat', dateISO: '2026-07-04', time: '22:00', venue: 'Bailala',   city: 'Munich', style: 'Bachata', friendsGoing: 3, rsvpd: false, color: '#a855f7' },
  { id: 's4', name: 'Cuban Sunday practica',  dayLabel: 'Sun', dateISO: '2026-07-05', time: '19:00', venue: 'Buena Vista', city: 'Munich', style: 'Practica', friendsGoing: 4, rsvpd: false, color: '#16a34a' },
  { id: 's5', name: 'Thursday warmup',        dayLabel: 'Thu', dateISO: '2026-07-09', time: '20:30', venue: 'La Rumba',   city: 'Munich', style: 'All',     friendsGoing: 2, rsvpd: false, color: '#0891b2' },
]
const socials = ref<Social[]>(isPreviewInitial ? previewSocials : [])
function toggleSocialRsvp(id: string) {
  socials.value = socials.value.map(s => s.id === id ? { ...s, rsvpd: !s.rsvpd } : s)
}

// -----------------------------------------------------------------------
// TONIGHT · spontaneous evening — dinners, bar hops, rides.
// -----------------------------------------------------------------------
type Hangout = {
  id: string; kind: 'dinner' | 'bar' | 'ride' | 'floor'
  title: string; time: string; host?: string; venue?: string
  people: number; going: boolean
  color: string
}
const previewHangouts: Hangout[] = [
  { id: 'h1', kind: 'dinner', title: 'Dinner before La Rumba', time: '19:00', host: 'Mark + Klaus', venue: 'Xoco', people: 6,  going: false, color: '#f59e0b' },
  { id: 'h2', kind: 'floor',  title: 'La Rumba floor',         time: '22:00', venue: 'La Rumba',   people: 40, going: true,  color: '#dc2626' },
  { id: 'h3', kind: 'bar',    title: 'Post-social mojitos',    time: '02:30', venue: 'Café con Leche', people: 8,  going: false, color: '#a855f7' },
  { id: 'h4', kind: 'ride',   title: 'Ride to Diana Tempel',   time: '13:30', host: 'Egor',        people: 3,  going: false, color: '#0891b2' },
]
const hangouts = ref<Hangout[]>(isPreviewInitial ? previewHangouts : [])
function toggleHangout(id: string) {
  hangouts.value = hangouts.value.map(h => h.id === id ? { ...h, going: !h.going } : h)
}
const hangoutIcon = (kind: Hangout['kind']) => kind === 'dinner' ? UtensilsCrossed : kind === 'bar' ? GlassWater : kind === 'ride' ? Car : MoonStar

// -----------------------------------------------------------------------
// HEAT STRIP · the top 3 items across every scale, sorted by urgency.
// -----------------------------------------------------------------------
type HeatItem = { key: string; label: string; detail: string; href: string; external?: boolean; color: string; urgency: number }
const heatItems = computed<HeatItem[]>(() => {
  const items: HeatItem[] = []
  // Festivals: early-bird deadlines
  picked.value.forEach(f => {
    if (!f.earlyBirdDeadline) return
    const d = daysBetween(f.earlyBirdDeadline)
    if (d < 0 || d > 14 || getProgress(f.slug).ticketBought) return
    items.push({
      key: `fest-${f.slug}`,
      label: `${f.name} · early-bird`,
      detail: `Ends in ${d}d · from €${f.ticketFromPrice}`,
      href: `/festivals/${f.slug}#tickets`,
      external: false,
      color: '#dc2626',
      urgency: 100 - d,
    })
  })
  // Courses: unpaid this month
  courses.value.filter(c => !c.paidThroughMonth).forEach(c => {
    items.push({
      key: `course-${c.id}`,
      label: `${c.school} · pay for July`,
      detail: `${c.style} ${c.level} · ${c.weekday} ${c.time}`,
      href: '#courses',
      color: '#f59e0b',
      urgency: 70,
    })
  })
  // Socials: this-week RSVPs still open
  socials.value.filter(s => !s.rsvpd).slice(0, 2).forEach(s => {
    items.push({
      key: `social-${s.id}`,
      label: `${s.name} · ${s.dayLabel} ${s.time}`,
      detail: `${s.venue} · ${s.friendsGoing} friends going`,
      href: '#socials',
      color: '#0891b2',
      urgency: 40,
    })
  })
  // Tonight: any open invites
  hangouts.value.filter(h => !h.going).slice(0, 1).forEach(h => {
    items.push({
      key: `tonight-${h.id}`,
      label: `Tonight · ${h.title}`,
      detail: `${h.time} · ${h.venue ?? h.host ?? ''}`,
      href: '#tonight',
      color: '#a855f7',
      urgency: 90,
    })
  })
  return items.sort((a, b) => b.urgency - a.urgency).slice(0, 3)
})

// -----------------------------------------------------------------------
// DISCOVER · widen-your-year deck below hangouts.
// Swipeable cards mixing dancers going to fests + local dancers + events.
// Yes-swipe on a dancer heading to an unpicked festival accumulates a
// nudge in the Year section: "3 friends heading to Prague — add it?".
// -----------------------------------------------------------------------
type DeckCard =
  | { id: string; kind: 'dancer-your-fest';   name: string; photo: string; city: string; danceStyles: string[]; festivalSlug: string; festivalName: string; festivalColor: string }
  | { id: string; kind: 'dancer-new-fest';    name: string; photo: string; city: string; danceStyles: string[]; festivalSlug: string; festivalName: string; festivalColor: string }
  | { id: string; kind: 'dancer-local';       name: string; photo: string; city: string; danceStyles: string[]; regularAt: string }
  | { id: string; kind: 'event-festival';     name: string; slug: string;  dateISO: string; venue: string; city: string; friendsGoing: number; color: string }
  | { id: string; kind: 'event-social';       name: string; dayLabel: string; time: string; venue: string; city: string; style: string; friendsGoing: number; color: string }

const previewDeck: DeckCard[] = [
  { id: 'd1', kind: 'dancer-your-fest',  name: 'Ivana',   city: 'Berlin',    photo: 'https://i.pravatar.cc/240?u=ivana',   danceStyles: ['Timba', 'Son'],       festivalSlug: 'meneate-viena-2026',           festivalName: 'Menéate Viena',        festivalColor: '#dc2626' },
  { id: 'd2', kind: 'dancer-new-fest',   name: 'Emilia',  city: 'Munich',    photo: 'https://i.pravatar.cc/240?u=emilia',  danceStyles: ['Kizomba', 'Urban Kiz'], festivalSlug: 'timba-fest-london-2026',      festivalName: 'Timba Fest London',    festivalColor: '#0ea5e9' },
  { id: 'e1', kind: 'event-social',      name: 'Salsa on the Isar',  dayLabel: 'Sat', time: '15:00', venue: 'Muffatwerk terrace', city: 'Munich', style: 'Salsa', friendsGoing: 6, color: '#f59e0b' },
  { id: 'd3', kind: 'dancer-local',      name: 'Klaus',   city: 'Munich',    photo: 'https://i.pravatar.cc/240?u=klaus',   danceStyles: ['Salsa', 'Bachata'],    regularAt: 'La Rumba Fridays' },
  { id: 'd4', kind: 'dancer-new-fest',   name: 'Sasha',   city: 'Vienna',    photo: 'https://i.pravatar.cc/240?u=sasha',   danceStyles: ['Timba', 'Rumba'],     festivalSlug: 'timba-fest-london-2026',      festivalName: 'Timba Fest London',    festivalColor: '#0ea5e9' },
  { id: 'e2', kind: 'event-festival',    name: 'Salsa Fusion Prague', slug: 'salsa-fusion-prague-2026', dateISO: '2026-11-14', venue: 'La Loca', city: 'Prague',   friendsGoing: 2, color: '#a855f7' },
  { id: 'd5', kind: 'dancer-your-fest',  name: 'Silvio',  city: 'Havana',    photo: 'https://i.pravatar.cc/240?u=silvio',  danceStyles: ['Son', 'Timba'],       festivalSlug: 'bachata-stars-barcelona-2026', festivalName: 'Bachata Stars Barcelona', festivalColor: '#7c3aed' },
  { id: 'd6', kind: 'dancer-local',      name: 'Barbara', city: 'Munich',    photo: 'https://i.pravatar.cc/240?u=barbara', danceStyles: ['Rumba', 'Son'],       regularAt: 'Cuban Sunday practica' },
  { id: 'd7', kind: 'dancer-new-fest',   name: 'Egor',    city: 'Munich',    photo: 'https://i.pravatar.cc/240?u=egor',    danceStyles: ['Timba', 'Casino'],    festivalSlug: 'timba-fest-london-2026',      festivalName: 'Timba Fest London',    festivalColor: '#0ea5e9' },
  { id: 'e3', kind: 'event-social',      name: 'Havana Nights',      dayLabel: 'Fri', time: '22:30', venue: '537 Bar',          city: 'Munich', style: 'Cuban', friendsGoing: 8, color: '#dc2626' },
]

// Live deck state
const deck = ref<DeckCard[]>(isPreviewInitial ? [...previewDeck] : [])
// History stack for Undo
const swipeHistory = ref<Array<{ card: DeckCard; direction: 'yes' | 'skip' | 'save'; nudgeAdded?: string }>>([])
// Save-for-later stash (not exposed yet; scaffold shape)
const savedForLater = ref<DeckCard[]>([])
// Yes-swipes on dancers heading to a festival → accumulator
type FestivalNudge = { festivalSlug: string; festivalName: string; festivalColor: string; dancerNames: string[]; dismissed: boolean }
const festivalNudges = ref<FestivalNudge[]>(isPreviewInitial
  ? [
      // Preview: prime the "add Timba Fest London" nudge so the loop is visible.
      { festivalSlug: 'timba-fest-london-2026', festivalName: 'Timba Fest London', festivalColor: '#0ea5e9', dancerNames: ['Emilia', 'Sasha'], dismissed: false },
    ]
  : [])

const activeFestivalNudges = computed(() =>
  festivalNudges.value.filter(n => !n.dismissed && !effectivePickIds.value.has(n.festivalSlug) && n.dancerNames.length >= 2)
)

const deckCurrent = computed(() => deck.value[0] ?? null)
const deckNext    = computed(() => deck.value[1] ?? null)
const deckAfter   = computed(() => deck.value[2] ?? null)
const canUndo     = computed(() => swipeHistory.value.length > 0)

// Pointer-gesture state for the top card
const dragDx = ref(0)
const dragActive = ref(false)
const dragStartX = ref(0)
const dragPointerId = ref<number | null>(null)
const cardExitDir = ref<'yes' | 'skip' | 'save' | null>(null)

const SWIPE_THRESHOLD = 110

function currentCardTransform(): string {
  if (cardExitDir.value === 'yes')  return 'translateX(120vw) rotate(18deg)'
  if (cardExitDir.value === 'skip') return 'translateX(-120vw) rotate(-18deg)'
  if (cardExitDir.value === 'save') return 'translateY(120vh) scale(0.9)'
  const dx = dragDx.value
  const rot = dx * 0.06
  return `translateX(${dx}px) rotate(${rot}deg)`
}

function onCardPointerDown(e: PointerEvent) {
  if (cardExitDir.value) return
  dragPointerId.value = e.pointerId
  dragStartX.value = e.clientX
  dragActive.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onCardPointerMove(e: PointerEvent) {
  if (!dragActive.value || e.pointerId !== dragPointerId.value) return
  dragDx.value = e.clientX - dragStartX.value
}

function onCardPointerUp(e: PointerEvent) {
  if (e.pointerId !== dragPointerId.value) return
  dragActive.value = false
  dragPointerId.value = null
  if (dragDx.value > SWIPE_THRESHOLD)       commitSwipe('yes')
  else if (dragDx.value < -SWIPE_THRESHOLD) commitSwipe('skip')
  else                                      dragDx.value = 0
}

function commitSwipe(direction: 'yes' | 'skip' | 'save') {
  const card = deckCurrent.value
  if (!card) return
  cardExitDir.value = direction

  let nudgeAdded: string | undefined
  if (direction === 'yes') {
    if (card.kind === 'dancer-new-fest') {
      nudgeAdded = card.festivalSlug
      addNudge(card)
    }
    if (card.kind === 'event-festival') {
      // Add straight to the year picks
      if (!previewMode.value) toggleFestival(card.slug)
    }
  }
  if (direction === 'save') {
    savedForLater.value = [...savedForLater.value, card]
  }

  // Animate out then advance
  setTimeout(() => {
    swipeHistory.value = [...swipeHistory.value, { card, direction, nudgeAdded }]
    deck.value = deck.value.slice(1)
    dragDx.value = 0
    cardExitDir.value = null
  }, 260)
}

function addNudge(card: Extract<DeckCard, { kind: 'dancer-new-fest' }>) {
  const existing = festivalNudges.value.find(n => n.festivalSlug === card.festivalSlug)
  if (existing) {
    if (!existing.dancerNames.includes(card.name)) {
      existing.dancerNames = [...existing.dancerNames, card.name]
    }
    existing.dismissed = false
  } else {
    festivalNudges.value = [
      ...festivalNudges.value,
      { festivalSlug: card.festivalSlug, festivalName: card.festivalName, festivalColor: card.festivalColor, dancerNames: [card.name], dismissed: false },
    ]
  }
}

function undoSwipe() {
  const last = swipeHistory.value[swipeHistory.value.length - 1]
  if (!last) return
  swipeHistory.value = swipeHistory.value.slice(0, -1)
  deck.value = [last.card, ...deck.value]
  if (last.direction === 'save') savedForLater.value = savedForLater.value.filter(c => c.id !== last.card.id)
  if (last.direction === 'yes' && last.nudgeAdded) {
    const n = festivalNudges.value.find(x => x.festivalSlug === last.nudgeAdded)
    if (n && 'name' in last.card) {
      n.dancerNames = n.dancerNames.filter(name => name !== (last.card as any).name)
    }
  }
}

function acceptFestivalNudge(n: FestivalNudge) {
  if (!previewMode.value) toggleFestival(n.festivalSlug)
  n.dismissed = true
  festivalNudges.value = [...festivalNudges.value]
}

function dismissFestivalNudge(n: FestivalNudge) {
  n.dismissed = true
  festivalNudges.value = [...festivalNudges.value]
}

// -----------------------------------------------------------------------
// GOAL · progress ring color
// -----------------------------------------------------------------------
function goalProgressColor(p: number) {
  if (p >= 75) return '#16a34a'
  if (p >= 40) return '#0891b2'
  if (p >= 15) return '#f59e0b'
  return '#dc2626'
}

// Collapsed-view summary: how much of the plan is done, and what's the
// single most-urgent open track (the row that pulls the eye).
function cardSummary(f: CatalogueEntry) {
  const list = tracks(f)
  const toggleable = list.filter(t => t.toggleKey)
  const doneCount = toggleable.filter(t => t.done).length
  const totalCount = toggleable.length
  // Priority: urgent > todo-with-action > any-open-with-action.
  const headline
    = list.find(t => t.state.tone === 'urgent' && !t.done)
    ?? list.find(t => t.state.tone === 'todo' && !t.done && t.action)
    ?? list.find(t => !t.done && t.action)
    ?? null
  const allDone = doneCount === totalCount
  return { doneCount, totalCount, headline, allDone }
}
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header -->
    <SiteHeader />

    <!-- HERO -->
    <section class="max-w-4xl mx-auto px-4 pt-12 pb-6 text-center">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">
        <template v-if="isSignedIn">Hey, {{ dancerName || 'dancer' }}</template>
        <template v-else>Your plan</template>
      </div>
      <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
        What's <em class="italic" style="color:#dc2626;">next?</em>
      </h1>
      <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        Every festival you picked, in one place — with the one thing to do this week.
      </p>
    </section>

    <!-- SIGNED OUT — sign-in nudge -->
    <section v-if="!isSignedIn" class="max-w-2xl mx-auto px-4 py-10">
      <div class="rounded-2xl p-8 text-center bg-white border" style="border-color:#dc262655; box-shadow: 0 1px 0 #dc262622, 0 12px 28px rgba(59, 31, 18, 0.06);">
        <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style="color:#dc2626;">Signed out</div>
        <p class="text-lg" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          Sign in to see your plan.
        </p>
        <p class="mt-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Your picks, your partners, your tickets — one dashboard, one next step at a time.
        </p>
        <NuxtLink
          to="/festivals"
          class="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        >
          Browse festivals <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- SIGNED IN, EMPTY -->
    <section v-else-if="picked.length === 0" class="max-w-2xl mx-auto px-4 py-10">
      <div class="rounded-2xl p-10 text-center border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
        <Search class="w-10 h-10 mx-auto mb-4" style="color:#9a5614;" />
        <p class="text-lg" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          You haven't picked anything yet.
        </p>
        <p class="mt-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Start by picking one festival — the rest of the year plans itself.
        </p>
        <NuxtLink
          to="/festivals"
          class="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        >
          Browse festivals <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- SIGNED IN, WITH PICKS -->
    <section v-else class="max-w-4xl mx-auto px-4 py-6 pb-16">
      <!-- HEAT STRIP · the top 3 items across every scale, sorted by urgency. -->
      <div v-if="heatItems.length" class="rounded-2xl mb-8 p-5 sm:p-6 relative overflow-hidden" style="background:linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); border:1px solid #dc262633;">
        <div class="flex items-baseline justify-between mb-3">
          <div class="text-xs uppercase tracking-[0.3em] font-bold" style="color:#dc2626;">This week · do these first</div>
          <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
            — 3 things across your plan
          </span>
        </div>
        <div class="grid gap-2">
          <a
            v-for="item in heatItems"
            :key="item.key"
            :href="item.href"
            :target="item.external ? '_blank' : undefined"
            :rel="item.external ? 'noopener noreferrer' : undefined"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/80 hover:bg-white transition-all border"
            :style="{ borderColor: item.color + '55' }"
          >
            <span class="w-2 h-2 rounded-full shrink-0 animate-pulse" :style="{ background: item.color }" />
            <span class="font-bold text-sm" style="color:#3b1f0d; font-family:'Playfair Display', serif;">{{ item.label }}</span>
            <span class="text-xs italic hidden sm:inline" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              — {{ item.detail }}
            </span>
            <span class="ml-auto text-xs font-bold" :style="{ color: item.color }">
              <template v-if="item.external">Open ↗</template>
              <template v-else>Go →</template>
            </span>
          </a>
        </div>
      </div>

      <!-- GOALS · long arcs above the horizon. -->
      <div class="mb-10">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Goals · your compass</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              Where you're <em class="italic" style="color:#dc2626;">headed.</em>
            </h2>
          </div>
          <button
            type="button"
            class="text-xs italic hover:underline"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            + Add a goal
          </button>
        </div>

        <div v-if="!goals.length" class="rounded-2xl p-6 text-center border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
          <Target class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            No goals yet. One year, one arc, one reason to keep showing up.
          </p>
        </div>
        <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="g in goals"
            :key="g.id"
            class="rounded-2xl bg-white p-5 border"
            :style="{ borderColor: g.color + '55', boxShadow: '0 1px 0 ' + g.color + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
          >
            <div class="flex items-start gap-3 mb-3">
              <component :is="g.icon" class="w-5 h-5 shrink-0" :style="{ color: g.color, 'stroke-width': 1.5 }" />
              <div class="flex-1 min-w-0">
                <div class="text-base font-bold leading-tight" style="color:#3b1f0d;">
                  {{ g.title }}
                </div>
                <div class="mt-1 text-xs italic" style="color:#5b3a1d; font-family:'Playfair Display', serif;">
                  {{ g.why }}
                </div>
              </div>
            </div>
            <!-- Progress bar -->
            <div class="mt-4">
              <div class="flex items-baseline justify-between mb-1">
                <span class="text-[10px] uppercase tracking-widest font-bold" style="color:#9a5614;">Progress</span>
                <span class="text-xs font-black" :style="{ color: goalProgressColor(g.progress), fontFamily: 'Playfair Display, serif' }">{{ g.progress }}%</span>
              </div>
              <div class="w-full h-2 rounded-full overflow-hidden" style="background:#3b1f0d10;">
                <div class="h-full transition-all" :style="{ width: g.progress + '%', background: goalProgressColor(g.progress) }" />
              </div>
            </div>
            <div v-if="g.nudge" class="mt-3 text-sm" style="font-family:'Caveat', cursive; color:#9a5614; font-size:17px;">
              — {{ g.nudge }}
            </div>
          </div>
        </div>
      </div>

      <!-- YEAR · festivals section header -->
      <div class="mb-4">
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">This year · festivals</div>
        <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          Where you're <em class="italic" style="color:#dc2626;">going.</em>
        </h2>
      </div>

      <!-- Cross-festival summary — the money + urgency crosscut. -->
      <div
        class="rounded-2xl bg-white border p-5 sm:p-6 mb-8"
        style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);"
      >
        <div class="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <div>
            <div class="text-4xl font-black leading-none" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              {{ summary.count }}
            </div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold mt-1" style="color:#9a5614;">
              Festivals this year
            </div>
          </div>
          <div v-if="summary.committed > 0">
            <div class="text-4xl font-black leading-none" style="font-family:'Playfair Display', serif; color:#16a34a;">
              €{{ summary.committed }}
            </div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold mt-1" style="color:#16a34a;">
              Committed
            </div>
          </div>
          <div v-if="summary.pending > 0">
            <div class="text-4xl font-black leading-none" style="font-family:'Playfair Display', serif; color:#5b3a1d;">
              €{{ summary.pending }}
            </div>
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold mt-1" style="color:#5b3a1d;">
              Still owed
            </div>
          </div>
          <div
            v-if="summary.urgentDeadlines > 0"
            class="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold"
            style="background:#dc262618; color:#dc2626; font-family: system-ui, sans-serif;"
          >
            <span class="w-2 h-2 rounded-full animate-pulse" style="background:#dc2626;" />
            {{ summary.urgentDeadlines }} early-bird deadline{{ summary.urgentDeadlines === 1 ? '' : 's' }} this week
          </div>
        </div>
      </div>

      <!-- Year-at-a-glance strip: 12 months, picks fall on their month.
           Elegant substitute for the retired YearCanvas sidebar — no
           side rail, no drawer, just one horizontal scan of the year. -->
      <div class="mb-10">
        <div class="flex items-baseline justify-between mb-3">
          <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Your year at a glance</div>
          <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
            — click a chip to jump
          </span>
        </div>
        <div class="rounded-2xl bg-white p-4 sm:p-5 border overflow-x-auto" style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);">
          <div class="grid grid-cols-12 gap-1 sm:gap-2 min-w-[560px]">
            <div
              v-for="(m, i) in monthsGrid"
              :key="m.label"
              class="flex flex-col items-center"
            >
              <div
                class="text-[10px] uppercase tracking-widest font-bold mb-2"
                :style="{ color: m.entries.length ? '#3b1f0d' : '#9a5614', opacity: m.entries.length ? 1 : 0.5 }"
              >{{ m.label }}</div>
              <!-- Vertical rule for the month -->
              <div class="w-px h-8 sm:h-10" :style="{ background: m.entries.length ? '#3b1f0d33' : '#3b1f0d18' }" />
              <div class="mt-2 flex flex-col gap-1 items-center w-full">
                <a
                  v-for="e in m.entries"
                  :key="e.slug"
                  :href="`#f-${e.slug}`"
                  class="w-full max-w-[64px] px-1.5 py-1 rounded-md text-white text-[9px] font-bold uppercase tracking-wider truncate text-center hover:scale-[1.03] transition-transform"
                  :style="{ background: e.accentColor }"
                  :title="`${e.name} · ${e.dayRange}`"
                >{{ e.short }}</a>
                <div
                  v-if="!m.entries.length && i !== todayMonth"
                  class="w-1.5 h-1.5 rounded-full opacity-25"
                  style="background:#3b1f0d;"
                />
                <div
                  v-if="i === todayMonth && !m.entries.length"
                  class="text-[8px] font-bold uppercase tracking-widest mt-1"
                  style="color:#dc2626; font-family:'Caveat', cursive; font-size:13px; text-transform:none; letter-spacing:normal;"
                >you're here</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Nudges from Discover swipes — "3 friends heading to X, add it?" -->
      <div v-if="activeFestivalNudges.length" class="mb-4 grid gap-2">
        <div
          v-for="n in activeFestivalNudges"
          :key="n.festivalSlug"
          class="rounded-2xl p-4 flex flex-wrap items-center gap-3 bg-white border"
          :style="{ borderColor: n.festivalColor + '55', boxShadow: '0 1px 0 ' + n.festivalColor + '22, 0 6px 18px rgba(59,31,18,0.04)' }"
        >
          <span
            class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
            :style="{ background: n.festivalColor + '18', color: n.festivalColor }"
          >
            <UsersIcon class="w-3 h-3" style="stroke-width:2;" /> {{ n.dancerNames.length }} match{{ n.dancerNames.length === 1 ? '' : 'es' }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-bold" style="color:#3b1f0d;">
              {{ n.dancerNames.slice(0, 3).join(', ') }}<span v-if="n.dancerNames.length > 3"> and {{ n.dancerNames.length - 3 }} more</span> heading to
              <span :style="{ color: n.festivalColor }">{{ n.festivalName }}</span>.
            </div>
            <div class="text-xs italic" style="color:#5b3a1d; font-family:'Playfair Display', serif;">
              Not in your year yet — add it and you'll meet them there.
            </div>
          </div>
          <button
            type="button"
            class="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full text-white whitespace-nowrap"
            :style="{ background: n.festivalColor, boxShadow: '0 3px 0 -1px ' + n.festivalColor + 'CC' }"
            @click="acceptFestivalNudge(n)"
          >
            Add to year
          </button>
          <button
            type="button"
            class="text-xs italic hover:underline shrink-0"
            style="color:#9a5614;"
            @click="dismissFestivalNudge(n)"
          >
            Not this year
          </button>
        </div>
      </div>

      <div class="flex items-baseline justify-between mb-4">
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Picked</div>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ picked.length }} in your year
        </span>
      </div>

      <div class="grid gap-4">
        <div
          v-for="f in picked"
          :id="`f-${f.slug}`"
          :key="f.slug"
          class="rounded-2xl overflow-hidden bg-white border transition-all scroll-mt-20"
          :style="{ borderColor: f.accentColor + '55', boxShadow: '0 1px 0 ' + f.accentColor + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <div class="h-1.5" :style="{ background: f.accentColor }" />

          <!-- CARD HEADER — always visible; click anywhere to toggle. -->
          <button
            type="button"
            class="w-full text-left flex items-start gap-4 p-4 sm:p-5 transition-colors hover:bg-black/[0.015]"
            :aria-expanded="expandedSlugs.has(f.slug)"
            @click="toggleExpanded(f.slug)"
          >
            <!-- Logo -->
            <div class="shrink-0">
              <img
                v-if="f.logo"
                :src="f.logo"
                :alt="f.name"
                class="w-12 h-12 rounded-full shadow-sm"
              >
              <div
                v-else
                class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                :style="{ background: f.accentColor }"
              >
                {{ f.name.charAt(0) }}
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-bold text-lg leading-tight truncate" style="color:#3b1f0d;">
                  {{ f.name }}
                </h3>
                <span
                  class="text-xs shrink-0 mt-1 whitespace-nowrap"
                  :style="{
                    color: daysUntilLabel(f.startDate).urgent ? '#dc2626' : f.accentColor,
                    fontFamily: 'Caveat, cursive',
                    fontSize: '16px',
                  }"
                >
                  — {{ daysUntilLabel(f.startDate).text }}
                </span>
              </div>

              <div class="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                <span class="inline-flex items-center gap-1">
                  <Calendar class="w-3 h-3" style="color:#9a5614;" />
                  {{ formatDateRange(f.startDate, f.endDate) }}
                </span>
                <span class="inline-flex items-center gap-1">
                  <MapPin class="w-3 h-3" style="color:#9a5614;" />
                  {{ f.venue }}, {{ f.location }}
                </span>
              </div>

              <!-- Collapsed summary: progress pips + headline chip.
                   Only rendered when the card is collapsed. -->
              <div
                v-if="!expandedSlugs.has(f.slug)"
                class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <!-- 5-pip progress bar (one pip per toggleable track) -->
                <div class="inline-flex items-center gap-1.5">
                  <span
                    v-for="i in cardSummary(f).totalCount"
                    :key="i"
                    class="w-2 h-2 rounded-full"
                    :style="{ background: i <= cardSummary(f).doneCount ? '#16a34a' : '#3b1f0d22' }"
                  />
                  <span class="ml-1 text-[11px] font-bold" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                    {{ cardSummary(f).doneCount }} of {{ cardSummary(f).totalCount }} ready
                  </span>
                </div>

                <!-- Headline chip: the single most-urgent open track -->
                <span
                  v-if="cardSummary(f).allDone"
                  class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  :style="toneStyle('done')"
                >
                  <Check class="w-3 h-3" style="stroke-width:2.5;" />
                  <span style="font-family: system-ui, sans-serif;">All planned</span>
                </span>
                <span
                  v-else-if="cardSummary(f).headline"
                  class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  :style="toneStyle(cardSummary(f).headline!.state.tone)"
                >
                  <component :is="cardSummary(f).headline!.icon" class="w-3 h-3" style="stroke-width:1.5;" />
                  <span class="font-bold" style="font-family: system-ui, sans-serif;">
                    {{ cardSummary(f).headline!.label }}:
                  </span>
                  <span style="font-family: system-ui, sans-serif;">
                    {{ cardSummary(f).headline!.state.text }}
                  </span>
                </span>
              </div>
            </div>

            <!-- Chevron -->
            <ChevronDown
              class="w-5 h-5 shrink-0 mt-1 transition-transform"
              :style="{
                color: '#9a5614',
                'stroke-width': 1.75,
                transform: expandedSlugs.has(f.slug) ? 'rotate(180deg)' : 'none',
              }"
            />
          </button>

          <!-- EXPANDED PANEL — multi-track detail + footer -->
          <div v-if="expandedSlugs.has(f.slug)" class="px-4 sm:px-5 pb-5">
            <div class="rounded-xl overflow-hidden border" style="border-color:#3b1f0d15;">
              <div
                v-for="(t, i) in tracks(f)"
                :key="t.key"
                class="flex flex-wrap items-center gap-3 px-3 sm:px-4 py-3"
                :class="i > 0 ? 'border-t' : ''"
                :style="{ borderColor: '#3b1f0d0d', background: t.done ? '#16a34a08' : 'white' }"
              >
                <component :is="t.icon" class="w-4 h-4 shrink-0" :style="{ color: t.done ? '#16a34a' : '#9a5614', 'stroke-width': 1.5 }" />
                <div class="w-24 shrink-0 text-sm font-bold" style="color:#3b1f0d;">
                  {{ t.label }}
                </div>
                <span
                  class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  :style="toneStyle(t.state.tone)"
                >
                  <Check v-if="t.done" class="w-3 h-3" style="stroke-width:2.5;" />
                  <span style="font-family: system-ui, sans-serif;">{{ t.state.text }}</span>
                </span>

                <NuxtLink
                  v-if="t.action && !t.action.external"
                  :to="t.action.href"
                  class="text-xs font-bold italic hover:underline ml-auto whitespace-nowrap"
                  :style="{ color: f.accentColor }"
                >
                  {{ t.action.label }} →
                </NuxtLink>
                <a
                  v-else-if="t.action && t.action.external"
                  :href="t.action.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs font-bold italic hover:underline ml-auto inline-flex items-center gap-1 whitespace-nowrap"
                  :style="{ color: f.accentColor }"
                >
                  {{ t.action.label }} <ExternalLink class="w-3 h-3" />
                </a>
                <span v-else class="ml-auto" />

                <a
                  v-if="t.altAction && t.altAction.external"
                  :href="t.altAction.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[10px] italic hover:underline inline-flex items-center gap-0.5 whitespace-nowrap"
                  style="color:#9a5614; font-family:'Playfair Display', serif;"
                >
                  {{ t.altAction.label }} <ExternalLink class="w-2.5 h-2.5" />
                </a>
                <NuxtLink
                  v-else-if="t.altAction"
                  :to="t.altAction.href"
                  class="text-[10px] italic hover:underline whitespace-nowrap"
                  style="color:#9a5614; font-family:'Playfair Display', serif;"
                >
                  {{ t.altAction.label }} →
                </NuxtLink>

                <button
                  v-if="t.toggleKey"
                  type="button"
                  class="text-[10px] font-bold italic hover:underline shrink-0 whitespace-nowrap"
                  style="color:#9a5614;"
                  :aria-pressed="t.done"
                  @click.stop="toggleTrack(f.slug, t.toggleKey)"
                >
                  {{ t.done ? 'Undo' : 'Mark done' }}
                </button>
              </div>
            </div>

            <div class="mt-4 flex items-center gap-4 text-xs">
              <NuxtLink
                :to="`/festivals/${f.slug}`"
                class="italic hover:underline"
                style="color:#5b3a1d; font-family: system-ui, sans-serif;"
              >
                Open festival page →
              </NuxtLink>
              <button
                type="button"
                class="ml-auto italic hover:underline"
                style="color:#9a5614; font-family: system-ui, sans-serif;"
                @click.stop="onRemove(f.slug)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MONTH · Courses. -->
      <div id="courses" class="mt-14">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">This month · courses</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              Where you <em class="italic" style="color:#dc2626;">show up.</em>
            </h2>
          </div>
          <button
            type="button"
            class="text-xs italic hover:underline"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            + Enroll
          </button>
        </div>

        <div v-if="!courses.length" class="rounded-2xl p-6 text-center border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
          <GraduationCap class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            No monthly cadence yet. A weekly class is the quickest way to keep momentum.
          </p>
        </div>
        <div v-else class="grid sm:grid-cols-2 gap-4">
          <div
            v-for="c in courses"
            :key="c.id"
            class="rounded-2xl bg-white p-5 border"
            :style="{ borderColor: c.color + '55', boxShadow: '0 1px 0 ' + c.color + '22, 0 6px 18px rgba(59,31,18,0.04)' }"
          >
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="min-w-0">
                <div class="text-base font-bold leading-tight" style="color:#3b1f0d;">
                  {{ c.school }}
                </div>
                <div class="text-xs mt-0.5" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  {{ c.teacher }} · <span style="color:#9a5614;">{{ c.style }} · {{ c.level }}</span>
                </div>
              </div>
              <span
                class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap"
                :style="c.paidThroughMonth
                  ? { color: '#16a34a', background: '#16a34a18' }
                  : { color: '#dc2626', background: '#dc262618' }"
              >
                {{ c.paidThroughMonth ? 'Paid' : 'Pay due' }}
              </span>
            </div>

            <div class="mt-3 space-y-1.5 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <div class="flex items-center gap-2">
                <Calendar class="w-3 h-3" style="color:#9a5614;" />
                Next class <strong>{{ c.weekday }} {{ c.time }}</strong>
              </div>
              <div class="flex items-center gap-2">
                <MapPin class="w-3 h-3" style="color:#9a5614;" />
                {{ c.venue }}
              </div>
            </div>

            <div class="mt-4">
              <div class="flex items-baseline justify-between mb-1">
                <span class="text-[10px] uppercase tracking-widest font-bold" style="color:#9a5614;">Attendance this cycle</span>
                <span class="text-xs font-black" style="color:#3b1f0d; font-family:'Playfair Display', serif;">{{ c.attended }} / {{ c.total }}</span>
              </div>
              <div class="w-full h-1.5 rounded-full overflow-hidden" style="background:#3b1f0d10;">
                <div class="h-full transition-all" :style="{ width: Math.round((c.attended / c.total) * 100) + '%', background: c.color }" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- WEEK · Socials. -->
      <div id="socials" class="mt-14">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">This week · socials</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              Where you're <em class="italic" style="color:#dc2626;">dancing.</em>
            </h2>
          </div>
          <NuxtLink
            to="/cities/munich"
            class="text-xs italic hover:underline"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            Full week →
          </NuxtLink>
        </div>

        <div v-if="!socials.length" class="rounded-2xl p-6 text-center border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
          <Sparkles class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Pick your city and we'll surface this week's socials here.
          </p>
        </div>
        <div v-else class="rounded-2xl bg-white border overflow-hidden" style="border-color:#3b1f0d22;">
          <div
            v-for="(s, i) in socials"
            :key="s.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3"
            :class="i > 0 ? 'border-t' : ''"
            :style="{ borderColor: '#3b1f0d0d', background: s.rsvpd ? '#16a34a08' : 'white' }"
          >
            <span
              class="w-10 text-center text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              :style="{ background: s.color + '18', color: s.color }"
            >{{ s.dayLabel }}</span>
            <span class="text-sm font-bold" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
              {{ s.time }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold truncate" style="color:#3b1f0d;">{{ s.name }}</div>
              <div class="text-xs truncate" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                {{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span> · {{ s.friendsGoing }} friends going
              </div>
            </div>
            <button
              type="button"
              class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
              :style="s.rsvpd
                ? { background: '#16a34a', color: 'white' }
                : { background: 'white', color: s.color, border: '1.5px solid ' + s.color + '55' }"
              @click="toggleSocialRsvp(s.id)"
            >
              {{ s.rsvpd ? '✓ Going' : 'RSVP' }}
            </button>
          </div>
        </div>
      </div>

      <!-- TONIGHT · Hangouts. -->
      <div id="tonight" class="mt-14">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Tonight · hangouts</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              Who's <em class="italic" style="color:#dc2626;">out.</em>
            </h2>
          </div>
          <span
            class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style="background:#dc262618; color:#dc2626; font-family: system-ui, sans-serif;"
          >
            <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background:#dc2626;" />
            Live
          </span>
        </div>

        <div v-if="!hangouts.length" class="rounded-2xl p-6 text-center border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
          <MoonStar class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Nobody's out yet. Post a dinner, a bar hop, or a ride — dancers show up when someone starts.
          </p>
        </div>
        <div v-else class="rounded-2xl bg-white border overflow-hidden" style="border-color:#3b1f0d22;">
          <div
            v-for="(h, i) in hangouts"
            :key="h.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3"
            :class="i > 0 ? 'border-t' : ''"
            :style="{ borderColor: '#3b1f0d0d', background: h.going ? '#16a34a08' : 'white' }"
          >
            <component :is="hangoutIcon(h.kind)" class="w-4 h-4 shrink-0" :style="{ color: h.color, 'stroke-width': 1.5 }" />
            <span class="text-sm font-bold w-12" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
              {{ h.time }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold truncate" style="color:#3b1f0d;">{{ h.title }}</div>
              <div class="text-xs truncate" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                <span v-if="h.host">{{ h.host }} · </span>
                <span v-if="h.venue">{{ h.venue }} · </span>
                {{ h.people }} in
              </div>
            </div>
            <button
              type="button"
              class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
              :style="h.going
                ? { background: '#16a34a', color: 'white' }
                : { background: 'white', color: h.color, border: '1.5px solid ' + h.color + '55' }"
              @click="toggleHangout(h.id)"
            >
              {{ h.going ? '✓ In' : 'Join' }}
            </button>
          </div>
        </div>
      </div>

      <!-- DISCOVER · widen-your-year deck. -->
      <div id="discover" class="mt-14">
        <div class="flex items-baseline justify-between mb-4">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Widen your year · discover</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              What could <em class="italic" style="color:#dc2626;">rearrange</em> the year?
            </h2>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs italic hover:underline"
            :class="canUndo ? '' : 'opacity-40 pointer-events-none'"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
            @click="undoSwipe"
          >
            <Undo2 class="w-3 h-3" /> Undo
          </button>
        </div>
        <p class="text-sm mb-6 max-w-xl" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          People and places that could pull you somewhere new. Yes = we surface it above. Skip = we won't.
        </p>

        <!-- Deck -->
        <div class="relative mx-auto max-w-md">
          <div v-if="!deckCurrent" class="rounded-2xl p-10 text-center border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
            <Sparkles class="w-10 h-10 mx-auto mb-3" style="color:#9a5614;" />
            <p class="text-lg" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              That's it for this pass.
            </p>
            <p class="mt-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              We'll refresh nightly with more people and places.
            </p>
          </div>

          <div v-else class="relative" style="height: 400px;">
            <!-- Peek: card 3 behind -->
            <div v-if="deckAfter" class="absolute inset-0 rounded-3xl bg-white border" style="transform: scale(0.88) translateY(20px); opacity:0.35; border-color:#3b1f0d22; box-shadow: 0 6px 22px rgba(0,0,0,0.08);" />
            <!-- Peek: card 2 behind -->
            <div v-if="deckNext" class="absolute inset-0 rounded-3xl bg-white border" style="transform: scale(0.94) translateY(10px); opacity:0.65; border-color:#3b1f0d22; box-shadow: 0 6px 22px rgba(0,0,0,0.08);" />
            <!-- Current card — gestures live here -->
            <div
              :key="deckCurrent.id"
              class="absolute inset-0 rounded-3xl bg-white border overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
              :style="{
                borderColor: '#3b1f0d22',
                boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                transform: currentCardTransform(),
                transition: dragActive || cardExitDir ? 'transform 260ms ease-out' : 'transform 220ms ease-out',
              }"
              @pointerdown="onCardPointerDown"
              @pointermove="onCardPointerMove"
              @pointerup="onCardPointerUp"
              @pointercancel="onCardPointerUp"
            >
              <!-- YES / SKIP labels tinted by drag -->
              <div
                class="absolute top-6 left-6 z-10 px-3 py-1 rounded-full border-2 text-sm font-black uppercase tracking-widest pointer-events-none transition-opacity"
                style="color:#dc2626; border-color:#dc2626; transform: rotate(-10deg);"
                :style="{ opacity: Math.min(1, Math.max(0, -dragDx / 100)) }"
              >Skip</div>
              <div
                class="absolute top-6 right-6 z-10 px-3 py-1 rounded-full border-2 text-sm font-black uppercase tracking-widest pointer-events-none transition-opacity"
                style="color:#16a34a; border-color:#16a34a; transform: rotate(10deg);"
                :style="{ opacity: Math.min(1, Math.max(0, dragDx / 100)) }"
              >Yes</div>

              <!-- DANCER CARDS (any of the 3 dancer kinds) -->
              <template v-if="deckCurrent.kind === 'dancer-your-fest' || deckCurrent.kind === 'dancer-new-fest' || deckCurrent.kind === 'dancer-local'">
                <img :src="deckCurrent.photo" :alt="deckCurrent.name" class="w-full h-2/3 object-cover" draggable="false">
                <div class="p-5">
                  <div class="flex items-baseline justify-between gap-3">
                    <div class="text-xl font-black" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
                      {{ deckCurrent.name }}
                    </div>
                    <div class="text-xs italic" style="color:#9a5614; font-family:'Playfair Display', serif;">
                      {{ deckCurrent.city }}
                    </div>
                  </div>
                  <!-- Context chip -->
                  <div v-if="deckCurrent.kind === 'dancer-your-fest'"
                       class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                       :style="{ background: deckCurrent.festivalColor + '18', color: deckCurrent.festivalColor }">
                    <Plane class="w-3 h-3" style="stroke-width:1.5;" />
                    Also going to {{ deckCurrent.festivalName }}
                  </div>
                  <div v-else-if="deckCurrent.kind === 'dancer-new-fest'"
                       class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                       :style="{ background: deckCurrent.festivalColor + '18', color: deckCurrent.festivalColor }">
                    <Plane class="w-3 h-3" style="stroke-width:1.5;" />
                    Going to {{ deckCurrent.festivalName }} — you're not
                  </div>
                  <div v-else-if="deckCurrent.kind === 'dancer-local'"
                       class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                       style="background:#16a34a18; color:#16a34a;">
                    <MapPin class="w-3 h-3" style="stroke-width:1.5;" />
                    Regular at {{ (deckCurrent as any).regularAt }}
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1">
                    <span v-for="st in deckCurrent.danceStyles" :key="st"
                          class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style="background:#3b1f0d0a; color:#5b3a1d;">
                      {{ st }}
                    </span>
                  </div>
                </div>
              </template>

              <!-- EVENT: FESTIVAL -->
              <template v-else-if="deckCurrent.kind === 'event-festival'">
                <div class="h-2/3 p-6 flex flex-col justify-end" :style="{ background: 'linear-gradient(135deg, ' + (deckCurrent as any).color + ', #f97316)' }">
                  <div class="text-[10px] uppercase tracking-widest font-bold text-white/90">Festival · not in your year</div>
                  <div class="mt-1 text-3xl font-black leading-none text-white" style="font-family:'Playfair Display', serif;">
                    {{ deckCurrent.name }}
                  </div>
                </div>
                <div class="p-5">
                  <div class="flex items-center gap-4 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                    <span class="inline-flex items-center gap-1">
                      <Calendar class="w-3 h-3" style="color:#9a5614;" />
                      {{ new Date((deckCurrent as any).dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <MapPin class="w-3 h-3" style="color:#9a5614;" />
                      {{ (deckCurrent as any).venue }}, {{ (deckCurrent as any).city }}
                    </span>
                  </div>
                  <div class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                       style="background:#f59e0b18; color:#f59e0b;">
                    <UsersIcon class="w-3 h-3" style="stroke-width:1.5;" />
                    {{ (deckCurrent as any).friendsGoing }} friends going
                  </div>
                </div>
              </template>

              <!-- EVENT: LOCAL SOCIAL -->
              <template v-else>
                <div class="h-2/3 p-6 flex flex-col justify-end" :style="{ background: 'linear-gradient(135deg, ' + (deckCurrent as any).color + ', #7c3aed)' }">
                  <div class="text-[10px] uppercase tracking-widest font-bold text-white/90">Local · {{ (deckCurrent as any).style }}</div>
                  <div class="mt-1 text-3xl font-black leading-none text-white" style="font-family:'Playfair Display', serif;">
                    {{ deckCurrent.name }}
                  </div>
                </div>
                <div class="p-5">
                  <div class="flex items-center gap-4 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                    <span class="inline-flex items-center gap-1">
                      <Calendar class="w-3 h-3" style="color:#9a5614;" />
                      {{ (deckCurrent as any).dayLabel }} {{ (deckCurrent as any).time }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <MapPin class="w-3 h-3" style="color:#9a5614;" />
                      {{ (deckCurrent as any).venue }}, {{ (deckCurrent as any).city }}
                    </span>
                  </div>
                  <div class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                       style="background:#f59e0b18; color:#f59e0b;">
                    <UsersIcon class="w-3 h-3" style="stroke-width:1.5;" />
                    {{ (deckCurrent as any).friendsGoing }} friends going
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Action buttons -->
          <div v-if="deckCurrent" class="mt-8 flex items-center justify-center gap-6">
            <button
              type="button"
              class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
              style="background:white; border:2px solid #dc262655; color:#dc2626;"
              aria-label="Skip"
              @click="commitSwipe('skip')"
            >
              <X class="w-6 h-6" style="stroke-width:2;" />
            </button>
            <button
              type="button"
              class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
              style="background:white; border:2px solid #f59e0b55; color:#f59e0b;"
              aria-label="Save for later"
              @click="commitSwipe('save')"
            >
              <Star class="w-5 h-5" style="stroke-width:2;" />
            </button>
            <button
              type="button"
              class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
              style="background:white; border:2px solid #16a34a55; color:#16a34a;"
              aria-label="Yes"
              @click="commitSwipe('yes')"
            >
              <Heart class="w-6 h-6" style="stroke-width:2;" />
            </button>
          </div>

          <p v-if="deckCurrent" class="mt-4 text-xs text-center italic" style="color:#9a5614; font-family:'Playfair Display', serif;">
            Drag or use the buttons · {{ deck.length }} left
          </p>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
