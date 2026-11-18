<script setup lang="ts">
/**
 * /meet/ritual — clickable prototype of the color-and-shape ritual (RAZ-1060).
 *
 * Step 2 of Meet: a match and "see you there", then at the event the check-in
 * and the ritual, then tomorrow's "I danced with" card. Example data only
 * (`ritualPrototype.ts`). Nothing is saved, scanned or matched for real.
 * German first; the DE/EN control switches the whole screen.
 */
import { ArrowLeft, Clock, Heart, MapPin, Music, SunMedium } from 'lucide-vue-next'
import {
  DEMO_COUNTDOWN_SECONDS,
  PARTNER_MARK,
  PARTNER_QR,
  RITUAL,
  RITUAL_STEPS,
  VENUE_QR,
  YOU_MARK,
  canJoin,
  formatCountdown,
  joinHint,
  nameList,
  prevStep,
  qrCells,
  ritualCopy,
  stepNumber,
  tickCountdown,
  type RitualLang,
  type RitualStep,
} from '~/lib/ritualPrototype'

definePageMeta({ layout: false })

const lang = ref<RitualLang>('de')
const t = computed(() => ritualCopy(lang.value))
const step = ref<RitualStep>('match')
const onSignal = computed(() => step.value === 'reveal' || step.value === 'hold')
const progress = computed(() => `${stepNumber(step.value)}/${RITUAL_STEPS.length}`)

const adult = ref(false)
const leave = ref(false)
const stay = ref(false)
const checks = computed(() => ({ adult: adult.value, leave: leave.value, stay: stay.value }))
const ready = computed(() => canJoin(checks.value))
const hint = computed(() => joinHint(checks.value, lang.value))
const followed = ref(false)
const scanning = ref(false)
const left = ref(DEMO_COUNTDOWN_SECONDS)
const clock = computed(() => formatCountdown(left.value))
const names = computed(() => nameList(RITUAL.matches, lang.value))
const city = computed(() => RITUAL.city[lang.value])

const venueCells = qrCells(VENUE_QR)
const partnerCells = qrCells(PARTNER_QR)

useHead(computed(() => ({
  title: lang.value === 'de'
    ? 'Prototyp · Farbe und Form — WeDance'
    : 'Prototype · Color and shape — WeDance',
  meta: [{ name: 'robots', content: 'noindex' }],
})))

let countdownTimer: ReturnType<typeof setInterval> | undefined
let scanTimer: ReturnType<typeof setTimeout> | undefined

function clearCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = undefined
  }
}

function startCountdown() {
  if (!import.meta.client) return
  clearCountdown()
  left.value = DEMO_COUNTDOWN_SECONDS
  countdownTimer = setInterval(() => {
    const next = tickCountdown(left.value)
    left.value = next.seconds
    if (!next.reveal) return
    clearCountdown()
    if (step.value === 'waiting') setStep('reveal')
  }, 1000)
}

function setStep(next: RitualStep) {
  step.value = next
  if (next === 'waiting') startCountdown()
  else clearCountdown()
}

function back() {
  const prev = prevStep(step.value)
  if (!prev) {
    navigateTo('/meet')
    return
  }
  setStep(prev)
}

function restart() {
  adult.value = false
  leave.value = false
  stay.value = false
  followed.value = false
  scanning.value = false
  setStep('match')
}

function join() {
  if (!ready.value) return
  setStep('here')
}

function skip() {
  clearCountdown()
  setStep('reveal')
}

function tapScan(next: RitualStep) {
  if (scanning.value) return
  const reduce = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    setStep(next)
    return
  }
  scanning.value = true
  scanTimer = setTimeout(() => {
    scanning.value = false
    setStep(next)
  }, 450)
}

onBeforeUnmount(() => {
  clearCountdown()
  if (scanTimer) clearTimeout(scanTimer)
})

watch(step, async () => {
  await nextTick()
  document.getElementById('ritual-title')?.focus({ preventScroll: true })
})
</script>

