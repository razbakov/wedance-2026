<script setup lang="ts">
/**
 * Brand — the WeDance mark used in every V3 header.
 *
 * Reuses the v3 brand assets so we stay consistent with the merch
 * (t-shirts) and social channels (Instagram, Telegram) that dancers
 * already recognise. Do NOT swap for a new mark without also updating
 * the printed and social surfaces.
 *
 * Assets in /public:
 * - logo.svg — horizontal composition (flame + wordmark)
 * - icon.svg — flame only, for favicon / AVP / any small square use
 *
 * Props:
 * - `to`: link target, default '/'
 * - `variant`: 'full' (horizontal logo, default) | 'mark' (flame icon only)
 */
withDefaults(defineProps<{
  to?: string
  variant?: 'full' | 'mark'
}>(), {
  to: '/',
  variant: 'full',
})
</script>

<template>
  <NuxtLink :to="to" class="inline-flex items-center leading-none" aria-label="WeDance">
    <img
      v-if="variant === 'full'"
      src="/logo.svg"
      alt="WeDance"
      class="h-6 sm:h-7 w-auto"
      draggable="false"
    >
    <img
      v-else
      src="/icon.svg"
      alt="WeDance"
      class="h-7 w-7"
      draggable="false"
    >
  </NuxtLink>
</template>
