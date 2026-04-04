<script setup lang="ts">
import type { Festival } from '~/types/festival'
import { Instagram, Globe, Facebook } from 'lucide-vue-next'

const props = defineProps<{
  festival: Festival
}>()

const dateRange = computed(() => {
  const start = new Date(props.festival.startDate)
  const end = new Date(props.festival.endDate)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

const platformIcon: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  website: Globe,
}
</script>

<template>
  <div class="border-b">
    <div class="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
      <img
        v-if="festival.logo"
        :src="festival.logo"
        :alt="festival.name"
        class="w-16 h-16 rounded-full shrink-0"
      />
      <div>
        <h1 class="text-xl md:text-2xl font-bold">{{ festival.name }}</h1>
        <p class="text-sm text-muted-foreground mt-0.5">{{ dateRange }} · {{ festival.venue.name }}</p>
        <div class="flex items-center gap-3 mt-0.5">
          <p class="text-xs text-muted-foreground">{{ festival.attendeeCount }} dancers planning</p>
          <div v-if="festival.socialLinks.length" class="flex gap-2">
            <a
              v-for="link in festival.socialLinks"
              :key="link.platform"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground transition-colors"
              :title="link.platform"
            >
              <component
                :is="platformIcon[link.platform]"
                v-if="platformIcon[link.platform]"
                class="w-4 h-4"
              />
              <span v-else class="text-xs capitalize">{{ link.platform }}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
