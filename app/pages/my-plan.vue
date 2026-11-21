<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
/**
 * /my-plan — signed-in dashboard: the whole planning cascade.
 * Sections run near → far (RAZ-1006): Your week (a day strip — today's nights,
 * classes and hangouts first, then each day of the coming week) -> Your courses
 * -> Your festivals -> Your goals.
 * Every section uses the V3 tropical style + accordion / compact-list
 * pattern established by the Year cards. Week socials (plan.weekSocials)
 * and the Meet new friends entry (plan.discover; the deck is /meet) are DB-backed.
 */
import { ArrowRight, MapPin, Calendar, Search, Ticket, Plane, Home, GraduationCap, Heart, Coffee, CalendarPlus, Check, ExternalLink, ChevronDown, Target, Sparkles, MoonStar, UtensilsCrossed, GlassWater, Car, X, Users as UsersIcon, Plus } from 'lucide-vue-next'
import type { CityEvent } from '~/types/city'
import { eventLocalDate, eventLocalTime, eventLocalWeekday, eventPhase } from '#shared/utils/eventTime'
import { detectDanceStyle, relatedDanceStyles } from '#shared/dance-styles'
import { WD } from '~/lib/brand'
import { toMeetCards, type MeetCard } from '~/lib/meetDeck'
import { eventPath, festivalPath } from '#shared/utils/eventSlug'
import { weekendKey } from '#shared/utils/weekendShare'
import { citySlug as toCitySlug } from '#shared/utils/citySearch'
import { initialOf } from '#shared/utils/initials'
import { festivalYearLine } from '#shared/utils/festivalYearLine'
import { planView, authPending } from '~/lib/planView'
import { isYearTurn } from '#shared/utils/yearReview'
import { yearShareUrl, type YearStoryFestival } from '#shared/utils/yearStory'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — My plan',
})

const {
  isSignedIn: isSignedInReal,
  dancerId: dancerIdReal,
  dancerName: dancerNameReal,
  city: dancerCityReal,
  danceStyles: dancerStylesReal,
  profilePublic: dancerPublicReal,
  username: dancerUsername,
  onboardedAt: onboardedAtReal,
  justRegistered,
  isLoading: authLoading,
  authHint,
} = useAuth()
const { yearPlanIds, loaded: yearPlanLoaded, removeFestival, toggleFestival, addFestival } = useYearPlan()
// /festivals saves a festival event without festival details in the week plan (RAZ-1003).
const { weekPlanIds } = useWeekPlan()

const route = useRoute()
const { $trpc } = useNuxtApp()

const isSignedIn = isSignedInReal
const dancerName = dancerNameReal
const effectivePickIds = yearPlanIds

// Signed-out state: "Join" opens the modal in register mode, "Sign in" in login
// mode. Once auth lands, isSignedIn flips and the dashboard renders in place.
const authAction = ref<'dashboard' | 'signin'>('dashboard')
const showAuth = ref(false)
function openAuth(action: 'dashboard' | 'signin') {
  authAction.value = action
  showAuth.value = true
}

// What the dashboard holds — shown to signed-out visitors as the promise.


// Personalization from the signed-in profile (via `me`).
const dancerCity = computed(() => dancerCityReal.value || null)
const dancerStyles = computed(() => [...(dancerStylesReal.value || [])])

// Onboarding state: guard banner when signed-in but not onboarded; first-run
// hint right after a fresh signup + onboarding this session.
const isOnboarded = computed(() => !!onboardedAtReal.value)
const needsOnboarding = computed(() => isSignedIn.value && !onboardedAtReal.value)
const showFirstRunHint = computed(() => isSignedIn.value && isOnboarded.value && justRegistered.value)

// Human-readable style list for scoped headings ("Salsa & Bachata in Munich").
const stylesLabel = computed(() => {
  const s = dancerStyles.value
  if (!s.length) return ''
  if (s.length === 1) return s[0]
  if (s.length === 2) return `${s[0]} & ${s[1]}`
  return `${s[0]}, ${s[1]} +${s.length - 2}`
})

// The dancer's city page — every city has one (/cities/[city] is DB-backed).
// plan.weekSocials returns the slug the server resolves via the cities table
// ("München" → munich); until it lands, slug the typed name.
const resolvedCitySlug = ref('')
const dancerCitySlug = computed(() => resolvedCitySlug.value || toCitySlug(dancerCity.value || ''))
// Upcoming classes in the city ("Your first class" list on the city page).
const cityClassesLink = computed(() => dancerCitySlug.value ? `/cities/${dancerCitySlug.value}?taster=1#taster` : '/cities')
// "Full week" → the city's week.
const citySocialsLink = computed(() => dancerCitySlug.value ? `/cities/${dancerCitySlug.value}` : '/cities')

// A festival from the DB is planned by its key (year plan) or, a festival event
// without festival details, by its event id (week plan) — as /festivals saves it
// (RAZ-1003). `href` is its page. Price and the programme are on that page.
type CatalogueEntry = {
  slug: string
  name: string
  startDate: string
  endDate: string
  location: string
  venue: string
  logo: string
  accentColor: string
  workshopCount: number
  ticketUrl: string
  ticketFromPrice?: number
  earlyBirdDeadline?: string
  styles: string[]
  planType?: 'festival' | 'event'
  href?: string
}
const festivalHref = (f: CatalogueEntry) => f.href || festivalPath(f.slug)

// Real festival data from the DB, fetched via plan.myPlan for signed-in users.
// These are the user's actual picked festivals resolved against the festivals table.
const dbFestivals = ref<CatalogueEntry[]>([])

// City and country apart, for the year story's place line and its "countries" count.
const festivalPlaces = ref<Record<string, { city: string; country: string }>>({})

async function loadMyPlanFestivals() {
  try {
    const rows = await $trpc.plan.myPlan.query()
    festivalPlaces.value = Object.fromEntries(rows.map(r => [r.slug, { city: r.location, country: r.country }]))
    dbFestivals.value = rows.map(r => ({
      slug: r.slug,
      name: r.name,
      startDate: r.startDate,
      endDate: r.endDate,
      location: [r.location, r.country].filter(Boolean).join(', '),
      venue: '',
      logo: r.logo,
      accentColor: r.accentColor || WD.purple500,
      workshopCount: r.workshopCount,
      ticketUrl: '',
      ticketFromPrice: undefined as number | undefined,
      earlyBirdDeadline: undefined as string | undefined,
      styles: (r.styles || []) as string[],
      planType: r.planType,
      href: r.href,
    }))
  } catch (err) {
    console.warn('[my-plan] loadMyPlanFestivals failed:', err)
  }
}

const picked = computed(() => {
  // The dancer's festivals from the DB (plan.myPlan). Filtered by the plan
  // stores so a removal shows at once (RAZ-285).
  return dbFestivals.value
    .filter(f => f.planType === 'event' ? weekPlanIds.value.has(f.slug) : effectivePickIds.value.has(f.slug))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
})

// Share your festival year (RAZ-897, moved here from /my-year in RAZ-966): the
// story of the festivals still ahead, in place under "Your festivals" — like the
// weekend story under "This week". Its link opens /my-year?user=<you>.
const yearStoryFestivals = computed<YearStoryFestival[]>(() => picked.value
  .filter(f => eventPhase(f.startDate, f.endDate) !== 'past')
  .map(f => ({
    name: f.name,
    startDate: f.startDate,
    endDate: f.endDate,
    location: festivalPlaces.value[f.slug]?.city ?? f.location,
    country: festivalPlaces.value[f.slug]?.country ?? '',
    styles: f.styles ?? [],
  })))
const yearShareLink = ref('')
onMounted(() => { yearShareLink.value = yearShareUrl(window.location.origin, dancerUsername.value, dancerIdReal.value) })
watch([dancerUsername, dancerIdReal], () => {
  if (import.meta.client) yearShareLink.value = yearShareUrl(window.location.origin, dancerUsername.value, dancerIdReal.value)
})

// Nothing is added to a plan without the dancer's own action.

function onRemove(slug: string) {
  if (dbFestivals.value.find(f => f.slug === slug)?.planType === 'event') removeWeekEvent(slug)
  else removeFestival(slug)
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

function daysUntilLabel(dateStr: string, endStr?: string | null) {
  // "Happened" only once the last day is over, never from the start alone (RAZ-893).
  const phase = eventPhase(dateStr, endStr)
  if (phase === 'past') return { text: 'Happened', urgent: false }
  if (phase === 'on') return { text: 'On now', urgent: true }
  const now = new Date()
  const target = new Date(dateStr)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return { text: 'Today', urgent: true }
  if (diff === 1) return { text: 'Tomorrow', urgent: true }
  if (diff <= 7) return { text: `In ${diff} days`, urgent: true }
  if (diff <= 30) return { text: `In ${diff} days`, urgent: false }
  if (diff <= 60) return { text: `In ${Math.ceil(diff / 7)} weeks`, urgent: false }
  return { text: `In ${Math.ceil(diff / 30)} months`, urgent: false }
}

onMounted(() => {
  // Fetch hangouts and city events for signed-in users with a city
  if (isSignedIn.value && dancerCity.value) {
    fetchHangouts()
    loadCityEvents()
  }
  // Load persisted goals, enrolled courses, socials, and festivals from DB
  if (isSignedIn.value) loadOwnPlan()
})

// Signed in on this page (the Join / Sign in modal): load the plan now — the
// onMounted load above only runs for a session that was already there.
watch(isSignedInReal, (signedIn) => {
  if (signedIn) loadOwnPlan()
  else ownPlanLoaded.value = false
})

// RAZ-890: the plan only arrives after hydration, so until every query that
// fills it has settled the page shows a loading state — never "You haven't
// picked anything yet" for a dancer whose plan is simply still in flight.
const ownPlanLoaded = ref(false)
function loadOwnPlan() {
  loadGoalsFromDb()
  loadDiscoverDeck()
  loadChatgptConnection()
  return Promise.all([loadCoursesFromDb(), loadWeekSocials(), loadMyPlanFestivals()])
    .finally(() => { ownPlanLoaded.value = true })
}
// "WeDance in ChatGPT" sits at the top of the plan until the dancer has
// connected the ChatGPT app (an OAuth grant from an OpenAI client), then it
// shrinks to one line at the bottom. "Hide for now" is per browser.
const chatgptConnected = ref<boolean | null>(null)
const CHATGPT_HIDE_KEY = 'wd:my-plan:chatgpt-hidden'
const chatgptHidden = ref(false)
async function loadChatgptConnection() {
  try { chatgptHidden.value = localStorage.getItem(CHATGPT_HIDE_KEY) === '1' } catch { /* storage blocked */ }
  try {
    const rows = await $trpc.oauth.connections.query()
    chatgptConnected.value = rows.some(r => /openai|chatgpt/i.test(`${r.app.name} ${r.app.uri ?? ''} ${r.app.domain ?? ''}`))
  } catch {
    chatgptConnected.value = false
  }
}
function hideChatgptPitch() {
  chatgptHidden.value = true
  try { localStorage.setItem(CHATGPT_HIDE_KEY, '1') } catch { /* storage blocked */ }
}
const showChatgptPitch = computed(() => !chatgptHidden.value && chatgptConnected.value === false)

// Your year in dance (RAZ-966): a banner at the top around the turn of the
// year (December, January) for signed-in dancers; a quiet link the rest of it.
const showYearReviewBanner = computed(() => isSignedIn.value && isYearTurn() && viewState.value !== 'loading')

const viewState = computed(() => planView({
  signedIn: isSignedIn.value,
  authPending: authPending({ server: import.meta.server, hasHint: !!authHint.value, authLoading: authLoading.value }),
  loaded: ownPlanLoaded.value && yearPlanLoaded.value,
  empty: picked.value.length === 0 && courses.value.length === 0 && socials.value.length === 0,
}))

// Refetch hangouts and city events when city changes
watch(() => dancerCity.value, () => {
  // The old city's slug no longer applies; weekSocials re-resolves the new one
  // (and refetches city events if it differs from the typed-name guess).
  resolvedCitySlug.value = ''
  if (isSignedIn.value && dancerCity.value) {
    fetchHangouts()
    loadCityEvents()
    loadWeekSocials()
  }
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

const progressStore = ref<Record<string, Progress>>({})

function persistProgress() {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progressStore.value)) } catch { /* quota */ }
}

