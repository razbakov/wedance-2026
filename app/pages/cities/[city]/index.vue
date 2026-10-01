<script setup lang="ts">
/**
 * /cities/[city] — a specific city.
 * Restyled 2026-07-02 to match V3 tropical direction.
 * layout: false + inline V3 header. Retired the WeekDrawer sidebar
 * and mobile drawer (same pattern the /festivals and /festivals/[slug]
 * retirements followed) — replaced with a soft floating nudge pill to
 * /my-plan when the user has picks in their week.
 * Shared child components (Lineup, TeacherProfile, WeeklyCalendar,
 * WeekDrawer) still carry shadcn styling and will get restyled in a
 * follow-up pass.
 */
import { MapPin, Calendar, ArrowRight, Users } from 'lucide-vue-next'
import type { Teacher } from '~/types/festival'

definePageMeta({ layout: false })

const route = useRoute()
const slug = route.params.city as string

// Week plan — sidebar retired; picks now surface via the floating
// nudge pill and the full view lives on /my-plan.
const { weekPlanIds, toggleEvent, weekCount } = useWeekPlan()

// Auth gate — "Going?" requires sign-in
const { isSignedIn } = useAuth()
const showSignUp = ref(false)

function onToggleEvent(id: string) {
  if (!isSignedIn.value) {
    showSignUp.value = true
    return
  }
  toggleEvent(id)
}

