<script setup lang="ts">
/**
 * /meet — "Meet new friends" (RAZ-989): the people deck on its own page. It used
 * to be the first section of My plan; My plan now links here
 * (`MeetFriendsEntry`). Only dancers going somewhere (RAZ-981): signed up to
 * a night out near you in the next two weeks — the card links to it — or going
 * to a festival with "Show me" on (plan.discover). Yes / Skip are stored
 * in discover_swipes; two yeses for the same festival become the "add it to
 * your year" nudge in My plan's This year.
 *
 * ?preview=1 shows example dancers and never writes.
 */
import { ArrowLeft, ArrowRight, MapPin, Plane, Heart, X, Clock, Undo2 } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { festivalPath } from '#shared/utils/eventSlug'
import { meetVisibility } from '#shared/utils/meetFriends'
import { toMeetCards, type MeetCard } from '~/lib/meetDeck'
import { authPending } from '~/lib/planView'
import { WD } from '~/lib/brand'
import type { SwipeCard, DanceRole } from '~/types/festival'
import type { LandingPerson } from '~/components/LandingFriendsDeck.vue'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Meet new friends',
  meta: [{ name: 'robots', content: 'noindex' }],
})

const route = useRoute()
const { $trpc } = useNuxtApp()
const {
  isSignedIn: isSignedInReal,
  city: dancerCityReal,
  danceStyles: dancerStylesReal,
  photo: dancerPhotoReal,
  profilePublic: dancerPublicReal,
  isLoading: authLoading,
  authHint,
} = useAuth()

const previewMode = computed(() => route.query.preview === '1')
const isSignedIn = computed(() => isSignedInReal.value || previewMode.value)
const dancerCity = computed(() => previewMode.value ? 'Munich' : (dancerCityReal.value || null))

const PREVIEW_DECK: MeetCard[] = [
  { id: 'd1', kind: 'dancer-your-fest', name: 'Ivana', city: 'Berlin', photo: 'https://i.pravatar.cc/240?u=ivana', danceStyles: ['Timba', 'Son'], festivalSlug: 'meneate-viena-2026', festivalName: 'Menéate Viena', festivalColor: WD.red600, reason: 'You both dance Timba — and she\'s at Menéate Viena too.' },
  { id: 'd2', kind: 'dancer-new-fest', name: 'Emilia', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=emilia', danceStyles: ['Timba', 'Salsa'], festivalSlug: 'timba-fest-london-2026', festivalName: 'Timba Fest London', festivalColor: WD.sky500, reason: 'She dances Timba in Munich — and heads to a Timba festival you haven\'t picked.' },
  { id: 'd3', kind: 'dancer-same-night', name: 'Klaus', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=klaus', danceStyles: ['Salsa', 'Bachata'], night: { path: '', name: 'Salsa Friday', when: 'Fri 21:00', venue: 'La Rumba' }, reason: 'You\'re both going to Salsa Friday — say hi there. You both dance Salsa.' },
  { id: 'd4', kind: 'dancer-new-fest', name: 'Sasha', city: 'Vienna', photo: 'https://i.pravatar.cc/240?u=sasha', danceStyles: ['Timba', 'Rumba'], festivalSlug: 'timba-fest-london-2026', festivalName: 'Timba Fest London', festivalColor: WD.sky500, reason: 'Timba dancer from Vienna heading to a festival not in your year yet.' },
  { id: 'd5', kind: 'dancer-your-fest', name: 'Silvio', city: 'Havana', photo: 'https://i.pravatar.cc/240?u=silvio', danceStyles: ['Bachata', 'Salsa'], festivalSlug: 'bachata-stars-barcelona-2026', festivalName: 'Bachata Stars Barcelona', festivalColor: WD.violet600, reason: 'Bachata dancer from Havana — also going to Bachata Stars Barcelona.' },
  { id: 'd6', kind: 'dancer-going-out', name: 'Barbara', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=barbara', danceStyles: ['Rumba', 'Son'], night: { path: '', name: 'Cuban Sunday practica', when: 'Sun 19:00', venue: 'Bar Tropical' }, reason: 'Going to Cuban Sunday practica. Join them, and you\'ll meet there.' },
]

