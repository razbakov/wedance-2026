<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'

/** Side-by-side guidance. Slots: #do and #dont (preview); props carry the rule text. */
defineProps<{ doText: string, dontText: string }>()
</script>

<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <div class="rounded-2xl border border-border overflow-hidden bg-card">
      <div class="flex flex-wrap items-center justify-center gap-3 p-6 min-h-28 bg-background/60 border-b-4 border-success">
        <slot name="do" />
      </div>
      <p class="flex gap-2 p-4 text-sm text-muted-foreground">
        <Check class="w-4 h-4 shrink-0 mt-0.5 text-success" aria-hidden="true" />
        <span><strong class="text-foreground">Do</strong> — {{ doText }}</span>
      </p>
    </div>
    <div class="rounded-2xl border border-border overflow-hidden bg-card">
      <div class="flex flex-wrap items-center justify-center gap-3 p-6 min-h-28 bg-background/60 border-b-4 border-destructive">
        <slot name="dont" />
      </div>
      <p class="flex gap-2 p-4 text-sm text-muted-foreground">
        <X class="w-4 h-4 shrink-0 mt-0.5 text-destructive" aria-hidden="true" />
        <span><strong class="text-foreground">Don't</strong> — {{ dontText }}</span>
      </p>
    </div>
  </div>
</template>
