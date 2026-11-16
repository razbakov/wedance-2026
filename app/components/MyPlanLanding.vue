<script setup lang="ts">
/**
 * The signed-out landing — the homepage (`/`) and My plan for visitors
 * (`/my-plan`): Tell your story (the weekend / year story pictures), WeDance
 * in ChatGPT (how they start), and the Meet new friends card (→ /meet, where
 * visitors play an example deck and make their dance card).
 *
 * `surface` tags the ChatGPT button's `ai_app_cta_click` and the Meet card's
 * `meet_friends_opened` (home / my_plan_landing).
 */
import { ArrowRight } from 'lucide-vue-next'
import { WD } from '~/lib/brand'

defineProps<{ surface: string }>()

const authAction = ref<'dashboard' | 'signin'>('dashboard')
const showAuth = ref(false)
function openAuth(action: 'dashboard' | 'signin') {
  authAction.value = action
  showAuth.value = true
}

// Signed-out landing: the two story pictures WeDance draws today (weekend, year).
const LANDING_STORIES = [
  { head1: 'Come dance', head2: 'with me', line: 'This weekend 💃', color: WD.orange500, bands: [
    { when: 'Fri · 21:00', what: 'Salsa night' },
    { when: 'Sat · 22:00', what: 'Bachata social' },
  ] },
  { head1: 'My 2027', head2: 'dance year', line: 'Who’s coming?', color: WD.purple500, bands: [
    { when: 'Mar', what: 'Salsa festival, Vienna' },
    { when: 'Sep', what: 'Timba weekend, Berlin' },
  ] },
] as const
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 pt-10 pb-10">
    <!-- 1 · Tell your story: the plan turns into Instagram stories. -->
    <div class="grid gap-8 md:grid-cols-[1.1fr_1fr] items-center" data-testid="my-plan-landing-stories">
      <!-- Two story pictures, drawn like the real ones (WeekendStory / YearStory). -->
      <div class="flex justify-center gap-4 order-2 md:order-1" aria-label="Example stories">
        <div
          v-for="(st, i) in LANDING_STORIES"
          :key="st.head1"
          class="w-36 sm:w-44 aspect-[9/16] rounded-2xl p-3 flex flex-col overflow-hidden shadow-xl"
          :class="i === 1 ? 'mt-8 rotate-2' : '-rotate-2'"
          :style="{ background: st.color }"
        >
          <!-- Display face, not the canvas poster font: Anton stays out of the UI (design guardrail). -->
          <div class="leading-[0.95] uppercase font-display font-black">
            <div class="text-[26px] sm:text-[32px] text-wd-brown-900">{{ st.head1 }}</div>
            <div class="text-[30px] sm:text-[36px]" style="color:var(--wd-cream)">{{ st.head2 }}</div>
          </div>
          <div class="mt-2 self-start -rotate-2 rounded px-1.5 py-0.5 text-[10px] font-bold font-sans text-wd-brown-900" style="background:var(--wd-cream)">{{ st.line }}</div>
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
        <h1 class="mt-2 text-3xl sm:text-4xl leading-tight font-display text-foreground">
          Your plan, <em class="italic text-primary">ready for Instagram.</em>
        </h1>
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
    <!-- 2 · WeDance in ChatGPT: how they start. -->
    <ChatgptPlanPitch class="mt-16" variant="hero" heading="h2" :surface="surface" />

    <!-- 3 · Meet new friends: the same card My plan shows, leading to /meet (its example deck lives there). -->
    <MeetFriendsEntry class="mt-14" :faces="[]" :count="null" :surface="surface" data-testid="my-plan-landing-friends" />

    <SignUpModal v-model:open="showAuth" :action="authAction" />
  </div>
</template>
