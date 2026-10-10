<script setup lang="ts">
import { Accessibility } from 'lucide-vue-next'

/** Accessibility notes list. */
defineProps<{ notes: string[] }>()
</script>

<template>
  <ul class="space-y-2.5">
    <li v-for="n in notes" :key="n" class="flex gap-3 text-sm text-muted-foreground">
      <Accessibility class="w-4 h-4 shrink-0 mt-0.5 text-info" aria-hidden="true" />
      <span v-html="n" />
    </li>
  </ul>
</template>