// The chip links to the festival (RAZ-982) or the night (RAZ-981); preview cards are mock data with no page.
const NuxtLink = resolveComponent('NuxtLink')
const deck = ref<MeetCard[]>(route.query.preview === '1' ? [...PREVIEW_DECK] : [])
const deckLoaded = ref(route.query.preview === '1')
const swipeHistory = ref<Array<{ card: MeetCard; direction: 'yes' | 'skip' | 'later' }>>([])
/** Where I am shown myself: my next night out and the festivals I chose "Show me" for. */
const me = ref<{ citySlug: string; nextNight: { eventId: string; eventName: string; city: string } | null; festivalsShown: number } | null>(null)

async function loadDeck() {
  if (previewMode.value || !isSignedInReal.value) return
  try {
    const result = await $trpc.plan.discover.query()
    deck.value = toMeetCards(result.cards, { styles: dancerStylesReal.value })
    me.value = result.me
  } catch (err) {
    console.error('[meet] loading the deck failed:', err)
  } finally {
    deckLoaded.value = true
  }
}
// The deck needs the session, so it loads after hydration; again on sign-in here.
onMounted(loadDeck)
watch(isSignedInReal, (signedIn) => { if (signedIn) loadDeck() })

type View = 'signed-out' | 'loading' | 'deck'
const view = computed<View>(() => {
  if (!isSignedIn.value) {
    const pending = !previewMode.value && authPending({ server: import.meta.server, hasHint: !!authHint.value, authLoading: authLoading.value })
    return pending ? 'loading' : 'signed-out'
  }
  return deckLoaded.value ? 'deck' : 'loading'
})

const showAuth = ref(false)

