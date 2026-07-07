<script setup lang="ts">
/**
 * Bookable venues in a city — links to each venue's /@<handle> page where an
 * organizer can request a space. Client-side fetch. Hidden if none.
 */
import { LayoutGrid, ArrowUpRight } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string; cityName?: string }>()
const { $trpc } = useNuxtApp()

const venues = ref<any[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try { venues.value = await $trpc.entity.listByCity.query({ citySlug: props.citySlug, type: 'venue' }) }
  catch { venues.value = [] } finally { loading.value = false }
}
onMounted(load)

function initials(name: string) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}
</script>

<template>
  <section v-if="loading || venues.length" class="mt-10" style="font-family: system-ui, sans-serif;">
    <div class="flex items-center gap-2">
      <LayoutGrid class="w-5 h-5" style="color:#dc2626;" />
      <h3 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Book a space</h3>
    </div>
    <p class="mt-1 text-sm" style="color:#5b3a1d;">Organizing a social or class{{ cityName ? ` in ${cityName}` : '' }}? Request a spot from a local venue.</p>

    <div v-if="loading" class="mt-4 text-sm" style="color:#9a5614;">Loading…</div>
    <div v-else class="mt-4 grid gap-3 sm:grid-cols-2">
      <NuxtLink v-for="v in venues" :key="v.username" :to="`/@${v.username}`"
        class="group flex items-center gap-3 rounded-xl border p-3 bg-white transition-all hover:-translate-y-0.5" style="border-color:#dc262633;">
        <img v-if="v.photo" :src="v.photo" :alt="v.name" class="w-12 h-12 rounded-lg object-cover shrink-0">
        <div v-else class="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-sm font-bold text-white" style="background:linear-gradient(135deg,#dc2626,#f97316);">{{ initials(v.name) }}</div>
        <div class="min-w-0 flex-1">
          <div class="font-bold text-sm truncate" style="color:#3b1f0d;">{{ v.name }}</div>
          <div v-if="v.floorType" class="text-[11px]" style="color:#9a5614;">{{ v.floorType }} floor</div>
        </div>
        <ArrowUpRight class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style="color:#dc2626;" />
      </NuxtLink>
    </div>
  </section>
</template>