<template>
  <div :lang="lang" class="min-h-dvh bg-background" :data-step="step" data-testid="ritual">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-md flex-col"
      :class="onSignal ? 'text-white' : 'text-foreground'"
      :style="onSignal ? { background: YOU_MARK.color } : undefined"
    >
      <header
        class="sticky top-0 z-10 flex items-center gap-1 px-2 pt-[max(0.25rem,env(safe-area-inset-top))]"
        :class="onSignal ? '' : 'bg-background'"
        :style="onSignal ? { background: YOU_MARK.color } : undefined"
      >
        <button
          type="button"
          class="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :class="onSignal ? 'text-white hover:bg-white/15' : 'text-foreground hover:bg-muted'"
          :aria-label="step === 'match' ? t.toMeet : t.back"
          data-testid="ritual-back"
          @click="back"
        >
          <ArrowLeft class="size-5" aria-hidden="true" />
        </button>
        <p class="flex-1 text-center text-xs font-bold uppercase tracking-widest" :class="onSignal ? 'text-white' : 'text-secondary'">
          {{ t.prototype }}
          <span class="font-medium normal-case tracking-normal" :class="onSignal ? 'text-white/80' : 'text-muted-foreground'">{{ progress }}</span>
        </p>
        <div class="flex rounded-full p-0.5" :class="onSignal ? 'bg-white/15' : 'bg-muted'" role="group" :aria-label="t.language">
          <button
            type="button"
            class="h-9 min-w-11 rounded-full px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="lang === 'de' ? (onSignal ? 'bg-white text-wd-orange-700' : 'bg-card text-foreground') : (onSignal ? 'text-white' : 'text-muted-foreground')"
            aria-label="Deutsch"
            :aria-pressed="lang === 'de'"
            data-testid="ritual-lang-de"
            @click="lang = 'de'"
          >DE</button>
          <button
            type="button"
            class="h-9 min-w-11 rounded-full px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :class="lang === 'en' ? (onSignal ? 'bg-white text-wd-orange-700' : 'bg-card text-foreground') : (onSignal ? 'text-white' : 'text-muted-foreground')"
            aria-label="English"
            :aria-pressed="lang === 'en'"
            data-testid="ritual-lang-en"
            @click="lang = 'en'"
          >EN</button>
        </div>
      </header>

      <main class="flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <!-- 1. From Meet into the night -->
        <section v-if="step === 'match'" class="flex flex-1 flex-col">
          <p class="text-sm text-muted-foreground">{{ t.example }}</p>
          <h1 id="ritual-title" tabindex="-1" class="mt-3 font-display text-4xl leading-tight outline-none">{{ t.matchTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.matchBody }}</p>
          <button
            type="button"
            class="mt-5 w-full overflow-hidden rounded-3xl border bg-card text-left shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
            data-testid="ritual-see-you"
            @click="setStep('scan')"
          >
            <span class="flex h-40 items-center justify-center bg-wd-amber-100">
              <Avatar size="lg">
                <AvatarFallback>{{ RITUAL.partner.slice(0, 1) }}</AvatarFallback>
              </Avatar>
            </span>
            <span class="block p-5">
              <span class="flex items-baseline justify-between gap-3">
                <span class="font-display text-xl font-black">{{ RITUAL.partner }}</span>
                <span class="font-display text-xs italic text-secondary">{{ city }}</span>
              </span>
              <span
                class="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-wd-green-700"
                style="background: color-mix(in srgb, var(--wd-green-600) 12%, transparent);"
              >
                <MapPin class="size-3" aria-hidden="true" />
                {{ t.seeYou }}
              </span>
              <span class="mt-3 flex flex-wrap gap-1">
                <span
                  v-for="style in RITUAL.styles"
                  :key="style"
                  class="rounded-full px-2 py-0.5 text-eyebrow font-bold uppercase tracking-widest text-muted-foreground"
                  style="background: color-mix(in srgb, var(--wd-brown-900) 6%, transparent);"
                >{{ style }}</span>
              </span>
              <span class="mt-3 block text-xs italic leading-snug text-muted-foreground">{{ t.matchReason }}</span>
              <span class="mt-2 block text-xs text-muted-foreground">{{ t.alsoGoing }} · {{ RITUAL.event }}</span>
            </span>
          </button>
        </section>

        <!-- 2. Scan the venue QR. A tap stands in for the camera. -->
        <section v-else-if="step === 'scan'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.scanTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.scanBody }}</p>
          <button
            type="button"
            class="mt-6 flex w-full flex-col items-center rounded-3xl border bg-card p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
            style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
            :disabled="scanning"
            data-testid="ritual-scan-venue"
            @click="tapScan('optin')"
          >
            <span class="font-display text-2xl text-foreground">{{ t.poster }}</span>
            <span class="mt-1 text-sm text-muted-foreground">{{ RITUAL.event }} · {{ city }}</span>
            <span class="mt-4 grid size-48 grid-cols-11 bg-white p-2" aria-hidden="true">
              <span v-for="(on, i) in venueCells" :key="i" class="aspect-square" :class="on ? 'bg-wd-brown-900' : 'bg-white'" />
            </span>
            <span class="mt-4 text-sm font-bold text-primary">{{ scanning ? t.scanned : t.tapScan }}</span>
          </button>
        </section>

        <!-- 3. Opt in, with the 18+ confirm. -->
        <section v-else-if="step === 'optin'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.optinTitle }}</h1>
          <p class="mt-4 text-xs font-bold uppercase tracking-widest text-secondary">{{ t.whatHappens }}</p>
          <ul class="mt-2 space-y-2 text-sm leading-snug text-muted-foreground">
            <li v-for="line in t.whatLines" :key="line">{{ line }}</li>
          </ul>
          <div class="mt-6 flex flex-col">
            <Checkbox v-model="adult" data-testid="ritual-adult">{{ t.adult }}</Checkbox>
            <Checkbox v-model="leave">{{ t.leaveAny }}</Checkbox>
            <Checkbox v-model="stay">{{ t.keepOpen }}</Checkbox>
          </div>
          <div class="mt-auto pt-8">
            <Button variant="cta" size="lg" class="w-full" :disabled="!ready" data-testid="ritual-join" @click="join">
              {{ t.join }}
            </Button>
            <p v-if="hint" class="mt-2 text-center text-sm text-muted-foreground" data-testid="ritual-join-hint">{{ hint }}</p>
            <div class="mt-1 text-center">
              <Button as-child variant="link">
                <NuxtLink to="/meet">{{ t.leaveNow }}</NuxtLink>
              </Button>
            </div>
          </div>
        </section>

        <!-- 4. Who from Meet is in the room, and when. Still no symbol. -->
        <section v-else-if="step === 'here'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.hereTitle }}</h1>
          <p class="mt-4 text-center font-display text-2xl">{{ names }}</p>
          <ul class="mt-4 flex justify-center gap-4" :aria-label="names">
            <li v-for="person in RITUAL.matches" :key="person" class="flex flex-col items-center gap-1">
              <Avatar size="base">
                <AvatarFallback>{{ person.slice(0, 1) }}</AvatarFallback>
              </Avatar>
              <span class="text-xs font-bold">{{ person }}</span>
            </li>
          </ul>
          <p class="mt-6 text-center text-sm font-bold">{{ t.hereTime }}</p>
          <p class="mt-1 text-center text-sm text-muted-foreground">{{ t.hereHidden }}</p>
          <div class="mt-auto pt-8">
            <Button variant="cta" size="lg" class="w-full" data-testid="ritual-to-wait" @click="setStep('waiting')">
              {{ t.toWait }}
            </Button>
          </div>
        </section>

        <!-- 5. Countdown. Skip jumps the demo to the reveal. -->
        <section v-else-if="step === 'waiting'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.waitingTitle }}</h1>
          <p class="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock class="size-4" aria-hidden="true" />
            {{ t.waitingAt }}
          </p>
          <p
            class="mt-8 text-center font-sans text-7xl font-black tabular-nums leading-none"
            data-testid="ritual-countdown"
            :aria-label="clock"
          >{{ clock }}</p>
          <p class="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <SunMedium class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {{ t.waitingHint }}
          </p>
          <div class="mt-auto pt-8">
            <Button variant="outline-pill" size="lg" class="w-full" data-testid="ritual-skip" @click="skip">
              {{ t.skip }}
            </Button>
            <div class="mt-1 text-center">
              <Button as-child variant="link">
                <NuxtLink to="/meet">{{ t.leaveNow }}</NuxtLink>
              </Button>
            </div>
          </div>
        </section>

        <!-- 6. The reveal. Full-screen color, shape, number, code, and who. -->
        <section v-else-if="step === 'reveal'" class="flex flex-1 flex-col">
          <RitualPrototypeSymbol class="min-h-48 flex-1" :mark="YOU_MARK" />
          <h1 id="ritual-title" tabindex="-1" class="mt-4 text-center font-display text-3xl leading-tight outline-none">{{ t.revealTitle }}</h1>
          <p class="mt-1 text-center text-sm text-white/90">{{ t.revealWalk }}</p>
          <p class="mt-1 text-center font-display text-xl" data-testid="ritual-looking">{{ t.looking }}</p>
          <Button variant="outline-pill" size="lg" class="mt-4 w-full" data-testid="ritual-hold" @click="setStep('hold')">
            {{ t.toHold }}
          </Button>
        </section>

        <!-- 7. Hold it up at the DJ. The raised screen has no name. -->
        <section v-else-if="step === 'hold'" class="flex flex-1 flex-col">
          <RitualPrototypeSymbol class="min-h-48 flex-1" :mark="YOU_MARK" />
          <h1 id="ritual-title" tabindex="-1" class="mt-4 text-center font-display text-3xl leading-tight outline-none">{{ t.holdTitle }}</h1>
          <p class="mt-1 text-center text-sm text-white/90">{{ t.holdBody }}</p>
          <Button variant="outline-pill" size="lg" class="mt-4 w-full" data-testid="ritual-spotted" @click="setStep('partner')">
            {{ t.spotted }}
          </Button>
        </section>

        <!-- 8. Your screen and theirs, so the two symbols can be compared. -->
        <section v-else-if="step === 'partner'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.partnerTitle }}</h1>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <figure>
              <div class="h-60 overflow-hidden rounded-3xl border-4 border-wd-brown-900">
                <RitualPrototypeSymbol :mark="YOU_MARK" compact />
              </div>
              <figcaption class="mt-2 text-center text-sm font-bold">{{ t.yourPhone }} · {{ YOU_MARK.code }}</figcaption>
            </figure>
            <figure>
              <div class="h-60 overflow-hidden rounded-3xl border-4 border-wd-brown-900">
                <RitualPrototypeSymbol :mark="PARTNER_MARK" compact />
              </div>
              <figcaption class="mt-2 text-center text-sm font-bold">{{ t.theirPhone }} · {{ PARTNER_MARK.code }}</figcaption>
            </figure>
          </div>
          <p class="mt-4 text-center text-sm font-bold text-wd-orange-700">{{ t.sameSymbol }}</p>
          <div class="mt-auto pt-6">
            <Button variant="cta" size="lg" class="w-full" data-testid="ritual-to-scan-partner" @click="setStep('scan-partner')">
              {{ t.toScanPartner }}
            </Button>
          </div>
        </section>

        <!-- 9. Scan the partner's screen. A tap stands in for the camera. -->
        <section v-else-if="step === 'scan-partner'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.scanPartnerTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.scanBody }}</p>
          <div class="mx-auto mt-5 w-full max-w-xs rounded-3xl border-4 border-wd-brown-900 bg-card p-3">
            <div class="h-36 overflow-hidden rounded-2xl">
              <RitualPrototypeSymbol :mark="PARTNER_MARK" compact />
            </div>
            <button
              type="button"
              class="mt-3 flex w-full flex-col items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
              :disabled="scanning"
              data-testid="ritual-scan-partner"
              @click="tapScan('met')"
            >
              <span class="grid size-40 grid-cols-11 bg-white p-2" aria-hidden="true">
                <span v-for="(on, i) in partnerCells" :key="i" class="aspect-square" :class="on ? 'bg-wd-brown-900' : 'bg-white'" />
              </span>
              <span class="mt-3 text-sm font-bold text-primary">{{ scanning ? t.scanned : t.tapScan }}</span>
            </button>
          </div>
        </section>

        <!-- 10. You met. Names, an icebreaker, Follow, and the song. -->
        <section v-else-if="step === 'met'" class="flex flex-1 flex-col">
          <div class="flex items-center gap-3">
            <Avatar size="base">
              <AvatarFallback>{{ RITUAL.partner.slice(0, 1) }}</AvatarFallback>
            </Avatar>
            <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.metTitle }}</h1>
          </div>
          <p class="mt-3 text-sm font-bold" data-testid="ritual-names">{{ t.metNames }}</p>
          <p class="mt-6 font-display text-2xl italic leading-snug">{{ t.icebreaker }}</p>
          <Button
            variant="soft"
            size="lg"
            class="mt-6 w-full"
            :aria-pressed="followed"
            data-testid="ritual-follow"
            @click="followed = !followed"
          >
            <Heart aria-hidden="true" :class="followed ? 'fill-current' : ''" />
            {{ followed ? t.following : t.follow }}
          </Button>
          <Button variant="cta" size="lg" class="mt-3 w-full" data-testid="ritual-dance" @click="setStep('done')">
            <Music aria-hidden="true" />
            {{ t.dance }}
          </Button>
        </section>

        <!-- 11. Tomorrow's card, then back to the Meet deck. -->
        <section v-else class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.doneTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.doneBody }}</p>
          <article
            class="mt-6 rounded-3xl border bg-card p-5"
            style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
            data-testid="ritual-danced-card"
          >
            <p class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t.tomorrow }}</p>
            <h2 class="mt-1 font-display text-3xl leading-tight">{{ t.dancedCard }}</h2>
            <p class="mt-2 text-sm text-muted-foreground">{{ RITUAL.event }} · {{ city }}</p>
          </article>
          <div class="mt-auto flex flex-col items-center pt-8">
            <Button as-child variant="cta" size="lg" class="w-full">
              <NuxtLink to="/meet" data-testid="ritual-back-to-meet">{{ t.backToMeet }}</NuxtLink>
            </Button>
            <Button variant="link" class="mt-2" data-testid="ritual-again" @click="restart">{{ t.again }}</Button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>
