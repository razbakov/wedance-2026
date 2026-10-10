<script setup lang="ts">
/** Props table for a component page. */
defineProps<{
  rows: { name: string, type: string, default?: string, description: string }[]
}>()
</script>

<template>
  <div tabindex="0" role="region" aria-label="Props" class="overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <table class="w-full text-sm text-left">
      <thead class="bg-muted text-[11px] uppercase tracking-wider text-muted-foreground">
        <tr>
          <th scope="col" class="px-4 py-2.5 font-bold">Prop</th>
          <th scope="col" class="px-4 py-2.5 font-bold">Type</th>
          <th scope="col" class="px-4 py-2.5 font-bold">Default</th>
          <th scope="col" class="px-4 py-2.5 font-bold">Description</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.name" class="border-t border-border align-top">
          <td class="px-4 py-3 font-mono text-[13px] font-bold text-foreground whitespace-nowrap">{{ r.name }}</td>
          <td class="px-4 py-3 font-mono text-[12px] text-secondary">{{ r.type }}</td>
          <td class="px-4 py-3 font-mono text-[12px] text-muted-foreground whitespace-nowrap">{{ r.default ?? '—' }}</td>
          <td class="px-4 py-3 text-muted-foreground">{{ r.description }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
