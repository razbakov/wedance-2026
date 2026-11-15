<script setup lang="ts">
/**
 * The signed-out landing — the homepage (`/`) and My plan for visitors
 * (`/my-plan`): WeDance in ChatGPT, Meet new friends (three example dancers to
 * swipe, then your own dance card → a prefilled sign-up), My plan with a small
 * example, and Tell your story (the weekend / year story pictures).
 *
 * `surface` tags the ChatGPT button's `ai_app_cta_click` (home / my_plan_landing).
 */
import { ArrowRight } from 'lucide-vue-next'
import { WD } from '~/lib/brand'
import type { SwipeCard, DanceRole } from '~/types/festival'
import type { LandingPerson } from '~/components/LandingFriendsDeck.vue'

defineProps<{ surface: string }>()

const authAction = ref<'dashboard' | 'signin'>('dashboard')
const showAuth = ref(false)
function openAuth(action: 'dashboard' | 'signin') {
  authAction.value = action
  showAuth.value = true
}

// Three example dancers — enough to show the swipe, short enough to reach the
// dance card. Emilia and Sasha both go to Timba Fest London, so two yeses show
// the festival nudge; Klaus is a local regular.
const LANDING_FRIENDS: LandingPerson[] = [
  { id: 'd2', name: 'Emilia', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=emilia', danceStyles: ['Kizomba', 'Urban Kiz'], festivalName: 'Timba Fest London', festivalColor: WD.sky500, reason: 'She dances Kizomba in Munich — and heads to a festival you haven\'t explored.' },
  { id: 'd3', name: 'Klaus', city: 'Munich', photo: 'https://i.pravatar.cc/240?u=klaus', danceStyles: ['Salsa', 'Bachata'], regularAt: 'La Rumba Fridays', reason: 'You both do Salsa in Munich — he\'s at La Rumba every Friday.' },
  { id: 'd4', name: 'Sasha', city: 'Vienna', photo: 'https://i.pravatar.cc/240?u=sasha', danceStyles: ['Timba', 'Rumba'], festivalName: 'Timba Fest London', festivalColor: WD.sky500, reason: 'Timba dancer from Vienna heading to a festival not in your year yet.' },
]

// Signed-out landing: the two story pictures WeDance draws today (weekend, year).
const POSTER_FONT = '"Anton", Impact, "Arial Narrow", sans-serif'
const LANDING_STORIES = [
  { head1: 'Come dance', head2: 'with me', line: 'This weekend 💃', color: '#f97316', bands: [
    { when: 'Fri · 21:00', what: 'Salsa night' },
    { when: 'Sat · 22:00', what: 'Bachata social' },
  ] },
  { head1: 'My 2027', head2: 'dance year', line: 'Who’s coming?', color: '#a855f7', bands: [
    { when: 'Mar', what: 'Salsa festival, Vienna' },
    { when: 'Sep', what: 'Timba weekend, Berlin' },
  ] },
] as const

