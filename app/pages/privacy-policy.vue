<script setup lang="ts">
/**
 * /privacy-policy — GDPR privacy policy. PLACEHOLDER.
 * Needs real content + legal review before launch (covers Stripe,
 * analytics, cookies, hosting, user rights, data retention).
 */
definePageMeta({ layout: false })
useHead({
  title: 'WeDance — Privacy Policy',
  meta: [{ name: 'robots', content: 'noindex' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const willCover = [
  'Who the controller is (see Imprint) and how to reach them.',
  'What data we collect (account, tickets, payments, plan) and why.',
  'Payment processing via Stripe (data shared, their role).',
  'Hosting (Vercel) and any analytics — with cookie/consent basis.',
  'Legal bases (GDPR Art. 6), retention periods, and third parties.',
  'Your rights: access, rectification, erasure, portability, complaint.',
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />
    <section class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:#3b1f0d;">Privacy Policy</h1>

      <div class="mt-6 rounded-xl p-4 text-sm" style="background:#dc262610; border:1px solid #dc262633; color:#5b3a1d; font-family: system-ui, sans-serif;">
        ⚠️ Draft. The full privacy policy is pending real legal content + legal review. Required under GDPR before collecting any personal data or selling tickets.
      </div>

      <p class="mt-6 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">The published policy will cover:</p>
      <ul class="mt-3 grid gap-2 text-sm" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
        <li v-for="item in willCover" :key="item" class="flex items-start gap-2">
          <span style="color:#dc2626;">·</span> {{ item }}
        </li>
      </ul>
    </section>
    <SiteFooter />
  </div>
</template>
