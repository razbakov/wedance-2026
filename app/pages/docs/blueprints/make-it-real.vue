<script setup lang="ts">
import { makeItRealBlueprint } from '~/lib/blueprint-make-it-real'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Make a page real blueprint · WeDance Docs',
  description: 'How a page WeDance listed on its own becomes run by its real owner, lane by lane: the owner, WeDance and the dancers deciding whether to trust it, with every claim that waits on an admin.',
})

/**
 * Service blueprint for making a page real (job J7). Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-make-it-real.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Make a page real"
    lead="How a page WeDance listed on its own — synced from wedance.vip or imported from Instagram — becomes run by its real owner, and how dancers can tell. The owner is rarely told the page exists, and dancers can’t see the difference."
  >
    <DocsBlueprint :bp="makeItRealBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the code on {{ updated }} (<NuxtLink to="/business/claim" class="underline">/business/claim</NuxtLink>,
        Admin → Claims and Users, the organiser’s <code>/confirm</code> links, a page’s Duplicates tab, Who’s coming and
        <NuxtLink to="/dance-card" class="underline">/dance-card</NuxtLink>); not yet run end to end with a test owner. See also the
        <NuxtLink to="/docs/blueprints/event-setup" class="underline">event setup blueprint</NuxtLink>. This is job
        <NuxtLink to="/docs/jobs#j7" class="underline">J7, trust it’s real</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
