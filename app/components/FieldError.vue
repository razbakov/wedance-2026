<script setup lang="ts">
/**
 * Inline validation message under a form field. `id` is what the input's
 * aria-describedby points at (see useFormValidation's fieldAttrs).
 */
defineProps<{ id: string; message?: string }>()
</script>

<template>
  <span v-if="message" :id="id" class="mt-1 block text-xs font-bold text-destructive font-sans">
    {{ message }}
  </span>
</template>
