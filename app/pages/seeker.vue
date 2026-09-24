<script setup lang="ts">
/**
 * /seeker — The first journey stage for Seekers
 *
 * This is the onboarding entry point for someone who wants to find their dance
 * through free taster classes. It serves as stage 1 of the 5-stage dance journey.
 *
 * Design language: Playfair Display + Caveat, warm cream bg, dance-positive copy.
 * Mobile-first responsive. Includes call-to-action toward cities (where tasters happen)
 * and the coming-soon dance-finder quiz.
 */
import { ArrowRight, Sparkles, Heart } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'Start Your Dance — Free Taster Classes | WeDance',
  meta: [
    { name: 'description', content: 'Your first step: try free taster classes and find your dance by feeling, not guessing.' }
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

// The three dance styles as entry points for taster exploration
const tasterOptions = [
  { style: 'Salsa', blurb: 'Fast, social, everywhere.', accent: '#dc2626' },
  { style: 'Bachata', blurb: 'Close, romantic, easy start.', accent: '#a855f7' },
  { style: 'Kizomba', blurb: 'Slow, grounded, connected.', accent: '#0891b2' },
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:system-ui, sans-serif;">
    <!-- Subtle paper texture overlay -->
    <div
      class="pointer-events-none fixed inset-0 opacity-[0.1]"
      style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%222%22/></filter><rect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>'); mix-blend-mode: multiply; z-index: 0;"
    />

    <div class="relative z-10">
      <SiteHeader />

      <!-- Hero Section — The Welcome Stage -->
      <section class="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <!-- Stage label -->
        <div class="text-xs tracking-widest uppercase mb-3" style="color:#9a5614;">Stage 1 · Your Journey Begins</div>

        <!-- Main heading -->
        <h1 class="text-5xl sm:text-6xl leading-[0.98] font-black" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          Find your dance<br />by <em class="italic" style="color:#dc2626;">feeling.</em>
        </h1>

        <!-- Subheading with promise -->
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          You don't need to guess a style. Try free taster classes, feel the rhythm, and discover the dance that moves you.
        </p>

        <!-- Coming soon badge for dance-finder quiz -->
        <div class="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest" style="background:#dc262614; color:#dc2626;">
          <Sparkles class="w-4 h-4" /> Dance-finder quiz · coming soon
        </div>
      </section>

      <!-- Taster Options Section -->
      <section class="max-w-3xl mx-auto px-4 pb-12">
        <div class="text-center mb-8">
          <p class="text-sm" style="color:#9a5614; font-family:'Caveat', cursive; font-size:20px;">Pick your first taster—</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <NuxtLink
            v-for="option in tasterOptions"
            :key="option.style"
            :to="`/cities?style=${option.style}`"
            class="group rounded-2xl bg-white border-2 p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            :style="{ borderColor: option.accent + '55' }"
          >
            <div class="text-3xl font-black mb-2" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              {{ option.style }}
            </div>
            <div class="text-sm mb-4" style="color:#5b3a1d; font-family:system-ui, sans-serif;">
              {{ option.blurb }}
            </div>
            <div class="inline-flex items-center gap-1 text-xs font-bold" :style="{ color: option.accent }">
              Find taster classes
              <ArrowRight class="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Why Tasters? Section -->
      <section class="max-w-3xl mx-auto px-4 pb-12">
        <div class="rounded-2xl bg-white/60 border border-gray-200 p-8" style="background:rgba(255,255,255,0.6);">
          <div class="grid sm:grid-cols-3 gap-6 text-center">
            <div>
              <div class="text-3xl mb-2">✨</div>
              <h3 class="font-bold text-sm mb-2" style="color:#3b1f0d;">No Commitment</h3>
              <p class="text-xs leading-relaxed" style="color:#5b3a1d;">Try a class, see if it clicks. No memberships needed.</p>
            </div>
            <div>
              <Heart class="w-8 h-8 mx-auto mb-2" :style="{ color: '#dc2626' }" />
              <h3 class="font-bold text-sm mb-2" style="color:#3b1f0d;">Feel the Vibe</h3>
              <p class="text-xs leading-relaxed" style="color:#5b3a1d;">Dance is about feeling, not steps. Find your style by moving.</p>
            </div>
            <div>
              <div class="text-3xl mb-2">👥</div>
              <h3 class="font-bold text-sm mb-2" style="color:#3b1f0d;">Meet the Community</h3>
              <p class="text-xs leading-relaxed" style="color:#5b3a1d;">Connect with dancers, teachers, and your people.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Alternative Path — Manual Discovery -->
      <section class="max-w-3xl mx-auto px-4 pb-16 text-center">
        <p class="text-sm mb-4" style="color:#9a5614;">
          <span style="font-family:'Caveat', cursive; font-size:18px;">or explore all styles</span>
        </p>
        <NuxtLink
          to="/cities"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider transition-all duration-200"
          style="background:#3b1f0d; border:1px solid #3b1f0d;"
        >
          <span>See all classes in your city</span>
          <ArrowRight class="w-4 h-4 transition-transform duration-200" />
        </NuxtLink>
      </section>

      <!-- Journey Map Reference -->
      <section class="border-t py-12" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.3);">
        <div class="max-w-3xl mx-auto px-4 text-center">
          <p class="text-xs uppercase tracking-widest mb-4" style="color:#9a5614;">What comes next</p>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div class="font-bold mb-1" style="color:#3b1f0d;">2. Student</div>
              <p style="color:#5b3a1d;">Find your teacher and style</p>
            </div>
            <div>
              <div class="font-bold mb-1" style="color:#3b1f0d;">3. Regular</div>
              <p style="color:#5b3a1d;">Join your favorite floor</p>
            </div>
          </div>
          <p class="mt-4 text-xs" style="color:#9a5614;">
            Every stage at your own pace.
            <span style="font-family:'Caveat', cursive; font-size:16px; color:#16a34a;">No rush.</span>
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions */
a {
  transition: all 200ms ease-out;
}
</style>
