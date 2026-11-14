<script setup lang="ts">
/**
 * The event editor's steps (RAZ-939): what and when → venue → line-up →
 * entry → flyer → publish, each done or to do, one open at a time. Picking a
 * step emits `go`; the page opens that card of the form (or scrolls to the
 * flyer / publish panel).
 *
 *   <BusinessEventSteps :steps="eventSteps(ev)" v-model="step" @go="goStep" />
 */
import type { PropType } from 'vue'
import { Check, ArrowRight } from 'lucide-vue-next'
import { nextStep, type EventStep, type EventStepKey } from '~/lib/eventSteps'

const props = defineProps({
  steps: { type: Array as PropType<EventStep[]>, required: true },
})
const current = defineModel<EventStepKey | null>({ default: null })
const emit = defineEmits<{ go: [key: EventStepKey] }>()

const done = computed(() => props.steps.filter(s => s.done).length)
const after = computed(() => current.value ? nextStep(props.steps, current.value) : null)
const labelOf = (k: EventStepKey | null) => props.steps.find(s => s.key === k)?.label ?? ''
function go(k: EventStepKey) {
  current.value = k
  emit('go', k)
}
</script>

<template>
  <section class="rounded-2xl border bg-card p-4" data-event-steps>
    <div class="flex items-baseline justify-between gap-2">
      <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Steps</h2>
      <span class="text-xs text-muted-foreground tabular-nums">{{ done }} of {{ steps.length }} done</span>
    </div>
    <ol class="mt-3 grid gap-1">
      <li v-for="(s, i) in steps" :key="s.key">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
          :class="current === s.key ? 'bg-muted' : ''"
          :aria-current="current === s.key ? 'step' : undefined"
          :data-step="s.key"
          :data-done="s.done ? 'yes' : 'no'"
          @click="go(s.key)"
        >
          <span
            class="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold"
            :class="s.done ? 'bg-success/15 text-wd-green-700' : 'border-2 border-input text-muted-foreground'"
            aria-hidden="true"
          ><Check v-if="s.done" class="size-3.5" /><template v-else>{{ i + 1 }}</template></span>
          <span class="min-w-0 flex-1 font-bold">{{ s.label }}</span>
          <span class="text-xs" :class="s.done ? 'text-wd-green-700' : 'text-muted-foreground'">{{ s.done ? 'Done' : 'To do' }}</span>
        </button>
        <div v-if="current === s.key" class="ml-11 mt-1 mb-2 grid gap-2 text-sm">
          <p class="text-muted-foreground">{{ s.hint }}</p>
          <div v-if="after" class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline-pill" size="pill-sm" @click="go(after)">Next: {{ labelOf(after) }} <ArrowRight aria-hidden="true" /></Button>
            <span v-if="!s.done && s.key !== 'flyer' && s.key !== 'publish'" class="text-xs text-muted-foreground">Save your changes to mark it done.</span>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>
