<script setup lang="ts">
import type { PlanEntry, DanceRole, DancePartner, FestivalFriend, PartnerMatch, DiscoverDancer, ExtraActivity, RideShare, SwipeCard, FreemiumState } from '~/types/festival'
import { ArrowRight, Sparkles, Check } from 'lucide-vue-next'
import { artistPlaces, artistLanguages } from '~/data/artists'
import * as salsaOpen from '~/data/mock-festival'
import * as meneate from '~/data/mock-meneate'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'
import * as aguaPichi from '~/data/mock-agua-pichi'
import { liteFestivals } from '~/data/mock-festivals-lite'

const route = useRoute()
const router = useRouter()

const festivals: Record<string, { festival: typeof salsaOpen.mockFestival; workshops: typeof salsaOpen.mockWorkshops; teachers: typeof salsaOpen.mockTeachers }> = {
  'salsa-open-berlin-2026': { festival: salsaOpen.mockFestival, workshops: salsaOpen.mockWorkshops, teachers: salsaOpen.mockTeachers },
  'meneate-viena-2026': { festival: meneate.mockFestival, workshops: meneate.mockWorkshops, teachers: meneate.mockTeachers },
  'cuban-fire-munich-2026': { festival: cubanFire.mockFestival, workshops: cubanFire.mockWorkshops, teachers: cubanFire.mockTeachers },
  'caribbean-urban-fire-munich-2026': { festival: caribbeanUrbanFire.mockFestival, workshops: caribbeanUrbanFire.mockWorkshops, teachers: caribbeanUrbanFire.mockTeachers },
  'agua-pichi-2027': { festival: aguaPichi.mockFestival, workshops: aguaPichi.mockWorkshops, teachers: aguaPichi.mockTeachers },
  ...liteFestivals,
}

const data = festivals[route.params.slug as string]
if (!data) {
  throw createError({ statusCode: 404, statusMessage: 'Festival not found', fatal: true })
}
const festival = data.festival
const workshops = data.workshops
const teachers = data.teachers

// Festival-level "Pick" — adds the whole festival to the year plan (distinct
// from the per-workshop picks below).
const { yearPlanIds, toggleFestival } = useYearPlan()

// Shared plan view detection
const isSharedView = computed(() => route.query.plan === 'shared')
const hasReferral = computed(() => !!route.query.ref)

// Mock sharer data (would come from backend in real app)
const mockSharer = {
  name: 'Ana Rodriguez',
  photo: 'https://i.pravatar.cc/150?u=ana',
  role: 'follow' as DanceRole,
}
const mockSharerPlan: { workshopId: string; role: DanceRole | null; partnerStatus: string }[] = [
  { workshopId: 'fri-1', role: 'follow', partnerStatus: 'with-partner' },
  { workshopId: 'fri-party', role: null, partnerStatus: 'solo' },
  { workshopId: 'sat-1', role: 'follow', partnerStatus: 'looking' },
  { workshopId: 'sat-7', role: 'follow', partnerStatus: 'with-partner' },
  { workshopId: 'sat-party', role: null, partnerStatus: 'solo' },
  { workshopId: 'sun-4', role: 'follow', partnerStatus: 'looking' },
  { workshopId: 'sun-7', role: 'follow', partnerStatus: 'with-partner' },
]

function onCreatePlan() {
  router.replace({ query: {} })
}

function onBePartner(workshopId: string) {
  if (!isSignedIn.value) {
    signUpAction.value = 'partner'
    showSignUp.value = true
    return
  }
  // Add the workshop to user's plan and scroll to schedule
  toggleWorkshop(workshopId)
  router.replace({ query: {} })
  nextTick(() => scrollTo('schedule'))
}

const days = [...new Set(workshops.map((w) => w.day))]
const styles = [...new Set(workshops.map((w) => w.style))]

// Plan state
const plan = ref(new Map<string, PlanEntry>())
const planIds = computed(() => new Set(plan.value.keys()))

// Partners list
const partners = ref<DancePartner[]>([])

// Role picker modal
const showRolePicker = ref(false)
const rolePickerWorkshopId = ref<string | null>(null)
const rememberedRole = ref<DanceRole | null>(null)
const rememberedHasPartner = ref<boolean | null>(null)
const rememberedPartnerId = ref<string | undefined>(undefined)

const rolePickerTitle = computed(() => {
  if (!rolePickerWorkshopId.value) return ''
  return workshops.find((w) => w.id === rolePickerWorkshopId.value)?.title || ''
})

function removeConflicting(next: Map<string, PlanEntry>, workshop: Workshop) {
  // Remove any existing pick at the same day+time (different room)
  if (workshop.type === 'party') return
  for (const [existingId] of next) {
    const existing = workshops.find((w) => w.id === existingId)
    if (existing && existing.id !== workshop.id && existing.type !== 'party' && existing.day === workshop.day && existing.time === workshop.time) {
      next.delete(existingId)
    }
  }
}

function toggleWorkshop(id: string) {
  const next = new Map(plan.value)
  if (next.has(id)) {
    next.delete(id)
    plan.value = next
  } else {
    const workshop = workshops.find((w) => w.id === id)
    if (workshop?.type === 'party') {
      // Parties don't need role/partner — add directly
      next.set(id, { workshopId: id, role: null, partnerStatus: 'solo' })
      plan.value = next
    } else if (workshop && rememberedRole.value && rememberedHasPartner.value !== null) {
      // Both role and partner answer remembered — skip modal entirely
      removeConflicting(next, workshop)
      next.set(id, {
        workshopId: id,
        role: rememberedRole.value,
        partnerStatus: rememberedHasPartner.value ? 'with-partner' : 'looking',
        partnerId: rememberedHasPartner.value ? rememberedPartnerId.value : undefined,
      })
      plan.value = next
    } else {
      rolePickerWorkshopId.value = id
      showRolePicker.value = true
    }
  }
}

function onRoleConfirm(role: DanceRole, hasPartner: boolean, remember: boolean, partnerId?: string) {
  const id = rolePickerWorkshopId.value
  if (!id) return
  if (remember) {
    rememberedRole.value = role
    rememberedHasPartner.value = hasPartner
    rememberedPartnerId.value = partnerId
  }
  const workshop = workshops.find((w) => w.id === id)
  const next = new Map(plan.value)
  if (workshop) removeConflicting(next, workshop)
  next.set(id, {
    workshopId: id,
    role,
    partnerStatus: hasPartner ? 'with-partner' : 'looking',
    partnerId: hasPartner ? partnerId : undefined,
  })
  plan.value = next
}

function addPartner(name: string): DancePartner {
  const partner: DancePartner = { id: crypto.randomUUID(), name }
  partners.value = [...partners.value, partner]
  return partner
}

function removeFromPlan(id: string) {
  const next = new Map(plan.value)
  next.delete(id)
  plan.value = next
}

