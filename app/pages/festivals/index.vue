<script setup lang="ts">
import {
  Search,
  MapPin,
  Calendar,
  Users,
  ArrowRight,
  ChevronRight,
  Flame,
  Globe,
  Heart,
} from 'lucide-vue-next'
import * as salsaOpen from '~/data/mock-festival'
import * as meneate from '~/data/mock-meneate'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'

useHead({
  title: 'Festivals — WeDance',
  meta: [
    { name: 'description', content: 'Discover dance festivals, plan your workshops, find partners, and connect with dancers worldwide.' },
  ],
})

const router = useRouter()

// Year plan state
const { yearPlanIds, yearDrawerOpen, toggleFestival, removeFestival, closeDrawer } = useYearPlan()

// Search
const searchQuery = ref('')
const searchFocused = ref(false)

// Mock: all festivals as discovery cards
const allFestivals = [
  {
    slug: meneate.mockFestival.slug,
    name: meneate.mockFestival.name,
    startDate: meneate.mockFestival.startDate,
    endDate: meneate.mockFestival.endDate,
    location: 'Vienna, Austria',
    logo: meneate.mockFestival.logo,
    accentColor: meneate.mockFestival.accentColor,
    styles: ['Timba', 'Salsa', 'Son', 'Rumba'],
    attendeeCount: meneate.mockFestival.attendeeCount,
    friendsGoing: 3,
    workshopCount: meneate.mockWorkshops.filter(w => w.type !== 'party').length,
    partyCount: meneate.mockWorkshops.filter(w => w.type === 'party').length,
    description: meneate.mockFestival.description,
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
    partyCount: cubanFire.mockWorkshops.filter(w => w.type === 'party').length,
    description: cubanFire.mockFestival.description,
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
    partyCount: caribbeanUrbanFire.mockWorkshops.filter(w => w.type === 'party').length,
    description: caribbeanUrbanFire.mockFestival.description,
  },
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
    partyCount: 0,
    description: salsaOpen.mockFestival.description,
    earlyBirdDeadline: '2026-06-01',
  },
  {
    slug: 'bachata-stars-barcelona-2026',
    name: 'Bachata Stars Barcelona',
    startDate: '2026-07-03',
    endDate: '2026-07-06',
    location: 'Barcelona, Spain',
    logo: 'https://ui-avatars.com/api/?name=BSB&size=80&background=7c3aed&color=fff&bold=true&rounded=true',
    accentColor: '#7c3aed',
    styles: ['Bachata', 'Bachata Sensual'],
    attendeeCount: 620,
    friendsGoing: 1,
    workshopCount: 24,
    partyCount: 4,
    description: 'The biggest Bachata event in Southern Europe.',
    earlyBirdDeadline: '2026-06-15',
  },
  {
    slug: 'timba-fest-london-2026',
    name: 'Timba Fest London',
    startDate: '2026-09-18',
    endDate: '2026-09-21',
    location: 'London, UK',
    logo: 'https://ui-avatars.com/api/?name=TFL&size=80&background=0ea5e9&color=fff&bold=true&rounded=true',
    accentColor: '#0ea5e9',
    styles: ['Timba', 'Son', 'Rumba'],
    attendeeCount: 310,
    friendsGoing: 0,
    workshopCount: 18,
    partyCount: 3,
    description: 'Cuban music and dance in the heart of London.',
  },
  {
    slug: 'kizomba-prague-2026',
    name: 'Kizomba & Urban Kiz Prague',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    location: 'Prague, Czech Republic',
    logo: 'https://ui-avatars.com/api/?name=KPR&size=80&background=ec4899&color=fff&bold=true&rounded=true',
    accentColor: '#ec4899',
    styles: ['Kizomba', 'Urban Kiz', 'Semba'],
    attendeeCount: 275,
    friendsGoing: 0,
    workshopCount: 16,
    partyCount: 3,
    description: 'Kizomba, Urban Kiz and Semba in beautiful Prague.',
  },
]

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameMonth = s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${e.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
}

function daysUntil(dateStr: string) {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Happening now'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 30) return `In ${diff} days`
  if (diff <= 60) return `In ${Math.ceil(diff / 7)} weeks`
  return `In ${Math.ceil(diff / 30)} months`
}

const filteredFestivals = computed(() => {
  if (!searchQuery.value.trim()) return allFestivals
  const q = searchQuery.value.toLowerCase()
  return allFestivals.filter(f =>
    f.name.toLowerCase().includes(q)
    || f.location.toLowerCase().includes(q)
    || f.styles.some(s => s.toLowerCase().includes(q))
  )
})

// Mock signed in state
const isSignedIn = ref(false)

// Mock year plan (signed in users)
const myPlanFestivals = computed(() =>
  isSignedIn.value ? allFestivals.slice(0, 3) : []
)

const stats = [
  { value: '12,000+', label: 'Dancers' },
  { value: '180+', label: 'Festivals' },
  { value: '35', label: 'Countries' },
]
</script>

