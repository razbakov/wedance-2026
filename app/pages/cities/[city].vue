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
import type { City } from '~/types/city'
import type { Teacher } from '~/types/festival'
import { getStyleColors } from '~/lib/style-colors'
import * as munichData from '~/data/mock-city-munich'
import * as berlinData from '~/data/mock-city-berlin'
import * as salsaOpen from '~/data/mock-festival'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'

definePageMeta({ layout: false })

const route = useRoute()
const slug = route.params.city as string

// Week plan — sidebar retired; picks now surface via the floating
// nudge pill and the full view lives on /my-plan.
const { weekPlanIds, toggleEvent, weekCount } = useWeekPlan()

const cityDataMap = {
  munich: munichData,
  berlin: berlinData,
} as Record<string, typeof munichData>

const data = cityDataMap[slug]

if (!data) {
  throw createError({ statusCode: 404, message: 'City not found' })
}

const city = data.city
const events = data.events
const teachers = data.teachers
const djs = data.djs
const organisers = data.organisers

const cityAccent: Record<string, string> = {
  munich: '#dc2626',
  berlin: '#0891b2',
}
const accent = cityAccent[slug] || '#a855f7'

useHead({
  title: `WeDance — ${city.name}`,
  meta: [
    { name: 'description', content: `Dance classes, socials, and practicas in ${city.name}. ${city.eventCount} weekly events.` },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

// Style filter
const selectedStyle = ref('')

// People tabs (now also includes Venues — same Lineup shape with auto-generated avatars)
type PeopleTab = 'teachers' | 'djs' | 'organisers' | 'venues'
const activeTab = ref<PeopleTab>('teachers')

const peopleTabs: { key: PeopleTab; label: string }[] = [
  { key: 'teachers', label: 'Teachers' },
  { key: 'djs', label: 'DJs' },
  { key: 'organisers', label: 'Organisers' },
  { key: 'venues', label: 'Venues' },
]

// Venues derived from events. Slug = venue name, photo = auto-avatar.
const venues = computed<Teacher[]>(() => {
  const counts = new Map<string, number>()
  for (const e of events) {
    if (!e.venue) continue
    counts.set(e.venue, (counts.get(e.venue) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      id: `venue:${name}`,
      name,
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=ec4899&color=fff&bold=true&rounded=true`,
      bio: `${count} weekly event${count !== 1 ? 's' : ''}`,
      styles: [],
    } as unknown as Teacher))
})

const allPeople = computed(() => [...teachers, ...djs, ...organisers, ...venues.value])

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

const currentLineup = computed(() => {
  if (activeTab.value === 'teachers') return teachers
  if (activeTab.value === 'djs') return djs
  if (activeTab.value === 'organisers') return organisers
  return venues.value
})

const filteredEvents = computed(() => {
  let result = events
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

// Upcoming festivals in this city
const cityFestivals = computed(() => {
  const cityMatch = city.name.toLowerCase()
  const allFestivals = [
    {
      slug: salsaOpen.mockFestival.slug,
      name: salsaOpen.mockFestival.name,
      startDate: salsaOpen.mockFestival.startDate,
      endDate: salsaOpen.mockFestival.endDate,
      location: 'Berlin, Germany',
      logo: salsaOpen.mockFestival.logo,
      accentColor: salsaOpen.mockFestival.accentColor,
      styles: ['Salsa', 'Bachata'],
      workshopCount: salsaOpen.mockWorkshops.length,
    },
    {
      slug: cubanFire.mockFestival.slug,
      name: cubanFire.mockFestival.name,
      startDate: cubanFire.mockFestival.startDate,
      endDate: cubanFire.mockFestival.endDate,
      location: 'Munich, Germany',
      logo: '',
      accentColor: cubanFire.mockFestival.accentColor,
      styles: ['Timba', 'Salsa', 'Son', 'Rumba'],
      workshopCount: cubanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    },
    {
      slug: caribbeanUrbanFire.mockFestival.slug,
      name: caribbeanUrbanFire.mockFestival.name,
      startDate: caribbeanUrbanFire.mockFestival.startDate,
      endDate: caribbeanUrbanFire.mockFestival.endDate,
      location: 'Munich, Germany',
      logo: '',
      accentColor: caribbeanUrbanFire.mockFestival.accentColor,
      styles: ['Salsa', 'Bachata', 'Hip Hop'],
      workshopCount: caribbeanUrbanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    },
  ]
  return allFestivals.filter(f => f.location.toLowerCase().includes(cityMatch))
})

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
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as /, /festivals, /organizers, /for-events, /my-plan, /cities -->
    <SiteHeader />

    <!-- CITY HERO -->
    <section class="relative">
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
            :to="`/artists?city=${encodeURIComponent(city.name)}`"
            class="text-xs italic hover:underline whitespace-nowrap shrink-0"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            All {{ city.name }} artists →
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

        <!-- Tab content -->
        <div class="py-5">
          <Lineup
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

    <!-- WEEKLY SCHEDULE -->
    <section class="max-w-6xl mx-auto px-4 py-12">
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
        @toggle="toggleEvent"
        @select-teacher="onSelectPerson"
      />
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
  </div>
</template>
