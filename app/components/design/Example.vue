<script setup lang="ts">
/** Live preview over its source. `center` centres the preview content. */
withDefaults(defineProps<{ code?: string, title?: string, center?: boolean, padded?: boolean }>(), {
  center: false,
  padded: true,
})
</script>

<template>
  <figure class="rounded-2xl border border-border overflow-hidden bg-card">
    <figcaption v-if="title" class="px-5 pt-4 text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">
      {{ title }}
    </figcaption>
    <div
      class="flex flex-wrap items-center gap-3 bg-background/60"
      :class="[padded ? 'p-6 sm:p-8' : '', center ? 'justify-center' : '']"
    >
      <slot />
    </div>
    <DesignCode v-if="code" :code="code" class="rounded-none" />
  </figure>
</template>
