<script setup lang="ts">
/**
 * /meet/ritual — the meetup after a real "you both said yes" (RAZ-1071).
 *
 * Two browsers, one dancer each. Book the night, read when and where (23:15
 * near the DJ when the night runs that late), then turn the phone toward the
 * other person. Nothing on that screen asks them to follow or to scan. If it
 * doesn't happen they come back and say what went wrong. The next morning's
 * email — the only place a follow is suggested — opens with ?morning=1.
 */
import { ArrowLeft, MapPin, Ticket } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { nightCopy, ritualFollowup, type RitualProblem } from '#shared/utils/ritual'

definePageMeta({ layout: false })

interface Night {
  eventId: string
  name: string
  path: string
  venue: string
  ticketUrl: string | null
  price: string | null
  youGoing: boolean
  theyGoing: boolean
  time: string
  weekday: string
  starts: string
}
interface RitualData {
  you: { firstName: string }
  other: { id: string, name: string, firstName: string, photo: string | null, username: string | null, city: string, styles: string[] }
  night: Night | null
  mark: { color: string, colorName: string, shape: 'circle' | 'triangle' | 'square' | 'star' | 'cross', shapeName: string, number: number, code: string } | null
  state: { booked: boolean, revealed: boolean, problem: RitualProblem | null, note: string | null, how: 'good' | 'not' | null, emailSentAt: string | null }
  following: boolean
}
interface MatchRow {
  dancerId: string
  name: string
  photo: string | null
  city: string
  night: { name: string, venue: string } | null
}

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn, isLoading: authLoading } = useAuth()
const { track } = useTrack()
const { syncEvent } = useWeekPlan()

const data = ref<RitualData | null>(null)
const matches = ref<MatchRow[]>([])
const loading = ref(false)
const ready = ref(false)
const pending = ref(false)
const error = ref('')
const notMatch = ref(false)
const showing = ref(false)
const backToMatch = ref(false)
const showAuth = ref(false)
const problem = ref<RitualProblem | null>(null)
const note = ref('')
const reportDone = ref(false)
const leave = ref(false)
const publicSpot = ref(false)
const adult = ref(false)

const otherId = computed(() => typeof route.query.with === 'string' ? route.query.with : '')
const facts = computed(() => ({
  you: data.value?.you.firstName || '',
  other: data.value?.other.firstName || '',
  event: data.value?.night?.name || '',
  venue: data.value?.night?.venue || '',
  time: data.value?.night?.time || '',
  weekday: data.value?.night?.weekday || '',
}))
const t = computed(() => nightCopy(facts.value))
const email = computed(() => ritualFollowup(facts.value, 'https://2026.wedance.vip/meet/ritual', 'https://2026.wedance.vip/api/match-emails/off'))

type Step = 'loading' | 'signed-out' | 'none' | 'pick' | 'not-match' | 'match' | 'instructions' | 'reveal' | 'help' | 'morning'
const step = computed<Step>(() => {
  if (authLoading.value) return 'loading'
  if (!isSignedIn.value) return 'signed-out'
  if (!ready.value) return 'loading'
  if (!otherId.value) return matches.value.length ? 'pick' : 'none'
  if (notMatch.value || !data.value) return notMatch.value ? 'not-match' : 'loading'
  if (route.query.morning === '1' && data.value.state.booked) return 'morning'
  if (route.query.help === '1' && data.value.state.booked) return 'help'
  if (showing.value) return 'reveal'
  if (backToMatch.value || !data.value.state.booked || !data.value.night) return 'match'
  return 'instructions'
})
const onSignal = computed(() => step.value === 'reveal' && !!data.value?.mark)

useHead(computed(() => ({
  title: 'Meetup — WeDance',
  meta: [{ name: 'robots', content: 'noindex' }],
})))

function errMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return 'That didn’t work. Try again.'
}

