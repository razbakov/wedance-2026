<script setup lang="ts">
import { eventSetupBlueprint } from '~/lib/blueprint-event-setup'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Event setup blueprint · WeDance Docs',
  description: 'How an event gets set up on WeDance, lane by lane: organiser, WeDance, venue, artists and dancers, with every wait, hand-carried link and missed update.',
})

/**
 * Service blueprint for setting up an event. Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-event-setup.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Event setup"
    lead="How an event gets made, from getting the organiser’s page to the night, drawn lane by lane. Every row is someone who has to act; every marker is a place where someone waits, carries a link by hand, or never hears about a change."
  >
    <DocsBlueprint :bp="eventSetupBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the routers and run end to end with a test organiser, venue and artist on {{ updated }}; see the
        <NuxtLink to="/docs/ux-map" class="underline">UX map</NuxtLink> for the dancer journeys, and the
        <NuxtLink to="/docs/blueprints/meet-friends" class="underline">meet new friends blueprint</NuxtLink>. This is job
        <NuxtLink to="/docs/jobs#j6" class="underline">J6, run a great event</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
