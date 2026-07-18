<script setup lang="ts">
/**
 * /cities — the directory, backed by real migrated data (entity.listCities).
 * Each city card shows its real community size (venues · artists · organizers)
 * and links to /cities/[slug]. No mock data.
 */
import { Search, MapPin, ArrowRight, Users } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Cities',
  meta: [
    { name: 'description', content: 'Every dance scene — the venues, artists and organizers in your city.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const router = useRouter()

type CityRow = { city: string; citySlug: string; venues: number; artists: number; organizers: number; total: number; image: string | null; credit: string | null; license: string | null; country: string | null; altNames: string[] }

// SSR-rendered so the list ships in the HTML — no on-mount spinner (see
// server/api/cities.get.ts). The tRPC client is client-only, hence useFetch.
const { data, pending } = await useFetch<CityRow[]>('/api/cities', {
  key: 'cities-directory',
  default: () => [],
})
const cities = computed(() => data.value ?? [])
const loading = computed(() => pending.value)

const searchQuery = ref('')
const filteredCities = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return cities.value
  return cities.value.filter(c =>
    c.city.toLowerCase().includes(q)
    || (c.country?.toLowerCase().includes(q) ?? false)
    || (c.altNames?.some(n => n.toLowerCase().includes(q)) ?? false),
  )
})

// Show only the first 9 cities by default for faster load; searching spans all cities.
const displayedCities = computed(() =>
  searchQuery.value.trim() ? filteredCities.value : filteredCities.value.slice(0, 9),
)

const accents = ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed']
const accentFor = (slug: string) => accents[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % accents.length]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">Your local floor</div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          Every scene <em class="italic" style="color:#dc2626;">every city.</em>
        </h1>
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          The venues, artists and organizers of the Cuban dance world — find your city's community.
        </p>

        <div class="mt-8 max-w-lg mx-auto">
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style="color:#9a5614;" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by city or country"
              class="w-full h-12 rounded-full pl-11 pr-4 text-sm outline-none transition-all"
              style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 16px rgba(59, 31, 18, 0.04);"
            >
          </div>
        </div>
      </div>

      <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- City grid -->
    <section class="max-w-4xl mx-auto px-4 pb-12">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ searchQuery ? 'Results' : 'Top cities' }}
        </h2>
        <span v-if="!loading" class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          <template v-if="searchQuery">— {{ displayedCities.length }} cit{{ displayedCities.length === 1 ? 'y' : 'ies' }}</template>
          <template v-else>— top {{ displayedCities.length }} of {{ cities.length }}</template>
        </span>
      </div>

      <div v-if="loading" class="text-center py-14" style="color:#9a5614; font-family: system-ui, sans-serif;">
        Loading cities…
      </div>

      <div
        v-else-if="!filteredCities.length"
        class="text-center py-14 rounded-2xl border-2 border-dashed"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <Search class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Nothing matches "{{ searchQuery }}"</p>
        <button type="button" class="text-xs font-bold mt-2 underline" style="color:#dc2626; font-family: system-ui, sans-serif;" @click="searchQuery = ''">Clear search</button>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="c in displayedCities"
          :key="c.citySlug"
          :to="`/cities/${c.citySlug}`"
          class="group block rounded-2xl overflow-hidden bg-white border transition-all hover:-translate-y-1"
          :style="{ borderColor: accentFor(c.citySlug) + '55', boxShadow: '0 1px 0 ' + accentFor(c.citySlug) + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <!-- Landmark photo (Wikimedia) with the city name overlaid; accent bar when no photo -->
          <div v-if="c.image" class="relative h-32 overflow-hidden">
            <img
              :src="c.image"
              :alt="`${c.city} — landmark`"
              class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            >
            <div class="absolute inset-0" style="background:linear-gradient(180deg, rgba(59,31,18,0) 35%, rgba(59,31,18,0.7) 100%);" />
            <div class="absolute bottom-2 left-3 right-3">
              <h3 class="font-bold text-xl leading-tight" style="color:#fff; font-family:'Playfair Display', serif; text-shadow:0 1px 12px rgba(0,0,0,0.4);">{{ c.city }}</h3>
              <div v-if="c.country" class="text-[11px] font-medium" style="color:rgba(255,255,255,0.85); font-family: system-ui, sans-serif; text-shadow:0 1px 8px rgba(0,0,0,0.5);">{{ c.country }}</div>
            </div>
            <span
              v-if="c.credit"
              class="absolute top-1 right-1.5 text-[9px] px-1 py-px rounded"
              style="color:rgba(255,255,255,0.7); background:rgba(0,0,0,0.25); font-family: system-ui, sans-serif;"
              :title="`${c.credit}${c.license ? ' · ' + c.license : ''} · Wikimedia Commons`"
            >📷</span>
          </div>
          <div v-else class="h-1.5" :style="{ background: accentFor(c.citySlug) }" />
          <div class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div v-if="!c.image">
                <h3 class="font-bold text-xl leading-tight" style="color:#3b1f0d;">{{ c.city }}</h3>
                <div v-if="c.country" class="text-[11px] font-medium mt-0.5" style="color:#9a5614; font-family: system-ui, sans-serif;">{{ c.country }}</div>
              </div>
              <span v-else class="text-xs font-bold uppercase tracking-wider" :style="{ color: accentFor(c.citySlug) }">Explore</span>
              <ArrowRight class="w-4 h-4 mt-0.5 shrink-0 transition-transform group-hover:translate-x-1" :style="{ color: accentFor(c.citySlug) }" />
            </div>
            <div class="mt-3 flex items-center gap-1.5 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <Users class="w-3 h-3" style="color:#9a5614;" />
              <span>{{ c.total }} in the community</span>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-3">
              <span v-if="c.venues" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" :style="{ background: accentFor(c.citySlug) + '18', color: accentFor(c.citySlug) }">{{ c.venues }} venue{{ c.venues === 1 ? '' : 's' }}</span>
              <span v-if="c.artists" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" :style="{ background: accentFor(c.citySlug) + '18', color: accentFor(c.citySlug) }">{{ c.artists }} artist{{ c.artists === 1 ? '' : 's' }}</span>
              <span v-if="c.organizers" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" :style="{ background: accentFor(c.citySlug) + '18', color: accentFor(c.citySlug) }">{{ c.organizers }} organizer{{ c.organizers === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Organizer CTA -->
    <section class="max-w-4xl mx-auto px-4 py-10">
      <div class="rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style="background:white; border:1px solid #0891b255; box-shadow: 0 1px 0 #0891b222, 0 8px 22px rgba(59,31,18,0.05);">
        <div>
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style="color:#0891b2;">For organizers</div>
          <h3 class="text-lg font-bold" style="color:#3b1f0d;">Run a class or a weekly social?</h3>
          <p class="text-sm mt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">List your event for free. Local dancers find you.</p>
        </div>
        <button type="button" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold uppercase tracking-wider shrink-0" style="background:#0891b2; box-shadow: 0 3px 0 -1px #0e7490;" @click="router.push('/organizers')">
          Learn more <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