// Signed-out landing: after the examples, the visitor makes their own dance
// card (role, styles + level, then name / city / photo) — DiscoverDancers'
// onboarding cards, as on event pages — and signs up with it prefilled.
const LANDING_DANCE_CARD: SwipeCard[] = [
  { id: 'onboarding-dancecard', cardType: 'onboarding-dancecard', availableStyles: ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Tango'] },
  { id: 'onboarding-profile', cardType: 'onboarding-profile' },
]
const NO_PLAN = new Set<string>()
const signUpPrefill = ref<{ name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }>({})
function onLandingCardDone(role: DanceRole, styles: string[], name: string, city: string) {
  signUpPrefill.value = { name: name || undefined, danceStyles: styles, role: role as 'lead' | 'follow' | 'both', city: city || undefined }
}

// My plan, shown with a small static example.
const LANDING_EXAMPLE = [
  { title: 'Tonight', summary: '2 friends out', rows: [
    { when: '20:00', name: 'Dinner before the salsa party', meta: '6 dancers going', color: WD.amber500, tag: 'Join' },
  ] },
  { title: 'This week', summary: '3 nights out', rows: [
    { when: 'Fri', name: 'Salsa night', meta: '4 friends going', color: WD.red600, tag: '✓ Going' },
    { when: 'Sat', name: 'Bachata social', meta: 'Live DJ', color: WD.purple500, tag: '✓ Going' },
  ] },
  { title: 'This year', summary: '3 festivals', rows: [
    { when: 'Mar', name: 'A salsa festival abroad', meta: 'Early-bird ends in 6 days', color: WD.red600, tag: 'Buy' },
  ] },
] as const
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 pt-10 pb-10">
    <!-- 1 · WeDance in ChatGPT: the fastest way in. -->
    <ChatgptPlanPitch variant="hero" :surface="surface" />

    <!-- 2 · Meet new friends: the people deck, shown with example dancers. -->
    <div class="mt-14" data-testid="my-plan-landing-friends">
      <div class="text-center md:text-left">
        <div class="text-eyebrow uppercase tracking-[0.3em] font-bold text-primary">Meet new friends</div>
        <h2 class="mt-2 text-3xl sm:text-4xl leading-tight font-display text-foreground">
          Dancers going <em class="italic text-primary">where you go.</em>
        </h2>
        <p class="mt-3 text-sm sm:text-base text-muted-foreground font-sans max-w-xl mx-auto md:mx-0">
          People heading to your festivals, and locals who dance your styles. Say yes to the ones you'd like to dance with — say yes to two going to the same festival and we'll suggest it for your year.
        </p>
      </div>
      <LandingFriendsDeck class="mt-8" :people="LANDING_FRIENDS" @join="openAuth('dashboard')">
        <!-- Then the visitor's own card: the same dance card → profile steps as the
             festival / event "Shall we dance?" deck, ending in a prefilled sign-up. -->
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
              @sign-in="openAuth('dashboard')"
              @onboarding-complete="onLandingCardDone"
            />
          </div>
        </template>
      </LandingFriendsDeck>
    </div>

    <!-- 3 · My plan: what you get here, shown, not listed. -->
    <div class="mt-14 grid gap-8 md:grid-cols-[1fr_1.1fr] items-center">
      <div class="text-center md:text-left">
        <div class="text-eyebrow uppercase tracking-[0.3em] font-bold text-primary">My plan on WeDance</div>
        <h2 class="mt-2 text-3xl sm:text-4xl leading-tight font-display text-foreground">
          Tonight, this week, <em class="italic text-primary">this year.</em>
        </h2>
        <p class="mt-3 text-sm sm:text-base text-muted-foreground font-sans max-w-md mx-auto md:mx-0">
          Every party, course and festival you pick — on one page, nearest first. See which friends are going, never miss an early-bird, and post your week as a story.
        </p>
        <div class="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start font-sans">
          <Button variant="cta" size="lg" class="px-6" @click="openAuth('dashboard')">
            Make my plan <ArrowRight aria-hidden="true" />
          </Button>
          <Button variant="outline-pill" size="lg" class="px-6" @click="openAuth('signin')">
            Sign in
          </Button>
        </div>
        <p class="mt-4 text-sm text-muted-foreground font-sans">
          Just looking? <NuxtLink to="/festivals" class="italic underline text-secondary">Browse festivals</NuxtLink>
          · <NuxtLink to="/my-plan?preview=1" class="italic underline text-secondary">See an example plan</NuxtLink>
        </p>
      </div>

      <!-- A small, static example of the plan. -->
      <div class="rounded-2xl bg-white border p-5 space-y-5 font-sans" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent); box-shadow: 0 10px 28px rgba(59,31,18,0.06);" aria-label="Example plan" data-testid="my-plan-example">
        <div v-for="block in LANDING_EXAMPLE" :key="block.title">
          <div class="flex items-baseline justify-between">
            <div class="font-display text-xl text-foreground">{{ block.title }}</div>
            <div class="text-xs text-muted-foreground">{{ block.summary }}</div>
          </div>
          <div
            v-for="row in block.rows"
            :key="row.name"
            class="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 border border-border"
          >
            <span class="w-12 shrink-0 text-center text-eyebrow font-black uppercase tracking-widest px-1 py-0.5 rounded leading-tight" :style="{ background: row.color + '18', color: row.color }">{{ row.when }}</span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-bold truncate text-foreground">{{ row.name }}</div>
              <div class="text-xs truncate text-muted-foreground">{{ row.meta }}</div>
            </div>
            <span v-if="row.tag" class="text-xs font-bold whitespace-nowrap" :style="{ color: row.color }">{{ row.tag }}</span>
          </div>
        </div>
      </div>
    </div>
    <!-- 4 · Tell your story: the plan turns into Instagram stories. -->
    <div class="mt-16 grid gap-8 md:grid-cols-[1.1fr_1fr] items-center" data-testid="my-plan-landing-stories">
      <!-- Two story pictures, drawn like the real ones (WeekendStory / YearStory). -->
      <div class="flex justify-center gap-4 order-2 md:order-1" aria-label="Example stories">
        <div
          v-for="(st, i) in LANDING_STORIES"
          :key="st.head1"
          class="w-36 sm:w-44 aspect-[9/16] rounded-2xl p-3 flex flex-col overflow-hidden shadow-xl"
          :class="i === 1 ? 'mt-8 rotate-2' : '-rotate-2'"
          :style="{ background: st.color }"
        >
          <div class="leading-[0.9] uppercase" :style="{ fontFamily: POSTER_FONT }">
            <div class="text-[26px] sm:text-[32px] text-wd-brown-900">{{ st.head1 }}</div>
            <div class="text-[30px] sm:text-[36px]" style="color:var(--wd-cream, #fdf6ec)">{{ st.head2 }}</div>
          </div>
          <div class="mt-2 self-start -rotate-2 rounded px-1.5 py-0.5 text-[10px] font-bold font-sans bg-[#fdf6ec] text-wd-brown-900">{{ st.line }}</div>
          <div class="mt-auto space-y-1.5">
            <div v-for="b in st.bands" :key="b.what" class="rounded-md bg-wd-brown-900 px-2 py-1.5 font-sans" style="color:white;">
              <div class="text-[9px] font-black uppercase tracking-wider" :style="{ color: st.color }">{{ b.when }}</div>
              <div class="text-[11px] font-bold leading-tight truncate">{{ b.what }}</div>
            </div>
          </div>
          <div class="mt-2 text-[8px] font-bold uppercase tracking-widest text-wd-brown-900/70 font-sans">wedance.vip</div>
        </div>
      </div>

      <div class="text-center md:text-left order-1 md:order-2">
        <div class="text-eyebrow uppercase tracking-[0.3em] font-bold text-primary">Tell your story</div>
        <h2 class="mt-2 text-3xl sm:text-4xl leading-tight font-display text-foreground">
          Your plan, <em class="italic text-primary">ready for Instagram.</em>
        </h2>
        <p class="mt-3 text-sm sm:text-base text-muted-foreground font-sans max-w-md mx-auto md:mx-0">
          We turn your week of parties and your year of festivals into a story picture, with your own line on it. Post it in one tap, add the link sticker, and friends tap "I'm in" to join you.
        </p>
        <div class="mt-6 flex justify-center md:justify-start font-sans">
          <Button variant="cta" size="lg" class="px-6" @click="openAuth('dashboard')">
            Make my plan <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
    <SignUpModal v-model:open="showAuth" :action="authAction" :prefill="signUpPrefill" />
  </div>
</template>
