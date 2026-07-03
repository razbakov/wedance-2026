<script setup lang="ts">
/**
 * /artists — the artist directory.
 * V3 tropical style. Lists every performer with a profile (festival
 * teachers/headliners + city teachers & DJs) from ~/data/artists.ts.
 */
import { Search, Plane, MapPin } from 'lucide-vue-next'
import { allArtists } from '~/data/artists'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Artists',
  meta: [
    { name: 'description', content: 'The teachers, DJs, and performers of the Cuban dance scene — every festival, every city.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const artists = allArtists()

const searchQuery = ref('')

const allStyles = computed(() => {
  const s = new Set<string>()
  artists.forEach((a) => a.artist.styles.forEach((st) => s.add(st)))
  return Array.from(s)
})

// Cities where artists teach/DJ weekly — the "artists in my city" filter.
const allCities = computed(() => {
  const s = new Set<string>()
  artists.forEach((a) => a.cityNames.forEach((c) => s.add(c)))
  return Array.from(s).sort()
})

// Preset from ?city= so a city page can deep-link "artists in Munich".
// Case-insensitive match against a known city name.
const route = useRoute()
const cityParam = (Array.isArray(route.query.city) ? route.query.city[0] : route.query.city) || ''
const selectedCity = ref(
  allCities.value.find((c) => c.toLowerCase() === String(cityParam).toLowerCase()) || '',
)

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return artists.filter((a) => {
    const matchesText = !q
      || a.artist.name.toLowerCase().includes(q)
      || a.artist.styles.some((s) => s.toLowerCase().includes(q))
    const matchesCity = !selectedCity.value || a.cityNames.includes(selectedCity.value)
    return matchesText && matchesCity
  })
})

const accents = ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed']
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header -->
    <header class="border-b" style="border-color:#3b1f0d33;">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Brand />
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/festivals" class="italic hover:underline">Festivals</NuxtLink>
          <NuxtLink to="/cities" class="italic hover:underline">Cities</NuxtLink>
          <NuxtLink to="/artists" class="italic hover:underline hidden sm:inline">Artists</NuxtLink>
          <NuxtLink to="/for-events" class="italic hover:underline hidden sm:inline">Private events</NuxtLink>
          <NuxtLink to="/organizers" class="italic hover:underline hidden sm:inline">For organizers</NuxtLink>
        </nav>
      </div>
    </header>

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">The artists</div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          Who moves <em class="italic" style="color:#dc2626;">the floor.</em>
        </h1>
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          Teachers, DJs, and performers — follow them across festivals and cities.
        </p>

        <div class="mt-8 max-w-lg mx-auto">
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style="color:#9a5614;" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or style"
              class="w-full h-12 rounded-full pl-11 pr-4 text-sm outline-none transition-all"
              style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 16px rgba(59, 31, 18, 0.04);"
            >
          </div>

          <!-- Location filter — "artists in my city" -->
          <div v-if="allCities.length" class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span class="text-[10px] uppercase tracking-[0.25em] font-bold" style="color:#9a5614;">In your city</span>
            <button
              v-for="city in allCities"
              :key="city"
              type="button"
              class="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
              :style="selectedCity === city
                ? { background: '#3b1f0d', color: '#fbf5ea', boxShadow: '0 2px 0 -1px #3b1f0d' }
                : { background: 'white', color: '#5b3a1d', border: '1px solid #3b1f0d33' }"
              @click="selectedCity = selectedCity === city ? '' : city"
            >
              <MapPin class="w-3 h-3" /> {{ city }}
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              v-for="(style, i) in allStyles"
              :key="style"
              type="button"
              class="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              :style="searchQuery === style
                ? { background: accents[i % accents.length], color: 'white', boxShadow: '0 2px 0 -1px ' + accents[i % accents.length] }
                : { background: 'white', color: accents[i % accents.length], border: '1px solid ' + accents[i % accents.length] + '55' }"
              @click="searchQuery = searchQuery === style ? '' : style"
            >
              {{ style }}
            </button>
          </div>
        </div>
      </div>

      <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- GRID -->
    <section class="max-w-5xl mx-auto px-4 pb-16">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          <template v-if="selectedCity">In {{ selectedCity }}</template>
          <template v-else-if="searchQuery">Results</template>
          <template v-else>Everyone</template>
        </h2>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ filtered.length }} artist{{ filtered.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div
        v-if="!filtered.length"
        class="text-center py-14 rounded-2xl border-2 border-dashed"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <Search class="w-8 h-8 mx-auto mb-3" style="color:#9a5614;" />
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          <template v-if="selectedCity && searchQuery">No artists in {{ selectedCity }} match "{{ searchQuery }}"</template>
          <template v-else-if="selectedCity">No artists listed in {{ selectedCity }} yet</template>
          <template v-else>Nothing matches "{{ searchQuery }}"</template>
        </p>
        <button type="button" class="text-xs font-bold mt-2 underline" style="color:#dc2626; font-family: system-ui, sans-serif;" @click="searchQuery = ''; selectedCity = ''">
          Clear filters
        </button>
      </div>

      <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(a, i) in filtered"
          :key="a.artist.id"
          :to="`/artists/${a.artist.id}`"
          class="group rounded-2xl bg-white border overflow-hidden flex flex-col transition-all hover:-translate-y-1"
          :style="{ borderColor: accents[i % accents.length] + '55', boxShadow: '0 1px 0 ' + accents[i % accents.length] + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <!-- Face first — the photo dominates the card -->
          <div class="relative aspect-square overflow-hidden" :style="{ background: accents[i % accents.length] + '12' }">
            <img
              :src="a.artist.photo"
              :alt="a.artist.name"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            >
            <!-- Appearance chip over the photo -->
            <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <span
                v-if="a.festivalCount"
                class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style="background:rgba(59,31,18,0.55); backdrop-filter: blur(4px);"
              >
                <Plane class="w-3 h-3" /> {{ a.festivalCount }}
              </span>
              <span
                v-for="city in a.cityNames"
                :key="city"
                class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style="background:rgba(59,31,18,0.55); backdrop-filter: blur(4px);"
              >
                <MapPin class="w-3 h-3" /> {{ city }}
              </span>
            </div>
          </div>

          <div class="p-4 flex flex-col flex-1">
            <div class="font-bold text-lg leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              {{ a.artist.name }}
            </div>
            <div v-if="a.artist.styles.length" class="mt-1.5 flex flex-wrap gap-1">
              <span
                v-for="s in a.artist.styles.slice(0, 3)"
                :key="s"
                class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                :style="{ background: accents[i % accents.length] + '18', color: accents[i % accents.length] }"
              >{{ s }}</span>
            </div>
            <p
              v-if="a.artist.bio"
              class="mt-2.5 text-xs leading-relaxed line-clamp-2"
              style="color:#5b3a1d; font-family: system-ui, sans-serif;"
            >
              {{ a.artist.bio }}
            </p>
            <div class="mt-auto pt-3 text-xs italic" style="color:#9a5614; font-family:'Playfair Display', serif;">
              View profile →
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <footer class="border-t py-6 text-center text-xs" style="border-color:#3b1f0d22; color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
      WeDance · <NuxtLink to="/festivals" class="underline">festivals</NuxtLink> · <NuxtLink to="/cities" class="underline">cities</NuxtLink>
    </footer>
  </div>
</template>
