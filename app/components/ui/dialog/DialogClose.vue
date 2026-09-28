<script setup lang="ts">
import type { DialogCloseProps } from "reka-ui"
import { DialogClose } from "reka-ui"

const props = defineProps</* @vue-ignore */ DialogCloseProps>()
</script>

<template>
  <DialogClose v-bind="props">
    <slot />
  </DialogClose>
</template>