function updatePlanEntry(id: string, updates: Partial<PlanEntry>) {
  const entry = plan.value.get(id)
  if (!entry) return
  const next = new Map(plan.value)
  next.set(id, { ...entry, ...updates })
  plan.value = next
}

// Teacher filter
const selectedTeacherId = ref<string | null>(null)
const selectedTeacher = computed(() =>
  teachers.find((t) => t.id === selectedTeacherId.value) || null,
)

// Lineup cards — face-forward artist cards (shared with /artists) with
// origin + residence. Clicking one filters the schedule to that teacher.
const lineupAccents = ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed']
const lineupCards = teachers.map((teacher, i) => {
  const places = artistPlaces(teacher)
  return {
    teacher,
    accent: lineupAccents[i % lineupAccents.length],
    ...places,
    languages: artistLanguages(places.origin, places.residence),
  }
})

function toggleTeacherFilter(id: string) {
  selectedTeacherId.value = selectedTeacherId.value === id ? null : id
  nextTick(() => scrollTo('schedule'))
}

// Auth state
const { isSignedIn } = useAuth()

// Mock friends (shown after sign-in)
const mockFriends: FestivalFriend[] = [
  {
    id: 'friend-1',
    name: 'Ana Rodriguez',
    photo: 'https://i.pravatar.cc/150?u=ana',
    role: 'follow',
    workshopIds: ['fri-1', 'fri-party', 'sat-1', 'sat-7', 'sat-party', 'sun-4', 'sun-7'],
  },
  {
    id: 'friend-2',
    name: 'Marco Silva',
    photo: 'https://i.pravatar.cc/150?u=marco',
    role: 'lead',
    workshopIds: ['fri-2', 'fri-party', 'sat-4', 'sat-8', 'sat-party', 'sun-1', 'sun-7', 'sun-party'],
  },
  {
    id: 'friend-3',
    name: 'Yuki Tanaka',
    photo: 'https://i.pravatar.cc/150?u=yuki',
    role: 'follow',
    workshopIds: ['sat-3', 'sat-11', 'sat-13', 'sat-party', 'sun-6', 'sun-9'],
  },
]

const friends = computed<FestivalFriend[]>(() => isSignedIn.value ? mockFriends : [])

// Mock partner matches (dancers looking for partners at the same workshops)
const mockPartnerMatches: PartnerMatch[] = [
  {
    id: 'match-1',
    name: 'Sofia Petrov',
    photo: 'https://i.pravatar.cc/150?u=sofia',
    role: 'follow',
    level: 'Intermediate',
    styles: ['Salsa', 'Bachata'],
    workshopIds: ['fri-1', 'fri-2', 'sat-1', 'sat-4', 'sat-7', 'sun-1', 'sun-4'],
    bio: 'Dancing salsa for 3 years, first time at this festival!',
  },
  {
    id: 'match-2',
    name: 'Elena Kova',
    photo: 'https://i.pravatar.cc/150?u=elena',
    role: 'follow',
    level: 'Advanced',
    styles: ['Salsa', 'Mambo'],
    workshopIds: ['fri-1', 'sat-1', 'sat-8', 'sun-1', 'sun-7'],
    bio: 'Competitive salsa dancer, love musicality workshops.',
  },
  {
    id: 'match-3',
    name: 'David Chen',
    photo: 'https://i.pravatar.cc/150?u=david',
    role: 'lead',
    level: 'Intermediate',
    styles: ['Bachata', 'Kizomba'],
    workshopIds: ['fri-2', 'sat-4', 'sat-11', 'sun-4', 'sun-6'],
    bio: 'Bachata is my thing, also exploring kizomba.',
  },
  {
    id: 'match-4',
    name: 'Lucas Moretti',
    photo: 'https://i.pravatar.cc/150?u=lucas',
    role: 'lead',
    level: 'Beginner',
    styles: ['Salsa'],
    workshopIds: ['fri-1', 'sat-1', 'sat-7', 'sun-1'],
    bio: 'Just started salsa 6 months ago, looking for patient partners.',
  },
]

const partnerMatches = computed<PartnerMatch[]>(() => isSignedIn.value ? mockPartnerMatches : [])

