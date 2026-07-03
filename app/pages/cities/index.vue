<script setup lang="ts">
/**
 * /cities — the listing.
 * Restyled 2026-07-02 to match V3 tropical direction on / .
 * layout: false + inline V3 header. Dropped fake round-number
 * "dancerCount" per the "no fake friends" rule the rest of the
 * site is built on. Weekly event count kept — plausible signal
 * that can be tied to real event data.
 */
import { Search, MapPin, Calendar, ArrowRight } from 'lucide-vue-next'
import * as munich from '~/data/mock-city-munich'
import * as berlin from '~/data/mock-city-berlin'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Cities',
  meta: [
    { name: 'description', content: 'Every dance floor in your city — weekly socials, teachers, and venues.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const router = useRouter()

const searchQuery = ref('')

const cityColors: Record<string, string> = {
  munich: '#dc2626',
  berlin: '#0891b2',
}

const allCities = [
  { ...munich.city, accent: cityColors[munich.city.slug] || '#a855f7' },
  { ...berlin.city, accent: cityColors[berlin.city.slug] || '#a855f7' },
]

const filteredCities = computed(() => {
  if (!searchQuery.value.trim()) return allCities
  const q = searchQuery.value.toLowerCase()
  return allCities.filter(c =>
    c.name.toLowerCase().includes(q)
    || c.country.toLowerCase().includes(q)
    || c.styles.some(s => s.toLowerCase().includes(q)),
  )
})

const allStyles = computed(() => {
  const styles = new Set<string>()
  allCities.forEach(c => c.styles.forEach(s => styles.add(s)))
  return Array.from(styles)
})

const styleChipColors = ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed']
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as / , /festivals, /organizers, /for-events, /my-plan -->
    <SiteHeader />

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">
          Your local floor
        </div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          Every dance <em class="italic" style="color:#dc2626;">every week.</em>
          <span style="font-family:'Caveat', cursive; color:#16a34a; font-size:0.9em;"> Wherever you live.</span>
        </h1>
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          Weekly socials, teachers, venues. See who's dancing before you head out.
        </p>

        <!-- Search + chips -->
        <div class="mt-8 max-w-lg mx-auto">
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style="color:#9a5614;" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by city, country, or style"
              class="w-full h-12 rounded-full pl-11 pr-4 text-sm outline-none transition-all"
              style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 16px rgba(59, 31, 18, 0.04);"
            >
          </div>
          <StyleFilter :styles="allStyles" v-model="searchQuery" :accents="styleChipColors" class="mt-4" />
        </div>
      </div>

      <!-- Wave divider -->
      <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- City grid -->
    <section class="max-w-4xl mx-auto px-4 pb-12">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ searchQuery ? 'Results' : 'Cities' }}
        </h2>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ filteredCities.length }} cit{{ filteredCities.length === 1 ? 'y' : 'ies' }}
        </span>
      </div>

      <div
        v-if="!filteredCities.length"
        class="text-center py-14 rounded-2xl border-2 border-dashed"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <Search class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Nothing matches "{{ searchQuery }}"
        </p>
        <button
          type="button"
          class="text-xs font-bold mt-2 underline"
          style="color:#dc2626; font-family: system-ui, sans-serif;"
          @click="searchQuery = ''"
        >
          Clear search
        </button>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="c in filteredCities"
          :key="c.slug"
          :to="`/cities/${c.slug}`"
          class="group block rounded-2xl overflow-hidden bg-white border transition-all hover:-translate-y-1"
          :style="{ borderColor: c.accent + '55', boxShadow: '0 1px 0 ' + c.accent + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <!-- Color accent bar -->
          <div class="h-1.5" :style="{ background: c.accent }" />

          <!-- Video of the Month — people's-choice winner for this city.
               Real empty state when there's no winner yet (no fake winner). -->
          <div class="p-4 pb-0">
            <VideoOfMonthCard :city-slug="c.slug" :accent="c.accent" />
          </div>

          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-bold text-xl leading-tight" style="color:#3b1f0d;">
                  {{ c.name }}
                </h3>
                <div class="flex items-center gap-1 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <MapPin class="w-3 h-3" style="color:#9a5614;" />
                  {{ c.country }}
                </div>
              </div>
              <ArrowRight class="w-4 h-4 mt-1.5 shrink-0 transition-transform group-hover:translate-x-1" :style="{ color: c.accent }" />
            </div>

            <!-- Styles as chip pills in accent color -->
            <div class="flex flex-wrap gap-1.5 mt-4">
              <span
                v-for="style in c.styles"
                :key="style"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                :style="{ background: c.accent + '18', color: c.accent }"
              >
                {{ style }}
              </span>
            </div>

            <!-- Signal: weekly event count (real signal, can be tied to real data) -->
            <div class="mt-4 flex items-center gap-4 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3" style="color:#9a5614;" />
                {{ c.eventCount }} weekly events
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Organizer CTA — matches /festivals -->
    <section class="max-w-4xl mx-auto px-4 py-10">
      <div
        class="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style="background:white; border:1px solid #0891b255; box-shadow: 0 1px 0 #0891b222, 0 8px 22px rgba(59,31,18,0.05);"
      >
        <div>
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style="color:#0891b2;">For organizers</div>
          <h3 class="text-lg font-bold" style="color:#3b1f0d;">Run a class or a weekly social?</h3>
          <p class="text-sm mt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            List your weekly event for free. Local dancers find you.
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

    <SiteFooter />
  </div>
</template>
