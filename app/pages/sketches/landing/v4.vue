<script setup lang="ts">
/**
 * Landing — V4: Cinematic / Club after-dark
 *
 * Reference: Berghain poster, Resident Advisor, film-noir teaser.
 * Mood: late-night, mysterious, electric, cinematic.
 * Type: tall condensed display (Anton via Google) + mono accents.
 * Palette: near-black bg (#0a0a0a), neon magenta (#ec4899) + electric cyan (#22d3ee).
 * Photo treated cinematically (high contrast, warm grade).
 * Glow effects on accents. Letter-spaced uppercase eyebrows.
 */
import { ArrowRight, MapPin, Calendar, Ticket } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WEDANCE / AFTER DARK',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:wght@400;700&display=swap' },
  ],
})

const stages = [
  { code: 'A',  label: 'Curious',    body: 'find a dance' },
  { code: 'B',  label: 'Beginner',   body: 'find a teacher' },
  { code: 'C',  label: 'Weekly',     body: 'know your city' },
  { code: 'D',  label: 'Traveling',  body: 'plan your year' },
  { code: 'E',  label: 'Reviewer',   body: 'tell the truth' },
]
</script>

<template>
  <div
    class="min-h-screen text-white relative overflow-x-hidden"
    style="background: #0a0a0a; font-family: 'Space Mono', ui-monospace, monospace;"
  >
    <!-- Neon ambient glow -->
    <div
      class="pointer-events-none fixed inset-0 z-0"
      style="background:
        radial-gradient(ellipse at 15% 10%, rgba(236, 72, 153, 0.18), transparent 35%),
        radial-gradient(ellipse at 90% 60%, rgba(34, 211, 238, 0.12), transparent 40%),
        radial-gradient(ellipse at 50% 100%, rgba(168, 85, 247, 0.10), transparent 50%);
      "
    />

    <div class="relative z-10">
      <!-- Top strip — ticker -->
      <div class="border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em]">
          <div class="flex items-center gap-3">
            <span class="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style="background:#22d3ee; box-shadow:0 0 12px #22d3ee;" />
            <span style="color:#22d3ee;">LIVE</span>
            <span class="text-white/40 hidden sm:inline">// NEXT: BACHATA STARS · BARCELONA · 3 DAYS</span>
          </div>
          <div class="text-white/40">RA-STYLE / EST. 2026</div>
        </div>
      </div>

      <!-- Header -->
      <header class="border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <NuxtLink to="/" class="font-black tracking-tighter text-xl" style="font-family:'Anton', sans-serif;">
            WE<span style="color:#ec4899;">·</span>DANCE
          </NuxtLink>
          <nav class="flex items-center gap-6 text-[10px] uppercase tracking-[0.3em]">
            <NuxtLink to="/festivals" class="hover:text-pink-400 transition-colors">Festivals</NuxtLink>
            <NuxtLink to="/cities" class="hover:text-pink-400 transition-colors">Cities</NuxtLink>
            <NuxtLink to="/organizers" class="hover:text-pink-400 transition-colors hidden sm:inline">For Orgs</NuxtLink>
          </nav>
        </div>
      </header>

      <!-- HERO — cinematic split: photo left, type right -->
      <section class="border-b border-white/10">
        <div class="grid md:grid-cols-12 gap-0 max-w-7xl mx-auto">
          <!-- Photo: full-bleed cinematic, no padding -->
          <div class="md:col-span-7 relative aspect-[5/4] md:aspect-auto md:min-h-[520px] overflow-hidden">
            <img
              src="/alosha-dj.jpg"
              alt="Alösha behind the decks"
              class="absolute inset-0 w-full h-full object-cover"
              style="filter: contrast(1.18) saturate(0.85) brightness(0.7);"
            >
            <div
              class="absolute inset-0"
              style="background:
                linear-gradient(to right, rgba(10,10,10,0.6) 0%, rgba(10,10,10,0.1) 30%, transparent 60%),
                linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 50%);"
            />
            <!-- Cinema-card overlay -->
            <div class="absolute bottom-6 left-6 right-6 flex items-end justify-between text-[10px] uppercase tracking-[0.3em]">
              <div class="space-y-1">
                <div style="color:#ec4899;">// 01 of 01</div>
                <div class="text-white/80">Alösha · Behind the decks · La Rumba</div>
              </div>
              <div class="text-right space-y-1">
                <div style="color:#22d3ee;">// 24fps · 4K</div>
                <div class="text-white/40">MUC 2026</div>
              </div>
            </div>
            <!-- Corner brackets -->
            <div class="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2" style="border-color:#ec4899;" />
            <div class="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2" style="border-color:#22d3ee;" />
            <div class="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2" style="border-color:#ec4899;" />
            <div class="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2" style="border-color:#22d3ee;" />
          </div>

          <!-- Type column -->
          <div class="md:col-span-5 flex flex-col justify-center p-8 sm:p-12">
            <div class="text-[10px] uppercase tracking-[0.4em]" style="color:#ec4899;">// AFTER DARK FILES</div>
            <h1
              class="mt-5 text-6xl sm:text-7xl md:text-8xl leading-[0.85] tracking-tighter uppercase"
              style="font-family:'Anton', sans-serif;"
            >
              don't<br>
              dance<br>
              <span style="color:#ec4899; text-shadow: 0 0 22px rgba(236, 72, 153, 0.5);">alone.</span>
            </h1>
            <p class="mt-6 text-sm leading-relaxed text-white/70 max-w-md">
              every festival has hundreds of dancers arriving solo.<br>
              we surface them. before the first workshop.
            </p>
            <div class="mt-8 flex flex-col sm:flex-row gap-3">
              <NuxtLink
                to="/festivals"
                class="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.25em] transition-all"
                style="background:#ec4899; color:#0a0a0a; box-shadow: 0 0 0 1px #ec4899, 0 0 32px rgba(236, 72, 153, 0.45);"
              >
                Find your festival <ArrowRight class="w-3.5 h-3.5" />
              </NuxtLink>
              <NuxtLink
                to="/sketches/year"
                class="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.25em] border transition-colors"
                style="border-color:#22d3ee; color:#22d3ee;"
              >
                Plan the year
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- STAGES — modular grid with neon hairlines -->
      <section class="border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-14">
          <div class="flex items-baseline justify-between mb-10 flex-wrap gap-4">
            <div>
              <div class="text-[10px] uppercase tracking-[0.4em]" style="color:#22d3ee;">// CHANNELS</div>
              <h2 class="mt-3 text-3xl sm:text-5xl uppercase tracking-tight leading-none" style="font-family:'Anton', sans-serif;">
                Pick <span style="color:#22d3ee;">your</span> door.
              </h2>
            </div>
            <div class="text-[10px] uppercase tracking-[0.3em] text-white/40">// 05 channels active</div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-5 gap-px" style="background:rgba(255,255,255,0.08);">
            <NuxtLink
              v-for="(s, i) in stages"
              :key="s.code"
              to="/festivals"
              class="bg-[#0a0a0a] hover:bg-white/5 p-5 transition-colors group"
            >
              <div class="flex items-center justify-between">
                <span class="text-3xl uppercase font-bold" style="font-family:'Anton', sans-serif; color:#ec4899;">{{ s.code }}</span>
                <span class="text-[10px] tracking-[0.3em] text-white/40 group-hover:text-white">// 0{{ i + 1 }}</span>
              </div>
              <div class="mt-4 text-[10px] uppercase tracking-[0.3em]" style="color:#22d3ee;">{{ s.label }}</div>
              <div class="mt-1 text-lg leading-tight uppercase" style="font-family:'Anton', sans-serif;">{{ s.body }}</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- PROOF — now playing card with neon trim -->
      <section class="border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-16">
          <div class="text-[10px] uppercase tracking-[0.4em]" style="color:#ec4899;">// THIS IS THE PRODUCT</div>
          <h2 class="mt-3 text-3xl sm:text-5xl uppercase tracking-tight leading-none mb-8" style="font-family:'Anton', sans-serif;">
            See who else is <span style="color:#ec4899;">going.</span>
          </h2>

          <div class="grid md:grid-cols-2 gap-8 items-stretch">
            <!-- Event card -->
            <div class="relative">
              <div
                class="absolute -inset-px rounded-lg"
                style="background: linear-gradient(135deg, #ec4899, #a855f7, #22d3ee); opacity:0.5; filter: blur(10px);"
              />
              <div class="relative bg-[#0a0a0a] border rounded-lg overflow-hidden" style="border-color:rgba(236, 72, 153, 0.4);">
                <div class="px-5 py-3 border-b border-white/10 flex items-center justify-between text-[10px] uppercase tracking-[0.3em]">
                  <span class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full animate-pulse" style="background:#ec4899; box-shadow:0 0 10px #ec4899;" />
                    <span style="color:#ec4899;">NOW PLAYING</span>
                  </span>
                  <span class="text-white/40">IN 3 DAYS</span>
                </div>
                <div class="p-6">
                  <div class="text-[10px] uppercase tracking-[0.3em] text-white/40">BARCELONA · SALA APOLO</div>
                  <h3 class="mt-2 text-4xl uppercase leading-[0.9]" style="font-family:'Anton', sans-serif;">
                    Bachata Stars<br>Barcelona
                  </h3>
                  <div class="mt-4 text-xs flex flex-wrap gap-4 text-white/70">
                    <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5" />Jul 3–6, 2026</span>
                    <span class="inline-flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5" />Sala Apolo</span>
                  </div>
                  <NuxtLink
                    to="/festivals/bachata-stars-barcelona-2026"
                    class="mt-6 inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.3em] font-bold"
                    style="background:#ec4899; color:#0a0a0a;"
                  >
                    <Ticket class="w-3.5 h-3.5" /> Get tickets
                  </NuxtLink>
                </div>
              </div>
            </div>

            <!-- Roster panel -->
            <div class="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 flex flex-col">
              <div class="text-[10px] uppercase tracking-[0.3em] flex items-center justify-between mb-5">
                <span style="color:#22d3ee;">WHO'S GOING</span>
                <span class="px-2 py-0.5 rounded" style="background:rgba(34, 211, 238, 0.1); color:#22d3ee;">SAMPLE</span>
              </div>
              <ul class="space-y-3 flex-1">
                <li v-for="a in [
                  { n:'Maxine', c:'Vienna', col:'#ec4899' },
                  { n:'Dayron', c:'Madrid', col:'#22d3ee' },
                  { n:'Sofia',  c:'Munich', col:'#a855f7' },
                  { n:'Mark',   c:'Berlin', col:'#fbbf24' },
                ]" :key="a.n" class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase"
                    :style="{ background: a.col, color: '#0a0a0a', boxShadow: `0 0 18px ${a.col}55` }"
                    style="font-family:'Anton', sans-serif;"
                  >{{ a.n.charAt(0) }}</div>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-bold uppercase tracking-wider">{{ a.n }}</div>
                    <div class="text-[10px] text-white/50 uppercase tracking-[0.2em]">{{ a.c }}</div>
                  </div>
                </li>
              </ul>
              <div class="mt-5 text-[10px] uppercase tracking-[0.3em] text-white/40 border-t border-white/10 pt-4">
                // opt-in only · no fake friends
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- LOOP — horizontal stepper with neon nodes -->
      <section class="border-b border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-16">
          <div class="text-[10px] uppercase tracking-[0.4em]" style="color:#22d3ee;">// THE LOOP</div>
          <h2 class="mt-3 text-3xl sm:text-5xl uppercase tracking-tight leading-none mb-10" style="font-family:'Anton', sans-serif;">
            5 steps. <span style="color:#22d3ee;">no surprises.</span>
          </h2>
          <ol class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <li v-for="(s, i) in [
              { t: 'FIND',   b: 'every festival, mapped' },
              { t: 'PAY',    b: 'one-tap secure checkout' },
              { t: 'SEE',    b: 'the verified faces' },
              { t: 'PLAN',   b: 'dinners, rides, partners' },
              { t: 'ARRIVE', b: 'skip the wall' },
            ]" :key="s.t" class="relative">
              <div class="bg-[#0a0a0a] border border-white/10 p-5 h-full">
                <div class="flex items-baseline justify-between">
                  <span class="text-4xl uppercase font-bold" style="font-family:'Anton', sans-serif; color:#ec4899; text-shadow:0 0 18px rgba(236, 72, 153, 0.4);">0{{ i + 1 }}</span>
                  <span class="text-[10px] tracking-[0.3em]" style="color:#22d3ee;">STEP</span>
                </div>
                <div class="mt-4 text-2xl uppercase tracking-tight" style="font-family:'Anton', sans-serif;">{{ s.t }}</div>
                <div class="mt-2 text-[11px] text-white/50 uppercase tracking-wider">{{ s.b }}</div>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- FOUNDER — split with photo as background frame -->
      <section class="border-b border-white/10 relative overflow-hidden">
        <div class="absolute inset-0">
          <img src="/alosha-dj.jpg" alt="" class="w-full h-full object-cover opacity-25" style="filter: blur(28px) contrast(1.2);">
          <div class="absolute inset-0" style="background: linear-gradient(to right, #0a0a0a 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,0.95) 100%);" />
        </div>
        <div class="relative max-w-7xl mx-auto px-4 py-20">
          <div class="text-[10px] uppercase tracking-[0.4em]" style="color:#ec4899;">// TRANSMISSION FROM THE FOUNDER</div>
          <blockquote class="mt-5 text-3xl sm:text-5xl leading-[1.05] uppercase tracking-tight max-w-3xl" style="font-family:'Anton', sans-serif;">
            "the first time i flew to a festival alone, i spent half the first night by the wall.
            <span style="color:#ec4899;">i built wedance so the next dancer does not have to.</span>"
          </blockquote>
          <div class="mt-8 flex items-center gap-4">
            <img src="/alosha-dj.jpg" alt="Alösha" class="w-14 h-14 rounded-full object-cover border-2" style="border-color:#ec4899;">
            <div>
              <div class="text-sm font-bold uppercase tracking-[0.2em]">Alösha</div>
              <div class="text-[11px] uppercase tracking-[0.3em] text-white/50">Founder · Munich · 2026</div>
            </div>
          </div>
        </div>
      </section>

      <!-- SUPPLY -->
      <section class="border-b border-white/10" style="background: linear-gradient(180deg, transparent 0%, rgba(236, 72, 153, 0.06) 100%);">
        <div class="max-w-7xl mx-auto px-4 py-16">
          <div class="text-[10px] uppercase tracking-[0.4em]" style="color:#22d3ee;">// FOR THE OTHER SIDE</div>
          <h2 class="mt-3 text-3xl sm:text-5xl uppercase tracking-tight leading-none mb-10" style="font-family:'Anton', sans-serif;">
            run a floor? <span style="color:#22d3ee;">we work with you.</span>
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NuxtLink
              v-for="c in [
                { t: 'Organize', d: 'sell tickets · reach audience · see who is coming' },
                { t: 'Teach/DJ', d: 'get on the city map · get bookings', soon: true },
                { t: 'Venue',    d: 'list your floor · fill quiet nights', soon: true },
              ]"
              :key="c.t"
              to="/organizers"
              class="bg-[#0a0a0a] border border-white/10 p-5 hover:border-pink-400/40 transition-colors group"
            >
              <div class="text-2xl uppercase tracking-tight flex items-center gap-2" style="font-family:'Anton', sans-serif;">
                {{ c.t }}
                <span v-if="c.soon" class="text-[9px] uppercase tracking-[0.3em] px-1.5 py-0.5" style="background:rgba(34, 211, 238, 0.12); color:#22d3ee;">Soon</span>
              </div>
              <div class="mt-3 text-[11px] uppercase tracking-wider text-white/50">{{ c.d }}</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- FINAL -->
      <section>
        <div class="max-w-7xl mx-auto px-4 py-24">
          <h2 class="text-6xl sm:text-9xl uppercase tracking-tighter leading-[0.85]" style="font-family:'Anton', sans-serif;">
            stop<br>
            standing<br>
            by the <span style="color:#ec4899; text-shadow:0 0 28px rgba(236, 72, 153, 0.5);">wall.</span>
          </h2>
          <NuxtLink
            to="/festivals"
            class="mt-12 inline-flex items-center gap-2 px-8 py-4 text-xs font-bold uppercase tracking-[0.3em]"
            style="background:#ec4899; color:#0a0a0a; box-shadow: 0 0 36px rgba(236, 72, 153, 0.5);"
          >
            Find your festival <ArrowRight class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </section>

      <footer class="border-t border-white/10">
        <div class="max-w-7xl mx-auto px-4 py-5 text-[10px] uppercase tracking-[0.3em] text-white/40 flex justify-between">
          <span>WeDance // After Dark Edition</span>
          <span>//END_TRANSMISSION</span>
        </div>
      </footer>
    </div>

    <!-- Variant switcher -->
    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="bg-[#0a0a0a] border border-white/20 rounded-full px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] font-bold">
        <span class="text-white/40 pr-1">Compare</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 rounded-full text-white/60 hover:text-pink-400">V1</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 rounded-full text-white/60 hover:text-pink-400">V2</NuxtLink>
        <NuxtLink to="/" class="px-2 py-0.5 rounded-full text-white/60 hover:text-pink-400">V3</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 rounded-full" style="background:#ec4899; color:#0a0a0a;">V4 · After Dark</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 rounded-full text-white/60 hover:text-pink-400">Current</NuxtLink>
      </div>
    </div>
  </div>
</template>
