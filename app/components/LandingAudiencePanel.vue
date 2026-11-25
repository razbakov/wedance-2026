<script setup lang="ts">
/**
 * RAZ-1095. One audience tab (Artists, Organizers, Venues): example card,
 * headline, three points, the hero callout, and a learn-more link.
 */
import type { Component } from 'vue'
import { CalendarPlus, CalendarRange, Globe, Image as ImageIcon, Inbox, MapPin, Megaphone, Sparkles, Users } from 'lucide-vue-next'
import type { LandingIcon, LandingPanelCopy } from '~/lib/landingAudience'

defineProps<{
  panel: LandingPanelCopy
  surface: string
}>()

const ICONS: Record<LandingIcon, Component> = {
  globe: Globe,
  image: ImageIcon,
  calendar: CalendarRange,
  calendarPlus: CalendarPlus,
  megaphone: Megaphone,
  users: Users,
  pin: MapPin,
  inbox: Inbox,
  sparkles: Sparkles,
}

// Full class strings so Tailwind generates every tone (no runtime class names).
const TONE = {
  purple: { bg: 'bg-wd-purple-500', text: 'text-wd-purple-500' },
  orange: { bg: 'bg-wd-orange-500', text: 'text-wd-orange-500' },
  cyan: { bg: 'bg-wd-cyan-600', text: 'text-wd-cyan-400' },
} as const
</script>

<template>
  <div>
    <div class="grid items-center gap-8 md:grid-cols-[1fr_1.08fr]">
      <div class="order-2 flex justify-center md:order-1" aria-label="Example">
        <div class="w-64 -rotate-2 rounded-2xl p-4 font-sans shadow-wd-float" :class="TONE[panel.tone].bg">
          <div class="font-display text-2xl font-black uppercase leading-none text-wd-brown-900">{{ panel.sample.title }}</div>
          <div class="mt-4 space-y-1.5">
            <div v-for="row in panel.sample.rows" :key="row.what" class="rounded-md bg-wd-brown-900 px-2.5 py-2 text-white">
              <div class="text-eyebrow font-black uppercase tracking-wider" :class="TONE[panel.tone].text">{{ row.when }}</div>
              <div class="truncate text-sm font-bold leading-tight">{{ row.what }}</div>
            </div>
          </div>
          <div class="mt-3 text-eyebrow font-bold uppercase tracking-widest text-wd-brown-900/70">wedance.vip</div>
        </div>
      </div>

      <div class="order-1 text-center md:order-2 md:text-left">
        <div class="text-eyebrow font-bold uppercase tracking-[0.3em] text-primary">{{ panel.eyebrow }}</div>
        <h1 class="mt-2 font-display text-3xl leading-tight text-foreground lg:text-4xl">
          <span class="block">{{ panel.headline }}</span>
          <em class="block italic text-primary">{{ panel.accent }}</em>
        </h1>
        <p class="mx-auto mt-3 max-w-md text-balance font-sans text-sm text-muted-foreground sm:text-base md:mx-0">{{ panel.line }}</p>
        <div class="mt-6 flex justify-center md:justify-start">
          <LandingCallout variant="hero" :tab="panel.tab" :surface="surface" />
        </div>
      </div>
    </div>

    <div class="mt-10 grid gap-4 sm:grid-cols-3">
      <Card v-for="point in panel.points" :key="point.title" class="shadow-wd-card">
        <CardContent class="p-5 font-sans">
          <component :is="ICONS[point.icon]" class="size-5 text-primary" aria-hidden="true" />
          <h2 class="mt-3 font-display text-lg leading-tight">{{ point.title }}</h2>
          <p class="mt-1 text-balance text-sm text-muted-foreground">{{ point.detail }}</p>
        </CardContent>
      </Card>
    </div>

    <div class="mt-5 text-center font-sans md:text-left">
      <Button as-child variant="link" class="px-0">
        <NuxtLink :to="panel.learnMore.to">{{ panel.learnMore.label }}</NuxtLink>
      </Button>
    </div>
  </div>
</template>