<template>
  <div class="lg:mr-80">
    <!-- Hero -->
    <section class="relative border-b">
      <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div class="relative max-w-3xl mx-auto px-4 pt-6 pb-6 text-center">
        <p class="text-muted-foreground text-sm mb-4">Find your next dance festival</p>

        <!-- Search bar -->
        <div class="relative max-w-md mx-auto">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by city, style, or festival name..."
            class="flex h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
          />
        </div>

        <!-- Quick style filters -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            v-for="style in ['Salsa', 'Bachata', 'Timba', 'Kizomba', 'Son']"
            :key="style"
            class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
            :class="searchQuery === style ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-input hover:border-foreground/30'"
            @click="searchQuery = searchQuery === style ? '' : style"
          >
            {{ style }}
          </button>
        </div>
      </div>
    </section>

    <!-- Your plan strip (signed in) -->
    <section v-if="isSignedIn && myPlanFestivals.length" class="border-b bg-muted/30">
      <div class="max-w-3xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold">Your 2026</h2>
          <NuxtLink to="/my-year" class="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5">
            Full plan <ChevronRight class="w-3 h-3" />
          </NuxtLink>
        </div>
        <div class="flex gap-3 overflow-x-auto pb-1">
          <NuxtLink
            v-for="f in myPlanFestivals"
            :key="f.slug"
            :to="`/festivals/${f.slug}`"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-background hover:shadow-sm transition-shadow shrink-0"
          >
            <img
              v-if="f.logo"
              :src="f.logo"
              :alt="f.name"
              class="w-8 h-8 rounded-full shrink-0"
            />
            <div
              v-else
              class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
              :style="{ backgroundColor: f.accentColor }"
            >
              {{ f.name.charAt(0) }}
            </div>
            <div class="min-w-0">
              <div class="text-xs font-medium truncate max-w-[140px]">{{ f.name }}</div>
              <div class="text-[10px] text-muted-foreground">{{ formatDateRange(f.startDate, f.endDate) }}</div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Festival grid -->
    <section class="max-w-3xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{ searchQuery ? 'Results' : 'Upcoming Festivals' }}
        </h2>
        <span class="text-xs text-muted-foreground">{{ filteredFestivals.length }} events</span>
      </div>

      <div v-if="!filteredFestivals.length" class="text-center py-12 border rounded-lg border-dashed">
        <Search class="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p class="text-sm text-muted-foreground">No festivals match "{{ searchQuery }}"</p>
        <button class="text-xs text-primary mt-2" @click="searchQuery = ''">Clear search</button>
      </div>

      <div class="grid gap-4">
        <NuxtLink
          v-for="f in filteredFestivals"
          :key="f.slug"
          :to="`/festivals/${f.slug}`"
          class="group block border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-background"
        >
          <!-- Color accent bar -->
          <div class="h-1" :style="{ backgroundColor: f.accentColor }" />

          <div class="p-4">
            <div class="flex items-start gap-3">
              <!-- Logo -->
              <img
                v-if="f.logo"
                :src="f.logo"
                :alt="f.name"
                class="w-12 h-12 rounded-full shrink-0"
              />
              <div
                v-else
                class="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-lg font-bold text-white"
                :style="{ backgroundColor: f.accentColor }"
              >
                {{ f.name.charAt(0) }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-sm group-hover:text-primary transition-colors">{{ f.name }}</h3>
                  <span class="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">{{ daysUntil(f.startDate) }}</span>
                </div>

                <div class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <MapPin class="w-3 h-3" />
                    {{ f.location }}
                  </span>
                </div>

                <!-- Styles -->
                <div class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-for="style in f.styles.slice(0, 4)"
                    :key="style"
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                  >
                    {{ style }}
                  </span>
                  <span v-if="f.styles.length > 4" class="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">
                    +{{ f.styles.length - 4 }}
                  </span>
                </div>

                <!-- Stats row -->
                <div class="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Users class="w-3 h-3" />
                    {{ f.attendeeCount }} planning
                  </span>
                  <span>{{ f.workshopCount }} workshops</span>
                  <span v-if="f.partyCount">{{ f.partyCount }} {{ f.partyCount === 1 ? 'party' : 'parties' }}</span>
                  <span v-if="f.friendsGoing" class="flex items-center gap-1 text-primary font-medium">
                    <Heart class="w-3 h-3" />
                    {{ f.friendsGoing }} friends going
                  </span>
                  <button
                    class="ml-auto text-xs font-medium px-2.5 py-1 rounded-md border transition-colors"
                    :class="yearPlanIds.has(f.slug) ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground hover:text-foreground hover:border-foreground/30'"
                    @click.prevent="toggleFestival(f.slug)"
                  >
                    {{ yearPlanIds.has(f.slug) ? '✓ Picked' : 'Pick' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Social proof bar -->
    <section class="border-y bg-muted/30">
      <div class="max-w-3xl mx-auto px-4 py-6">
        <div class="grid grid-cols-3 gap-6 max-w-sm mx-auto">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div class="text-xl font-bold">{{ stat.value }}</div>
            <div class="text-xs text-muted-foreground">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Organizer CTA -->
    <section class="max-w-3xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between rounded-lg border p-4 bg-background">
        <div>
          <h3 class="text-sm font-semibold">Organize a dance festival?</h3>
          <p class="text-xs text-muted-foreground mt-0.5">List your event for free and reach thousands of dancers.</p>
        </div>
        <Button variant="outline" size="sm" class="gap-1 shrink-0" @click="router.push('/organizers')">
          Learn more <ArrowRight class="w-3.5 h-3.5" />
        </Button>
      </div>
    </section>

    <!-- Desktop year sidebar (fixed, full height) -->
    <aside class="hidden lg:flex fixed right-0 top-12 bottom-0 w-80 border-l bg-background z-30">
      <YearCanvas
        :festivals="allFestivals"
        :year-plan-ids="yearPlanIds"
        class="w-full"
        @remove="removeFestival"
        @close="closeDrawer()"
      />
    </aside>

    <!-- Mobile year drawer overlay (< lg only) -->
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
          v-if="yearDrawerOpen"
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
          v-if="yearDrawerOpen"
          class="lg:hidden fixed right-0 top-12 bottom-0 z-50 w-80 max-w-[85vw] shadow-xl"
        >
          <YearCanvas
            :festivals="allFestivals"
            :year-plan-ids="yearPlanIds"
            @remove="removeFestival"
            @close="closeDrawer()"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
