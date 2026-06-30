<script setup lang="ts">
/**
 * Landing — V12: Polaroid scrapbook
 *
 * Reference: BeReal · 2012 Tumblr · Apartamento interior pages.
 * Mood: analog warmth, found candids, proof-through-abundance.
 * Type: Helvetica/Inter for ground truth + Permanent Marker for captions.
 * Palette: warm neutral kraft (#ede4d3) + polaroid white frames.
 *          Photos provide all the color.
 * Layout: photo wall, tilted polaroids with tape + marker captions.
 *          No rigid columns — scattered tabletop.
 */
import { ArrowRight, Calendar, MapPin } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — the photo wall',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Shadows+Into+Light&display=swap' },
  ],
})

// Photo wall pool — every photo on /public is real
const candids = [
  { src: '/alosha-dj.jpg',           caption: 'first time on the decks', col: '#dc2626', rot: -3.2 },
  { src: '/alex-michelle.jpg',       caption: 'Frida Thursdays · MUC',   col: '#2563eb', rot: 2.4 },
  { src: '/artists/alexei-emilia.jpg', caption: 'practica · social #14', col: '#16a34a', rot: -1.5 },
  { src: '/artists/emilia.jpg',      caption: 'Emilia teaching son',     col: '#a855f7', rot: 3 },
  { src: '/artists/silvio.jpg',      caption: 'Silvio · DJ Cuba',        col: '#f59e0b', rot: -2 },
  { src: '/artists/ivana.jpg',       caption: 'Ivana · Berlin trip',     col: '#0891b2', rot: 2.6 },
  { src: '/artists/lisandra.jpg',    caption: 'Lisandra · rueda night',  col: '#ec4899', rot: -2.4 },
  { src: '/artists/barbara.jpg',     caption: 'Barbara · rumba bbq',     col: '#dc2626', rot: 1.4 },
]

const stages = [
  { label: 'Curious',   title: 'find a dance',    color: '#dc2626', rot: -2 },
  { label: 'Beginner',  title: 'find a teacher',  color: '#2563eb', rot: 1.5 },
  { label: 'Weekly',    title: 'know your city',  color: '#16a34a', rot: -1 },
  { label: 'Traveling', title: 'plan your year',  color: '#f59e0b', rot: 2 },
  { label: 'Reviewer',  title: 'tell the truth',  color: '#a855f7', rot: -1.5 },
]
</script>

