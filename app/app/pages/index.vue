<script setup lang="ts">
import type { WorkshopWithId } from '~/types/schedule'
import { getActiveFestival } from '~/data/festivals'
import { getStyleColor, getStyleDisplayName } from '~/utils/styleColors'

const festivalConfig = getActiveFestival()
const festival = festivalConfig.schedule

const {
  filters,
  days,
  availableStyles,
  workshopsByTimeSlot,
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
  trackWorkshopTapped,
  trackShareInitiated,
  trackLinkCopied,
  trackShareCompleted,
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

const { share, toastVisible, toastMessage, buildShareUrl } = useShare()

const hasActiveFilters = computed(
  () => filters.day !== null || filters.danceStyle !== null
)

// Festival display info
const festivalTitle = computed(() => {
  const city = festival.festival.city
  const year = festival.festival.startDate.slice(0, 4)
  return city
    ? `${festival.festival.name} -- ${city} ${year}`
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

// --- Workshop detail bottom sheet ---
const selectedWorkshop = ref<WorkshopWithId | null>(null)
const detailVisible = ref(false)

function handleWorkshopTap(workshop: WorkshopWithId) {
  selectedWorkshop.value = workshop
  detailVisible.value = true
}

function handleDetailClose() {
  detailVisible.value = false
}

// --- Share flow ---

async function handleHeaderShare() {
  const shareMethod = await share({
    festivalSlug: festivalConfig.slug,
    festivalName: festival.festival.name,
    city: festival.festival.city,
    currentDay: filters.day,
    currentStyle: filters.danceStyle,
  })

  trackShareInitiated(shareMethod)

  if (shareMethod === 'copy_link') {
    trackLinkCopied(buildShareUrl({
      festivalSlug: festivalConfig.slug,
      festivalName: festival.festival.name,
      city: festival.festival.city,
      currentDay: filters.day,
      currentStyle: filters.danceStyle,
    }))
  } else {
    trackShareCompleted()
  }
}

async function handleWorkshopShare(workshop: WorkshopWithId) {
  const shareMethod = await share({
    festivalSlug: festivalConfig.slug,
    festivalName: festival.festival.name,
    city: festival.festival.city,
    currentDay: workshop.day,
    currentStyle: null,
    workshopId: workshop.id,
  })

  trackShareInitiated(shareMethod, workshop.id)

  if (shareMethod === 'copy_link') {
    trackLinkCopied(
      buildShareUrl({
        festivalSlug: festivalConfig.slug,
        festivalName: festival.festival.name,
        city: festival.festival.city,
        currentDay: workshop.day,
        currentStyle: null,
        workshopId: workshop.id,
      }),
      workshop.id
    )
  } else {
    trackShareCompleted()
  }
}
</script>

<template>
  <div
    class="min-h-screen"
    style="background-color: var(--color-bg-page, #F7F7F8);"
  >
    <!-- Header (themed per festival) -->
    <header
      class="sticky top-0 flex items-center justify-between"
      style="
        z-index: 30;
        height: 56px;
        padding: 0 16px;
        border-bottom: 1px solid var(--color-border, #E2E2E4);
        background-color: var(--festival-header-bg, #FFFFFF);
        color: var(--festival-header-text, #1A1A1A);
      "
    >
      <div class="min-w-0">
        <h1
          class="truncate font-bold"
          style="font-size: 20px; line-height: 1.3;"
        >
          {{ festival.festival.name }}
        </h1>
        <p
          style="
            font-size: 12px;
            line-height: 1.3;
            color: var(--color-text-tertiary, #7A7A7A);
          "
        >
          <template v-if="festival.festival.city">{{ festival.festival.city }}</template>
          <template v-if="festival.festival.startDate">
            <template v-if="festival.festival.city">, </template>
            {{ new Date(festival.festival.startDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) }}
            &ndash;
            {{ new Date(festival.festival.endDate + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' }) }}
          </template>
        </p>
      </div>

      <!-- Share button -->
      <button
        class="ml-3 flex shrink-0 items-center gap-1.5 font-semibold"
        style="
          font-size: 14px;
          border: 1px solid var(--color-border, #E2E2E4);
          border-radius: 8px;
          padding: 8px 12px;
          background: transparent;
          color: var(--color-interactive, #E8453C);
          cursor: pointer;
          transition: background 100ms ease-out;
        "
        aria-label="Share schedule"
        @click="handleHeaderShare"
        @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-brand-primary-light, #FEF2F1)'"
        @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
    </header>

    <!-- Day tabs -->
    <nav
      class="sticky flex items-center gap-2 overflow-x-auto hide-scrollbar"
      style="
        z-index: 20;
        top: 56px;
        padding: 12px 16px;
        background: var(--color-bg, #FFFFFF);
        border-bottom: 1px solid var(--color-border, #E2E2E4);
      "
    >
      <button
        v-for="day in days"
        :key="day.date"
        :class="[
          'shrink-0 font-semibold whitespace-nowrap',
          'transition-all',
        ]"
        :style="{
          fontSize: '14px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: filters.day === day.date ? 'none' : '1px solid var(--color-border, #E2E2E4)',
          backgroundColor: filters.day === day.date ? 'var(--festival-accent, #E8453C)' : 'transparent',
          color: filters.day === day.date ? '#FFFFFF' : 'var(--color-text-secondary, #4A4A4A)',
          cursor: 'pointer',
          transitionDuration: 'var(--duration-fast, 100ms)',
        }"
        @click="handleDayChange(filters.day === day.date ? null : day.date)"
      >
        {{ day.label }}
      </button>
    </nav>

    <!-- Style chips -->
    <div
      class="sticky flex items-center gap-2 overflow-x-auto hide-scrollbar"
      style="
        z-index: 20;
        top: 108px;
        padding: 12px 16px 4px;
        background: var(--color-bg-page, #F7F7F8);
      "
    >
      <button
        :style="{
          fontSize: '13px',
          fontWeight: '600',
          padding: '4px 12px',
          borderRadius: '16px',
          whiteSpace: 'nowrap',
          border: filters.danceStyle === null ? '1px solid var(--color-interactive, #E8453C)' : '1px solid var(--color-border, #E2E2E4)',
          backgroundColor: filters.danceStyle === null ? 'var(--color-interactive, #E8453C)' : 'var(--color-bg, #FFFFFF)',
          color: filters.danceStyle === null ? '#FFFFFF' : 'var(--color-text-secondary, #4A4A4A)',
          cursor: 'pointer',
          transitionDuration: 'var(--duration-fast, 100ms)',
        }"
        @click="handleStyleChange(null)"
      >
        All
      </button>
      <button
        v-for="style in availableStyles"
        :key="style"
        class="shrink-0"
        :style="{
          fontSize: '13px',
          fontWeight: '600',
          padding: '4px 12px',
          borderRadius: '16px',
          whiteSpace: 'nowrap',
          border: filters.danceStyle === style ? 'none' : '1px solid var(--color-border, #E2E2E4)',
          backgroundColor: filters.danceStyle === style ? getStyleColor(style) : 'var(--color-bg, #FFFFFF)',
          color: filters.danceStyle === style ? '#FFFFFF' : 'var(--color-text-secondary, #4A4A4A)',
          cursor: 'pointer',
          transitionDuration: 'var(--duration-fast, 100ms)',
        }"
        @click="handleStyleChange(filters.danceStyle === style ? null : style)"
      >
        {{ getStyleDisplayName(style) }}
      </button>
    </div>

    <!-- Schedule content -->
    <main
      class="mx-auto"
      style="max-width: 768px; padding: 0 16px 16px;"
    >
      <!-- Empty state -->
      <EmptyState
        v-if="isEmpty"
        :has-filters="hasActiveFilters"
        @clear="clearFilters"
      />

      <!-- Schedule by day, grouped by time slot -->
      <div v-else>
        <section
          v-for="{ day, timeSlots } in workshopsByTimeSlot"
          :key="day.date"
        >
          <template v-if="timeSlots.length > 0">
            <!-- Time slot rows -->
            <div
              v-for="slot in timeSlots"
              :key="`${day.date}-${slot.time}`"
              style="margin-top: var(--space-5, 20px);"
            >
              <!-- TimeHeader -->
              <h3
                class="sticky font-semibold"
                style="
                  top: 156px;
                  z-index: 10;
                  font-size: 16px;
                  line-height: 1.4;
                  color: var(--color-text-primary, #1A1A1A);
                  background: var(--color-bg-page, #F7F7F8);
                  padding: 8px 0;
                "
              >
                {{ slot.time }}
              </h3>

              <!-- Horizontal card row (or full-width single card) -->
              <div
                v-if="slot.workshops.length === 1"
              >
                <WorkshopCard
                  :workshop="slot.workshops[0]"
                  :is-now="isNow(slot.workshops[0].day, slot.workshops[0].startTime, slot.workshops[0].endTime)"
                  :is-past="isPast(slot.workshops[0].day, slot.workshops[0].endTime)"
                  :style="{ width: '100%', minWidth: '100%' }"
                  @tap="handleWorkshopTap"
                />
              </div>
              <div
                v-else
                class="flex gap-3 overflow-x-auto hide-scrollbar"
                style="
                  scroll-snap-type: x proximity;
                  padding-bottom: 8px;
                  -webkit-overflow-scrolling: touch;
                "
              >
                <WorkshopCard
                  v-for="workshop in slot.workshops"
                  :key="workshop.id"
                  :workshop="workshop"
                  :is-now="isNow(workshop.day, workshop.startTime, workshop.endTime)"
                  :is-past="isPast(workshop.day, workshop.endTime)"
                  @tap="handleWorkshopTap"
                />
              </div>
            </div>
          </template>
        </section>
      </div>
    </main>

    <!-- Footer: "Powered by WeDance" (always present, WeDance coral) -->
    <footer
      class="text-center"
      style="
        padding: 24px 16px;
        background: transparent;
      "
    >
      <span
        style="
          font-size: 11px;
          color: var(--color-text-tertiary, #7A7A7A);
        "
      >Powered by </span>
      <span
        class="font-semibold"
        style="
          font-size: 11px;
          color: var(--color-brand-primary, #E8453C);
        "
      >WeDance</span>
    </footer>

    <!-- Workshop detail bottom sheet -->
    <WorkshopDetail
      :workshop="selectedWorkshop"
      :visible="detailVisible"
      @close="handleDetailClose"
      @share="handleWorkshopShare"
    />

    <!-- Share toast -->
    <ShareToast
      :visible="toastVisible"
      :message="toastMessage"
    />
  </div>
</template>

