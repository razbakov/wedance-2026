<script setup lang="ts">
/**
 * Landing — V2: Brutalist / Manifesto
 *
 * Reference: Are.na, OFFF, Berlin club poster aesthetic.
 * Mood: stark, raw, anti-corporate, manifesto.
 * Type: monospace headlines (system mono stack), uppercase.
 * Palette: pure black bg, white text, single accent #fde047 (yellow).
 * Rules: hard borders, no rounded corners, no shadows, no gradients,
 * no animations. Asymmetric grid. Manifesto-style copy.
 */
import { ArrowRight, ArrowUpRight } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WE DANCE / A MANIFESTO',
})

const stages = [
  { n: '01', label: 'CURIOUS',   action: 'FIND YOUR FIRST DANCE' },
  { n: '02', label: 'BEGINNER',  action: 'FIND A TEACHER'        },
  { n: '03', label: 'WEEKLY',    action: 'KNOW YOUR CITY'        },
  { n: '04', label: 'TRAVELING', action: 'PLAN YOUR YEAR'        },
  { n: '05', label: 'REVIEWER',  action: 'TELL THE TRUTH'        },
]

const principles = [
  'NO FAKE FRIENDS.',
  'NO HOOKUP SWIPES.',
  'NO STOCK PHOTOS.',
  'NO HIDDEN FEES.',
  'NO ALGORITHM YOU CANNOT TURN OFF.',
  'NO SECOND-NIGHT REGRETS.',
]
</script>

