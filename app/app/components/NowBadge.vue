<script setup lang="ts">
/**
 * Pulsing "NOW" badge shown on workshops that are currently happening.
 * Uses the festival accent color for visual consistency.
 */
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
    style="background-color: var(--festival-accent, #E8453C); color: white;"
  >
    <span class="relative flex h-2 w-2">
      <span
        class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style="background-color: white;"
      />
      <span class="relative inline-flex h-2 w-2 rounded-full bg-white" />
    </span>
    Now
  </span>
</template>
