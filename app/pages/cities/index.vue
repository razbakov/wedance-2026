<script setup lang="ts">
import {
  Search,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
} from 'lucide-vue-next'
import * as munich from '~/data/mock-city-munich'
import * as berlin from '~/data/mock-city-berlin'

useHead({
  title: 'Cities — WeDance',
  meta: [
    { name: 'description', content: 'Find dance classes, socials, and practicas in your city.' },
  ],
})

const searchQuery = ref('')

const allCities = [munich.city, berlin.city]

const filteredCities = computed(() => {
  if (!searchQuery.value.trim()) return allCities
  const q = searchQuery.value.toLowerCase()
  return allCities.filter(c =>
    c.name.toLowerCase().includes(q)
    || c.country.toLowerCase().includes(q)
    || c.styles.some(s => s.toLowerCase().includes(q)),
  )
})

const allStyles = computed(() => {
  const styles = new Set<string>()
  allCities.forEach(c => c.styles.forEach(s => styles.add(s)))
  return Array.from(styles)
})

const cityColors: Record<string, string> = {
  munich: '#e11d48',
  berlin: '#0ea5e9',
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative border-b">
      <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div class="relative max-w-3xl mx-auto px-4 pt-6 pb-6 text-center">
        <p class="text-muted-foreground text-sm mb-4">Dance in your city, every week</p>

        <!-- Search bar -->
        <div class="relative max-w-md mx-auto">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by city, country, or dance style..."
            class="flex h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <!-- Quick style filters -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            v-for="style in allStyles"
            :key="style"
            class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            :class="searchQuery === style ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-input hover:border-foreground/30'"
            @click="searchQuery = searchQuery === style ? '' : style"
          >
            {{ style }}
          </button>
        </div>
      </div>
    </section>

    <!-- City grid -->
    <section class="max-w-3xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{ searchQuery ? 'Results' : 'Cities' }}
        </h2>
        <span class="text-xs text-muted-foreground">{{ filteredCities.length }} cities</span>
      </div>

      <div v-if="!filteredCities.length" class="text-center py-12 border rounded-lg border-dashed">
        <Search class="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p class="text-sm text-muted-foreground">No cities match "{{ searchQuery }}"</p>
        <button class="text-xs text-primary mt-2" @click="searchQuery = ''">
          Clear search
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="c in filteredCities"
          :key="c.slug"
          :to="`/cities/${c.slug}`"
          class="group block border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-background"
        >
          <!-- Color accent bar -->
          <div class="h-1" :style="{ backgroundColor: cityColors[c.slug] || '#6366f1' }" />

          <div class="p-4">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="font-semibold text-base group-hover:text-primary transition-colors">
                  {{ c.name }}
                </h3>
                <div class="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <MapPin class="w-3 h-3" />
                  {{ c.country }}
                </div>
              </div>
              <ArrowRight class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 shrink-0" />
            </div>

            <!-- Styles -->
            <div class="flex flex-wrap gap-1 mt-3">
              <span
                v-for="style in c.styles"
                :key="style"
                class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
              >
                {{ style }}
              </span>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
              <span class="flex items-center gap-1">
                <Users class="w-3 h-3" />
                {{ c.dancerCount }} dancers
              </span>
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3" />
                {{ c.eventCount }} weekly events
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Organizer CTA -->
    <section class="max-w-3xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between rounded-lg border p-4 bg-background">
        <div>
          <h3 class="text-sm font-semibold">Run a dance class or social?</h3>
          <p class="text-xs text-muted-foreground mt-0.5">List your weekly event for free and reach local dancers.</p>
        </div>
        <Button variant="outline" size="sm" class="gap-1 shrink-0">
          Learn more <ArrowRight class="w-3.5 h-3.5" />
        </Button>
      </div>
    </section>
  </div>
</template>
