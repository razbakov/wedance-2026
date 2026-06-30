<script setup lang="ts">
/**
 * Landing — V7: Vintage travel postcard
 *
 * Reference: Visit Cuba postcards (1950s–60s), Italian travel literature,
 * Wes Anderson title cards, found-paper aesthetics.
 * Mood: souvenir, nostalgic, scattered tabletop of memories.
 * Type: postcard-back script (Caveat) + tourist-poster serif (Playfair)
 *       + typewriter body (Special Elite).
 * Palette: cream paper + faded tourist primaries (postcard cyan, sun yellow,
 *          rose, palm green).
 * Layout: each section is a different postcard. Washi tape, stamps,
 *          postmarks. Centered Wes-Anderson symmetry overall, individual
 *          cards rotate softly.
 */
import { ArrowRight } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Postcards from the floor',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Playfair+Display:ital,wght@0,700;1,400;1,700&family=Special+Elite&display=swap' },
  ],
})

const stages = [
  { city: 'Vienna',    color: '#0891b2', stamp: '€0.85', tag: 'CURIOSO',     headline: 'A first taste',     body: 'Pick a dance. Pick a class.', rot: -2 },
  { city: 'Munich',    color: '#dc2626', stamp: '€0.85', tag: 'PRINCIPIANTE', headline: 'A teacher who fits', body: '12 in Munich, 8 in Berlin.',  rot: 1.5 },
  { city: 'Madrid',    color: '#f59e0b', stamp: '€0.85', tag: 'CADA SEMANA', headline: 'A city you know',    body: 'Practicas, socials, surprise visits.', rot: -1 },
  { city: 'Barcelona', color: '#16a34a', stamp: '€0.85', tag: 'VIAJANDO',    headline: 'A year you build',   body: 'Pick festivals. Plan trips.', rot: 2 },
  { city: 'Habana',    color: '#a855f7', stamp: '€0.85', tag: 'CRÍTICO',     headline: 'A truth you write',  body: 'Honest reviews — coming soon.', rot: -1.5 },
]
</script>

