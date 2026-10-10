<script setup lang="ts">
/**
 * /terms — terms of sale for ticketing. PLACEHOLDER.
 * Needs real content + legal review before ticket sales go live
 * (parties: WeDance vs organizer, payment, delivery, cancellation,
 * withdrawal-right exemption for dated events §312g BGB).
 */
definePageMeta({ layout: false })
useHead({
  title: 'WeDance — Terms',
  meta: [{ name: 'robots', content: 'noindex' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap' },
  ],
})

const willCover = [
  'Who the contract is between (WeDance as platform vs. the organizer).',
  'Ticket purchase, pricing incl. VAT, and payment terms.',
  'Delivery of tickets and proof of purchase.',
  'Cancellation, refunds, and event changes.',
  'Withdrawal right — and the §312g BGB exemption for dated events.',
  'Liability, house rules, and applicable law.',
]
</script>

<template>
  <div class="min-h-screen" style="background:var(--wd-cream); color:var(--wd-brown-900); font-family:var(--wd-font-display);">
    <SiteHeader />
    <section class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:var(--wd-amber-600);">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:var(--wd-brown-900);">Terms</h1>

      <div class="mt-6 rounded-xl p-4 text-sm" style="background:color-mix(in srgb, var(--wd-red-600) 6.3%, transparent); border:1px solid color-mix(in srgb, var(--wd-red-600) 20%, transparent); color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
        ⚠️ Draft. Terms of sale are pending real content + legal review. Required before ticket sales go live — including consumer info and the withdrawal-right exemption for dated events.
      </div>

      <p class="mt-6 text-sm" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">The published terms will cover:</p>
      <ul class="mt-3 grid gap-2 text-sm" style="color:var(--wd-brown-900); font-family:var(--wd-font-sans);">
        <li v-for="item in willCover" :key="item" class="flex items-start gap-2">
          <span style="color:var(--wd-red-600);">·</span> {{ item }}
        </li>
      </ul>
    </section>
    <SiteFooter />
  </div>
</template>
