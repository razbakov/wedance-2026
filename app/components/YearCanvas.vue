<script setup lang="ts">
/**
 * YearCanvas — the right rail on /festivals.
 *
 * Replaces the 9-step life-coach checklist (YearDrawer) with a visual
 * 12-month strip. Each month with a picked festival shows a colored pin
 * with name + dates. Empty months get a soft nudge if there's an unpicked
 * festival close by — so the gap itself becomes a discovery surface.
 *
 * Drop-in replacement: same props/events as YearDrawer.
 * Mental model: the sidebar shows TIME, not TASKS. A year you can see,
 * not a list of generic chores.
 */
import { X, Calendar as CalendarIcon, ArrowRight, Sparkles } from 'lucide-vue-next'

type Festival = {
  slug: string
  name: string
  startDate: string
  endDate: string
  location?: string
  accentColor?: string
  logo?: string
}

const props = defineProps<{
  festivals: Festival[]
  yearPlanIds: ReadonlySet<string> | Set<string>
}>()

const emit = defineEmits<{
  (e: 'remove', slug: string): void
  (e: 'close'): void
  (e: 'save-my-year'): void
}>()

const router = useRouter()

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const picked = computed(() =>
  props.festivals.filter(f => props.yearPlanIds.has(f.slug)),
)

const unpicked = computed(() =>
  props.festivals.filter(f => !props.yearPlanIds.has(f.slug)),
)

// Map: monthIndex (0–11) → array of picked festivals in that month (sorted by day)
const picksByMonth = computed(() => {
  const map: Record<number, Festival[]> = {}
  for (let i = 0; i < 12; i++) map[i] = []
  for (const f of picked.value) {
    const m = new Date(f.startDate).getMonth()
    map[m].push(f)
  }
  for (let i = 0; i < 12; i++) {
    map[i].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }
  return map
})

// For empty months, surface the nearest unpicked festival in that month (or null)
const nudgeByMonth = computed(() => {
  const map: Record<number, Festival | null> = {}
  const usedSlugs = new Set<string>() // never suggest the same festival twice across months
  for (let i = 0; i < 12; i++) {
    if (picksByMonth.value[i].length > 0) { map[i] = null; continue }
    const candidates = unpicked.value.filter(
      f => new Date(f.startDate).getMonth() === i && !usedSlugs.has(f.slug),
    )
    if (candidates.length > 0) {
      const pick = candidates[0]
      map[i] = pick
      usedSlugs.add(pick.slug)
    } else {
      map[i] = null
    }
  }
  return map
})

const totalPicks = computed(() => picked.value.length)
const monthsWithPicks = computed(() =>
  Object.values(picksByMonth.value).filter(arr => arr.length > 0).length,
)

function formatDay(dateStr: string) {
  return new Date(dateStr).getDate()
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function onSaveMyYear() {
  emit('save-my-year')
  router.push('/sketches/year')
}

function scrollFestivalIntoView(slug: string) {
  // Card on the catalog side has key={f.slug}; let parent handle via event later. For now no-op.
  const el = document.querySelector(`[data-festival-slug="${slug}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <div class="flex flex-col h-full bg-background">
    <!-- Sticky header -->
    <header class="px-4 pt-4 pb-3 border-b flex items-start justify-between gap-2 shrink-0">
      <div class="min-w-0">
        <div class="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          <CalendarIcon class="w-3.5 h-3.5" />
          Your 2026
        </div>
        <div class="mt-1 text-sm">
          <template v-if="totalPicks === 0">
            <span class="text-muted-foreground">Pick festivals — they pin to the months below.</span>
          </template>
          <template v-else>
            <span class="font-semibold text-foreground">{{ totalPicks }}</span>
            <span class="text-muted-foreground">
              festival<template v-if="totalPicks !== 1">s</template> across
            </span>
            <span class="font-semibold text-foreground">{{ monthsWithPicks }}</span>
            <span class="text-muted-foreground">
              month<template v-if="monthsWithPicks !== 1">s</template>
            </span>
          </template>
        </div>
      </div>
      <button
        class="lg:hidden p-1.5 -mr-1.5 rounded-md hover:bg-muted text-muted-foreground"
        aria-label="Close"
        @click="emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </header>

    <!-- 12-month strip — scrollable middle -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <ol class="flex flex-col">
        <li
          v-for="(label, i) in MONTHS"
          :key="label"
          class="grid grid-cols-[2.25rem_1fr] gap-3 py-1.5 border-b border-dashed border-muted/50 last:border-0"
        >
          <!-- Month label -->
          <div
            class="text-[11px] uppercase tracking-wider font-semibold pt-1.5"
            :class="picksByMonth[i].length > 0 ? 'text-foreground' : 'text-muted-foreground/60'"
          >
            {{ label }}
          </div>

          <!-- Pins or nudge -->
          <div class="min-h-[2rem] flex flex-col gap-1.5">
            <!-- Picked festivals: colored pins -->
            <div
              v-for="f in picksByMonth[i]"
              :key="f.slug"
              class="group flex items-stretch gap-2 rounded-md overflow-hidden hover:bg-muted/40 transition-colors"
            >
              <div
                class="w-1 shrink-0 rounded-sm"
                :style="{ background: f.accentColor || 'currentColor' }"
              />
              <div class="flex-1 min-w-0 py-1">
                <div class="text-xs font-semibold truncate">{{ f.name }}</div>
                <div class="text-[10px] text-muted-foreground truncate">
                  {{ formatDateRange(f.startDate, f.endDate) }}<template v-if="f.location"> · {{ f.location.split(',')[0] }}</template>
                </div>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 transition-opacity self-center text-muted-foreground hover:text-foreground p-1"
                :aria-label="`Remove ${f.name}`"
                @click="emit('remove', f.slug)"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Empty-month nudge: a suggested unpicked festival -->
            <button
              v-if="picksByMonth[i].length === 0 && nudgeByMonth[i]"
              class="text-left text-[11px] text-muted-foreground hover:text-foreground py-1 inline-flex items-center gap-1 group"
              @click="scrollFestivalIntoView(nudgeByMonth[i]!.slug)"
            >
              <Sparkles class="w-3 h-3 shrink-0 text-muted-foreground/60" />
              <span class="truncate italic">{{ nudgeByMonth[i]!.name }}</span>
              <ArrowRight class="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <!-- Empty month with no festivals on offer: a thin dash -->
            <div
              v-else-if="picksByMonth[i].length === 0"
              class="text-[11px] text-muted-foreground/40 italic py-1"
            >
              —
            </div>
          </div>
        </li>
      </ol>
    </div>

    <!-- Sticky footer -->
    <footer class="border-t px-4 py-3 shrink-0 bg-background">
      <button
        class="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground text-background text-sm font-semibold px-4 py-2 hover:bg-foreground/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="totalPicks === 0"
        @click="onSaveMyYear"
      >
        <template v-if="totalPicks === 0">
          Pick a festival to start
        </template>
        <template v-else>
          Save my year
          <ArrowRight class="w-4 h-4" />
        </template>
      </button>
      <p v-if="totalPicks > 0" class="text-[10px] text-muted-foreground mt-2 text-center">
        Saves as a postcard you can share.
      </p>
    </footer>
  </div>
</template>
