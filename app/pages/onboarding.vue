<script setup lang="ts">
/**
 * /onboarding — the intent picker + per-persona field collection.
 *
 * Register is fast (name/email/password); this page does the meaningful
 * collection and routes each new user to their entry point in the my-plan
 * cascade. Design: ~/Orgs/WeDance/03_Coordination/2026-07-04-new-user-personas-onboarding.md
 *
 * Flow: Step 1 asks the one routing question ("What brings you to WeDance?").
 * Step 2 branches by persona and collects only that persona's fields, calls
 * completeOnboarding, and redirects to the persona's landing. Skip still stamps
 * onboardedAt (intent 'skipped') so the guard never nags, and lands on my-plan.
 *
 * 2026 tropical style: Playfair/Caveat, #fbf5ea / #3b1f0d / #dc2626.
 */
import { ArrowRight, ArrowLeft, Check } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Welcome',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const { isSignedIn, isLoading, completeOnboarding, city: meCity, danceStyles: meStyles, role: meRole } = useAuth()

// Persona definitions: the one choice that routes everything.
type IntentKey = 'social' | 'festivals' | 'learn' | 'perform' | 'organize'
interface Persona {
  key: IntentKey
  emoji: string
  label: string
  blurb: string
  landing: string
  // Which fields step 2 collects for this persona.
  collects: { city?: boolean; styles?: boolean; role?: boolean }
}
const PERSONAS: Persona[] = [
  { key: 'social', emoji: '💃', label: 'Dance socially', blurb: 'Find where to dance this week in your city.', landing: '/my-plan', collects: { city: true, styles: true, role: true } },
  { key: 'festivals', emoji: '✈️', label: 'Travel to festivals', blurb: 'Plan your festival year and see who\'s going.', landing: '/festivals', collects: { styles: true, role: true } },
  { key: 'learn', emoji: '🎓', label: 'Learn a dance', blurb: 'Start or level up — find your dance and classes.', landing: '/find-your-dance', collects: {} },
  { key: 'perform', emoji: '🎧', label: 'Perform / DJ', blurb: 'Get booked and find gigs.', landing: '/artists', collects: {} },
  { key: 'organize', emoji: '📣', label: 'Run events', blurb: 'Fill your floor — list socials and classes.', landing: '/organizers', collects: {} },
]

const DANCE_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Timba', 'Semba', 'Afro-Cuban', 'Reggaeton', 'Cha-Cha']

type Step = 'intent' | 'details'
const step = ref<Step>('intent')
const chosen = ref<Persona | null>(null)

const form = reactive({
  city: '',
  danceStyles: [] as string[],
  role: '' as '' | 'lead' | 'follow' | 'both',
})

const error = ref('')
const loading = ref(false)

// Refs for focus management.
const firstIntentBtn = ref<HTMLButtonElement | null>(null)
const cityInput = ref<HTMLInputElement | null>(null)
const detailsHeading = ref<HTMLElement | null>(null)

// Redirect signed-out users to home — onboarding requires a session.
watch([isLoading, isSignedIn], ([loadingNow, signedIn]) => {
  if (!loadingNow && !signedIn) {
    navigateTo('/')
  }
}, { immediate: true })

onMounted(() => {
  // Prefill from any values a caller already captured (e.g. festival onboarding).
  if (meCity.value) form.city = meCity.value
  if (meStyles.value?.length) form.danceStyles = [...meStyles.value]
  if (meRole.value === 'lead' || meRole.value === 'follow' || meRole.value === 'both') form.role = meRole.value
  nextTick(() => firstIntentBtn.value?.focus())
})

const detailsNeeded = computed(() => {
  const c = chosen.value?.collects
  return !!(c && (c.city || c.styles || c.role))
})

function pickIntent(p: Persona) {
  chosen.value = p
  error.value = ''
  if (detailsNeeded.value) {
    step.value = 'details'
    nextTick(() => (cityInput.value?.focus() ?? detailsHeading.value?.focus()))
  } else {
    // No fields to collect — finish immediately.
    finish()
  }
}

