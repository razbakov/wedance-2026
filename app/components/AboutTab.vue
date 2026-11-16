<script setup lang="ts">
import type { Festival } from '~/types/festival'

// The flyer moved to the hero (RAZ-1008); About keeps the credits and the full text.
defineProps<{ festival: Festival }>()
</script>

<template>
  <div>
    <div>
      <!-- Who runs it: the organiser, then its co-organisers (#456). -->
      <p v-if="festival.organizers?.length" class="mb-3 text-sm" data-testid="event-organizers">
        <span class="text-muted-foreground">Organised by </span>
        <template v-for="(o, i) in festival.organizers" :key="o.username">
          <template v-if="i">, </template>
          <NuxtLink :to="`/@${o.username}`" class="font-bold hover:underline">{{ o.name }}</NuxtLink>
          <span v-if="o.role !== 'Organiser'" class="text-muted-foreground"> ({{ o.role.toLowerCase() }})</span>
        </template>
      </p>
      <p class="text-sm leading-relaxed">{{ festival.description }}</p>
    </div>
  </div>
</template>