async function load() {
  if (!isSignedIn.value) return
  const requested = otherId.value
  error.value = ''
  loading.value = true
  if (!requested) {
    data.value = null
    notMatch.value = false
    try {
      matches.value = (await $trpc.plan.meetMatches.query()).matches as MatchRow[]
      if (matches.value.length === 1 && otherId.value === requested) {
        await navigateTo({ path: '/meet/ritual', query: { with: matches.value[0]!.dancerId } }, { replace: true })
        return
      }
    } catch (e) {
      error.value = errMessage(e)
    } finally {
      if (otherId.value === requested) {
        loading.value = false
        ready.value = true
      }
    }
    return
  }
  notMatch.value = false
  try {
    const view = await $trpc.ritual.get.query({ otherId: requested }) as RitualData
    if (otherId.value !== requested) return
    data.value = view
    problem.value = view.state.problem
    note.value = view.state.note ?? ''
    reportDone.value = !!view.state.problem
  } catch (e) {
    if (otherId.value !== requested) return
    data.value = null
    notMatch.value = true
    error.value = errMessage(e)
  } finally {
    if (otherId.value === requested) {
      loading.value = false
      ready.value = true
    }
  }
}

watch(isSignedIn, (signed) => { if (signed) load() })
watch(otherId, () => {
  showing.value = false
  backToMatch.value = false
  if (isSignedIn.value) load()
})
onMounted(() => { if (isSignedIn.value) load() })

watch(step, async () => {
  await nextTick()
  document.getElementById('ritual-title')?.focus({ preventScroll: true })
})

function pickProblem(id: string) {
  problem.value = id as RitualProblem
}

function back() {
  if (step.value === 'reveal') { showing.value = false; return }
  if (step.value === 'help' || step.value === 'morning') {
    navigateTo({ path: '/meet/ritual', query: { with: otherId.value } })
    return
  }
  if (step.value === 'instructions') { backToMatch.value = true; return }
  if (step.value === 'match' && matches.value.length > 1) {
    navigateTo('/meet/ritual')
    return
  }
  navigateTo('/my-plan#dance-friends')
}

async function book() {
  if (!data.value) return
  if (data.value.state.booked) { backToMatch.value = false; return }
  pending.value = true
  error.value = ''
  try {
    const view = await $trpc.ritual.book.mutate({ otherId: otherId.value }) as RitualData
    data.value = view
    if (view.night) syncEvent(view.night.eventId, true)
    track('ritual_booked', { event_id: view.night?.eventId })
    backToMatch.value = false
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    pending.value = false
  }
}

async function reveal() {
  if (!data.value) return
  pending.value = true
  error.value = ''
  const already = data.value.state.revealed
  try {
    data.value = await $trpc.ritual.reveal.mutate({ otherId: otherId.value }) as RitualData
    if (!already) track('ritual_revealed', { event_id: data.value.night?.eventId })
    showing.value = true
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    pending.value = false
  }
}

async function saveReport() {
  if (!problem.value) return
  pending.value = true
  error.value = ''
  try {
    data.value = await $trpc.ritual.report.mutate({ otherId: otherId.value, problem: problem.value, note: note.value }) as RitualData
    reportDone.value = true
    track('ritual_reported', { problem: problem.value, event_id: data.value.night?.eventId })
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    pending.value = false
  }
}

async function answer(how: 'good' | 'not') {
  pending.value = true
  error.value = ''
  try {
    data.value = await $trpc.ritual.how.mutate({ otherId: otherId.value, how }) as RitualData
    track('ritual_how', { how, event_id: data.value.night?.eventId })
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    pending.value = false
  }
}