// Signed out (moved from the landing, RAZ-981): three example dancers to swipe —
// two going to the same festival show the "for your year" nudge — then the
// visitor's own dance card (DiscoverDancers' onboarding cards) and a prefilled sign-up.
const LANDING_FRIENDS: LandingPerson[] = [
  { id: 'd2', name: 'Emilia', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=emilia', danceStyles: ['Timba', 'Salsa'], festivalName: 'Timba Fest London', festivalColor: WD.sky500, reason: 'She dances Timba in Munich — and heads to a Timba festival you haven\'t picked.' },
  { id: 'd3', name: 'Klaus', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=klaus', danceStyles: ['Salsa', 'Bachata'], night: 'Salsa Friday · La Rumba', reason: 'You both do Salsa — join him on Friday and you\'ll meet on the floor.' },
  { id: 'd4', name: 'Sasha', city: 'Vienna', photo: 'https://i.pravatar.cc/240?u=sasha', danceStyles: ['Timba', 'Rumba'], festivalName: 'Timba Fest London', festivalColor: WD.sky500, reason: 'Timba dancer from Vienna heading to a festival not in your year yet.' },
]
const LANDING_DANCE_CARD: SwipeCard[] = [
  { id: 'onboarding-dancecard', cardType: 'onboarding-dancecard', availableStyles: ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Tango'] },
  { id: 'onboarding-profile', cardType: 'onboarding-profile' },
]
const NO_PLAN = new Set<string>()
const signUpPrefill = ref<{ name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }>({})
function onLandingCardDone(role: DanceRole, styles: string[], name: string, city: string) {
  signUpPrefill.value = { name: name || undefined, danceStyles: styles, role: role as 'lead' | 'follow' | 'both', city: city || undefined }
}

const deckCurrent = computed(() => deck.value[0] ?? null)
const deckNext = computed(() => deck.value[1] ?? null)
const deckAfter = computed(() => deck.value[2] ?? null)
const canUndo = computed(() => swipeHistory.value.length > 0)

// Pointer-gesture state for the top card
const dragDx = ref(0)
const dragActive = ref(false)
const dragStartX = ref(0)
const dragPointerId = ref<number | null>(null)
const cardExitDir = ref<'yes' | 'skip' | 'later' | null>(null)

const SWIPE_THRESHOLD = 110

function currentCardTransform(): string {
  if (cardExitDir.value === 'yes') return 'translateX(120vw) rotate(18deg)'
  if (cardExitDir.value === 'skip') return 'translateX(-120vw) rotate(-18deg)'
  if (cardExitDir.value === 'later') return 'translateY(120vh) scale(0.9)'
  const dx = dragDx.value
  return `translateX(${dx}px) rotate(${dx * 0.06}deg)`
}

function onCardPointerDown(e: PointerEvent) {
  if (cardExitDir.value) return
  dragPointerId.value = e.pointerId
  dragStartX.value = e.clientX
  dragActive.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onCardPointerMove(e: PointerEvent) {
  if (!dragActive.value || e.pointerId !== dragPointerId.value) return
  dragDx.value = e.clientX - dragStartX.value
}

function onCardPointerUp(e: PointerEvent) {
  if (e.pointerId !== dragPointerId.value) return
  dragActive.value = false
  dragPointerId.value = null
  if (dragDx.value > SWIPE_THRESHOLD) commitSwipe('yes')
  else if (dragDx.value < -SWIPE_THRESHOLD) commitSwipe('skip')
  else dragDx.value = 0
}

/**
 * Yes / Skip are stored, so the card never comes back. "Later" only moves the
 * card to the back of the deck for this visit — nothing is stored.
 */
function commitSwipe(direction: 'yes' | 'skip' | 'later') {
  const card = deckCurrent.value
  if (!card || cardExitDir.value) return
  cardExitDir.value = direction

  if ((direction === 'yes' || direction === 'skip') && !previewMode.value && card.target) {
    $trpc.plan.discoverSwipe
      .mutate({ targetKind: card.target.kind, targetId: card.target.id, decision: direction, festivalSlug: card.target.festivalSlug })
      .catch(err => console.warn('[meet] swipe not saved:', err))
  }
  // added_festival / added_event stay for insights made before the deck was people only.
  if (!previewMode.value) useTrack().track('discover_swipe', { direction, card_kind: card.kind, added_festival: false, added_event: false, surface: 'meet' })

  // Animate out then advance
  setTimeout(() => {
    swipeHistory.value = [...swipeHistory.value, { card, direction }]
    deck.value = direction === 'later' ? [...deck.value.slice(1), card] : deck.value.slice(1)
    dragDx.value = 0
    cardExitDir.value = null
  }, 260)
}

function undoSwipe() {
  const last = swipeHistory.value[swipeHistory.value.length - 1]
  if (!last) return
  swipeHistory.value = swipeHistory.value.slice(0, -1)
  const card = last.card
  deck.value = [card, ...(last.direction === 'later' ? deck.value.filter(c => c.id !== card.id) : deck.value)]
  if (last.direction === 'later' || previewMode.value || !card.target) return
  $trpc.plan.discoverUnswipe
    .mutate({ targetKind: card.target.kind, targetId: card.target.id })
    .catch(err => console.warn('[meet] undo not saved:', err))
}

// RAZ-981: say who the deck shows, whether the dancer is in other people's
// decks, and what to do after a Yes (it is private — nobody is told).
const meVisible = computed(() => meetVisibility({
  profilePublic: previewMode.value ? true : dancerPublicReal.value,
  photo: previewMode.value ? 'preview' : dancerPhotoReal.value,
  nextNight: previewMode.value ? { eventName: 'Salsa Friday', city: 'Munich' } : me.value?.nextNight,
  festivalsShown: previewMode.value ? 1 : me.value?.festivalsShown,
}))
/** Nights to go to: the dancer's city page, else My plan's this week. */
const nightsLink = computed(() => me.value?.citySlug ? `/cities/${me.value.citySlug}` : '/my-plan#socials')
const isNightCard = (c: MeetCard): c is Extract<MeetCard, { night: unknown }> => c.kind === 'dancer-same-night' || c.kind === 'dancer-going-out'
/** The dancer card of the latest Yes, for the "now meet them" line under the deck. */
const lastYes = computed(() => {
  const last = swipeHistory.value[swipeHistory.value.length - 1]
  return last?.direction === 'yes' ? last.card : null
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main class="max-w-4xl mx-auto px-4 pt-8 pb-16">
      <NuxtLink to="/my-plan" class="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline font-sans" data-testid="meet-back">
        <ArrowLeft class="size-4" aria-hidden="true" /> My plan
      </NuxtLink>

      <div class="mt-4 flex items-baseline justify-between gap-4 mb-4">
        <div>
          <h1 class="text-4xl sm:text-5xl leading-tight font-display text-foreground">Meet new friends</h1>
          <p class="mt-1 text-sm text-muted-foreground font-sans">Dancers going out soon. Like someone? Meet them there.</p>
        </div>
        <Button
          v-if="view === 'deck'"
          variant="link"
          class="h-auto p-0 gap-1 text-xs font-normal italic text-secondary font-display disabled:opacity-40 [&_svg]:size-3"
          :disabled="!canUndo"
          @click="undoSwipe"
        >
          <Undo2 aria-hidden="true" /> Undo
        </Button>
      </div>

      <!-- SIGNED OUT: an example deck to play, then your own dance card → a prefilled sign-up. -->
      <section v-if="view === 'signed-out'" data-testid="meet-signed-out">
        <LandingFriendsDeck :people="LANDING_FRIENDS" @join="showAuth = true">
          <template #end="{ yeses }">
            <div data-testid="landing-dance-card">
              <p class="mb-3 text-center text-sm font-sans text-muted-foreground">
                <template v-if="yeses.length">You said yes to {{ yeses.map((p: { name: string }) => p.name).join(', ') }}. </template>
                <span class="font-bold text-foreground">Now you</span> — make your dance card so they can find you.
              </p>
              <DiscoverDancers
                festival-slug=""
                item-type="event"
                :extra-cards="LANDING_DANCE_CARD"
                :workshops="[]"
                :plan-ids="NO_PLAN"
                :is-signed-in="false"
                @sign-in="showAuth = true"
                @onboarding-complete="onLandingCardDone"
              />
            </div>
          </template>
        </LandingFriendsDeck>
        <p class="mt-6 text-center text-sm text-muted-foreground font-sans">
          These are examples. <button type="button" class="font-bold text-primary hover:underline" @click="showAuth = true">Join</button> to meet the real ones.
        </p>
        <SignUpModal v-model:open="showAuth" action="meet" :prefill="signUpPrefill" />
      </section>

      <!-- LOADING -->
      <section v-else-if="view === 'loading'" class="max-w-md mx-auto py-6" aria-busy="true" data-testid="meet-loading">
        <p class="sr-only" role="status">Loading dancers to meet…</p>
        <div class="h-[400px] rounded-3xl bg-muted animate-pulse" aria-hidden="true" />
      </section>

      <!-- THE DECK -->
      <section v-else data-testid="meet-deck">
        <!-- RAZ-981: one line — can others see you, and what to do if not. -->
        <p
          class="mb-6 mx-auto max-w-md flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-center font-sans"
          :class="meVisible.shown ? 'text-wd-green-700' : 'text-muted-foreground'"
          data-testid="meet-you"
        >
          <span>{{ meVisible.text }}</span>
          <NuxtLink v-if="meVisible.missing.includes('photo')" to="/settings" class="font-bold text-primary hover:underline whitespace-nowrap">
            Add a photo <ArrowRight class="inline w-3.5 h-3.5" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink v-else-if="meVisible.missing.includes('public')" to="/settings" class="font-bold text-primary hover:underline whitespace-nowrap">
            Make it public <ArrowRight class="inline w-3.5 h-3.5" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink v-else-if="meVisible.missing.includes('night')" :to="nightsLink" class="font-bold text-primary hover:underline whitespace-nowrap" data-testid="meet-find-night">
            Find a night <ArrowRight class="inline w-3.5 h-3.5" aria-hidden="true" />
          </NuxtLink>
        </p>

        <div class="relative mx-auto max-w-md">
          <!-- RAZ-1002: an empty deck is one thing to do about it. -->
          <MeetEmptyNext v-if="!deckCurrent" :preview="previewMode" :city="dancerCity" />

          <!-- min-height, not a fixed height: the card grows with its text. -->
          <div v-else class="relative min-h-[400px]">
            <div v-if="deckAfter" class="absolute inset-0 rounded-3xl bg-white border" style="transform: scale(0.88) translateY(20px); opacity:0.35; border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent); box-shadow: 0 6px 22px rgba(0,0,0,0.08);" />
            <div v-if="deckNext" class="absolute inset-0 rounded-3xl bg-white border" style="transform: scale(0.94) translateY(10px); opacity:0.65; border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent); box-shadow: 0 6px 22px rgba(0,0,0,0.08);" />
            <!-- Current card — gestures live here -->
            <div
              :key="deckCurrent.id"
              class="relative rounded-3xl bg-white border overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
              :style="{
                borderColor: 'color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                transform: currentCardTransform(),
                transition: dragActive || cardExitDir ? 'transform 260ms ease-out' : 'transform 220ms ease-out',
              }"
              data-testid="meet-card"
              @pointerdown="onCardPointerDown"
              @pointermove="onCardPointerMove"
              @pointerup="onCardPointerUp"
              @pointercancel="onCardPointerUp"
            >
              <div
                class="absolute top-6 left-6 z-10 px-3 py-1 rounded-full border-2 text-sm font-black uppercase tracking-widest pointer-events-none transition-opacity text-primary border-wd-red-600"
                style="transform: rotate(-10deg);"
                :style="{ opacity: Math.min(1, Math.max(0, -dragDx / 100)) }"
              >Skip</div>
              <div
                class="absolute top-6 right-6 z-10 px-3 py-1 rounded-full border-2 text-sm font-black uppercase tracking-widest pointer-events-none transition-opacity text-wd-green-600 border-wd-green-600"
                style="transform: rotate(10deg);"
                :style="{ opacity: Math.min(1, Math.max(0, dragDx / 100)) }"
              >Yes</div>

              <img :src="sizedImage(deckCurrent.photo, IMG.card)" :alt="deckCurrent.name" class="w-full h-64 object-cover" draggable="false">
              <div class="p-5">
                <div class="flex items-baseline justify-between gap-3">
                  <div class="text-xl font-black font-display text-foreground">
                    {{ deckCurrent.name }}
                  </div>
                  <div class="text-xs italic text-secondary font-display">
                    {{ deckCurrent.city }}
                  </div>
                </div>
                <!-- Context chip -->
                <component
                  :is="previewMode ? 'div' : NuxtLink"
                  v-if="deckCurrent.kind === 'dancer-your-fest' || deckCurrent.kind === 'dancer-new-fest'"
                  :to="previewMode ? undefined : festivalPath(deckCurrent.festivalSlug)"
                  class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold hover:underline"
                  :style="{ background: deckCurrent.festivalColor + '18', color: deckCurrent.festivalColor }"
                  @pointerdown.stop
                >
                  <Plane class="w-3 h-3" style="stroke-width:1.5;" />
                  <template v-if="deckCurrent.kind === 'dancer-your-fest'">Also going to {{ deckCurrent.festivalName }}</template>
                  <template v-else>Going to {{ deckCurrent.festivalName }} — you're not</template>
                </component>
                <component
                  :is="previewMode ? 'div' : NuxtLink"
                  v-else-if="isNightCard(deckCurrent)"
                  :to="previewMode ? undefined : deckCurrent.night.path"
                  class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-wd-green-600 hover:underline"
                  style="background:color-mix(in srgb, var(--wd-green-600) 9.4%, transparent);"
                  data-testid="meet-card-night"
                  @pointerdown.stop
                >
                  <MapPin class="w-3 h-3" style="stroke-width:1.5;" />
                  {{ deckCurrent.kind === 'dancer-same-night' ? 'Also going to' : 'Going to' }} {{ deckCurrent.night.name }} · {{ deckCurrent.night.when }}<template v-if="deckCurrent.night.venue"> · {{ deckCurrent.night.venue }}</template>
                </component>
                <div class="mt-3 flex flex-wrap gap-1">
                  <span
                    v-for="st in deckCurrent.danceStyles"
                    :key="st"
                    class="text-eyebrow font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-muted-foreground"
                    style="background:color-mix(in srgb, var(--wd-brown-900) 3.9%, transparent);"
                  >
                    {{ st }}
                  </span>
                </div>
                <p v-if="deckCurrent.reason" class="mt-3 text-xs italic leading-snug text-muted-foreground font-display">
                  {{ deckCurrent.reason }}
                </p>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div v-if="deckCurrent" class="mt-8 flex items-center justify-center gap-6">
            <button
              type="button"
              class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 text-primary"
              style="background:white; border:2px solid color-mix(in srgb, var(--wd-red-600) 33.3%, transparent);"
              aria-label="Skip"
              @click="commitSwipe('skip')"
            >
              <X class="w-6 h-6" />
            </button>
            <button
              type="button"
              class="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 text-wd-amber-500"
              style="background:white; border:2px solid color-mix(in srgb, var(--wd-amber-500) 33.3%, transparent);"
              aria-label="Later — show again at the end"
              title="Later — show again at the end"
              @click="commitSwipe('later')"
            >
              <Clock class="w-5 h-5" />
            </button>
            <button
              type="button"
              class="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 text-wd-green-600"
              style="background:white; border:2px solid color-mix(in srgb, var(--wd-green-600) 33.3%, transparent);"
              aria-label="Yes"
              @click="commitSwipe('yes')"
            >
              <Heart class="w-6 h-6" />
            </button>
          </div>

          <p v-if="deckCurrent" class="mt-4 text-xs text-center italic text-secondary font-display">
            {{ deck.length }} left
          </p>

          <!-- After a Yes: the next step toward actually meeting them (RAZ-981). -->
          <p v-if="lastYes" class="mt-4 text-sm text-center text-muted-foreground font-sans" data-testid="meet-next-step" aria-live="polite">
            <span class="font-bold text-foreground">Yes to {{ lastYes.name }}.</span>
            <template v-if="previewMode" />
            <template v-else-if="lastYes.kind === 'dancer-your-fest' || lastYes.kind === 'dancer-new-fest'">
              Next: <NuxtLink :to="`${festivalPath(lastYes.festivalSlug)}#discover`" class="font-bold text-primary hover:underline">wave at them on {{ lastYes.festivalName }}</NuxtLink>.
            </template>
            <template v-else-if="isNightCard(lastYes) && lastYes.kind === 'dancer-same-night'">
              You're both at <NuxtLink :to="lastYes.night.path" class="font-bold text-primary hover:underline">{{ lastYes.night.name }}</NuxtLink> {{ lastYes.night.when }} — say hi there.
            </template>
            <template v-else-if="isNightCard(lastYes)">
              Next: <NuxtLink :to="lastYes.night.path" class="font-bold text-primary hover:underline">join {{ lastYes.night.name }}</NuxtLink> {{ lastYes.night.when }} — you'll meet on the floor.
            </template>
          </p>

          <details class="mt-8 text-sm text-muted-foreground font-sans" data-testid="meet-how">
            <summary class="cursor-pointer text-center font-bold text-foreground">How does this work?</summary>
            <ul class="mt-3 space-y-1.5">
              <li><span class="font-bold text-wd-green-600">♥</span> — you’d like to dance with them. Only you know.</li>
              <li><span class="font-bold text-foreground">Their night</span> — tap it on the card and go. That’s where you meet.</li>
              <li><span class="font-bold text-primary">✕</span> — not for you. <span class="font-bold text-wd-amber-500">◷</span> — show again later.</li>
              <li><span class="font-bold text-foreground">You show up here</span> when you’re going to a night out, too.</li>
            </ul>
          </details>
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
