<script setup lang="ts">
/**
 * /my-year — "Your <year> in dance" (RAZ-966): the look back at the dancer's
 * year, and nothing else. Planning and sharing the festival year live in
 * My plan ("This year").
 *
 * `?user=<handle or id>` is a friend's festival year (RAZ-897): the link on the
 * year story posted from My plan leads here, so that view stays.
 */
import type { YearPlanFestival, DanceRole } from '~/types/festival'
import { Button } from '~/components/ui/button'
import { festivalPath } from '#shared/utils/eventSlug'
import type { YearReview } from '#shared/utils/yearReview'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()

// Shared view detection — ?user=<username>.
const sharerUsername = computed(() => {
  const u = route.query.user as string | undefined
  if (!u) return ''
  return u === 'shared' ? '' : u
})
const isSharedView = computed(() => !!route.query.user)
const referralCode = computed(() => (route.query.ref as string) || '')

// ── Shared view: a friend's festival year ──
const sharedData = ref<{
  sharer: { name: string; photo: string | null; role: 'lead' | 'follow' | null; username: string | null }
  festivals: Array<{
    slug: string; name: string; startDate: string; endDate: string
    location: string; country: string; logo: string; accentColor: string; styles: string[]
    workshopCount: number; hasTicket: boolean; referralDiscountPercent: number
    ticketUrl: string; earlyBirdDeadline: string; earlyBirdOffer: string
  }>
} | null>(null)
const sharedLoaded = ref(false)

// The viewer's own festival slugs (the shared view marks the ones in common).
const viewerFestivalSlugs = ref<string[]>([])
// friendsGoing per festival slug.
const goingBySlug = ref<Record<string, Array<{ name: string; photo: string | null; username: string | null }>>>({})

function fetchViewerSlugs() {
  if (!isSignedIn.value) return
  $trpc.plan.myPlan.query().then((rows) => { viewerFestivalSlugs.value = rows.map(r => r.slug) }).catch(() => {})
}

// ── Own view: your year in dance ──
const review = ref<YearReview | null>(null)
const reviewLoading = ref(false)
function fetchReview() {
  if (!isSignedIn.value) return
  reviewLoading.value = true
  $trpc.plan.yearReview.query()
    .then((r) => { review.value = r })
    .catch(() => {})
    .finally(() => { reviewLoading.value = false })
}

// Data loads after hydration, so the server and the client's first render match.
onMounted(() => {
  if (isSharedView.value) {
    if (sharerUsername.value) {
      $trpc.plan.sharedPlan.query({ username: sharerUsername.value }).then((result) => {
        sharedData.value = result
        sharedLoaded.value = true
        // The receiving end of plan_shared (no sharer handle: it's a person).
        if (result) useTrack().trackOnce(sharerUsername.value, 'shared_plan_viewed', { object: 'year', signed_in: isSignedIn.value, festivals: result.festivals.length, has_referral: !!route.query.ref })
        if (result?.festivals.length) {
          $trpc.plan.goingBatch.query({ itemType: 'festival', itemIds: result.festivals.map(f => f.slug) })
            .then((g) => { goingBySlug.value = g })
            .catch(() => {})
        }
      }).catch(() => { sharedLoaded.value = true })
    } else {
      sharedLoaded.value = true
    }
    fetchViewerSlugs()
  } else {
    fetchReview()
  }

  // Signed in on this page (the sign-in modal): load what was waiting for it.
  watch(isSignedIn, (signedIn) => {
    if (!signedIn) return
    if (isSharedView.value) fetchViewerSlugs()
    else fetchReview()
  })
})

const sharedFestivals = computed<YearPlanFestival[]>(() => {
  if (!sharedData.value) return []
  return sharedData.value.festivals.map((f) => ({
    slug: f.slug,
    name: f.name,
    startDate: f.startDate,
    endDate: f.endDate,
    location: f.location,
    country: f.country,
    logo: f.logo,
    accentColor: f.accentColor,
    styles: f.styles,
    workshopCount: f.workshopCount,
    role: null,
    lookingCount: 0,
    ticketStatus: f.hasTicket ? 'purchased' as const : 'not-purchased' as const,
    friendsGoing: (goingBySlug.value[f.slug] ?? []).map(d => ({ name: d.name, photo: d.photo ?? '' })),
    referralDiscountPercent: f.referralDiscountPercent,
    earlyBirdDeadline: f.earlyBirdDeadline || undefined,
    earlyBirdOffer: f.earlyBirdOffer || undefined,
    ticketUrl: f.ticketUrl || undefined,
  }))
})

const sharer = computed(() => {
  if (!sharedData.value) return { name: '', photo: '', role: null as DanceRole | null }
  return {
    name: sharedData.value.sharer.name,
    photo: sharedData.value.sharer.photo ?? '',
    role: sharedData.value.sharer.role as DanceRole | null,
  }
})

const showSignIn = ref(false)
const signInAction = ref('signin')
function promptSignIn(action: string) {
  signInAction.value = action
  showSignIn.value = true
}

function openFestival(slug: string) {
  const query: Record<string, string> = { plan: 'shared' }
  if (referralCode.value) query.ref = referralCode.value
  router.push({ path: festivalPath(slug), query })
}

/** "Create your own year plan" from a friend's year: the festival year is planned in My plan. */
function onCreateYearPlan() {
  if (!isSignedIn.value) {
    promptSignIn('save')
    return
  }
  navigateTo('/my-plan#festivals')
}

function onAddFriend() {
  useTrack().track('shared_plan_signup', { surface: 'my-year', sharer: sharerUsername.value || null })
  if (!isSignedIn.value) {
    promptSignIn('social')
    return
  }
  navigateTo('/onboarding')
}

useHead({
  title: () => isSharedView.value
    ? `${sharer.value.name || 'A dancer'}'s dance year | WeDance`
    : `Your ${review.value?.year ?? ''} in dance | WeDance`.replace('  ', ' '),
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main>
    <!-- Shared view -->
    <SharedYearPlan
      v-if="isSharedView && sharedData"
      :sharer="sharer"
      :festivals="sharedFestivals"
      :viewer-festival-slugs="viewerFestivalSlugs"
      :referral-code="referralCode"
      @add-friend="onAddFriend"
      @open-festival="openFestival"
      @create-year-plan="onCreateYearPlan"
      @sign-in="onAddFriend"
    />

    <!-- Loading for shared view -->
    <div v-else-if="isSharedView && !sharedLoaded" class="max-w-3xl mx-auto px-4 py-16" aria-busy="true">
      <p class="sr-only" role="status">Loading this year plan…</p>
      <div class="h-40 rounded-2xl bg-muted animate-pulse" aria-hidden="true" />
    </div>

    <!-- Not found for shared view -->
    <div v-else-if="isSharedView && !sharedData" class="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 class="text-muted-foreground">This year plan is not available.</h1>
      <Button class="mt-4" @click="onCreateYearPlan">
        Create your own year plan
      </Button>
    </div>

    <!-- Own view: your year in dance -->
    <YearReview
      v-else
      :review="review"
      :loading="reviewLoading"
      :signed-in="isSignedIn"
      @sign-in="promptSignIn('signin')"
      @plan-next="navigateTo('/my-plan#festivals')"
    />

    <SignUpModal v-model:open="showSignIn" :action="signInAction" />
    </main>

    <SiteFooter />
  </div>
</template>