<template>
  <div class="min-h-screen text-white" style="background:#000; font-family: ui-monospace, 'JetBrains Mono', 'Menlo', monospace;">
    <!-- Strip header -->
    <header class="border-b-2 border-white">
      <div class="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 items-center text-[10px] uppercase tracking-[0.2em]">
        <NuxtLink to="/" class="font-bold tracking-[0.25em]">WE/DANCE</NuxtLink>
        <div class="text-center text-yellow-300">▸ MUNICH · 2026 · MANIFESTO</div>
        <nav class="flex items-center gap-4 justify-end">
          <NuxtLink to="/festivals" class="hover:text-yellow-300">FESTIVALS</NuxtLink>
          <NuxtLink to="/cities" class="hover:text-yellow-300">CITIES</NuxtLink>
          <NuxtLink to="/organizers" class="hover:text-yellow-300 hidden sm:inline">ORG</NuxtLink>
        </nav>
      </div>
    </header>

    <!-- HERO — flush-left, type-driven, no centering -->
    <section class="border-b-2 border-white">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-20 grid grid-cols-12 gap-4">
        <div class="col-span-12 md:col-span-8">
          <div class="text-[10px] uppercase tracking-[0.3em] text-yellow-300">// MANIFESTO 001</div>
          <h1 class="mt-4 text-5xl sm:text-7xl md:text-8xl leading-[0.9] tracking-tighter font-extrabold uppercase">
            STOP<br>
            <span class="text-yellow-300">DANCING</span><br>
            ALONE.
          </h1>
          <div class="mt-8 max-w-md text-sm leading-relaxed border-l-2 border-yellow-300 pl-4">
            EVERY FESTIVAL HAS 100s OF DANCERS ARRIVING SOLO.<br>
            THEY ALL STAND BY THE WALL ON NIGHT ONE.<br>
            <span class="text-yellow-300">WE FIX THIS.</span>
          </div>
          <div class="mt-10 flex flex-col sm:flex-row gap-3">
            <NuxtLink to="/festivals" class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-yellow-300 text-black text-sm font-bold uppercase tracking-wider hover:bg-white">
              FIND YOUR FESTIVAL ▸
            </NuxtLink>
            <NuxtLink to="/sketches/year" class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-sm font-bold uppercase tracking-wider hover:bg-white hover:text-black">
              PLAN YOUR YEAR
            </NuxtLink>
          </div>
        </div>
        <!-- Photo: B/W, hard-edge, signature card -->
        <aside class="col-span-12 md:col-span-4 flex flex-col justify-end">
          <div class="border-2 border-white p-2">
            <img src="/alosha-dj.jpg" alt="ALÖSHA" class="w-full aspect-square object-cover" style="filter: grayscale(1) contrast(1.2);">
          </div>
          <div class="mt-2 text-[10px] uppercase tracking-[0.2em] flex items-center justify-between border-t border-white pt-2">
            <span class="text-yellow-300">ALÖSHA / FOUNDER</span>
            <span>EST. 2026</span>
          </div>
        </aside>
      </div>
    </section>

    <!-- PRINCIPLES — the manifesto itself -->
    <section class="border-b-2 border-white">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div class="text-[10px] uppercase tracking-[0.3em] text-yellow-300 mb-6">// PRINCIPLES</div>
        <ol class="space-y-0 border-y-2 border-white">
          <li v-for="(p, i) in principles" :key="p" class="grid grid-cols-[3rem_1fr] gap-4 items-baseline py-4 border-b-2 border-white last:border-b-0">
            <div class="text-2xl text-yellow-300 font-bold">{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight leading-tight">{{ p }}</div>
          </li>
        </ol>
      </div>
    </section>

    <!-- STAGES — terminal-style listing -->
    <section class="border-b-2 border-white">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div class="grid grid-cols-12 gap-4 mb-6">
          <div class="col-span-12 md:col-span-4 text-[10px] uppercase tracking-[0.3em] text-yellow-300">// PICK YOUR DOOR</div>
          <h2 class="col-span-12 md:col-span-8 text-3xl sm:text-4xl font-extrabold uppercase tracking-tight">
            FIVE DOORS. ONE OF THEM IS YOURS.
          </h2>
        </div>
        <div class="border-2 border-white">
          <NuxtLink
            v-for="(s, i) in stages"
            :key="s.n"
            to="/festivals"
            class="grid grid-cols-12 gap-4 items-center px-4 py-5 border-b-2 border-white last:border-b-0 hover:bg-yellow-300 hover:text-black group transition-colors"
          >
            <div class="col-span-2 text-2xl font-bold">{{ s.n }}</div>
            <div class="col-span-4 text-[10px] uppercase tracking-[0.25em] text-yellow-300 group-hover:text-black">{{ s.label }}</div>
            <div class="col-span-5 text-base sm:text-lg font-bold uppercase">{{ s.action }}</div>
            <div class="col-span-1 text-right">▸</div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- PROOF — single event, ticker-strip framing -->
    <section class="border-b-2 border-white" style="background:#fde047; color:#000;">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-6">// NOW PLAYING</div>
        <div class="grid grid-cols-12 gap-4 items-end">
          <div class="col-span-12 md:col-span-7">
            <div class="text-[10px] uppercase tracking-[0.25em] font-bold mb-2">IN 3 DAYS / BARCELONA</div>
            <h2 class="text-4xl sm:text-6xl font-extrabold uppercase tracking-tighter leading-[0.95]">
              BACHATA<br>STARS<br>BARCELONA
            </h2>
            <div class="mt-3 text-sm font-mono">JUL 3–6, 2026 / SALA APOLO</div>
          </div>
          <div class="col-span-12 md:col-span-5 border-2 border-black p-4 bg-white">
            <div class="text-[10px] uppercase tracking-[0.25em] font-bold mb-3 flex items-center justify-between">
              <span>WHO'S GOING</span>
              <span class="px-1.5 py-0.5 bg-black text-yellow-300">SAMPLE</span>
            </div>
            <ul class="space-y-2">
              <li v-for="a in [
                { n:'MAXINE', c:'VIENNA' },
                { n:'DAYRON', c:'MADRID' },
                { n:'SOFIA',  c:'MUNICH' },
                { n:'MARK',   c:'BERLIN' },
              ]" :key="a.n" class="grid grid-cols-[2rem_1fr_1fr] gap-3 text-xs font-mono border-b border-black/20 pb-2 last:border-b-0 last:pb-0">
                <div class="w-7 h-7 border-2 border-black flex items-center justify-center font-bold">{{ a.n.charAt(0) }}</div>
                <div class="font-bold uppercase">{{ a.n }}</div>
                <div class="text-right uppercase">{{ a.c }}</div>
              </li>
            </ul>
            <NuxtLink to="/festivals/bachata-stars-barcelona-2026" class="mt-4 block w-full text-center bg-black text-yellow-300 py-2 text-xs font-bold uppercase tracking-wider hover:bg-yellow-300 hover:text-black border-2 border-black">
              GET TICKETS ▸
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- THE LOOP — terminal-style numbered list -->
    <section class="border-b-2 border-white">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div class="text-[10px] uppercase tracking-[0.3em] text-yellow-300 mb-6">// THE LOOP</div>
        <h2 class="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-10">5 STEPS. NO SURPRISES.</h2>
        <ol class="grid grid-cols-1 md:grid-cols-5 gap-0 border-2 border-white">
          <li v-for="(s, i) in [
            'FIND',
            'PAY',
            'SEE',
            'PLAN',
            'ARRIVE',
          ]" :key="s" class="px-4 py-5 border-b-2 md:border-b-0 md:border-r-2 border-white last:border-b-0 last:border-r-0 flex flex-col gap-2">
            <div class="text-yellow-300 text-xs font-bold">STEP_{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="text-3xl font-extrabold uppercase">{{ s }}</div>
            <div class="text-[11px] font-mono text-white/70 leading-relaxed">
              {{ [
                'every festival, mapped',
                'one-tap secure checkout',
                'the verified faces, opt-in',
                'dinners, rides, partners',
                'skip the wall'
              ][i] }}
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- FOUNDER STATEMENT — quote block, signed -->
    <section class="border-b-2 border-white">
      <div class="max-w-3xl mx-auto px-4 py-16 sm:py-20">
        <blockquote class="text-2xl sm:text-3xl font-mono leading-snug border-l-4 border-yellow-300 pl-6">
          "THE FIRST TIME I FLEW TO A FESTIVAL ALONE,<br>
          I SPENT HALF THE FIRST NIGHT BY THE WALL.<br>
          <span class="text-yellow-300">I BUILT WEDANCE SO THE NEXT DANCER DOES NOT HAVE TO.</span>"
        </blockquote>
        <div class="mt-6 text-[10px] uppercase tracking-[0.25em] flex items-center gap-3">
          <span class="text-yellow-300">— ALÖSHA</span>
          <span class="opacity-50">/</span>
          <span>MUNICH</span>
          <span class="opacity-50">/</span>
          <span>2026</span>
        </div>
      </div>
    </section>

    <!-- SUPPLY -->
    <section style="background:#fde047; color:#000;" class="border-b-2 border-black">
      <div class="max-w-7xl mx-auto px-4 py-12 sm:py-16">
        <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-6">// FOR THE OTHER SIDE</div>
        <h2 class="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-8">
          YOU RUN A FLOOR? WE WORK WITH YOU.
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-0 border-2 border-black">
          <NuxtLink
            v-for="(c, i) in [
              { t: 'ORGANIZE', d: 'SELL TICKETS · REACH AUDIENCE · SEE WHO IS COMING' },
              { t: 'TEACH/DJ', d: 'GET ON THE MAP · GET BOOKINGS', soon: true },
              { t: 'VENUE',    d: 'FILL QUIET NIGHTS', soon: true },
            ]"
            :key="c.t"
            to="/organizers"
            class="px-5 py-6 border-b-2 sm:border-b-0 sm:border-r-2 border-black last:border-b-0 last:border-r-0 hover:bg-black hover:text-yellow-300 group"
          >
            <div class="text-2xl font-extrabold flex items-center gap-2 uppercase">
              {{ c.t }} ▸
              <span v-if="c.soon" class="text-[9px] uppercase tracking-wider bg-black text-yellow-300 px-1.5 py-0.5 group-hover:bg-yellow-300 group-hover:text-black">SOON</span>
            </div>
            <div class="mt-2 text-[11px] font-mono uppercase">{{ c.d }}</div>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- FINAL -->
    <section>
      <div class="max-w-7xl mx-auto px-4 py-16 sm:py-24">
        <h2 class="text-5xl sm:text-8xl font-extrabold uppercase tracking-tighter leading-[0.9]">
          STOP<br>
          STANDING<br>
          BY THE <span class="text-yellow-300">WALL.</span>
        </h2>
        <NuxtLink to="/festivals" class="mt-10 inline-flex items-center gap-2 px-6 py-3 bg-yellow-300 text-black text-sm font-bold uppercase tracking-wider hover:bg-white">
          FIND YOUR FESTIVAL ▸
        </NuxtLink>
      </div>
    </section>

    <!-- Footer + variant switcher -->
    <footer class="border-t-2 border-white">
      <div class="max-w-7xl mx-auto px-4 py-6 text-[10px] uppercase tracking-[0.2em] flex justify-between items-center">
        <span>WE/DANCE © 2026 · MUNICH</span>
        <span class="text-yellow-300">// END_MANIFESTO</span>
      </div>
    </footer>

    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="bg-black border-2 border-white px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold">
        <span class="text-white/50 pr-1">COMPARE</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 text-white hover:text-yellow-300">V1</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 bg-yellow-300 text-black">V2/MANIFESTO</NuxtLink>
        <NuxtLink to="/sketches/landing/v3" class="px-2 py-0.5 text-white hover:text-yellow-300">V3</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 text-white hover:text-yellow-300">V4</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 text-white/60 hover:text-yellow-300">CURRENT</NuxtLink>
      </div>
    </div>
  </div>
</template>
