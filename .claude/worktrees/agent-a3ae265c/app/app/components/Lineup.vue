<script setup lang="ts">
import type { Teacher } from '~/types/festival'

defineProps<{
  teachers: Teacher[]
  selectedId: string | null
}>()

defineEmits<{
  select: [id: string | null]
}>()
</script>

<template>
  <div class="flex gap-4 overflow-x-auto py-2">
    <button
      v-for="teacher in teachers"
      :key="teacher.id"
      class="flex flex-col items-center gap-1.5 shrink-0 group"
      @click="$emit('select', selectedId === teacher.id ? null : teacher.id)"
    >
      <div
        class="w-16 h-16 rounded-full overflow-hidden border-2 transition-all"
        :class="selectedId === teacher.id
          ? 'border-primary shadow-md'
          : 'border-transparent group-hover:border-border'"
      >
        <img
          :src="teacher.photo"
          :alt="teacher.name"
          class="w-full h-full object-cover"
        />
      </div>
      <span
        class="text-xs text-center max-w-[70px] leading-tight transition-colors"
        :class="selectedId === teacher.id ? 'font-semibold text-foreground' : 'text-muted-foreground'"
      >
        {{ teacher.name }}
      </span>
    </button>
  </div>
</template>