onMounted(async () => {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) progressStore.value = JSON.parse(raw)
  } catch { /* corrupt payload — will be overwritten on next toggle */ }

  // Sync ticket status from backend — a purchased ticket overrides localStorage
  if (isSignedIn.value) {
    try {
      const paidSlugs = await $trpc.festivalSignup.myTickets.query()
      for (const slug of paidSlugs) {
        const current = progressStore.value[slug] ?? {}
        if (!current.ticketBought) {
          progressStore.value = {
            ...progressStore.value,
            [slug]: { ...current, ticketBought: true },
          }
        }
      }
      persistProgress()
    } catch { /* non-critical — local state is the fallback */ }
  }
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
  persistProgress()
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
  onAction?: () => void    // When set, action renders as a button (calls this) instead of a link
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
        : { label: f.ticketFromPrice ? `Buy ${priceText}` : 'Buy', href: `${festivalHref(f)}#tickets`, external: false },
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
      action: p.travelBooked ? null : { label: rideOpenSlugs.value.has(f.slug) ? 'Close rides' : 'Find a ride', href: '#', external: false },
      onAction: p.travelBooked ? undefined : () => toggleRidePanel(f.slug),
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
      action: p.stayBooked ? null : { label: 'Share a room', href: `${festivalHref(f)}#activities`, external: false },
      altAction: p.stayBooked ? undefined : { label: 'or hotel', href: staysLink(f), external: true },
      toggleKey: 'stayBooked',
      done: !!p.stayBooked,
    },
    // Workshops
    {
      key: 'workshops',
      icon: GraduationCap,
      label: 'Workshops',
      state: { text: f.workshopCount ? `${f.workshopCount} on the schedule` : 'Pick them on the schedule', tone: 'todo' as const },
      action: { label: 'Browse workshops', href: `${festivalHref(f)}#schedule`, external: false },
      done: false,
    },
    // Partner
    {
      key: 'partnerFound',
      icon: Heart,
      label: 'Partner',
      state: p.partnerFound ? { text: 'Matched', tone: 'done' } : { text: 'Not looking yet', tone: 'todo' },
      action: p.partnerFound ? null : { label: 'Find one', href: `${festivalHref(f)}#discover`, external: false },
      toggleKey: 'partnerFound',
      done: !!p.partnerFound,
    },
    // Community (dinners, rides, roommate)
    {
      key: 'community',
      icon: Coffee,
      label: 'Community',
      state: { text: 'Rides, dinners, roommate', tone: 'muted' },
      action: { label: 'Browse', href: `${festivalHref(f)}#activities`, external: false },
      done: false,
    },
  ]
}

// -----------------------------------------------------------------------
// Cross-festival summary (the line under "Your festivals"). Real math, no invented totals.
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
  if (tone === 'done')   return { color: WD.green600, background: (WD.green600 + '18') }
  if (tone === 'urgent') return { color: WD.red600, background: (WD.red600 + '18') }
  if (tone === 'muted')  return { color: WD.amber600, background: (WD.amber600 + '18') }
  return { color: WD.brown700, background: (WD.brown900 + '0a') }
}

// -----------------------------------------------------------------------
// Accordion — collapsed by default; click any card header to expand.
// -----------------------------------------------------------------------
const expandedSlugs = ref<Set<string>>(new Set())

// Which festivals have the "Find a ride" panel open (toggled from the Travel track).
const rideOpenSlugs = ref<Set<string>>(new Set())

function toggleRidePanel(slug: string) {
  const s = new Set(rideOpenSlugs.value)
  if (s.has(slug)) s.delete(slug); else s.add(slug)
  rideOpenSlugs.value = s
}

function toggleExpanded(slug: string) {
  const s = new Set(expandedSlugs.value)
  if (s.has(slug)) s.delete(slug); else s.add(slug)
  expandedSlugs.value = s
}

// -----------------------------------------------------------------------
// GOALS · long arcs above the year, stored on the dancer's plan.
// -----------------------------------------------------------------------
const { goals: dbGoals, addGoal, removeGoal, updateGoal, hasGoal, loadFromDb: loadGoalsFromDb } = useGoals()

const goalsList = computed(() => {
  return dbGoals.value.map(g => ({
    id: g.id,
    title: g.title,
    why: g.why,
    progress: g.progress,
    style: g.style,
    nudge: undefined as string | undefined,
    icon: Target,
    color: WD.amber600,
  }))
})

// Resolve a goal's effective style: explicit tag, or auto-detect from title.
function goalEffectiveStyle(g: { title: string; style: string }): string {
  if (g.style) return g.style
  return detectDanceStyle(g.title)?.name || ''
}

// Map from dance style → goal titles that target it.
const goalsByStyle = computed(() => {
  const map = new Map<string, string[]>()
  for (const g of goalsList.value) {
    const s = goalEffectiveStyle(g)
    if (!s) continue
    const list = map.get(s) || []
    list.push(g.title)
    map.set(s, list)
  }
  return map
})

// Check if any goal targets a given dance style.
function goalsForStyle(style: string): string[] {
  if (!style) return []
  // A 'Salsa NY' goal is served by a 'Salsa' festival and vice versa.
  return [...goalsByStyle.value].filter(([s]) => relatedDanceStyles(s, style)).flatMap(([, titles]) => titles)
}

// Inline add-goal form state.
const showGoalForm = ref(false)
const goalFormTitle = ref('')
const goalFormWhy = ref('')
const goalFormStyle = ref('')
// The picker speaks string[]; a goal has at most one style.
const goalFormStyles = computed({
  get: () => (goalFormStyle.value ? [goalFormStyle.value] : []),
  set: (v: string[]) => { goalFormStyle.value = v[0] ?? '' },
})
const goalFormError = ref('')

// Progress editing state.
const editingProgressGoalId = ref<string | null>(null)

watch(goalFormTitle, () => { goalFormError.value = '' })

async function onGoalSubmit() {
  const t = goalFormTitle.value.trim()
  if (!t) return
  if (hasGoal(t)) {
    goalFormError.value = 'You already have this goal'
    return
  }
  const w = goalFormWhy.value.trim()
  const s = goalFormStyle.value
  goalFormTitle.value = ''
  goalFormWhy.value = ''
  goalFormStyle.value = ''
  goalFormError.value = ''
  showGoalForm.value = false
  await addGoal(t, w, s)
}
function onGoalCancel() {
  goalFormTitle.value = ''
  goalFormWhy.value = ''
  goalFormStyle.value = ''
  showGoalForm.value = false
}

async function onProgressChange(goalId: string, value: number) {
  await updateGoal(goalId, { progress: value })
}
function startEditingProgress(goalId: string) {
  editingProgressGoalId.value = goalId
}
function stopEditingProgress() {
  editingProgressGoalId.value = null
}

// -----------------------------------------------------------------------
// COURSES · monthly cadence: school + teacher + level + next class.
// -----------------------------------------------------------------------
type Course = {
  /** The plan item's event id — what the X removes. */
  id: string
  /** Signed up on the event page (RAZ-1003): no Remove — cancelling the spot happens there. */
  signedUp?: boolean
  /** What signing up costs ("€10"); null = free. */
  price?: string | null
  /** A night's programme (RAZ-1007): your pass, when to come, the parts you're at. */
  night?: { pass: string | null; arrival: string | null; parts: string[] } | null
  /** The next class's event (the card links there; "where it's edited"). */
  eventId?: string
  name?: string
  school: string; schoolUsername?: string | null
  teacher: string; style: string; level: string
  weekday: string; time: string; venue: string
  nextClassDate: string
  /** Payment / attendance only when the enrolment actually has them. */
  attended?: number; total?: number
  paidThroughMonth?: boolean
  color: string
}
const courses = ref<Course[]>([])

// Enrollment picker — shows available classes from real DB events.
const showEnrollPicker = ref(false)
const WEEKDAY_SHORT_ENROLL: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }
const STYLE_COLORS_ENROLL: Record<string, string> = { Salsa: WD.red600, Bachata: WD.violet600, Kizomba: WD.pink500, Timba: WD.cyan600 }

// v3 event type → CityEvent type mapping (same as city page).
const EVENT_TYPE_MAP: Record<string, string> = { Course: 'class', Workshop: 'workshop', Party: 'social', Concert: 'social', Show: 'social' }

