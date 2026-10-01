<script setup lang="ts">
/**
 * /events/<id> — a single event, rendered through the SAME rich view as a
 * festival (an event is just a smaller festival). It reuses FestivalHero and the
 * festival section language; sections appear only when the event has that
 * content, so an event can grow into a full festival-grade page over time.
 */
import { Check, Plus, ArrowLeft, MapPin } from 'lucide-vue-next'
import { findMockEvent } from '~/lib/mockEvents'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { weekPlanIds, toggleEvent } = useWeekPlan()

// Auth gate — "Going?" requires sign-in
const { isSignedIn } = useAuth()
const showSignUp = ref(false)

function onPick() {
  if (!isSignedIn.value) {
    showSignUp.value = true
    return
  }
  toggleEvent(ev.value.id)
}

const id = computed(() => String(route.params.id))
const ev = ref<any>(null)
const pending = ref(true)
const failed = ref(false)

async function load() {
  pending.value = true; failed.value = false
  try {
    ev.value = await $trpc.booking.getEvent.query({ id: id.value })
  } catch {
    // Not a DB booking — fall back to a mock city event so it still has a page.
    const mock = findMockEvent(id.value)
    if (mock) ev.value = mock
    else failed.value = true
  } finally { pending.value = false }
}
onMounted(load)

const styleColor: Record<string, string> = {
  salsa: '#dc2626', bachata: '#a855f7', kizomba: '#ec4899', timba: '#f59e0b',
  casino: '#16a34a', rueda: '#0891b2', afro: '#7c3aed', zouk: '#0891b2',
}
const accent = computed(() => styleColor[String(ev.value?.styles?.[0] || '').toLowerCase()] || '#dc2626')
const picked = computed(() => !!ev.value && weekPlanIds?.value?.has(ev.value.id))
const parentFestival = computed(() => ev.value?.parentFestival ?? null)

// Adapt the event into the Festival shape FestivalHero expects.
const asFestival = computed(() => ({
  slug: ev.value.id,
  name: ev.value.title || 'Event',
  logo: '',
  accentColor: accent.value,
  startDate: ev.value.eventDate,
  endDate: ev.value.eventDate,
  venue: { name: [ev.value.spaceName, ev.value.venueName].filter(Boolean).join(' · ') },
  attendeeCount: ev.value.headcount || 0,
  socialLinks: [] as any[],
  ticketUrl: ev.value.ticketUrl || undefined,
  tickets: [] as any[],
})) as any

// Which sections have content (so nav + page grow with the event).
const sections = computed(() => {
  const s: { id: string; label: string }[] = []
  if (ev.value?.message) s.push({ id: 'about', label: 'About' })
  if (ev.value?.artists?.length) s.push({ id: 'lineup', label: 'Lineup' })
  s.push({ id: 'venue', label: 'Venue' })
  s.push({ id: 'reviews', label: 'Reviews' })
  return s
})
function scrollTo(anchor: string) {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' })
}

useHead(() => ({
  title: ev.value ? `${ev.value.title || 'Event'} — WeDance` : 'WeDance — Event',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
}))
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section v-if="pending" class="max-w-2xl mx-auto px-4 py-24 text-center">
      <div class="inline-block w-8 h-8 rounded-full border-2 animate-spin" style="border-color:#dc262633; border-top-color:#dc2626;" />
    </section>

    <section v-else-if="failed || !ev" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl" style="color:#3b1f0d;">Event not found</h1>
      <NuxtLink to="/cities" class="inline-flex items-center gap-1 text-xs font-bold mt-6" style="color:#dc2626; font-family: system-ui, sans-serif;"><ArrowLeft class="w-3 h-3" /> Browse cities</NuxtLink>
    </section>

    <template v-else>
      <!-- Part-of-festival banner (workshops / festival schedule items) -->
      <NuxtLink v-if="parentFestival" :to="`/festivals/${parentFestival.slug}`" class="block border-b hover:brightness-95 transition-all" style="background:#dc262610; border-color:#3b1f0d22;">
        <div class="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          <span class="text-[10px] uppercase tracking-widest font-black shrink-0" style="color:#dc2626;">Festival</span>
          <span class="truncate">Part of <b style="color:#3b1f0d;">{{ parentFestival.name }}</b></span>
          <span class="ml-auto font-bold whitespace-nowrap shrink-0" style="color:#dc2626;">View festival →</span>
        </div>
      </NuxtLink>

      <!-- Same hero as festivals -->
      <FestivalHero :festival="asFestival" review-target-type="event" :picked="picked" @pick="onPick" />

      <!-- Section anchor nav (festival-style) -->
      <nav class="sticky top-0 z-20 border-b" style="background:rgba(251, 245, 234, 0.95); backdrop-filter: blur(8px); border-color:#3b1f0d22;">
        <div class="max-w-3xl mx-auto flex items-center gap-1 px-4 overflow-x-auto">
          <button v-for="s in sections" :key="s.id" type="button" class="px-3 py-3 text-sm italic whitespace-nowrap" style="color:#5b3a1d; font-family:'Playfair Display', serif;" @click="scrollTo(s.id)">{{ s.label }}</button>
        </div>
      </nav>

      <div class="max-w-3xl mx-auto px-4 space-y-14 pt-8 pb-20" style="font-family: system-ui, sans-serif;">
        <!-- About -->
        <section v-if="ev.message" id="about" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-2" style="font-family:'Playfair Display', serif; color:#3b1f0d;">About</h2>
          <p class="text-sm leading-relaxed whitespace-pre-line" style="color:#5b3a1d;">{{ ev.message }}</p>
        </section>

        <!-- Lineup -->
        <section v-if="ev.artists?.length" id="lineup" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-3" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Lineup</h2>
          <div class="flex flex-wrap gap-2">
            <template v-for="(a, i) in ev.artists" :key="i">
              <NuxtLink v-if="String(a).startsWith('@')" :to="`/${a}`" class="rounded-full px-4 py-2 text-sm font-bold" :style="{ background: accent + '14', color: accent }">{{ a }}</NuxtLink>
              <span v-else class="rounded-full px-4 py-2 text-sm font-bold" :style="{ background: accent + '14', color: accent }">{{ a }}</span>
            </template>
          </div>
        </section>

        <!-- Venue (Pick lives in the hero now) -->
        <section id="venue" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-2" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Venue</h2>
          <NuxtLink v-if="ev.venueHandle" :to="`/@${ev.venueHandle}`" class="inline-flex items-center gap-2 text-sm font-bold hover:underline" style="color:#3b1f0d;">
            <MapPin class="w-4 h-4" style="color:#9a5614;" /> {{ ev.venueName }}<span v-if="ev.venueCity">, {{ ev.venueCity }}</span>
          </NuxtLink>
          <span v-else-if="ev.venueName" class="inline-flex items-center gap-2 text-sm font-bold" style="color:#3b1f0d;">
            <MapPin class="w-4 h-4" style="color:#9a5614;" /> {{ ev.venueName }}<span v-if="ev.venueCity">, {{ ev.venueCity }}</span>
          </span>
          <p v-if="ev.venueAddress" class="mt-1 text-xs" style="color:#9a5614;">{{ ev.venueAddress }}</p>
        </section>

        <!-- Reviews (same component as venues/festivals) -->
        <section id="reviews" class="scroll-mt-16">
          <ReviewsSection target-type="event" :target-slug="ev.id" :target-name="ev.title || 'Event'" />
        </section>
      </div>
    </template>

    <SiteFooter />

    <SignUpModal v-model:open="showSignUp" action="plan" />
  </div>
</template>
