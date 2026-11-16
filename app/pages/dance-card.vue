<script setup lang="ts">
/**
 * /dance-card — "Your dance card" (RAZ-1005) for a signed-in dancer: the same two
 * cards signed-out visitors make on /meet (DiscoverDancers' onboarding cards —
 * Lead / Follow + a level per dance, then the live-preview profile card with
 * photo, name, city, bio), started from what the dancer already has and saved
 * to their profile. "Add a photo" / "Make it public" lead here (after signing
 * up to a night, on /meet) instead of the long Settings form.
 * `?back=/events/…` returns to where the dancer came from.
 */
import { ArrowLeft, ArrowRight, Check, Lock } from 'lucide-vue-next'
import { meetVisibility } from '#shared/utils/meetFriends'
import type { DanceCardPrefill, DanceCardResult, SwipeCard } from '~/types/festival'
import type { DiscoverMe } from '~~/server/utils/myPlanFeeds'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Your dance card', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { $trpc } = useNuxtApp()
const {
  isSignedIn, isLoading, dancerName, city, danceStyles, danceLevels, role, bio, photo, profilePublic, updateProfile,
} = useAuth()

watch([isLoading, isSignedIn], ([loadingNow, signedIn]) => {
  if (!loadingNow && !signedIn) navigateTo('/meet')
}, { immediate: true })

/** Only a path on this site — never `//other.host`. */
const back = computed(() => {
  const b = typeof route.query.back === 'string' ? route.query.back : ''
  return b.startsWith('/') && !b.startsWith('//') ? b : null
})

/** The dances on the card: the dancer's own first, then the ones the /meet card offers. */
const COMMON_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Tango']

// The card starts from the profile as it is now (on load, and again on "Edit again").
const prefill = ref<DanceCardPrefill | null>(null)
const cards = ref<SwipeCard[]>([])
const saved = ref(false)
const cardKey = ref(0)
function startCard() {
  const mine = [...(danceStyles.value ?? [])]
  prefill.value = {
    role: role.value, styles: mine, levels: { ...(danceLevels.value as DanceCardPrefill['levels']) },
    name: dancerName.value ?? '', city: city.value ?? '', bio: bio.value ?? '', photo: photo.value ?? '',
  }
  cards.value = [
    { id: 'onboarding-dancecard', cardType: 'onboarding-dancecard', availableStyles: [...new Set([...mine, ...COMMON_STYLES])] },
    { id: 'onboarding-profile', cardType: 'onboarding-profile' },
  ]
  saved.value = false
  cardKey.value++
}
watch(isLoading, (loadingNow) => { if (!loadingNow && !prefill.value) startCard() }, { immediate: true })
const NO_PLAN = new Set<string>()

// My next night out — whether others can see me.
const me = ref<DiscoverMe | null>(null)
onMounted(async () => {
  try { me.value = (await $trpc.plan.discover.query()).me } catch { /* the status line still says what's missing */ }
})
const visibility = computed(() => meetVisibility({
  profilePublic: profilePublic.value, photo: photo.value,
  nextNight: me.value?.nextNight ?? null, festivalsShown: me.value?.festivalsShown,
}))
const nightsLink = computed(() => me.value?.citySlug ? `/cities/${me.value.citySlug}` : '/my-plan#socials')

async function saveCard(card: DanceCardResult) {
  const hadPhoto = !!photo.value
  let newPhoto: string | undefined
  if (card.photoFile) {
    const body = new FormData()
    body.append('file', card.photoFile)
    const res = await fetch('/api/media/image?folder=avatars', { method: 'POST', body })
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.statusMessage || 'Could not upload the photo. Please try again.')
    newPhoto = (await res.json()).url
  }
  await updateProfile({
    role: card.role, danceStyles: card.styles, danceLevels: card.levels,
    name: card.name, city: card.city, bio: card.bio,
    ...(newPhoto ? { photo: newPhoto } : {}),
  })
  useTrack().track('dance_card_saved', {
    photo_added: !!newPhoto && !hadPhoto, photo_replaced: !!newPhoto && hadPhoto,
    styles: card.styles.length, surface: back.value ? 'back_link' : 'direct',
  })
  saved.value = true
}

// --- Public: one tap ---
const publishing = ref(false)
async function makePublic() {
  publishing.value = true
  try { await updateProfile({ profilePublic: true }) } finally { publishing.value = false }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main class="max-w-md mx-auto px-4 pt-8 pb-16 font-sans">
      <NuxtLink :to="back ?? '/meet'" class="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline" data-testid="dance-card-back">
        <ArrowLeft class="size-4" aria-hidden="true" /> {{ back ? 'Back' : 'Meet new friends' }}
      </NuxtLink>

      <h1 class="mt-4 text-4xl leading-tight font-display text-foreground">Your dance card</h1>
      <p class="mt-1 text-sm text-muted-foreground">What dancers going out near you see in Meet new friends.</p>

      <p
        class="mt-4 text-sm font-bold"
        :class="visibility.shown ? 'text-wd-green-700' : 'text-muted-foreground'"
        role="status"
        data-testid="dance-card-status"
      >
        {{ visibility.text }}
      </p>

      <div v-if="profilePublic === false" class="mt-4 rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3" data-testid="dance-card-private">
        <Lock class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p class="flex-1 text-sm text-muted-foreground">Your profile is private, so nobody sees your card.</p>
        <Button variant="outline" size="pill-sm" :loading="publishing" data-testid="dance-card-make-public" @click="makePublic">Make it public</Button>
      </div>

      <!-- The same dance card as on /meet, saved to the profile -->
      <div v-if="!saved && prefill" class="mt-6" data-testid="dance-card">
        <DiscoverDancers
          :key="cardKey"
          festival-slug=""
          item-type="event"
          :extra-cards="cards"
          :workshops="[]"
          :plan-ids="NO_PLAN"
          :is-signed-in="false"
          :dance-card-prefill="prefill"
          :save-dance-card="saveCard"
        />
      </div>
      <div v-else-if="saved" class="mt-6 rounded-2xl border border-border bg-card px-4 py-4 space-y-2" data-testid="dance-card-saved">
        <p class="inline-flex items-center gap-1.5 font-bold text-wd-green-600"><Check class="size-4" aria-hidden="true" /> Your dance card is saved</p>
        <p v-if="!me?.nextNight" class="text-sm text-muted-foreground">
          It shows up once you’re going to a night out.
          <NuxtLink :to="nightsLink" class="font-bold text-primary hover:underline whitespace-nowrap">Find a night <ArrowRight class="inline size-3.5" aria-hidden="true" /></NuxtLink>
        </p>
        <div class="flex flex-wrap items-center gap-3 pt-1">
          <Button as-child variant="cta" size="pill-sm">
            <NuxtLink :to="back ?? '/meet'" data-testid="dance-card-done">{{ back ? 'Back' : 'Meet who’s going' }} <ArrowRight aria-hidden="true" /></NuxtLink>
          </Button>
          <Button variant="link" class="h-auto p-0 text-sm" data-testid="dance-card-edit" @click="startCard">Edit again</Button>
        </div>
      </div>
    </main>
  </div>
</template>