// Mock discoverable dancers (for Tinder-style swiping)
const mockDiscoverDancers: DiscoverDancer[] = [
  {
    id: 'disc-1',
    name: 'Isabella Ruiz',
    photo: 'https://i.pravatar.cc/400?u=isabella',
    role: 'follow',
    styles: [{ name: 'Salsa', level: 'Intermediate' }, { name: 'Bachata', level: 'Intermediate' }, { name: 'Cha Cha', level: 'Beginner' }],
    workshopIds: ['fri-1', 'sat-1', 'sat-7', 'sun-4'],
    bio: 'Love social dancing! This is my 3rd festival and I want to dance with everyone.',
    mutualFriends: 2,
    endorsements: { Salsa: 3, Bachata: 5 },
  },
  {
    id: 'taxi-1',
    name: 'Valentina Cruz',
    photo: 'https://i.pravatar.cc/400?u=valentina',
    role: 'follow',
    styles: [{ name: 'Salsa', level: 'Advanced' }, { name: 'Bachata', level: 'Advanced' }, { name: 'Cha Cha', level: 'Advanced' }],
    workshopIds: ['fri-1', 'fri-2', 'sat-1', 'sat-4', 'sat-7', 'sat-8', 'sun-1', 'sun-4', 'sun-7'],
    bio: 'Professional dancer & instructor. Available for workshops — book me as your partner!',
    endorsements: { Salsa: 15, Bachata: 12, 'Cha Cha': 8 },
    serviceType: 'taxi-dancer',
    hourlyRate: 10,
  },
  {
    id: 'disc-2',
    name: 'Tomás Herrera',
    photo: 'https://i.pravatar.cc/400?u=tomas',
    role: 'lead',
    styles: [{ name: 'Salsa', level: 'Advanced' }, { name: 'Mambo', level: 'Advanced' }, { name: 'Son', level: 'Intermediate' }],
    workshopIds: ['fri-1', 'fri-2', 'sat-1', 'sat-8', 'sun-1', 'sun-7'],
    bio: 'Salsa instructor from Madrid. Here to learn and share the dance floor.',
    endorsements: { Salsa: 12, Mambo: 7 },
  },
  {
    id: 'video-1',
    name: 'Marco Bellini',
    photo: 'https://i.pravatar.cc/400?u=marco-video',
    role: 'lead',
    styles: [{ name: 'Salsa', level: 'Intermediate' }, { name: 'Bachata', level: 'Beginner' }],
    workshopIds: [],
    bio: 'Professional dance videographer. I capture your best moments on the floor — social clips, workshop highlights, or full festival recap.',
    serviceType: 'videographer',
    hourlyRate: 25,
  },
  {
    id: 'disc-3',
    name: 'Mira Johansson',
    photo: 'https://i.pravatar.cc/400?u=mira',
    role: 'follow',
    styles: [{ name: 'Bachata', level: 'Beginner' }, { name: 'Kizomba', level: 'Beginner' }],
    workshopIds: ['sat-4', 'sat-11', 'sun-4', 'sun-6'],
    bio: 'First festival ever! A bit shy but really want to meet people and dance.',
    mutualFriends: 1,
  },
  {
    id: 'disc-4',
    name: 'Rafael Santos',
    photo: 'https://i.pravatar.cc/400?u=rafael',
    role: 'lead',
    styles: [{ name: 'Bachata', level: 'Intermediate' }, { name: 'Salsa', level: 'Intermediate' }],
    workshopIds: ['fri-2', 'sat-4', 'sat-7', 'sun-1', 'sun-4'],
    bio: 'Bachata sensual is my jam. Always up for a social dance between workshops!',
    mutualFriends: 3,
  },
  {
    id: 'taxi-2',
    name: 'Diego Fernandez',
    photo: 'https://i.pravatar.cc/400?u=diego',
    role: 'lead',
    styles: [{ name: 'Salsa', level: 'Advanced' }, { name: 'Son', level: 'Advanced' }, { name: 'Rumba', level: 'Intermediate' }],
    workshopIds: ['fri-1', 'sat-1', 'sat-8', 'sun-1', 'sun-7'],
    bio: 'Dance teacher from Havana. I make every follow shine — book me for any workshop!',
    endorsements: { Salsa: 20, Son: 10 },
    serviceType: 'taxi-dancer',
    hourlyRate: 15,
  },
  {
    id: 'disc-5',
    name: 'Nadia Popov',
    photo: 'https://i.pravatar.cc/400?u=nadia',
    role: 'follow',
    styles: [{ name: 'Salsa', level: 'Advanced' }, { name: 'Bachata', level: 'Intermediate' }, { name: 'Kizomba', level: 'Advanced' }],
    workshopIds: ['fri-1', 'sat-1', 'sat-4', 'sat-8', 'sun-1', 'sun-7'],
    bio: 'Dance is my language. Looking to connect with leads who enjoy musicality.',
    endorsements: { Salsa: 8, Kizomba: 6 },
  },
  {
    id: 'disc-6',
    name: 'Kenji Yamamoto',
    photo: 'https://i.pravatar.cc/400?u=kenji',
    role: 'lead',
    styles: [{ name: 'Salsa', level: 'Beginner' }],
    workshopIds: ['sat-1', 'sat-7', 'sun-1'],
    bio: 'Started salsa 4 months ago. Nervous but excited for my first congress!',
    mutualFriends: 1,
  },
  {
    id: 'disc-7',
    name: 'Camila Vega',
    photo: 'https://i.pravatar.cc/400?u=camila',
    role: 'follow',
    styles: [{ name: 'Salsa', level: 'Intermediate' }, { name: 'Cha Cha', level: 'Beginner' }],
    workshopIds: ['fri-1', 'fri-2', 'sat-1', 'sat-7', 'sun-1', 'sun-4'],
    bio: 'Traveling from Buenos Aires for this! Want to dance with as many people as possible.',
    mutualFriends: 2,
  },
  {
    id: 'disc-8',
    name: 'André Müller',
    photo: 'https://i.pravatar.cc/400?u=andre',
    role: 'lead',
    styles: [{ name: 'Kizomba', level: 'Advanced' }, { name: 'Bachata', level: 'Intermediate' }, { name: 'Salsa', level: 'Intermediate' }],
    workshopIds: ['sat-4', 'sat-8', 'sat-11', 'sun-4', 'sun-6', 'sun-7'],
    bio: 'Kizomba specialist but love all Latin dances. Let\'s share a dance!',
  },
]

const discoverDancers = computed<DiscoverDancer[]>(() => mockDiscoverDancers)

// Group dinners — fetched from database via composable
const { dinners: groupDinners, loadDinners, joinDinner: doJoinDinner, leaveDinner: doLeaveDinner } = useDinners(festival.slug)

onMounted(async () => {
  loadDinners()
  await loadFreemiumStatus()

  // Handle redirect back from Stripe Checkout
  if (route.query.payment === 'success') {
    // Webhook may take a moment — poll briefly
    let attempts = 0
    while (!freemiumState.value.userUnlocked && attempts < 5) {
      await new Promise(r => setTimeout(r, 1000))
      await loadFreemiumStatus()
      attempts++
    }
    // Clean up URL
    router.replace({ query: { ...route.query, payment: undefined } })
  } else if (route.query.payment === 'cancel') {
    router.replace({ query: { ...route.query, payment: undefined } })
  }
})

function joinDinner(id: string) {
  tryUnlockSocialActivity(() => {
    doJoinDinner(id).catch(() => {})
  })
}

function leaveDinner(id: string) {
  doLeaveDinner(id).catch(() => {})
}

// Extra activities
const extraActivities = ref<ExtraActivity[]>([
  { id: 'a1', title: 'City walking tour', date: 'Friday', time: '14:00', participantCount: 8, maxParticipants: 15, userJoined: false, description: 'Explore Vienna\'s historic center with fellow dancers' },
  { id: 'a2', title: 'Beach social dance', date: 'Saturday', time: '16:00', participantCount: 12, userJoined: false, description: 'Open-air dancing at Donauinsel — bring your shoes!' },
  { id: 'a3', title: 'Flashmob rehearsal', date: 'Saturday', time: '11:00', participantCount: 5, maxParticipants: 20, userJoined: false, description: 'Learn the choreography for Sunday\'s surprise flashmob' },
  { id: 'a4', title: 'Salsa brunch', date: 'Sunday', time: '10:00', participantCount: 6, maxParticipants: 12, userJoined: false, description: 'Morning brunch with live music before workshops' },
])

function joinActivity(id: string) {
  tryUnlockSocialActivity(() => {
    const a = extraActivities.value.find(x => x.id === id)
    if (a && !a.userJoined) {
      a.userJoined = true
      a.participantCount++
    }
  })
}

// Ride shares
const rideShares = ref<RideShare[]>([
  { id: 'r1', dancerName: 'Maria G.', dancerPhoto: 'https://i.pravatar.cc/150?u=maria', type: 'offering', originCity: 'Munich', date: '2026-04-10', seatsAvailable: 3 },
  { id: 'r2', dancerName: 'Carlos R.', dancerPhoto: 'https://i.pravatar.cc/150?u=carlos', type: 'looking', originCity: 'Berlin', date: '2026-04-10' },
  { id: 'r3', dancerName: 'Sophie L.', dancerPhoto: 'https://i.pravatar.cc/150?u=sophie', type: 'offering', originCity: 'Vienna', date: '2026-04-09', seatsAvailable: 1 },
])