async function follow() {
  if (!data.value) return
  pending.value = true
  error.value = ''
  try {
    const r = await $trpc.follow.toggleDancer.mutate({ targetDancerId: data.value.other.id })
    data.value = { ...data.value, following: r.following }
    track(r.following ? 'follow' : 'unfollow', { target: 'dancer', surface: 'ritual_morning' })
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div lang="en" class="min-h-dvh bg-background" :data-step="step" data-testid="ritual">
    <div
      class="mx-auto flex min-h-dvh w-full max-w-md flex-col"
      :class="onSignal ? 'text-white' : 'text-foreground'"
      :style="onSignal && data?.mark ? { background: data.mark.color } : undefined"
    >
      <header
        class="sticky top-0 z-10 flex items-center gap-1 px-2 pt-[max(0.25rem,env(safe-area-inset-top))]"
        :class="onSignal ? '' : 'bg-background'"
        :style="onSignal && data?.mark ? { background: data.mark.color } : undefined"
      >
        <button
          type="button"
          class="inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          :class="onSignal ? 'text-white hover:bg-white/15' : 'text-foreground hover:bg-muted'"
          :aria-label="t.back"
          data-testid="ritual-back"
          @click="back"
        >
          <ArrowLeft class="size-5" aria-hidden="true" />
        </button>
        <p v-if="!onSignal" class="flex-1 text-center text-xs font-bold uppercase tracking-widest text-secondary">Meet</p>
        <span v-else class="flex-1" />
        <span class="w-11" />
      </header>

      <main class="flex flex-1 flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p v-if="step === 'loading'" class="mt-16 text-center text-sm text-muted-foreground">…</p>

        <section v-else-if="step === 'signed-out'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.signInTitle }}</h1>
          <p class="mt-3 text-sm text-muted-foreground">{{ t.signInBody }}</p>
          <div class="mt-auto pt-8">
            <Button variant="cta" size="lg" class="w-full" data-testid="ritual-sign-in" @click="showAuth = true">{{ t.signIn }}</Button>
          </div>
        </section>

        <section v-else-if="step === 'none'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.noneTitle }}</h1>
          <p class="mt-3 text-sm text-muted-foreground">{{ t.noneBody }}</p>
          <div class="mt-auto pt-8">
            <Button as-child variant="cta" size="lg" class="w-full">
              <NuxtLink to="/meet" data-testid="ritual-to-meet">{{ t.toMeet }}</NuxtLink>
            </Button>
          </div>
        </section>

        <section v-else-if="step === 'not-match'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.notMatch }}</h1>
          <p v-if="error" class="mt-3 text-sm text-muted-foreground" role="alert">{{ error }}</p>
          <div class="mt-auto pt-8">
            <Button as-child variant="cta" size="lg" class="w-full">
              <NuxtLink to="/meet/ritual">{{ t.pickTitle }}</NuxtLink>
            </Button>
          </div>
        </section>

        <section v-else-if="step === 'pick'" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.pickTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.pickHint }}</p>
          <ul class="mt-5 flex flex-col gap-3">
            <li v-for="m in matches" :key="m.dancerId">
              <NuxtLink
                :to="`/meet/ritual?with=${m.dancerId}`"
                class="flex items-center gap-3 rounded-2xl border bg-card p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
                data-testid="ritual-pick"
              >
                <img v-if="m.photo" :src="sizedImage(m.photo, IMG.avatar)" alt="" class="size-12 rounded-full object-cover">
                <span class="min-w-0">
                  <span class="block truncate font-bold">{{ m.name }}</span>
                  <span class="block truncate text-xs text-muted-foreground">{{ m.night ? `${m.night.name}${m.night.venue ? ` · ${m.night.venue}` : ''}` : m.city }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- The real match, then booking. -->
        <section v-else-if="step === 'match' && data" class="flex flex-1 flex-col">
          <p class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t.matchKicker }}</p>
          <h1 id="ritual-title" tabindex="-1" class="mt-2 font-display text-4xl leading-tight outline-none">{{ t.matchTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.matchBody }}</p>
          <article
            class="mt-5 overflow-hidden rounded-3xl border bg-card"
            style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
            data-testid="ritual-match"
          >
            <img v-if="data.other.photo" :src="sizedImage(data.other.photo, IMG.card)" :alt="data.other.name" class="h-48 w-full object-cover">
            <div class="p-5">
              <div class="flex items-baseline justify-between gap-3">
                <h2 class="font-display text-2xl">{{ data.other.firstName }}</h2>
                <span v-if="data.other.city" class="font-display text-xs italic text-secondary">{{ data.other.city }}</span>
              </div>
              <p v-if="data.other.styles.length" class="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{{ data.other.styles.join(' · ') }}</p>
              <div v-if="data.night" class="mt-4">
                <NuxtLink :to="data.night.path" class="font-semibold hover:underline">{{ data.night.name }}</NuxtLink>
                <p class="mt-1 text-sm text-muted-foreground">
                  <MapPin class="inline size-3.5 -mt-0.5" aria-hidden="true" />
                  {{ data.night.starts }}<template v-if="data.night.venue"> · {{ data.night.venue }}</template>
                </p>
              </div>
              <p v-else class="mt-4 text-sm text-muted-foreground">{{ t.noNight }}</p>
            </div>
          </article>
          <div class="mt-auto pt-8">
            <Button
              v-if="data.night"
              variant="cta"
              size="lg"
              class="w-full"
              :disabled="pending"
              data-testid="ritual-book"
              @click="book"
            >
              {{ data.state.booked ? t.seeInstructions : t.book }}
            </Button>
            <p v-if="data.night?.ticketUrl" class="mt-3 text-center">
              <a :href="data.night.ticketUrl" target="_blank" rel="noopener" class="text-sm font-bold text-primary hover:underline" data-outbound-kind="ticket">
                <Ticket class="inline size-3.5 -mt-0.5" aria-hidden="true" /> {{ t.tickets }}
              </a>
            </p>
            <p v-if="error" class="mt-2 text-center text-sm text-destructive" role="alert">{{ error }}</p>
          </div>
        </section>

        <!-- When and where, then the turn. -->
        <section v-else-if="step === 'instructions' && data?.night" class="flex flex-1 flex-col" data-testid="ritual-instructions">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.instructionsTitle }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ data.other.firstName }} · {{ data.night.name }}</p>
          <p class="mt-6 text-center font-sans text-7xl font-black tabular-nums leading-none" data-testid="ritual-time">{{ data.night.time }}</p>
          <p class="mt-2 text-center font-display text-xl">{{ data.night.weekday }}</p>
          <p class="mt-1 text-center text-sm">
            <MapPin class="inline size-3.5 -mt-0.5" aria-hidden="true" />
            {{ t.place }}<template v-if="data.night.venue"> · {{ data.night.venue }}</template>
          </p>
          <div class="mt-6">
            <p class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t.safetyTitle }}</p>
            <div class="mt-1 flex flex-col">
              <Checkbox v-model="leave">{{ t.safetyLeave }}</Checkbox>
              <Checkbox v-model="publicSpot">{{ t.safetyPublic }}</Checkbox>
              <Checkbox v-model="adult" data-testid="ritual-adult">{{ t.safetyAdult }}</Checkbox>
            </div>
            <p class="text-xs text-muted-foreground">{{ t.safetyOptional }}</p>
          </div>
          <p class="mt-4 rounded-2xl bg-muted/70 p-4 text-sm leading-snug" data-testid="ritual-turn-hint">{{ t.turnHint }}</p>
          <div class="mt-auto pt-6">
            <Button variant="cta" size="lg" class="w-full" :disabled="pending" data-testid="ritual-show" @click="reveal">
              {{ data.state.revealed ? t.showAgain : t.showThem }}
            </Button>
            <div class="mt-3 flex justify-center gap-4 text-sm font-bold">
              <NuxtLink :to="`/meet/ritual?with=${otherId}&help=1`" class="text-primary hover:underline" data-testid="ritual-help-link">{{ t.help }}</NuxtLink>
              <NuxtLink :to="`/meet/ritual?with=${otherId}&morning=1`" class="text-muted-foreground hover:underline" data-testid="ritual-morning-link">{{ t.tomorrow }}</NuxtLink>
            </div>
            <p v-if="error" class="mt-2 text-center text-sm text-destructive" role="alert">{{ error }}</p>
          </div>
        </section>

        <!-- For the other person. No next step. -->
        <section v-else-if="step === 'reveal' && data?.mark" class="-mx-5 flex flex-1 flex-col" data-testid="ritual-reveal">
          <RitualSymbol class="min-h-72 flex-1" :mark="data.mark" />
          <div class="px-5 pb-2">
            <h1 id="ritual-title" tabindex="-1" class="text-center font-display text-3xl leading-tight outline-none" data-testid="ritual-reveal-line">{{ t.revealLine }}</h1>
            <div class="mt-4 flex justify-center gap-4 text-sm font-bold text-white/80">
              <NuxtLink :to="`/meet/ritual?with=${otherId}&help=1`" class="underline" data-testid="ritual-help-link">{{ t.help }}</NuxtLink>
              <NuxtLink :to="`/meet/ritual?with=${otherId}&morning=1`" class="underline" data-testid="ritual-morning-link">{{ t.tomorrow }}</NuxtLink>
            </div>
          </div>
        </section>

        <section v-else-if="step === 'help' && data" class="flex flex-1 flex-col">
          <h1 id="ritual-title" tabindex="-1" class="font-display text-4xl leading-tight outline-none">{{ t.helpTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ t.helpBody }}</p>
          <fieldset class="mt-5 flex flex-col gap-2">
            <legend class="sr-only">{{ t.helpTitle }}</legend>
            <button
              v-for="(label, id) in t.problems"
              :key="id"
              type="button"
              class="min-h-11 rounded-2xl border px-4 py-3 text-left text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="problem === id ? 'border-primary bg-primary/5' : 'border-border bg-card'"
              :aria-pressed="problem === id"
              data-testid="ritual-problem"
              @click="pickProblem(String(id))"
            >{{ label }}</button>
          </fieldset>
          <label class="mt-4 block text-sm font-bold" for="ritual-note">{{ t.noteLabel }}</label>
          <textarea
            id="ritual-note"
            v-model="note"
            maxlength="500"
            rows="3"
            class="mt-1 w-full rounded-2xl border bg-card px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :placeholder="t.notePlaceholder"
          />
          <div class="mt-auto pt-6">
            <Button variant="cta" size="lg" class="w-full" :disabled="pending || !problem" data-testid="ritual-save-report" @click="saveReport">{{ t.saveReport }}</Button>
            <p v-if="reportDone" class="mt-2 text-center text-sm text-wd-green-700" role="status" data-testid="ritual-report-saved">{{ t.reportSaved }}</p>
            <p v-if="error" class="mt-2 text-center text-sm text-destructive" role="alert">{{ error }}</p>
          </div>
        </section>

        <!-- The next morning. Follow lives only here. -->
        <section v-else-if="step === 'morning' && data" class="flex flex-1 flex-col" data-testid="ritual-morning">
          <p class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t.morningKicker }}</p>
          <h1 id="ritual-title" tabindex="-1" class="mt-2 font-display text-4xl leading-tight outline-none">{{ t.howTitle }}</h1>
          <p class="mt-2 text-sm text-muted-foreground">{{ data.state.emailSentAt ? t.morningSent : t.morningPending }}</p>
          <article
            class="mt-5 rounded-3xl border bg-card p-5"
            style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
            data-testid="ritual-email"
          >
            <p class="text-xs font-bold uppercase tracking-widest text-secondary">{{ t.emailCaption }}</p>
            <h2 class="mt-1 font-display text-2xl leading-tight">{{ email.subject }}</h2>
            <p v-for="(para, i) in email.paragraphs" :key="i" class="mt-3 text-sm leading-snug text-muted-foreground">{{ para }}</p>
          </article>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <Button variant="soft" size="lg" :aria-pressed="data.state.how === 'good'" :disabled="pending" data-testid="ritual-how-good" @click="answer('good')">{{ t.howGood }}</Button>
            <Button variant="outline-pill" size="lg" :aria-pressed="data.state.how === 'not'" :disabled="pending" data-testid="ritual-how-not" @click="answer('not')">{{ t.howNot }}</Button>
          </div>
          <p v-if="data.state.how" class="mt-2 text-center text-sm text-wd-green-700" role="status">{{ t.howSaved }}</p>
          <Button
            variant="cta"
            size="lg"
            class="mt-4 w-full"
            :aria-pressed="data.following"
            :disabled="pending"
            data-testid="ritual-follow"
            @click="follow"
          >
            {{ data.following ? t.following : t.follow }}
          </Button>
          <p v-if="error" class="mt-2 text-center text-sm text-destructive" role="alert">{{ error }}</p>
        </section>
      </main>
    </div>
    <SignUpModal v-model:open="showAuth" action="signin" />
  </div>
</template>
