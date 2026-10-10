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
  <div class="min-h-screen" style="background:var(--wd-cream); color:var(--wd-brown-900); font-family:var(--wd-font-display);">
    <SiteHeader />
    <section class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:var(--wd-amber-600);">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:var(--wd-brown-900);">Privacy Policy</h1>

      <div class="mt-6 rounded-xl p-4 text-sm" style="background:color-mix(in srgb, var(--wd-red-600) 6.3%, transparent); border:1px solid color-mix(in srgb, var(--wd-red-600) 20%, transparent); color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
        ⚠️ Draft. The full privacy policy is pending real legal content + legal review. Required under GDPR before collecting any personal data or selling tickets.
      </div>

      <p class="mt-6 text-sm" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">The published policy will cover:</p>
      <ul class="mt-3 grid gap-2 text-sm" style="color:var(--wd-brown-900); font-family:var(--wd-font-sans);">
        <li v-for="item in willCover" :key="item" class="flex items-start gap-2">
          <span style="color:var(--wd-red-600);">·</span> {{ item }}
        </li>
      </ul>
    </section>
    <SiteFooter />
  </div>
</template>
