<script setup lang="ts">
/**
 * Landing — V1: Editorial / Magazine
 *
 * Reference: NYT Sunday Magazine, Apartamento, The Cut.
 * Mood: sophisticated, slow, image-driven, treats dance like cultural reporting.
 * Type: serif display (DM Serif Display) over sans body (Inter).
 * Palette: cream paper (#fbf8f3), deep charcoal text, single accent #c2410c (burnt orange).
 */
import { ArrowRight, ArrowUpRight } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — A field guide to dance',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap' },
  ],
})

const stages = [
  { num: 'I.',   label: 'Curious',    headline: 'A first taste',      body: 'Pick a dance. Pick a class. We map every starter night within a 20-minute walk.' },
  { num: 'II.',  label: 'Beginner',   headline: 'A teacher who fits', body: '12 teachers in Munich, 8 in Berlin. Filter by style, role, and the language they teach in.' },
  { num: 'III.', label: 'Weekly',     headline: 'A city you know',    body: 'Practicas, socials, taster classes, surprise visits. Updated by the dancers who go.' },
  { num: 'IV.',  label: 'Traveling',  headline: 'A year you build',   body: 'Pick your festivals. See who else is going. Plan dinners and rides before you fly.' },
  { num: 'V.',   label: 'Reviewer',   headline: 'A truth you write',  body: 'Honest reviews of festivals, teachers, and venues — soon, written by you.' },
]

const loop = [
  { n: 1, t: 'Find your festival',         b: 'Browse every dance event we have mapped across Europe.' },
  { n: 2, t: 'Buy your ticket in one tap', b: 'Secure checkout, instant confirmation, transferable if your plans change.' },
  { n: 3, t: 'See who else is going',      b: 'Opt-in only. The dancers who want to be seen show up. The rest stay private.' },
  { n: 4, t: 'Plan the trip together',     b: 'Dinners, ride-shares, first-night practica partners — surfaced before you arrive.' },
  { n: 5, t: 'Arrive with friends',        b: 'You already know the people, the venue, and the floor. Skip the wall.' },
]
</script>

