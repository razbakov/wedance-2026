<script setup lang="ts">
import { mockFestival } from '~/data/mock-festival'

const festival = mockFestival
const {
  filters,
  availableStyles,
  workshopsByDay,
  isEmpty,
  setDay,
  setDanceStyle,
  clearFilters,
} = useSchedule(festival)

const hasActiveFilters = computed(
  () => filters.day !== null || filters.danceStyle !== null
)

useHead({
  title: `${festival.name} - Schedule`,
  meta: [
    {
      name: 'description',
      content: `Interactive workshop schedule for ${festival.name} in ${festival.location}`,
    },
  ],
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
          {{ festival.name }}
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          {{ festival.location }}
        </p>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <!-- Filters -->
      <section class="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <ScheduleFilters
          :days="festival.days"
          :styles="availableStyles"
          :active-day="filters.day"
          :active-style="filters.danceStyle"
          @update:day="setDay"
          @update:style="setDanceStyle"
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
              />
            </div>
          </template>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="mt-12 border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-400">
      Powered by WeDance
    </footer>
  </div>
</template>
