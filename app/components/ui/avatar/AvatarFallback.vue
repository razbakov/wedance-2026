<script setup lang="ts">
import { AvatarFallback } from "reka-ui"

const props = defineProps()
</script>

<template>
  <AvatarFallback v-bind="props">
    <slot />
  </AvatarFallback>
</template>
