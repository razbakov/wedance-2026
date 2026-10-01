<script setup lang="ts">
/**
 * /for-venues — For venues that want to list their spaces on WeDance and
 * receive booking enquiries from dance organizers.
 *
 * Positioned as the venue-side counterpart to /for-organizers:
 *   /for-organizers = "you run events, reach more dancers" (demand side)
 *   /for-venues     = "you have a space, get it booked by dancers" (supply side)
 *
 * Follows the same editorial conventions as /for-events and /for-organizers:
 * layout:false, Playfair Display + Caveat, lucide icons, Cuban-warm palette.
 */
import { ArrowRight, Building2, CalendarCheck, Eye, ShieldCheck, Users } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — For venues',
  meta: [
    { name: 'description', content: 'List your space on WeDance and get booking requests from dance organizers — classes, socials, festivals, and private events.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const props_ = [
  { icon: Eye,           title: 'Get discovered',         detail: 'Your space shows up where dance organizers are already looking \u2014 on city pages, venue listings, and the booking flow.' },
  { icon: CalendarCheck, title: 'Receive booking requests', detail: 'Organizers send enquiries with their event type, preferred date, and guest count. You decide whether to accept \u2014 no obligation.' },
  { icon: Users,         title: 'A dance-ready audience',  detail: 'The requests come from people who run classes, socials, festivals, and private events \u2014 not random cold leads.' },
  { icon: ShieldCheck,   title: 'You stay in control',     detail: 'You set your own terms, pricing, and availability. WeDance connects \u2014 we never negotiate or intermediate on your behalf.' },
]

const spaceTypes = ['Dance studios', 'Event halls', 'Bars & clubs', 'Rooftops', 'Cultural spaces', 'Private lofts']
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- HERO -->
    <section class="max-w-5xl mx-auto px-4 pt-14 pb-10">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">For venues</div>
      <h1 class="text-5xl sm:text-6xl leading-[0.95]" style="color:#3b1f0d;">
        Fill your space<br>
        with <em class="italic" style="color:#dc2626;">dancers.</em>
      </h1>
      <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        List your venue on WeDance and get booking requests from organizers who need a floor for classes, socials, festivals, and private events.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <span v-for="t in spaceTypes" :key="t" class="text-xs px-3 py-1 rounded-full border" style="border-color:#3b1f0d22; color:#5b3a1d; font-family: system-ui, sans-serif;">{{ t }}</span>
      </div>
    </section>

    <!-- VALUE PROPS -->
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <div class="grid md:grid-cols-2 gap-5">
        <div
          v-for="(p, i) in props_" :key="p.title"
          class="rounded-2xl bg-white p-6 border block"
          :style="{ borderColor: ['#dc2626', '#0891b2', '#f59e0b', '#16a34a'][i % 4] + '55' }"
        >
          <component :is="p.icon" class="w-6 h-6 mb-3" :style="{ color: ['#dc2626', '#0891b2', '#f59e0b', '#16a34a'][i % 4], 'stroke-width': 1.5 }" />
          <div class="text-lg font-bold" style="color:#3b1f0d;">{{ p.title }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ p.detail }}</div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="max-w-3xl mx-auto px-4 pb-10">
      <h2 class="text-2xl sm:text-3xl leading-tight mb-6">How it <em class="italic" style="color:#dc2626;">works</em></h2>
      <ol class="space-y-4" style="font-family: system-ui, sans-serif;">
        <li class="flex items-start gap-3">
          <span class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:#dc2626;">1</span>
          <div class="text-sm leading-relaxed" style="color:#5b3a1d;"><b style="color:#3b1f0d;">Tell us about your space.</b> Name, location, capacity, photos, what makes it dance-ready.</div>
        </li>
        <li class="flex items-start gap-3">
          <span class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:#dc2626;">2</span>
          <div class="text-sm leading-relaxed" style="color:#5b3a1d;"><b style="color:#3b1f0d;">We list your venue.</b> It appears on city pages and in our venue directory, visible to organizers searching for a space.</div>
        </li>
        <li class="flex items-start gap-3">
          <span class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:#dc2626;">3</span>
          <div class="text-sm leading-relaxed" style="color:#5b3a1d;"><b style="color:#3b1f0d;">Organizers send enquiries.</b> You receive booking requests by email with all the details \u2014 event type, date, guests, and a message.</div>
        </li>
        <li class="flex items-start gap-3">
          <span class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:#dc2626;">4</span>
          <div class="text-sm leading-relaxed" style="color:#5b3a1d;"><b style="color:#3b1f0d;">You respond directly.</b> Accept, negotiate, or decline \u2014 your terms, your call. WeDance stays out of the contract.</div>
        </li>
      </ol>
    </section>

    <!-- CTA -->
    <section class="max-w-3xl mx-auto px-4 pt-6 pb-10 text-center">
      <Building2 class="w-8 h-8 mx-auto mb-4" style="color:#dc2626; stroke-width:1.5;" />
      <h2 class="text-3xl sm:text-4xl leading-tight">
        List your <em class="italic" style="color:#dc2626;">space.</em>
      </h2>
      <p class="mt-4 text-sm sm:text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        Tell us about your venue and we'll get it in front of organizers who need a floor.
      </p>
      <a
        href="mailto:hello@wedance.vip?subject=List%20my%20venue%20on%20WeDance&body=Venue%20name%3A%0ACity%3A%0ACapacity%3A%0AWhat%20kind%20of%20space%3A%0AWebsite%20or%20photos%3A%20"
        class="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
      >
        List your venue <ArrowRight class="w-4 h-4" />
      </a>
      <div class="mt-3 text-sm" style="font-family:'Caveat', cursive; color:#9a5614;">
        — free to list, no commission
      </div>
    </section>

    <!-- CROSS-LINKS -->
    <section class="max-w-3xl mx-auto px-4 pb-16 space-y-3">
      <NuxtLink
        to="/for-organizers"
        class="rounded-2xl bg-white p-6 border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5"
        style="border-color:#3b1f0d22;"
      >
        <div>
          <div class="text-lg font-bold" style="color:#3b1f0d;">Are you an organizer looking for a space?</div>
          <div class="mt-1 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Browse available venues and send a booking request in one click.
          </div>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color:#dc2626; font-family: system-ui, sans-serif;">
          For organizers <ArrowRight class="w-3.5 h-3.5" />
        </span>
      </NuxtLink>
      <NuxtLink
        to="/booking-terms"
        class="rounded-2xl bg-white p-6 border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5"
        style="border-color:#3b1f0d22;"
      >
        <div>
          <div class="text-lg font-bold" style="color:#3b1f0d;">Booking terms</div>
          <div class="mt-1 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            How WeDance connects organizers with venues \u2014 roles, liability, and data sharing.
          </div>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color:#dc2626; font-family: system-ui, sans-serif;">
          Read terms <ArrowRight class="w-3.5 h-3.5" />
        </span>
      </NuxtLink>
    </section>

    <SiteFooter />
  </div>
</template>