function postRide(ride: { type: 'offering' | 'looking'; originCity: string; date: string; seats?: number }) {
  if (!isSignedIn.value) {
    signUpAction.value = 'social'
    showSignUp.value = true
    return
  }
  rideShares.value.push({
    id: `r${Date.now()}`,
    dancerName: 'You',
    dancerPhoto: 'https://i.pravatar.cc/150?u=me',
    type: ride.type,
    originCity: ride.originCity,
    date: ride.date,
    seatsAvailable: ride.seats,
  })
}

// Roommate toggle
const lookingForRoommate = ref(false)

function toggleRoommate() {
  if (!isSignedIn.value) {
    signUpAction.value = 'social'
    showSignUp.value = true
    return
  }
  lookingForRoommate.value = !lookingForRoommate.value
}

// Freemium state — loaded from backend
const freemiumState = ref<FreemiumState>({
  totalSignups: 0,
  maxFreeSpots: 10,
  userUnlocked: false,
  paymentUrl: 'https://buy.stripe.com/placeholder',
})
const freeSpotsLeft = computed(() => Math.max(0, freemiumState.value.maxFreeSpots - freemiumState.value.totalSignups))
const showSocialPaywall = ref(false)

async function loadFreemiumStatus() {
  try {
    const result = await $trpc.festivalSignup.status.query({ festivalSlug: festival.slug })
    freemiumState.value.totalSignups = result.totalSignups
    freemiumState.value.maxFreeSpots = result.maxFreeSpots
    freemiumState.value.userUnlocked = result.userSignedUp
    if (result.stripePaymentLink) {
      freemiumState.value.paymentUrl = result.stripePaymentLink
    }
  } catch (e) {
    console.warn('Failed to load freemium status:', e)
  }
}

function tryUnlockSocialActivity(action: () => void) {
  if (!isSignedIn.value) {
    onSignIn('social')
    return
  }

  if (freemiumState.value.userUnlocked) {
    action()
    return
  }

  if (freemiumState.value.totalSignups < freemiumState.value.maxFreeSpots) {
    // Optimistic UI update
    freemiumState.value.totalSignups++
    freemiumState.value.userUnlocked = true
    // Persist to backend
    $trpc.festivalSignup.join.mutate({ festivalSlug: festival.slug }).then((result: any) => {
      if (result.alreadyJoined) {
        freemiumState.value.totalSignups--
      }
    }).catch((e: any) => {
      console.warn('Failed to join festival:', e.message)
      freemiumState.value.totalSignups--
      freemiumState.value.userUnlocked = false
    })
    action()
    return
  }

  showSocialPaywall.value = true
}

const paymentLoading = ref(false)
async function startCheckout() {
  paymentLoading.value = true
  try {
    const result = await $trpc.festivalSignup.createCheckoutSession.mutate({ festivalSlug: festival.slug })
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl
    }
  } catch (e: any) {
    console.error('Checkout failed:', e.message)
    paymentLoading.value = false
  }
}

// Combined swipe deck: interleave dancers with dinner/activity cards
const swipeCards = computed<SwipeCard[]>(() => {
  const dancers: SwipeCard[] = mockDiscoverDancers.map(d => ({ ...d, cardType: 'dancer' as const }))
  const dinners: SwipeCard[] = groupDinners.value.map(d => ({ ...d, cardType: 'dinner' as const }))
  const activities: SwipeCard[] = extraActivities.value.map(a => ({ ...a, cardType: 'activity' as const }))

  // Interleave: after every 3 dancers, insert a dinner or activity
  const extras = [...dinners, ...activities]
  const result: SwipeCard[] = []
  let extraIdx = 0

  for (let i = 0; i < dancers.length; i++) {
    result.push(dancers[i])
    if ((i + 1) % 3 === 0 && extraIdx < extras.length) {
      result.push(extras[extraIdx++])
    }
  }
  // Append remaining extras
  while (extraIdx < extras.length) {
    result.push(extras[extraIdx++])
  }

  // Insert onboarding cards after the first dancer when not signed in
  if (!isSignedIn.value) {
    const onboardingCards: SwipeCard[] = [
      {
        id: 'onboarding-dancecard',
        cardType: 'onboarding-dancecard',
        availableStyles: styles,
      },
      {
        id: 'onboarding-profile',
        cardType: 'onboarding-profile',
      },
    ]
    result.splice(1, 0, ...onboardingCards)
  }

  return result
})

// Sign-up gate
const showSignUp = ref(false)
const signUpAction = ref('share')
const signUpPrefill = ref<{ name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }>({})

function onSignIn(action?: string) {
  signUpAction.value = action || 'share'
  showSignUp.value = true
}

function onOnboardingComplete(role: DanceRole, styles: string[], name: string, city: string) {
  signUpPrefill.value = {
    name: name || undefined,
    danceStyles: styles,
    role: role as 'lead' | 'follow' | 'both',
    city: city || undefined,
  }
}

function onSignedIn() {
  loadDinners()
  loadFreemiumStatus()
}

function onPick() {
  if (!isSignedIn.value) {
    signUpAction.value = 'plan'
    showSignUp.value = true
    return
  }
  toggleFestival(festival.slug)
}

function onSave() {
  if (!isSignedIn.value) {
    signUpAction.value = 'save'
    showSignUp.value = true
  }
  // When signed in, save is a no-op (mock — would persist to backend)
}

// Share modal
const showSharePlan = ref(false)

function onShare() {
  if (!isSignedIn.value) {
    signUpAction.value = 'share'
    showSignUp.value = true
  } else {
    showSharePlan.value = true
  }
}

// Cart state — badge count only. The desktop sidebar + mobile drawer
// were retired in favor of /my-plan; this keeps any global count badge
// (e.g. a future nav pill) in sync.
const { setCartCount } = useCart()
watch(() => plan.value.size, (n) => setCartCount(n), { immediate: true })

// Navigation
const sections = ['about', 'discover', 'activities', 'lineup', 'schedule', 'tickets', 'venue'] as const
const sectionLabels: Record<string, string> = {
  'about': 'About',
  'discover': 'Shall we dance?',
  'activities': 'Activities',
  'lineup': 'Lineup',
  'schedule': 'Schedule',
  'tickets': 'Tickets',
  'venue': 'Venue',
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  activeSection.value = id // immediate feedback; observer keeps it honest
}

// ── Sticky nav behaviour ──────────────────────────────────────────
// - The festival name only appears in the sticky nav once the hero has
//   scrolled out of view (so a deep-link straight to #tickets still
//   shows which festival you're on).
// - The nav highlights the section currently at the top and updates as
//   you scroll (scrollspy).
const heroRef = ref<HTMLElement | null>(null)
const heroVisible = ref(true)
const activeSection = ref<string>('about')

let heroObserver: IntersectionObserver | null = null
let sectionObserver: IntersectionObserver | null = null

