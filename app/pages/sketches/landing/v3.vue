<script setup lang="ts">
/**
 * Landing — V3: Tropical / Cuban poster
 *
 * Reference: Buena Vista Social Club album art, Havana street murals,
 * 1950s travel posters, hand-painted danzón flyers.
 * Mood: warm, sensual, communal — the page IS the venue.
 * Language: English-first (V3 originally had Spanish flourishes; stripped
 * so the brand reads inclusively across genres. Localization layer will
 * add EN/DE/ES/etc. later.)
 * Type: serif display (Playfair Display) + handwritten script (Caveat).
 * Palette: cream paper bg, warm rose / gold / coral / palm green accents.
 * Decorative: curved SVG dividers, sun rays, palm motifs.
 */
import { ArrowRight, MapPin, Calendar } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Welcome to the dance',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const stages = [
  { label: 'Curious',    title: 'Find your first dance', detail: 'Salsa · Bachata · Kizomba · Timba · 60 more', emoji: '✨' },
  { label: 'Beginner',   title: 'Find a teacher',         detail: '12 in Munich · 8 in Berlin',                  emoji: '🎓' },
  { label: 'Weekly',     title: 'Know your city',         detail: 'Practicas, socials, taster classes',          emoji: '🌃' },
  { label: 'Traveling',  title: 'Plan your year',         detail: '7 events · 5 cities · 2026',                  emoji: '✈️' },
  { label: 'Reviewer',   title: 'Tell the truth',         detail: 'Honest reviews — coming soon',                emoji: '⭐' },
]

const attendees = [
  { n: 'Maxine', c: 'Vienna', col: '#dc2626' },
  { n: 'Dayron', c: 'Madrid', col: '#0891b2' },
  { n: 'Sofia',  c: 'Munich', col: '#16a34a' },
  { n: 'Mark',   c: 'Berlin', col: '#f59e0b' },
]
</script>

