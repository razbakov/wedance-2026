<script setup lang="ts">
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import {
  JUMP_WEEKS,
  addDays,
  formatJumpDate,
  formatJumpDateShort,
  formatJumpWindow,
  formatMonthShort,
  jumpDays,
  jumpPageStarts,
  localDateKey,
  type JumpDay,
} from '~/lib/cityWeek'

/**
 * "Pick a date" on the city page (RAZ-1021).
 *
 * Chosen over a date strip and a month grid. A strip hides a night three weeks
 * away behind a horizontal scroll. A month grid hides the start of next month
 * behind another tap — and three weeks ahead is often that next month. This
 * opens a 5-week grid that starts on this week's Monday, so that night is on
 * the first screen: tap "Pick a date", tap the day. Dots follow whatever the
 * page already filtered (parties / classes, style).
 *
 *   <CityDateJump v-model="selectedDate" :counts="dateCounts" />
 */
const props = defineProps<{
  modelValue: string
  /** Events per YYYY-MM-DD, already narrowed by the page's filters. */
  counts?: Record<string, number>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const open = ref(false)
const today = ref(localDateKey(new Date()))
const pageIndex = ref(0)
const focusDate = ref(today.value)
const rootEl = ref<HTMLElement | null>(null)

function focusTrigger() {
  nextTick(() => rootEl.value?.querySelector<HTMLElement>('[data-testid="city-date-jump"]')?.focus({ preventScroll: true }))
}

const counts = computed(() => props.counts ?? {})
const pages = computed(() => jumpPageStarts(today.value, Object.keys(counts.value)))
const startMonday = computed(() => pages.value[Math.min(pageIndex.value, pages.value.length - 1)] ?? pages.value[0]!)
const days = computed(() => jumpDays(startMonday.value, counts.value, today.value))
const weeks = computed(() => {
  const rows: JumpDay[][] = []
  for (let i = 0; i < days.value.length; i += 7) rows.push(days.value.slice(i, i + 7))
  return rows
})
const windowLabel = computed(() => formatJumpWindow(startMonday.value))
const chipLabel = computed(() => (props.modelValue ? formatJumpDateShort(props.modelValue) : 'Pick a date'))

function pageContaining(date: string) {
  const idx = pages.value.findIndex((start) => {
    const end = addDays(start, JUMP_WEEKS * 7 - 1)
    return date >= start && date <= end
  })
  return idx < 0 ? 0 : idx
}

function focusDay(date: string) {
  nextTick(() => {
    rootEl.value?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus({ preventScroll: true })
  })
}

function toggle() {
  open.value = !open.value
  if (!open.value) return
  today.value = localDateKey(new Date())
  const land = props.modelValue && props.modelValue >= today.value ? props.modelValue : today.value
  pageIndex.value = pageContaining(land)
  focusDate.value = land
  focusDay(land)
}

function shiftPage(delta: number) {
  const next = pageIndex.value + delta
  if (next < 0 || next >= pages.value.length) return
  pageIndex.value = next
  const landing = days.value.find(d => !d.isPast)?.date ?? days.value[0]!.date
  focusDate.value = landing
  focusDay(landing)
}

function pick(date: string) {
  emit('update:modelValue', date)
  open.value = false
  focusTrigger()
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function dayName(cell: JumpDay) {
  const when = formatJumpDate(cell.date)
  if (cell.isPast) return `${when}, past`
  if (cell.count === 0) return `${when}, nothing listed`
  return `${when}, ${cell.count} ${cell.count === 1 ? 'event' : 'events'}`
}

function moveFocus(delta: number) {
  const next = addDays(focusDate.value, delta)
  if (next < today.value) return
  const lastPage = pages.value[pages.value.length - 1]!
  if (next > addDays(lastPage, JUMP_WEEKS * 7 - 1)) return
  const page = pageContaining(next)
  pageIndex.value = page
  focusDate.value = next
  focusDay(next)
}

function onGridKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    open.value = false
    focusTrigger()
    return
  }
  const target = e.target
  if (!(target instanceof HTMLElement) || !target.dataset.date) return
  const delta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  if (!(e.key in delta)) return
  e.preventDefault()
  moveFocus(delta[e.key]!)
}

function onPointerDown(e: PointerEvent) {
  if (!open.value) return
  const t = e.target
  if (t instanceof Node && rootEl.value?.contains(t)) return
  open.value = false
}

onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="rootEl" class="relative inline-flex items-center gap-1.5" :class="open ? 'z-30' : ''">
    <ToggleChip
      variant="ink"
      :pressed="!!modelValue"
      class="px-3.5 py-1.5 text-sm font-sans"
      data-testid="city-date-jump"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="city-date-grid"
      :aria-label="modelValue ? `Change date, ${formatJumpDate(modelValue)}` : undefined"
      @click="toggle"
    >
      <Calendar class="size-3.5" aria-hidden="true" />
      {{ chipLabel }}
    </ToggleChip>
    <Button
      v-if="modelValue"
      type="button"
      variant="outline"
      size="icon-sm"
      class="rounded-full"
      data-testid="city-date-clear"
      aria-label="Show every date"
      @click="clear"
    >
      <X aria-hidden="true" />
    </Button>

    <div
      v-if="open"
      id="city-date-grid"
      role="dialog"
      aria-label="Pick a date"
      data-testid="city-date-grid"
      class="absolute left-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-lg"
      @keydown="onGridKeydown"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rounded-full"
          aria-label="Previous weeks"
          :disabled="pageIndex === 0"
          @click="shiftPage(-1)"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p class="min-w-0 flex-1 text-center text-xs font-black text-foreground font-display sm:text-sm" aria-live="polite">{{ windowLabel }}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="rounded-full"
          aria-label="Later weeks"
          :disabled="pageIndex >= pages.length - 1"
          @click="shiftPage(1)"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <div role="grid" :aria-label="windowLabel">
        <div role="row" class="grid grid-cols-7">
          <div
            v-for="w in WEEKDAYS"
            :key="w"
            role="columnheader"
            class="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-sans"
          >
            {{ w }}
          </div>
        </div>
        <div v-for="(week, wi) in weeks" :key="wi" role="row" class="grid grid-cols-7">
          <div v-for="cell in week" :key="cell.date" role="gridcell" class="p-0.5">
            <button
              type="button"
              :data-date="cell.date"
              data-testid="city-date-day"
              class="flex h-12 w-full flex-col items-center justify-center rounded-lg text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30"
              :class="[
                cell.date === modelValue ? 'bg-foreground text-white' : 'hover:bg-muted',
                cell.isToday && cell.date !== modelValue ? 'ring-2 ring-foreground/40' : '',
              ]"
              :aria-label="dayName(cell)"
              :aria-pressed="cell.date === modelValue"
              :aria-current="cell.isToday ? 'date' : undefined"
              :tabindex="cell.date === focusDate ? 0 : -1"
              :disabled="cell.isPast"
              @click="pick(cell.date)"
            >
              <span
                class="h-3 text-[9px] font-bold uppercase leading-none tracking-wide font-sans"
                :class="cell.showMonth ? '' : 'invisible'"
                aria-hidden="true"
              >{{ formatMonthShort(cell.date) }}</span>
              <span class="text-sm font-black tabular-nums leading-none font-display">{{ Number(cell.date.slice(8, 10)) }}</span>
              <span
                class="mt-0.5 size-1 rounded-full"
                :class="cell.count ? 'bg-current' : 'invisible'"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
      <p class="mt-2 text-center text-[11px] text-muted-foreground font-sans">A dot marks a day with something on.</p>
    </div>
  </div>
</template>