<template>
  <div
    class="min-h-screen relative overflow-x-hidden"
    style="
      background:
        radial-gradient(ellipse at 30% 10%, rgba(220, 38, 38, 0.05), transparent 50%),
        radial-gradient(ellipse at 80% 60%, rgba(245, 158, 11, 0.05), transparent 50%),
        #ede4d3;
      color: #2a2018;
      font-family: 'Inter', system-ui, sans-serif;
    "
  >
    <!-- Paper grain -->
    <div
      class="pointer-events-none fixed inset-0 opacity-[0.22] z-[1]"
      style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22180%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22180%22 height=%22180%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>'); mix-blend-mode: multiply;"
    />
    <!-- Binder rings down the left -->
    <div class="hidden md:flex pointer-events-none fixed left-3 top-0 bottom-0 z-[5] flex-col items-center justify-around opacity-50">
      <div v-for="n in 12" :key="n" class="w-4 h-4 rounded-full border-2 border-stone-500" style="background: rgba(0,0,0,0.06);" />
    </div>

    <div class="relative z-10">
      <!-- Notebook header -->
      <header class="border-b-2 border-dashed" style="border-color: rgba(0,0,0,0.2);">
        <div class="max-w-6xl mx-auto px-6 py-5 flex items-baseline justify-between">
          <NuxtLink to="/" class="flex items-baseline gap-3">
            <span class="text-2xl font-black tracking-tight">WeDance</span>
            <span style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">— the wall —</span>
          </NuxtLink>
          <nav class="flex items-center gap-5 text-xs font-medium" style="font-family: 'Permanent Marker', cursive; color: #2a2018;">
            <NuxtLink to="/festivals" class="hover:underline">festivals</NuxtLink>
            <NuxtLink to="/cities" class="hover:underline">cities</NuxtLink>
            <NuxtLink to="/organizers" class="hover:underline hidden sm:inline">organize</NuxtLink>
          </nav>
        </div>
      </header>

      <!-- HERO — handwritten ringbinder page -->
      <section class="px-6 py-16">
        <div class="max-w-5xl mx-auto">
          <!-- Page meta -->
          <div class="text-center mb-6">
            <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">page 01</div>
          </div>
          <h1 class="text-5xl sm:text-7xl font-black leading-[0.95] tracking-tight text-center">
            stop dancing
            <span class="inline-block relative" style="font-family: 'Permanent Marker', cursive; color: #dc2626;">
              alone.
              <svg class="absolute -bottom-3 left-0 w-full" height="14" viewBox="0 0 200 14" preserveAspectRatio="none">
                <path d="M2,8 Q50,2 100,7 T198,5" fill="none" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </span>
          </h1>
          <p class="mt-8 text-center text-base sm:text-lg max-w-xl mx-auto" style="color: #5b4830;">
            we keep a photo wall of every dancer who said yes to the next festival.
            <span style="font-family: 'Shadows Into Light', cursive; font-size: 22px; color: #dc2626;">no fake friends.</span>
          </p>

          <!-- Photo wall — scattered tilted polaroids -->
          <div class="mt-14 relative" style="min-height: 480px;">
            <div
              v-for="(p, i) in candids"
              :key="p.src + i"
              class="absolute group cursor-pointer hover:z-30"
              :style="{
                width: ['180px', '200px', '170px', '190px', '180px', '180px', '180px', '180px'][i],
                left: ['2%', '22%', '44%', '64%', '12%', '34%', '56%', '78%'][i],
                top: ['10px', '40px', '0px', '30px', '290px', '270px', '300px', '260px'][i],
                transform: `rotate(${p.rot}deg)`,
                zIndex: i,
              }"
            >
              <!-- Tape -->
              <div
                class="absolute -top-2 left-1/4 w-12 h-3.5 z-20"
                style="background: repeating-linear-gradient(90deg, rgba(254, 240, 138, 0.85) 0 6px, rgba(252, 211, 77, 0.7) 6px 12px); transform: rotate(-7deg);"
              />
              <div class="bg-white p-2 pb-12 shadow-xl group-hover:shadow-2xl group-hover:-translate-y-2 transition-all relative" style="box-shadow: 4px 6px 0 -1px rgba(0,0,0,0.12), 0 12px 20px rgba(0,0,0,0.15);">
                <img :src="p.src" :alt="p.caption" class="w-full aspect-square object-cover">
                <div class="absolute bottom-2 left-2 right-2 text-center text-sm leading-tight" style="font-family: 'Permanent Marker', cursive; color: #2a2018;">{{ p.caption }}</div>
              </div>
            </div>
          </div>

          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <NuxtLink
              to="/festivals"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-md text-base font-bold uppercase tracking-wider"
              style="background: #2a2018; color: #ede4d3; box-shadow: 4px 4px 0 -1px #dc2626;"
            >
              add me to the wall <ArrowRight class="w-4 h-4" />
            </NuxtLink>
            <span style="font-family: 'Permanent Marker', cursive; color: #2a2018;" class="text-base sm:text-lg">
              ← pick your festival
            </span>
          </div>
        </div>
      </section>

      <!-- STAGES — sticky-note row -->
      <section class="px-6 py-16">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-12">
            <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">page 02</div>
            <h2 class="mt-2 text-3xl sm:text-5xl font-black tracking-tight">pick your door.</h2>
            <p class="mt-2 text-sm" style="color: #5b4830;">five sticky notes. one of them is for you.</p>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-2">
            <NuxtLink
              v-for="s in stages"
              :key="s.label"
              to="/festivals"
              class="block p-5 shadow-md hover:-translate-y-1 transition-transform"
              :style="{
                background: '#fef9c3',
                transform: `rotate(${s.rot}deg)`,
                boxShadow: '3px 5px 0 -1px rgba(0,0,0,0.12), 0 10px 18px rgba(0,0,0,0.12)',
              }"
            >
              <div class="text-[10px] uppercase tracking-widest font-bold" :style="{ color: s.color }">{{ s.label }}</div>
              <div class="mt-3 text-2xl leading-tight" style="font-family: 'Permanent Marker', cursive; color: #2a2018;">{{ s.title }}</div>
              <div class="mt-4 text-[10px] uppercase tracking-wider" style="color: #5b4830;">→ open this door</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- PROOF — bachata stars as a flyer pinned to the wall -->
      <section class="px-6 py-16">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-10">
            <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">page 03</div>
            <h2 class="mt-2 text-3xl sm:text-5xl font-black tracking-tight">
              already
              <span style="font-family: 'Permanent Marker', cursive; color: #dc2626;">going.</span>
            </h2>
          </div>

          <div class="grid md:grid-cols-2 gap-8 items-start">
            <!-- Event flyer -->
            <div class="relative" style="transform: rotate(-1.5deg);">
              <!-- Push pin -->
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full z-20" style="background: radial-gradient(circle at 35% 35%, #fca5a5 0%, #dc2626 60%, #7f1d1d 100%); box-shadow: 0 2px 4px rgba(0,0,0,0.4);" />
              <div class="bg-white shadow-2xl">
                <div class="aspect-[4/3] p-6 flex flex-col justify-end text-white" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #f43f5e 100%);">
                  <div class="text-[10px] uppercase tracking-[0.3em] opacity-90">In 3 days · Barcelona</div>
                  <div class="text-4xl font-black mt-1 leading-none">Bachata Stars<br>Barcelona</div>
                </div>
                <div class="p-5 border-t-4 border-double" style="border-color: #2a2018;">
                  <div class="text-xs flex flex-wrap gap-3 mb-3" style="color: #5b4830;">
                    <span class="inline-flex items-center gap-1"><Calendar class="w-3 h-3" />Jul 3–6, 2026</span>
                    <span class="inline-flex items-center gap-1"><MapPin class="w-3 h-3" />Sala Apolo</span>
                  </div>
                  <NuxtLink
                    to="/festivals/bachata-stars-barcelona-2026"
                    class="block text-center py-2 text-sm font-bold uppercase tracking-wider"
                    style="background: #2a2018; color: #ede4d3; box-shadow: 3px 3px 0 -1px #dc2626;"
                  >
                    grab my ticket →
                  </NuxtLink>
                </div>
              </div>
            </div>

            <!-- Roster as polaroid stack -->
            <div class="relative" style="transform: rotate(1deg);">
              <div class="bg-white shadow-xl p-4">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-dashed" style="border-color: #5b4830;">
                  <div class="text-sm font-bold" style="font-family: 'Permanent Marker', cursive;">who's coming →</div>
                  <span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style="background: #fef3c7; color: #92400e;">sample</span>
                </div>
                <ul class="space-y-2.5">
                  <li v-for="a in [
                    { n: 'Maxine', c: 'Vienna', col: '#dc2626' },
                    { n: 'Dayron', c: 'Madrid', col: '#2563eb' },
                    { n: 'Sofia',  c: 'Munich', col: '#16a34a' },
                    { n: 'Mark',   c: 'Berlin', col: '#f59e0b' },
                  ]" :key="a.n" class="flex items-center gap-3 border-b border-dashed pb-2 last:border-b-0" style="border-color: rgba(0,0,0,0.1);">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md" :style="{ background: a.col }">{{ a.n.charAt(0) }}</div>
                    <div class="flex-1">
                      <div class="text-base font-bold">{{ a.n }}</div>
                      <div class="text-[11px]" style="color: #5b4830;">{{ a.c }}</div>
                    </div>
                    <span style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">✓</span>
                  </li>
                </ul>
                <div class="mt-3 pt-3 border-t-2 border-dashed text-center text-xs" style="border-color: #5b4830; font-family: 'Shadows Into Light', cursive; font-size: 17px; color: #2a2018;">
                  + 197 others not pinned here
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- LOOP — five spiral-bound steps on a sketchbook page -->
      <section class="px-6 py-16">
        <div class="max-w-3xl mx-auto">
          <div class="text-center mb-10">
            <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">page 04</div>
            <h2 class="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
              five steps. <span style="font-family: 'Permanent Marker', cursive; color: #dc2626;">no surprises.</span>
            </h2>
          </div>
          <div class="bg-white shadow-xl p-6 sm:p-8 relative" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 32px, #cbd5e1 32px, #cbd5e1 33px);">
            <!-- red margin -->
            <div class="absolute left-12 top-0 bottom-0 w-px" style="background: #dc2626;" />
            <ol class="ml-8 space-y-5">
              <li v-for="(s, i) in [
                { t: 'find your festival',      b: 'every dance event we map.' },
                { t: 'buy your ticket',          b: 'one tap. transferable.' },
                { t: 'see who else is going',    b: 'opt-in. no fake friends.' },
                { t: 'plan the trip together',   b: 'dinners. rides. partners.' },
                { t: 'arrive with friends',      b: 'skip the wall.' },
              ]" :key="s.t" class="flex items-baseline gap-4">
                <div class="text-2xl font-black shrink-0 w-8" style="font-family: 'Permanent Marker', cursive; color: #dc2626;">{{ i + 1 }}.</div>
                <div>
                  <div class="text-lg font-bold" style="font-family: 'Permanent Marker', cursive; color: #2a2018;">{{ s.t }}</div>
                  <div class="text-sm" style="color: #5b4830;">{{ s.b }}</div>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <!-- FOUNDER — polaroid + caption -->
      <section class="px-6 py-16">
        <div class="max-w-3xl mx-auto">
          <div class="text-center mb-8">
            <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">page 05</div>
            <h2 class="mt-2 text-3xl sm:text-4xl font-black tracking-tight">why I made this.</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 items-center">
            <div class="relative" style="transform: rotate(-3deg);">
              <div class="absolute -top-2 left-1/3 w-14 h-4 z-20" style="background: repeating-linear-gradient(90deg, rgba(254, 240, 138, 0.85) 0 6px, rgba(252, 211, 77, 0.7) 6px 12px); transform: rotate(-7deg);" />
              <div class="bg-white p-2 pb-10 shadow-xl">
                <img src="/alosha-dj.jpg" alt="Alösha" class="w-full aspect-square object-cover">
                <div class="absolute bottom-1 left-2 right-2 text-center text-base" style="font-family: 'Permanent Marker', cursive; color: #2a2018;">alösha · MUC</div>
              </div>
            </div>
            <div>
              <p class="text-2xl leading-snug" style="font-family: 'Shadows Into Light', cursive; color: #2a2018;">
                "the first time I flew to a festival alone, I spent half the first night by the wall.
                <span style="color: #dc2626;">I built WeDance so the next dancer does not have to."</span>
              </p>
              <div class="mt-5 text-sm" style="font-family: 'Permanent Marker', cursive; color: #5b4830;">— alösha, summer 2026</div>
            </div>
          </div>
        </div>
      </section>

      <!-- SUPPLY — sticky-note row -->
      <section class="px-6 py-16 border-y-2 border-dashed" style="border-color: rgba(0,0,0,0.2);">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-8">
            <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">page 06</div>
            <h2 class="mt-2 text-3xl sm:text-4xl font-black tracking-tight">
              for the
              <span style="font-family: 'Permanent Marker', cursive; color: #dc2626;">other side</span>
              of the floor.
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NuxtLink
              v-for="(c, i) in [
                { t: 'organize',    b: 'sell tickets · reach audience',  bg: '#fecaca', dot: '#dc2626' },
                { t: 'teach · DJ',  b: 'get on the map · get bookings',  bg: '#bfdbfe', dot: '#2563eb', soon: true },
                { t: 'venue',       b: 'list your floor · fill nights',  bg: '#bbf7d0', dot: '#16a34a', soon: true },
              ]"
              :key="c.t"
              to="/organizers"
              class="block p-5 shadow-md hover:-translate-y-1 transition-transform"
              :style="{
                background: c.bg,
                transform: `rotate(${([-1.5, 0.8, -0.8][i])}deg)`,
                boxShadow: '3px 5px 0 -1px rgba(0,0,0,0.15), 0 12px 18px rgba(0,0,0,0.12)',
              }"
            >
              <div class="flex items-center gap-2 mb-3">
                <div class="w-2.5 h-2.5 rounded-full" :style="{ background: c.dot }" />
                <div class="text-[10px] uppercase tracking-widest font-bold" style="color: #2a2018;">for you?</div>
              </div>
              <div class="text-2xl leading-tight" style="font-family: 'Permanent Marker', cursive; color: #2a2018;">{{ c.t }}</div>
              <div class="mt-2 text-xs" style="color: #2a2018;">{{ c.b }}</div>
              <span v-if="c.soon" class="inline-block mt-3 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style="background: rgba(0,0,0,0.1); color: #2a2018;">Soon</span>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- FINAL — last page -->
      <section class="px-6 py-20">
        <div class="max-w-2xl mx-auto text-center">
          <div style="font-family: 'Permanent Marker', cursive; color: #dc2626;" class="text-base">last page</div>
          <h2 class="mt-3 text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            see you on the
            <span class="inline-block relative" style="font-family: 'Permanent Marker', cursive; color: #dc2626;">
              wall.
              <svg class="absolute -bottom-2 left-0 w-full" height="14" viewBox="0 0 100 14" preserveAspectRatio="none">
                <path d="M2,8 Q25,2 50,7 T98,5" fill="none" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </span>
          </h2>
          <NuxtLink
            to="/festivals"
            class="mt-10 inline-flex items-center gap-2 px-6 py-3 text-base font-bold uppercase tracking-wider"
            style="background: #2a2018; color: #ede4d3; box-shadow: 5px 5px 0 -1px #dc2626;"
          >
            pin me up <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
      </section>

      <footer class="py-6 text-center text-xs" style="font-family: 'Permanent Marker', cursive; color: #5b4830;">
        — closed book · munich · 2026 —
      </footer>
    </div>

    <!-- Variant switcher -->
    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="bg-white/95 backdrop-blur shadow-lg px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold border" style="border-color: rgba(0,0,0,0.18);">
        <span class="pr-1" style="color: #5b4830;">Compare</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">V1</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">V2</NuxtLink>
        <NuxtLink to="/" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">V3</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">V4</NuxtLink>
        <NuxtLink to="/sketches/landing/v7" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">V7</NuxtLink>
        <NuxtLink to="/sketches/landing/v9" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">V9</NuxtLink>
        <NuxtLink to="/sketches/landing/v12" class="px-2 py-0.5 text-white" style="background: #dc2626;">V12 · Polaroid</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b4830;">Current</NuxtLink>
      </div>
    </div>
  </div>
</template>
