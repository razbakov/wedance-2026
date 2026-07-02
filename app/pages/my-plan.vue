<script setup lang="ts">
/**
 * /my-plan — signed-in dashboard.
 * Shows every festival the user has picked with a next-action nudge.
 * Replaces the per-page CartDrawer as the single source of "what's next".
 * V3 tropical style.
 */
import { ArrowRight, MapPin, Calendar, Search } from 'lucide-vue-next'
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
  },
]

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

// Heuristic next-action per festival. Without real per-fest workshop
// state persisted server-side, we key off proximity: closer festivals
// get more concrete asks.
function nextAction(f: typeof catalogue[number]) {
  const now = new Date()
  const target = new Date(f.startDate)
  const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0)  return { label: 'Leave a review',      href: `/festivals/${f.slug}#venue`,    color: '#9a5614' }
  if (days <= 3) return { label: 'Pack + travel',       href: `/festivals/${f.slug}#venue`,    color: '#dc2626' }
  if (days <= 14) return { label: 'Find a partner',     href: `/festivals/${f.slug}#discover`, color: '#f59e0b' }
  if (days <= 45) return { label: 'Pick your workshops', href: `/festivals/${f.slug}#schedule`, color: '#0891b2' }
  return { label: 'Explore the lineup',                 href: `/festivals/${f.slug}#lineup`,   color: '#16a34a' }
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

          <div class="p-5">
            <div class="flex items-start gap-4">
              <!-- Logo -->
              <NuxtLink :to="`/festivals/${f.slug}`" class="shrink-0">
                <img
                  v-if="f.logo"
                  :src="f.logo"
                  :alt="f.name"
                  class="w-14 h-14 rounded-full shadow-sm"
                >
                <div
                  v-else
                  class="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-sm"
                  :style="{ background: f.accentColor }"
                >
                  {{ f.name.charAt(0) }}
                </div>
              </NuxtLink>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <NuxtLink :to="`/festivals/${f.slug}`" class="min-w-0">
                    <h3 class="font-bold text-lg leading-tight" style="color:#3b1f0d;">
                      {{ f.name }}
                    </h3>
                  </NuxtLink>
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

                <div class="flex items-center gap-4 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" style="color:#9a5614;" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <MapPin class="w-3 h-3" style="color:#9a5614;" />
                    {{ f.venue }}, {{ f.location }}
                  </span>
                </div>

                <!-- Next action + secondary controls -->
                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <NuxtLink
                    :to="nextAction(f).href"
                    class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
                    :style="{
                      background: nextAction(f).color,
                      boxShadow: '0 3px 0 -1px ' + nextAction(f).color + 'CC',
                      fontFamily: 'system-ui, sans-serif',
                    }"
                  >
                    {{ nextAction(f).label }} <ArrowRight class="w-3.5 h-3.5" />
                  </NuxtLink>
                  <NuxtLink
                    :to="`/festivals/${f.slug}`"
                    class="text-xs italic hover:underline"
                    style="color:#5b3a1d;"
                  >
                    Open plan
                  </NuxtLink>
                  <button
                    type="button"
                    class="ml-auto text-xs italic hover:underline"
                    style="color:#9a5614; font-family: system-ui, sans-serif;"
                    @click="onRemove(f.slug)"
                  >
                    Remove
                  </button>
                </div>
              </div>
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
