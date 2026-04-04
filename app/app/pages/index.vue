<script setup lang="ts">
import { getActiveFestival } from '~/data/festivals'
import { getStyleDisplayName } from '~/utils/styleColors'

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

// --- Loading & error state simulation (QA-010, QA-011) ---
// Data is synchronous (mock) right now, but architecture for async loading is in place.
const isLoading = ref(false)
const hasError = ref(false)

function handleRetry() {
  hasError.value = false
  isLoading.value = true
  // In a real async scenario, re-fetch data here
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

// --- Festival display info ---
const festivalSubtitle = computed(() => {
  const parts: string[] = []
  if (festival.festival.city) {
    parts.push(festival.festival.city)
  }
  if (festival.festival.startDate) {
    const startStr = new Date(festival.festival.startDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const endStr = new Date(festival.festival.endDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })
    parts.push(`${startStr} - ${endStr}`)
  }
  return parts.join(', ')
})

// --- OG meta tags (QA-017) ---
const ogTitle = computed(() => {
  const dayPart = filters.day
    ? ` - ${new Date(filters.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })}`
    : ''
  return `${festival.festival.name}${dayPart} Schedule`
})

const ogDescription = computed(() => {
  const count = festival.workshops.length
  const styleNames = availableStyles.value.map(s => getStyleDisplayName(s)).slice(0, 3).join(', ')
  return `${count} workshops: ${styleNames}`
})

useHead({
  title: ogTitle.value,
  meta: [
    { name: 'description', content: `Interactive workshop schedule for ${festival.festival.name}` },
    { property: 'og:title', content: ogTitle.value },
    { property: 'og:description', content: ogDescription.value },
    { property: 'og:url', content: typeof window !== 'undefined' ? window.location.href : '' },
    { property: 'og:image', content: festivalConfig.theme.bannerUrl || '' },
    { property: 'og:type', content: 'website' },
  ],
})

// --- Apply festival theme CSS variables (QA-020) ---
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
  setDay(defaultDay.value)
}
if (urlFilters.style) {
  setDanceStyle(urlFilters.style)
}

// --- Active style display name for EmptyState (QA-012) ---
const activeStyleName = computed(() =>
  filters.danceStyle ? getStyleDisplayName(filters.danceStyle) : undefined
)

const activeDayLabel = computed(() => {
  if (!filters.day) return undefined
  const day = days.value.find(d => d.date === filters.day)
  return day?.label
})

// --- Analytics instrumentation ---
setFestivalContext(festival.festival)

onMounted(() => {
  trackScheduleOpen(days.value.length, festival.workshops.length)
  trackPagePerformance()

  const cleanupScroll = trackScrollDepth()
  onUnmounted(() => cleanupScroll?.())

  startClock()
  onUnmounted(() => stopClock())

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
  <div class="min-h-screen" style="background-color: var(--color-bg-page, #F7F7F8);">
    <!-- TopBar: 56px sticky header (QA-007) -->
    <header
      class="sticky top-0 z-30 flex items-center justify-between"
      style="
        height: 56px;
        padding: 0 16px;
        background-color: var(--festival-header-bg, #FFFFFF);
        border-bottom: 1px solid var(--color-border, #E2E2E4);
        color: var(--festival-header-text, #1A1A1A);
      "
    >
      <div class="min-w-0 flex-1">
        <h1
          class="truncate font-bold"
          style="font-size: 20px; line-height: 1.3;"
        >
          {{ festival.festival.name }}
        </h1>
        <p
          v-if="festivalSubtitle"
          class="truncate"
          style="font-size: 12px; line-height: 1.3; color: var(--color-text-tertiary, #7A7A7A);"
        >
          {{ festivalSubtitle }}
        </p>
      </div>
      <ShareButton
        :festival-slug="festivalConfig.slug"
        :festival-name="festival.festival.name"
        :city="festival.festival.city"
        :current-day="filters.day"
        :current-style="filters.danceStyle"
      />
    </header>

    <!-- Filters: DayTabs + StyleChips (QA-008, QA-009) -->
    <ScheduleFilters
      :days="days"
      :styles="availableStyles"
      :active-day="filters.day"
      :active-style="filters.danceStyle"
      @update:day="handleDayChange"
      @update:style="handleStyleChange"
    />

    <main class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <!-- Loading state with skeleton cards (QA-010) -->
      <div v-if="isLoading" class="space-y-6">
        <div v-for="row in 2" :key="row" class="flex gap-3 overflow-hidden">
          <SkeletonCard v-for="card in 3" :key="card" />
        </div>
      </div>

      <!-- Error state (QA-011) -->
      <ErrorState v-else-if="hasError" @retry="handleRetry" />

      <!-- Empty state (QA-012) -->
      <EmptyState
        v-else-if="isEmpty"
        :has-filters="hasActiveFilters"
        :active-style-name="activeStyleName"
        :active-day-label="activeDayLabel"
        @clear="clearFilters"
      />

      <!-- Schedule by day (QA-018: grouped by time slot within each day) -->
      <div v-else class="space-y-8">
        <section
          v-for="{ day, workshops } in workshopsByDay"
          :key="day.date"
        >
          <template v-if="workshops.length > 0">
            <h2
              class="mb-4 border-b pb-2 text-lg font-semibold"
              style="color: var(--color-text-primary, #1A1A1A); border-color: var(--color-border, #E2E2E4);"
            >
              {{ day.label }}
              <span
                class="ml-2 text-sm font-normal"
                style="color: var(--color-text-tertiary, #7A7A7A);"
              >
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

    <!-- Footer: "Powered by WeDance" (QA-013) -->
    <footer
      class="text-center"
      style="padding: 24px 16px; background: transparent;"
    >
      <span style="font-size: 11px; line-height: 1.3; color: var(--color-text-tertiary, #7A7A7A);">
        Powered by
      </span>
      <span
        class="font-semibold"
        style="font-size: 11px; line-height: 1.3; color: var(--color-brand-primary, #E8453C);"
      >
        WeDance
      </span>
    </footer>
  </div>
</template>
