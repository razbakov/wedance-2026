<script setup lang="ts">
/**
 * WeeklyCalendar — chronological per-day list, V3 tropical style.
 * Replaces the old shadcn time-x-venue table: same data, easier to scan
 * on mobile, aligned with the cream + Playfair Display + Caveat
 * language used on /, /festivals, /cities, /my-plan.
 */
import { Flame, MapPin, Plus, Check } from 'lucide-vue-next'
import type { CityEvent, DayOfWeek } from '~/types/city'
import type { Teacher } from '~/types/festival'
import { getStyleColors } from '~/lib/style-colors'

const props = defineProps<{
  events: CityEvent[]
  weekPlanIds: ReadonlySet<string>
  teachers?: Teacher[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
  'select-teacher': [id: string]
}>()

const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Day labels: e.g. "Monday, Jan 8" for the current week.
const dayLabels = computed(() => {
  const now = new Date()
  const currentDay = now.getDay()
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)

  const map: Record<string, string> = {}
  days.forEach((day, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    map[day] = `${day}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })
  return map
})

const peopleMap = computed(() => {
  const map = new Map<string, Teacher>()
  for (const t of props.teachers ?? []) map.set(t.id, t)
  return map
})

function personFor(event: CityEvent): { person: Teacher; id: string } | undefined {
  const id = event.teacherId ?? event.djId ?? event.organizerId
  if (!id) return undefined
  const person = peopleMap.value.get(id)
  return person ? { person, id } : undefined
}

const daysWithEvents = computed(() =>
  days.filter(day => props.events.some(e => e.day === day)),
)

function eventsForDay(day: DayOfWeek) {
  return props.events
    .filter(e => e.day === day)
    .sort((a, b) => a.time.localeCompare(b.time))
}

function levelChilis(level?: string): number {
  if (level === 'Beginner') return 1
  if (level === 'Intermediate') return 2
  if (level === 'Advanced') return 3
  return 0
}

// Type accent — warm, not shadcn palette
type EventType = 'class' | 'social' | 'practica' | 'workshop'
const typeStyle: Record<EventType, { label: string; color: string }> = {
  class:    { label: 'Class',    color: '#0891b2' },
  social:   { label: 'Social',   color: '#dc2626' },
  practica: { label: 'Practica', color: '#f59e0b' },
  workshop: { label: 'Workshop', color: '#a855f7' },
}

// Style accent color — resolved from the shared getStyleColors util.
// Falls back to a warm neutral if the util returns a non-color class.
function styleAccent(style: string): string {
  const c = getStyleColors(style)
  const map: Record<string, string> = {
    salsa:    '#dc2626',
    bachata:  '#a855f7',
    kizomba:  '#ec4899',
    timba:    '#f59e0b',
    son:      '#16a34a',
    rumba:    '#0891b2',
    'urban kiz': '#7c3aed',
    semba:    '#f59e0b',
    'hip hop':'#0ea5e9',
  }
  return map[style.toLowerCase()] || (c as any)?.hex || '#9a5614'
}

const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek

// Booked events with a venueHandle link to the venue's /@handle page;
// other real (UUID) events link to /events/<id>; mock weekly events don't link.
const NuxtLinkC = resolveComponent('NuxtLink')
const isRealEvent = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(id))
function eventHref(e: CityEvent): string | undefined {
  if ((e as any).venueHandle) return `/@${(e as any).venueHandle}`
  if (isRealEvent(e.id)) return `/events/${e.id}`
  return undefined
}
</script>

<template>
  <div class="space-y-10">
    <!-- Empty (nothing across the whole week matches filters) -->
    <div
      v-if="!daysWithEvents.length"
      class="text-center py-14 rounded-2xl border-2 border-dashed"
      style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
    >
      <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        No events match your filters.
      </p>
    </div>

    <!-- Per-day sections -->
    <div v-for="day in daysWithEvents" :key="day" class="space-y-3">
      <!-- Sticky day header -->
      <div
        class="sticky top-0 z-10 pt-2 pb-3 flex items-baseline gap-3 backdrop-blur-sm"
        style="background:rgba(251, 245, 234, 0.95); border-bottom:1px solid #3b1f0d22;"
      >
        <h3
          class="text-xl font-black leading-none"
          style="font-family:'Playfair Display', serif;"
          :style="{ color: day === today ? '#dc2626' : '#3b1f0d' }"
        >
          {{ dayLabels[day] }}
        </h3>
        <span
          v-if="day === today"
          class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style="background:#dc262618; color:#dc2626; font-family: system-ui, sans-serif;"
        >
          Tonight
        </span>
      </div>

      <!-- Event rows -->
      <div class="grid grid-cols-1 gap-2">
        <!-- Booked events link to their venue /@handle; other real events to /events/<id>. -->
        <component
          :is="eventHref(e) ? NuxtLinkC : 'div'"
          v-for="e in eventsForDay(day)"
          :key="e.id"
          :to="eventHref(e)"
          class="group rounded-xl bg-white p-3 sm:p-4 border transition-all hover:-translate-y-0.5 flex items-center gap-3 sm:gap-4"
          :style="{
            borderColor: styleAccent(e.style) + '55',
            boxShadow: '0 1px 0 ' + styleAccent(e.style) + '18, 0 4px 14px rgba(59,31,18,0.04)',
          }"
        >
          <!-- Time (fixed width, bold) -->
          <div class="w-14 shrink-0 text-center">
            <div
              class="text-lg font-black leading-none tabular-nums"
              :style="{ color: styleAccent(e.style), fontFamily: 'Playfair Display, serif' }"
            >
              {{ e.time }}
            </div>
          </div>

          <!-- Middle: type badge, name, venue + teacher -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center flex-wrap gap-2">
              <span
                class="inline-flex items-center text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                :style="{ background: typeStyle[e.type as EventType]?.color + '18', color: typeStyle[e.type as EventType]?.color }"
              >
                {{ typeStyle[e.type as EventType]?.label ?? e.type }}
              </span>
              <span
                class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :style="{ background: styleAccent(e.style) + '18', color: styleAccent(e.style) }"
              >
                {{ e.style }}
              </span>
            </div>
            <h4 class="text-sm sm:text-base font-bold leading-tight mt-1 break-words group-hover:underline" style="color:#3b1f0d;">
              {{ e.name }}
            </h4>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <span class="inline-flex items-center gap-1">
                <MapPin class="w-3 h-3" style="color:#9a5614;" />
                {{ e.venue }}
              </span>
              <button
                v-if="personFor(e)"
                type="button"
                class="italic hover:underline"
                :style="{ color: styleAccent(e.style) }"
                @click.stop.prevent="emit('select-teacher', personFor(e)!.id)"
              >
                {{ personFor(e)!.person.name }}
              </button>
              <span
                v-if="levelChilis(e.level) > 0"
                class="inline-flex items-center gap-px"
                :title="e.level"
              >
                <Flame
                  v-for="n in levelChilis(e.level)"
                  :key="n"
                  class="w-3 h-3"
                  :style="{ color: levelChilis(e.level) === 3 ? '#dc2626' : levelChilis(e.level) === 2 ? '#f59e0b' : '#fbbf24' }"
                />
              </span>
              <span
                v-else-if="e.level"
                class="text-[10px] font-bold uppercase tracking-wider"
                style="color:#9a5614;"
              >
                {{ e.level }}
              </span>
            </div>
          </div>

          <!-- Pick button -->
          <button
            type="button"
            class="text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap inline-flex items-center gap-1"
            :style="weekPlanIds?.has(e.id)
              ? { background: styleAccent(e.style), color: 'white' }
              : { background: 'white', color: styleAccent(e.style), border: '1.5px solid ' + styleAccent(e.style) + '55' }"
            @click.stop.prevent="emit('toggle', e.id)"
          >
            <component :is="weekPlanIds?.has(e.id) ? Check : Plus" class="w-3 h-3" />{{ weekPlanIds?.has(e.id) ? 'Going!' : 'Going?' }}
          </button>
        </component>
      </div>
    </div>
  </div>
</template>
