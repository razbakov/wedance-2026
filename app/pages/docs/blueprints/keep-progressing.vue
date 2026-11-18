<script setup lang="ts">
import { keepProgressingBlueprint } from '~/lib/blueprint-keep-progressing'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Keep progressing blueprint · WeDance Docs',
  description: 'How a student gets better on WeDance, lane by lane: the student, WeDance and the teacher or school, from setting a goal to the next level, with every wait, hand-carried booking and missed update.',
})

/**
 * Service blueprint for getting better and keeping momentum (J2). Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-keep-progressing.ts (hand-maintained from the code).
 */
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Keep progressing"
    lead="How a student goes from “I want to get better” to the next level, drawn lane by lane. WeDance lists the classes and takes the sign-up; most of what keeps someone coming back each week happens in the school’s WhatsApp group."
  >
    <DocsBlueprint :bp="keepProgressingBlueprint">
      <template #about="{ updated }">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the code on {{ updated }} (My plan’s Goals and Courses, <NuxtLink to="/artists" class="underline">/artists</NuxtLink>,
        teacher pages and their booking form, course series and the school’s Contacts); not yet run end to end with a test
        student and school. See also the <NuxtLink to="/docs/blueprints/event-setup" class="underline">event setup blueprint</NuxtLink>
        for the school’s side of publishing. This is job
        <NuxtLink to="/docs/jobs#j2" class="underline">J2, get better and keep momentum</NuxtLink>.
      </template>
    </DocsBlueprint>
  </DesignPage>
</template>
