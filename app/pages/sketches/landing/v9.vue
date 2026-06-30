<script setup lang="ts">
/**
 * Landing — V9: visionOS / Liquid Glass
 *
 * Reference: Apple visionOS, Linear's gradient cards, Stripe Atlas,
 * the "Liquid Glass" 2025 Apple design language.
 * Mood: premium, future-software-shaped, weightless.
 * Type: SF Pro / Inter, generous weight contrast.
 * Palette: prism gradient ground (rose → violet → cyan) under
 *          translucent frosted-glass panels.
 * Layout: layered planes, not flat sections. Depth via shadow + soft glow.
 */
import { ArrowRight, MapPin, Calendar, Sparkles, GraduationCap, Plane, Star, Ticket } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Spatial',
})

const stages = [
  { label: 'Curious',   title: 'Find a dance',    icon: Sparkles,       hue: 'rgba(244, 114, 182, 0.6)' },
  { label: 'Beginner',  title: 'Find a teacher',  icon: GraduationCap,  hue: 'rgba(96, 165, 250, 0.6)' },
  { label: 'Weekly',    title: 'Know your city',  icon: Calendar,       hue: 'rgba(52, 211, 153, 0.6)' },
  { label: 'Traveling', title: 'Plan your year',  icon: Plane,          hue: 'rgba(251, 191, 36, 0.6)' },
  { label: 'Reviewer',  title: 'Tell the truth',  icon: Star,           hue: 'rgba(167, 139, 250, 0.6)' },
]
</script>

