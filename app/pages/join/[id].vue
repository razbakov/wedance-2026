<script setup lang="ts">
/**
 * /join/[id] — the GAME BOARD for one onboarding candidate.
 *
 * Renders the safe projection from GET /api/join/[id]:
 *   - the candidate's name + current level (0→5, named)
 *   - a 13-cell CUJ progress grid (green = pass, red = fail, grey = pending)
 *   - a progress bar (X / 13 green) and a clear "next step" line per level.
 *
 * Public + noindex — the URL is an unguessable uuid shared by the team; the
 * API never exposes email / telegramId, so nothing sensitive renders here.
 */
import { Check, X as XIcon, Circle, Trophy, KeyRound } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const id = computed(() => String(route.params.id))

type CujStatus = 'pending' | 'green' | 'red'
type Candidate = {
  id: string
  name: string
  level: number
  quest: { cuj_events: Record<string, CujStatus> }
  accessGranted: boolean
}

const { data, error, pending } = await useFetch<Candidate>(() => `/api/join/${id.value}`, {
  key: computed(() => `join-${id.value}`),
})

useHead({
  title: computed(() => (data.value ? `${data.value.name} — WeDance quest` : 'WeDance quest')),
  meta: [
    { name: 'robots', content: 'noindex' },
    { name: 'description', content: 'Onboarding quest progress board.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

// Canonical order + human labels for the 13 CUJ events. Keep in sync with
// server/api/join/onboarding.lib.ts CUJ_EVENTS.
const CUJ_META: { key: string; label: string }[] = [
  { key: 'week_plan_add', label: 'Added a week plan' },
  { key: 'year_plan_add', label: 'Added a year plan' },
  { key: 'ticket_cta_click', label: 'Clicked a ticket CTA' },
  { key: 'gig_cta_click', label: 'Clicked a gig CTA' },
  { key: 'signup_completed', label: 'Completed signup' },
  { key: 'onboarding_completed', label: 'Finished onboarding' },
  { key: 'profile_updated', label: 'Updated profile' },
  { key: 'booking_request_submitted', label: 'Requested a booking' },
  { key: 'festival_draft_submitted', label: 'Submitted a festival draft' },
  { key: 'shared_plan_signup', label: 'Signed up via shared plan' },
  { key: 'ask_locals_post', label: 'Asked the locals' },
  { key: 'video_vote', label: 'Voted on a video' },
  { key: 'video_submit', label: 'Submitted a video' },
]

const LEVEL_NAMES = ['Invited', 'Joined', 'Claimed', 'Quest in progress', 'Boss beaten', 'Active']

const NEXT_STEP: Record<number, string> = {
  0: 'Read the map — open WeDance and explore your city\'s scene.',
  1: 'Book your welcome call so we can meet you.',
  2: 'Start the quest — begin clearing the thirteen journeys below.',
  3: 'Keep going — turn every cell green to beat the boss.',
  4: 'Boss beaten! Access is being granted — you\'re almost active.',
  5: 'You\'re active. Welcome to WeDance.',
}

const cujStatus = (key: string): CujStatus => data.value?.quest?.cuj_events?.[key] ?? 'pending'
const greenCount = computed(() => CUJ_META.filter(c => cujStatus(c.key) === 'green').length)
const level = computed(() => data.value?.level ?? 0)
const progressPct = computed(() => Math.round((greenCount.value / CUJ_META.length) * 100))
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- Loading -->
    <div v-if="pending" class="text-center py-24" style="color:#9a5614; font-family: system-ui, sans-serif;">
      Loading your board…
    </div>

    <!-- Not found -->
    <div v-else-if="error || !data" class="max-w-lg mx-auto px-4 py-24 text-center">
      <div class="text-6xl mb-4">🗺️</div>
      <h1 class="text-3xl" style="color:#3b1f0d;">Board not found</h1>
      <p class="mt-3 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        This quest link doesn't point to anyone. Double-check the URL, or
        <NuxtLink to="/join" class="underline" style="color:#dc2626;">start here</NuxtLink>.
      </p>
    </div>

    <template v-else>
      <!-- HERO: name + level -->
      <section class="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
        <div class="text-xs tracking-[0.3em] uppercase mb-3" style="color:#9a5614;">WeDance quest</div>
        <h1 class="text-4xl sm:text-5xl leading-[1.0]" style="color:#3b1f0d;">{{ data.name }}</h1>

        <!-- Level track 0→5 -->
        <div class="mt-7 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <template v-for="(nm, n) in LEVEL_NAMES" :key="n">
            <div class="flex flex-col items-center" style="width:74px;">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                :style="n <= level
                  ? 'background:#dc2626; color:#fff; box-shadow:0 3px 0 -1px #991b1b;'
                  : 'background:#fff; color:#c9ab8a; border:1px solid #3b1f0d22;'"
              >
                <component :is="n === 4 ? Trophy : n === 5 ? KeyRound : Circle" v-if="n >= 4" class="w-4 h-4" />
                <span v-else>{{ n }}</span>
              </div>
              <div
                class="mt-1.5 text-[10px] leading-tight text-center"
                :style="n === level
                  ? 'color:#dc2626; font-weight:700; font-family: system-ui, sans-serif;'
                  : 'color:#9a5614; font-family: system-ui, sans-serif;'"
              >
                {{ nm }}
              </div>
            </div>
            <div v-if="n < LEVEL_NAMES.length - 1" class="h-0.5 w-3 sm:w-5 -mt-4" :style="n < level ? 'background:#dc2626;' : 'background:#3b1f0d22;'" />
          </template>
        </div>

        <!-- Current level badge + next step -->
        <div class="mt-8 inline-block rounded-2xl bg-white border px-6 py-4 text-left max-w-md" style="border-color:#dc262633; box-shadow:0 8px 22px rgba(59,31,18,0.06);">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">Level {{ level }} · {{ LEVEL_NAMES[level] }}</div>
          <p class="mt-1 text-sm font-medium" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
            <span style="color:#dc2626; font-weight:700;">Next:</span> {{ NEXT_STEP[level] }}
          </p>
        </div>
      </section>

      <!-- Progress bar -->
      <section class="max-w-3xl mx-auto px-4">
        <div class="flex items-baseline justify-between mb-2">
          <h2 class="text-xl" style="color:#3b1f0d;">The thirteen journeys</h2>
          <span class="text-sm font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">{{ greenCount }} / {{ CUJ_META.length }}</span>
        </div>
        <div class="h-3 w-full rounded-full overflow-hidden" style="background:#3b1f0d14;">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{ width: progressPct + '%', background: greenCount === CUJ_META.length ? '#16a34a' : '#dc2626' }"
          />
        </div>
      </section>

      <!-- 13-cell CUJ grid -->
      <section class="max-w-3xl mx-auto px-4 pt-6 pb-16">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="c in CUJ_META"
            :key="c.key"
            class="rounded-xl border p-4 flex items-center gap-3 transition-all"
            :style="cujStatus(c.key) === 'green'
              ? 'background:#f0fdf4; border-color:#16a34a55; box-shadow:0 4px 14px rgba(22,163,74,0.12);'
              : cujStatus(c.key) === 'red'
                ? 'background:#fef2f2; border-color:#dc262655;'
                : 'background:#fff; border-color:#3b1f0d1a;'"
          >
            <div
              class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              :style="cujStatus(c.key) === 'green'
                ? 'background:#16a34a; color:#fff;'
                : cujStatus(c.key) === 'red'
                  ? 'background:#dc2626; color:#fff;'
                  : 'background:#f4ece0; color:#c9ab8a;'"
            >
              <Check v-if="cujStatus(c.key) === 'green'" class="w-4 h-4" />
              <XIcon v-else-if="cujStatus(c.key) === 'red'" class="w-4 h-4" />
              <Circle v-else class="w-3.5 h-3.5" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold leading-tight truncate" style="color:#3b1f0d; font-family: system-ui, sans-serif;">{{ c.label }}</div>
              <div
                class="text-[11px] uppercase tracking-wider font-bold mt-0.5"
                :style="cujStatus(c.key) === 'green'
                  ? 'color:#16a34a;'
                  : cujStatus(c.key) === 'red'
                    ? 'color:#dc2626;'
                    : 'color:#c9ab8a;'"
              >
                {{ cujStatus(c.key) === 'green' ? 'Cleared' : cujStatus(c.key) === 'red' ? 'Blocked' : 'Pending' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Victory banner -->
        <div
          v-if="greenCount === CUJ_META.length"
          class="mt-8 rounded-2xl p-6 text-center text-white"
          style="background:linear-gradient(135deg,#16a34a,#0891b2); box-shadow:0 10px 30px rgba(22,163,74,0.25);"
        >
          <Trophy class="w-8 h-8 mx-auto mb-2" />
          <div class="text-2xl font-bold" style="font-family:'Playfair Display', serif;">Boss beaten!</div>
          <p class="text-sm mt-1" style="font-family: system-ui, sans-serif; opacity:0.9;">All thirteen journeys are green. Access is on its way.</p>
        </div>

        <!-- Active banner -->
        <div
          v-else-if="data.accessGranted"
          class="mt-8 rounded-2xl p-6 text-center text-white"
          style="background:linear-gradient(135deg,#dc2626,#9a5614); box-shadow:0 10px 30px rgba(220,38,38,0.25);"
        >
          <KeyRound class="w-8 h-8 mx-auto mb-2" />
          <div class="text-2xl font-bold" style="font-family:'Playfair Display', serif;">Access granted</div>
          <p class="text-sm mt-1" style="font-family: system-ui, sans-serif; opacity:0.9;">You're active. Welcome to WeDance.</p>
        </div>
      </section>
    </template>

    <SiteFooter />
  </div>
</template>
