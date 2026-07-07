<script setup lang="ts">
/**
 * /booking-terms — interim terms for the connector-model booking flow. NOTE:
 * placeholder pending a real legal review before booking is promoted publicly.
 */
definePageMeta({ layout: false })
useHead({
  title: 'WeDance — Booking terms',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap' },
  ],
})
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />
    <section class="max-w-2xl mx-auto px-4 py-12" style="font-family: system-ui, sans-serif;">
      <h1 class="text-4xl" style="font-family:'Playfair Display', serif;">Booking terms</h1>
      <p class="mt-4 text-sm leading-relaxed" style="color:#5b3a1d;">
        WeDance is a <b>connector</b>: we help organizers discover and request spaces from venues.
        We do not take payment, hold deposits, or act as an agent for either party.
      </p>
      <ul class="mt-4 space-y-2 text-sm list-disc pl-5" style="color:#5b3a1d;">
        <li>A booking request is an <b>enquiry</b>, not a confirmed booking. The venue decides whether to accept and on what terms.</li>
        <li>Any contract, payment, deposit, cancellation policy, insurance and liability are agreed <b>directly between the organizer and the venue</b>.</li>
        <li>WeDance is not liable for the conduct of either party, the condition of a space, or any loss arising from a booking.</li>
        <li>By sending a request you consent to us sharing your name, email and request details with the venue so they can respond.</li>
      </ul>
      <p class="mt-6 text-xs italic" style="color:#9a5614;">
        Interim terms — under legal review. Not final. Contact the WeDance team with questions.
      </p>
    </section>
    <SiteFooter />
  </div>
</template>
