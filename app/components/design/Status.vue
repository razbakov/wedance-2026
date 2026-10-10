<script setup lang="ts">
import type { DocStatus } from '~/lib/design-nav'

defineProps<{ status: DocStatus }>()

const styles: Record<DocStatus, string> = {
  stable: 'bg-success/12 text-wd-green-700 border-success/30',
  beta: 'bg-warning/15 text-wd-amber-800 border-warning/40',
  planned: 'bg-muted text-muted-foreground border-border',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-sans"
    :class="styles[status]"
  >{{ status }}</span>
</template>
