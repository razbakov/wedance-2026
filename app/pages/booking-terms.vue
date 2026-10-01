<script setup lang="ts">
/**
 * /booking-terms — Booking terms for the connector-model booking flow.
 * WeDance connects organizers with venues but is NOT a party to the booking
 * contract. These terms clarify liability, cancellation, data sharing, and
 * the role WeDance plays as a connector (not a marketplace or agent).
 *
 * NOTE: flagged for real legal review before booking is promoted publicly.
 */
definePageMeta({ layout: false })
useHead({
  title: 'WeDance — Booking Terms',
  meta: [
    { name: 'description', content: 'Terms governing venue booking requests made through WeDance. WeDance is a connector — not a party to the booking contract.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const sections = [
  {
    heading: '1. WeDance\u2019s role',
    items: [
      'WeDance operates as a <b>connector</b>: we help organizers discover spaces listed by venues and send booking enquiries on their behalf.',
      'WeDance is <b>not</b> an agent, broker, or marketplace. We do not negotiate, guarantee, or intermediate the terms of any booking.',
      'A booking request sent through WeDance is an <b>enquiry</b>, not a confirmed reservation. The venue decides independently whether to accept, decline, or propose different terms.',
    ],
  },
  {
    heading: '2. The contract is between organizer and venue',
    items: [
      'Any contract, payment, deposit, rental fee, insurance, house rules, and cancellation policy are agreed <b>directly between the organizer and the venue</b>.',
      'WeDance is not a party to the booking contract and bears no responsibility for its performance, breach, or enforcement by either side.',
    ],
  },
  {
    heading: '3. Liability',
    items: [
      'WeDance is <b>not liable</b> for the conduct of either party, the condition or suitability of a space, equipment, noise, safety, licensing, or any loss or damage arising from a booking \u2014 whether direct, indirect, or consequential.',
      'Venues are responsible for ensuring their spaces meet all applicable safety, fire, capacity, and licensing regulations.',
      'Organizers are responsible for verifying that a venue meets their event\u2019s requirements before entering into a contract.',
    ],
  },
  {
    heading: '4. Cancellation and changes',
    items: [
      'Cancellation and change policies are set by each venue individually and communicated as part of the direct agreement between organizer and venue.',
      'WeDance does not set, enforce, or adjudicate cancellation terms. If a dispute arises, it is between the organizer and the venue.',
    ],
  },
  {
    heading: '5. Data sharing and privacy',
    items: [
      'By sending a booking request you consent to WeDance sharing your <b>name, email address, and request details</b> (event type, preferred date, number of guests, and any message you include) with the venue so they can respond.',
      'WeDance will not share your data with any party other than the venue you are enquiring with, unless required by law.',
      'For full details on how we handle personal data, see our <a href="/datenschutz" class="underline font-bold" style="color:#dc2626;">Privacy Policy</a>.',
    ],
  },
  {
    heading: '6. No payment through WeDance',
    items: [
      'WeDance does <b>not</b> collect, hold, or process any payment, deposit, or fee related to venue bookings. All financial transactions happen directly between the organizer and the venue.',
    ],
  },
  {
    heading: '7. Accuracy of listings',
    items: [
      'Venue listings (photos, descriptions, capacity, pricing indications) are provided by the venues themselves. WeDance does not independently verify listing accuracy and is not liable for inaccuracies.',
      'Organizers should confirm all details directly with the venue before relying on listing information.',
    ],
  },
  {
    heading: '8. Changes to these terms',
    items: [
      'WeDance may update these terms from time to time. The version in effect at the time a booking request is sent applies to that request.',
    ],
  },
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section class="max-w-2xl mx-auto px-4 pt-12 pb-4">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:#3b1f0d;">Booking Terms</h1>
      <p class="mt-4 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        These terms apply when you use WeDance to send a venue booking request.
        Please read them before submitting a request.
      </p>
    </section>

    <section class="max-w-2xl mx-auto px-4 pb-16">
      <div v-for="s in sections" :key="s.heading" class="mt-8">
        <h2 class="text-lg font-bold" style="color:#3b1f0d; font-family: system-ui, sans-serif;">{{ s.heading }}</h2>
        <ul class="mt-3 space-y-2">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <li v-for="(item, i) in s.items" :key="i" class="flex items-start gap-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            <span class="mt-0.5 shrink-0" style="color:#dc2626;">·</span>
            <span v-html="item" />
          </li>
        </ul>
      </div>

      <div class="mt-10 rounded-xl p-4 text-sm" style="background:#dc262610; border:1px solid #dc262633; color:#5b3a1d; font-family: system-ui, sans-serif;">
        These terms are under legal review and may change before the booking feature is promoted publicly.
        Questions? Contact <a href="mailto:hello@wedance.vip" class="underline font-bold" style="color:#dc2626;">hello@wedance.vip</a>.
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
