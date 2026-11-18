<script setup lang="ts">
/**
 * One card of the "Meet new friends" deck (/meet): photo, name, city, where
 * they're going, dances, why they're here. The deck wraps it in the swipe
 * gestures; /dance-card (RAZ-1005) shows the dancer's own card with the same
 * component, so what they prepare is exactly what others see.
 *
 * `preview` renders the chips as plain text (preview / example cards with no page).
 * The `photo` slot replaces the picture (the dance card puts its upload there).
 */
import { MapPin, Plane } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { festivalPath } from '#shared/utils/eventSlug'
import type { MeetCard } from '~/lib/meetDeck'

const props = defineProps<{ card: MeetCard; preview?: boolean }>()

const NuxtLink = resolveComponent('NuxtLink')
const isNight = computed(() => props.card.kind === 'dancer-same-night' || props.card.kind === 'dancer-going-out')
const night = computed(() => 'night' in props.card ? props.card.night : null)
const fest = computed(() => 'festivalSlug' in props.card ? props.card : null)
</script>

<template>
  <div>
    <slot name="photo">
      <img :src="sizedImage(card.photo, IMG.card)" :alt="card.name" class="w-full h-64 object-cover" draggable="false">
    </slot>
    <div class="p-5">
      <div class="flex items-baseline justify-between gap-3">
        <div class="text-xl font-black font-display text-foreground" data-testid="meet-card-name">
          {{ card.name }}
        </div>
        <div class="text-xs italic text-secondary font-display">
          {{ card.city }}
        </div>
      </div>
      <!-- Context chip: the festival (RAZ-982) or the night (RAZ-981) -->
      <component
        :is="preview || !fest.festivalSlug ? 'div' : NuxtLink"
        v-if="fest"
        :to="preview || !fest.festivalSlug ? undefined : festivalPath(fest.festivalSlug)"
        class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold hover:underline"
        :style="{ background: fest.festivalColor + '18', color: fest.festivalColor }"
        @pointerdown.stop
      >
        <Plane class="w-3 h-3" style="stroke-width:1.5;" />
        <template v-if="card.kind === 'dancer-your-fest'">Also going to {{ fest.festivalName }}</template>
        <template v-else>Going to {{ fest.festivalName }} — you're not</template>
      </component>
      <component
        :is="preview || !night.path ? 'div' : NuxtLink"
        v-else-if="isNight && night"
        :to="preview || !night.path ? undefined : night.path"
        class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-wd-green-600 hover:underline"
        style="background:color-mix(in srgb, var(--wd-green-600) 9.4%, transparent);"
        data-testid="meet-card-night"
        @pointerdown.stop
      >
        <MapPin class="w-3 h-3" style="stroke-width:1.5;" />
        {{ card.kind === 'dancer-same-night' ? 'Also going to' : 'Going to' }} {{ night.name }}<template v-if="night.when"> · {{ night.when }}</template><template v-if="night.venue"> · {{ night.venue }}</template>
      </component>
      <div class="mt-3 flex flex-wrap gap-1">
        <span
          v-for="st in card.danceStyles"
          :key="st"
          class="text-eyebrow font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-muted-foreground"
          style="background:color-mix(in srgb, var(--wd-brown-900) 3.9%, transparent);"
        >
          {{ st }}
        </span>
      </div>
      <p v-if="card.reason" class="mt-3 text-xs italic leading-snug text-muted-foreground font-display">
        {{ card.reason }}
      </p>
      <slot name="after" />
    </div>
  </div>
</template>
