<script setup lang="ts">
/**
 * /festivals — the listing.
 * Restyled 2026-07-02 to match V3 tropical direction on /.
 * `layout: false` + inline V3 header so other pages that still use
 * the default layout are unaffected. YearCanvas sidebar + mobile
 * year drawer preserved. Fake stats bar (12k+ dancers / 180+ / 35)
 * removed — same "no fake friends" rule the homepage runs.
 *
 * RAZ-105: data now fetched from /api/festivals (DB-driven, SSR) instead
 * of hardcoded mock imports. Past festivals filtered server-side.
 */
import {
  Search,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
} from 'lucide-vue-next'
import { daysUntil } from '#shared/utils/festivalDateFormatter'

interface FestivalRow {
  slug: string
  name: string
  startDate: string | null
  endDate: string | null
  city: string | null
  country: string | null
  description: string | null
  styles: string[]
  logo: string | null
  accentColor: string | null
  ticketUrl: string | null
  signupCount: number
}

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

// Year plan — sidebar retired; picks now surface via the floating
// nudge pill and the full view lives on /my-plan.
const { yearPlanIds, toggleFestival, yearCount } = useYearPlan()

// Auth gate — "Going?" requires sign-in
const { isSignedIn } = useAuth()
const showSignUp = ref(false)

function onPick(slug: string) {
  if (!isSignedIn.value) {
    showSignUp.value = true
    return
  }
  toggleFestival(slug)
}

// Festivals from DB (SSR — no spinner). Past festivals already excluded
// server-side, sorted by startDate ascending.
const { data: allFestivals } = await useFetch<FestivalRow[]>('/api/festivals', {
  key: 'festivals-directory',
})

// Search
const searchQuery = ref('')

const DEFAULT_ACCENT = '#9a5614'

function location(f: FestivalRow): string {
  return [f.city, f.country].filter(Boolean).join(', ') || 'TBA'
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

function accent(f: FestivalRow): string {
  return f.accentColor || DEFAULT_ACCENT
}

const filteredFestivals = computed(() => {
  const festivals = allFestivals.value ?? []

  if (!searchQuery.value.trim()) return festivals

  const q = searchQuery.value.toLowerCase()
  return festivals.filter(f =>
    f.name.toLowerCase().includes(q)
    || location(f).toLowerCase().includes(q)
    || f.styles.some((s: string) => s.toLowerCase().includes(q)),
  )
})

const styleChips = ['Salsa', 'Bachata', 'Timba', 'Kizomba', 'Son']
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as / and /organizers -->
    <SiteHeader />

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
          <StyleFilter :styles="styleChips" v-model="searchQuery" class="mt-4" />
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
          :style="{ borderColor: accent(f) + '55', boxShadow: '0 1px 0 ' + accent(f) + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <!-- Color accent bar -->
          <div class="h-1.5" :style="{ background: accent(f) }" />

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
                :style="{ background: accent(f) }"
              >
                {{ f.name.charAt(0) }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-bold text-lg leading-tight" style="color:#3b1f0d;">
                    {{ f.name }}
                  </h3>
                  <span
                    v-if="f.startDate"
                    class="text-[10px] uppercase tracking-widest font-bold shrink-0 mt-1"
                    style="font-family:'Caveat', cursive; font-size:15px; text-transform:none; letter-spacing:normal;"
                    :style="{ color: accent(f) }"
                  >
                    {{ daysUntil(f.startDate) }}
                  </span>
                </div>

                <div class="flex items-center gap-4 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <span v-if="f.startDate && f.endDate" class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" style="color:#9a5614;" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <MapPin class="w-3 h-3" style="color:#9a5614;" />
                    {{ location(f) }}
                  </span>
                </div>

                <!-- Styles -->
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span
                    v-for="style in f.styles.slice(0, 4)"
                    :key="style"
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    :style="{ background: accent(f) + '18', color: accent(f) }"
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
                  <span v-if="f.signupCount" class="flex items-center gap-1">
                    <Users class="w-3 h-3" style="color:#9a5614;" />
                    {{ f.signupCount }} planning
                  </span>
                  <button
                    type="button"
                    class="ml-auto text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                    :style="yearPlanIds.has(f.slug)
                      ? { background: accent(f), color: 'white' }
                      : { background: 'white', color: accent(f), border: '1.5px solid ' + accent(f) + '55' }"
                    @click.prevent="onPick(f.slug)"
                  >
                    {{ yearPlanIds.has(f.slug) ? 'Going!' : 'Going?' }}
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
          @click="router.push('/organizers/create')"
        >
          Start listing <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </section>

    <SiteFooter />

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

    <SignUpModal v-model:open="showSignUp" action="plan" />
  </div>
</template>
