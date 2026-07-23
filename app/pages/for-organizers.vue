<script setup lang="ts">
/**
 * /for-organizers — For organizers, venues, and dance schools who run their
 * OWN events and want to reach more dancers via WeDance.
 *
 * Positioned DISTINCT from /for-events:
 *   /for-events    = "we run the whole night FOR you" (done-for-you)
 *   /for-organizers = "run it yourself, reach more dancers" (self-serve reach)
 *
 * Clones for-events.vue conventions: layout:false, Playfair Display + Caveat,
 * lucide icons, Cuban-warm editorial palette.
 */
import { ArrowRight, CalendarDays, Users, Ticket, BarChart3, PartyPopper } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — For organizers',
  meta: [
    { name: 'description', content: 'Run your own events? Publish your schedule where the dancers are, sell tickets, and get real audience data back.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const props_ = [
  { icon: CalendarDays, title: 'Publish your event',       detail: 'Your night, your festival, your weekly social — on the calendar dancers already check. Build an interactive schedule dancers can plan against weeks ahead.' },
  { icon: Users,        title: 'Reach the city\'s dancers', detail: 'Get discovered by the people who actually go out dancing. Your event lands in front of a warm, high-intent audience — not a cold ad feed.' },
  { icon: Ticket,       title: 'Ticketing & door',         detail: 'Sell tickets, run guest lists, and check people in at the door. One flow from listing to entry.' },
  { icon: BarChart3,    title: 'Audience data back',       detail: 'See which styles and levels your crowd wants, where they travel from, and what filled the room — so the next event is sharper.' },
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- HERO -->
    <section class="max-w-5xl mx-auto px-4 pt-14 pb-10">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">For organizers, venues & schools</div>
      <h1 class="text-5xl sm:text-6xl leading-[0.95]" style="color:#3b1f0d;">
        Run it yourself.<br>
        Reach <em class="italic" style="color:#dc2626;">more dancers.</em>
      </h1>
      <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        You already know how to throw the night. Publish it where the dancers are, sell the tickets, and get the audience data back — all in one place.
      </p>
    </section>

    <!-- VALUE PROPS -->
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <div class="grid md:grid-cols-2 gap-5">
        <div
          v-for="(p, i) in props_" :key="p.title"
          class="rounded-2xl bg-white p-6 border block"
          :style="{ borderColor: ['#dc2626', '#0891b2', '#f59e0b', '#16a34a', '#a855f7'][i % 5] + '55' }"
        >
          <component :is="p.icon" class="w-6 h-6 mb-3" :style="{ color: ['#dc2626', '#0891b2', '#f59e0b', '#16a34a', '#a855f7'][i % 5], 'stroke-width': 1.5 }" />
          <div class="text-lg font-bold" style="color:#3b1f0d;">{{ p.title }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ p.detail }}</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-3xl mx-auto px-4 pt-6 pb-10 text-center">
      <PartyPopper class="w-8 h-8 mx-auto mb-4" style="color:#dc2626; stroke-width:1.5;" />
      <h2 class="text-3xl sm:text-4xl leading-tight">
        Put your event <em class="italic" style="color:#dc2626;">on the map.</em>
      </h2>
      <p class="mt-4 text-sm sm:text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        Tell us about your event and we'll get you listed where the dancers are looking.
      </p>
      <a
        href="mailto:hello@wedance.vip?subject=Publish%20my%20event%20on%20WeDance&body=Event%2Fvenue%2Fschool%3A%0ACity%3A%0AWhat%20you%20run%3A%0AHow%20often%3A%0AWhat%20you%20need%3A%20"
        class="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        @click="useTrack().track('organizer_cta_click', { surface: 'for-organizers' })"
      >
        Publish your event <ArrowRight class="w-4 h-4" />
      </a>
      <div class="mt-3 text-sm" style="font-family:'Caveat', cursive; color:#9a5614;">
        — we usually respond same day
      </div>
    </section>

    <!-- CROSS-LINK to done-for-you -->
    <section class="max-w-3xl mx-auto px-4 pb-16">
      <NuxtLink
        to="/for-events"
        class="rounded-2xl bg-white p-6 border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5"
        style="border-color:#3b1f0d22;"
      >
        <div>
          <div class="text-lg font-bold" style="color:#3b1f0d;">Want us to run the whole night instead?</div>
          <div class="mt-1 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Venue, MC, DJ, show dancers, ticketing — done for you, end to end.
          </div>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color:#dc2626; font-family: system-ui, sans-serif;">
          For events <ArrowRight class="w-3.5 h-3.5" />
        </span>
      </NuxtLink>
    </section>

    <SiteFooter />
  </div>
</template>
