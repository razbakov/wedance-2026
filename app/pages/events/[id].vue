<script setup lang="ts">
/**
 * /events/<id> — a single event's detail page (the events analogue of the
 * festival view). Learn more, see the venue + lineup, add to your plan, and get
 * tickets when a link is set. Client-side fetch (tRPC is client-only).
 */
import { MapPin, Calendar, Clock, Ticket, Check, Plus, ArrowLeft, ArrowUpRight } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { weekPlanIds, toggleEvent } = useWeekPlan()

const id = computed(() => String(route.params.id))
const ev = ref<any>(null)
const pending = ref(true)
const failed = ref(false)

async function load() {
  pending.value = true; failed.value = false
  try { ev.value = await $trpc.booking.getEvent.query({ id: id.value }) }
  catch { failed.value = true } finally { pending.value = false }
}
onMounted(load)

const styleColor: Record<string, string> = {
  salsa: '#dc2626', bachata: '#a855f7', kizomba: '#ec4899', timba: '#f59e0b',
  casino: '#16a34a', rueda: '#0891b2', afro: '#7c3aed', zouk: '#0891b2',
}
const accent = computed(() => styleColor[String(ev.value?.styles?.[0] || '').toLowerCase()] || '#dc2626')
const picked = computed(() => !!ev.value && weekPlanIds?.value?.has(ev.value.id))

function fmtDate(d: any) { if (!d) return 'Date TBD'; try { return new Date(d).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) } catch { return String(d) } }

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
      <!-- Hero -->
      <section class="max-w-2xl mx-auto px-4 pt-12 pb-6" style="font-family: system-ui, sans-serif;">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span v-if="ev.eventType" class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded" :style="{ background: accent + '18', color: accent }">{{ ev.eventType }}</span>
          <span v-for="st in (ev.styles || [])" :key="st" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" :style="{ background: accent + '14', color: accent }">{{ st }}</span>
          <span v-if="ev.status !== 'accepted'" class="text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5" style="background:#f59e0b18; color:#b45309;">Proposed</span>
        </div>
        <h1 class="mt-3 text-4xl sm:text-5xl leading-[0.98]" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ ev.title || 'Social' }}</h1>

        <div class="mt-4 space-y-1.5 text-sm" style="color:#5b3a1d;">
          <div class="flex items-center gap-2"><Calendar class="w-4 h-4" style="color:#9a5614;" /> {{ fmtDate(ev.eventDate) }}</div>
          <div v-if="ev.startTime" class="flex items-center gap-2"><Clock class="w-4 h-4" style="color:#9a5614;" /> {{ ev.startTime }}<span v-if="ev.endTime"> – {{ ev.endTime }}</span></div>
          <NuxtLink :to="`/@${ev.venueHandle}`" class="flex items-center gap-2 hover:underline" style="color:#5b3a1d;">
            <MapPin class="w-4 h-4" style="color:#9a5614;" />
            <span><b style="color:#3b1f0d;">{{ ev.spaceName }}</b> · {{ ev.venueName }}<span v-if="ev.venueCity">, {{ ev.venueCity }}</span></span>
            <ArrowUpRight class="w-3.5 h-3.5" style="color:#dc2626;" />
          </NuxtLink>
        </div>

        <!-- CTAs -->
        <div class="mt-6 flex flex-wrap gap-2">
          <a v-if="ev.ticketUrl" :href="ev.ticketUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-white text-sm font-bold uppercase tracking-wider" :style="{ background: 'linear-gradient(135deg, ' + accent + ', #f97316)' }">
            <Ticket class="w-4 h-4" /> Get tickets
          </a>
          <button type="button" class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-all"
            :style="picked ? { background: accent, color: 'white' } : { background: 'white', color: accent, border: '1.5px solid ' + accent + '55' }"
            @click="toggleEvent(ev.id)">
            <component :is="picked ? Check : Plus" class="w-4 h-4" /> {{ picked ? 'In my plan' : 'Add to my plan' }}
          </button>
        </div>
      </section>

      <!-- Details -->
      <section v-if="ev.message || ev.artists?.length" class="max-w-2xl mx-auto px-4 pb-16" style="font-family: system-ui, sans-serif;">
        <div v-if="ev.artists?.length" class="mb-6">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style="color:#9a5614;">Lineup</div>
          <div class="flex flex-wrap gap-2">
            <template v-for="(a, i) in ev.artists" :key="i">
              <NuxtLink v-if="String(a).startsWith('@')" :to="`/${a}`" class="rounded-full px-3 py-1 text-sm font-bold" :style="{ background: accent + '14', color: accent }">{{ a }}</NuxtLink>
              <span v-else class="rounded-full px-3 py-1 text-sm font-bold" :style="{ background: accent + '14', color: accent }">{{ a }}</span>
            </template>
          </div>
        </div>
        <div v-if="ev.message">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style="color:#9a5614;">About</div>
          <p class="text-sm leading-relaxed whitespace-pre-line" style="color:#5b3a1d;">{{ ev.message }}</p>
        </div>
        <div v-if="ev.requesterName" class="mt-6 text-xs" style="color:#9a5614;">Hosted by {{ ev.requesterName }}</div>
      </section>
    </template>

    <SiteFooter />
  </div>
</template>
