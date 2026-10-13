<script setup lang="ts">
/**
 * What else is on the days an organizer is picking: events in the same city,
 * and festivals elsewhere in the country. Shown under "When" in the event
 * editor, so the date is chosen knowing the competition.
 *
 *   <BusinessSameDays :city="form.city" :from="form.date" :to="form.endDate" :except-id="eventId" />
 */
import { CalendarSearch } from 'lucide-vue-next'

const props = defineProps({
  city: { type: String, default: '' },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  exceptId: { type: String, default: undefined },
})

const { $trpc } = useNuxtApp()
type Result = Awaited<ReturnType<typeof $trpc.events.sameDays.query>>
const data = ref<Result | null>(null)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
watch(() => [props.city, props.from, props.to], () => {
  clearTimeout(timer)
  if (!props.city || !props.from) { data.value = null; return }
  timer = setTimeout(async () => {
    const n = ++seq
    loading.value = true
    try {
      const r = await $trpc.events.sameDays.query({ city: props.city, from: props.from, to: props.to || undefined, exceptId: props.exceptId })
      if (n === seq) data.value = r
    } catch { if (n === seq) data.value = null } finally { if (n === seq) loading.value = false }
  }, 300)
}, { immediate: true })

// Classes rarely compete with a night out: they fold away under the rest.
const isClass = (e: any) => ['Workshop', 'Course'].includes(e.type)
const nights = computed(() => (data.value?.inCity ?? []).filter(e => !isClass(e)))
const classes = computed(() => (data.value?.inCity ?? []).filter(isClass))
const manyDays = computed(() => !!props.to && props.to > props.from)
</script>

<template>
  <div class="min-w-0 rounded-xl bg-muted/50 p-3">
    <p class="flex items-center gap-1.5 text-sm font-bold"><CalendarSearch class="size-4 text-muted-foreground" aria-hidden="true" /> Also on these days</p>
    <p v-if="!from" class="mt-1 text-xs text-muted-foreground">Pick a date to see what else is on.</p>
    <p v-else-if="!city" class="mt-1 text-xs text-muted-foreground">Set the city under “Where” to see what else is on.</p>
    <p v-else-if="loading && !data" class="mt-1 text-xs text-muted-foreground">Looking…</p>
    <template v-else-if="data">
      <p class="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {{ data.inCity.length ? `${data.inCity.length} other event${data.inCity.length === 1 ? '' : 's'} in ${data.city}` : `Nothing else in ${data.city} on WeDance` }}<template v-if="data.festivals.length"> · {{ data.festivals.length }} festival{{ data.festivals.length === 1 ? '' : 's' }} elsewhere in {{ data.country }}</template>.
      </p>
      <BusinessSameDaysList v-if="nights.length" :events="nights" :many-days="manyDays" class="mt-3" />
      <details v-if="classes.length" class="mt-3">
        <summary class="cursor-pointer text-xs font-bold text-secondary">{{ classes.length }} class{{ classes.length === 1 ? '' : 'es' }} and workshop{{ classes.length === 1 ? '' : 's' }}</summary>
        <BusinessSameDaysList :events="classes" :many-days="manyDays" class="mt-2" />
      </details>
      <template v-if="data.festivals.length">
        <p class="mt-4 text-xs font-bold uppercase tracking-wider text-secondary">Festivals elsewhere in {{ data.country }}</p>
        <BusinessSameDaysList :events="data.festivals" with-city class="mt-2" />
      </template>
    </template>
  </div>
</template>
