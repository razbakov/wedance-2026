<script setup lang="ts">
/**
 * ScheduleTab — chronological per-day workshop list, V3 tropical style.
 * Replaces the old shadcn time-x-room table: same data, easier to scan
 * on mobile, matches WeeklyCalendar visual language on /cities/[city].
 * The room becomes metadata alongside teacher + style rather than a
 * whole column of mostly-empty cells.
 */
import type { Workshop, Teacher } from '~/types/festival'
import { MapPin, Music, Users } from 'lucide-vue-next'
import { chilis } from '~/lib/levels'

const props = defineProps<{
  workshops: Workshop[]
  teachers: Teacher[]
  days: string[]
  styles: string[]
  planIds: Set<string>
  selectedTeacherId: string | null
  startDate: string
}>()

const emit = defineEmits<{
  toggleWorkshop: [id: string]
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

const selectedStyle = ref<string | null>(null)
const selectedLevel = ref<string | null>(null)

const levels = ['Beginner', 'Intermediate', 'Advanced']

function styleAccent(style: string): string {
  const map: Record<string, string> = {
    salsa:       '#dc2626',
    bachata:     '#a855f7',
    kizomba:     '#ec4899',
    timba:       '#f59e0b',
    son:         '#16a34a',
    rumba:       '#0891b2',
    'urban kiz': '#7c3aed',
    semba:       '#f59e0b',
    'hip hop':   '#0ea5e9',
  }
  return map[style.toLowerCase()] || '#9a5614'
}

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

function teacherFor(workshop: Workshop): Teacher | undefined {
  return props.teachers.find((t) => t.id === workshop.teacherId)
}

function toggleStyle(value: string) {
  selectedStyle.value = selectedStyle.value === value ? null : value
}

function toggleLevel(value: string) {
  selectedLevel.value = selectedLevel.value === value ? null : value
}

const levelColor: Record<string, string> = {
  Beginner:     '#16a34a',
  Intermediate: '#f59e0b',
  Advanced:     '#dc2626',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Filters — V3 warm palette -->
    <div class="rounded-2xl bg-white border p-4 sm:p-5" style="border-color:#3b1f0d22;">
      <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style="color:#9a5614;">Filter</div>
      <div class="flex flex-wrap gap-2 mb-3">
        <button
          v-for="style in styles"
          :key="style"
          type="button"
          class="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
          :style="selectedStyle === style
            ? { background: styleAccent(style), color: 'white', boxShadow: '0 2px 0 -1px ' + styleAccent(style) }
            : { background: 'white', color: styleAccent(style), border: '1.5px solid ' + styleAccent(style) + '55' }"
          @click="toggleStyle(style)"
        >
          {{ style }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="level in levels"
          :key="level"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
          :style="selectedLevel === level
            ? { background: levelColor[level], color: 'white', boxShadow: '0 2px 0 -1px ' + levelColor[level] }
            : { background: 'white', color: levelColor[level], border: '1.5px solid ' + levelColor[level] + '55' }"
          @click="toggleLevel(level)"
        >
          <span class="text-sm">{{ chilis(level) }}</span>
          {{ level }}
        </button>
      </div>
    </div>

    <!-- Per-day sections -->
    <div v-for="day in days" :key="day" class="space-y-3">
      <!-- Sticky day header -->
      <div
        class="sticky z-10 pt-2 pb-3 flex items-baseline gap-3 backdrop-blur-sm"
        style="top: 3.75rem; background:rgba(251, 245, 234, 0.95); border-bottom:1px solid #3b1f0d22;"
      >
        <h3 class="text-xl font-black leading-none" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ dayLabels[day] }}
        </h3>
      </div>

      <!-- Workshop rows -->
      <div v-if="filteredForDay(day).length > 0" class="grid gap-2">
        <div
          v-for="w in filteredForDay(day)"
          :key="w.id"
          class="group rounded-xl bg-white p-3 sm:p-4 border transition-all hover:-translate-y-0.5 flex items-start gap-3 sm:gap-4"
          :style="{
            borderColor: styleAccent(w.style) + '55',
            boxShadow: '0 1px 0 ' + styleAccent(w.style) + '18, 0 4px 14px rgba(59,31,18,0.04)',
            background: planIds.has(w.id) ? styleAccent(w.style) + '08' : 'white',
          }"
        >
          <!-- Time (fixed width, bold, accent color) -->
          <div class="w-14 sm:w-16 shrink-0 text-center pt-0.5">
            <div
              class="text-lg font-black leading-none tabular-nums"
              :style="{ color: styleAccent(w.style), fontFamily: 'Playfair Display, serif' }"
            >
              {{ w.time }}
            </div>
          </div>

          <!-- Middle: badges, title, teacher + room + going -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center flex-wrap gap-2">
              <span
                class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :style="{ background: styleAccent(w.style) + '18', color: styleAccent(w.style) }"
              >
                {{ w.style }}
              </span>
              <span
                v-if="w.level"
                class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                :style="{ background: levelColor[w.level] + '18', color: levelColor[w.level] }"
              >
                <span class="text-xs leading-none">{{ chilis(w.level) }}</span>
                {{ w.level }}
              </span>
            </div>
            <h4 class="text-sm sm:text-base font-bold leading-tight mt-1" style="color:#3b1f0d;">
              {{ w.title }}
            </h4>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <span v-if="teacherFor(w)" class="italic" :style="{ color: styleAccent(w.style) }">
                {{ teacherFor(w)!.name }}
              </span>
              <span v-if="w.room" class="inline-flex items-center gap-1">
                <MapPin class="w-3 h-3" style="color:#9a5614;" />
                {{ w.room }}
              </span>
              <span v-if="w.goingCount" class="inline-flex items-center gap-1">
                <Users class="w-3 h-3" style="color:#9a5614;" />
                {{ w.goingCount }} going
              </span>
            </div>
          </div>

          <!-- Pick button -->
          <button
            type="button"
            class="text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap"
            :style="planIds.has(w.id)
              ? { background: styleAccent(w.style), color: 'white' }
              : { background: 'white', color: styleAccent(w.style), border: '1.5px solid ' + styleAccent(w.style) + '55' }"
            @click="emit('toggleWorkshop', w.id)"
          >
            {{ planIds.has(w.id) ? '✓ Picked' : 'Pick' }}
          </button>
        </div>
      </div>

      <p
        v-else-if="partiesForDay(day).length === 0"
        class="rounded-2xl p-6 text-center border-2 border-dashed text-sm"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5); color:#5b3a1d; font-family: system-ui, sans-serif;"
      >
        No workshops match your filters for {{ day }}.
      </p>

      <!-- Parties for this day — bigger, warmer, standalone -->
      <div
        v-for="party in partiesForDay(day)"
        :key="party.id"
        class="rounded-2xl p-4 sm:p-5 border flex items-start gap-3 sm:gap-4"
        :style="{
          background: 'linear-gradient(135deg, #dc262608, #f9731608)',
          borderColor: '#dc262633',
          boxShadow: '0 1px 0 #dc262622, 0 4px 14px rgba(59,31,18,0.04)',
        }"
      >
        <div class="w-14 sm:w-16 shrink-0 text-center pt-0.5">
          <div class="text-lg font-black leading-none tabular-nums" style="color:#dc2626; font-family:'Playfair Display', serif;">
            {{ party.time }}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style="background:#dc262618; color:#dc2626;">
            <Music class="w-3 h-3" style="stroke-width:2;" />
            Party
          </div>
          <h4 class="text-base sm:text-lg font-black leading-tight mt-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
            {{ party.title }}
          </h4>
          <p v-if="party.description" class="text-xs mt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            {{ party.description }}
          </p>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            <span v-if="party.venue" class="inline-flex items-center gap-1">
              <MapPin class="w-3 h-3" style="color:#9a5614;" />
              {{ party.venue }}
            </span>
            <span v-if="party.goingCount" class="inline-flex items-center gap-1">
              <Users class="w-3 h-3" style="color:#9a5614;" />
              {{ party.goingCount }} going
            </span>
          </div>
        </div>
        <button
          type="button"
          class="text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap"
          :style="planIds.has(party.id)
            ? { background: '#dc2626', color: 'white' }
            : { background: 'white', color: '#dc2626', border: '1.5px solid #dc262655' }"
          @click="emit('toggleWorkshop', party.id)"
        >
          {{ planIds.has(party.id) ? '✓ Picked' : 'Pick' }}
        </button>
      </div>
    </div>
  </div>
</template>