<template>
  <div
    class="min-h-screen relative overflow-x-hidden"
    style="background: #f4ecd8; color: #2a1f12; font-family: 'Special Elite', 'Courier New', monospace;"
  >
    <!-- Paper texture overlay -->
    <div
      class="pointer-events-none fixed inset-0 opacity-[0.25]"
      style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.7%22 numOctaves=%223%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.55%22/></svg>'); mix-blend-mode: multiply; z-index: 1;"
    />

    <!-- Coffee-stain rings -->
    <div class="pointer-events-none absolute top-[200px] right-[8%] w-32 h-32 rounded-full opacity-20 z-[1]" style="background: radial-gradient(circle, transparent 38%, #8b4513 41%, transparent 44%, #8b4513 47%, transparent 50%);" />
    <div class="pointer-events-none absolute top-[1400px] left-[5%] w-40 h-40 rounded-full opacity-15 z-[1]" style="background: radial-gradient(circle, transparent 40%, #8b4513 43%, transparent 46%);" />

    <div class="relative z-10">
      <!-- Header — passport stamp -->
      <header>
        <div class="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <NuxtLink to="/" class="flex items-baseline gap-2">
            <span class="text-2xl font-bold" style="font-family: 'Playfair Display', serif;">WeDance</span>
            <span class="text-xs tracking-[0.3em] uppercase" style="color: #8b4513;">· Poste Restante ·</span>
          </NuxtLink>
          <nav class="flex items-center gap-5 text-xs uppercase tracking-wider" style="color: #5b3a1d;">
            <NuxtLink to="/festivals" class="hover:underline">Festivales</NuxtLink>
            <NuxtLink to="/cities" class="hover:underline">Ciudades</NuxtLink>
            <NuxtLink to="/organizers" class="hover:underline hidden sm:inline">Organizadores</NuxtLink>
          </nav>
        </div>
        <div class="border-t border-b border-dashed py-1 text-center text-[10px] uppercase tracking-[0.4em]" style="border-color: #8b4513; color: #8b4513;">
          ✶ Edición 2026 ✶ Munich · Vienna · Madrid · Barcelona · La Habana ✶
        </div>
      </header>

      <!-- HERO POSTCARD — the front of the card -->
      <section class="py-16">
        <div class="max-w-5xl mx-auto px-4">
          <div class="text-center mb-10">
            <div class="text-xs tracking-[0.4em] uppercase" style="color: #8b4513;">Front of the card</div>
            <h1 class="mt-3 text-5xl sm:text-7xl leading-tight" style="font-family: 'Playfair Display', serif; color: #2a1f12;">
              From your first <em class="italic" style="color: #dc2626;">salsa</em><br>
              <span style="font-family: 'Caveat', cursive; font-size: 1.2em; color: #0891b2;">to your tenth festival</span>.
            </h1>
          </div>

          <!-- Two postcards on the table -->
          <div class="grid md:grid-cols-2 gap-8 items-center">
            <!-- Postcard front: the photo -->
            <div class="relative" style="transform: rotate(-2.5deg);">
              <!-- Washi tape -->
              <div class="absolute -top-3 left-1/3 w-16 h-5 z-20" style="background: repeating-linear-gradient(90deg, #f59e0b 0 8px, #fbbf24 8px 16px); opacity: 0.7; transform: rotate(-6deg);" />
              <div class="relative bg-white shadow-2xl p-3" style="box-shadow: 8px 12px 0 -2px rgba(42, 31, 18, 0.15), 0 20px 40px rgba(42, 31, 18, 0.18);">
                <img src="/alosha-dj.jpg" alt="Alösha at La Rumba" class="w-full aspect-[4/5] object-cover" style="filter: sepia(0.15) contrast(0.95) saturate(0.85);">
                <div class="mt-3 pb-1 text-center" style="font-family: 'Caveat', cursive;">
                  <div class="text-2xl">La Rumba · München · 2026</div>
                  <div class="text-xs uppercase tracking-[0.3em] mt-1" style="font-family: 'Special Elite', monospace; color: #8b4513;">— behind the decks —</div>
                </div>
              </div>
            </div>

            <!-- Postcard back: the message -->
            <div class="relative" style="transform: rotate(1.5deg);">
              <div class="bg-white shadow-2xl p-6 sm:p-8" style="box-shadow: -6px 10px 0 -2px rgba(42, 31, 18, 0.12), 0 18px 36px rgba(42, 31, 18, 0.15); background-image: repeating-linear-gradient(0deg, transparent, transparent 26px, #c9a87a22 26px, #c9a87a22 27px);">
                <!-- Top: stamp + postmark -->
                <div class="flex items-start justify-between mb-5 border-b border-dashed pb-3" style="border-color: #c9a87a;">
                  <div class="text-[10px] uppercase tracking-[0.25em]" style="color: #8b4513;">
                    To: every dancer<br>
                    <span style="color: #2a1f12;">en route, anywhere</span>
                  </div>
                  <div class="relative">
                    <div class="border-2 border-dashed px-2 py-2 text-center" style="border-color: #dc2626; color: #dc2626; transform: rotate(-3deg);">
                      <div class="text-[8px] uppercase tracking-widest">Republica</div>
                      <div class="text-base font-bold leading-none">€0.85</div>
                      <div class="text-[8px] tracking-widest">del Baile</div>
                    </div>
                    <div class="absolute -top-2 -right-3 w-16 h-16 rounded-full border-2 opacity-60" style="border-color: #2a1f12; transform: rotate(15deg);">
                      <div class="text-[7px] uppercase tracking-widest text-center pt-1.5" style="color: #2a1f12;">★ MÜNCHEN ★</div>
                      <div class="text-center text-[9px] font-bold" style="color: #2a1f12;">30·VI</div>
                      <div class="text-[7px] uppercase tracking-widest text-center" style="color: #2a1f12;">2026</div>
                    </div>
                  </div>
                </div>
                <!-- Body -->
                <p style="font-family: 'Caveat', cursive; font-size: 22px; line-height: 1.4; color: #2a1f12;">
                  Dear future dancer —<br><br>
                  We map every dance event, every teacher, every venue, every city. And we tell you who else is going, before you book.<br><br>
                  <span style="color: #dc2626;">Don't fly alone.</span>
                </p>
                <div class="mt-4 flex items-center justify-between">
                  <NuxtLink
                    to="/festivals"
                    class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow-md"
                    style="background: #dc2626; font-family: 'Special Elite', monospace;"
                  >
                    Find a festival <ArrowRight class="w-3.5 h-3.5" />
                  </NuxtLink>
                  <span style="font-family: 'Caveat', cursive; font-size: 18px; color: #8b4513;">— con cariño,<br>&nbsp;&nbsp;&nbsp;&nbsp;Alösha</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- STAGES — 5 scattered postcards, each from a different city -->
      <section class="py-16">
        <div class="max-w-6xl mx-auto px-4">
          <div class="text-center mb-12">
            <div class="text-xs tracking-[0.4em] uppercase" style="color: #8b4513;">From the mailbag</div>
            <h2 class="mt-3 text-3xl sm:text-5xl" style="font-family: 'Playfair Display', serif;">
              <em class="italic">Pick your</em> <span style="color: #dc2626;">door</span>.
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-3">
            <NuxtLink
              v-for="(s, i) in stages"
              :key="s.city"
              to="/festivals"
              class="relative block bg-white shadow-xl p-3 hover:-translate-y-2 transition-transform"
              :style="{ transform: `rotate(${s.rot}deg)`, boxShadow: '4px 8px 0 -2px rgba(42, 31, 18, 0.12), 0 12px 24px rgba(42, 31, 18, 0.12)' }"
            >
              <!-- Postage stamp corner -->
              <div class="absolute -top-2 -right-2 border-2 border-dashed px-1.5 py-1 text-center bg-white z-10" :style="{ borderColor: s.color, color: s.color, transform: 'rotate(8deg)' }">
                <div class="text-[7px] uppercase tracking-widest">{{ s.stamp }}</div>
              </div>
              <!-- City type panel -->
              <div class="h-32 flex items-center justify-center border-4 border-double" :style="{ borderColor: s.color, background: s.color + '12' }">
                <div class="text-center">
                  <div class="text-[9px] uppercase tracking-[0.3em] font-bold" :style="{ color: s.color }">{{ s.tag }}</div>
                  <div class="mt-1 text-3xl leading-none" style="font-family: 'Playfair Display', serif; color: #2a1f12;">{{ s.city }}</div>
                </div>
              </div>
              <div class="mt-3 pb-1 text-center">
                <div class="text-base leading-tight" style="font-family: 'Caveat', cursive; color: #2a1f12;">{{ s.headline }}</div>
                <div class="text-[10px] uppercase tracking-widest mt-1" style="color: #8b4513;">{{ s.body }}</div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- PROOF — single big postcard from Barcelona -->
      <section class="py-16">
        <div class="max-w-3xl mx-auto px-4">
          <div class="text-center mb-10">
            <div class="text-xs tracking-[0.4em] uppercase" style="color: #8b4513;">Latest postcard</div>
            <h2 class="mt-3 text-3xl sm:text-5xl" style="font-family: 'Playfair Display', serif;">
              <em class="italic">See who else is</em> <span style="color: #dc2626;">going</span>.
            </h2>
          </div>

          <div class="relative" style="transform: rotate(-1deg);">
            <!-- Tape -->
            <div class="absolute -top-3 left-8 w-24 h-5 z-20" style="background: repeating-linear-gradient(90deg, #fbbf24 0 8px, #fde047 8px 16px); opacity: 0.7; transform: rotate(-4deg);" />
            <div class="absolute -top-3 right-8 w-24 h-5 z-20" style="background: repeating-linear-gradient(90deg, #fbbf24 0 8px, #fde047 8px 16px); opacity: 0.7; transform: rotate(3deg);" />

            <div class="bg-white shadow-2xl p-2" style="box-shadow: 6px 14px 0 -2px rgba(42, 31, 18, 0.15), 0 22px 44px rgba(42, 31, 18, 0.18);">
              <!-- "Photo" half — postcard front -->
              <div class="aspect-[16/7] flex items-center justify-center text-center p-6" style="background: linear-gradient(135deg, #7c3aed, #a855f7 50%, #f43f5e); color: white;">
                <div>
                  <div class="text-[10px] tracking-[0.4em] uppercase" style="font-family: 'Special Elite', monospace; opacity: 0.85;">Greetings from</div>
                  <div class="mt-2 text-5xl leading-none" style="font-family: 'Playfair Display', serif;">BARCELONA</div>
                  <div class="mt-1 text-sm" style="font-family: 'Caveat', cursive;">— Bachata Stars, in 3 days —</div>
                </div>
              </div>
              <!-- Bottom: postcard back, two columns -->
              <div class="grid grid-cols-1 sm:grid-cols-2 divide-x divide-dashed" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 22px, #c9a87a22 22px, #c9a87a22 23px);">
                <div class="p-5">
                  <div class="text-[10px] uppercase tracking-[0.25em] mb-3" style="color: #8b4513;">Message</div>
                  <p style="font-family: 'Caveat', cursive; font-size: 20px; line-height: 1.35; color: #2a1f12;">
                    Jul 3–6 · Sala Apolo<br>
                    The bachateros are landing.<br>
                    Maxine just bought her ticket.<br>
                    <span style="color: #dc2626;">Are you coming?</span>
                  </p>
                  <NuxtLink to="/festivals/bachata-stars-barcelona-2026" class="mt-4 inline-block text-xs font-bold uppercase tracking-wider border-b-2 pb-0.5" style="border-color: #dc2626; color: #dc2626; font-family: 'Special Elite', monospace;">
                    Get tickets →
                  </NuxtLink>
                </div>
                <div class="p-5">
                  <div class="text-[10px] uppercase tracking-[0.25em] mb-3 flex items-center justify-between" style="color: #8b4513;">
                    <span>Already going</span>
                    <span class="px-1.5 py-0.5 rounded" style="background: #fef3c7; color: #92400e;">Sample</span>
                  </div>
                  <ul class="space-y-2">
                    <li v-for="a in [
                      { n: 'Maxine', c: 'Vienna',  col: '#0891b2' },
                      { n: 'Dayron', c: 'Madrid',  col: '#dc2626' },
                      { n: 'Sofia',  c: 'Munich',  col: '#16a34a' },
                      { n: 'Mark',   c: 'Berlin',  col: '#f59e0b' },
                    ]" :key="a.n" class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow" :style="{ background: a.col }">{{ a.n.charAt(0) }}</div>
                      <span style="font-family: 'Caveat', cursive; font-size: 18px;">{{ a.n }}, <span style="color: #8b4513;">{{ a.c }}</span></span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- LOOP — itinerary card, like an old travel agency receipt -->
      <section class="py-16">
        <div class="max-w-2xl mx-auto px-4">
          <div class="text-center mb-10">
            <div class="text-xs tracking-[0.4em] uppercase" style="color: #8b4513;">Your itinerary</div>
            <h2 class="mt-3 text-3xl sm:text-4xl" style="font-family: 'Playfair Display', serif;">
              <em class="italic">Five stops.</em> No surprises.
            </h2>
          </div>
          <div class="bg-white shadow-xl p-6 sm:p-8 border-2 border-double" style="border-color: #c9a87a;">
            <div class="text-center text-[10px] uppercase tracking-[0.3em] pb-4 border-b border-dashed mb-5" style="border-color: #c9a87a; color: #8b4513;">
              ✶ WEDANCE TRAVEL CO. · NO. 0001 · ROUND TRIP ✶
            </div>
            <ol class="space-y-3">
              <li v-for="(s, i) in [
                { t: 'Pick your festival',      b: 'From every dance event we map.' },
                { t: 'Buy your ticket',          b: 'One tap. Secure. Transferable.' },
                { t: 'See who else is going',    b: 'Opt-in only. No fake friends.' },
                { t: 'Plan the trip together',   b: 'Dinners, rides, partners.' },
                { t: 'Arrive with friends',      b: 'Skip the wall. Bailamos.' },
              ]" :key="s.t" class="grid grid-cols-[3rem_1fr_auto] gap-3 items-baseline border-b border-dotted pb-3 last:border-b-0 last:pb-0" style="border-color: #c9a87a;">
                <div class="text-xl font-bold" style="font-family: 'Playfair Display', serif; color: #dc2626;">{{ String(i + 1).padStart(2, '0') }}</div>
                <div>
                  <div class="text-base font-bold" style="color: #2a1f12;">{{ s.t }}</div>
                  <div class="text-xs" style="color: #5b3a1d;">{{ s.b }}</div>
                </div>
                <div class="text-[10px] tracking-widest uppercase" style="color: #8b4513;">✓</div>
              </li>
            </ol>
            <div class="mt-5 text-center text-[10px] uppercase tracking-[0.3em] pt-4 border-t border-dashed" style="border-color: #c9a87a; color: #8b4513;">
              Buon viaggio. — A
            </div>
          </div>
        </div>
      </section>

      <!-- FOUNDER — open letter from Munich -->
      <section class="py-16">
        <div class="max-w-2xl mx-auto px-4">
          <div class="relative bg-white shadow-2xl p-8" style="transform: rotate(0.8deg); box-shadow: 6px 12px 0 -2px rgba(42, 31, 18, 0.12), 0 22px 44px rgba(42, 31, 18, 0.15); background-image: repeating-linear-gradient(0deg, transparent, transparent 28px, #c9a87a30 28px, #c9a87a30 29px);">
            <div class="flex items-start justify-between mb-5 pb-3 border-b border-dashed" style="border-color: #c9a87a;">
              <div>
                <div class="text-[10px] uppercase tracking-[0.3em]" style="color: #8b4513;">FROM:</div>
                <div class="text-sm" style="color: #2a1f12;">Alösha · Munich · DE</div>
              </div>
              <div class="text-right">
                <div class="text-[10px] uppercase tracking-[0.3em]" style="color: #8b4513;">DATE:</div>
                <div class="text-sm" style="color: #2a1f12;">Summer · MMXXVI</div>
              </div>
            </div>
            <p style="font-family: 'Caveat', cursive; font-size: 26px; line-height: 1.45; color: #2a1f12;">
              The first time I flew to a festival alone, I spent half the first night by the wall.<br><br>
              <span style="color: #dc2626;">I built WeDance so the next dancer does not have to.</span>
            </p>
            <div class="mt-6 flex items-center gap-4 pt-4 border-t border-dashed" style="border-color: #c9a87a;">
              <div class="relative shrink-0">
                <img src="/alosha-dj.jpg" alt="Alösha" class="w-14 h-14 object-cover" style="filter: sepia(0.15);">
                <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 opacity-70" style="border-color: #8b4513;" />
              </div>
              <div>
                <div style="font-family: 'Caveat', cursive; font-size: 26px; color: #2a1f12;">— Alösha</div>
                <div class="text-[10px] uppercase tracking-[0.3em]" style="color: #8b4513;">Founder · Munich</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SUPPLY — classifieds page of a 1950s magazine -->
      <section class="py-16 border-y-4 border-double" style="border-color: #8b4513; background: rgba(255, 251, 235, 0.5);">
        <div class="max-w-5xl mx-auto px-4">
          <div class="text-center mb-8">
            <div class="text-xs tracking-[0.4em] uppercase" style="color: #8b4513;">— Classified —</div>
            <h2 class="mt-3 text-3xl sm:text-4xl" style="font-family: 'Playfair Display', serif;">
              <em class="italic">On the other side of the floor</em>
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <NuxtLink
              v-for="(c, i) in [
                { t: 'ORGANIZE',  b: 'Sell tickets. Reach the audience. See who is coming.' },
                { t: 'TEACH·DJ',  b: 'Get on the city map. Get bookings.', soon: true },
                { t: 'OWN A VENUE', b: 'List your floor. Fill quiet nights.', soon: true },
              ]"
              :key="c.t"
              to="/organizers"
              class="block bg-white border-2 border-double p-5 hover:-translate-y-1 transition-transform"
              :style="{ borderColor: '#8b4513', transform: 'rotate(' + ([- 1, 0.5, -0.5][i]) + 'deg)' }"
            >
              <div class="text-center text-[10px] uppercase tracking-[0.4em] pb-3 border-b border-dashed" style="border-color: #c9a87a; color: #dc2626;">
                ✶ WANTED ✶
              </div>
              <div class="mt-3 text-center">
                <div class="text-2xl font-bold uppercase tracking-wider" style="font-family: 'Playfair Display', serif; color: #2a1f12;">{{ c.t }}</div>
                <p class="mt-2 text-sm" style="color: #5b3a1d; font-family: 'Special Elite', monospace;">{{ c.b }}</p>
                <span v-if="c.soon" class="inline-block mt-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style="background: #fef3c7; color: #92400e;">Soon</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- FINAL — the back stamp -->
      <section class="py-20">
        <div class="max-w-2xl mx-auto px-4 text-center">
          <h2 class="text-4xl sm:text-6xl leading-tight" style="font-family: 'Playfair Display', serif; color: #2a1f12;">
            <em class="italic">Your next stop</em><br>
            is closer than you <span style="color: #dc2626;">think</span>.
          </h2>
          <NuxtLink
            to="/festivals"
            class="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full text-white text-base font-bold uppercase tracking-wider shadow-md"
            style="background: #dc2626; font-family: 'Special Elite', monospace;"
          >
            Find a festival <ArrowRight class="w-4 h-4" />
          </NuxtLink>
          <div class="mt-12 text-xs uppercase tracking-[0.4em]" style="color: #8b4513;">
            ✶ Send · Receive · Dance ✶
          </div>
        </div>
      </section>

      <footer class="py-6 text-center text-xs" style="color: #8b4513; font-family: 'Caveat', cursive; font-size: 16px;">
        with love · Munich · 2026
      </footer>
    </div>

    <!-- Variant switcher -->
    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="bg-white/95 backdrop-blur shadow-lg px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold border" style="border-color: #c9a87a;">
        <span class="pr-1" style="color: #8b4513;">Compare</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">V1</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">V2</NuxtLink>
        <NuxtLink to="/sketches/landing/v3" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">V3</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">V4</NuxtLink>
        <NuxtLink to="/sketches/landing/v7" class="px-2 py-0.5 text-white" style="background: #dc2626;">V7 · Postcard</NuxtLink>
        <NuxtLink to="/sketches/landing/v9" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">V9</NuxtLink>
        <NuxtLink to="/sketches/landing/v12" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">V12</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 hover:text-stone-900" style="color: #5b3a1d;">Current</NuxtLink>
      </div>
    </div>
  </div>
</template>
