<script setup lang="ts">
/**
 * Error state component.
 * Per QA-011 / UI Spec Screen 5 (Error State).
 * Shows alert icon, heading, description, and retry button.
 */
defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4 py-16 text-center">
    <!-- Alert triangle icon (Lucide alert-triangle approximation) -->
    <svg
      class="mb-4"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#DC2626"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>

    <p
      class="font-bold"
      style="font-size: 18px; line-height: 1.3; color: var(--color-text-primary, #1A1A1A);"
    >
      Could not load schedule
    </p>

    <p
      class="mt-2"
      style="font-size: 14px; line-height: 1.5; color: var(--color-text-secondary, #4A4A4A);"
    >
      Check your connection and try again.
    </p>

    <button
      class="mt-4 rounded-lg text-white font-semibold"
      style="
        background-color: var(--color-interactive, #E8453C);
        padding: 12px 24px;
        font-size: 14px;
        border-radius: 8px;
      "
      @click="$emit('retry')"
    >
      Retry
    </button>
  </div>
</template>
