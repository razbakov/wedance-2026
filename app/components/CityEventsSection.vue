<script setup lang="ts">
/**
 * "What's on" for a city — upcoming events across all venues, from the booking
 * calendar. Each links to its venue's /@handle. Client-side fetch; hidden if none.
 */
import { CalendarDays, ArrowUpRight } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string; cityName?: string }>()
const { $trpc } = useNuxtApp()

const events = ref<any[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try { events.value = await $trpc.booking.upcomingByCity.query({ citySlug: props.citySlug }) }
  catch { events.value = [] } finally { loading.value = false }
}
onMounted(load)

function fmtDate(d: any) { if (!d) return 'TBD'; try { return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return String(d) } }
</script>

<template>
  <section v-if="loading || events.length" class="mt-10" style="font-family: system-ui, sans-serif;">
    <div class="flex items-center gap-2">
      <CalendarDays class="w-5 h-5" style="color:#dc2626;" />
      <h3 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">What's on{{ cityName ? ` in ${cityName}` : '' }}</h3>
    </div>
    <div v-if="loading" class="mt-4 text-sm" style="color:#9a5614;">Loading…</div>
    <ul v-else class="mt-4 space-y-2">
      <li v-for="ev in events" :key="ev.id">
        <NuxtLink :to="`/@${ev.venueHandle}`" class="group flex items-start gap-3 rounded-xl border p-3 bg-white transition-all hover:-translate-y-0.5" style="border-color:#3b1f0d1a;">
          <div class="text-center shrink-0 w-16">
            <div class="text-[10px] uppercase font-bold leading-tight" style="color:#dc2626;">{{ fmtDate(ev.eventDate) }}</div>
            <div v-if="ev.startTime" class="text-[10px] mt-0.5" style="color:#9a5614;">{{ ev.startTime }}</div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-sm font-bold" style="color:#3b1f0d;">{{ ev.title || 'Social' }}</span>
              <span v-if="ev.eventType" class="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5" style="background:#3b1f0d0f; color:#5b3a1d;">{{ ev.eventType }}</span>
            </div>
            <div class="text-[11px] mt-0.5" style="color:#9a5614;">{{ ev.venueName }}<span v-if="ev.styles?.length"> · {{ ev.styles.join(', ') }}</span></div>
          </div>
          <ArrowUpRight class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style="color:#dc2626;" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
