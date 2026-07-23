<script setup lang="ts">
/**
 * /for-sponsors — For brands & companies who want to sponsor dance events.
 * Clones the for-events.vue conventions: layout:false standalone marketing
 * page, Playfair Display + Caveat, lucide icons, Cuban-warm editorial palette.
 * No fabricated audience numbers — content-publishing rule. Qualitative
 * phrasing or a TODO placeholder until a sourced stat exists.
 */
import { ArrowRight, Users, MapPin, Share2, Heart, Crown, Music, UtensilsCrossed, Megaphone } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — For sponsors',
  meta: [
    { name: 'description', content: 'Sponsor a moment the city actually shows up for. Reach a warm, engaged dance community across the event calendar.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const props_ = [
  { icon: Users,   title: 'An engaged niche',      detail: 'Dancers are a loyal, high-intent community — they show up week after week, and they tell each other everything.' },
  { icon: MapPin,  title: 'On-site activation',    detail: 'A booth, a bar, a branded stage, a sampling moment. Real presence in a room full of people who came to enjoy themselves.' },
  { icon: Share2,  title: 'Digital reach',         detail: 'Association across the event calendar — event pages, schedules, and the socials dancers check before every night out.' },
  { icon: Heart,   title: 'A warm association',    detail: 'Music, movement, culture. Your brand next to a genuinely good time, not an interruption to it.' },
]

const formats = [
  { icon: Crown,           label: 'Festival title sponsor', detail: 'Name on the festival, top billing across the schedule, the marquee moment of the year.' },
  { icon: MapPin,          label: 'Stage / area sponsor',   detail: 'Own a room, a stage, or a lounge — your brand is the backdrop to the floor.' },
  { icon: UtensilsCrossed, label: 'Catering / bar sponsor', detail: 'Power the mojito bar or the food. Everyone remembers who kept the night going.' },
  { icon: Share2,          label: 'Digital / social package', detail: 'Placement across event pages, interactive schedules, and pre-event socials.' },
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- HERO -->
    <section class="max-w-5xl mx-auto px-4 pt-14 pb-10">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">For sponsors</div>
      <h1 class="text-5xl sm:text-6xl leading-[0.95]" style="color:#3b1f0d;">
        Sponsor a moment<br>
        the city <em class="italic" style="color:#dc2626;">actually shows up for.</em>
      </h1>
      <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        Dance nights and festivals are where a warm, loyal community gathers on purpose. Put your brand in the room — not in the way of it.
      </p>
      <!-- TODO: sourced stat — reach / attendance figures once we have defensible, cited numbers. Do not invent. -->
    </section>

    <!-- VALUE PROPS -->
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <div class="grid md:grid-cols-2 gap-5">
        <div
          v-for="(p, i) in props_" :key="p.title"
          class="rounded-2xl bg-white p-6 border block"
          :style="{ borderColor: ['#dc2626', '#f59e0b', '#0891b2', '#16a34a', '#a855f7'][i % 5] + '55' }"
        >
          <component :is="p.icon" class="w-6 h-6 mb-3" :style="{ color: ['#dc2626', '#f59e0b', '#0891b2', '#16a34a', '#a855f7'][i % 5], 'stroke-width': 1.5 }" />
          <div class="text-lg font-bold" style="color:#3b1f0d;">{{ p.title }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ p.detail }}</div>
        </div>
      </div>
    </section>

    <!-- FORMATS -->
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <h2 class="text-3xl sm:text-4xl leading-tight mb-6">
        Ways to <em class="italic" style="color:#dc2626;">show up.</em>
      </h2>
      <div class="grid md:grid-cols-2 gap-5">
        <div
          v-for="(f, i) in formats" :key="f.label"
          class="rounded-2xl bg-white p-6 border block"
          :style="{ borderColor: ['#f59e0b', '#dc2626', '#0891b2', '#a855f7', '#16a34a'][i % 5] + '55' }"
        >
          <component :is="f.icon" class="w-6 h-6 mb-3" :style="{ color: ['#f59e0b', '#dc2626', '#0891b2', '#a855f7', '#16a34a'][i % 5], 'stroke-width': 1.5 }" />
          <div class="text-lg font-bold" style="color:#3b1f0d;">{{ f.label }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ f.detail }}</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-3xl mx-auto px-4 py-16 text-center">
      <Megaphone class="w-8 h-8 mx-auto mb-4" style="color:#dc2626; stroke-width:1.5;" />
      <h2 class="text-3xl sm:text-4xl leading-tight">
        Let's find <em class="italic" style="color:#dc2626;">your moment.</em>
      </h2>
      <p class="mt-4 text-sm sm:text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        Tell us what you sell and who you want to reach. We come back with the events that fit and what a package looks like.
      </p>
      <a
        href="mailto:hello@wedance.vip?subject=Sponsoring%20with%20WeDance&body=Brand%3A%0AWhat%20you%20sell%3A%0AWho%20you%20want%20to%20reach%3A%0ABudget%20range%3A%0AAnything%20else%3A%20"
        class="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        @click="useTrack().track('sponsor_cta_click', { surface: 'for-sponsors' })"
      >
        Talk to us about sponsoring <ArrowRight class="w-4 h-4" />
      </a>
      <div class="mt-3 text-sm" style="font-family:'Caveat', cursive; color:#9a5614;">
        — we usually respond same day
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
