<script setup lang="ts">
/**
 * City-vs-city video battle. Renders the current month's winning video from two
 * cities side by side (data from /api/city-fight). Guarded: shows nothing until
 * at least two cities have a winner, so it stays hidden while the per-city
 * competition is still empty. Each side links into that city's competition —
 * a discovery hook, not a separate voting system (cross-city vote tallies are a
 * deliberate follow-up once the base competition has content).
 */
import { Swords, ArrowRight } from 'lucide-vue-next'
import type { CityFight } from '~/server/api/city-fight.get'

const { data } = await useFetch<CityFight>('/api/city-fight', { key: 'city-fight' })
const fight = computed(() => data.value?.fight ?? null)

const thumb = (f: NonNullable<CityFight['fight']>['a']) =>
  f.thumbnailUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.city)}&size=320&background=dc2626&color=fff&bold=true`
</script>

<template>
  <section v-if="fight" class="max-w-4xl mx-auto px-4 py-10">
    <div class="text-center mb-6">
      <div class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">
        <Swords class="w-4 h-4" /> Video battle
      </div>
      <h2 class="text-2xl sm:text-3xl mt-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
        {{ fight.a.city }} <em class="italic" style="color:#dc2626;">vs</em> {{ fight.b.city }}
      </h2>
      <p class="text-xs mt-1" style="color:#9a5614; font-family:'Caveat', cursive; font-size:16px;">
        — this month's winning clips, head to head
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:gap-5 items-stretch relative">
      <NuxtLink
        v-for="(f, i) in [fight.a, fight.b]"
        :key="f.citySlug"
        :to="`/cities/${f.citySlug}#compete`"
        class="group block rounded-2xl overflow-hidden bg-white border transition-all hover:-translate-y-1"
        :style="{ borderColor: (i === 0 ? '#dc2626' : '#0891b2') + '55', boxShadow: '0 8px 22px rgba(59,31,18,0.06)' }"
      >
        <div class="relative aspect-video overflow-hidden">
          <img :src="thumb(f)" :alt="`${f.city} — winning video`" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
          <div class="absolute inset-0" style="background:linear-gradient(180deg, rgba(59,31,18,0) 45%, rgba(59,31,18,0.72) 100%);" />
          <div class="absolute bottom-2 left-3 right-3">
            <div class="font-bold text-lg sm:text-xl leading-tight" style="color:#fff; font-family:'Playfair Display', serif; text-shadow:0 1px 12px rgba(0,0,0,0.4);">{{ f.city }}</div>
            <div v-if="f.danceStyle" class="text-[11px]" style="color:rgba(255,255,255,0.85); font-family: system-ui, sans-serif;">{{ f.danceStyle }}</div>
          </div>
        </div>
        <div class="p-3 sm:p-4 flex items-center justify-between gap-2">
          <span class="text-xs sm:text-sm font-medium truncate" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ f.title }}</span>
          <span class="inline-flex items-center gap-1 text-xs font-bold shrink-0" :style="{ color: i === 0 ? '#dc2626' : '#0891b2' }">Vote <ArrowRight class="w-3.5 h-3.5" /></span>
        </div>
      </NuxtLink>

      <!-- VS badge -->
      <div class="absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm" style="background:#3b1f0d; box-shadow:0 4px 0 -1px #1f0f06, 0 6px 18px rgba(0,0,0,0.25); font-family:'Playfair Display', serif;">VS</div>
      </div>
    </div>
  </section>
</template>