// Real upcoming events for the user's city, loaded from DB.
const realCityEvents = ref<CityEvent[]>([])
async function loadCityEvents() {
  const citySlug = dancerCitySlug.value
  if (!citySlug) return
  try {
    const rows = await $trpc.events.byCity.query({ citySlug })
    realCityEvents.value = rows
      .filter((e: any) => !e.isFestival)
      .map((e: any) => ({
        id: e.id,
        name: e.name || 'Event',
        type: (EVENT_TYPE_MAP[e.type] || 'social') as CityEvent['type'],
        style: (e.styles as string[])?.[0] || '',
        day: eventLocalWeekday(e.startDate, e.timezone) as CityEvent['day'],
        time: eventLocalTime(e.startDate, e.timezone),
        duration: e.endDate ? Math.round((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / 60000) : 0,
        venue: e.venueName || '',
        address: e.venueAddress || '',
        organizer: e.organizerName || '',
        organizerId: e.organizerUsername || undefined,
        level: undefined,
        accentColor: WD.red600,
        attendeeCount: 0,
        recurring: false,
        date: eventLocalDate(e.startDate, e.timezone),
      } as CityEvent))
  } catch (err) {
    console.warn('[my-plan] loadCityEvents failed:', err)
  }
}

const todayISO = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

// 'YYYY-MM-DD' → 'Mon Oct 13' (human-readable short date).
function formatShortDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00Z`)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Upcoming classes in the dancer's city.
const availableClasses = computed(() => {
  const enrolledIds = new Set(courses.value.flatMap(c => [c.id, c.eventId].filter(Boolean) as string[]))
  return realCityEvents.value
    .filter(e => e.type === 'class' && !enrolledIds.has(e.id))
    .filter(e => !e.date || e.date >= todayISO.value)
})

async function enrollClass(e: CityEvent) {
  useTrack().track('week_plan_add', { event_id: e.id, source: 'enroll_picker' })
  try {
    await $trpc.plan.add.mutate({ itemType: 'event', itemId: e.id, metadata: { type: 'class' } })
    await loadCoursesFromDb()
  } catch (err) {
    console.warn('[my-plan] enrollCourse failed:', err)
  }
  if (availableClasses.value.length === 0) showEnrollPicker.value = false
}

/** X = out of the plan, server-side; the card stays gone after a reload. */
async function unenrollCourse(id: string) {
  const before = courses.value
  courses.value = courses.value.filter(c => c.id !== id)
  try {
    await $trpc.plan.remove.mutate({ itemType: 'event', itemId: id })
    useTrack().track('week_plan_remove', { event_id: id, source: 'my_plan_course' })
  } catch (err) {
    console.warn('[my-plan] unenrollCourse failed:', err)
    courses.value = before
  }
}

// The dancer's courses: class plan items backed by real events (plan.myCourses).
async function loadCoursesFromDb() {
  if (!isSignedIn.value) return
  try {
    const { courses: rows } = await $trpc.plan.myCourses.query()
    courses.value = rows.map((c) => {
      const tz = c.timezone || undefined
      const style = c.styles[0] || ''
      return {
        id: c.planItemId,
        eventId: c.eventId,
        name: c.name,
        school: c.organizerName,
        schoolUsername: c.organizerUsername,
        teacher: '',
        style,
        level: '',
        weekday: WEEKDAY_SHORT_ENROLL[eventLocalWeekday(c.startDate, tz)] || '',
        time: eventLocalTime(c.startDate, tz),
        venue: c.venueName,
        nextClassDate: eventLocalDate(c.startDate, tz),
        color: STYLE_COLORS_ENROLL[style] || WD.gray500,
        signedUp: c.signedUp,
        price: c.price,
      }
    })
  } catch (err) {
    console.warn('[my-plan] loadCoursesFromDb failed:', err)
  }
}

// -----------------------------------------------------------------------
// SOCIALS · "This week": ONLY the events the dancer put in their
// plan (plan.weekSocials — RSVPs from the city/event pages, discover Yes…)
// happening in the next 7 days. No suggestions here; discovery is "Full week".
// -----------------------------------------------------------------------
type Social = {
  /** A course's or workshop's class (RAZ-1006): shown on its day, managed under Your courses. */
  isClass?: boolean
  /** Signed up on the event page (RAZ-1003): not a plain plan toggle here. */
  signedUp?: boolean
  /** Only planned, and the event takes a sign-up: "Planned · Sign up →". */
  takesSignup?: boolean
  /** What signing up costs ("€10"); null = free. */
  price?: string | null
  /** The occurrence shown this week. */
  id: string
  /** The plan item's event id (differs for a recurring event added on another date). */
  planItemId: string
  name: string; dayLabel: string; dateISO: string; time: string
  venue: string; city: string; style: string
  friendsGoing: number
  color: string
}
const socials = ref<Social[]>([])
const weekSocialsLoaded = ref(false)

/** 'YYYY-MM-DD' → 'Sat 18 Oct' for the day chip's second line. */
function shortDayDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00Z`)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

// Share my weekend (#527, RAZ-895): the story for this week's parties, in place under
// "This week". Its link (/w/<code>) is made — or the same one reused, see
// `weekend.share` — when the list loads, and again when the set of parties changes.
type WeekendPlan = NonNullable<Awaited<ReturnType<typeof $trpc.weekend.get.query>>>
const weekendPlan = ref<WeekendPlan | null>(null)
const shareWeekendError = ref('')
let weekendFor = ''
let weekendTimer: ReturnType<typeof setTimeout> | undefined
async function loadWeekendStory(key: string) {
  try {
    const r = await $trpc.weekend.share.mutate({ surface: 'my_plan' })
    const p = await $trpc.weekend.get.query({ code: r.code })
    if (key !== weekendFor) return // the plan changed meanwhile: the newer load wins
    weekendPlan.value = p
    shareWeekendError.value = ''
  } catch (e: any) {
    if (key !== weekendFor) return
    weekendPlan.value = null
    shareWeekendError.value = e?.message || 'Could not make your story — try again later.'
  }
}

/** How far ahead the plan feed reaches: My plan's Month tab (RAZ-1006). */
const MONTH_DAYS = 30
async function loadWeekSocials() {
  if (!isSignedIn.value) return
  try {
    // One feed for Today, Week and Month: the next 30 days, every class of a course included.
    const { socials: rows, citySlug } = await $trpc.plan.weekSocials.query({ days: MONTH_DAYS })
    const guessed = dancerCitySlug.value
    resolvedCitySlug.value = citySlug || ''
    // The typed name slugged differently ("münchen") — refetch with the real slug.
    if (dancerCitySlug.value && dancerCitySlug.value !== guessed) loadCityEvents()
    socials.value = rows.map((e) => {
      const tz = e.timezone || undefined
      const style = e.styles[0] || e.type || ''
      return {
        id: e.id,
        name: e.name,
        dayLabel: (WEEKDAY_SHORT_ENROLL[eventLocalWeekday(e.startDate, tz)] || ''),
        dateISO: eventLocalDate(e.startDate, tz),
        time: eventLocalTime(e.startDate, tz),
        venue: e.venueName,
        city: e.city,
        style,
        friendsGoing: e.friendsGoing,
        planItemId: e.planItemId,
        color: STYLE_COLORS_ENROLL[style] || WD.gray500,
        signedUp: e.signedUp,
        takesSignup: e.takesSignup,
        price: e.price,
        night: e.night,
        isClass: e.isClass,
      }
    })
  } catch (err) {
    console.warn('[my-plan] loadWeekSocials failed:', err)
  } finally {
    weekSocialsLoaded.value = true
  }
}


// The server sends the next MONTH_DAYS days; drop anything that has started since the page loaded.
const upcomingSocials = computed(() =>
  socials.value
    .filter(s => !s.dateISO || s.dateISO >= todayISO.value)
    .sort((a, b) => (a.dateISO + a.time).localeCompare(b.dateISO + b.time)),
)
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isoPlus = (from: string, days: number) => { const d = new Date(`${from}T12:00:00`); d.setDate(d.getDate() + days); return isoDate(d) }
// Week = today and the next six days (as the city page's week and the weekend story).
const weekPlans = computed(() => upcomingSocials.value.filter(s => !s.dateISO || s.dateISO < isoPlus(todayISO.value, 7)))
// The nights out this week — what the weekend story and its link are about (classes stay off it).
const upcomingNights = computed(() => weekPlans.value.filter(s => !s.isClass))

watch(
  () => (isSignedIn.value && weekSocialsLoaded.value ? weekendKey(upcomingNights.value.map(x => x.id)) : ''),
  (key) => {
    if (key === weekendFor) return
    weekendFor = key
    clearTimeout(weekendTimer)
    if (!key) { weekendPlan.value = null; shareWeekendError.value = ''; return }
    // A short wait: removing two parties in a row makes one link, not two.
    weekendTimer = setTimeout(() => loadWeekendStory(key), 600)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(weekendTimer))

// Old "Bring friends" landed on #socials (RAZ-974). "Tell your story" (RAZ-1010)
// lands on the story itself: #share-week / #share-year. Scroll once the list is in.
const PLAN_ANCHOR: Record<string, string> = {
  '#socials': 'socials',
  '#share-week': 'share-week',
  '#share-year': 'share-year',
}
function scrollPlanAnchor() {
  if (!import.meta.client) return
  const id = PLAN_ANCHOR[route.hash]
  if (!id) return
  nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }))
}
watch(weekSocialsLoaded, (loaded) => { if (loaded) scrollPlanAnchor() }, { immediate: true })
watch(yearStoryFestivals, () => { if (route.hash === '#share-year') scrollPlanAnchor() })

const { removeEvent: removeWeekEvent, addEvent: addWeekEvent } = useWeekPlan()

// Last row taken out of the plan — the list offers a one-tap Undo for it.
const removedSocial = ref<Social | null>(null)

/** "✓ My plan" off = out of the plan; the row leaves the list (Undo puts it back). */
function removeSocialFromPlan(id: string) {
  const s = socials.value.find(x => x.id === id)
  if (!s) return
  socials.value = socials.value.filter(x => x.id !== id)
  removedSocial.value = s
  removeWeekEvent(s.planItemId)
}

function undoRemoveSocial() {
  const s = removedSocial.value
  if (!s) return
  removedSocial.value = null
  socials.value = [...socials.value, s].sort((a, b) => (a.dateISO + a.time).localeCompare(b.dateISO + b.time))
  addWeekEvent(s.planItemId)
}

// -----------------------------------------------------------------------
// TONIGHT · spontaneous evening — dinners, bar hops, rides.
// -----------------------------------------------------------------------
type HangoutEvent = { id: string; name: string; startDate: string | null; timezone: string | null }
type Hangout = {
  id: string; kind: 'dinner' | 'bar' | 'ride' | 'floor' | 'coffee'
  title: string; time: string; host?: string; venue?: string; placeAddress?: string
  people: number; going: boolean
  color: string; mine: boolean
  /** The dance night it belongs to — linked on the row. */
  event?: HangoutEvent | null
  /** That event is in my plan — these rows come first. */
  inMyPlan?: boolean
}

// Color map for hangout kinds
const hangoutColors: Record<string, string> = {
  dinner: WD.amber500,
  coffee: WD.green600,
  floor: WD.red600,
  bar: WD.purple500,
  ride: WD.cyan600,
}

const hangouts = ref<Hangout[]>([])
const loadingHangouts = ref(false)
const userRsvpedHangouts = ref<Set<string>>(new Set())

// Fetch tonight's hangouts from backend
async function fetchHangouts() {
  if (!isSignedIn.value || !dancerCity.value) return

  loadingHangouts.value = true
  try {
    // The server resolves a typed city name ("München") to its slug.
    const result = await $trpc.hangouts.listTonight.query({ citySlug: dancerCity.value })
    const currentDancerId = dancerIdReal.value

    hangouts.value = (result as any[]).map((h: any) => ({
      id: h.id,
      kind: h.kind,
      title: h.title,
      time: h.time,
      host: h.host,
      venue: h.venue,
      placeAddress: h.placeAddress || undefined,
      event: h.event,
      inMyPlan: !!h.inMyPlan,
      people: h.rsvpCount || 0,
      going: h.rsvps?.includes(currentDancerId) || false,
      color: hangoutColors[h.kind] || WD.brown900,
      mine: h.dancerId === currentDancerId,
    }))

    // Track which hangouts user has RSVPed to
    userRsvpedHangouts.value = new Set((result as any[]).filter((h: any) => h.rsvps?.includes(currentDancerId)).map((h: any) => h.id))
  } catch (error) {
    console.error('Failed to fetch hangouts:', error)
  } finally {
    loadingHangouts.value = false
  }
}

