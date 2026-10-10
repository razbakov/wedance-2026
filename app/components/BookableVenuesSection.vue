<script setup lang="ts">
/**
 * Bookable venues — links to each venue's /@<handle> page where an organizer can
 * request a space. With a citySlug, lists that city's venues; without one, lists
 * all venues (used on the Private-events page). Client-side fetch. Hidden if none.
 */
import { LayoutGrid, ArrowUpRight, MapPin } from 'lucide-vue-next'

const props = defineProps<{ citySlug?: string; cityName?: string; hideHeading?: boolean }>()
const { $trpc } = useNuxtApp()

const venues = ref<any[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    venues.value = props.citySlug
      ? await $trpc.entity.listByCity.query({ citySlug: props.citySlug, type: 'venue' })
      : await $trpc.entity.listVenues.query()
  } catch { venues.value = [] } finally { loading.value = false }
}
onMounted(load)

function initials(name: string) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}
</script>

<template>
  <section v-if="loading || venues.length" :class="hideHeading ? '' : 'mt-10'" style="font-family:var(--wd-font-sans);">
    <template v-if="!hideHeading">
      <div class="flex items-center gap-2">
        <LayoutGrid class="w-5 h-5" style="color:var(--wd-red-600);" />
        <h3 class="text-2xl" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">Book a space</h3>
      </div>
      <p class="mt-1 text-sm" style="color:var(--wd-brown-700);">Organizing a social, class, or private event{{ cityName ? ` in ${cityName}` : '' }}? Request a spot directly from a venue.</p>
    </template>

    <div v-if="loading" class="mt-4 text-sm" style="color:var(--wd-amber-600);">Loading…</div>
    <div v-else class="mt-4 grid gap-3 sm:grid-cols-2">
      <NuxtLink v-for="v in venues" :key="v.username" :to="`/@${v.username}`"
        class="group flex items-center gap-3 rounded-xl border p-3 bg-white transition-all hover:-translate-y-0.5" style="border-color:color-mix(in srgb, var(--wd-red-600) 20%, transparent);">
        <img v-if="v.photo" :src="v.photo" :alt="v.name" class="w-12 h-12 rounded-lg object-cover shrink-0">
        <div v-else class="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold text-white" style="background:linear-gradient(135deg,var(--wd-red-600),var(--wd-orange-500));">{{ initials(v.name) }}</div>
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm truncate" style="color:var(--wd-brown-900);">{{ v.name }}</div>
          <div class="text-[11px] flex items-center gap-2" style="color:var(--wd-amber-600);">
            <span v-if="!citySlug && v.city" class="inline-flex items-center gap-0.5"><MapPin class="w-3 h-3" /> {{ v.city }}</span>
            <span v-if="v.floorType">{{ v.floorType }} floor</span>
          </div>
        </div>
        <ArrowUpRight class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style="color:var(--wd-red-600);" />
      </NuxtLink>
    </div>
  </section>
</template>