<template>
  <div
    class="min-h-screen relative overflow-x-hidden text-white"
    style="
      background:
        radial-gradient(circle at 18% 8%, rgba(244, 114, 182, 0.55), transparent 38%),
        radial-gradient(circle at 88% 22%, rgba(96, 165, 250, 0.55), transparent 40%),
        radial-gradient(circle at 30% 52%, rgba(167, 139, 250, 0.5), transparent 45%),
        radial-gradient(circle at 80% 70%, rgba(34, 211, 238, 0.5), transparent 42%),
        radial-gradient(circle at 50% 100%, rgba(251, 113, 133, 0.4), transparent 55%),
        #0b0820;
      font-family: -apple-system, 'SF Pro Display', 'Inter', system-ui, sans-serif;
    "
  >
    <!-- Animated orb (subtle ambient) -->
    <div class="pointer-events-none fixed inset-0 z-0">
      <div class="absolute top-[15%] left-[20%] w-[420px] h-[420px] rounded-full opacity-30 blur-3xl" style="background: radial-gradient(circle, #f472b6 0%, transparent 60%); animation: drift1 18s ease-in-out infinite;" />
      <div class="absolute top-[55%] right-[15%] w-[460px] h-[460px] rounded-full opacity-25 blur-3xl" style="background: radial-gradient(circle, #22d3ee 0%, transparent 60%); animation: drift2 22s ease-in-out infinite;" />
    </div>

    <div class="relative z-10">
      <!-- Floating nav -->
      <header class="sticky top-3 z-40 px-4">
        <div class="max-w-5xl mx-auto rounded-full px-4 py-2.5 flex items-center justify-between" style="background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);">
          <NuxtLink to="/" class="font-bold tracking-tight text-sm">WeDance</NuxtLink>
          <nav class="flex items-center gap-5 text-xs font-medium">
            <NuxtLink to="/festivals" class="opacity-80 hover:opacity-100">Festivals</NuxtLink>
            <NuxtLink to="/cities" class="opacity-80 hover:opacity-100">Cities</NuxtLink>
            <NuxtLink to="/organizers" class="opacity-80 hover:opacity-100 hidden sm:inline">For orgs</NuxtLink>
          </nav>
        </div>
      </header>

      <!-- HERO -->
      <section class="pt-20 pb-24 px-4">
        <div class="max-w-4xl mx-auto text-center">
          <div class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider mb-6" style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);">
            <span class="w-1.5 h-1.5 rounded-full" style="background: #34d399; box-shadow: 0 0 8px #34d399;" />
            Now in 12 cities · 2026
          </div>
          <h1 class="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight leading-[0.92]">
            From your first<br>
            <span style="background: linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #22d3ee 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">salsa class</span><br>
            to your tenth festival.
          </h1>
          <p class="mt-6 text-base sm:text-lg max-w-xl mx-auto leading-relaxed" style="color: rgba(255, 255, 255, 0.78);">
            We map every dance event, every teacher, every venue, every city — and tell you who is going before you book.
          </p>
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <NuxtLink
              to="/festivals"
              class="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style="background: linear-gradient(135deg, #f472b6, #a78bfa); box-shadow: 0 10px 30px rgba(244, 114, 182, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3);"
            >
              Find your next festival <ArrowRight class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink
              to="/sketches/year"
              class="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-all"
              style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.18);"
            >
              Plan your year
            </NuxtLink>
          </div>
        </div>

        <!-- Floating preview card (depth demo) -->
        <div class="mt-16 max-w-3xl mx-auto relative">
          <!-- Card 3 (back) -->
          <div class="absolute -top-6 left-12 right-12 h-32 rounded-3xl opacity-40" style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12);" />
          <!-- Card 2 (mid) -->
          <div class="absolute -top-3 left-6 right-6 h-40 rounded-3xl opacity-60" style="background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.15);" />
          <!-- Card 1 (front) — DJ photo glass plate -->
          <div class="relative rounded-3xl overflow-hidden" style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.25);">
            <div class="grid sm:grid-cols-[3fr_2fr] gap-0">
              <div class="aspect-[4/3] sm:aspect-auto sm:min-h-[280px] overflow-hidden relative">
                <img src="/alosha-dj.jpg" alt="Alösha" class="w-full h-full object-cover">
              </div>
              <div class="p-6 sm:p-7 flex flex-col justify-center">
                <div class="text-[10px] font-semibold uppercase tracking-[0.2em]" style="color: rgba(244, 114, 182, 1);">Founder</div>
                <div class="mt-1 text-xl sm:text-2xl font-bold">Alösha</div>
                <div class="text-xs mt-1" style="color: rgba(255, 255, 255, 0.6);">Behind the decks · La Rumba · München</div>
                <div class="mt-4 text-[13px] leading-relaxed" style="color: rgba(255, 255, 255, 0.85);">
                  "The first time I flew to a festival alone, I spent half the first night by the wall."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- STAGES — orb tiles -->
      <section class="py-20 px-4">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-12">
            <div class="text-[11px] font-semibold uppercase tracking-[0.25em]" style="color: rgba(255, 255, 255, 0.6);">Channels</div>
            <h2 class="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">Pick your door.</h2>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <NuxtLink
              v-for="s in stages"
              :key="s.label"
              to="/festivals"
              class="group relative block rounded-3xl p-5 overflow-hidden transition-all hover:-translate-y-1"
              style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);"
            >
              <!-- Tinted orb -->
              <div
                class="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-50 group-hover:opacity-80 transition-opacity blur-2xl"
                :style="{ background: s.hue }"
              />
              <div class="relative">
                <div
                  class="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                  style="background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2);"
                >
                  <component :is="s.icon" class="w-5 h-5" />
                </div>
                <div class="text-[10px] font-semibold uppercase tracking-[0.2em]" style="color: rgba(255, 255, 255, 0.55);">{{ s.label }}</div>
                <div class="mt-1 text-base font-semibold leading-tight">{{ s.title }}</div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- PROOF — frosted event card with attendee bubbles -->
      <section class="py-20 px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <div class="text-[11px] font-semibold uppercase tracking-[0.25em]" style="color: rgba(255, 255, 255, 0.6);">This is the product</div>
            <h2 class="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">
              See who else is
              <span style="background: linear-gradient(135deg, #f472b6, #a78bfa); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">going.</span>
            </h2>
            <p class="mt-4 text-base max-w-xl mx-auto" style="color: rgba(255, 255, 255, 0.75);">
              Every ticket sold turns into a face on the event page. Opt-in only. No fake friends.
            </p>
          </div>

          <div class="relative rounded-3xl overflow-hidden" style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(30px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);">
            <!-- Event banner (gradient plate) -->
            <div class="aspect-[16/6] p-6 sm:p-8 flex flex-col justify-end" style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #f43f5e 100%);">
              <div class="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] font-semibold mb-2 opacity-90">
                <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> In 3 days · Barcelona
              </div>
              <h3 class="text-3xl sm:text-4xl font-bold leading-tight">Bachata Stars Barcelona</h3>
              <div class="mt-2 text-xs flex flex-wrap gap-4 opacity-85">
                <span class="inline-flex items-center gap-1.5"><Calendar class="w-3.5 h-3.5" />Jul 3–6, 2026</span>
                <span class="inline-flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5" />Sala Apolo</span>
              </div>
            </div>
            <div class="p-6 sm:p-8">
              <div class="flex items-center justify-between mb-5">
                <div class="text-[11px] font-semibold uppercase tracking-[0.2em]" style="color: rgba(255, 255, 255, 0.65);">Who's going</div>
                <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style="background: rgba(251, 191, 36, 0.18); color: #fbbf24;">Sample</span>
              </div>
              <ul class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <li v-for="a in [
                  { n: 'Maxine', c: 'Vienna', col: '#f472b6' },
                  { n: 'Dayron', c: 'Madrid', col: '#22d3ee' },
                  { n: 'Sofia',  c: 'Munich', col: '#34d399' },
                  { n: 'Mark',   c: 'Berlin', col: '#fbbf24' },
                ]" :key="a.n" class="flex items-center gap-3 p-2 rounded-2xl" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    :style="{ background: a.col, color: '#0b0820', boxShadow: '0 0 20px ' + a.col + '66' }"
                  >{{ a.n.charAt(0) }}</div>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold truncate">{{ a.n }}</div>
                    <div class="text-[11px]" style="color: rgba(255, 255, 255, 0.55);">{{ a.c }}</div>
                  </div>
                </li>
              </ul>
              <NuxtLink
                to="/festivals/bachata-stars-barcelona-2026"
                class="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02]"
                style="background: linear-gradient(135deg, #f472b6, #a78bfa); box-shadow: 0 10px 28px rgba(244, 114, 182, 0.4);"
              >
                <Ticket class="w-4 h-4" /> Get tickets
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- LOOP — soft pill steps -->
      <section class="py-20 px-4">
        <div class="max-w-4xl mx-auto">
          <div class="text-center mb-12">
            <div class="text-[11px] font-semibold uppercase tracking-[0.25em]" style="color: rgba(255, 255, 255, 0.6);">How it works</div>
            <h2 class="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">Five steps. No surprises.</h2>
          </div>
          <ol class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <li v-for="(s, i) in [
              { t: 'Find',   b: 'every festival mapped' },
              { t: 'Pay',    b: 'one-tap checkout' },
              { t: 'See',    b: 'the verified faces' },
              { t: 'Plan',   b: 'dinners, rides' },
              { t: 'Arrive', b: 'skip the wall' },
            ]" :key="s.t" class="rounded-3xl p-5 flex flex-col gap-2"
              style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.18);"
            >
              <div class="text-3xl font-bold tracking-tight" style="background: linear-gradient(135deg, #f472b6, #a78bfa); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">
                0{{ i + 1 }}
              </div>
              <div class="text-base font-semibold">{{ s.t }}</div>
              <div class="text-[11px] leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">{{ s.b }}</div>
            </li>
          </ol>
        </div>
      </section>

      <!-- FOUNDER — glass quote panel with avatar -->
      <section class="py-20 px-4">
        <div class="max-w-3xl mx-auto">
          <div class="rounded-3xl p-8 sm:p-10" style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25);">
            <div class="text-[11px] font-semibold uppercase tracking-[0.25em]" style="color: rgba(244, 114, 182, 0.9);">From the founder</div>
            <blockquote class="mt-4 text-2xl sm:text-3xl leading-snug font-medium">
              "The first time I flew to a festival alone, I spent half the first night by the wall.
              <span style="background: linear-gradient(135deg, #f472b6, #a78bfa); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">I built WeDance so the next dancer does not have to."</span>
            </blockquote>
            <div class="mt-7 flex items-center gap-4">
              <img src="/alosha-dj.jpg" alt="Alösha" class="w-14 h-14 rounded-full object-cover" style="border: 2px solid rgba(255, 255, 255, 0.25);">
              <div>
                <div class="text-sm font-semibold">Alösha</div>
                <div class="text-[11px]" style="color: rgba(255, 255, 255, 0.6);">Founder · Munich</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- SUPPLY -->
      <section class="py-20 px-4">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-10">
            <div class="text-[11px] font-semibold uppercase tracking-[0.25em]" style="color: rgba(255, 255, 255, 0.6);">For the other side</div>
            <h2 class="mt-3 text-2xl sm:text-4xl font-bold tracking-tight">Run a festival, teach, or own a venue?</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NuxtLink
              v-for="c in [
                { t: 'Organize',   d: 'Sell tickets · reach audience' },
                { t: 'Teach / DJ', d: 'Get on the map · get bookings', soon: true },
                { t: 'Venue',      d: 'List your floor · fill nights', soon: true },
              ]"
              :key="c.t"
              to="/organizers"
              class="rounded-3xl p-5 transition-all hover:-translate-y-1"
              style="background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);"
            >
              <div class="text-base font-semibold flex items-center gap-2">
                {{ c.t }}
                <span v-if="c.soon" class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style="background: rgba(251, 191, 36, 0.18); color: #fbbf24;">Soon</span>
              </div>
              <div class="mt-2 text-xs" style="color: rgba(255, 255, 255, 0.65);">{{ c.d }}</div>
            </NuxtLink>
          </div>
        </div>
      </section>

      <!-- FINAL -->
      <section class="py-24 px-4">
        <div class="max-w-3xl mx-auto text-center">
          <h2 class="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
            Your next festival<br>
            is closer than you
            <span style="background: linear-gradient(135deg, #f472b6, #a78bfa, #22d3ee); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">think.</span>
          </h2>
          <NuxtLink
            to="/festivals"
            class="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-all hover:scale-[1.03]"
            style="background: linear-gradient(135deg, #f472b6, #a78bfa); box-shadow: 0 16px 40px rgba(244, 114, 182, 0.5);"
          >
            Find your festival <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>
      </section>

      <footer class="py-8 px-4 text-center text-[11px]" style="color: rgba(255, 255, 255, 0.4);">
        WeDance · Spatial Edition · 2026
      </footer>
    </div>

    <!-- Variant switcher -->
    <div class="fixed bottom-3 left-1/2 -translate-x-1/2 z-50">
      <div class="rounded-full px-3 py-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold"
        style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);"
      >
        <span class="pr-1" style="color: rgba(255, 255, 255, 0.5);">Compare</span>
        <NuxtLink to="/sketches/landing/v1" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">V1</NuxtLink>
        <NuxtLink to="/sketches/landing/v2" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">V2</NuxtLink>
        <NuxtLink to="/sketches/landing/v3" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">V3</NuxtLink>
        <NuxtLink to="/sketches/landing/v4" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">V4</NuxtLink>
        <NuxtLink to="/sketches/landing/v7" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">V7</NuxtLink>
        <NuxtLink to="/sketches/landing/v9" class="px-2 py-0.5 rounded-full text-white" style="background: linear-gradient(135deg, #f472b6, #a78bfa);">V9 · Glass</NuxtLink>
        <NuxtLink to="/sketches/landing/v12" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">V12</NuxtLink>
        <NuxtLink to="/sketches/landing" class="px-2 py-0.5 rounded-full opacity-70 hover:opacity-100">Current</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes drift1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(40px, 60px); }
}
@keyframes drift2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-50px, -40px); }
}
</style>