async function toggleHangout(id: string) {
  try {
    const res = await $trpc.hangouts.toggleRsvp.mutate({ hangoutId: id })
    useTrack().track('hangout_rsvp', { going: !!res?.rsvpd, surface: 'my_plan', hangout_id: id })

    // Update local state
    const wasGoing = userRsvpedHangouts.value.has(id)
    if (wasGoing) {
      userRsvpedHangouts.value.delete(id)
    } else {
      userRsvpedHangouts.value.add(id)
    }

    // Update the hangout in the list
    hangouts.value = hangouts.value.map(h =>
      h.id === id ? { ...h, going: !h.going } : h
    )
  } catch (error: any) {
    hangoutError.value = `Could not toggle RSVP: ${error?.message || 'unknown error'}`
  }
}
const hangoutIcon = (kind: Hangout['kind']) => kind === 'dinner' ? UtensilsCrossed : kind === 'coffee' ? Coffee : kind === 'bar' ? GlassWater : kind === 'ride' ? Car : MoonStar

// Create-hangout form state
const showHangoutForm = ref(false)
type NewHangout = { kind: 'dinner' | 'bar' | 'ride' | 'floor' | 'coffee'; title: string; time: string; venue: string; eventId: string }
const emptyHangout = (): NewHangout => ({ kind: 'dinner', title: '', time: '20:00', venue: '', eventId: '' })
const newHangout = ref<NewHangout>(emptyHangout())
// The place picked from Google autocomplete (null = typed text or nothing).
const newHangoutPlace = ref<{ placeId: string; name: string; address: string; lat: number | null; lng: number | null } | null>(null)

// Events a hangout can belong to: mine tonight first, then the rest tonight.
type EventOption = { id: string; name: string | null; startDate: string | null; timezone: string | null; venueName: string | null }
const hangoutEventOptions = ref<{ inPlan: EventOption[]; others: EventOption[] }>({ inPlan: [], others: [] })
function eventOptionLabel(e: EventOption) {
  const t = e.startDate ? eventLocalTime(e.startDate, e.timezone || undefined) : ''
  return [t, e.name || 'Event', e.venueName ? `· ${e.venueName}` : ''].filter(Boolean).join(' ')
}
const pickedHangoutEvent = computed(() =>
  [...hangoutEventOptions.value.inPlan, ...hangoutEventOptions.value.others].find(e => e.id === newHangout.value.eventId) ?? null,
)
async function openHangoutForm() {
  showHangoutForm.value = !showHangoutForm.value
  if (!showHangoutForm.value || !dancerCity.value) return
  try {
    hangoutEventOptions.value = await $trpc.hangouts.eventOptions.query({ citySlug: dancerCity.value })
    // Default to the dancer's own (first) planned event tonight.
    if (!newHangout.value.eventId && hangoutEventOptions.value.inPlan[0]) newHangout.value.eventId = hangoutEventOptions.value.inPlan[0].id
  } catch (err) {
    console.warn('[my-plan] hangout event options failed:', err)
  }
}
const creatingHangout = ref(false)
const hangoutError = ref('')

async function createHangout() {
  if (!newHangout.value.title.trim()) return
  hangoutError.value = ''
  creatingHangout.value = true
  try {
    const place = newHangoutPlace.value
    const venue = newHangout.value.venue.trim()
    await $trpc.hangouts.create.mutate({
      kind: newHangout.value.kind,
      title: newHangout.value.title.trim(),
      time: newHangout.value.time,
      // Empty + an event picked → the server uses the event's venue.
      venue: venue || undefined,
      ...(place && venue ? { placeId: place.placeId, placeAddress: place.address || undefined, placeLat: place.lat ?? undefined, placeLng: place.lng ?? undefined } : {}),
      citySlug: dancerCity.value || 'munich',
      eventId: newHangout.value.eventId || undefined,
    })
    useTrack().track('hangout_created', { kind: newHangout.value.kind, surface: 'my_plan', city: dancerCity.value || null, event_linked: !!newHangout.value.eventId })
    showHangoutForm.value = false
    newHangout.value = emptyHangout()
    newHangoutPlace.value = null
    await fetchHangouts()
  } catch (error: any) {
    const msg = error?.message || ''
    if (msg.includes('UNAUTHORIZED') || msg.includes('Not signed in')) {
      hangoutError.value = 'Your session expired. Please sign out and sign in again.'
    } else if (msg.includes('Failed query') || msg.includes('insert into')) {
      hangoutError.value = 'Could not create hangout. Please try again later.'
    } else {
      hangoutError.value = msg || 'Something went wrong. Please try again.'
    }
  } finally {
    creatingHangout.value = false
  }
}

async function closeHangout(id: string) {
  try {
    await $trpc.hangouts.close.mutate({ id })
    hangouts.value = hangouts.value.filter(h => h.id !== id)
  } catch (error) {
    console.error('Failed to close hangout:', error)
  }
}

// -----------------------------------------------------------------------
// SECTION SUMMARIES · the line under each time-scale headline. The page runs
// near → far (Today, Week, Month, Year tabs); what
// needs doing (an early-bird, an unpaid course, an open invite) sits on its
// own row in that section, not in a strip at the top.
// -----------------------------------------------------------------------
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const weekSummary = computed(() => {
  const n = upcomingNights.value.length
  const c = weekPlans.value.length - n
  const where = dancerCity.value ? ` in ${dancerCity.value}` : ''
  if (!n && !c) return `No nights picked yet${where}`
  // Planned, not signed up yet (RAZ-1003): say there's still something to do.
  const toDecide = upcomingNights.value.filter(s => s.takesSignup && !s.signedUp).length
  return [
    n ? `${plural(n, 'night')} out${where}` : '',
    c ? plural(c, 'class', 'classes') : '',
    toDecide ? `${toDecide} to book` : '',
  ].filter(Boolean).join(' · ')
})
const coursesSummary = computed(() => {
  const n = courses.value.length
  if (!n) return 'Weekly classes you’re enrolled in'
  const unpaid = courses.value.filter(c => c.paidThroughMonth === false).length
  return [plural(n, 'course'), unpaid ? `${unpaid} to pay this month` : 'each class also shows on its day'].filter(Boolean).join(' · ')
})
const nightsAndClasses = (list: Social[]) => {
  const n = list.filter(s => !s.isClass).length
  const c = list.length - n
  return [n ? `${plural(n, 'night')} out` : '', c ? plural(c, 'class', 'classes') : ''].filter(Boolean).join(' · ')
}

// -----------------------------------------------------------------------
// ZOOM TABS (RAZ-1006): Today / Week / Month / Year. Each tab holds everything in its span, of every
// kind — a Sunday class is in Today on Sunday, in Week and in Month. Today = tonight's nights and
// classes, each with the hangouts posted for it, then the other hangouts tonight; Week = the next
// seven days; Month = the next 30 days plus Your courses; Year = Your festivals and Your goals.
// Old anchors (#tonight, #socials, #courses, #festivals, #goals) open their tab.
// #share-week and #share-year are "Tell your story" (RAZ-1010) and also scroll to the story.
// -----------------------------------------------------------------------
type Zoom = 'today' | 'week' | 'month' | 'year'
const ZOOM_TABS: { id: Zoom; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' },
]
const ZOOM_HASH: Record<string, Zoom> = {
  '#today': 'today', '#tonight': 'today',
  '#week': 'week', '#socials': 'week', '#share-week': 'week',
  '#month': 'month', '#courses': 'month',
  '#year': 'year', '#festivals': 'year', '#goals': 'year', '#share-year': 'year',
}
const zoom = ref<Zoom>(ZOOM_HASH[route.hash] ?? 'today')
watch(() => route.hash, (h) => { if (ZOOM_HASH[h]) zoom.value = ZOOM_HASH[h] })
function openZoom(z: Zoom) {
  if (z === zoom.value) return
  useTrack().track('plan_zoom_opened', { tab: z, from: zoom.value })
  zoom.value = z
  // Keep the tab on reload and in a shared link, without a jump.
  if (import.meta.client) history.replaceState(history.state, '', `${route.path}${location.search}#${z}`)
}

const dayChip = (s: Social) => ({ top: s.dateISO === todayISO.value ? 'Today' : s.dayLabel, bottom: s.dateISO ? shortDayDate(s.dateISO) : '' })
const todayPlans = computed(() => upcomingSocials.value.filter(s => s.dateISO === todayISO.value))
type DayRow =
  | { kind: 'plan'; key: string; s: Social }
  | { kind: 'hangout'; key: string; h: Hangout; nested: boolean }
  | { kind: 'label'; key: string; text: string }
const todayRows = computed<DayRow[]>(() => {
  const rows: DayRow[] = []
  const used = new Set<string>()
  for (const s of todayPlans.value) {
    rows.push({ kind: 'plan', key: `p-${s.id}`, s })
    for (const h of hangouts.value.filter(h => h.event?.id === s.id)) {
      used.add(h.id)
      rows.push({ kind: 'hangout', key: `h-${h.id}`, h, nested: true })
    }
  }
  const rest = hangouts.value.filter(h => !used.has(h.id))
  if (rest.length && todayPlans.value.length) rows.push({ kind: 'label', key: 'also', text: 'Also out tonight' })
  for (const h of rest) rows.push({ kind: 'hangout', key: `h-${h.id}`, h, nested: false })
  return rows
})
const tonightSummary = computed(() => [
  nightsAndClasses(todayPlans.value),
  hangouts.value.length ? plural(hangouts.value.length, 'hangout') : '',
].filter(Boolean).join(' · ') || 'Nothing planned tonight')
// Month: grouped by week from today — this week, next week, then later.
const monthGroups = computed(() => {
  const groups: { key: string; title: string; items: Social[] }[] = []
  for (const s of upcomingSocials.value) {
    const offset = s.dateISO ? Math.floor((new Date(`${s.dateISO}T12:00:00`).getTime() - new Date(`${todayISO.value}T12:00:00`).getTime()) / 86400_000) : 0
    const key = offset < 7 ? 'this' : offset < 14 ? 'next' : 'later'
    const title = key === 'this' ? 'This week' : key === 'next' ? 'Next week' : 'Later this month'
    const g = groups.find(x => x.key === key) ?? (groups.push({ key, title, items: [] }), groups[groups.length - 1]!)
    g.items.push(s)
  }
  return groups
})
const monthSummary = computed(() => nightsAndClasses(upcomingSocials.value) || 'Nothing planned for the next 30 days')
const yearSummary = computed(() => festivalYearLine(summary.value))
const goalsSummary = computed(() => goalsList.value.length
  ? plural(goalsList.value.length, 'goal')
  : 'One year, one arc, one reason to keep showing up')

// -----------------------------------------------------------------------
// DISCOVER · "Meet new friends" lives on its own page, /meet (RAZ-989).
// My plan keeps two things from plan.discover: the entry card (first faces
// waiting + how many) and the nudges built from earlier Yes swipes — "2
// dancers you said yes to are heading to X — add it?" in Your festivals.
// -----------------------------------------------------------------------
type FestivalNudge = { festivalSlug: string; festivalName: string; festivalColor: string; dancerNames: string[]; dismissed: boolean }
const festivalNudges = ref<FestivalNudge[]>([])
const meetPeople = ref<MeetCard[]>([])
const meetLoaded = ref(false)
const meetFaces = computed(() => meetPeople.value.slice(0, 3))
const meetCount = computed<number | null>(() => meetLoaded.value ? meetPeople.value.length : null)

