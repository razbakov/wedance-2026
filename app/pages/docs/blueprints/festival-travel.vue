<script setup lang="ts">
import { festivalTravelBlueprint } from '~/lib/blueprint-festival-travel'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Festival travel blueprint · WeDance Docs',
  description: 'How a dancer plans and pays for a year of dance festivals on WeDance, lane by lane: dancer, WeDance, organiser, friends and the ticket provider, with every wait, hand-carried link and missed update.',
})

/**
 * Service blueprint for planning and affording dance travel (job J4). Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-festival-travel.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Plan and afford my dance travel"
    lead="How a dancer goes from browsing festivals to a year of them — workshops, passes, rides, rooms and friends — drawn lane by lane. The plan is there; what it costs, and tickets bought anywhere but here, are not."
  >
    <DocsBlueprint :bp="festivalTravelBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the code on {{ updated }} (<NuxtLink to="/festivals" class="underline">/festivals</NuxtLink>, a festival’s
        page, <NuxtLink to="/my-plan" class="underline">My plan</NuxtLink>’s Year tab, the ticket checkout and its
        Stripe and TicketTailor webhooks); not yet run end to end with a test dancer and a real checkout. See also the
        <NuxtLink to="/docs/blueprints/meet-friends" class="underline">meet new friends blueprint</NuxtLink>. This is job
        <NuxtLink to="/docs/jobs#j4" class="underline">J4, plan and afford my dance travel</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
