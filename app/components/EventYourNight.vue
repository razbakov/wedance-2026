<script setup lang="ts">
/**
 * "Your night" (RAZ-1007): under "Spot booked" on an event whose programme is a night.
 * What the pass covers is ticked (booking put it on the plan); untick what you'll skip —
 * you keep your spot and price. It sets "Be there around …", and the organiser's counts
 * per item. Items the pass doesn't cover offer the pass that does, with the difference.
 */
import { CalendarPlus, Check, Clock } from 'lucide-vue-next'
import type { FestivalPass } from '#shared/types/festivalDetails'
import { arrivalTime, passCovers, upgradeFor } from '#shared/utils/yourNight'
import { zonedToUtc } from '#shared/utils/eventTime'

type Item = { id: string; date: string; time: string; duration: number; type: any; title: string; sub?: string }

const props = defineProps<{
  items: Item[]
  pass: FestivalPass | null
  passes: FestivalPass[]
  /** Programme items on the dancer's plan. */
  plannedIds: Set<string>
  eventName: string
  address?: string | null
  timezone?: string | null
  /** "pass" on a festival, "ticket" on a party or class (RAZ-1029). */
  noun?: 'pass' | 'ticket'
}>()
const emit = defineEmits<{ toggle: [id: string]; upgrade: [passName: string] }>()
const one = computed(() => props.noun === 'pass' ? 'pass' : 'ticket')

const covered = computed(() => new Set(passCovers(props.pass, props.items).map(s => s.id)))
const ticked = computed(() => props.items.filter(i => props.plannedIds.has(i.id)))
const arrival = computed(() => arrivalTime(ticked.value))
const upgrades = computed(() => Object.fromEntries(props.items
  .filter(i => !covered.value.has(i.id))
  .map(i => [i.id, upgradeFor(props.passes, props.pass, props.items, i.id)])))

// One calendar entry: from the first ticked item to the end of the last one.
const endOf = (i: Item) => zonedToUtc(i.date, i.time, props.timezone || undefined).getTime() + Math.max(i.duration || 0, 0) * 60_000
const ics = computed(() => {
  if (!ticked.value.length) return ''
  const first = ticked.value[0]!
  const start = zonedToUtc(first.date, first.time, props.timezone || undefined).getTime() - (first.type === 'workshop' ? 10 * 60_000 : 0)
  const end = Math.max(...ticked.value.map(endOf), start + 60 * 60_000)
  const fmt = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
  const what = ticked.value.map(i => `${i.time} ${i.title}`).join('\n')
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WeDance//Your night//EN', 'BEGIN:VEVENT',
    `UID:${first.id}-${start}@wedance.vip`, `DTSTAMP:${fmt(Date.now())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(props.eventName)}`, `DESCRIPTION:${esc(what)}`, ...(props.address ? [`LOCATION:${esc(props.address)}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`
})
</script>

<template>
  <div class="mt-3 rounded-2xl border border-border bg-card px-4 py-4 font-sans" data-your-night>
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p class="font-bold text-foreground">Your night</p>
      <p v-if="arrival" class="text-sm font-bold text-wd-green-700 inline-flex items-center gap-1" data-your-night-arrival><Clock class="size-4" aria-hidden="true" /> Be there around {{ arrival }}</p>
      <p v-else class="text-sm text-muted-foreground">Nothing ticked — your spot is still yours.</p>
    </div>
    <ul class="mt-3 space-y-1">
      <li v-for="it in items" :key="it.id" class="flex items-center gap-3 rounded-xl px-2 py-1.5" :class="covered.has(it.id) ? 'hover:bg-muted/50' : ''">
        <button
          v-if="covered.has(it.id)"
          type="button" role="checkbox" :aria-checked="plannedIds.has(it.id)" :aria-label="`${it.time} ${it.title}`"
          class="size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
          :class="plannedIds.has(it.id) ? 'bg-wd-green-600 border-wd-green-600 text-white' : 'border-muted-foreground/40'"
          :data-your-night-item="it.id"
          @click="emit('toggle', it.id)"
        ><Check v-if="plannedIds.has(it.id)" class="size-3.5" aria-hidden="true" /></button>
        <span v-else class="size-5 shrink-0" />
        <span class="w-12 text-sm font-bold tabular-nums shrink-0">{{ it.time }}</span>
        <span class="flex-1 min-w-0" :class="plannedIds.has(it.id) ? 'text-foreground' : 'text-muted-foreground'">
          <span class="block text-sm font-bold truncate">{{ it.title }}</span>
          <span v-if="it.sub" class="block text-xs truncate">{{ it.sub }}</span>
        </span>
        <button
          v-if="!covered.has(it.id) && upgrades[it.id]"
          type="button"
          class="shrink-0 text-xs font-bold text-primary border border-primary/40 rounded-full px-2.5 py-1 hover:bg-primary/5"
          data-your-night-upgrade
          @click="emit('upgrade', upgrades[it.id]!.pass.name)"
        >Not in your {{ one }} · +€{{ upgrades[it.id]!.extra }}</button>
        <span v-else-if="!covered.has(it.id)" class="shrink-0 text-xs text-muted-foreground">Not in your {{ one }}</span>
      </li>
    </ul>
    <p class="mt-3 text-xs text-muted-foreground">Untick what you’ll skip: you keep your spot and your price. It tells you when to come, and the organiser how many come to what.</p>
    <a v-if="ics" :href="ics" :download="`${eventName.replace(/[^\w\- ]+/g, '').trim() || 'wedance'}.ics`" class="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-border hover:bg-muted/50" data-your-night-calendar>
      <CalendarPlus class="size-3.5" aria-hidden="true" /> Add to calendar
    </a>
  </div>
</template>
