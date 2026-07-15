<script setup lang="ts">
/**
 * /cities/[city] — the real community directory for a city, backed by migrated
 * profiles (entity.cityDirectory). Shows the venues, artists and organizers that
 * actually exist there, plus the DB-backed community features (video vote, ask
 * locals, community groups). No mock data.
 *
 * Note: there is deliberately no "this week" calendar here — the migrated event
 * data is historical (the source stopped syncing in 2026-04), so an upcoming
 * feed would be empty. An events section lights up once organizers add events.
 */
import { MapPin, ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const citySlug = computed(() => String(route.params.city))

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

type Entity = { username: string; name: string; photo: string | null; styles: string[] }
type Dir = { city: string | null; citySlug: string; venues: Entity[]; artists: Entity[]; organizers: Entity[] }

const { $trpc } = useNuxtApp()
const dir = ref<Dir | null>(null)
const loading = ref(true)

onMounted(async () => {
  try { dir.value = (await $trpc.entity.cityDirectory.query({ citySlug: citySlug.value })) as Dir }
  catch { dir.value = null }
  finally { loading.value = false }
})

const cityName = computed(() => dir.value?.city
  || citySlug.value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
const total = computed(() => dir.value ? dir.value.venues.length + dir.value.artists.length + dir.value.organizers.length : 0)

useHead(() => ({ title: `${cityName.value} — WeDance` }))

const accents = ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed']
const NuxtLinkC = resolveComponent('NuxtLink')

const sections = computed(() => dir.value ? [
  { key: 'venues', label: 'Venues', items: dir.value.venues },
  { key: 'artists', label: 'Artists', items: dir.value.artists },
  { key: 'organizers', label: 'Organizers', items: dir.value.organizers },
].filter(s => s.items.length) : [])
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-10 pb-6">
        <NuxtLink to="/cities" class="text-xs inline-flex items-center gap-1 hover:underline" style="color:#9a5614; font-family: system-ui, sans-serif;">
          <ArrowLeft class="w-3 h-3" /> All cities
        </NuxtLink>
        <div class="mt-3 text-sm tracking-widest uppercase" style="color:#9a5614;">The scene in</div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          {{ cityName }}
        </h1>
        <p v-if="!loading" class="mt-3 text-sm inline-flex items-center gap-1.5" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          <MapPin class="w-4 h-4" style="color:#9a5614;" />
          {{ total }} in the community · {{ dir?.venues.length || 0 }} venues · {{ dir?.artists.length || 0 }} artists · {{ dir?.organizers.length || 0 }} organizers
        </p>
      </div>
      <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <div class="max-w-4xl mx-auto px-4 pb-16 space-y-12">
      <!-- Community video vote (DB-backed, any city) -->
      <ClientOnly>
        <CityVideoVote :city-slug="citySlug" accent="#dc2626" />
      </ClientOnly>

      <div v-if="loading" class="text-center py-14" style="color:#9a5614; font-family: system-ui, sans-serif;">
        Loading the {{ cityName }} scene…
      </div>

      <!-- Empty city -->
      <div
        v-else-if="!total"
        class="text-center py-14 rounded-2xl border-2 border-dashed"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <p class="text-base" style="color:#3b1f0d; font-family:'Playfair Display', serif;">No one's on WeDance in {{ cityName }} yet.</p>
        <p class="text-sm mt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Be the first — claim a venue or list yourself.</p>
        <NuxtLink to="/for-events" class="inline-block mt-3 text-xs font-bold underline" style="color:#dc2626; font-family: system-ui, sans-serif;">List your space →</NuxtLink>
      </div>

      <!-- Directory sections -->
      <section v-for="sec in sections" :key="sec.key">
        <div class="flex items-baseline justify-between mb-4">
          <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ sec.label }}</h2>
          <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">— {{ sec.items.length }}</span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <component
            :is="NuxtLinkC"
            v-for="(e, i) in sec.items"
            :key="e.username"
            :to="`/@${e.username}`"
            class="group rounded-2xl bg-white border p-4 transition-all hover:-translate-y-0.5 flex items-center gap-3"
            :style="{ borderColor: accents[i % accents.length] + '55', boxShadow: '0 1px 0 ' + accents[i % accents.length] + '18, 0 6px 18px rgba(59,31,18,0.04)' }"
          >
            <img v-if="e.photo" :src="e.photo" :alt="e.name" class="w-14 h-14 rounded-full object-cover border-2 shrink-0" :style="{ borderColor: accents[i % accents.length] + '55' }">
            <div v-else class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0" :style="{ background: accents[i % accents.length] }">{{ e.name.charAt(0) }}</div>
            <div class="min-w-0">
              <h3 class="text-base font-bold leading-tight truncate group-hover:underline" style="color:#3b1f0d;">{{ e.name }}</h3>
              <div v-if="e.styles?.length" class="flex flex-wrap gap-1 mt-1">
                <span v-for="st in e.styles.slice(0,2)" :key="st" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" :style="{ background: accents[i % accents.length] + '18', color: accents[i % accents.length] }">{{ st }}</span>
              </div>
            </div>
          </component>
        </div>
      </section>

      <ClientOnly>
        <AskLocalsSection :city-slug="citySlug" :city-name="cityName" />
        <CommunityGroupsSection :city-slug="citySlug" :city-name="cityName" />
      </ClientOnly>
    </div>

    <SiteFooter />
  </div>
</template>
