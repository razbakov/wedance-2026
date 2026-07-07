<script setup lang="ts">
/**
 * "What's on" for a city — upcoming events across all venues, from the booking
 * calendar. Uses the shared EventSchedule (date-sectioned cards + Pick button).
 * Each card links to its venue's /@handle. Client-side fetch; hidden if none.
 */
import { CalendarDays } from 'lucide-vue-next'

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

// Map to the shared card shape: venue as location + link to the venue page.
const cards = computed(() => events.value.map(e => ({
  ...e, location: e.venueName, href: `/@${e.venueHandle}`,
})))
</script>

<template>
  <section v-if="loading || events.length" class="mt-10" style="font-family: system-ui, sans-serif;">
    <div class="flex items-center gap-2 mb-3">
      <CalendarDays class="w-5 h-5" style="color:#dc2626;" />
      <h3 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">What's on{{ cityName ? ` in ${cityName}` : '' }}</h3>
    </div>
    <div v-if="loading" class="mt-4 text-sm" style="color:#9a5614;">Loading…</div>
    <EventSchedule v-else :events="cards" />
  </section>
</template>