/** Load the entry card's people and the festival nudges for signed-in users. */
async function loadDiscoverDeck() {
  if (!isSignedIn.value) return
  try {
    const result = await $trpc.plan.discover.query()
    festivalNudges.value = result.nudges.map(n => ({ ...n, dismissed: false }))
    meetPeople.value = toMeetCards(result.cards, { styles: dancerStyles.value })
    meetLoaded.value = true
  } catch (err) {
    console.error('[discover] loadDiscoverDeck failed:', err)
  }
}

const activeFestivalNudges = computed(() =>
  festivalNudges.value.filter(n => !n.dismissed && !effectivePickIds.value.has(n.festivalSlug) && n.dancerNames.length >= 2)
)

function acceptFestivalNudge(n: FestivalNudge) {
  addFestival(n.festivalSlug, { surface: 'nudge' })
  n.dismissed = true
  festivalNudges.value = [...festivalNudges.value]
}

/** "Not this year" — stored as a Skip on the festival, so the nudge and its cards stay gone. */
function dismissFestivalNudge(n: FestivalNudge) {
  n.dismissed = true
  festivalNudges.value = [...festivalNudges.value]
  $trpc.plan.discoverSwipe
    .mutate({ targetKind: 'festival', targetId: n.festivalSlug, decision: 'skip' })
    .catch(err => console.warn('[discover] dismiss not saved:', err))
}

