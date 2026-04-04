<script setup lang="ts">
/**
 * BreakCard component per QA-016 / UI Spec Section 2 (BreakCard).
 * Full-width, transparent background, dashed border, centered text.
 */
defineProps<{
  name?: string
  time?: string
}>()
</script>

<template>
  <div
    class="w-full text-center"
    style="
      background: transparent;
      border: 1px dashed var(--color-border, #E2E2E4);
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--color-text-tertiary, #7A7A7A);
    "
  >
    <span v-if="name">{{ name }}</span>
    <span v-if="name && time"> &middot; </span>
    <span v-if="time">{{ time }}</span>
    <span v-if="!name && !time">Break</span>
  </div>
</template>
