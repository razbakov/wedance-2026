<script setup lang="ts">
/**
 * What a plain event says about itself (RAZ-1007: every event renders through FestivalView):
 * its type and styles, price, website and the night's agenda. Festivals say these through
 * their own passes, programme and links.
 */
import { Euro, Globe } from 'lucide-vue-next'

export type EventFactsData = {
  type?: string | null
  styles?: string[] | null
  price?: string | null
  link?: string | null
  agenda?: { time: string; what: string }[] | null
}
const props = defineProps<{ facts: EventFactsData }>()
const has = computed(() => !!(props.facts.type || props.facts.styles?.length || props.facts.price || props.facts.link || props.facts.agenda?.length))
</script>

<template>
  <div v-if="has" class="space-y-4 font-sans" data-event-facts>
    <div v-if="facts.type || facts.styles?.length" class="flex flex-wrap items-center gap-2">
      <span v-if="facts.type" class="text-eyebrow font-black uppercase tracking-widest px-2 py-1 rounded bg-secondary/[9.4%] text-secondary">{{ facts.type }}</span>
      <DanceStyleChips :styles="facts.styles || []" size="md" class="gap-2" />
    </div>
    <ul v-if="facts.price || facts.link" class="space-y-1.5 text-sm text-foreground">
      <li v-if="facts.price" class="flex items-start gap-2"><Euro class="w-4 h-4 mt-0.5 shrink-0 text-secondary" aria-hidden="true" /> <span class="whitespace-pre-line">{{ facts.price }}</span></li>
      <li v-if="facts.link" class="flex items-start gap-2">
        <Globe class="w-4 h-4 mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
        <a :href="facts.link" target="_blank" rel="noopener noreferrer" class="font-bold underline break-all text-primary">Event website</a>
      </li>
    </ul>
    <div v-if="facts.agenda?.length">
      <h3 class="text-eyebrow font-black uppercase tracking-widest text-secondary mb-1.5">Programme</h3>
      <ul class="space-y-1 text-sm text-foreground">
        <li v-for="(a, i) in facts.agenda" :key="i"><span class="font-bold tabular-nums">{{ a.time }}</span> {{ a.what }}</li>
      </ul>
    </div>
  </div>
</template>
