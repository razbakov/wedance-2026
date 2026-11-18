<script setup lang="ts">
import { meetFriendsBlueprint } from '~/lib/blueprint-meet-friends'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Meet new friends blueprint · WeDance Docs',
  description: 'How a dancer meets new friends on WeDance, lane by lane: you, WeDance and the other dancer, from joining to dancing together, with every place a Yes goes unheard.',
})

/**
 * Service blueprint for meeting new friends (RAZ-981). Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-meet-friends.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Meet new friends"
    lead="How a dancer goes from joining WeDance to dancing with someone they didn’t know, drawn lane by lane. The bottom row is the other dancer: most of the journey never reaches them."
  >
    <DocsBlueprint :bp="meetFriendsBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the code on {{ updated }} (<NuxtLink to="/meet" class="underline">/meet</NuxtLink>,
        My plan → Your dance friends, the “said yes too” email, and the header bell). The festival page no longer has its own deck.
        A match shows their face and the night. Not yet run end to end with two test dancers. See also the
        <NuxtLink to="/docs/blueprints/event-setup" class="underline">event setup blueprint</NuxtLink>. This is job
        <NuxtLink to="/docs/jobs#j3" class="underline">J3, never dance alone</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