<template>
  <div class="min-h-screen text-stone-900" style="background:#fbf8f3; font-family: 'Inter', system-ui, sans-serif;">
    <!-- Masthead -->
    <header class="border-b border-stone-300">
      <div class="max-w-6xl mx-auto px-6 sm:px-10 py-6 flex items-baseline justify-between">
        <NuxtLink to="/" class="font-bold tracking-[0.2em] text-xs uppercase">WE · DANCE</NuxtLink>
        <div class="hidden sm:block text-[10px] uppercase tracking-[0.25em] text-stone-500">
          Issue 01 · Summer 2026
        </div>
        <nav class="flex items-center gap-5 text-xs uppercase tracking-wider text-stone-600">
          <NuxtLink to="/festivals" class="hover:text-stone-900">Festivals</NuxtLink>
          <NuxtLink to="/cities" class="hover:text-stone-900">Cities</NuxtLink>
          <NuxtLink to="/organizers" class="hover:text-stone-900 hidden sm:inline">For organizers</NuxtLink>
        </nav>
      </div>
    </header>

    <!-- HERO — magazine cover -->
    <section class="border-b border-stone-300">
      <div class="max-w-6xl mx-auto px-6 sm:px-10 grid md:grid-cols-12 gap-8 py-10 sm:py-16">
        <!-- Left: type column -->
        <div class="md:col-span-7 flex flex-col justify-end">
          <div class="text-[10px] uppercase tracking-[0.3em] text-orange-700 font-semibold">
            A field guide
          </div>
          <h1 class="mt-3 text-5xl sm:text-7xl leading-[0.95] tracking-tight" style="font-family:'DM Serif Display', serif;">
            From your<br>first <em class="italic" style="color:#c2410c;">salsa</em><br>to your tenth.
          </h1>
          <p class="mt-6 text-base sm:text-lg text-stone-600 max-w-md leading-relaxed">
            <span class="float-left text-5xl sm:text-6xl leading-[0.85] mr-2 mt-1" style="font-family:'DM Serif Display', serif; color:#c2410c;">W</span>
            e map every dance event, every teacher, every venue, every city — then tell you who is going before you book the ticket.
          </p>
          <div class="mt-8 flex items-center gap-6">
            <NuxtLink
              to="/festivals"
              class="inline-flex items-center gap-2 text-sm font-semibold border-b-2 pb-1 transition-colors"
              style="border-color:#c2410c; color:#c2410c;"
            >
              Find your next festival <ArrowRight class="w-4 h-4" />
            </NuxtLink>
            <div class="text-xs text-stone-500 italic">Free for the first 10 per festival</div>
          </div>
        </div>
        <!-- Right: photo plate -->
        <div class="md:col-span-5">
          <figure class="relative">
            <img src="/alosha-dj.jpg" alt="Alösha at La Rumba" class="w-full aspect-[4/5] object-cover" style="filter: saturate(0.85) contrast(1.02);">
            <figcaption class="mt-2 text-[10px] uppercase tracking-[0.2em] text-stone-500 flex items-center justify-between">
              <span>Founder, behind the decks</span>
              <span>La Rumba · München · 2026</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- TABLE OF CONTENTS — 5 stages as numbered chapter list -->
    <section class="border-b border-stone-300">
      <div class="max-w-6xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div class="grid md:grid-cols-12 gap-8">
          <div class="md:col-span-3">
            <div class="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-semibold">Contents</div>
            <h2 class="mt-3 text-3xl sm:text-4xl leading-tight" style="font-family:'DM Serif Display', serif;">
              Pick your <em class="italic" style="color:#c2410c;">door.</em>
            </h2>
            <p class="mt-3 text-xs text-stone-600 leading-relaxed">
              Five chapters. Five doors. Wherever you are in dance, one of these is for you.
            </p>
          </div>
          <ol class="md:col-span-9 divide-y divide-stone-300 border-y border-stone-300">
            <li v-for="s in stages" :key="s.num" class="py-5 grid md:grid-cols-12 gap-4 items-baseline">
              <div class="md:col-span-1 text-2xl" style="font-family:'DM Serif Display', serif; color:#c2410c;">{{ s.num }}</div>
              <div class="md:col-span-3 text-[10px] uppercase tracking-[0.25em] text-stone-500 font-semibold">{{ s.label }}</div>
              <h3 class="md:col-span-4 text-xl" style="font-family:'DM Serif Display', serif;">{{ s.headline }}</h3>
              <p class="md:col-span-4 text-sm text-stone-600 leading-relaxed">{{ s.body }}</p>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <!-- FEATURE STORY — proof, full-page article spread -->
    <section class="border-b border-stone-300" style="background:#f3ece0;">
      <div class="max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div class="text-center mb-12">
          <div class="text-[10px] uppercase tracking-[0.3em] text-orange-700 font-semibold">Feature</div>
          <h2 class="mt-3 text-4xl sm:text-5xl" style="font-family:'DM Serif Display', serif;">
            See who else is <em class="italic" style="color:#c2410c;">going.</em>
          </h2>
          <p class="mt-4 text-base text-stone-600 max-w-xl mx-auto leading-relaxed">
            Every ticket sold on WeDance turns into a face on the event page. Opt-in only — the dancers who want to be seen show up here. No fake friends.
          </p>
        </div>

        <article class="bg-white border border-stone-300 max-w-3xl mx-auto">
          <div class="aspect-[16/9] w-full overflow-hidden border-b border-stone-300" style="background:linear-gradient(135deg,#7c3aed 0%, #a855f7 60%, #d8b4fe 100%);">
            <div class="h-full flex flex-col justify-end p-6 sm:p-8 text-white">
              <div class="text-[10px] uppercase tracking-[0.25em] opacity-80">In 3 days · Barcelona</div>
              <h3 class="mt-2 text-2xl sm:text-3xl" style="font-family:'DM Serif Display', serif;">Bachata Stars Barcelona</h3>
              <div class="mt-1 text-xs opacity-80">Fri–Sun, Jul 3–6, 2026 · Sala Apolo</div>
            </div>
          </div>
          <div class="p-6 sm:p-8">
            <div class="text-[10px] uppercase tracking-[0.25em] text-stone-500 font-semibold mb-4 flex items-center justify-between">
              <span>Who's going</span>
              <span class="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">Sample</span>
            </div>
            <ul class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <li v-for="a in [
                { n:'Maxine', c:'Vienna', col:'#ec4899' },
                { n:'Dayron', c:'Madrid', col:'#3b82f6' },
                { n:'Sofia',  c:'Munich', col:'#10b981' },
                { n:'Mark',   c:'Berlin', col:'#f59e0b' },
              ]" :key="a.n" class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" :style="{background: a.col}">{{ a.n.charAt(0) }}</div>
                <div class="min-w-0">
                  <div class="text-sm font-semibold truncate">{{ a.n }}</div>
                  <div class="text-[10px] text-stone-500">{{ a.c }}</div>
                </div>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <!-- METHOD — five steps as a numbered list -->
    <section class="border-b border-stone-300">
      <div class="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div class="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-semibold">Method</div>
        <h2 class="mt-3 text-3xl sm:text-4xl" style="font-family:'DM Serif Display', serif;">
          Five steps. No <em class="italic" style="color:#c2410c;">surprises.</em>
        </h2>
        <ol class="mt-10 space-y-7">
          <li v-for="s in loop" :key="s.n" class="grid grid-cols-[3rem_1fr] gap-5 items-baseline border-t border-stone-300 pt-5">
            <div class="text-3xl" style="font-family:'DM Serif Display', serif; color:#c2410c;">{{ s.n }}</div>
            <div>
              <h3 class="text-lg font-semibold">{{ s.t }}</h3>
              <p class="mt-1 text-sm text-stone-600 leading-relaxed">{{ s.b }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- FOUNDER LETTER -->
    <section class="border-b border-stone-300" style="background:#f3ece0;">
      <div class="max-w-3xl mx-auto px-6 sm:px-10 py-16 sm:py-20">
        <div class="text-[10px] uppercase tracking-[0.3em] text-orange-700 font-semibold">Letter from the founder</div>
        <blockquote class="mt-6 text-2xl sm:text-3xl leading-snug" style="font-family:'DM Serif Display', serif;">
          "The first time I flew to a festival alone, I spent half the first night by the wall. I built WeDance so the next dancer does not have to."
        </blockquote>
        <div class="mt-8 flex items-center gap-4">
          <img src="/alosha-dj.jpg" alt="Alösha" class="w-14 h-14 rounded-full object-cover">
          <div>
            <div class="text-sm font-semibold">Alösha</div>
            <div class="text-xs text-stone-500">Founder · Munich</div>
          </div>
        </div>
      </div>
    </section>

    <!-- SUPPLY — classifieds-style -->
    <section class="border-b border-stone-300">
      <div class="max-w-6xl mx-auto px-6 sm:px-10 py-16">
        <div class="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-semibold">Classifieds</div>
        <h2 class="mt-3 text-3xl sm:text-4xl" style="font-family:'DM Serif Display', serif;">
          On the other side of the floor.
        </h2>
        <div class="mt-8 grid sm:grid-cols-3 divide-x divide-stone-300 border-y border-stone-300">
          <NuxtLink to="/organizers" v-for="c in [
            { t:'Organize a festival', b:'Sell tickets. Reach the audience. See who is coming.' },
            { t:'Teach or DJ',         b:'Get on the city map. Get bookings.', soon:true },
            { t:'Own a venue',         b:'List your floor. Fill quiet nights.', soon:true },
          ]" :key="c.t" class="px-5 py-6 group">
            <div class="text-base font-semibold flex items-center gap-2 group-hover:text-orange-700 transition-colors">
              {{ c.t }} <ArrowUpRight class="w-3.5 h-3.5" />
              <span v-if="c.soon" class="text-[9px] uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Soon</span>
            </div>
            <p class="mt-2 text-xs text-stone-600 leading-relaxed">{{ c.b }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section>
      <div class="max-w-3xl mx-auto px-6 sm:px-10 py-20 sm:py-24 text-center">
        <h2 class="text-4xl sm:text-5xl" style="font-family:'DM Serif Display', serif;">
          Your next festival<br>is closer than you <em class="italic" style="color:#c2410c;">think.</em>
        </h2>
        <NuxtLink to="/festivals" class="mt-8 inline-flex items-center gap-2 text-sm font-semibold border-b-2 pb-1" style="border-color:#c2410c; color:#c2410c;">
          Find your festival <ArrowRight class="w-4 h-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- Variant switcher -->
    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="bg-white/90 backdrop-blur border border-stone-300 rounded-full shadow-lg px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold">
        <span class="text-stone-500 pr-1">Compare</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 rounded-full bg-orange-700 text-white">V1 · Editorial</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 rounded-full text-stone-600 hover:text-stone-900">V2</NuxtLink>
        <NuxtLink to="/" class="px-2 py-0.5 rounded-full text-stone-600 hover:text-stone-900">V3</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 rounded-full text-stone-600 hover:text-stone-900">V4</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 rounded-full text-stone-600 hover:text-stone-900">Current</NuxtLink>
      </div>
    </div>
  </div>
</template>
