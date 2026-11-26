<script setup lang="ts">
import { artistBookingBlueprint } from '~/lib/blueprint-artist-booking'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Artist booking blueprint · WeDance Docs',
  description: 'How an artist gets discovered and booked on WeDance, lane by lane: the artist, WeDance and the organiser, from having a page to being booked again, with every request that goes unanswered.',
})

/**
 * Service blueprint for job J5: an artist getting discovered and booked. Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-artist-booking.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Get booked as an artist"
    lead="How a teacher, DJ, band or performer goes from having a page to being booked again, drawn lane by lane. There are three ways in (a booking request, a line-up invite, a gig), and none of them leads to the others."
  >
    <DocsBlueprint :bp="artistBookingBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the code on {{ updated }} (<NuxtLink to="/artists" class="underline">/artists</NuxtLink>,
        <NuxtLink to="/shortlist" class="underline">/shortlist</NuxtLink>, an artist’s
        /@handle/book, the line-up invite, <NuxtLink to="/gigs" class="underline">/gigs</NuxtLink> and the MCP tools);
        not yet run end to end with a test artist and organiser. The line-up steps overlap the
        <NuxtLink to="/docs/blueprints/event-setup" class="underline">event setup blueprint</NuxtLink>, seen from the
        artist’s side. This is job <NuxtLink to="/docs/jobs#j5" class="underline">J5, get discovered and booked as an artist</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