function back() {
  step.value = 'intent'
  error.value = ''
  nextTick(() => firstIntentBtn.value?.focus())
}

function toggleStyle(style: string) {
  const i = form.danceStyles.indexOf(style)
  if (i >= 0) form.danceStyles.splice(i, 1)
  else form.danceStyles.push(style)
}

async function finish() {
  if (!chosen.value) return
  const c = chosen.value.collects

  // Light validation only on fields this persona collects.
  if (c.city && !form.city.trim()) {
    error.value = 'Please tell us your city.'
    return
  }
  if (c.styles && form.danceStyles.length === 0) {
    error.value = 'Pick at least one dance style.'
    return
  }
  if (c.role && !form.role) {
    error.value = 'Choose lead, follow, or both.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await completeOnboarding({
      intent: chosen.value.key,
      city: c.city ? form.city.trim() : undefined,
      danceStyles: c.styles ? [...form.danceStyles] : undefined,
      role: c.role ? (form.role || undefined) : undefined,
    })
    await navigateTo(chosen.value.landing)
  } catch (e: any) {
    error.value = e?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

async function skip() {
  loading.value = true
  error.value = ''
  try {
    // Skip still stamps onboardedAt so the guard doesn't nag again.
    await completeOnboarding({ intent: 'skipped' })
    await navigateTo('/my-plan')
  } catch (e: any) {
    error.value = e?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const inputClass = 'w-full h-11 rounded-full px-4 text-sm outline-none transition-all'
const inputStyle = 'background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif;'
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section class="max-w-2xl mx-auto px-4 pt-10 pb-16">
      <!-- Progress indicator -->
      <div class="flex items-center justify-center gap-2 mb-8" aria-hidden="true">
        <span class="h-1.5 rounded-full transition-all" :style="{ width: '40px', background: '#dc2626' }" />
        <span
          class="h-1.5 rounded-full transition-all"
          :style="{ width: '40px', background: step === 'details' ? '#dc2626' : '#3b1f0d22' }"
        />
      </div>
      <p class="sr-only" role="status">
        Step {{ step === 'intent' ? 1 : 2 }} of 2
      </p>

      <!-- ============================ STEP 1: INTENT ============================ -->
      <template v-if="step === 'intent'">
        <div class="text-center mb-8">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style="color:#9a5614;">
            Welcome to the floor
          </div>
          <h1 class="text-4xl sm:text-5xl leading-[1.02]" style="color:#3b1f0d;">
            What brings you to <em class="italic" style="color:#dc2626;">WeDance?</em>
          </h1>
          <p class="mt-4 text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Pick one — we'll set up the rest around it.
          </p>
        </div>

        <div class="grid gap-3">
          <button
            v-for="(p, i) in PERSONAS"
            :key="p.key"
            :ref="el => { if (i === 0) firstIntentBtn = el as HTMLButtonElement }"
            type="button"
            class="group flex items-center gap-4 text-left rounded-2xl px-5 py-4 bg-white transition-all hover:-translate-y-0.5"
            style="border:1px solid #3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 16px rgba(59,31,18,0.04);"
            @click="pickIntent(p)"
          >
            <span class="text-3xl shrink-0" aria-hidden="true">{{ p.emoji }}</span>
            <span class="min-w-0 flex-1">
              <span class="block font-bold text-lg leading-tight" style="color:#3b1f0d;">{{ p.label }}</span>
              <span class="block text-sm mt-0.5" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ p.blurb }}</span>
            </span>
            <ArrowRight class="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" style="color:#dc2626;" />
          </button>
        </div>

        <p v-if="error" class="text-sm font-bold text-center mt-4" style="color:#dc2626; font-family: system-ui, sans-serif;">
          {{ error }}
        </p>

        <div class="text-center mt-8">
          <button
            type="button"
            class="text-sm underline"
            style="color:#9a5614; font-family: system-ui, sans-serif;"
            :disabled="loading"
            @click="skip"
          >
            Skip for now
          </button>
        </div>
      </template>

      <!-- =========================== STEP 2: DETAILS =========================== -->
      <template v-else>
        <div class="text-center mb-8">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style="color:#9a5614;">
            {{ chosen?.emoji }} {{ chosen?.label }}
          </div>
          <h1
            ref="detailsHeading"
            tabindex="-1"
            class="text-3xl sm:text-4xl leading-[1.05] outline-none"
            style="color:#3b1f0d;"
          >
            A couple <em class="italic" style="color:#dc2626;">details</em>
          </h1>
          <p class="mt-4 text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            So we can fill your plan with the right things.
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="finish">
          <!-- City -->
          <div v-if="chosen?.collects.city" class="space-y-1.5">
            <label for="onb-city" class="text-sm font-bold" style="color:#3b1f0d;">Your city</label>
            <input
              id="onb-city"
              ref="cityInput"
              v-model="form.city"
              type="text"
              placeholder="Munich, Berlin…"
              autocomplete="address-level2"
              :class="inputClass"
              :style="inputStyle"
            >
          </div>

          <!-- Styles -->
          <div v-if="chosen?.collects.styles" class="space-y-2">
            <span class="text-sm font-bold" style="color:#3b1f0d;">Which dances?</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="style in DANCE_STYLES"
                :key="style"
                type="button"
                :aria-pressed="form.danceStyles.includes(style)"
                class="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
                :style="form.danceStyles.includes(style)
                  ? 'background:#dc2626; color:white; border:1px solid #dc2626;'
                  : 'background:white; color:#5b3a1d; border:1px solid #3b1f0d33;'"
                @click="toggleStyle(style)"
              >
                <Check v-if="form.danceStyles.includes(style)" class="w-3 h-3" />
                {{ style }}
              </button>
            </div>
            <NuxtLink
              to="/find-your-dance"
              class="inline-block text-xs italic hover:underline pt-1"
              style="color:#9a5614; font-family:'Playfair Display', serif;"
            >
              Don't know which dance? →
            </NuxtLink>
          </div>

          <!-- Role -->
          <div v-if="chosen?.collects.role" class="space-y-2">
            <span class="text-sm font-bold" style="color:#3b1f0d;">Do you lead or follow?</span>
            <div class="flex gap-3">
              <label
                v-for="r in [{ value: 'lead', label: 'Lead' }, { value: 'follow', label: 'Follow' }, { value: 'both', label: 'Both' }]"
                :key="r.value"
                class="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold cursor-pointer transition-colors"
                :style="form.role === r.value
                  ? 'background:#dc2626; color:white; border:1px solid #dc2626;'
                  : 'background:white; color:#5b3a1d; border:1px solid #3b1f0d33;'"
              >
                <input v-model="form.role" type="radio" name="role" :value="r.value" class="sr-only">
                {{ r.label }}
              </label>
            </div>
          </div>

          <p v-if="error" class="text-sm font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">
            {{ error }}
          </p>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-sm font-bold uppercase tracking-wider"
              style="background:white; color:#5b3a1d; border:1px solid #3b1f0d33; font-family: system-ui, sans-serif;"
              @click="back"
            >
              <ArrowLeft class="w-4 h-4" /> Back
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
              style="background:#dc2626; box-shadow: 0 3px 0 -1px #b91c1c; font-family: system-ui, sans-serif;"
            >
              {{ loading ? 'Setting up…' : 'Take me to my plan' }}
              <ArrowRight v-if="!loading" class="w-4 h-4" />
            </button>
          </div>

          <div class="text-center pt-1">
            <button
              type="button"
              class="text-sm underline"
              style="color:#9a5614; font-family: system-ui, sans-serif;"
              :disabled="loading"
              @click="skip"
            >
              Skip for now
            </button>
          </div>
        </form>
      </template>
    </section>
  </div>
</template>
