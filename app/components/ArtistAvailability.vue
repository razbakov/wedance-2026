<script setup lang="ts">
/**
 * Weekly times an artist published for private events, weddings and corporate
 * bookings. Hidden when nothing is published — that is unknown, not “never free”.
 */
import { availabilityLines, type ArtistSlot } from '#shared/utils/artistAvailability'

const props = defineProps<{ slots: ArtistSlot[] }>()
const lines = computed(() => availabilityLines(props.slots ?? []))
</script>

<template>
  <section v-if="lines.length" data-testid="artist-availability" class="font-sans">
    <h2 class="text-2xl font-display text-foreground">Free for private events</h2>
    <p class="mt-1 text-sm text-muted-foreground">Times they take a wedding, a corporate booking or a private event. A date they’re already playing still needs a yes from them.</p>
    <ul class="mt-3 grid gap-1 text-sm">
      <li v-for="line in lines" :key="line.dayOfWeek" class="grid grid-cols-[7rem_minmax(0,1fr)]">
        <span class="text-muted-foreground">{{ line.label }}</span>
        <span>{{ line.hours }}</span>
      </li>
    </ul>
  </section>
</template>
