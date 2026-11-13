<script setup lang="ts">
/**
 * On a city page's editor (e.g. @wedancemunich): the way to its city tools — weekly post,
 * channels, local groups (city channels, migration 0066). Renders nothing on other pages.
 *
 *   <BusinessCityLink :username="loaded.username" />
 */
import { MapPin, ArrowRight } from 'lucide-vue-next'

const props = defineProps({ username: { type: String, required: true } })
const { $trpc } = useNuxtApp()
type City = Awaited<ReturnType<typeof $trpc.cityChannels.forPage.query>>
const city = ref<City>(null)
onMounted(async () => {
  try { city.value = await $trpc.cityChannels.forPage.query({ username: props.username }) }
  catch { city.value = null }
})
</script>

<template>
  <NuxtLink
    v-if="city"
    :to="`/business/network/${username}/city`"
    class="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
    data-testid="city-tools-link"
  >
    <MapPin class="size-5 shrink-0 text-primary" aria-hidden="true" />
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-bold text-foreground">WeDance {{ city.cityName }}</span>
      <span class="block text-xs text-muted-foreground">This page runs the city: weekly post, channels and local groups.</span>
    </span>
    <ArrowRight class="size-4 shrink-0 text-secondary" aria-hidden="true" />
  </NuxtLink>
</template>
