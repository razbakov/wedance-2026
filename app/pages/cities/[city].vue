<script setup lang="ts">
import {
  MapPin,
  Users,
  Calendar,
  Heart,
} from 'lucide-vue-next'
import type { City } from '~/types/city'
import type { Teacher } from '~/types/festival'
import { getStyleColors } from '~/lib/style-colors'
import * as munichData from '~/data/mock-city-munich'
import * as berlinData from '~/data/mock-city-berlin'
import * as salsaOpen from '~/data/mock-festival'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'

const route = useRoute()
const slug = route.params.city as string

// Week plan state
const { weekPlanIds, weekDrawerOpen, toggleEvent, removeEvent, closeDrawer } = useWeekPlan()

const cityDataMap = {
  munich: munichData,
  berlin: berlinData,
} as Record<string, typeof munichData>

const data = cityDataMap[slug]

if (!data) {
  throw createError({ statusCode: 404, message: 'City not found' })
}

const city = data.city
const events = data.events
const teachers = data.teachers
const djs = data.djs
const organisers = data.organisers

useHead({
  title: `${city.name} — WeDance`,
  meta: [
    { name: 'description', content: `Dance classes, socials, and practicas in ${city.name}. ${city.eventCount} weekly events.` },
  ],
})

// Style filter
const selectedStyle = ref('')

// People tabs
type PeopleTab = 'teachers' | 'djs' | 'organisers'
const activeTab = ref<PeopleTab>('teachers')

const peopleTabs: { key: PeopleTab; label: string }[] = [
  { key: 'teachers', label: 'Teachers' },
  { key: 'djs', label: 'DJs' },
  { key: 'organisers', label: 'Organisers' },
]

// All people combined (teachers + djs + organisers) for lookup
const allPeople = computed(() => [...teachers, ...djs, ...organisers])

// Selected person across all tabs
const selectedPersonId = ref<string | null>(null)

const selectedPerson = computed(() =>
  allPeople.value.find(p => p.id === selectedPersonId.value),
)

// Active filter label for schedule header
const filterLabel = computed(() => {
  if (!selectedPerson.value) return null
  const tab = activeTab.value
  const role = tab === 'teachers' ? 'teacher' : tab === 'djs' ? 'DJ' : 'organiser'
  return { name: selectedPerson.value.name, role }
})

function onSelectPerson(id: string | null) {
  selectedPersonId.value = id
}

function clearPersonFilter() {
  selectedPersonId.value = null
}

function switchTab(tab: PeopleTab) {
  activeTab.value = tab
  selectedPersonId.value = null
}

// Current tab's lineup data
const currentLineup = computed(() => {
  if (activeTab.value === 'teachers') return teachers
  if (activeTab.value === 'djs') return djs
  return organisers
})

// Filtered events
const filteredEvents = computed(() => {
  let result = events
  if (selectedStyle.value) {
    result = result.filter(e => e.style === selectedStyle.value)
  }
  if (selectedPersonId.value) {
    const id = selectedPersonId.value
    if (activeTab.value === 'teachers') {
      result = result.filter(e => e.teacherId === id)
    } else if (activeTab.value === 'djs') {
      result = result.filter(e => e.djId === id)
    } else {
      result = result.filter(e => e.organizerId === id)
    }
  }
  return result
})

// Upcoming festivals in this city
const cityFestivals = computed(() => {
  const cityMatch = city.name.toLowerCase()
  const allFestivals = [
    {
      slug: salsaOpen.mockFestival.slug,
      name: salsaOpen.mockFestival.name,
      startDate: salsaOpen.mockFestival.startDate,
      endDate: salsaOpen.mockFestival.endDate,
      location: 'Berlin, Germany',
      logo: salsaOpen.mockFestival.logo,
      accentColor: salsaOpen.mockFestival.accentColor,
      styles: ['Salsa', 'Bachata'],
      attendeeCount: salsaOpen.mockFestival.attendeeCount,
      friendsGoing: 2,
      workshopCount: salsaOpen.mockWorkshops.length,
    },
    {
      slug: cubanFire.mockFestival.slug,
      name: cubanFire.mockFestival.name,
      startDate: cubanFire.mockFestival.startDate,
      endDate: cubanFire.mockFestival.endDate,
      location: 'Munich, Germany',
      logo: '',
      accentColor: cubanFire.mockFestival.accentColor,
      styles: ['Timba', 'Salsa', 'Son', 'Rumba'],
      attendeeCount: cubanFire.mockFestival.attendeeCount,
      friendsGoing: 1,
      workshopCount: cubanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    },
    {
      slug: caribbeanUrbanFire.mockFestival.slug,
      name: caribbeanUrbanFire.mockFestival.name,
      startDate: caribbeanUrbanFire.mockFestival.startDate,
      endDate: caribbeanUrbanFire.mockFestival.endDate,
      location: 'Munich, Germany',
      logo: '',
      accentColor: caribbeanUrbanFire.mockFestival.accentColor,
      styles: ['Salsa', 'Bachata', 'Hip Hop'],
      attendeeCount: caribbeanUrbanFire.mockFestival.attendeeCount,
      friendsGoing: 0,
      workshopCount: caribbeanUrbanFire.mockWorkshops.filter(w => w.type !== 'party').length,
    },
  ]
  return allFestivals.filter(f => f.location.toLowerCase().includes(cityMatch))
})

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

