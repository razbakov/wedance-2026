<script setup lang="ts">
/**
 * /festivals — the listing.
 * Restyled 2026-07-02 to match V3 tropical direction on /.
 * `layout: false` + inline V3 header so other pages that still use
 * the default layout are unaffected. YearCanvas sidebar + mobile
 * year drawer preserved. Fake stats bar (12k+ dancers / 180+ / 35)
 * removed — same "no fake friends" rule the homepage runs.
 */
import {
  Search,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  Heart,
} from 'lucide-vue-next'
import * as salsaOpen from '~/data/mock-festival'
import * as meneate from '~/data/mock-meneate'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Festivals',
  meta: [
    { name: 'description', content: 'Every dance festival mapped. See who is going before you book.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const router = useRouter()

// Year plan state (unchanged)
// Year plan — sidebar retired; picks now surface via the floating
// nudge pill and the full view lives on /my-plan.
const { yearPlanIds, toggleFestival, yearCount } = useYearPlan()

// Search
const searchQuery = ref('')

const allFestivals = [
  {
    slug: meneate.mockFestival.slug,
    name: meneate.mockFestival.name,
    startDate: meneate.mockFestival.startDate,
    endDate: meneate.mockFestival.endDate,
    location: 'Vienna, Austria',
    logo: meneate.mockFestival.logo,
    accentColor: meneate.mockFestival.accentColor,
    styles: ['Timba', 'Salsa', 'Son', 'Rumba'],
    attendeeCount: meneate.mockFestival.attendeeCount,
    friendsGoing: 3,
    workshopCount: meneate.mockWorkshops.filter(w => w.type !== 'party').length,
    partyCount: meneate.mockWorkshops.filter(w => w.type === 'party').length,
    description: meneate.mockFestival.description,
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
    attendeeCount: cubanFire.mockFestival.attendeeCount,
    friendsGoing: 1,
    workshopCount: cubanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    partyCount: cubanFire.mockWorkshops.filter(w => w.type === 'party').length,
    description: cubanFire.mockFestival.description,
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
    attendeeCount: caribbeanUrbanFire.mockFestival.attendeeCount,
    friendsGoing: 0,
    workshopCount: caribbeanUrbanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    partyCount: caribbeanUrbanFire.mockWorkshops.filter(w => w.type === 'party').length,
    description: caribbeanUrbanFire.mockFestival.description,
  },
  {
    slug: salsaOpen.mockFestival.slug,
    name: salsaOpen.mockFestival.name,
    startDate: salsaOpen.mockFestival.startDate,
    endDate: salsaOpen.mockFestival.endDate,
    location: 'Berlin, Germany',
    logo: salsaOpen.mockFestival.logo,
    accentColor: salsaOpen.mockFestival.accentColor,
    styles: ['Salsa', 'Bachata'],
    attendeeCount: salsaOpen.mockFestival.attendeeCount,
    friendsGoing: 2,
    workshopCount: salsaOpen.mockWorkshops.length,
    partyCount: 0,
    description: salsaOpen.mockFestival.description,
    earlyBirdDeadline: '2026-06-01',
  },
  {
    slug: 'bachata-stars-barcelona-2026',
    name: 'Bachata Stars Barcelona',
    startDate: '2026-07-03',
    endDate: '2026-07-06',
    location: 'Barcelona, Spain',
    logo: 'https://ui-avatars.com/api/?name=BSB&size=80&background=7c3aed&color=fff&bold=true&rounded=true',
    accentColor: '#7c3aed',
    styles: ['Bachata', 'Bachata Sensual'],
    attendeeCount: 620,
    friendsGoing: 1,
    workshopCount: 24,
    partyCount: 4,
    description: 'The biggest Bachata event in Southern Europe.',
    earlyBirdDeadline: '2026-06-15',
  },
  {
    slug: 'timba-fest-london-2026',
    name: 'Timba Fest London',
    startDate: '2026-09-18',
    endDate: '2026-09-21',
    location: 'London, UK',
    logo: 'https://ui-avatars.com/api/?name=TFL&size=80&background=0ea5e9&color=fff&bold=true&rounded=true',
    accentColor: '#0ea5e9',
    styles: ['Timba', 'Son', 'Rumba'],
    attendeeCount: 310,
    friendsGoing: 0,
    workshopCount: 18,
    partyCount: 3,
    description: 'Cuban music and dance in the heart of London.',
  },
  {
    slug: 'kizomba-prague-2026',
    name: 'Kizomba & Urban Kiz Prague',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    location: 'Prague, Czech Republic',
    logo: 'https://ui-avatars.com/api/?name=KPR&size=80&background=ec4899&color=fff&bold=true&rounded=true',
    accentColor: '#ec4899',
    styles: ['Kizomba', 'Urban Kiz', 'Semba'],
    attendeeCount: 275,
    friendsGoing: 0,
    workshopCount: 16,
    partyCount: 3,
    description: 'Kizomba, Urban Kiz and Semba in beautiful Prague.',
  },
]

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

function daysUntil(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Happening now'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 30) return `In ${diff} days`
  if (diff <= 60) return `In ${Math.ceil(diff / 7)} weeks`
  return `In ${Math.ceil(diff / 30)} months`
}

const filteredFestivals = computed(() => {
  if (!searchQuery.value.trim()) return allFestivals
  const q = searchQuery.value.toLowerCase()
  return allFestivals.filter(f =>
    f.name.toLowerCase().includes(q)
    || f.location.toLowerCase().includes(q)
    || f.styles.some(s => s.toLowerCase().includes(q))
  )
})

const styleChips = ['Salsa', 'Bachata', 'Timba', 'Kizomba', 'Son']
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as / and /organizers -->
    <header class="border-b" style="border-color:#3b1f0d33;">
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
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">
          The festival year
        </div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          Pick your <em class="italic" style="color:#dc2626;">next one.</em>
          <span style="font-family:'Caveat', cursive; color:#16a34a; font-size:0.9em;"> Plan the year.</span>
        </h1>
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          Every festival mapped. See who is going before you book.
        </p>

        <!-- Search + chips -->
        <div class="mt-8 max-w-lg mx-auto">
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style="color:#9a5614;" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by city, style, or festival"
              class="w-full h-12 rounded-full pl-11 pr-4 text-sm outline-none transition-all"
              style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 16px rgba(59, 31, 18, 0.04);"
            >
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              v-for="(style, i) in styleChips"
              :key="style"
              type="button"
              class="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              :style="searchQuery === style
                ? { background: ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b'][i], color: 'white', boxShadow: '0 2px 0 -1px ' + ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b'][i] }
                : { background: 'white', color: ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b'][i], border: '1px solid ' + ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b'][i] + '55' }"
              @click="searchQuery = searchQuery === style ? '' : style"
            >
              {{ style }}
            </button>
          </div>
        </div>
      </div>

      <!-- Wave divider -->
      <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- Festival grid -->
    <section class="max-w-4xl mx-auto px-4 pb-12">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ searchQuery ? 'Results' : 'Upcoming festivals' }}
        </h2>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ filteredFestivals.length }} event{{ filteredFestivals.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div
        v-if="!filteredFestivals.length"
        class="text-center py-14 rounded-2xl border-2 border-dashed"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <Search class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Nothing matches "{{ searchQuery }}"</p>
        <button
          type="button"
          class="text-xs font-bold mt-2 underline"
          style="color:#dc2626; font-family: system-ui, sans-serif;"
          @click="searchQuery = ''"
        >
          Clear search
        </button>
      </div>

      <div v-else class="grid gap-4">
        <NuxtLink
          v-for="f in filteredFestivals"
          :key="f.slug"
          :to="`/festivals/${f.slug}`"
          class="group block rounded-2xl overflow-hidden bg-white border transition-all hover:-translate-y-1"
          :style="{ borderColor: f.accentColor + '55', boxShadow: '0 1px 0 ' + f.accentColor + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <!-- Color accent bar -->
          <div class="h-1.5" :style="{ background: f.accentColor }" />

          <div class="p-5">
            <div class="flex items-start gap-4">
              <!-- Logo -->
              <img
                v-if="f.logo"
                :src="f.logo"
                :alt="f.name"
                class="w-14 h-14 rounded-full shrink-0 shadow-sm"
              />
              <div
                v-else
                class="w-14 h-14 rounded-full shrink-0 flex items-center justify-center text-xl font-bold text-white shadow-sm"
                :style="{ background: f.accentColor }"
              >
                {{ f.name.charAt(0) }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-bold text-lg leading-tight" style="color:#3b1f0d;">
                    {{ f.name }}
                  </h3>
                  <span
                    class="text-[10px] uppercase tracking-widest font-bold shrink-0 mt-1"
                    style="font-family:'Caveat', cursive; font-size:15px; text-transform:none; letter-spacing:normal;"
                    :style="{ color: f.accentColor }"
                  >
                    {{ daysUntil(f.startDate) }}
                  </span>
                </div>

                <div class="flex items-center gap-4 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" style="color:#9a5614;" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <MapPin class="w-3 h-3" style="color:#9a5614;" />
                    {{ f.location }}
                  </span>
                </div>

                <!-- Styles -->
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span
                    v-for="style in f.styles.slice(0, 4)"
                    :key="style"
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    :style="{ background: f.accentColor + '18', color: f.accentColor }"
                  >
                    {{ style }}
                  </span>
                  <span
                    v-if="f.styles.length > 4"
                    class="px-2 py-0.5 rounded-full text-[10px]"
                    style="color:#9a5614;"
                  >
                    +{{ f.styles.length - 4 }}
                  </span>
                </div>

                <!-- Stats row -->
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <span class="flex items-center gap-1">
                    <Users class="w-3 h-3" style="color:#9a5614;" />
                    {{ f.attendeeCount }} planning
                  </span>
                  <span>{{ f.workshopCount }} workshops</span>
                  <span v-if="f.partyCount">{{ f.partyCount }} {{ f.partyCount === 1 ? 'party' : 'parties' }}</span>
                  <span
                    v-if="f.friendsGoing"
                    class="flex items-center gap-1 font-bold"
                    :style="{ color: f.accentColor }"
                  >
                    <Heart class="w-3 h-3" />
                    {{ f.friendsGoing }} friend{{ f.friendsGoing === 1 ? '' : 's' }} going
                  </span>
                  <button
                    type="button"
                    class="ml-auto text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    :style="yearPlanIds.has(f.slug)
                      ? { background: f.accentColor, color: 'white' }
                      : { background: 'white', color: f.accentColor, border: '1.5px solid ' + f.accentColor + '55' }"
                    @click.prevent="toggleFestival(f.slug)"
                  >
                    {{ yearPlanIds.has(f.slug) ? '✓ Picked' : 'Pick' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Organizer CTA -->
    <section class="max-w-4xl mx-auto px-4 py-10">
      <div
        class="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style="background:white; border:1px solid #0891b255; box-shadow: 0 1px 0 #0891b222, 0 8px 22px rgba(59,31,18,0.05);"
      >
        <div>
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style="color:#0891b2;">For organizers</div>
          <h3 class="text-lg font-bold" style="color:#3b1f0d;">Organize a dance festival?</h3>
          <p class="text-sm mt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            List your event for free. Ticket it on us.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold uppercase tracking-wider shrink-0"
          style="background:#0891b2; box-shadow: 0 3px 0 -1px #0e7490;"
          @click="router.push('/organizers')"
        >
          Learn more <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </section>

    <footer class="border-t py-6 text-center text-xs" style="border-color:#3b1f0d22; color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
      WeDance ·
      <NuxtLink to="/" class="underline">home</NuxtLink> ·
      <NuxtLink to="/cities" class="underline">cities</NuxtLink> ·
      <NuxtLink to="/for-events" class="underline">for events</NuxtLink> ·
      <NuxtLink to="/organizers" class="underline">for organizers</NuxtLink>
    </footer>

    <!-- Soft year-plan nudge — appears only when the user has picks.
         Same pattern as the /festivals/[slug] plan nudge. YearCanvas
         sidebar + mobile drawer retired; full year view lives on /my-plan. -->
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
          v-if="yearCount > 0"
          to="/my-plan"
          class="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          style="background:#dc2626; box-shadow: 0 6px 20px rgba(0,0,0,0.18), 0 3px 0 -1px rgba(0,0,0,0.15);"
        >
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black bg-white"
            style="color:#dc2626;"
          >{{ yearCount }}</span>
          <span style="font-family:'Playfair Display', serif; letter-spacing:0.01em;">in your year</span>
          <span style="font-family:'Caveat', cursive; font-size:16px; opacity:0.85;">— see dashboard</span>
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </Transition>
    </Teleport>
  </div>
</template>
