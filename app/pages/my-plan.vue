<script setup lang="ts">
/**
 * /my-plan — signed-in dashboard.
 * Shows every festival the user has picked with a next-action nudge.
 * Replaces the per-page CartDrawer as the single source of "what's next".
 * V3 tropical style.
 */
import { ArrowRight, MapPin, Calendar, Search, Ticket, Plane, Home, GraduationCap, Heart, Coffee, CalendarPlus, Check, ExternalLink, ChevronDown } from 'lucide-vue-next'
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
const { yearPlanIds, removeFestival } = useYearPlan()

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
      action: p.ticketBought
        ? null
        : { label: f.ticketFromPrice ? `Buy ${priceText}` : 'Buy', href: f.ticketUrl || `/festivals/${f.slug}`, external: !!f.ticketUrl },
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
    <header class="border-b" style="border-color:#3b1f0d33; background:#fbf5ea;">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-baseline gap-2">
          <span class="font-bold text-lg">WeDance</span>
          <span class="text-[10px] uppercase tracking-[0.25em]" style="color:#9a5614;">Summer Edition · 2026</span>
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/festivals" class="italic hover:underline">Festivals</NuxtLink>
          <NuxtLink to="/cities" class="italic hover:underline">Cities</NuxtLink>
          <NuxtLink to="/for-events" class="italic hover:underline hidden sm:inline">For events</NuxtLink>
          <NuxtLink to="/organizers" class="italic hover:underline hidden sm:inline">For organizers</NuxtLink>
        </nav>
      </div>
    </header>

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

      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          Your festivals
        </h2>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ picked.length }} picked
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
    </section>

    <footer class="border-t py-6 text-center text-xs" style="border-color:#3b1f0d22; color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
      WeDance · <NuxtLink to="/" class="underline">home</NuxtLink> · <NuxtLink to="/festivals" class="underline">festivals</NuxtLink>
    </footer>
  </div>
</template>
