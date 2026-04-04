<script setup lang="ts">
import type { YearPlanFestival, YearStats, DanceRole } from '~/types/festival'

const route = useRoute()
const router = useRouter()

const isSignedIn = ref(true) // mock

// Shared view detection
const isSharedView = computed(() => route.query.user === 'shared')

const myFestivals: YearPlanFestival[] = [
  {
    slug: 'meneate-viena-2026',
    name: '¡Menéate Viena! 2026',
    startDate: '2026-03-26',
    endDate: '2026-03-29',
    location: 'Vienna, Austria',
    logo: 'https://firebasestorage.googleapis.com/v0/b/wedance-4abe3.appspot.com/o/media%2FtvR012ArEpQhCJdPHh6G7sLuqoO2%2F39830bdd-95dd-48e8-9495-15000390c615?alt=media&token=65affea4-baea-4c3f-a373-6ed40b1ff099',
    accentColor: '#e65100',
    workshopCount: 12,
    role: 'lead',
    lookingCount: 3,
    ticketStatus: 'purchased',
    ticketName: 'Full Pass',
    styles: ['Timba', 'Salsa', 'Son', 'Rumba', 'Reggaeton'],
    friendsGoing: [
      { name: 'Ana Rodriguez', photo: 'https://i.pravatar.cc/150?u=ana' },
      { name: 'Marco Silva', photo: 'https://i.pravatar.cc/150?u=marco' },
      { name: 'Yuki Tanaka', photo: 'https://i.pravatar.cc/150?u=yuki' },
    ],
  },
  {
    slug: 'salsa-open-berlin-2026',
    name: 'Salsa Open Berlin 2026',
    startDate: '2026-06-19',
    endDate: '2026-06-21',
    location: 'Berlin, Germany',
    logo: 'https://ui-avatars.com/api/?name=SOB&size=80&background=e11d48&color=fff&bold=true&rounded=true',
    accentColor: '#e11d48',
    workshopCount: 8,
    role: 'lead',
    lookingCount: 1,
    ticketStatus: 'not-purchased',
    earlyBirdDeadline: '2026-06-01',
    styles: ['Salsa', 'Bachata'],
    friendsGoing: [
      { name: 'Ana Rodriguez', photo: 'https://i.pravatar.cc/150?u=ana' },
      { name: 'Sofia Petrov', photo: 'https://i.pravatar.cc/150?u=sofia' },
    ],
  },
  {
    slug: 'bachata-stars-barcelona-2026',
    name: 'Bachata Stars Barcelona',
    startDate: '2026-07-03',
    endDate: '2026-07-06',
    location: 'Barcelona, Spain',
    logo: 'https://ui-avatars.com/api/?name=BSB&size=80&background=7c3aed&color=fff&bold=true&rounded=true',
    accentColor: '#7c3aed',
    workshopCount: 0,
    role: null,
    lookingCount: 0,
    ticketStatus: 'not-purchased',
    earlyBirdDeadline: '2026-06-01',
    styles: ['Bachata', 'Bachata Sensual'],
    friendsGoing: [
      { name: 'Marco Silva', photo: 'https://i.pravatar.cc/150?u=marco' },
    ],
  },
  {
    slug: 'timba-fest-london-2026',
    name: 'Timba Fest London',
    startDate: '2026-09-18',
    endDate: '2026-09-21',
    location: 'London, UK',
    logo: 'https://ui-avatars.com/api/?name=TFL&size=80&background=0ea5e9&color=fff&bold=true&rounded=true',
    accentColor: '#0ea5e9',
    workshopCount: 0,
    role: null,
    lookingCount: 0,
    ticketStatus: 'not-purchased',
    styles: ['Timba', 'Son', 'Rumba'],
    friendsGoing: [],
  },
]

const suggestions: YearPlanFestival[] = [
  {
    slug: 'kizomba-amsterdam-2026',
    name: 'Kizomba Festival Amsterdam',
    startDate: '2026-09-11',
    endDate: '2026-09-14',
    location: 'Amsterdam, Netherlands',
    logo: 'https://ui-avatars.com/api/?name=KFA&size=80&background=059669&color=fff&bold=true&rounded=true',
    accentColor: '#059669',
    workshopCount: 0,
    role: null,
    lookingCount: 0,
    ticketStatus: 'not-purchased',
    styles: ['Kizomba', 'Semba', 'Urban Kiz'],
    friendsGoing: [
      { name: 'Ana Rodriguez', photo: 'https://i.pravatar.cc/150?u=ana' },
      { name: 'Marco Silva', photo: 'https://i.pravatar.cc/150?u=marco' },
      { name: 'Yuki Tanaka', photo: 'https://i.pravatar.cc/150?u=yuki' },
    ],
  },
  {
    slug: 'cuban-salsa-congress-prague-2026',
    name: 'Cuban Salsa Congress Prague',
    startDate: '2026-11-06',
    endDate: '2026-11-09',
    location: 'Prague, Czech Republic',
    logo: 'https://ui-avatars.com/api/?name=CSC&size=80&background=dc2626&color=fff&bold=true&rounded=true',
    accentColor: '#dc2626',
    workshopCount: 0,
    role: null,
    lookingCount: 0,
    ticketStatus: 'not-purchased',
    styles: ['Salsa', 'Timba', 'Rueda'],
    friendsGoing: [
      { name: 'Sofia Petrov', photo: 'https://i.pravatar.cc/150?u=sofia' },
    ],
  },
]

const stats: YearStats = {
  totalFestivals: 4,
  totalWorkshops: 20,
  countries: ['AT', 'DE', 'ES', 'UK'],
  topStyles: [
    { style: 'Salsa', percent: 40 },
    { style: 'Timba', percent: 25 },
    { style: 'Bachata', percent: 20 },
    { style: 'Son', percent: 10 },
    { style: 'Rumba', percent: 5 },
  ],
  partnerMatchRate: 87,
}

// Mock sharer for shared view (would come from backend)
const mockSharer = {
  name: 'Alex Petrov',
  photo: 'https://i.pravatar.cc/150?u=alex',
  role: 'lead' as DanceRole,
}

// Mock: viewer's own festivals (to compute overlap)
const viewerFestivalSlugs = ['meneate-viena-2026', 'salsa-open-berlin-2026']

// Share modal
const showShareModal = ref(false)

function openFestival(slug: string) {
  if (isSharedView.value) {
    router.push({ path: `/festivals/${slug}`, query: { plan: 'shared' } })
  } else {
    router.push(`/festivals/${slug}`)
  }
}

function onCreateYearPlan() {
  router.replace({ query: {} })
}

useHead({
  title: isSharedView.value
    ? `${mockSharer.name}'s 2026 Dance Year | WeDance`
    : 'My 2026 Dance Year | WeDance',
})
</script>

<template>
  <!-- Shared view -->
  <SharedYearPlan
    v-if="isSharedView"
    :sharer="mockSharer"
    :festivals="myFestivals"
    :viewer-festival-slugs="viewerFestivalSlugs"
    @add-friend="() => {}"
    @open-festival="openFestival"
    @create-year-plan="onCreateYearPlan"
    @sign-in="() => {}"
  />

  <!-- Own year plan -->
  <template v-else>
    <YearPlan
      :festivals="myFestivals"
      :suggestions="suggestions"
      :stats="stats"
      :is-signed-in="isSignedIn"
      @open-festival="openFestival"
      @share="showShareModal = true"
      @sign-in="() => {}"
    />

    <ShareYearPlanModal
      v-model:open="showShareModal"
      :festivals="myFestivals"
      sharer-name="You"
    />
  </template>
</template>
