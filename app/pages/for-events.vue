<script setup lang="ts">
import { ArrowRight, MapPin, Music, Mic, Users, PartyPopper, UtensilsCrossed, Camera, Ticket } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — For your event',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const services = [
  { icon: MapPin,          label: 'Venue',         detail: 'Cuban bars, dance halls, private lofts, rooftops.' },
  { icon: UtensilsCrossed, label: 'Catering',      detail: 'Cuban bites, a mojito bar, or a full sit-down — flavors that match the floor.' },
  { icon: Mic,             label: 'MC / Host',     detail: 'Bilingual EN/DE/ES. Reads the room, keeps the energy.' },
  { icon: Music,           label: 'DJ',            detail: 'Salsa, bachata, kizomba, timba, urbano. Your BPM.' },
  { icon: Users,           label: 'Show dancers',  detail: 'Solo showcase, couples, choreo for your first dance.' },
  { icon: Camera,          label: 'Photo / Video', detail: 'Photographer and videographer — a highlight reel ready to post.' },
  { icon: Ticket,          label: 'Ticketing',     detail: 'Paid tickets, guest lists, and check-in — we run the door.' },
  { icon: PartyPopper,     label: 'Full night',    detail: 'One team, one contact, end-to-end — you enjoy it.' },
]

const occasions = ['Weddings', 'Birthdays', 'Corporate', 'Brand launches', 'Team offsites', 'Private parties']

// The "Venue" service links to the venues page.
const NuxtLinkC = resolveComponent('NuxtLink')
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- Header -->
    <SiteHeader />

    <!-- HERO -->
    <section class="max-w-5xl mx-auto px-4 pt-14 pb-10">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">For your event</div>
      <h1 class="text-5xl sm:text-6xl leading-[0.95]" style="color:#3b1f0d;">
        Hosting the night,<br>
        not dancing <em class="italic" style="color:#dc2626;">at it</em>?
      </h1>
      <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        One team builds the whole floor. Venue. MC. DJ. Show dancers. From one dance to five hours of party — no piecing it out to five vendors.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <span v-for="o in occasions" :key="o" class="text-xs px-3 py-1 rounded-full border" style="border-color:#3b1f0d22; color:#5b3a1d; font-family: system-ui, sans-serif;">{{ o }}</span>
      </div>
    </section>

    <!-- SERVICES -->
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <p class="mb-6 text-sm tracking-widest uppercase" style="color:#9a5614;">Everything under one roof</p>
      <div class="grid md:grid-cols-3 gap-5">
        <component
          :is="s.label === 'Venue' ? NuxtLinkC : 'div'"
          v-for="(s, i) in services" :key="s.label"
          :to="s.label === 'Venue' ? '/venues' : undefined"
          class="rounded-2xl bg-white p-6 border block transition-all"
          :class="s.label === 'Venue' ? 'hover:-translate-y-0.5 cursor-pointer' : ''"
          :style="{ borderColor: ['#dc2626', '#f59e0b', '#0891b2', '#16a34a', '#a855f7'][i % 5] + '55' }"
        >
          <component :is="s.icon" class="w-6 h-6 mb-3" :style="{ color: ['#dc2626', '#f59e0b', '#0891b2', '#16a34a', '#a855f7'][i % 5], 'stroke-width': 1.5 }" />
          <div class="text-lg font-bold" style="color:#3b1f0d;">{{ s.label }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ s.detail }}</div>
          <div v-if="s.label === 'Venue'" class="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider" style="color:#dc2626; font-family: system-ui, sans-serif;">
            Browse venues <ArrowRight class="w-3.5 h-3.5" />
          </div>
        </component>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-3xl mx-auto px-4 py-16 text-center">
      <h2 class="text-3xl sm:text-4xl leading-tight">
        Tell us <em class="italic" style="color:#dc2626;">about your night.</em>
      </h2>
      <p class="mt-4 text-sm sm:text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        One reply, no forms. We come back with a plan you can send to your partner or your CFO.
      </p>
      <a
        href="mailto:hello@wedance.vip?subject=WeDance%20for%20my%20event&body=Type%20of%20event%3A%0ADate%3A%0ACity%3A%0AGuests%3A%0AWhat%20you%20need%3A%20"
        class="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
      >
        Tell us about your event <ArrowRight class="w-4 h-4" />
      </a>
      <div class="mt-3 text-sm" style="font-family:'Caveat', cursive; color:#9a5614;">
        — we usually respond same day
      </div>
    </section>

    <!-- CROSS-LINKS -->
    <section class="max-w-3xl mx-auto px-4 pb-16 space-y-3">
      <NuxtLink
        to="/for-venues"
        class="rounded-2xl bg-white p-6 border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5"
        style="border-color:#3b1f0d22;"
      >
        <div>
          <div class="text-lg font-bold" style="color:#3b1f0d;">Have a venue? List it on WeDance.</div>
          <div class="mt-1 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Get booking requests from dance organizers looking for a space.
          </div>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color:#dc2626; font-family: system-ui, sans-serif;">
          For venues <ArrowRight class="w-3.5 h-3.5" />
        </span>
      </NuxtLink>
    </section>

    <SiteFooter />
  </div>
</template>
