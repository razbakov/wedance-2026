<script setup lang="ts">
import type { Festival } from '~/types/festival'
import { heroTagline } from '#shared/utils/heroTagline'

// The flyer, the organiser and the description moved to the hero (RAZ-1008). About keeps
// what the hero doesn't say: co-organisers with their roles, and the text only when the
// hero has none to show.
const props = defineProps<{ festival: Festival }>()
const credits = computed(() => (props.festival.organizers?.length ?? 0) > 1 ? props.festival.organizers! : [])
const text = computed(() => heroTagline(props.festival.description) ? '' : props.festival.description?.trim() ?? '')
const hasContent = computed(() => credits.value.length > 0 || !!text.value)
</script>

<template>
  <div v-if="hasContent">
    <p v-if="credits.length" class="mb-3 text-sm" data-testid="event-organizers">
      <span class="text-muted-foreground">Organised by </span>
      <template v-for="(o, i) in credits" :key="o.username">
        <template v-if="i">, </template>
        <NuxtLink :to="`/@${o.username}`" class="font-bold hover:underline">{{ o.name }}</NuxtLink>
        <span v-if="o.role !== 'Organiser'" class="text-muted-foreground"> ({{ o.role.toLowerCase() }})</span>
      </template>
    </p>
    <p v-if="text" class="text-sm leading-relaxed whitespace-pre-line">{{ text }}</p>
  </div>
</template>
