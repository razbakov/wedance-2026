<script setup lang="ts">
/**
 * "Cancelled" on an event card (RAZ-948): the organiser called it off. The
 * event stays listed; the reason, when given, follows the tag.
 */
defineProps<{ reason?: string | null; withReason?: boolean }>()
</script>

<template>
  <span class="inline-flex items-center gap-1 text-xs font-sans" data-testid="event-cancelled">
    <span class="rounded bg-destructive/10 px-1.5 py-0.5 text-tag font-black uppercase tracking-widest text-destructive">Cancelled</span>
    <span v-if="withReason && reason" class="text-muted-foreground break-words">{{ reason }}</span>
  </span>
</template>
