<script setup lang="ts">
/**
 * /agb — terms of sale for ticketing. PLACEHOLDER.
 * Route: /agb (German for legacy; content is English).
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
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
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
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />
    <section class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:#3b1f0d;">Terms</h1>

      <div class="mt-6 rounded-xl p-4 text-sm" style="background:#dc262610; border:1px solid #dc262633; color:#5b3a1d; font-family: system-ui, sans-serif;">
        ⚠️ Draft. Terms of sale are pending real content + legal review. Required before ticket sales go live — including consumer info and the withdrawal-right exemption for dated events.
      </div>

      <p class="mt-6 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">The published terms will cover:</p>
      <ul class="mt-3 grid gap-2 text-sm" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
        <li v-for="item in willCover" :key="item" class="flex items-start gap-2">
          <span style="color:#dc2626;">·</span> {{ item }}
        </li>
      </ul>
    </section>
    <SiteFooter />
  </div>
</template>
