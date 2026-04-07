<script setup lang="ts">
import { Flame } from 'lucide-vue-next'
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

// Compute day labels with dates for current week (like festival ScheduleTab)
const dayLabels = computed(() => {
  const now = new Date()
  const currentDay = now.getDay() // 0=Sun, 1=Mon, ...
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

// Days that have events (skip empty days)
const daysWithEvents = computed(() =>
  days.filter(day => props.events.some(e => e.day === day)),
)

// All events for a day (including socials — socials go in the grid too)
function eventsForDay(day: DayOfWeek) {
  return props.events
    .filter(e => e.day === day)
    .sort((a, b) => a.time.localeCompare(b.time))
}

// Venues that have events on a specific day (not all venues globally)
function venuesForDay(day: DayOfWeek) {
  return [...new Set(eventsForDay(day).map(e => e.venue))]
}

// Unique time slots for a day
function timeSlotsForDay(day: DayOfWeek) {
  return [...new Set(eventsForDay(day).map(e => e.time))].sort()
}

// Find event at specific day/time/venue
function eventAt(day: DayOfWeek, time: string, venue: string): CityEvent | undefined {
  return eventsForDay(day).find(e => e.time === time && e.venue === venue)
}

function levelChilis(level?: string): number {
  if (level === 'Beginner') return 1
  if (level === 'Intermediate') return 2
  if (level === 'Advanced') return 3
  return 0
}

const typeBadge: Record<string, { label: string; class: string }> = {
  class: { label: 'Class', class: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  social: { label: 'Social', class: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  practica: { label: 'Practica', class: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  workshop: { label: 'Workshop', class: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
}

const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek
</script>

<template>
  <div class="space-y-6">
    <!-- Day sections -->
    <div v-for="day in daysWithEvents" :key="day" class="space-y-2">
      <h3
        class="text-base font-semibold sticky top-11 bg-background py-2 z-10 border-b"
        :class="day === today ? 'text-primary' : ''"
      >
        {{ dayLabels[day] }}
        <span v-if="day === today" class="text-[10px] font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-2">Today</span>
      </h3>

      <!-- Table: time × venue grid (venues scoped to this day) -->
      <div v-if="timeSlotsForDay(day).length > 0" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left text-xs font-medium text-muted-foreground p-2 w-16">Time</th>
              <th
                v-for="venue in venuesForDay(day)"
                :key="venue"
                class="text-left text-xs font-medium text-muted-foreground p-2"
              >
                {{ venue }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="time in timeSlotsForDay(day)" :key="time" class="border-t">
              <td class="text-sm font-medium text-muted-foreground p-2 align-top whitespace-nowrap font-mono">
                {{ time }}
              </td>
              <td v-for="venue in venuesForDay(day)" :key="venue" class="p-2 align-top">
                <div
                  v-if="eventAt(day, time, venue)"
                  class="rounded-md border border-l-[3px] p-2 hover:shadow-sm transition-shadow min-w-[140px]"
                  :class="getStyleColors(eventAt(day, time, venue)!.style).border"
                >
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      class="px-1 py-0.5 rounded text-[9px] font-medium leading-none"
                      :class="typeBadge[eventAt(day, time, venue)!.type]?.class"
                    >
                      {{ typeBadge[eventAt(day, time, venue)!.type]?.label }}
                    </span>
                  </div>
                  <h4 class="text-[11px] font-medium mt-1 leading-tight">{{ eventAt(day, time, venue)!.name }}</h4>
                  <button
                    v-if="personFor(eventAt(day, time, venue)!)"
                    class="text-[10px] text-primary hover:text-primary/80 mt-0.5 truncate block text-left"
                    @click="emit('select-teacher', personFor(eventAt(day, time, venue)!)!.id)"
                  >
                    {{ personFor(eventAt(day, time, venue)!)!.person.name }}
                  </button>
                  <div class="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span v-if="levelChilis(eventAt(day, time, venue)!.level) > 0" class="flex items-center gap-px" :title="eventAt(day, time, venue)!.level">
                      <Flame
                        v-for="n in levelChilis(eventAt(day, time, venue)!.level)"
                        :key="n"
                        class="w-2.5 h-2.5"
                        :class="levelChilis(eventAt(day, time, venue)!.level) === 3 ? 'text-red-500' : levelChilis(eventAt(day, time, venue)!.level) === 2 ? 'text-orange-500' : 'text-amber-400'"
                      />
                    </span>
                    <span v-else-if="eventAt(day, time, venue)!.level" class="text-[9px]">{{ eventAt(day, time, venue)!.level }}</span>
                    <button
                      class="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded border transition-colors"
                      :class="weekPlanIds?.has(eventAt(day, time, venue)!.id) ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground hover:text-foreground hover:border-foreground/30'"
                      @click="emit('toggle', eventAt(day, time, venue)!.id)"
                    >
                      {{ weekPlanIds?.has(eventAt(day, time, venue)!.id) ? '✓ Picked' : 'Pick' }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else class="text-sm text-muted-foreground py-4">
        No events match your filters for {{ dayLabels[day] }}.
      </p>
    </div>
  </div>
</template>