</script>

<template>
  <div class="lg:mr-80">
    <!-- City hero -->
    <section class="relative border-b">
      <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div class="relative max-w-3xl mx-auto px-4 pt-6 pb-5">
        <h1 class="text-2xl font-bold tracking-tight">{{ city.name }}</h1>
        <p class="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
          <MapPin class="w-3.5 h-3.5" />
          {{ city.country }}
        </p>

        <!-- Style filters -->
        <div class="flex flex-wrap items-center gap-2 mt-4">
          <button
            class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            :class="!selectedStyle ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-input hover:border-foreground/30'"
            @click="selectedStyle = ''"
          >
            All
          </button>
          <button
            v-for="style in city.styles"
            :key="style"
            class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            :class="selectedStyle === style ? getStyleColors(style).pillActive : getStyleColors(style).pill"
            @click="selectedStyle = selectedStyle === style ? '' : style"
          >
            {{ style }}
          </button>
        </div>
      </div>
    </section>

    <!-- People tabs: Teachers / DJs / Organisers -->
    <section class="border-b">
      <div class="max-w-3xl mx-auto px-4">
        <!-- Tab headers -->
        <div class="flex border-b -mb-px">
          <button
            v-for="tab in peopleTabs"
            :key="tab.key"
            class="flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab content: Lineup + Profile -->
        <div class="py-4">
          <Lineup
            :teachers="currentLineup"
            :selected-id="selectedPersonId"
            @select="onSelectPerson"
          />
          <TeacherProfile
            v-if="selectedPerson"
            :teacher="selectedPerson"
            class="mt-4"
            @close="clearPersonFilter"
          />
        </div>
      </div>
    </section>

    <!-- Weekly calendar -->
    <section class="max-w-6xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Weekly schedule</h2>
        <div v-if="filterLabel" class="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Filtering by {{ filterLabel.role }} <strong class="text-foreground">{{ filterLabel.name }}</strong></span>
          <button class="text-primary hover:text-primary/80 font-medium" @click="clearPersonFilter">Clear</button>
        </div>
      </div>
      <WeeklyCalendar
        :events="filteredEvents"
        :week-plan-ids="weekPlanIds"
        :teachers="[...teachers, ...djs, ...organisers]"
        @toggle="toggleEvent"
        @select-teacher="onSelectPerson"
      />
    </section>

    <!-- Upcoming festivals -->
    <section v-if="cityFestivals.length > 0" class="border-t">
      <div class="max-w-3xl mx-auto px-4 py-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Upcoming festivals in {{ city.name }}</h2>
          <NuxtLink to="/festivals" class="text-xs text-primary hover:text-primary/80">
            All festivals
          </NuxtLink>
        </div>

        <div class="grid gap-4">
          <NuxtLink
            v-for="f in cityFestivals"
            :key="f.slug"
            :to="`/festivals/${f.slug}`"
            class="group block border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-background"
          >
            <div class="h-1" :style="{ backgroundColor: f.accentColor }" />
            <div class="p-4">
              <div class="flex items-start gap-3">
                <img
                  v-if="f.logo"
                  :src="f.logo"
                  :alt="f.name"
                  class="w-10 h-10 rounded-full shrink-0"
                />
                <div
                  v-else
                  class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
                  :style="{ backgroundColor: f.accentColor }"
                >
                  {{ f.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-sm group-hover:text-primary transition-colors">{{ f.name }}</h3>
                  <div class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Calendar class="w-3 h-3" />
                      {{ formatDateRange(f.startDate, f.endDate) }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-2">
                    <span
                      v-for="style in f.styles.slice(0, 4)"
                      :key="style"
                      class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                    >
                      {{ style }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <Users class="w-3 h-3" />
                      {{ f.attendeeCount }} planning
                    </span>
                    <span>{{ f.workshopCount }} workshops</span>
                    <span v-if="f.friendsGoing" class="flex items-center gap-1 text-primary font-medium">
                      <Heart class="w-3 h-3" />
                      {{ f.friendsGoing }} friends going
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Desktop week sidebar (fixed, full height) -->
    <aside class="hidden lg:flex fixed right-0 top-12 bottom-0 w-80 border-l bg-background z-30">
      <WeekDrawer
        :events="events"
        :week-plan-ids="weekPlanIds"
        :city-name="city.name"
        :teachers="[...teachers, ...djs, ...organisers]"
        class="w-full"
        @remove="removeEvent"
        @sign-in="() => {}"
        @close="closeDrawer()"
      />
    </aside>

    <!-- Mobile week drawer overlay (< lg only) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="weekDrawerOpen"
          class="lg:hidden fixed inset-0 z-40 bg-black/50"
          @click="closeDrawer()"
        />
      </Transition>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <div
          v-if="weekDrawerOpen"
          class="lg:hidden fixed right-0 top-12 bottom-0 z-50 w-80 max-w-[85vw] shadow-xl"
        >
          <WeekDrawer
            :events="events"
            :week-plan-ids="weekPlanIds"
            :city-name="city.name"
            :teachers="[...teachers, ...djs, ...organisers]"
            @remove="removeEvent"
            @sign-in="() => {}"
            @close="closeDrawer()"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
