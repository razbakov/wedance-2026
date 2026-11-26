<script setup lang="ts">
/**
 * The dancer landing inside MyPlanLanding: Tell your story, WeDance in
 * ChatGPT, Meet new friends. On the homepage an Everyone callout follows.
 * Story pictures use type and shadow tokens (text-eyebrow / text-meta /
 * text-tag, the display scale, shadow-wd-float) — the same pictures, no
 * arbitrary sizes.
 */
import { ArrowRight } from 'lucide-vue-next'
import { WD } from '~/lib/brand'

defineProps<{
  surface: string
  showCallout?: boolean
}>()

defineEmits<{ auth: [] }>()

const EXAMPLE_FACES = [
  { id: 'd2', name: 'Emilia', photo: 'https://i.pravatar.cc/240?u=emilia' },
  { id: 'd3', name: 'Klaus', photo: 'https://i.pravatar.cc/240?u=klaus' },
  { id: 'd4', name: 'Sasha', photo: 'https://i.pravatar.cc/240?u=sasha' },
]

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
  <div>
    <div class="grid items-center gap-8 md:grid-cols-[1fr_1.08fr]" data-testid="my-plan-landing-stories">
      <div class="order-2 flex justify-center gap-4 md:order-1" aria-label="Example stories">
        <div
          v-for="(st, i) in LANDING_STORIES"
          :key="st.head1"
          class="flex aspect-[9/16] w-36 flex-col overflow-hidden rounded-2xl p-3 shadow-wd-float sm:w-44"
          :class="i === 1 ? 'mt-8 rotate-2' : '-rotate-2'"
          :style="{ background: st.color }"
        >
          <!-- Display face, not the canvas poster font: Anton stays out of the UI (design guardrail). -->
          <div class="font-display font-black uppercase leading-none">
            <div class="text-2xl leading-none text-wd-brown-900 sm:text-3xl">{{ st.head1 }}</div>
            <div class="text-3xl leading-none text-wd-cream sm:text-4xl">{{ st.head2 }}</div>
          </div>
          <div class="mt-2 self-start -rotate-2 rounded bg-wd-cream px-1.5 py-0.5 text-eyebrow font-bold font-sans text-wd-brown-900">{{ st.line }}</div>
          <div class="mt-auto space-y-1.5">
            <div v-for="b in st.bands" :key="b.what" class="rounded-md bg-wd-brown-900 px-2 py-1.5 font-sans text-white">
              <div class="text-tag font-black uppercase tracking-wider" :style="{ color: st.color }">{{ b.when }}</div>
              <div class="truncate text-meta font-bold leading-tight">{{ b.what }}</div>
            </div>
          </div>
          <div class="mt-2 font-sans text-tag font-bold uppercase tracking-widest text-wd-brown-900/70">wedance.vip</div>
        </div>
      </div>

      <div class="order-1 text-center md:order-2 md:text-left">
        <div class="text-eyebrow font-bold uppercase tracking-[0.3em] text-primary">Tell your story</div>
        <h1 class="mt-2 font-display text-3xl leading-tight text-foreground lg:text-4xl">
          <span class="block">Your plan,</span>
          <em class="block italic text-primary">ready for Instagram.</em>
        </h1>
        <p class="mx-auto mt-3 max-w-md font-sans text-sm text-muted-foreground sm:text-base md:mx-0">
          We turn your week of parties and your year of festivals into a story picture, with your own line on it. Post it in one tap, add the link sticker, and friends tap "I'm in" to join you.
        </p>
        <div class="mt-6 flex justify-center font-sans md:justify-start">
          <Button variant="cta" size="lg" class="px-6" @click="$emit('auth')">
            Make my plan <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>

    <ChatgptPlanPitch class="mt-16" variant="hero" heading="h2" :surface="surface" />
    <MeetFriendsEntry class="mt-14" :faces="EXAMPLE_FACES" :count="null" :surface="surface" data-testid="my-plan-landing-friends" />
    <LandingCallout v-if="showCallout" variant="card" tab="everyone" :surface="surface" />
  </div>
</template>
