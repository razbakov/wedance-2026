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
import { WD } from '~/lib/brand'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — For organizers',
  meta: [
    { name: 'description', content: 'Run your own events? Publish your schedule where the dancers are, sell tickets, and get real audience data back.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap' },
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
  <div class="min-h-screen" style="background:var(--wd-cream); color:var(--wd-brown-900); font-family:var(--wd-font-display);">
    <SiteHeader />

    <!-- HERO -->
    <section class="max-w-5xl mx-auto px-4 pt-14 pb-10">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:var(--wd-amber-600);">For organizers, venues & schools</div>
      <h1 class="text-5xl sm:text-6xl leading-[0.95]" style="color:var(--wd-brown-900);">
        Run it yourself.<br>
        Reach <em class="italic" style="color:var(--wd-red-600);">more dancers.</em>
      </h1>
      <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
        You already know how to throw the night. Publish it where the dancers are, sell the tickets, and get the audience data back — all in one place.
      </p>
    </section>

    <!-- VALUE PROPS -->
    <section class="max-w-5xl mx-auto px-4 pb-10">
      <div class="grid md:grid-cols-2 gap-5">
        <div
          v-for="(p, i) in props_" :key="p.title"
          class="rounded-2xl bg-white p-6 border block"
          :style="{ borderColor: [WD.red600, WD.cyan600, WD.amber500, WD.green600, WD.purple500][i % 5] + '55' }"
        >
          <component :is="p.icon" class="w-6 h-6 mb-3" :style="{ color: [WD.red600, WD.cyan600, WD.amber500, WD.green600, WD.purple500][i % 5], 'stroke-width': 1.5 }" />
          <div class="text-lg font-bold" style="color:var(--wd-brown-900);">{{ p.title }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">{{ p.detail }}</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-3xl mx-auto px-4 pt-6 pb-10 text-center">
      <PartyPopper class="w-8 h-8 mx-auto mb-4" style="color:var(--wd-red-600); stroke-width:1.5;" />
      <h2 class="text-3xl sm:text-4xl leading-tight">
        Put your event <em class="italic" style="color:var(--wd-red-600);">on the map.</em>
      </h2>
      <p class="mt-4 text-sm sm:text-base" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
        Tell us about your event and we'll get you listed where the dancers are looking.
      </p>
      <a
        href="mailto:hello@wedance.vip?subject=Publish%20my%20event%20on%20WeDance&body=Event%2Fvenue%2Fschool%3A%0ACity%3A%0AWhat%20you%20run%3A%0AHow%20often%3A%0AWhat%20you%20need%3A%20"
        class="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, var(--wd-red-600), var(--wd-orange-500)); box-shadow: 0 4px 0 -1px var(--wd-red-800);"
        @click="useTrack().track('organizer_cta_click', { surface: 'for-organizers' })"
      >
        Publish your event <ArrowRight class="w-4 h-4" />
      </a>
      <div class="mt-3 text-sm" style="font-family:var(--wd-font-display);font-style:italic; color:var(--wd-amber-600);">
        — we usually respond same day
      </div>
    </section>

    <!-- CROSS-LINKS -->
    <section class="max-w-3xl mx-auto px-4 pb-16 space-y-3">
      <NuxtLink
        to="/for-events"
        class="rounded-2xl bg-white p-6 border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5"
        style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
      >
        <div>
          <div class="text-lg font-bold" style="color:var(--wd-brown-900);">Want us to run the whole night instead?</div>
          <div class="mt-1 text-sm leading-relaxed" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
            Venue, MC, DJ, show dancers, ticketing — done for you, end to end.
          </div>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color:var(--wd-red-600); font-family:var(--wd-font-sans);">
          For events <ArrowRight class="w-3.5 h-3.5" />
        </span>
      </NuxtLink>
      <NuxtLink
        to="/for-venues"
        class="rounded-2xl bg-white p-6 border flex items-center justify-between gap-4 transition-all hover:-translate-y-0.5"
        style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
      >
        <div>
          <div class="text-lg font-bold" style="color:var(--wd-brown-900);">Have a venue? List it on WeDance.</div>
          <div class="mt-1 text-sm leading-relaxed" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
            Get booking requests from dance organizers looking for a space.
          </div>
        </div>
        <span class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap" style="color:var(--wd-red-600); font-family:var(--wd-font-sans);">
          For venues <ArrowRight class="w-3.5 h-3.5" />
        </span>
      </NuxtLink>
    </section>

    <SiteFooter />
  </div>
</template>