onMounted(() => {
  if (heroRef.value) {
    heroObserver = new IntersectionObserver(
      ([entry]) => { heroVisible.value = entry.isIntersecting },
      { threshold: 0 },
    )
    heroObserver.observe(heroRef.value)
  }

  // Scrollspy — track which section sits under the sticky nav.
  const seen = new Set<string>()
  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target.id)
        else seen.delete(e.target.id)
      }
      const active = sections.find((s) => seen.has(s))
      if (active) activeSection.value = active
    },
    { rootMargin: '-64px 0px -60% 0px', threshold: 0 },
  )
  for (const s of sections) {
    const el = document.getElementById(s)
    if (el) sectionObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  heroObserver?.disconnect()
  sectionObserver?.disconnect()
})

// ── WeDance ticketing ─────────────────────────────────────────────
// WeDance IS the ticketing platform — dancers buy their pass here, and
// the purchase is what puts their face on the event page ("see who's
// going before you book"). No link-out to the organizer's own site.
//
// The real payment goes through Stripe Checkout (same session backend
// the €1 social unlock already uses). Until the ticket-purchase
// endpoint is wired, the checkout modal collects the intent and shows
// the value prop; `startTicketCheckout` is the single place to plug
// the real createCheckoutSession call.
type TicketOption = NonNullable<typeof festival.tickets>[number]
const selectedTicket = ref<TicketOption | null>(null)
const showCheckout = ref(false)
const checkoutLoading = ref(false)

function chooseTicket(ticket: TicketOption) {
  selectedTicket.value = ticket
  showCheckout.value = true
}

const checkoutError = ref('')

async function startTicketCheckout() {
  if (!selectedTicket.value) return
  if (!isSignedIn.value) {
    // Buying = joining the wall, so we need an account first.
    signUpAction.value = 'ticket'
    showSignUp.value = true
    return
  }
  checkoutLoading.value = true
  checkoutError.value = ''
  useTrack().track('ticket_cta_click', {
    festival: festival.slug,
    ticket: selectedTicket.value.name,
    amount: selectedTicket.value.price,
  })
  try {
    const { $trpc: trpc } = useNuxtApp()
    const res = await trpc.festivalSignup.ticketCheckout.mutate({
      festivalSlug: festival.slug,
      ticketName: selectedTicket.value.name,
    })
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl
    }
  } catch (err: any) {
    checkoutError.value = err?.message?.includes('sold out')
      ? 'This ticket is sold out.'
      : 'Something went wrong — please try again.'
  } finally {
    checkoutLoading.value = false
  }
}

// ── Smart ticket recommendation ───────────────────────────────────
// As the dancer picks workshops + parties, WeDance figures out the
// cheapest pass (or combo of day passes) that covers their plan.
// This is the core "add workshops → we recommend the best ticket"
// pitch. Greedy day-coverage + party add-on, lifted from the
// TicketRecommendation component and adapted to the page's plan Map.
const plannedDays = computed(() => {
  const days = new Set<string>()
  for (const w of workshops) {
    if (planIds.value.has(w.id)) days.add(w.day)
  }
  return days
})
const plannedWorkshopCount = computed(() =>
  workshops.filter((w) => planIds.value.has(w.id) && w.type !== 'party').length,
)
const hasPartyInPlan = computed(() =>
  workshops.some((w) => planIds.value.has(w.id) && w.type === 'party'),
)

function cheapestDayCoverage(dayPasses: TicketOption[], targetDays: Set<string>): TicketOption[] {
  const sorted = [...dayPasses].sort((a, b) => a.price - b.price)
  for (const t of sorted) {
    if ([...targetDays].every((d) => t.days.includes(d))) return [t]
  }
  const uncovered = new Set(targetDays)
  const selected: TicketOption[] = []
  for (const t of sorted) {
    if (t.days.some((d) => uncovered.has(d))) {
      selected.push(t)
      t.days.forEach((d) => uncovered.delete(d))
      if (uncovered.size === 0) break
    }
  }
  // Only a full-coverage combo is a valid recommendation. If day passes
  // can't cover every planned day (e.g. no Friday day-pass exists), bail
  // — the full pass path will carry the plan instead.
  return uncovered.size === 0 ? selected : []
}

interface Recommendation {
  tickets: TicketOption[]
  total: number
  savings?: number
  soldOut: boolean
}

const recommendation = computed<Recommendation | null>(() => {
  const all = festival.tickets
  if (!all?.length) return null
  const days = plannedDays.value
  if (days.size === 0) return null

  const workshopCount = plannedWorkshopCount.value
  const wantsParty = hasPartyInPlan.value

  interface Candidate { tickets: TicketOption[]; total: number; soldOut: boolean }
  const candidates: Candidate[] = []

  // A combo can only be bought if every part is available.
  const comboSoldOut = (ts: TicketOption[]) => ts.some((t) => t.soldOut)

  // Cheapest party-only add-on — prefer a buyable one over a sold-out one.
  const partyAddOn = () => {
    const partyOnly = all.filter((t) => t.includesParty && (t.workshopCount === undefined || t.workshopCount === 0))
    const buyable = partyOnly.filter((t) => !t.soldOut).sort((a, b) => a.price - b.price)
    if (buyable.length) return buyable[0]
    return partyOnly.sort((a, b) => a.price - b.price)[0]
  }

  for (const ticket of all) {
    // workshopCount === 0 marks a party-only pass (grants no workshop
    // access); undefined means unlimited. A plan with 0 workshops is
    // trivially covered by any pass.
    const coversWorkshops = workshopCount === 0
      || (ticket.workshopCount !== 0 && (ticket.workshopCount === undefined || ticket.workshopCount >= workshopCount))
    const coversDays = ticket.days.length === 0 || [...days].every((d) => ticket.days.includes(d))
    const coversParty = !wantsParty || !!ticket.includesParty
    if (coversWorkshops && coversDays && (workshopCount > 0 || wantsParty)) {
      if (coversParty) {
        candidates.push({ tickets: [ticket], total: ticket.price, soldOut: !!ticket.soldOut })
      } else {
        const party = partyAddOn()
        if (party) {
          candidates.push({ tickets: [ticket, party], total: ticket.price + party.price, soldOut: comboSoldOut([ticket, party]) })
        } else {
          candidates.push({ tickets: [ticket], total: ticket.price, soldOut: !!ticket.soldOut })
        }
      }
    }
  }

  const dayPasses = all.filter((t) => t.days.length > 0 && !t.includesParty && t.workshopCount === undefined)
  if (dayPasses.length > 0) {
    const combo = cheapestDayCoverage(dayPasses, days)
    if (combo.length > 0) {
      const party = wantsParty ? partyAddOn() : null
      const tickets = party ? [...combo, party] : combo
      candidates.push({ tickets, total: tickets.reduce((s, t) => s + t.price, 0), soldOut: comboSoldOut(tickets) })
    }
  }

  if (workshopCount === 0 && wantsParty) {
    const party = partyAddOn()
    if (party) candidates.push({ tickets: [party], total: party.price, soldOut: !!party.soldOut })
  }

  if (candidates.length === 0) return null
  // Prefer buyable options over sold-out ones, then cheapest.
  candidates.sort((a, b) => (Number(a.soldOut) - Number(b.soldOut)) || (a.total - b.total))
  const best = candidates[0]
  const next = candidates[1]
  return {
    tickets: best.tickets,
    total: best.total,
    savings: next && next.total > best.total ? next.total - best.total : undefined,
    soldOut: best.soldOut,
  }
})

