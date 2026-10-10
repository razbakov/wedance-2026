<script setup lang="ts">
/** A titled section. Its h2 id feeds the layout's "On this page" list. */
defineProps<{ id: string, title: string, lead?: string }>()
</script>

<template>
  <section :aria-labelledby="id" class="scroll-mt-24">
    <h2 :id="id" class="group text-2xl font-display font-bold scroll-mt-24">
      <a :href="`#${id}`" class="no-underline">
        {{ title }}
        <span class="opacity-0 group-hover:opacity-40 text-secondary ml-1" aria-hidden="true">#</span>
      </a>
    </h2>
    <p v-if="lead" class="text-muted-foreground mt-2 max-w-2xl">{{ lead }}</p>
    <div class="mt-6">
      <slot />
    </div>
  </section>
</template>