<template>
  <div
    class="min-h-screen relative overflow-x-hidden"
    style="
      background:
        radial-gradient(ellipse at 20% 0%, rgba(251, 146, 60, 0.18), transparent 50%),
        radial-gradient(ellipse at 90% 30%, rgba(220, 38, 38, 0.10), transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(22, 163, 74, 0.08), transparent 50%),
        #fbf5ea;
      color:#3b1f0d;
      font-family: 'Inter', system-ui, sans-serif;
    "
  >
    <!-- Subtle paper texture overlay -->
    <div
      class="pointer-events-none fixed inset-0 opacity-[0.18]"
      style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>'); mix-blend-mode: multiply; z-index: 1;"
    />

    <div class="relative z-10">
      <!-- Header — old-fashioned travel poster strip -->
      <header class="border-b" style="border-color:#3b1f0d33;">
        <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <NuxtLink to="/" class="flex items-baseline gap-2">
            <span class="font-bold text-lg" style="font-family:'Playfair Display', serif;">WeDance</span>
            <span class="text-[10px] uppercase tracking-[0.25em]" style="color:#9a5614;">Summer Edition · 2026</span>
          </NuxtLink>
          <nav class="flex items-center gap-5 text-sm" style="font-family:'Playfair Display', serif;">
            <NuxtLink to="/festivals" class="italic hover:underline">Festivals</NuxtLink>
            <NuxtLink to="/cities" class="italic hover:underline">Cities</NuxtLink>
            <NuxtLink to="/organizers" class="italic hover:underline hidden sm:inline">For organizers</NuxtLink>
          </nav>
        </div>
      </header>

      <!-- HERO -->
      <section class="relative">
        <div class="max-w-6xl mx-auto px-4 pt-14 pb-20 grid md:grid-cols-12 gap-10 items-center">
          <div class="md:col-span-7 text-center md:text-left">
            <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">
              · Welcome to the dance ·
            </div>
            <h1 class="text-5xl sm:text-7xl leading-[0.95]" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              From your<br>
              first <em class="italic" style="color:#dc2626;">salsa</em><br>
              to your
              <span class="inline-block relative">
                <span style="color:#dc2626;">tenth</span>
                <svg class="absolute left-0 right-0 -bottom-2 w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0,8 Q25,2 50,7 T100,4" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <span class="italic" style="font-family:'Caveat', cursive; color:#16a34a;"> festival.</span>
            </h1>
            <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-md mx-auto md:mx-0" style="color:#5b3a1d;">
              We map every dance event, every teacher, every venue, every city — and tell you who is going before you book.
            </p>
            <div class="mt-8 flex items-center justify-center md:justify-start gap-5">
              <NuxtLink
                to="/festivals"
                class="fiesta-cta group inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
              >
                <span class="relative z-10">Find your next festival</span>
                <ArrowRight class="w-4 h-4 relative z-10 transition-transform duration-200 ease-out group-hover:translate-x-1 group-active:translate-x-0" />
              </NuxtLink>
              <span class="text-xs italic" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
                — see who's going before you book
              </span>
            </div>
          </div>
          <!-- Photo with decorative frame -->
          <div class="md:col-span-5 relative">
            <!-- Sun rays behind photo -->
            <svg class="absolute -top-8 -right-8 w-40 h-40 opacity-30" viewBox="0 0 100 100">
              <g stroke="#f97316" stroke-width="1.5" fill="none">
                <line v-for="i in 24" :key="i" x1="50" y1="50"
                  :x2="50 + 48 * Math.cos(2 * Math.PI * i / 24)"
                  :y2="50 + 48 * Math.sin(2 * Math.PI * i / 24)" />
              </g>
            </svg>
            <div class="relative rounded-2xl overflow-hidden shadow-2xl border-4" style="border-color:#fbf5ea; box-shadow: 12px 14px 0 -2px #dc2626;">
              <img src="/alosha-charanga.jpg" alt="Alösha on stage at the end of the Charanga Habanera Munich concert he hosted" class="w-full aspect-[4/5] object-cover" style="object-position: center 30%;">
              <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                <div class="text-[10px] uppercase tracking-[0.3em] opacity-90">Your host · the night he brought the band</div>
                <div class="text-xl mt-1" style="font-family:'Caveat', cursive;">— Alösha · Charanga Habanera, München</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Wave divider -->
        <svg class="block w-full h-12" viewBox="0 0 1440 60" preserveAspectRatio="none">
          <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.1"/>
        </svg>
      </section>

      <!-- STAGES — passport stamps -->
      <section class="border-y" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);">
        <div class="max-w-6xl mx-auto px-4 py-16">
          <div class="text-center mb-10">
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Wherever you are in dance</div>
            <h2 class="mt-3 text-3xl sm:text-5xl" style="font-family:'Playfair Display', serif;">
              <em class="italic">Pick your door.</em>
            </h2>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <NuxtLink
              v-for="(s, i) in stages"
              :key="s.label"
              to="/festivals"
              class="block rounded-2xl px-4 py-5 text-center hover:-translate-y-1 transition-transform"
              :style="{
                background: 'rgba(255,255,255,0.7)',
                border: '2px dashed ' + ['#dc2626', '#0891b2', '#16a34a', '#f59e0b', '#a855f7'][i],
                boxShadow: '0 4px 0 -1px ' + ['#dc2626', '#0891b2', '#16a34a', '#f59e0b', '#a855f7'][i] + '33',
              }"
            >
              <div class="text-3xl">{{ s.emoji }}</div>
              <div class="mt-2 text-[10px] uppercase tracking-widest font-bold" :style="{color: ['#dc2626', '#0891b2', '#16a34a', '#f59e0b', '#a855f7'][i]}">{{ s.label }}</div>
              <div class="mt-1 text-base font-bold" style="font-family:'Playfair Display', serif;">{{ s.title }}</div>
              <div class="mt-1 text-[11px]" style="color:#5b3a1d;">{{ s.detail }}</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- PROOF -->
      <section class="py-16">
        <div class="max-w-3xl mx-auto px-4 text-center">
          <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">This is the product</div>
          <h2 class="mt-3 text-4xl sm:text-5xl" style="font-family:'Playfair Display', serif;">
            <em class="italic">See who else is</em> <span style="color:#dc2626;">going</span>.
          </h2>
          <p class="mt-4 text-sm sm:text-base leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
            Every ticket sold turns into a face on the event page. <span class="italic" style="font-family:'Caveat', cursive; font-size:20px;">No fake friends.</span>
          </p>

          <!-- Event card as concert poster -->
          <div class="mt-10 mx-auto max-w-md text-left relative">
            <!-- Tape strips -->
            <div class="absolute -top-3 left-6 w-20 h-4 bg-yellow-200/80 rotate-[-4deg] shadow"/>
            <div class="absolute -top-3 right-6 w-20 h-4 bg-yellow-200/80 rotate-[3deg] shadow"/>

            <div class="rounded-lg overflow-hidden shadow-2xl bg-white border" style="border-color:#3b1f0d22;">
              <div class="p-6" style="background:linear-gradient(135deg,#7c3aed 0%, #c026d3 50%, #f43f5e 100%);">
                <div class="text-[10px] uppercase tracking-[0.3em] text-white/90 font-bold">In 3 days · Barcelona</div>
                <h3 class="mt-2 text-3xl text-white leading-tight" style="font-family:'Playfair Display', serif;">
                  Bachata Stars<br>Barcelona
                </h3>
                <div class="mt-2 text-xs text-white/80 flex flex-wrap gap-3">
                  <span class="inline-flex items-center gap-1"><Calendar class="w-3 h-3" /> Jul 3–6, 2026</span>
                  <span class="inline-flex items-center gap-1"><MapPin class="w-3 h-3" /> Sala Apolo</span>
                </div>
              </div>
              <div class="p-5">
                <div class="text-[10px] uppercase tracking-[0.25em] font-bold mb-3 flex items-center justify-between" style="color:#9a5614;">
                  <span>Who's coming</span>
                  <span class="px-1.5 py-0.5 rounded text-[9px]" style="background:#fef3c7; color:#92400e;">Sample</span>
                </div>
                <ul class="grid grid-cols-2 gap-2">
                  <li v-for="a in attendees" :key="a.n" class="flex items-center gap-2 p-1">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow" :style="{background: a.col}">{{ a.n.charAt(0) }}</div>
                    <div class="min-w-0">
                      <div class="text-sm font-bold truncate">{{ a.n }}</div>
                      <div class="text-[10px]" style="color:#9a5614;">{{ a.c }}</div>
                    </div>
                  </li>
                </ul>
                <NuxtLink
                  to="/festivals/bachata-stars-barcelona-2026"
                  class="mt-4 block text-center w-full py-3 rounded-full text-white text-xs font-bold uppercase tracking-widest"
                  style="background:linear-gradient(135deg,#dc2626,#f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
                >
                  Get tickets ✨
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- LOOP — 5 steps as numbered banderitas -->
      <section class="py-16" style="background:rgba(251, 245, 234, 0.5);">
        <div class="max-w-3xl mx-auto px-4">
          <div class="text-center mb-12">
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">How it works</div>
            <h2 class="mt-3 text-3xl sm:text-4xl" style="font-family:'Playfair Display', serif;">
              <em class="italic">Five steps.</em> No surprises.
            </h2>
          </div>
          <ol class="space-y-4">
            <li v-for="(s, i) in [
              { t: 'Pick your festival',         b: 'From every dance event we map across Europe.' },
              { t: 'Buy your ticket in one tap', b: 'Secure checkout, instant confirmation.' },
              { t: 'See who else is going',      b: 'Opt-in only. No strangers, no fake friends.' },
              { t: 'Plan the trip together',     b: 'Dinners, ride-shares, first-night partner.' },
              { t: 'Arrive with friends',        b: 'Skip the wall. The floor is waiting.' },
            ]" :key="s.t" class="flex items-start gap-4 bg-white/70 rounded-xl p-4 border" style="border-color:#3b1f0d22;">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 shadow"
                :style="{ background: ['#dc2626', '#f97316', '#16a34a', '#0891b2', '#a855f7'][i] }"
              >{{ i + 1 }}</div>
              <div>
                <div class="text-base font-bold" style="font-family:'Playfair Display', serif;">{{ s.t }}</div>
                <div class="text-sm mt-0.5" style="color:#5b3a1d;">{{ s.b }}</div>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- FOUNDER — handwritten letter -->
      <section class="py-16">
        <div class="max-w-2xl mx-auto px-4">
          <div class="bg-white/80 rounded-2xl p-8 shadow-xl border-2 border-dashed" style="border-color:#dc262644;">
            <div class="text-[10px] uppercase tracking-[0.3em] mb-4" style="color:#9a5614;">A letter from the founder</div>
            <p class="text-2xl leading-relaxed" style="font-family:'Caveat', cursive; color:#3b1f0d;">
              Dear dancer —<br><br>
              The first time I flew to a festival alone, I spent half the first night by the wall. I built WeDance so the next dancer does not have to.<br><br>
              See you on the floor.
            </p>
            <div class="mt-6 flex items-center gap-3 border-t pt-4" style="border-color:#3b1f0d22;">
              <img src="/alosha-dj.jpg" alt="Alösha" class="w-12 h-12 rounded-full object-cover">
              <div>
                <div class="text-lg" style="font-family:'Caveat', cursive;">— Alösha</div>
                <div class="text-[11px]" style="color:#9a5614;">Munich · 2026</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SUPPLY — vintage classified strip -->
      <section style="background:linear-gradient(135deg,#3b1f0d 0%, #5b3a1d 100%); color:#fbf5ea;" class="py-16">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-10">
            <div class="text-xs uppercase tracking-[0.3em]" style="color:#fbbf24;">On the other side of the floor</div>
            <h2 class="mt-3 text-3xl sm:text-4xl" style="font-family:'Playfair Display', serif;">
              <em class="italic">Run a festival, teach, or own a venue?</em>
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NuxtLink
              v-for="c in [
                { t: 'Organize a festival', d: 'Sell tickets · reach the audience · see who is coming' },
                { t: 'Teach or DJ',          d: 'Get on the city map · get bookings', soon: true },
                { t: 'Own a venue',          d: 'List your floor · fill quiet nights', soon: true },
              ]"
              :key="c.t"
              to="/organizers"
              class="rounded-xl p-5 border hover:-translate-y-1 transition-transform"
              style="background:rgba(251, 245, 234, 0.06); border-color:rgba(251, 245, 234, 0.18);"
            >
              <div class="text-base font-bold flex items-center gap-2" style="font-family:'Playfair Display', serif;">
                {{ c.t }}
                <span v-if="c.soon" class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style="background:rgba(252, 211, 77, 0.15); color:#fbbf24;">Soon</span>
              </div>
              <div class="mt-2 text-xs" style="color:rgba(251, 245, 234, 0.7);">{{ c.d }}</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- FINAL -->
      <section class="py-20">
        <div class="max-w-2xl mx-auto px-4 text-center">
          <h2 class="text-4xl sm:text-5xl" style="font-family:'Playfair Display', serif;">
            <em class="italic">Your next dance</em><br>
            is closer than you <span style="color:#dc2626;">think.</span>
          </h2>
          <NuxtLink
            to="/festivals"
            class="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full text-white text-base font-bold uppercase tracking-wider shadow-lg"
            style="background:linear-gradient(135deg,#dc2626,#f97316); box-shadow: 0 6px 0 -2px #b91c1c, 0 10px 22px rgba(220, 38, 38, 0.35);"
          >
            Find your festival <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
      </section>

      <footer class="border-t py-6 text-center text-xs" style="border-color:#3b1f0d22; color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
        With love · Munich · 2026
      </footer>
    </div>

    <!-- Variant switcher -->
    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="bg-white/95 backdrop-blur shadow-lg rounded-full px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold border" style="border-color:#3b1f0d22;">
        <span style="color:#9a5614;" class="pr-1">Compare</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 rounded-full hover:text-stone-900" style="color:#5b3a1d;">V1</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 rounded-full hover:text-stone-900" style="color:#5b3a1d;">V2</NuxtLink>
        <NuxtLink to="/sketches/landing/v3" class="px-2 py-0.5 rounded-full text-white" style="background:#dc2626;">V3 · Tropical</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 rounded-full hover:text-stone-900" style="color:#5b3a1d;">V4</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 rounded-full hover:text-stone-900" style="color:#5b3a1d;">Current</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hero CTA — warm host-voice button with hover lift + press feedback */