// -----------------------------------------------------------------------
// GOAL · progress ring color
// -----------------------------------------------------------------------
function goalProgressColor(p: number) {
  if (p >= 75) return WD.green600
  if (p >= 40) return WD.cyan600
  if (p >= 15) return WD.amber500
  return WD.red600
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
  <div class="min-h-screen bg-background text-foreground font-display">
    <!-- V3 header -->
    <SiteHeader />

    <main>

    <!-- HERO -->
    <section v-if="viewState !== 'signed-out'" class="max-w-4xl mx-auto px-4 pt-12 pb-6 text-center">
      <div class="text-sm tracking-widest uppercase mb-3 text-secondary">
        <template v-if="isSignedIn">Hey, {{ dancerName || 'dancer' }}</template>
        <template v-else>Your plan</template>
      </div>
      <h1 class="text-5xl sm:text-6xl leading-[0.98] text-foreground">
        <template v-if="isSignedIn && dancerCity">
          Your floor in <em class="italic text-primary">{{ dancerCity }}</em>
        </template>
        <template v-else>
          What's <em class="italic text-primary">next?</em>
        </template>
      </h1>
      <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto text-muted-foreground font-sans">
        <template v-if="isSignedIn && stylesLabel">
          {{ stylesLabel }} — every festival, course and social you care about, in one place.
        </template>
        <template v-else>
          Every festival you picked, in one place — with the one thing to do this week.
        </template>
      </p>
    </section>

    <!-- YOUR YEAR IN DANCE (RAZ-966) · up front around the turn of the year. -->
    <section v-if="showYearReviewBanner" class="max-w-4xl mx-auto px-4 pb-6">
      <YearReviewEntry variant="banner" />
    </section>

    <!-- ONBOARDING GUARD — signed in but not onboarded. Gentle, not a trap. -->
    <section v-if="needsOnboarding" class="max-w-4xl mx-auto px-4">
      <div
        class="rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style="background:white; border:1px solid color-mix(in srgb, var(--wd-red-600) 33.3%, transparent); box-shadow: 0 1px 0 color-mix(in srgb, var(--wd-red-600) 13.3%, transparent), 0 8px 22px rgba(59,31,18,0.05);"
      >
        <div>
          <div class="text-eyebrow uppercase tracking-[0.3em] font-bold mb-1 text-primary">Finish setup</div>
          <p class="text-sm text-muted-foreground font-sans">
            Tell us what you're into and we'll fill your plan with the right festivals, classes and socials.
          </p>
        </div>
        <NuxtLink
          to="/onboarding"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold uppercase tracking-wider shrink-0 bg-wd-red-600 font-sans"
          style="box-shadow: 0 3px 0 -1px var(--wd-red-800);"
        >
          Set up my plan <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- FIRST-RUN HINT — right after a fresh signup + onboarding this session. -->
    <section v-else-if="showFirstRunHint" class="max-w-4xl mx-auto px-4">
      <div
        class="rounded-2xl px-5 py-4 flex items-center gap-3"
        style="background:linear-gradient(135deg, var(--wd-amber-100) 0%, var(--wd-red-100) 100%); border:1px solid color-mix(in srgb, var(--wd-red-600) 20%, transparent);"
      >
        <Sparkles class="w-5 h-5 shrink-0 text-primary" />
        <p class="text-sm text-muted-foreground font-sans">
          <span class="font-bold text-foreground">This is your home.</span>
          Come back weekly — your festivals, classes and socials live here.
        </p>
      </div>
    </section>

    <!-- SIGNED OUT — what the dashboard holds + sign in / join -->
    <section v-if="viewState === 'signed-out'" data-testid="my-plan-signed-out">
      <MyPlanLanding surface="my_plan_landing" />
    </section>

    <!-- LOADING — the session or the plan is still in flight (RAZ-890) -->
    <section v-else-if="viewState === 'loading'" class="max-w-4xl mx-auto px-4 py-6" aria-busy="true" data-testid="my-plan-loading">
      <p class="sr-only" role="status">Loading your plan…</p>
      <div class="grid gap-4" aria-hidden="true">
        <div class="h-24 rounded-2xl bg-muted animate-pulse" />
        <div class="h-40 rounded-2xl bg-muted animate-pulse" />
        <div class="h-40 rounded-2xl bg-muted animate-pulse" />
      </div>
    </section>

    <!-- SIGNED IN, EMPTY -->
    <section v-else-if="viewState === 'empty'" class="max-w-2xl mx-auto px-4 py-10" data-testid="my-plan-empty">
      <div class="rounded-2xl p-10 text-center border-2 border-dashed border-input bg-white/50">
        <Search class="w-10 h-10 mx-auto mb-4 text-secondary" aria-hidden="true" />
        <p class="text-lg font-display text-foreground">
          You haven't picked anything yet.
        </p>
        <p class="mt-2 text-sm text-muted-foreground font-sans">
          Pick a festival, a class or a night out — whatever you add shows up here.
        </p>
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button as-child variant="cta" size="lg" class="px-6">
            <NuxtLink to="/festivals">
              Browse festivals <ArrowRight aria-hidden="true" />
            </NuxtLink>
          </Button>
          <Button as-child variant="pill" class="px-5">
            <NuxtLink :to="cityClassesLink">
              Find a class{{ dancerCity ? ` in ${dancerCity}` : '' }}
            </NuxtLink>
          </Button>
        </div>
        <YearReviewEntry v-if="!showYearReviewBanner" variant="link" class="mt-6" />
      </div>
      <!-- Nothing picked yet is no reason not to meet people (RAZ-989). -->
      <MeetFriendsEntry :faces="meetFaces" :count="meetCount" surface="my_plan_empty" class="mt-6" />
      <!-- YOUR DANCE FRIENDS · mutual yeses, each with a night out (RAZ-985). -->
      <MeetMatches class="mt-6" />
    </section>

    <!-- SIGNED IN, WITH PICKS -->
    <section v-else class="max-w-4xl mx-auto px-4 py-6 pb-16">
      <!-- WEDANCE IN CHATGPT · until the dancer has connected it. -->
      <ChatgptPlanPitch
        v-if="showChatgptPitch"
        surface="my_plan_top"
        :city="dancerCity"
        :style="dancerStyles[0]"
        dismissible
        class="mb-10"
        @dismiss="hideChatgptPitch"
      />

      <!-- MEET NEW FRIENDS · its own page (/meet, RAZ-989); first thing in the plan. -->
      <MeetFriendsEntry :faces="meetFaces" :count="meetCount" surface="my_plan" class="mt-2" />
      <!-- YOUR DANCE FRIENDS · mutual yeses, each with a night out (RAZ-985). -->
      <MeetMatches class="mt-6" @planned="loadWeekSocials" />

      <!-- ZOOM TABS (RAZ-1006): Today / Week / Month / Year — each holds everything in its span. -->
      <div class="mt-12 sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur" data-testid="plan-zoom">
        <div class="grid grid-cols-4 gap-1 rounded-full border bg-white p-1" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);" role="tablist" aria-label="Your plan by time">
          <button
            v-for="t in ZOOM_TABS"
            :id="`plan-tab-${t.id}`"
            :key="t.id"
            type="button"
            role="tab"
            class="h-10 rounded-full text-sm font-bold font-sans transition-colors"
            :class="zoom === t.id ? 'bg-wd-brown-900 text-white' : 'text-muted-foreground hover:text-foreground'"
            :aria-selected="zoom === t.id"
            :aria-controls="`plan-panel-${t.id}`"
            :data-testid="`plan-tab-${t.id}`"
            @click="openZoom(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </div>

        <div v-if="removedSocial" class="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-sans" role="status">
          Removed {{ removedSocial.name }} from your plan.
          <Button variant="link" class="h-auto p-0 text-xs font-bold text-primary" @click="undoRemoveSocial">Undo</Button>
        </div>


      <!-- TODAY · tonight's nights and classes, each with its hangouts, then the other hangouts tonight. -->
      <div v-show="zoom === 'today'" id="plan-panel-today" class="mt-6" role="tabpanel" aria-labelledby="plan-tab-today">
        <span id="tonight" class="block scroll-mt-20" aria-hidden="true" />
        <div class="flex items-baseline justify-between gap-3 mb-4">
          <div class="min-w-0">
            <h2 class="text-3xl leading-tight font-display text-foreground">Tonight</h2>
            <p class="mt-1 text-sm text-muted-foreground font-sans">{{ tonightSummary }}</p>
          </div>
          <button
            v-if="isSignedIn"
            type="button"
            class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-wd-brown-900 font-sans"
            style="color:white;"
            @click="openHangoutForm"
          >
            <Plus class="w-3.5 h-3.5" />
            I'm out
          </button>
        </div>

        <!-- Create hangout form -->
        <div v-if="showHangoutForm" class="rounded-2xl bg-white border p-4 mb-4" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);">
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="k in (['dinner', 'coffee', 'bar', 'ride', 'floor'] as const)"
              :key="k"
              type="button"
              class="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
              :aria-pressed="newHangout.kind === k"
              :style="newHangout.kind === k
                ? { background: hangoutColors[k], color: 'white' }
                : { background: 'white', color: hangoutColors[k], border: '1.5px solid ' + hangoutColors[k] + '55' }"
              @click="newHangout.kind = k"
            >
              {{ k }}
            </button>
          </div>
          <div class="space-y-2 mb-3">
            <Field id="hangout-title" label="What's the plan?">
              <Input v-model="newHangout.title" size="sm" placeholder="e.g. Dinner before La Rumba" />
            </Field>
            <Field id="hangout-event" label="For which night?" optional>
              <Select v-model="newHangout.eventId" size="sm">
                <option value="">Not tied to an event</option>
                <optgroup v-if="hangoutEventOptions.inPlan.length" label="In your plan tonight">
                  <option v-for="e in hangoutEventOptions.inPlan" :key="e.id" :value="e.id">{{ eventOptionLabel(e) }}</option>
                </optgroup>
                <optgroup v-if="hangoutEventOptions.others.length" :label="`Also tonight${dancerCity ? ' in ' + dancerCity : ''}`">
                  <option v-for="e in hangoutEventOptions.others" :key="e.id" :value="e.id">{{ eventOptionLabel(e) }}</option>
                </optgroup>
              </Select>
            </Field>
            <div class="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
              <Field id="hangout-time" label="Time">
                <Input v-model="newHangout.time" type="time" size="sm" />
              </Field>
              <Field id="hangout-venue" label="Where?" optional>
                <HangoutsPlaceAutocomplete
                  v-if="dancerCity"
                  v-model="newHangout.venue"
                  :city-slug="dancerCity"
                  size="sm"
                  :placeholder="pickedHangoutEvent?.venueName ? `${pickedHangoutEvent.venueName} (the event's venue)` : 'Search a place'"
                  @place="newHangoutPlace = $event"
                />
                <Input v-else v-model="newHangout.venue" size="sm" placeholder="Venue or address" />
              </Field>
            </div>
          </div>
          <p v-if="hangoutError" class="text-xs mb-2 px-1 text-primary font-sans" role="alert">
            {{ hangoutError }}
          </p>
          <div class="flex justify-end gap-2">
            <Button variant="ghost" size="sm" class="rounded-full text-xs text-muted-foreground" @click="showHangoutForm = false">
              Cancel
            </Button>
            <Button
              variant="pill"
              size="pill-sm"
              :loading="creatingHangout"
              :disabled="!newHangout.title.trim()"
              @click="createHangout"
            >
              {{ creatingHangout ? 'Posting…' : 'Post' }}
            </Button>
          </div>
        </div>

        <div v-if="!todayRows.length && !showHangoutForm && (weekSocialsLoaded || !dancerCity)" class="rounded-2xl p-6 text-center border-2 border-dashed border-input bg-white/50">
          <MoonStar class="w-8 h-8 mx-auto mb-3 text-secondary" aria-hidden="true" />
          <p class="text-sm font-bold text-foreground font-sans">Nothing planned tonight.</p>
          <p class="mt-1 text-sm text-muted-foreground font-sans">Pick a party, or post “I’m out” — dancers show up when someone starts.</p>
          <NuxtLink v-if="dancerCity" :to="citySocialsLink" class="mt-3 inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold bg-wd-brown-900 font-sans" style="color:white;">
            See this week in {{ dancerCity }} <ArrowRight class="w-3.5 h-3.5" aria-hidden="true" />
          </NuxtLink>
        </div>
        <div v-else-if="todayRows.length" class="rounded-2xl bg-white border overflow-hidden" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);" data-testid="today-list">
          <template v-for="(r, i) in todayRows" :key="r.key">
            <p
              v-if="r.kind === 'label'"
              class="px-4 pt-3 pb-1 border-t text-eyebrow uppercase tracking-widest font-bold text-secondary font-sans"
              style="border-color:color-mix(in srgb, var(--wd-brown-900) 5.1%, transparent);"
            >{{ r.text }}</p>
            <MyPlanEventRow
              v-else-if="r.kind === 'plan'"
              :s="r.s"
              :class="i > 0 ? 'border-t' : ''"
              style="border-color:color-mix(in srgb, var(--wd-brown-900) 5.1%, transparent);"
              @remove="removeSocialFromPlan"
            />
              <div
                v-else-if="r.kind === 'hangout'"
                class="flex flex-wrap items-center gap-3 py-2.5 pr-4"
                :class="[r.nested ? 'pl-11' : 'pl-4', i > 0 && !r.nested && todayRows[i - 1]?.kind !== 'label' ? 'border-t' : '']"
                :style="{ borderColor: 'color-mix(in srgb, var(--wd-brown-900) 5.1%, transparent)', background: r.h.going ? (WD.green600 + '08') : (r.nested ? 'color-mix(in srgb, var(--wd-brown-900) 2.5%, white)' : 'white') }"
                data-week-row="hangout"
              >
                <component :is="hangoutIcon(r.h.kind)" class="w-4 h-4 shrink-0" :style="{ color: r.h.color, 'stroke-width': 1.5 }" />
                <span class="text-sm font-bold w-12 text-foreground font-sans">
                  {{ r.h.time }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-bold truncate text-foreground">{{ r.h.title }}</div>
                  <div v-if="r.h.event && !r.nested" class="text-xs truncate font-sans">
                    <span class="text-muted-foreground">For </span>
                    <NuxtLink :to="eventPath({ id: r.h.event.id, name: r.h.event.name })" class="font-bold text-primary hover:underline">{{ r.h.event.name }}</NuxtLink>
                    <span v-if="r.h.event.startDate" class="text-muted-foreground"> · {{ eventLocalTime(r.h.event.startDate, r.h.event.timezone || undefined) }}</span>
                    <span v-if="r.h.inMyPlan" class="ml-1 text-eyebrow font-bold uppercase tracking-widest text-wd-green-600">in your plan</span>
                  </div>
                  <div class="text-xs truncate text-muted-foreground font-sans">
                    <span v-if="r.h.host">{{ r.h.host }} · </span>
                    <a
                      v-if="r.h.venue && r.h.placeAddress"
                      :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.h.venue + ', ' + r.h.placeAddress)}`"
                      target="_blank"
                      rel="noopener"
                      class="hover:underline"
                      :title="r.h.placeAddress"
                    >{{ r.h.venue }}</a><span v-else-if="r.h.venue">{{ r.h.venue }}</span><span v-if="r.h.venue"> · </span>
                    {{ r.h.people }} in
                  </div>
                </div>
                <button
                  type="button"
                  class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
                  :aria-pressed="r.h.going"
                  :style="r.h.going
                    ? { background: 'var(--wd-green-600)', color: 'white' }
                    : { background: 'white', color: r.h.color, border: '1.5px solid ' + r.h.color + '55' }"
                  @click="toggleHangout(r.h.id)"
                >
                  {{ r.h.going ? '✓ In' : 'Join' }}
                </button>
                <Button
                  v-if="r.h.mine"
                  variant="ghost"
                  size="icon-sm"
                  class="size-7 rounded-full text-secondary [&_svg]:size-3.5"
                  aria-label="Close this hangout"
                  @click="closeHangout(r.h.id)"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
          </template>
        </div>
      </div>

      <!-- WEEK · the next seven days, nights and classes by day; the weekend story under it. -->
      <div v-show="zoom === 'week'" id="plan-panel-week" class="mt-6" role="tabpanel" aria-labelledby="plan-tab-week">
        <span id="socials" class="block scroll-mt-20" aria-hidden="true" />
        <div class="flex items-baseline justify-between gap-3 mb-4">
          <div class="min-w-0">
            <h2 class="text-3xl leading-tight font-display text-foreground">This week</h2>
            <p class="mt-1 text-sm text-muted-foreground font-sans">{{ weekSummary }}</p>
          </div>
          <NuxtLink :to="citySocialsLink" class="shrink-0 text-xs italic hover:underline text-secondary font-display">Full week →</NuxtLink>
        </div>
        <div v-if="!weekPlans.length && (weekSocialsLoaded || !dancerCity)" class="rounded-2xl p-6 text-center border-2 border-dashed border-input bg-white/50">
          <Sparkles class="w-8 h-8 mx-auto mb-3 text-secondary" aria-hidden="true" />
          <template v-if="dancerCity">
            <p class="text-sm font-bold text-foreground font-sans">Nothing planned this week.</p>
            <p class="mt-1 text-sm text-muted-foreground font-sans">Pick the nights you're going out from this week's socials in {{ dancerCity }}.</p>
            <NuxtLink :to="citySocialsLink" class="mt-3 inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold bg-wd-brown-900 font-sans" style="color:white;">
              See this week in {{ dancerCity }} <ArrowRight class="w-3.5 h-3.5" aria-hidden="true" />
            </NuxtLink>
          </template>
          <template v-else>
            <p class="text-sm text-muted-foreground font-sans">Pick your city and we'll show this week's socials to choose from.</p>
            <NuxtLink to="/settings" class="mt-2 inline-block font-sans text-xs font-bold underline text-primary">Set your city</NuxtLink>
          </template>
        </div>
        <div v-else-if="weekPlans.length" class="rounded-2xl bg-white border overflow-hidden" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);" data-testid="week-list">
          <MyPlanEventRow
            v-for="(s, i) in weekPlans"
            :key="s.id"
            :s="s"
            :chip="dayChip(s)"
            :class="i > 0 ? 'border-t' : ''"
            style="border-color:color-mix(in srgb, var(--wd-brown-900) 5.1%, transparent);"
            @remove="removeSocialFromPlan"
          />
        </div>

        <!-- The weekend story, ready to post (RAZ-895). #share-week is "Tell your story" (RAZ-1010). -->
        <span id="share-week" class="block scroll-mt-20" aria-hidden="true" />
        <WeekendStory
          v-if="weekendPlan && upcomingNights.length"
          :plan="weekendPlan"
          surface="my_plan"
          class="mt-4"
        >
          <NuxtLink
            :to="`/w/${weekendPlan.code}`"
            class="mt-2 inline-flex items-center gap-1 text-xs font-bold underline text-primary font-sans"
            data-testid="weekend-page-link"
          >
            See who's joining <ArrowRight class="w-3.5 h-3.5" aria-hidden="true" />
          </NuxtLink>
        </WeekendStory>
        <p v-if="shareWeekendError && upcomingNights.length" role="alert" class="mt-2 text-xs text-destructive font-sans">{{ shareWeekendError }}</p>
      </div>

      <!-- MONTH · the next 30 days of every kind, then the courses behind the classes. -->
      <div v-show="zoom === 'month'" id="plan-panel-month" class="mt-6" role="tabpanel" aria-labelledby="plan-tab-month">
        <div class="mb-4">
          <h2 class="text-3xl leading-tight font-display text-foreground">This month</h2>
          <p class="mt-1 text-sm text-muted-foreground font-sans">{{ monthSummary }}</p>
        </div>
        <div v-if="!upcomingSocials.length && weekSocialsLoaded" class="rounded-2xl p-6 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground font-sans">
          Nothing planned for the next 30 days — enroll in a course below, or pick nights on {{ dancerCity || 'your city' }}’s page.
        </div>
        <div v-else-if="upcomingSocials.length" class="rounded-2xl bg-white border overflow-hidden" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);" data-testid="month-list">
          <template v-for="(g, gi) in monthGroups" :key="g.key">
            <p class="px-4 pt-3 pb-1 text-eyebrow uppercase tracking-widest font-bold text-secondary font-sans" :class="gi > 0 ? 'border-t' : ''" style="border-color:color-mix(in srgb, var(--wd-brown-900) 5.1%, transparent);">{{ g.title }}</p>
            <MyPlanEventRow
              v-for="s in g.items"
              :key="s.id"
              :s="s"
              :chip="dayChip(s)"
              @remove="removeSocialFromPlan"
            />
          </template>
        </div>

        <!-- YOUR COURSES · what you're enrolled in; each class also shows on its day above (RAZ-1006). -->
        <div id="courses" class="mt-12 scroll-mt-20">
          <div class="flex items-baseline justify-between mb-4">
            <div>
              <h2 class="text-3xl leading-tight font-display text-foreground">Your courses</h2>
              <p class="mt-1 text-sm text-muted-foreground font-sans">{{ coursesSummary }}</p>
            </div>
            <Button
              v-if="!showEnrollPicker && availableClasses.length > 0"
              variant="link"
              class="h-auto p-0 text-xs font-normal italic text-secondary font-display"
              @click="showEnrollPicker = true"
            >
              + Enroll
            </Button>
            <Button
              v-else-if="showEnrollPicker"
              variant="link"
              class="h-auto p-0 text-xs font-normal italic text-muted-foreground font-display"
              @click="showEnrollPicker = false"
            >
              Done
            </Button>
          </div>

          <!-- Enroll picker — available classes from the city -->
          <div v-if="showEnrollPicker" class="rounded-2xl bg-white p-5 border mb-4" style="border-color:color-mix(in srgb, var(--wd-amber-600) 33.3%, transparent); box-shadow: 0 4px 16px rgba(59,31,18,0.06);">
            <div class="text-sm font-bold mb-3 text-foreground font-display">
              Upcoming classes in {{ dancerCity || 'your city' }}
            </div>
            <div v-if="!availableClasses.length" class="text-xs py-2 text-muted-foreground font-sans">
              No upcoming classes found. Check your city page for more.
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="cls in availableClasses"
                :key="cls.id"
                type="button"
                class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border hover:bg-amber-50/50 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style="border-color:color-mix(in srgb, var(--wd-brown-900) 6.7%, transparent);"
                @click="enrollClass(cls)"
              >
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: STYLE_COLORS_ENROLL[cls.style] || WD.gray500 }" />
                <span class="block flex-1 min-w-0">
                  <span class="block text-sm font-bold text-foreground">{{ cls.name }}</span>
                  <span class="block text-xs text-muted-foreground font-sans">
                    {{ cls.date ? formatShortDate(cls.date) : cls.day }}, {{ cls.time }} · {{ cls.venue }} · {{ cls.level || 'All levels' }}
                  </span>
                </span>
                <span class="text-xs font-bold italic shrink-0 text-primary">+ Add</span>
              </button>
            </div>
          </div>

          <div v-if="!courses.length && !showEnrollPicker" class="rounded-2xl p-6 text-center border-2 border-dashed border-input bg-white/50">
            <GraduationCap class="w-8 h-8 mx-auto mb-3 text-secondary" />
            <p class="text-sm font-bold text-foreground font-sans">No classes yet.</p>
            <p class="mt-1 mb-3 text-sm text-muted-foreground font-sans">
              A weekly class is the quickest way to keep momentum.
            </p>
            <Button as-child variant="pill" class="px-5">
              <NuxtLink :to="cityClassesLink">
                Find a class{{ dancerCity ? ` in ${dancerCity}` : '' }} <ArrowRight aria-hidden="true" />
              </NuxtLink>
            </Button>
          </div>
          <div v-else class="grid sm:grid-cols-2 gap-4">
            <div
              v-for="c in courses"
              :key="c.id"
              class="group rounded-2xl bg-white p-5 border"
              :style="{ borderColor: c.color + '55', boxShadow: '0 1px 0 ' + c.color + '22, 0 6px 18px rgba(59,31,18,0.04)' }"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="min-w-0">
                  <NuxtLink
                    v-if="c.eventId"
                    :to="eventPath({ id: c.eventId || c.id, name: c.name })"
                    class="block text-base font-bold leading-tight text-foreground hover:underline"
                  >{{ c.name || c.school }}</NuxtLink>
                  <div v-else class="text-base font-bold leading-tight text-foreground">
                    {{ c.name || c.school }}
                  </div>
                  <div class="text-xs mt-0.5 text-muted-foreground font-sans">
                    <template v-if="c.name && c.school">
                      <NuxtLink v-if="c.schoolUsername" :to="`/@${c.schoolUsername}`" class="hover:underline">{{ c.school }}</NuxtLink>
                      <span v-else>{{ c.school }}</span>
                    </template>
                    <span v-else-if="c.teacher">{{ c.teacher }}</span>
                    <template v-if="c.style || c.level"> · <span class="text-secondary">{{ [c.style, c.level].filter(Boolean).join(' · ') }}</span></template>
                  </div>
                  <div
                    v-if="c.style && goalsForStyle(c.style).length"
                    class="text-[10px] mt-1 italic"
                    style="color:var(--wd-green-600); font-family:var(--wd-font-display);"
                  >
                    Serves your goal: {{ goalsForStyle(c.style).join(', ') }}
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Payment status only when there's real data for this enrolment. -->
                  <template v-if="c.paidThroughMonth !== undefined">
                    <span
                      v-if="!c.paidThroughMonth"
                      class="text-eyebrow font-bold uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap"
                      :style="{ color: 'var(--wd-red-600)', background: 'color-mix(in srgb, var(--wd-red-600) 9.4%, transparent)' }"
                    >
                      Pay due
                    </span>
                    <span
                      v-else
                      class="text-eyebrow font-bold uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap"
                      :style="{ color: 'var(--wd-green-600)', background: 'color-mix(in srgb, var(--wd-green-600) 9.4%, transparent)' }"
                    >
                      Paid
                    </span>
                  </template>
                  <!-- Only planned (RAZ-1003): the next step is signing up for the class. -->
                  <template v-if="!c.signedUp">
                    <span class="text-xs text-muted-foreground font-sans">Planned</span>
                    <NuxtLink
                      :to="eventPath({ id: c.eventId || c.id, name: c.name })"
                      class="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap border font-sans text-primary border-primary/40 hover:bg-primary/5"
                      data-plan-signup
                    >
                      Book{{ c.price ? ` · ${c.price}` : '' }} →
                    </NuxtLink>
                  </template>
                  <NuxtLink
                    v-if="c.signedUp"
                    :to="eventPath({ id: c.eventId || c.id, name: c.name })"
                    class="text-eyebrow font-bold uppercase tracking-widest px-2 py-1 rounded-full whitespace-nowrap hover:underline"
                    :style="{ color: 'var(--wd-green-600)', background: 'color-mix(in srgb, var(--wd-green-600) 9.4%, transparent)' }"
                    :title="'You’re signed up — to cancel, open the class'"
                  >
                    Signed up
                  </NuxtLink>
                  <button
                    v-else
                    type="button"
                    class="text-xs text-muted-foreground hover:text-primary hover:underline font-sans"
                    :aria-label="`Remove ${c.name || c.school} from your plan`"
                    data-plan-remove
                    @click="unenrollCourse(c.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div class="mt-3 space-y-1.5 text-xs text-muted-foreground font-sans">
                <div class="flex items-center gap-2">
                  <Calendar class="w-3 h-3 text-secondary" />
                  Next class <strong>{{ c.nextClassDate ? formatShortDate(c.nextClassDate) : c.weekday }}, {{ c.time }}</strong>
                </div>
                <div v-if="c.venue" class="flex items-center gap-2">
                  <MapPin class="w-3 h-3 text-secondary" />
                  {{ c.venue }}
                </div>
              </div>

              <!-- Attendance only when it's tracked for this enrolment (never 0 / 0). -->
              <div v-if="c.total && c.total > 0" class="mt-4">
                <div class="flex items-baseline justify-between mb-1">
                  <span class="text-eyebrow uppercase tracking-widest font-bold text-secondary">Attendance this cycle</span>
                  <span class="text-xs font-black text-foreground font-display">{{ c.attended ?? 0 }} / {{ c.total }}</span>
                </div>
                <div class="w-full h-1.5 rounded-full overflow-hidden" style="background:color-mix(in srgb, var(--wd-brown-900) 6.3%, transparent);">
                  <div class="h-full transition-all" :style="{ width: Math.round(((c.attended ?? 0) / c.total) * 100) + '%', background: c.color }" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- YEAR · your festivals and your goals. -->
      <div v-show="zoom === 'year'" id="plan-panel-year" class="mt-6" role="tabpanel" aria-labelledby="plan-tab-year">
        <!-- YEAR · festivals section header -->
        <div id="festivals" class="mb-4 scroll-mt-20">
          <h2 class="text-3xl leading-tight font-display text-foreground">Your festivals</h2>
          <p class="mt-1 text-sm text-muted-foreground font-sans">{{ yearSummary }}</p>
          <YearReviewEntry v-if="!showYearReviewBanner" variant="link" class="mt-2" />
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
              class="inline-flex items-center gap-1.5 text-eyebrow font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
              :style="{ background: n.festivalColor + '18', color: n.festivalColor }"
            >
              <UsersIcon class="w-3 h-3" /> {{ n.dancerNames.length }} match{{ n.dancerNames.length === 1 ? '' : 'es' }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold text-foreground">
                {{ n.dancerNames.slice(0, 3).join(', ') }}<span v-if="n.dancerNames.length > 3"> and {{ n.dancerNames.length - 3 }} more</span> heading to
                <span :style="{ color: n.festivalColor }">{{ n.festivalName }}</span>.
              </div>
              <div class="text-xs italic text-muted-foreground font-display">
                Not in your year yet — add it and you'll meet them there.
              </div>
            </div>
            <Button variant="pill" size="pill-sm" :accent="n.festivalColor" class="tracking-widest" @click="acceptFestivalNudge(n)">
              Add to year
            </Button>
            <Button variant="link" class="h-auto p-0 text-xs font-normal italic shrink-0 text-secondary" @click="dismissFestivalNudge(n)">
              Not this year
            </Button>
          </div>
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
                  :src="sizedImage(f.logo, IMG.avatar)"
                  :alt="f.name"
                  class="w-12 h-12 rounded-full shadow-sm"
                >
                <div
                  v-else
                  class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm"
                  :style="{ background: f.accentColor }"
                >
                  {{ initialOf(f.name) }}
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="font-bold text-lg leading-tight truncate text-foreground">
                    {{ f.name }}
                  </h3>
                  <span
                    class="text-xs shrink-0 mt-1 whitespace-nowrap"
                    :style="{
                      color: daysUntilLabel(f.startDate, f.endDate).urgent ? WD.red600 : f.accentColor,
                      fontFamily: 'var(--wd-font-hand)',
                      fontSize: '16px',
                    }"
                  >
                    — {{ daysUntilLabel(f.startDate, f.endDate).text }}
                  </span>
                </div>

                <div class="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground font-sans">
                  <span class="inline-flex items-center gap-1">
                    <Calendar class="w-3 h-3 text-secondary" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="inline-flex items-center gap-1">
                    <MapPin class="w-3 h-3 text-secondary" />
                    {{ f.venue }}, {{ f.location }}
                  </span>
                  <span
                    v-if="f.styles?.some((s: string) => goalsForStyle(s).length)"
                    class="inline-flex items-center gap-1 text-[10px] italic"
                    style="color:var(--wd-green-600); font-family:var(--wd-font-display);"
                  >
                    <Target class="w-3 h-3" />
                    Serves: {{ f.styles.filter((s: string) => goalsForStyle(s).length).flatMap((s: string) => goalsForStyle(s)).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ') }}
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
                      :style="{ background: i <= cardSummary(f).doneCount ? WD.green600 : (WD.brown900 + '22') }"
                    />
                    <span class="ml-1 text-meta font-bold text-muted-foreground font-sans">
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
                    <span class="font-sans">All planned</span>
                  </span>
                  <span
                    v-else-if="cardSummary(f).headline"
                    class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                    :style="toneStyle(cardSummary(f).headline!.state.tone)"
                  >
                    <component :is="cardSummary(f).headline!.icon" class="w-3 h-3" style="stroke-width:1.5;" />
                    <span class="font-bold font-sans">
                      {{ cardSummary(f).headline!.label }}:
                    </span>
                    <span class="font-sans">
                      {{ cardSummary(f).headline!.state.text }}
                    </span>
                  </span>
                </div>
              </div>

              <!-- Chevron -->
              <ChevronDown
                class="w-5 h-5 shrink-0 mt-1 transition-transform"
                :style="{
                  color: 'var(--wd-amber-600)',
                  'stroke-width': 1.75,
                  transform: expandedSlugs.has(f.slug) ? 'rotate(180deg)' : 'none',
                }"
              />
            </button>

            <!-- EXPANDED PANEL — multi-track detail + footer -->
            <div v-if="expandedSlugs.has(f.slug)" class="px-4 sm:px-5 pb-5">
              <div class="rounded-xl overflow-hidden border" style="border-color:color-mix(in srgb, var(--wd-brown-900) 8.2%, transparent);">
                <div
                  v-for="(t, i) in tracks(f)"
                  :key="t.key"
                  class="flex flex-wrap items-center gap-3 px-3 sm:px-4 py-3"
                  :class="i > 0 ? 'border-t' : ''"
                  :style="{ borderColor: 'color-mix(in srgb, var(--wd-brown-900) 5.1%, transparent)', background: t.done ? (WD.green600 + '08') : 'white' }"
                >
                  <component :is="t.icon" class="w-4 h-4 shrink-0" :style="{ color: t.done ? WD.green600 : WD.amber600, 'stroke-width': 1.5 }" />
                  <div class="w-24 shrink-0 text-sm font-bold text-foreground">
                    {{ t.label }}
                  </div>
                  <span
                    class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                    :style="toneStyle(t.state.tone)"
                  >
                    <Check v-if="t.done" class="w-3 h-3" style="stroke-width:2.5;" />
                    <span class="font-sans">{{ t.state.text }}</span>
                  </span>

                  <button
                    v-if="t.action && t.onAction"
                    type="button"
                    class="text-xs font-bold italic hover:underline ml-auto whitespace-nowrap"
                    :style="{ color: f.accentColor }"
                    @click.stop="t.onAction()"
                  >
                    {{ t.action.label }} →
                  </button>
                  <NuxtLink
                    v-else-if="t.action && !t.action.external"
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
                    class="text-eyebrow italic hover:underline inline-flex items-center gap-0.5 whitespace-nowrap text-secondary font-display"
                  >
                    {{ t.altAction.label }} <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                  <NuxtLink
                    v-else-if="t.altAction"
                    :to="t.altAction.href"
                    class="text-eyebrow italic hover:underline whitespace-nowrap text-secondary font-display"
                  >
                    {{ t.altAction.label }} →
                  </NuxtLink>

                  <button
                    v-if="t.toggleKey"
                    type="button"
                    class="text-eyebrow font-bold italic hover:underline shrink-0 whitespace-nowrap text-secondary"
                    :aria-pressed="t.done"
                    @click.stop="toggleTrack(f.slug, t.toggleKey)"
                  >
                    {{ t.done ? 'Undo' : 'Mark done' }}
                  </button>
                </div>
              </div>

              <!-- FIND A RIDE PANEL -->
              <FindRidePanel
                v-if="rideOpenSlugs.has(f.slug)"
                :festival-slug="f.slug"
                :festival-location="f.location"
                :festival-start-date="f.startDate"
                :accent-color="f.accentColor"
                :is-signed-in="isSignedIn"
                class="mt-4"
                @sign-in="openAuth('signin')"
              />

              <div class="mt-4 flex items-center gap-4 text-xs">
                <NuxtLink
                  :to="`${festivalHref(f)}`"
                  class="italic hover:underline text-muted-foreground font-sans"
                >
                  Open festival page →
                </NuxtLink>
                <Button variant="link" class="ml-auto h-auto p-0 text-xs font-normal italic text-secondary font-sans" @click.stop="onRemove(f.slug)">
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- The festival-year story, ready to post (RAZ-897 → here in RAZ-966). #share-year is "Tell your story" (RAZ-1010). -->
        <span id="share-year" class="block scroll-mt-20" aria-hidden="true" />
        <YearStory
          v-if="yearStoryFestivals.length && yearShareLink"
          :festivals="yearStoryFestivals"
          :sharer-name="(dancerName || '').split(' ')[0] || ''"
          :url="yearShareLink"
          surface="my_plan"
          class="mt-6 mb-10"
        >
          <p v-if="dancerPublicReal === false" class="mt-3 text-sm font-sans text-orange-700" data-testid="year-story-private">
            Your profile is private, so friends who open the link won't see your year.
            <NuxtLink to="/settings" class="underline font-bold">Make it public</NuxtLink>
          </p>
        </YearStory>

        <!-- GOALS · the long arc, after the year it shapes. -->
        <div id="goals" class="mt-4">
          <div class="flex items-baseline justify-between mb-4">
            <div>
              <h2 class="text-3xl leading-tight font-display text-foreground">Your goals</h2>
              <p class="mt-1 text-sm text-muted-foreground font-sans">{{ goalsSummary }}</p>
            </div>
            <Button
              v-if="!showGoalForm"
              variant="link"
              class="h-auto p-0 text-xs font-normal italic text-secondary font-display"
              @click="showGoalForm = true"
            >
              + Add a goal
            </Button>
          </div>

          <!-- Inline add-goal form -->
          <div v-if="showGoalForm" class="rounded-2xl bg-white p-6 border mb-4" style="border-color:color-mix(in srgb, var(--wd-amber-600) 33.3%, transparent); box-shadow: 0 4px 16px rgba(59,31,18,0.06);">
            <div class="text-sm font-bold mb-4 text-foreground font-display">
              What are you working toward this year?
            </div>
            <form class="space-y-4" novalidate @submit.prevent="onGoalSubmit">
              <Field id="goal-title" label="Your goal" :error="goalFormError || undefined">
                <Input v-model="goalFormTitle" placeholder="e.g. Learn Bachata Sensual" />
              </Field>
              <Field id="goal-why" label="Why does it matter?" optional>
                <Input v-model="goalFormWhy" placeholder="e.g. Feel confident on the dance floor" />
              </Field>
              <Field id="goal-style" label="Dance style" optional hint="Links this goal to your courses & festivals.">
                <DanceStylePicker v-model="goalFormStyles" single label="Dance style" :popular-count="6" />
              </Field>
              <div class="flex items-center gap-3 pt-1">
                <Button type="submit" variant="pill" :disabled="!goalFormTitle.trim() || !!goalFormError">
                  Add goal
                </Button>
                <Button type="button" variant="ghost" class="rounded-full font-bold uppercase tracking-wider text-muted-foreground" @click="onGoalCancel">
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          <div v-if="!goalsList.length && !showGoalForm" class="rounded-2xl p-6 text-center border-2 border-dashed border-input bg-white/50">
            <Target class="w-8 h-8 mx-auto mb-3 text-secondary" aria-hidden="true" />
            <p class="text-sm text-muted-foreground font-sans">
              No goals yet. One year, one arc, one reason to keep showing up.
            </p>
            <Button variant="link" class="mt-2 h-auto p-0 text-xs font-bold underline text-primary font-sans" @click="showGoalForm = true">
              Set a goal
            </Button>
          </div>
          <div v-else-if="goalsList.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="g in goalsList"
              :key="g.id"
              class="rounded-2xl bg-white p-5 border group"
              :style="{ borderColor: g.color + '55', boxShadow: '0 1px 0 ' + g.color + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
            >
              <div class="flex items-start gap-3 mb-3">
                <component :is="g.icon" class="w-5 h-5 shrink-0" :style="{ color: g.color, 'stroke-width': 1.5 }" />
                <div class="flex-1 min-w-0">
                  <div class="text-base font-bold leading-tight text-foreground">
                    {{ g.title }}
                  </div>
                  <div class="mt-1 text-xs italic text-muted-foreground font-display">
                    {{ g.why }}
                  </div>
                  <span
                    v-if="goalEffectiveStyle(g)"
                    class="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style="background:color-mix(in srgb, var(--wd-amber-600) 12%, transparent); color:var(--wd-amber-600);"
                  >
                    {{ goalEffectiveStyle(g) }}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  class="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0 rounded hover:bg-wd-red-50 text-primary hover:text-primary [&_svg]:size-3.5"
                  :aria-label="`Remove goal: ${g.title}`"
                  @click="removeGoal(g.id)"
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
              <!-- Progress bar — editable in real mode -->
              <div class="mt-4">
                <div class="flex items-baseline justify-between mb-1">
                  <span class="text-eyebrow uppercase tracking-widest font-bold text-secondary">Progress</span>
                  <button
                    type="button"
                    class="text-xs font-black cursor-pointer hover:underline"
                    :style="{ color: goalProgressColor(g.progress), fontFamily: 'var(--wd-font-display)' }"
                    :aria-label="`Edit progress, currently ${g.progress}%`"
                    @click="startEditingProgress(g.id)"
                  >
                    {{ g.progress }}%
                  </button>
                </div>
                <input
                  v-if="editingProgressGoalId === g.id"
                  type="range"
                  min="0"
                  max="100"
                  :value="g.progress"
                  class="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style="accent-color:var(--wd-amber-600);"
                  @input="onProgressChange(g.id, Number(($event.target as HTMLInputElement).value))"
                  @change="stopEditingProgress()"
                />
                <div v-else class="w-full h-2 rounded-full overflow-hidden" style="background:color-mix(in srgb, var(--wd-brown-900) 6.3%, transparent);">
                  <div class="h-full transition-all" :style="{ width: g.progress + '%', background: goalProgressColor(g.progress) }" />
                </div>
              </div>
              <div v-if="g.nudge" class="mt-3 text-sm font-hand text-secondary" style="font-size:17px;">
                — {{ g.nudge }}
              </div>
            </div>
          </div>
        </div>

      </div>

    </section>

    <section v-if="isSignedIn && !(viewState === 'plan' && showChatgptPitch)" class="max-w-4xl mx-auto px-4 pb-10 text-center font-sans">
      <AiAppCta surface="my_plan" variant="inline" label="Plan your weekend in ChatGPT">
        Rather ask than scroll?
      </AiAppCta>
    </section>

    </main>

    <SiteFooter />

  </div>
</template>