// People + venues from real migrated profiles (entity.cityDirectory), kept as
// refs and populated on mount (tRPC client is client-only). Same tabbed Lineup
// interface — only the data source changed (mock → DB).
const toPerson = (e: any): Teacher => ({
  id: e.username,
  name: e.name,
  photo: e.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&size=80&background=ec4899&color=fff&bold=true&rounded=true`,
  styles: e.styles || [],
  bio: '',
} as unknown as Teacher)

// Directory is SSR-rendered (see server/api/cities/[slug].get.ts) so the people
// list and the data-driven <title> ship in the HTML — crawlable + instant.
const { data: dir, pending: loadingDir } = await useFetch(`/api/cities/${slug}`, {
  key: `city-directory-${slug}`,
})
const cityName = computed(() =>
  dir.value?.city || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
)
const teachers = computed<Teacher[]>(() => (dir.value?.artists ?? []).map(toPerson))
const djs = computed<Teacher[]>(() => [])
const organisers = computed<Teacher[]>(() => (dir.value?.organizers ?? []).map(toPerson))
const dbVenues = computed<Teacher[]>(() => (dir.value?.venues ?? []).map(toPerson))

// No mock weekly feed anymore — migrated events are historical, so the only live
// weekly events are real DB bookings (merged into the calendar below).
const events: any[] = []

const bookedEvents = ref<any[]>([])
const bookedEventsLoaded = ref(false)
onMounted(async () => {
  try { bookedEvents.value = await $trpc.booking.upcomingByCity.query({ citySlug: slug }) } finally { bookedEventsLoaded.value = true }
})
const bookedTypeMap: Record<string, string> = { Social: 'social', Party: 'social', Workshop: 'workshop', Class: 'class', Practica: 'practica' }
// Local YYYY-MM-DD (never toISOString — that shifts to UTC and, in a positive
// offset like CEST, moves every day back by one, so "this week" ends up a day off).
const fmtLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const thisWeekDates = computed(() => {
  const now = new Date(); const off = (now.getDay() + 6) % 7
  const mon = new Date(now); mon.setDate(now.getDate() - off); mon.setHours(0, 0, 0, 0)
  const set = new Set<string>()
  for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); set.add(fmtLocalDate(x)) }
  return set
})
const bookedThisWeek = computed(() => bookedEvents.value
  .filter(b => b.eventDate && thisWeekDates.value.has(String(b.eventDate).slice(0, 10)))
  .map(b => ({
    id: b.id, name: b.title || 'Social', type: bookedTypeMap[b.eventType] || 'social',
    style: b.styles?.[0] || '', day: new Date(String(b.eventDate).slice(0, 10)).toLocaleDateString('en-US', { weekday: 'long' }),
    time: b.startTime || '', duration: 0, venue: b.venueName, address: '', organizer: '',
    accentColor: '#dc2626', attendeeCount: 0, recurring: false, date: b.eventDate,
  })))

const cityAccent: Record<string, string> = {
  munich: '#dc2626',
  berlin: '#0891b2',
}
const accent = cityAccent[slug] || '#a855f7'

// City meta the template renders (name / count / styles), derived from real data.
const city = computed(() => ({
  name: cityName.value,
  country: dir.value?.country || '',
  eventCount: bookedThisWeek.value.length,
  styles: Array.from(new Set(teachers.value.flatMap((t: any) => t.styles || []))).slice(0, 12),
}))

// Intent-first, data-driven SEO. Dancers search by style ("salsa munich"), so
// the title leads with this city's actual top styles; brand goes last.
const hero = computed(() => dir.value?.hero ?? null)
const topStyles = computed(() => dir.value?.topStyles ?? [])
const stylePhrase = computed(() => {
  const s = topStyles.value
  if (s.length >= 3) return `${s[0]}, ${s[1]} & ${s[2]}`
  if (s.length === 2) return `${s[0]} & ${s[1]}`
  if (s.length === 1) return s[0]
  return 'Social Dance'
})
const seoTitle = computed(() => `${stylePhrase.value} in ${city.value.name} — Venues, Artists & Socials | WeDance`)
const seoDescription = computed(() =>
  `Find ${stylePhrase.value.toLowerCase()} venues, artists and organizers in ${city.value.name} — the local dance scene on WeDance.`,
)

useHead(() => ({
  title: seoTitle.value,
  meta: [
    { name: 'description', content: seoDescription.value },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
}))

// Style filter
const selectedStyle = ref('')

// People tabs (now also includes Venues — same Lineup shape with auto-generated avatars).
// Order: Venues first, then Organisers, then Artists.
type PeopleTab = 'teachers' | 'djs' | 'organisers' | 'venues'
const activeTab = ref<PeopleTab>('venues')

const peopleTabs: { key: PeopleTab; label: string }[] = [
  { key: 'venues', label: 'Venues' },
  { key: 'organisers', label: 'Organisers' },
  { key: 'teachers', label: 'Artists' },
]

// "Active this week" — who has an event on the calendar in the current week.
// Default view shows only these; "See all" reveals the full directory. The raw
// booked rows carry the identifiers we match on (venue/organiser @handle and the
// event's artists[] — names or @handles), so we derive one set per role.
const rawThisWeek = computed(() => bookedEvents.value.filter(
  b => b.eventDate && thisWeekDates.value.has(String(b.eventDate).slice(0, 10)),
))
const activeVenueIds = computed(() => new Set(rawThisWeek.value.map((b: any) => b.venueHandle).filter(Boolean)))
const activeOrganiserIds = computed(() => new Set(rawThisWeek.value.map((b: any) => b.organizerHandle).filter(Boolean)))
const activeArtistTokens = computed(() => {
  const s = new Set<string>()
  for (const b of rawThisWeek.value) {
    for (const a of ((b as any).artists || [])) s.add(String(a).trim().replace(/^@/, '').toLowerCase())
  }
  return s
})
function personActiveThisWeek(tab: PeopleTab, p: any): boolean {
  if (tab === 'venues') return activeVenueIds.value.has(p.id)
  if (tab === 'organisers') return activeOrganiserIds.value.has(p.id)
  if (tab === 'teachers') {
    const t = activeArtistTokens.value
    return t.has(String(p.id).toLowerCase()) || t.has(String(p.name).trim().toLowerCase())
  }
  return false
}

// Real venue profiles in this city.
const venues = computed<Teacher[]>(() => dbVenues.value)

const allPeople = computed(() => [...teachers.value, ...djs.value, ...organisers.value, ...venues.value])

const selectedPersonId = ref<string | null>(null)

const selectedPerson = computed(() =>
  allPeople.value.find(p => p.id === selectedPersonId.value),
)

const filterLabel = computed(() => {
  if (!selectedPerson.value) return null
  const tab = activeTab.value
  const role = tab === 'teachers'
    ? 'teacher'
    : tab === 'djs'
      ? 'DJ'
      : tab === 'organisers'
        ? 'organiser'
        : 'venue'
  return { name: selectedPerson.value.name, role }
})

function onSelectPerson(id: string | null) {
  selectedPersonId.value = id
}

function clearPersonFilter() {
  selectedPersonId.value = null
}

function switchTab(tab: PeopleTab) {
  activeTab.value = tab
  selectedPersonId.value = null
}

const fullLineup = computed(() => {
  if (activeTab.value === 'teachers') return teachers.value
  if (activeTab.value === 'djs') return djs.value
  if (activeTab.value === 'organisers') return organisers.value
  return venues.value
})
// Each tab shows only who has an event this week; the full directory lives on a
// dedicated "See all" page (/cities/[city]/{role}) for its own SEO.
const activeLineup = computed(() => fullLineup.value.filter(p => personActiveThisWeek(activeTab.value, p)))
const currentLineup = activeLineup

const roleSlugFor = (tab: PeopleTab) =>
  tab === 'organisers' ? 'organisers' : tab === 'venues' ? 'venues' : 'artists'
const seeAllHref = computed(() => `/cities/${slug}/${roleSlugFor(activeTab.value)}`)

const filteredEvents = computed(() => {
  let result: any[] = [...events, ...bookedThisWeek.value]
  if (selectedStyle.value) {
    result = result.filter(e => e.style === selectedStyle.value)
  }
  if (selectedPersonId.value) {
    const id = selectedPersonId.value
    if (activeTab.value === 'teachers') {
      result = result.filter(e => e.teacherId === id)
    } else if (activeTab.value === 'djs') {
      result = result.filter(e => e.djId === id)
    } else if (activeTab.value === 'organisers') {
      result = result.filter(e => e.organizerId === id)
    } else {
      const venueName = id.replace(/^venue:/, '')
      result = result.filter(e => e.venue === venueName)
    }
  }
  return result
})

// Upcoming festivals in this city — none in the migrated (historical) set, so
// the section hides itself until real upcoming festivals exist.
const cityFestivals = computed(() => [] as any[])

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

const styleChipColors = ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed']

// --- City video competition + giveaways (O-009) ---------------------------
// All client-fetched: the tRPC client uses a relative URL that throws under
// Nitro SSR (same reason AttendeeRoster loads on mount).
const { $trpc } = useNuxtApp()

interface LeaderboardVideo {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string | null
  danceStyle: string | null
  eloScore: number
  voteCount: number
}
const leaderboard = ref<LeaderboardVideo[]>([])
async function loadLeaderboard() {
  try {
    const rows = await $trpc.cityVideo.listApproved.query({ citySlug: slug })
    leaderboard.value = rows.slice(0, 5)
  } catch {
    leaderboard.value = []
  }
}

interface ActiveGiveaway {
  id: string
  sponsorName: string
  title: string
  description: string
  prizeDescription: string
  ctaUrl: string
  imageUrl: string | null
  termsUrl: string | null
  startsAt: string | Date
  endsAt: string | Date
}
const giveaways = ref<ActiveGiveaway[]>([])
async function loadGiveaways() {
  try {
    giveaways.value = await $trpc.giveaway.listActive.query({ citySlug: slug }) as ActiveGiveaway[]
  } catch {
    giveaways.value = []
  }
}

onMounted(() => {
  loadLeaderboard()
  loadGiveaways()
})
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as /, /festivals, /organizers, /for-events, /my-plan, /cities -->
    <SiteHeader />

    <!-- CITY HERO — landmark photo (Wikimedia) when we have one, else warm cream -->
    <section v-if="hero" class="relative">
      <div class="relative w-full h-64 sm:h-96 overflow-hidden">
        <img
          :src="hero.image"
          :alt="`${city.name} — landmark`"
          class="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchpriority="high"
        >
        <!-- Scrim: keeps the overlaid title legible over any photo -->
        <div class="absolute inset-0" style="background:linear-gradient(180deg, rgba(59,31,18,0.15) 0%, rgba(59,31,18,0.05) 40%, rgba(59,31,18,0.75) 100%);" />

        <div class="relative h-full max-w-4xl mx-auto px-4 flex flex-col justify-end pb-6">
          <div class="text-lg leading-none mb-1" style="font-family:'Caveat, cursive'; color:#fbe3c2;">
            — {{ city.eventCount }} weekly events
          </div>
          <h1 class="text-5xl sm:text-7xl leading-[0.98] tracking-tight" style="font-family:'Playfair Display', serif; color:#fff; text-shadow:0 2px 24px rgba(0,0,0,0.35);">
            {{ city.name }}
          </h1>
        </div>

        <!-- CC attribution (required for Wikimedia photos) -->
        <a
          v-if="hero.source"
          :href="hero.source" target="_blank" rel="noopener nofollow"
          class="absolute bottom-1.5 right-2 text-[10px] px-1.5 py-0.5 rounded"
          style="color:rgba(255,255,255,0.75); background:rgba(0,0,0,0.25); font-family: system-ui, sans-serif;"
          :title="`${hero.credit || 'Wikimedia Commons'}${hero.license ? ' · ' + hero.license : ''}`"
        >📷 {{ hero.credit || 'Wikimedia' }}<template v-if="hero.license"> · {{ hero.license }}</template></a>
      </div>

      <div class="relative max-w-4xl mx-auto px-4 pt-5 pb-2">
        <StyleFilter :styles="city.styles" v-model="selectedStyle" :accents="styleChipColors" />
      </div>

      <svg class="block w-full h-10 -mb-px" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- CITY HERO — fallback (no landmark image): original warm cream design -->
    <section v-else class="relative">
      <!-- Sun rays behind the whole hero, tinted by city accent -->
      <svg class="absolute -top-16 -right-16 w-64 h-64 opacity-20 pointer-events-none" viewBox="0 0 100 100">
        <g :stroke="accent" stroke-width="1.5" fill="none">
          <line v-for="i in 24" :key="i" x1="50" y1="50"
            :x2="50 + 48 * Math.cos(2 * Math.PI * i / 24)"
            :y2="50 + 48 * Math.sin(2 * Math.PI * i / 24)" />
        </g>
      </svg>

      <div class="relative max-w-4xl mx-auto px-4 pt-10 pb-6">
        <div class="text-lg leading-none mb-2" :style="{ fontFamily: 'Caveat, cursive', color: accent }">
          — {{ city.eventCount }} weekly events
        </div>
        <h1 class="text-5xl sm:text-7xl leading-[0.98] tracking-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ city.name }}
        </h1>
        <p class="mt-2 text-sm sm:text-base flex items-center gap-1 italic" style="color:#5b3a1d; font-family:'Playfair Display', serif;">
          <MapPin class="w-3.5 h-3.5" style="color:#9a5614;" />
          {{ city.country }}
        </p>

        <!-- Style filter chips (V3 warm palette) -->
        <StyleFilter :styles="city.styles" v-model="selectedStyle" :accents="styleChipColors" class="mt-6" />
      </div>

      <!-- Wave divider -->
      <svg class="block w-full h-10 -mb-px" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- PEOPLE TABS -->
    <section class="border-b" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);">
      <div class="max-w-4xl mx-auto px-4">
        <div class="flex items-baseline justify-between gap-3 pt-6">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Who's on the floor</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              The <em class="italic" style="color:#dc2626;">people</em> behind it all.
            </h2>
          </div>
          <NuxtLink
            :to="seeAllHref"
            class="text-xs italic hover:underline whitespace-nowrap shrink-0"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            All {{ city.name }} {{ activeTab === 'organisers' ? 'organisers' : activeTab === 'venues' ? 'venues' : 'artists' }} →
          </NuxtLink>
        </div>

        <!-- Tab headers -->
        <div class="flex gap-1 mt-4 border-b -mb-px overflow-x-auto" style="border-color:#3b1f0d22;">
          <button
            v-for="tab in peopleTabs"
            :key="tab.key"
            type="button"
            class="px-4 py-3 text-sm italic whitespace-nowrap transition-all -mb-px border-b-2"
            :style="activeTab === tab.key
              ? { borderColor: accent, color: accent, fontWeight: 700, fontFamily: 'Playfair Display, serif' }
              : { borderColor: 'transparent', color: '#5b3a1d', fontFamily: 'Playfair Display, serif' }"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- This-week relevance label — the tab shows only who has an event this
             week; the full directory is the "All … →" link in the header above. -->
        <div class="pt-4 pb-1">
          <span class="text-xs italic" style="color:#9a5614; font-family:'Playfair Display', serif;">
            {{ activeLineup.length
              ? `${activeLineup.length} with events this week`
              : 'None with events this week' }}
          </span>
        </div>

        <!-- Tab content -->
        <div class="py-5">
          <p
            v-if="!currentLineup.length"
            class="text-sm italic py-4"
            style="color:#5b3a1d; font-family:'Playfair Display', serif;"
          >
            <template v-if="fullLineup.length">
              Nobody has an event this week yet.
            </template>
            <template v-else>
              No {{ activeTab === 'venues' ? 'venues' : activeTab === 'organisers' ? 'organisers' : 'artists' }} listed here yet.
            </template>
          </p>
          <Lineup
            v-else
            :teachers="currentLineup"
            :selected-id="selectedPersonId"
            @select="onSelectPerson"
          />
          <TeacherProfile
            v-if="selectedPerson"
            :teacher="selectedPerson"
            class="mt-4"
            @close="clearPersonFilter"
          />
        </div>
      </div>
    </section>

    <!-- LOCAL COMMUNITY GROUPS — cold-start filler when there are few/no events -->
    <ClientOnly v-if="bookedEventsLoaded && bookedThisWeek.length === 0">
      <CommunityGroupsSection :city-slug="slug" :city-name="city.name" />
    </ClientOnly>

    <!-- WEEKLY SCHEDULE -->
    <section class="max-w-4xl mx-auto px-4 py-12">
      <div class="flex flex-wrap items-baseline justify-between gap-3 mb-6">
        <div>
          <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">This week</div>
          <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
            Where you're <em class="italic" style="color:#dc2626;">dancing.</em>
          </h2>
        </div>
        <div v-if="filterLabel" class="flex items-center gap-2 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          <span>
            Filtering by {{ filterLabel.role }} <strong style="color:#3b1f0d;">{{ filterLabel.name }}</strong>
          </span>
          <button
            type="button"
            class="text-xs font-bold underline"
            :style="{ color: accent, fontFamily: 'system-ui, sans-serif' }"
            @click="clearPersonFilter"
          >
            Clear
          </button>
        </div>
      </div>
      <WeeklyCalendar
        :events="filteredEvents"
        :week-plan-ids="weekPlanIds"
        :teachers="[...teachers, ...djs, ...organisers]"
        @toggle="onToggleEvent"
        @select-teacher="onSelectPerson"
      />
    </section>

    <!-- VIDEO OF THE DAY — pairwise vote -->
    <section id="vote" class="border-t" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);">
      <div class="max-w-4xl mx-auto px-4 py-12">
        <CityVideoVote :city-slug="slug" :accent="accent" />
      </div>
    </section>

    <!-- COMPETITION — leaderboard + submit -->
    <section id="compete" class="max-w-4xl mx-auto px-4 py-12">
      <div class="mb-6">
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">This month's competition</div>
        <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          The <em class="italic" :style="{ color: accent }">leaderboard.</em>
        </h2>
        <p class="mt-2 max-w-2xl text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Post a clip from a {{ city.name }} dance floor and the community votes head-to-head
          in the matchup above. The highest-ranked video this month gets featured on WeDance{{ ' ' + city.name }}<template v-if="giveaways.length">, and wins this month's prize</template>. Any dancer, any style.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Leaderboard -->
        <div>
          <ol v-if="leaderboard.length" class="space-y-2">
            <li
              v-for="(v, i) in leaderboard"
              :key="v.id"
              class="flex items-center gap-3 rounded-xl border bg-white p-3"
              :style="{ borderColor: accent + '33', boxShadow: '0 1px 0 ' + accent + '14' }"
            >
              <span
                class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                :style="{ background: i === 0 ? accent : '#9a5614' }"
              >{{ i + 1 }}</span>
              <a
                :href="v.videoUrl"
                target="_blank"
                rel="noopener"
                class="min-w-0 flex-1"
              >
                <p class="truncate text-sm font-bold hover:underline" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
                  {{ v.title }}
                </p>
                <p class="text-[11px]" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <span v-if="v.danceStyle">{{ v.danceStyle }} · </span>ELO {{ v.eloScore }} · {{ v.voteCount }} vote{{ v.voteCount === 1 ? '' : 's' }}
                </p>
              </a>
            </li>
          </ol>
          <div
            v-else
            class="rounded-xl border-2 border-dashed p-6 text-center"
            style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
          >
            <p class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              No entries yet
            </p>
            <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              Be the first to enter this month's competition.
            </p>
          </div>
        </div>

        <!-- Submit form -->
        <SubmitVideoForm
          :city-slug="slug"
          :city-name="city.name"
          :accent="accent"
          :prize="giveaways.length ? (giveaways[0].prizeDescription || giveaways[0].title) : undefined"
          @submitted="loadLeaderboard"
        />
      </div>
    </section>

    <!-- GIVEAWAYS -->
    <section
      v-if="giveaways.length"
      id="giveaways"
      class="border-t"
      style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);"
    >
      <div class="max-w-4xl mx-auto px-4 py-12">
        <div class="mb-6">
          <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Win something</div>
          <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
            Local <em class="italic" :style="{ color: accent }">giveaways.</em>
          </h2>
        </div>
        <div class="grid gap-4">
          <GiveawayCard
            v-for="g in giveaways"
            :key="g.id"
            :giveaway="g"
            :accent="accent"
          />
        </div>
      </div>
    </section>

    <!-- UPCOMING FESTIVALS IN THIS CITY (V3-styled cards) -->
    <section v-if="cityFestivals.length > 0" class="border-t" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);">
      <div class="max-w-4xl mx-auto px-4 py-12">
        <div class="flex items-baseline justify-between mb-6">
          <div>
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Coming to {{ city.name }}</div>
            <h2 class="mt-2 text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              Upcoming <em class="italic" style="color:#dc2626;">festivals.</em>
            </h2>
          </div>
          <NuxtLink
            to="/festivals"
            class="text-xs italic hover:underline"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            All festivals →
          </NuxtLink>
        </div>

        <div class="grid gap-4">
          <NuxtLink
            v-for="f in cityFestivals"
            :key="f.slug"
            :to="`/festivals/${f.slug}`"
            class="group block rounded-2xl overflow-hidden bg-white border transition-all hover:-translate-y-1"
            :style="{ borderColor: f.accentColor + '55', boxShadow: '0 1px 0 ' + f.accentColor + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
          >
            <div class="h-1.5" :style="{ background: f.accentColor }" />
            <div class="p-5">
              <div class="flex items-start gap-4">
                <img
                  v-if="f.logo"
                  :src="f.logo"
                  :alt="f.name"
                  class="w-14 h-14 rounded-full shrink-0 shadow-sm"
                >
                <div
                  v-else
                  class="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-xl font-bold text-white shadow-sm"
                  :style="{ background: f.accentColor }"
                >
                  {{ f.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-lg leading-tight" style="color:#3b1f0d;">
                    {{ f.name }}
                  </h3>
                  <div class="flex items-center gap-4 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                    <span class="inline-flex items-center gap-1">
                      <Calendar class="w-3 h-3" style="color:#9a5614;" />
                      {{ formatDateRange(f.startDate, f.endDate) }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                      <Users class="w-3 h-3" style="color:#9a5614;" />
                      {{ f.workshopCount }} workshops
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1.5 mt-3">
                    <span
                      v-for="style in f.styles.slice(0, 4)"
                      :key="style"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      :style="{ background: f.accentColor + '18', color: f.accentColor }"
                    >
                      {{ style }}
                    </span>
                  </div>
                </div>
                <ArrowRight class="w-4 h-4 mt-1.5 shrink-0 transition-transform group-hover:translate-x-1" :style="{ color: f.accentColor }" />
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Ask locals (client-only: tRPC has no SSR). Local groups now live under
         the Organisers directory (/cities/[city]/organisers) — one home. -->
    <ClientOnly>
      <section class="max-w-2xl mx-auto px-4 pb-10">
        <AskLocalsSection :city-slug="slug" :city-name="city.name" />
      </section>
    </ClientOnly>

    <SiteFooter />

    <!-- Soft plan nudge — same pattern as /festivals and /festivals/[slug]. -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <NuxtLink
          v-if="weekCount > 0"
          to="/my-plan"
          class="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          :style="{ background: accent, boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 3px 0 -1px rgba(0,0,0,0.15)' }"
        >
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black bg-white"
            :style="{ color: accent }"
          >{{ weekCount }}</span>
          <span style="font-family:'Playfair Display', serif; letter-spacing:0.01em;">in your week</span>
          <span style="font-family:'Caveat', cursive; font-size:16px; opacity:0.85;">— see dashboard</span>
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </Transition>
    </Teleport>

    <SignUpModal v-model:open="showSignUp" action="plan" />
  </div>
</template>