.fiesta-cta {
  background: linear-gradient(135deg, #dc2626, #f97316);
  background-size: 200% 200%;
  background-position: 0% 50%;
  box-shadow:
    0 6px 0 -2px #b91c1c,
    0 8px 18px rgba(220, 38, 38, 0.35);
  transition:
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 220ms ease-out,
    background-position 800ms ease-out;
  will-change: transform, box-shadow;
  position: relative;
  overflow: hidden;
}

/* Slow gradient drift — the button breathes warm tones */
.fiesta-cta {
  animation: fiestaBreathe 6s ease-in-out infinite;
}

@keyframes fiestaBreathe {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}

/* Shimmer sweep (subtle, infinite) */
.fiesta-cta::before {
  content: "";
  position: absolute;
  top: 0;
  left: -120%;
  width: 80%;
  height: 100%;
  background: linear-gradient(
    115deg,
    transparent 0%,
    rgba(255, 255, 255, 0.16) 45%,
    rgba(255, 255, 255, 0.28) 50%,
    rgba(255, 255, 255, 0.16) 55%,
    transparent 100%
  );
  transform: skewX(-18deg);
  pointer-events: none;
  animation: fiestaShimmer 4.5s ease-in-out infinite;
  animation-delay: 1.2s;
}

@keyframes fiestaShimmer {
  0%   { left: -120%; }
  40%  { left: 130%; }
  100% { left: 130%; }
}

/* Hover — lift + bloom */
.fiesta-cta:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 9px 0 -2px #b91c1c,
    0 16px 32px rgba(220, 38, 38, 0.5),
    0 0 0 4px rgba(249, 115, 22, 0.18);
}

/* Active — press down */
.fiesta-cta:active {
  transform: translateY(2px) scale(0.99);
  box-shadow:
    0 2px 0 -1px #b91c1c,
    0 4px 8px rgba(220, 38, 38, 0.35);
  transition-duration: 80ms;
}

/* Brief outward ripple on click — single pulse on each press */
.fiesta-cta:active::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.35);
  animation: fiestaRipple 380ms ease-out forwards;
  pointer-events: none;
}

@keyframes fiestaRipple {
  0%   { opacity: 0.5; transform: scale(0.92); }
  100% { opacity: 0;   transform: scale(1.18); }
}

/* Respect reduced-motion users */
@media (prefers-reduced-motion: reduce) {
  .fiesta-cta,
  .fiesta-cta::before {
    animation: none !important;
  }
  .fiesta-cta {
    transition: box-shadow 150ms ease, transform 150ms ease;
  }
}
</style>
