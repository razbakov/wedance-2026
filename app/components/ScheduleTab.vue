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
import { WD } from '~/lib/brand'

const props = defineProps<{
  workshops: Workshop[]
  teachers: Teacher[]
  days: string[]
  styles: string[]
  planIds: Set<string>
  selectedTeacherId: string | null
  startDate: string
  festivalSlug?: string
}>()

const emit = defineEmits<{
  toggleWorkshop: [id: string]
}>()

// Each schedule item opens its own event page. Compound id (festival~workshop)
// keeps it globally unique since workshop ids repeat across festivals.
const NuxtLinkC = resolveComponent('NuxtLink')
const eventHref = (wid: string) => (props.festivalSlug ? `/events/f~${props.festivalSlug}~${wid}` : undefined)

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
    salsa:       WD.red600,
    bachata:     WD.purple500,
    kizomba:     WD.pink500,
    timba:       WD.amber500,
    son:         WD.green600,
    rumba:       WD.cyan600,
    'urban kiz': WD.violet600,
    semba:       WD.amber500,
    'hip hop':   WD.sky500,
  }
  return map[style.toLowerCase()] || WD.amber600
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
  Beginner:     WD.green600,
  Intermediate: WD.amber500,
  Advanced:     WD.red600,
}
</script>

<template>
  <div class="space-y-6">
    <!-- Filters — V3 warm palette -->
    <div class="rounded-2xl bg-white border p-4 sm:p-5" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);">
      <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style="color:var(--wd-amber-600);">Filter</div>
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
        style="top: 3.75rem; background:rgba(251, 245, 234, 0.95); border-bottom:1px solid color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
      >
        <h3 class="text-xl font-black leading-none" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">
          {{ dayLabels[day] }}
        </h3>
      </div>

      <!-- Workshop rows -->
      <div v-if="filteredForDay(day).length > 0" class="grid gap-2">
        <component
          :is="NuxtLinkC"
          v-for="w in filteredForDay(day)"
          :key="w.id"
          :to="eventHref(w.id)"
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
              :style="{ color: styleAccent(w.style), fontFamily: 'var(--wd-font-display)' }"
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
            <h4 class="text-sm sm:text-base font-bold leading-tight mt-1" style="color:var(--wd-brown-900);">
              {{ w.title }}
            </h4>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
              <span v-if="teacherFor(w)" class="italic" :style="{ color: styleAccent(w.style) }">
                {{ teacherFor(w)!.name }}
              </span>
              <span v-if="w.room" class="inline-flex items-center gap-1">
                <MapPin class="w-3 h-3" style="color:var(--wd-amber-600);" />
                {{ w.room }}
              </span>
              <span v-if="w.goingCount" class="inline-flex items-center gap-1">
                <Users class="w-3 h-3" style="color:var(--wd-amber-600);" />
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
            @click.stop.prevent="emit('toggleWorkshop', w.id)"
          >
            {{ planIds.has(w.id) ? '✓ Going!' : 'Going?' }}
          </button>
        </component>
      </div>

      <p
        v-else-if="partiesForDay(day).length === 0"
        class="rounded-2xl p-6 text-center border-2 border-dashed text-sm"
        style="border-color:color-mix(in srgb, var(--wd-brown-900) 20%, transparent); background:rgba(255,255,255,0.5); color:var(--wd-brown-700); font-family:var(--wd-font-sans);"
      >
        No workshops match your filters for {{ day }}.
      </p>

      <!-- Parties for this day — bigger, warmer, standalone -->
      <div
        v-for="party in partiesForDay(day)"
        :key="party.id"
        class="rounded-2xl p-4 sm:p-5 border flex items-start gap-3 sm:gap-4"
        :style="{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--wd-red-600) 3.1%, transparent), color-mix(in srgb, var(--wd-orange-500) 3.1%, transparent))',
          borderColor: 'color-mix(in srgb, var(--wd-red-600) 20%, transparent)',
          boxShadow: '0 1px 0 color-mix(in srgb, var(--wd-red-600) 13.3%, transparent), 0 4px 14px rgba(59,31,18,0.04)',
        }"
      >
        <div class="w-14 sm:w-16 shrink-0 text-center pt-0.5">
          <div class="text-lg font-black leading-none tabular-nums" style="color:var(--wd-red-600); font-family:var(--wd-font-display);">
            {{ party.time }}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style="background:color-mix(in srgb, var(--wd-red-600) 9.4%, transparent); color:var(--wd-red-600);">
            <Music class="w-3 h-3" style="stroke-width:2;" />
            Party
          </div>
          <h4 class="text-base sm:text-lg font-black leading-tight mt-1" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">
            {{ party.title }}
          </h4>
          <p v-if="party.description" class="text-xs mt-1" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
            {{ party.description }}
          </p>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
            <span v-if="party.venue" class="inline-flex items-center gap-1">
              <MapPin class="w-3 h-3" style="color:var(--wd-amber-600);" />
              {{ party.venue }}
            </span>
            <span v-if="party.goingCount" class="inline-flex items-center gap-1">
              <Users class="w-3 h-3" style="color:var(--wd-amber-600);" />
              {{ party.goingCount }} going
            </span>
          </div>
        </div>
        <button
          type="button"
          class="text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0 whitespace-nowrap"
          :style="planIds.has(party.id)
            ? { background: 'var(--wd-red-600)', color: 'white' }
            : { background: 'white', color: 'var(--wd-red-600)', border: '1.5px solid color-mix(in srgb, var(--wd-red-600) 33.3%, transparent)' }"
          @click="emit('toggleWorkshop', party.id)"
        >
          {{ planIds.has(party.id) ? '✓ Going!' : 'Going?' }}
        </button>
      </div>
    </div>
  </div>
</template>
