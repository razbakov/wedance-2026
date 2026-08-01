<script setup lang="ts">
/**
 * /join — the onboarding quest landing. A short, inviting explainer of the
 * "Join WeDance" quest: what the levels mean and how the game board works.
 * The board itself lives at /join/[id] (one per candidate, link shared by the
 * team). noindex — this is an invite funnel, not a public marketing page.
 */
import { Map, PhoneCall, Swords, Trophy, KeyRound, Sparkles } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'Join WeDance — the quest',
  meta: [
    { name: 'robots', content: 'noindex' },
    { name: 'description', content: 'Level up from invited to active. The WeDance onboarding quest.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const levels = [
  { n: 0, name: 'Invited', icon: Sparkles, blurb: 'You got the link. The door is open.' },
  { n: 1, name: 'Joined', icon: Map, blurb: 'You read the map — the scene, the cities, the floor.' },
  { n: 2, name: 'Claimed', icon: PhoneCall, blurb: 'A welcome call is booked. We meet you.' },
  { n: 3, name: 'Quest in progress', icon: Swords, blurb: 'You start clearing the 13 journeys.' },
  { n: 4, name: 'Boss beaten', icon: Trophy, blurb: 'Every journey green. The board lights up.' },
  { n: 5, name: 'Active', icon: KeyRound, blurb: 'Access granted. You are one of us.' },
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section class="max-w-3xl mx-auto px-4 pt-12 pb-6 text-center">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">The quest</div>
      <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
        Join <em class="italic" style="color:#dc2626;">WeDance.</em>
      </h1>
      <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
        Becoming part of WeDance is a game. You level up from <strong>invited</strong> to
        <strong>active</strong> — clearing thirteen small journeys along the way. Every step
        lights up your board.
      </p>
      <p class="mt-4 text-sm" style="color:#9a5614; font-family:'Caveat', cursive; font-size:20px;">
        — got an invite link? Open it to see your board.
      </p>
    </section>

    <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
      <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08" />
    </svg>

    <section class="max-w-3xl mx-auto px-4 pb-16">
      <h2 class="text-2xl mb-6" style="color:#3b1f0d;">The six levels</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="l in levels"
          :key="l.n"
          class="rounded-2xl bg-white border p-5 flex items-start gap-4"
          style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d11, 0 8px 22px rgba(59,31,18,0.05);"
        >
          <div
            class="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
            style="background:#dc2626; box-shadow:0 3px 0 -1px #991b1b;"
          >
            {{ l.n }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <component :is="l.icon" class="w-4 h-4" style="color:#dc2626;" />
              <h3 class="font-bold text-lg leading-tight" style="color:#3b1f0d;">{{ l.name }}</h3>
            </div>
            <p class="text-sm mt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ l.blurb }}</p>
          </div>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
