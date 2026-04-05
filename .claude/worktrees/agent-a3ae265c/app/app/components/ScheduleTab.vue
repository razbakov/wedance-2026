<script setup lang="ts">
import type { Workshop, Teacher } from '~/types/festival'
import { getStyleColors } from '~/lib/style-colors'
import { chilis } from '~/lib/levels'
import { MapPin, Clock, Music } from 'lucide-vue-next'

const props = defineProps<{
  workshops: Workshop[]
  teachers: Teacher[]
  days: string[]
  styles: string[]
  planIds: Set<string>
  selectedTeacherId: string | null
  startDate: string
}>()

const dayLabels = computed(() => {
  const start = new Date(props.startDate)
  const map: Record<string, string> = {}
  props.days.forEach((day, i) => {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    map[day] = `${day}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })
  return map
})

const emit = defineEmits<{
  toggleWorkshop: [id: string]
}>()

const selectedStyle = ref<string | null>(null)
const selectedLevel = ref<string | null>(null)

const levels = ['Beginner', 'Intermediate', 'Advanced']

const rooms = computed(() => [...new Set(props.workshops.map((w) => w.room))])

function filteredForDay(day: string) {
  return props.workshops
    .filter((w) => {
      if (w.day !== day) return false
      if (w.type === 'party') return false
      if (props.selectedTeacherId && w.teacherId !== props.selectedTeacherId) return false
      if (selectedStyle.value && w.style !== selectedStyle.value) return false
      if (selectedLevel.value && w.level !== selectedLevel.value) return false
      return true
    })
    .sort((a, b) => a.time.localeCompare(b.time))
}

function partiesForDay(day: string) {
  return props.workshops
    .filter((w) => w.day === day && w.type === 'party')
    .sort((a, b) => a.time.localeCompare(b.time))
}

function timeSlotsForDay(day: string) {
  return [...new Set(filteredForDay(day).map((w) => w.time))].sort()
}

function workshopAt(day: string, time: string, room: string): Workshop | undefined {
  return filteredForDay(day).find((w) => w.time === time && w.room === room)
}

function teacherFor(workshop: Workshop): Teacher {
  return props.teachers.find((t) => t.id === workshop.teacherId)!
}

function toggleStyle(value: string) {
  selectedStyle.value = selectedStyle.value === value ? null : value
}

function toggleLevel(value: string) {
  selectedLevel.value = selectedLevel.value === value ? null : value
}
</script>

<template>
  <div class="space-y-6">
    <!-- Style + Level filters -->
    <div class="space-y-2">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="style in styles"
          :key="style"
          class="inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium transition-colors"
          :class="selectedStyle === style
            ? getStyleColors(style).pillActive
            : getStyleColors(style).pill"
          @click="toggleStyle(style)"
        >
          {{ style }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="level in levels"
          :key="level"
          :variant="selectedLevel === level ? 'default' : 'outline'"
          size="sm"
          :title="level"
          @click="toggleLevel(level)"
        >
          {{ chilis(level) }} {{ level }}
        </Button>
      </div>
    </div>

    <!-- Day sections -->
    <div v-for="day in days" :key="day" class="space-y-2">
      <h3 class="text-base font-semibold sticky top-11 bg-background py-2 z-10 border-b">{{ dayLabels[day] }}</h3>

      <div v-if="timeSlotsForDay(day).length > 0" class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="text-left text-xs font-medium text-muted-foreground p-2 w-16">Time</th>
              <th
                v-for="room in rooms"
                :key="room"
                class="text-left text-xs font-medium text-muted-foreground p-2"
              >
                {{ room }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="time in timeSlotsForDay(day)" :key="time" class="border-t">
              <td class="text-sm font-medium text-muted-foreground p-2 align-top whitespace-nowrap">
                {{ time }}
              </td>
              <td v-for="room in rooms" :key="room" class="p-2 align-top">
                <WorkshopCard
                  v-if="workshopAt(day, time, room)"
                  :workshop="workshopAt(day, time, room)!"
                  :teacher="teacherFor(workshopAt(day, time, room)!)"
                  :in-plan="planIds.has(workshopAt(day, time, room)!.id)"
                  @toggle="emit('toggleWorkshop', workshopAt(day, time, room)!.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-else-if="partiesForDay(day).length === 0" class="text-sm text-muted-foreground py-4">
        No workshops match your filters for {{ day }}.
      </p>

      <!-- Parties -->
      <div
        v-for="party in partiesForDay(day)"
        :key="party.id"
        class="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <Music class="w-4 h-4 text-primary" />
              <h4 class="font-semibold text-sm">{{ party.title }}</h4>
            </div>
            <p v-if="party.description" class="text-xs text-muted-foreground mb-2">{{ party.description }}</p>
            <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" />
                {{ party.time }}
              </span>
              <span v-if="party.venue" class="flex items-center gap-1">
                <MapPin class="w-3 h-3" />
                {{ party.venue }}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            :variant="planIds.has(party.id) ? 'secondary' : 'outline'"
            class="shrink-0 text-xs h-7"
            @click="emit('toggleWorkshop', party.id)"
          >
            {{ planIds.has(party.id) ? '✓ Picked' : 'Pick' }}
          </Button>
        </div>
        <span class="text-xs text-muted-foreground mt-2 block">{{ party.goingCount }} going</span>
      </div>
    </div>
  </div>
</template>