// Which ticket names are in the current recommendation (for grid highlight)
const recommendedNames = computed(() => new Set((recommendation.value?.tickets ?? []).map((t) => t.name)))

function getRecommendedPass() {
  const rec = recommendation.value
  if (!rec) return
  const buyable = rec.tickets.find((t) => !t.soldOut) ?? rec.tickets[0]
  if (buyable) chooseTicket(buyable)
}

// Which grid card gets the highlight: the recommended pass(es) once the
// dancer has a plan, otherwise the first (cheapest full) pass by default.
function isTopPass(t: TicketOption, i: number): boolean {
  if (recommendation.value) return recommendedNames.value.has(t.name)
  return i === 0
}

// V3 tropical direction — layout:false + inline header so we can wrap
// the whole page in the cream + Playfair aesthetic without touching
// the default layout (which other pages still depend on). The shared
// components inside (FestivalHero, AboutTab, DiscoverDancers,
// ActivitiesTab, MySpace, Lineup, ScheduleTab, VenueTab, CartDrawer,
// SharedPlanView, modals) still carry shadcn styling — those get
// restyled in a follow-up pass.
definePageMeta({ layout: false })

useHead({
  title: `${festival.name} | WeDance`,
  meta: [
    { name: 'description', content: festival.description },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})
</script>

<template>
  <!-- Shared plan view (read-only) -->
  <SharedPlanView
    v-if="isSharedView"
    :festival-name="festival.name"
    :workshops="workshops"
    :teachers="teachers"
    :sharer="mockSharer"
    :sharer-plan="mockSharerPlan"
    :has-referral="hasReferral"
    @create-plan="onCreatePlan"
    @be-partner="onBePartner"
    @add-friend="() => { useTrack().track('shared_plan_signup', { surface: 'festival', slug: festival.slug }); onSignIn('friend') }"
    @sign-in="onSignIn"
  />

  <!-- Normal festival page -->
  <div v-else class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as /, /festivals, /organizers -->
    <SiteHeader />

    <div ref="heroRef">
      <FestivalHero :festival="festival" :picked="yearPlanIds.has(festival.slug)" @pick="onPick" />
    </div>

    <!-- Section anchor nav — V3 restyled. Festival identity slides in on
         the left once the hero has scrolled out of view, so a deep-link
         (Buy Tickets from the official site) always shows which festival
         you're on. The active section is highlighted and tracks scroll. -->
    <nav class="sticky top-0 z-20 border-b" style="background:rgba(251, 245, 234, 0.95); backdrop-filter: blur(8px); border-color:#3b1f0d22;">
      <div class="max-w-4xl mx-auto flex items-center gap-2 px-4 min-w-0">
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-x-2"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 -translate-x-2"
        >
          <NuxtLink
            v-if="!heroVisible"
            :to="`/festivals/${festival.slug}`"
            class="flex items-center gap-2 shrink-0 pr-3 mr-1 border-r"
            style="border-color:#3b1f0d15;"
            @click.prevent="scrollTo('about')"
          >
            <img
              v-if="festival.logo"
              :src="festival.logo"
              :alt="festival.name"
              class="w-6 h-6 rounded-full shrink-0"
            >
            <div
              v-else
              class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              :style="{ background: festival.accentColor }"
            >
              {{ festival.name.charAt(0) }}
            </div>
            <span class="text-sm font-bold whitespace-nowrap hidden sm:inline" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              {{ festival.name }}
            </span>
          </NuxtLink>
        </Transition>
        <div class="flex gap-0 overflow-x-auto min-w-0">
          <button
            v-for="section in sections"
            :key="section"
            type="button"
            class="relative px-3 py-3 text-sm italic whitespace-nowrap transition-colors"
            :style="{
              color: activeSection === section ? festival.accentColor : '#5b3a1d',
              fontWeight: activeSection === section ? 700 : 400,
              fontFamily: 'Playfair Display, serif',
            }"
            @click="scrollTo(section)"
          >
            {{ sectionLabels[section] }}
            <span
              v-if="activeSection === section"
              class="absolute left-3 right-3 bottom-0 h-[2px] rounded-full"
              :style="{ background: festival.accentColor }"
            />
          </button>
        </div>
      </div>
    </nav>

    <div class="max-w-3xl mx-auto px-4 space-y-14 pt-8 pb-20">
        <section id="about" class="scroll-mt-12">
          <AboutTab :festival="festival" />
        </section>

        <section id="discover" class="scroll-mt-16">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-2xl font-black leading-tight" style="color:#3b1f0d;">Shall we <em class="italic" style="color:#dc2626;">dance?</em></h2>
            <span v-if="!isSignedIn && freeSpotsLeft > 0" class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style="background:#16a34a18; color:#16a34a;">
              {{ freeSpotsLeft }} free {{ freeSpotsLeft === 1 ? 'spot' : 'spots' }} left
            </span>
            <span v-else-if="!isSignedIn" class="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style="background:#f59e0b18; color:#f59e0b;">
              From &euro;1
            </span>
          </div>
          <p class="text-sm mb-4" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Swipe to discover dancers, group dinners, and activities happening around the festival.</p>
          <DiscoverDancers
            :dancers="discoverDancers"
            :cards="swipeCards"
            :workshops="workshops"
            :plan-ids="planIds"
            :is-signed-in="isSignedIn"
            :freemium-state="freemiumState"
            @sign-in="onSignIn"
            @onboarding-complete="onOnboardingComplete"
            @join-dinner="joinDinner"
            @join-activity="joinActivity"
            @show-paywall="showSocialPaywall = true"
          />
        </section>

        <section id="activities" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-1" style="color:#3b1f0d;">Activities</h2>
          <p class="text-sm mb-4" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Rides, rooms, dinners and more — connect with fellow dancers.</p>
          <ActivitiesTab
            :ride-shares="rideShares"
            :group-dinners="groupDinners"
            :extra-activities="extraActivities"
            :looking-for-roommate="lookingForRoommate"
            :is-signed-in="isSignedIn"
            @join-dinner="joinDinner"
            @join-activity="joinActivity"
            @post-ride="postRide"
            @toggle-roommate="toggleRoommate"
            @sign-in="onSignIn"
          />
        </section>

        <section v-if="isSignedIn" id="my-plan" class="scroll-mt-16">
          <MySpace
            :workshops="workshops"
            :plan-ids="planIds"
            :plan="plan"
            :is-signed-in="isSignedIn"
            :friends="friends"
            :partner-matches="partnerMatches"
            @sign-in="onSignIn"
            @invite-friends="onShare"
            @add-workshop="toggleWorkshop"
          />
        </section>

        <section id="lineup" class="scroll-mt-16">
          <div class="flex items-baseline justify-between gap-3 mb-1">
            <h2 class="text-2xl font-black leading-tight" style="color:#3b1f0d;">Lineup</h2>
            <button
              v-if="selectedTeacherId"
              type="button"
              class="text-xs font-bold whitespace-nowrap"
              style="color:#dc2626; font-family: system-ui, sans-serif;"
              @click="selectedTeacherId = null"
            >
              Clear filter ✕
            </button>
          </div>
          <p class="text-sm mb-4" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Tap an artist to filter the schedule to their sessions — or open their full profile.</p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ArtistCard
              v-for="c in lineupCards"
              :key="c.teacher.id"
              :artist="c.teacher"
              :accent="c.accent"
              :origin="c.origin"
              :residence="c.residence"
              :languages="c.languages"
              selectable
              :selected="selectedTeacherId === c.teacher.id"
              @select="toggleTeacherFilter(c.teacher.id)"
            />
          </div>
        </section>

        <section id="schedule" class="scroll-mt-16">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-black leading-tight" style="color:#3b1f0d;">Schedule</h2>
            <button
              v-if="selectedTeacherId"
              type="button"
              class="text-xs font-bold flex items-center gap-1"
              style="color:#dc2626; font-family: system-ui, sans-serif;"
              @click="selectedTeacherId = null"
            >
              Filtering by {{ selectedTeacher?.name }}
              <span style="color:#9a5614;">✕</span>
            </button>
          </div>
          <ScheduleTab
            :workshops="workshops"
            :teachers="teachers"
            :days="days"
            :styles="styles"
            :plan-ids="planIds"
            :selected-teacher-id="selectedTeacherId"
            :start-date="festival.startDate"
            :festival-slug="festival.slug"
            @toggle-workshop="toggleWorkshop"
          />
        </section>

        <section v-if="festival.tickets?.length" id="tickets" class="scroll-mt-16">
          <div class="mb-4">
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Passes</div>
            <h2 class="mt-2 text-2xl font-black leading-tight" style="color:#3b1f0d;">
              Pick your <em class="italic" style="color:#dc2626;">pass.</em>
            </h2>
          </div>

          <!-- Smart recommendation for the dancer's current plan -->
          <div
            v-if="recommendation"
            class="rounded-2xl p-5 sm:p-6 mb-6"
            style="background:linear-gradient(135deg, #fef3c7, #fee2e2); border:1px solid #dc262633;"
          >
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style="background:white;">
                <Sparkles class="w-5 h-5" style="color:#dc2626;" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#dc2626;">
                  Best value for your plan
                </div>
                <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span class="text-lg font-black" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
                    {{ recommendation.tickets.map(t => t.name).join(' + ') }}
                  </span>
                  <span class="text-2xl font-black" style="font-family:'Playfair Display', serif; color:#dc2626;">
                    €{{ recommendation.total }}
                  </span>
                  <span
                    v-if="recommendation.savings"
                    class="text-xs font-bold px-2 py-0.5 rounded-full"
                    style="background:#16a34a18; color:#16a34a; font-family: system-ui, sans-serif;"
                  >
                    saves €{{ recommendation.savings }}
                  </span>
                </div>
                <div class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  Covers your {{ plannedWorkshopCount }} workshop{{ plannedWorkshopCount === 1 ? '' : 's' }}<span v-if="hasPartyInPlan"> + parties</span>
                  across {{ plannedDays.size }} day{{ plannedDays.size === 1 ? '' : 's' }}.
                </div>
                <button
                  v-if="!recommendation.soldOut"
                  type="button"
                  class="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider"
                  style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 3px 0 -1px #b91c1c;"
                  @click="getRecommendedPass"
                >
                  Get this pass <ArrowRight class="w-3.5 h-3.5" />
                </button>
                <div
                  v-else
                  class="mt-3 text-xs italic"
                  style="color:#5b3a1d; font-family:'Playfair Display', serif;"
                >
                  Sold out — we'll notify you when a dancer offers theirs.
                </div>
              </div>
            </div>
          </div>

          <!-- Nudge: no plan yet -->
          <NuxtLink
            v-else
            to="#schedule"
            class="rounded-2xl p-5 mb-6 flex items-center gap-3 border-2 border-dashed transition-colors hover:bg-white/60"
            style="border-color:#3b1f0d33; background:rgba(255,255,255,0.4);"
            @click="scrollTo('schedule')"
          >
            <Sparkles class="w-6 h-6 shrink-0" style="color:#9a5614;" />
            <div>
              <div class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
                Not sure which pass?
              </div>
              <div class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                Pick the workshops + parties you want in the schedule above — we'll find your best-value pass.
              </div>
            </div>
            <ArrowRight class="w-4 h-4 ml-auto shrink-0" style="color:#dc2626;" />
          </NuxtLink>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(t, i) in festival.tickets"
              :key="t.name"
              class="relative rounded-2xl bg-white p-5 border transition-all"
              :class="isTopPass(t, i) ? 'md:-translate-y-1' : ''"
              :style="{
                borderColor: (isTopPass(t, i) ? '#dc2626' : '#3b1f0d22'),
                borderWidth: isTopPass(t, i) ? '2px' : '1px',
                boxShadow: isTopPass(t, i)
                  ? '6px 8px 0 -2px #dc2626, 0 12px 28px rgba(59,31,18,0.08)'
                  : '0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04)',
                opacity: t.soldOut ? 0.75 : 1,
              }"
            >
              <div
                v-if="isTopPass(t, i) && !t.soldOut"
                class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap"
                style="background:#dc2626;"
              >
                {{ recommendation ? 'Recommended for you' : 'Best value' }}
              </div>
              <div
                v-if="t.soldOut"
                class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap"
                style="background:#5b3a1d;"
              >
                Sold out
              </div>

              <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
                {{ t.name }}
              </div>
              <div class="mt-2 mb-1 flex items-baseline gap-1">
                <span class="text-4xl font-black" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
                  €{{ t.price }}
                </span>
              </div>
              <p v-if="t.description" class="text-sm mb-4" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                {{ t.description }}
              </p>

              <div class="flex flex-wrap gap-1.5 mb-4">
                <span
                  v-if="t.days.length === 0 && !t.includesParty"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style="background:#16a34a18; color:#16a34a;"
                >
                  All days
                </span>
                <span
                  v-for="d in t.days"
                  :key="d"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style="background:#0891b218; color:#0891b2;"
                >
                  {{ d }}
                </span>
                <span
                  v-if="t.includesParty"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style="background:#a855f718; color:#a855f7;"
                >
                  Parties incl.
                </span>
                <span
                  v-if="t.workshopCount !== undefined && t.workshopCount !== null"
                  class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style="background:#f59e0b18; color:#f59e0b;"
                >
                  {{ t.workshopCount }} workshop{{ t.workshopCount === 1 ? '' : 's' }}
                </span>
              </div>

              <button
                v-if="!t.soldOut"
                type="button"
                class="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full text-white text-xs font-bold uppercase tracking-wider transition-transform hover:-translate-y-0.5"
                :style="i === 0
                  ? { background: 'linear-gradient(135deg, #dc2626, #f97316)', boxShadow: '0 3px 0 -1px #b91c1c' }
                  : { background: '#3b1f0d' }"
                @click="chooseTicket(t)"
              >
                Get this pass
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
              <div
                v-else
                class="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider"
                style="background:#3b1f0d0a; color:#9a5614;"
              >
                No longer available
              </div>
            </div>
          </div>
        </section>

        <section id="venue" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-4" style="color:#3b1f0d;">Venue</h2>
          <VenueTab :venue="festival.venue" />
        </section>
    </div>

    <!-- Soft dashboard nudge — only when the user has picks in this
         festival. Replaces the old desktop sidebar + mobile drawer.
         Everything else moved to /my-plan. -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <NuxtLink
          v-if="planIds.size > 0"
          to="/my-plan"
          class="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all"
          :style="{ background: festival.accentColor, boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 3px 0 -1px rgba(0,0,0,0.15)' }"
        >
          <span
            class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black bg-white"
            :style="{ color: festival.accentColor }"
          >{{ planIds.size }}</span>
          <span style="font-family:'Playfair Display', serif; letter-spacing:0.01em;">in your plan</span>
          <span style="font-family:'Caveat', cursive; font-size:16px; opacity:0.85;">— see dashboard</span>
          <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </Transition>
    </Teleport>

    <RolePickerModal
      v-model:open="showRolePicker"
      :workshop-title="rolePickerTitle"
      :remembered-role="rememberedRole"
      :partners="partners"
      @confirm="onRoleConfirm"
      @add-partner="addPartner"
    />

    <SignUpModal v-model:open="showSignUp" :action="signUpAction" :prefill="signUpPrefill" />

    <!-- WeDance ticket checkout — buying happens here, on WeDance. -->
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
          v-if="showCheckout && selectedTicket"
          class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
          @click.self="showCheckout = false"
        >
          <div
            class="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
            style="background:#fbf5ea;"
          >
            <!-- Header band -->
            <div class="p-5 sm:p-6" style="background:linear-gradient(135deg, #dc2626, #f97316);">
              <div class="flex items-center gap-2 text-white/90 text-[10px] font-bold uppercase tracking-[0.3em]">
                <img src="/icon.svg" alt="" class="w-4 h-4 brightness-0 invert" >
                Checkout on WeDance
              </div>
              <div class="mt-2 text-2xl font-black leading-tight text-white" style="font-family:'Playfair Display', serif;">
                {{ festival.name }}
              </div>
              <div class="text-xs text-white/85 mt-0.5" style="font-family: system-ui, sans-serif;">
                {{ selectedTicket.name }}
              </div>
            </div>

            <div class="p-5 sm:p-6">
              <!-- Price row -->
              <div class="flex items-baseline justify-between pb-4 mb-4 border-b" style="border-color:#3b1f0d15;">
                <div class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  {{ selectedTicket.name }}
                </div>
                <div class="text-3xl font-black" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
                  €{{ selectedTicket.price }}
                </div>
              </div>

              <!-- What you get -->
              <ul class="space-y-2 mb-5 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                <li class="flex items-start gap-2">
                  <Check class="w-4 h-4 shrink-0 mt-0.5" style="color:#16a34a;" />
                  <span v-if="selectedTicket.description">{{ selectedTicket.description }}</span>
                  <span v-else>Access to {{ festival.name }}</span>
                </li>
                <li class="flex items-start gap-2">
                  <Check class="w-4 h-4 shrink-0 mt-0.5" style="color:#16a34a;" />
                  <span>Your face on the event page — <strong style="color:#3b1f0d;">see who else is going</strong></span>
                </li>
                <li class="flex items-start gap-2">
                  <Check class="w-4 h-4 shrink-0 mt-0.5" style="color:#16a34a;" />
                  <span>Plan workshops, find a partner, share your plan</span>
                </li>
              </ul>

              <div v-if="checkoutError" class="mb-3 rounded-lg px-4 py-2 text-sm text-center" style="background:#fef2f2; color:#dc2626; font-family: system-ui, sans-serif;">
                {{ checkoutError }}
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
                style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
                :disabled="checkoutLoading"
                @click="startTicketCheckout"
              >
                <template v-if="checkoutLoading">Taking you to payment…</template>
                <template v-else-if="!isSignedIn">Sign in &amp; pay €{{ selectedTicket.price }}</template>
                <template v-else>Pay €{{ selectedTicket.price }} <ArrowRight class="w-4 h-4" /></template>
              </button>

              <div class="mt-3 text-center text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:16px;">
                — secure payment · instant confirmation
              </div>

              <button
                type="button"
                class="mt-3 w-full text-xs italic hover:underline"
                style="color:#9a5614; font-family: system-ui, sans-serif;"
                @click="showCheckout = false"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <SharePlanModal
      v-model:open="showSharePlan"
      :workshops="workshops"
      :teachers="teachers"
      :plan="plan"
      :plan-ids="planIds"
      :festival-name="festival.name"
      :festival-slug="festival.slug"
    />

    <Teleport to="body">
      <div
        v-if="showSocialPaywall"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
        @click.self="showSocialPaywall = false"
      >
        <div class="bg-background rounded-lg p-6 mx-4 max-w-sm space-y-4">
          <div class="text-center space-y-2">
            <Sparkles class="w-8 h-8 text-primary mx-auto" />
            <h3 class="text-sm font-semibold">Unlock social activities</h3>
            <p class="text-xs text-muted-foreground">
              All {{ freemiumState.maxFreeSpots }} free spots have been claimed. Unlock rides, dinners, and activities for just &euro;1.
            </p>
          </div>
          <Button
            class="w-full"
            size="sm"
            :disabled="paymentLoading"
            @click="startCheckout"
          >
            {{ paymentLoading ? 'Redirecting...' : 'Unlock for €1' }}
          </Button>
          <button
            class="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            @click="showSocialPaywall = false"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Teleport>

    <ClientOnly>
      <section id="reviews" class="max-w-4xl mx-auto px-4 pb-10 scroll-mt-16">
        <ReviewsSection target-type="festival" :target-slug="festival.slug" :target-name="festival.name" />
      </section>
    </ClientOnly>

    <SiteFooter />
  </div>
</template>
