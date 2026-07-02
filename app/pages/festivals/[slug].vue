<script setup lang="ts">
import type { PlanEntry, DanceRole, DancePartner, FestivalFriend, PartnerMatch, DiscoverDancer, ExtraActivity, RideShare, SwipeCard, FreemiumState } from '~/types/festival'
import * as salsaOpen from '~/data/mock-festival'
import * as meneate from '~/data/mock-meneate'
import * as cubanFire from '~/data/mock-cuban-fire'
import * as caribbeanUrbanFire from '~/data/mock-caribbean-urban-fire'

const route = useRoute()
const router = useRouter()

const festivals: Record<string, { festival: typeof salsaOpen.mockFestival; workshops: typeof salsaOpen.mockWorkshops; teachers: typeof salsaOpen.mockTeachers }> = {
  'salsa-open-berlin-2026': { festival: salsaOpen.mockFestival, workshops: salsaOpen.mockWorkshops, teachers: salsaOpen.mockTeachers },
  'meneate-viena-2026': { festival: meneate.mockFestival, workshops: meneate.mockWorkshops, teachers: meneate.mockTeachers },
  'cuban-fire-munich-2026': { festival: cubanFire.mockFestival, workshops: cubanFire.mockWorkshops, teachers: cubanFire.mockTeachers },
  'caribbean-urban-fire-munich-2026': { festival: caribbeanUrbanFire.mockFestival, workshops: caribbeanUrbanFire.mockWorkshops, teachers: caribbeanUrbanFire.mockTeachers },
}

const data = festivals[route.params.slug as string] || festivals['meneate-viena-2026']
const festival = data.festival
const workshops = data.workshops
const teachers = data.teachers

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
const sections = ['about', 'discover', 'activities', 'lineup', 'schedule', 'venue'] as const
const sectionLabels: Record<string, string> = {
  'about': 'About',
  'discover': 'Shall we dance?',
  'activities': 'Activities',
  'lineup': 'Lineup',
  'schedule': 'Schedule',
  'venue': 'Venue',
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
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
    @sign-in="onSignIn"
  />

  <!-- Normal festival page -->
  <div v-else class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header — same as /, /festivals, /organizers -->
    <header class="border-b" style="border-color:#3b1f0d33; background:#fbf5ea;">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-baseline gap-2">
          <span class="font-bold text-lg">WeDance</span>
          <span class="text-[10px] uppercase tracking-[0.25em]" style="color:#9a5614;">Summer Edition · 2026</span>
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/festivals" class="italic hover:underline">Festivals</NuxtLink>
          <NuxtLink to="/cities" class="italic hover:underline">Cities</NuxtLink>
          <NuxtLink to="/for-events" class="italic hover:underline hidden sm:inline">For events</NuxtLink>
          <NuxtLink to="/organizers" class="italic hover:underline hidden sm:inline">For organizers</NuxtLink>
        </nav>
      </div>
    </header>

    <FestivalHero :festival="festival" />

    <!-- Section anchor nav — V3 restyled -->
    <nav class="sticky top-0 z-20 border-b overflow-x-auto" style="background:rgba(251, 245, 234, 0.95); backdrop-filter: blur(8px); border-color:#3b1f0d22;">
      <div class="max-w-4xl mx-auto flex gap-0 px-4 min-w-0">
        <button
          v-for="section in sections"
          :key="section"
          type="button"
          class="px-4 py-3 text-sm italic whitespace-nowrap transition-all"
          style="color:#5b3a1d; font-family:'Playfair Display', serif;"
          @click="scrollTo(section)"
        >
          {{ sectionLabels[section] }}
        </button>
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
          <h2 class="text-2xl font-black leading-tight mb-1" style="color:#3b1f0d;">Lineup</h2>
          <p class="text-sm mb-3" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Tap an artist to see their profile and filter the schedule.</p>
          <Lineup
            :teachers="teachers"
            :selected-id="selectedTeacherId"
            @select="selectedTeacherId = $event"
          />
          <TeacherProfile
            v-if="selectedTeacher"
            :teacher="selectedTeacher"
            class="mt-4"
            @close="selectedTeacherId = null"
          />
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
            @toggle-workshop="toggleWorkshop"
          />
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
  </div>
</template>
