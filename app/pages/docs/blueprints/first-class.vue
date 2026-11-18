<script setup lang="ts">
import { firstClassBlueprint } from '~/lib/blueprint-first-class'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'First class blueprint · WeDance Docs',
  description: 'How someone who has never danced gets to a first class on WeDance, lane by lane: the newcomer, WeDance and the school, with every place the school never hears and the newcomer gets nothing.',
})

/**
 * Service blueprint for a first dance class (job J1). Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-first-class.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="First class"
    lead="How someone who has never danced goes from curious to a second class, drawn lane by lane. The bottom row is the school: it hears about the newcomer far less often than the newcomer thinks."
  >
    <DocsBlueprint :bp="firstClassBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the code on {{ updated }} (<NuxtLink to="/find-your-dance" class="underline">/find-your-dance</NuxtLink>,
        a city’s “Your first class” list, the event page’s “Book my spot”, the sign-up emails and Contacts);
        not yet run end to end with a test newcomer and school. See also the
        <NuxtLink to="/docs/blueprints/event-setup" class="underline">event setup</NuxtLink> and
        <NuxtLink to="/docs/blueprints/meet-friends" class="underline">meet new friends</NuxtLink> blueprints. This is job
        <NuxtLink to="/docs/jobs#j1" class="underline">J1, start dancing without feeling lost</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
