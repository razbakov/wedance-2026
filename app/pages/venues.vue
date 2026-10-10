<script setup lang="ts">
/**
 * /venues — browse bookable venues (any city). Reached from the "Venue" service
 * on /for-events. Each links to its /@<handle> page to request a space.
 */
import { ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Venues',
  meta: [{ name: 'description', content: 'Book a space for your social, class, or private event — dance-ready venues across the WeDance network.' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap' },
  ],
})
</script>

<template>
  <div class="min-h-screen" style="background:var(--wd-cream); color:var(--wd-brown-900); font-family:var(--wd-font-display);">
    <SiteHeader />

    <section class="max-w-3xl mx-auto px-4 pt-12 pb-4">
      <NuxtLink to="/for-events" class="inline-flex items-center gap-1 text-xs font-bold mb-4" style="color:var(--wd-amber-600); font-family:var(--wd-font-sans);">
        <ArrowLeft class="w-3 h-3" /> For your event
      </NuxtLink>
      <div class="text-sm tracking-widest uppercase mb-2" style="color:var(--wd-amber-600);">Venues</div>
      <h1 class="text-4xl sm:text-5xl leading-[0.98]" style="color:var(--wd-brown-900);">
        Book a <em class="italic" style="color:var(--wd-red-600);">space.</em>
      </h1>
      <p class="mt-4 text-base leading-relaxed max-w-xl" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
        Organizing a social, class, or private event? Browse dance-ready venues across the network and request a date directly.
      </p>
    </section>

    <ClientOnly>
      <section class="max-w-3xl mx-auto px-4 pb-16">
        <BookableVenuesSection hide-heading />
      </section>
    </ClientOnly>

    <SiteFooter />
  </div>
</template>
