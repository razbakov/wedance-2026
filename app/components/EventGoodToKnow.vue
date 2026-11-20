<script setup lang="ts">
/**
 * Overview → "Good to know" (RAZ-1009): the event's own practical info (food, dress code, ticket rules,
 * contact…), one line each, with links read as words. Moved out of the venue card, which now holds
 * only the venue's own hints (RAZ-1012), until each line gets its own place (schedule, passes…).
 *
 *   <EventGoodToKnow :lines="festival.venue.practicalInfo" />
 */
import { linkParts } from '~/lib/linkParts'

const props = defineProps<{ lines: string[] }>()
const shown = computed(() => props.lines.map(l => l?.trim()).filter(Boolean) as string[])
</script>

<template>
  <section v-if="shown.length" id="good-to-know" class="scroll-mt-16" aria-labelledby="good-to-know-title" data-good-to-know>
    <h2 id="good-to-know-title" class="text-2xl font-black leading-tight text-foreground">Good to know</h2>
    <ul class="mt-4 divide-y divide-border rounded-2xl border border-border bg-card font-sans text-sm sm:text-base">
      <li v-for="(line, i) in shown" :key="i" class="px-4 py-3 text-foreground">
        <template v-for="(part, j) in linkParts(line)" :key="j">
          <a v-if="part.href" :href="part.href" target="_blank" rel="noopener noreferrer" class="font-semibold underline underline-offset-2 hover:text-secondary">{{ part.text }}</a>
          <template v-else>{{ part.text }}</template>
        </template>
      </li>
    </ul>
  </section>
</template>
