<script setup lang="ts">
import { getActiveFestival } from '~/data/festivals'

const festivalConfig = getActiveFestival()
const festival = festivalConfig.schedule

const {
  filters,
  days,
  availableStyles,
  workshopsByDay,
  isEmpty,
  setDay,
  setDanceStyle,
  clearFilters,
} = useSchedule(festival)

const {
  setFestivalContext,
  trackScheduleOpen,
  trackFilterUsed,
  trackDaySwitched,
  trackPagePerformance,
  trackScrollDepth,
} = useAnalytics()

const { getInitialFilters, syncToUrl } = useUrlFilters()

const {
  isFestivalLive,
  defaultDay,
  isNow,
  isPast,
  startClock,
  stopClock,
  scrollToNow,
} = useNowIndicator({
  startDate: festival.festival.startDate,
  endDate: festival.festival.endDate,
  timezone: festival.festival.timezone,
})

const hasActiveFilters = computed(
  () => filters.day !== null || filters.danceStyle !== null
)

// Festival display info
const festivalTitle = computed(() => {
  const city = festival.festival.city
  const year = festival.festival.startDate.slice(0, 4)
  return city
    ? `${festival.festival.name} — ${city} ${year}`
    : festival.festival.name
})

useHead({
  title: `${festivalTitle.value} - Schedule`,
  meta: [
    {
      name: 'description',
      content: `Interactive workshop schedule for ${festivalTitle.value}`,
    },
  ],
})

// --- Apply festival theme CSS variables ---
useHead({
  style: [
    {
      innerHTML: `
        :root {
          --festival-accent: ${festivalConfig.theme.accent};
          --festival-accent-hover: ${festivalConfig.theme.accentHover};
          --festival-header-bg: ${festivalConfig.theme.headerBg};
          --festival-header-text: ${festivalConfig.theme.headerText};
        }
      `,
    },
  ],
})

// --- Initialize filters from URL (for shared links) ---
const urlFilters = getInitialFilters()
if (urlFilters.day) {
  setDay(urlFilters.day)
} else if (defaultDay.value) {
  // Apply default day based on festival state (current day if live, first day if before)
  setDay(defaultDay.value)
}
if (urlFilters.style) {
  setDanceStyle(urlFilters.style)
}

// --- Analytics instrumentation ---
setFestivalContext(festival.festival)

onMounted(() => {
  trackScheduleOpen(days.value.length, festival.workshops.length)
  trackPagePerformance()

  const cleanupScroll = trackScrollDepth()
  onUnmounted(() => cleanupScroll?.())

  // Start the "now" clock for live indicator
  startClock()
  onUnmounted(() => stopClock())

  // Auto-scroll to "happening now" workshop if festival is live
  if (isFestivalLive.value) {
    scrollToNow()
  }
})

// Sync filters to URL whenever they change
watch(
  () => ({ day: filters.day, style: filters.danceStyle }),
  (newFilters) => {
    syncToUrl(newFilters.day, newFilters.style)
  },
  { deep: true }
)

// --- Event handlers ---

function handleDayChange(date: string | null) {
  const previousDay = filters.day
  setDay(date)
  if (date !== previousDay) {
    if (date) {
      trackFilterUsed('day', date)
    }
    trackDaySwitched(previousDay, date)
  }
}

function handleStyleChange(style: typeof filters.danceStyle) {
  setDanceStyle(style)
  if (style) {
    trackFilterUsed('style', style)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header (themed per festival) -->
    <header
      class="shadow-sm"
      :style="{
        backgroundColor: 'var(--festival-header-bg, #FFFFFF)',
        color: 'var(--festival-header-text, #1A1A1A)',
      }"
    >
      <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold sm:text-3xl">
              {{ festival.festival.name }}
            </h1>
            <p class="mt-1 text-sm opacity-70">
              {{ festival.festival.venue }}<template v-if="festival.festival.city">, {{ festival.festival.city }}</template>
              <template v-if="festival.festival.startDate">
                &middot;
                {{ new Date(festival.festival.startDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) }}
                &ndash;
                {{ new Date(festival.festival.endDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) }}
              </template>
            </p>
          </div>
          <ShareButton
            :festival-slug="festivalConfig.slug"
            :festival-name="festival.festival.name"
            :city="festival.festival.city"
            :current-day="filters.day"
            :current-style="filters.danceStyle"
          />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <!-- Filters -->
      <section class="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <ScheduleFilters
          :days="days"
          :styles="availableStyles"
          :active-day="filters.day"
          :active-style="filters.danceStyle"
          @update:day="handleDayChange"
          @update:style="handleStyleChange"
        />
      </section>

      <!-- Active filter indicator -->
      <div
        v-if="hasActiveFilters"
        class="mb-4 flex items-center justify-between"
      >
        <p class="text-sm text-gray-500">
          Showing filtered results
        </p>
        <button
          class="text-sm font-medium text-gray-700 underline hover:text-gray-900"
          @click="clearFilters"
        >
          Clear all filters
        </button>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-if="isEmpty"
        :has-filters="hasActiveFilters"
        @clear="clearFilters"
      />

      <!-- Schedule by day -->
      <div v-else class="space-y-8">
        <section
          v-for="{ day, workshops } in workshopsByDay"
          :key="day.date"
        >
          <template v-if="workshops.length > 0">
            <h2
              class="mb-4 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900"
            >
              {{ day.label }}
              <span class="ml-2 text-sm font-normal text-gray-400">
                {{ new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }) }}
              </span>
            </h2>
            <div class="grid gap-3 sm:grid-cols-2">
              <WorkshopCard
                v-for="workshop in workshops"
                :key="workshop.id"
                :workshop="workshop"
                :is-now="isNow(workshop.day, workshop.startTime, workshop.endTime)"
                :is-past="isPast(workshop.day, workshop.endTime)"
              />
            </div>
          </template>
        </section>
      </div>
    </main>

    <!-- Footer: "Powered by WeDance" (always present, WeDance coral) -->
    <footer class="mt-12 border-t border-gray-200 bg-white py-6 text-center">
      <span class="text-sm" style="color: #E8453C;">Powered by WeDance</span>
    </footer>
  </div>
</template>
