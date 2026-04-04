<script setup lang="ts">
defineProps<{
  visible: boolean
  message: string
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-semibold"
        style="
          z-index: 200;
          background: var(--color-text-primary, #1A1A1A);
          color: var(--color-text-inverse, #FFFFFF);
          font-size: 14px;
          border-radius: 8px;
          padding: 12px 16px;
        "
      >
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>
