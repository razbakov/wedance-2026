<script setup lang="ts">
/**
 * What else is on the days an organizer is picking: events in the same city,
 * and festivals elsewhere in the country. Shown under "When" in the event
 * editor, so the date is chosen knowing the competition.
 *
 *   <BusinessSameDays :city="form.city" :from="form.date" :to="form.endDate" :except-id="eventId" />
 */
import { CalendarSearch } from 'lucide-vue-next'
import { eventPath } from '#shared/utils/eventSlug'
import { eventLocalTime } from '#shared/utils/eventTime'

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

const part = (iso: string, tz: string | null | undefined, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleDateString('en-GB', { ...o, timeZone: tz || 'Europe/Berlin' })
const when = (e: any) => {
  const day = part(e.startDate, e.timezone, { weekday: 'short', day: 'numeric', month: 'short' })
  const multi = e.isFestival || ['Festival', 'Weekender', 'Congress'].includes(e.type)
  const last = e.endDate ? part(e.endDate, e.timezone, { weekday: 'short', day: 'numeric', month: 'short' }) : day
  if (!multi || last === day) return `${day} · ${eventLocalTime(e.startDate, e.timezone || undefined)}`
  // "16 – 18 Oct" in one month, else "30 Oct – 1 Nov".
  const sameMonth = part(e.startDate, e.timezone, { month: 'short' }) === part(e.endDate, e.timezone, { month: 'short' })
  return `${part(e.startDate, e.timezone, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })} – ${part(e.endDate, e.timezone, { day: 'numeric', month: 'short' })}`
}
// Classes rarely compete with a night out: they fold away under the rest.
const isClass = (e: any) => ['Workshop', 'Course'].includes(e.type)
const nights = computed(() => (data.value?.inCity ?? []).filter(e => !isClass(e)))
const classes = computed(() => (data.value?.inCity ?? []).filter(isClass))
const where = (e: any) => [e.venueName, e.organizerName && e.organizerName !== e.venueName ? e.organizerName : ''].filter(Boolean).join(' · ')
</script>

<template>
  <div class="rounded-xl bg-muted/50 p-3">
    <p class="flex items-center gap-1.5 text-sm font-bold"><CalendarSearch class="size-4 text-muted-foreground" aria-hidden="true" /> Also on these days</p>
    <p v-if="!from" class="mt-1 text-xs text-muted-foreground">Pick a date to see what else is on.</p>
    <p v-else-if="!city" class="mt-1 text-xs text-muted-foreground">Set the city under “Where” to see what else is on.</p>
    <p v-else-if="loading && !data" class="mt-1 text-xs text-muted-foreground">Looking…</p>
    <template v-else-if="data">
      <p class="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {{ data.inCity.length ? `${data.inCity.length} other event${data.inCity.length === 1 ? '' : 's'} in ${data.city}` : `Nothing else in ${data.city} on WeDance` }}<template v-if="data.festivals.length"> · {{ data.festivals.length }} festival{{ data.festivals.length === 1 ? '' : 's' }} elsewhere in {{ data.country }}</template>.
      </p>
      <ul v-if="nights.length" class="mt-2 grid gap-1 text-sm">
        <li v-for="e in nights" :key="e.id" class="flex gap-2">
          <span class="w-32 shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{{ when(e) }}</span>
          <span class="min-w-0 flex-1 truncate">
            <NuxtLink :to="eventPath(e)" target="_blank" class="font-bold hover:underline">{{ e.name }}</NuxtLink>
            <span v-if="where(e)" class="text-muted-foreground"> · {{ where(e) }}</span>
            <span v-if="e.styles?.length" class="text-muted-foreground"> · {{ e.styles.slice(0, 3).join(', ') }}</span>
          </span>
        </li>
      </ul>
      <details v-if="classes.length" class="mt-2 text-sm">
        <summary class="cursor-pointer text-xs font-bold text-secondary">{{ classes.length }} class{{ classes.length === 1 ? '' : 'es' }} and workshop{{ classes.length === 1 ? '' : 's' }}</summary>
        <ul class="mt-1 grid gap-1">
          <li v-for="e in classes" :key="e.id" class="flex gap-2">
            <span class="w-32 shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{{ when(e) }}</span>
            <span class="min-w-0 flex-1 truncate">
              <NuxtLink :to="eventPath(e)" target="_blank" class="font-bold hover:underline">{{ e.name }}</NuxtLink>
              <span v-if="where(e)" class="text-muted-foreground"> · {{ where(e) }}</span>
              <span v-if="e.styles?.length" class="text-muted-foreground"> · {{ e.styles.slice(0, 3).join(', ') }}</span>
            </span>
          </li>
        </ul>
      </details>
      <template v-if="data.festivals.length">
        <p class="mt-3 text-xs font-bold uppercase tracking-wider text-secondary">Festivals in {{ data.country }}</p>
        <ul class="mt-1 grid gap-1 text-sm">
          <li v-for="e in data.festivals" :key="e.id" class="flex gap-2">
            <span class="w-32 shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">{{ when(e) }}</span>
            <span class="min-w-0 flex-1 truncate">
              <NuxtLink :to="eventPath(e)" target="_blank" class="font-bold hover:underline">{{ e.name }}</NuxtLink>
              <span class="text-muted-foreground"> · {{ e.city }}</span>
            </span>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>
