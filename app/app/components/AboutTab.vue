<script setup lang="ts">
import type { Festival } from '~/types/festival'

defineProps<{ festival: Festival }>()
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm leading-relaxed">{{ festival.description }}</p>
  </div>
</template>
