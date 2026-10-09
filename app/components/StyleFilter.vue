<script setup lang="ts">
/**
 * StyleFilter — the dance-style chip row used on every filter surface.
 * Leads with the big three (Salsa, Bachata, Kizomba), collapses the rest
 * behind "More", and offers a "Don't know?" escape hatch to the
 * dance-finder (a v4 game to be integrated later — placeholder for now).
 */
const props = withDefaults(defineProps<{
  styles: string[]
  modelValue: string
  accents?: string[]
}>(), {
  accents: () => ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b', '#ec4899', '#7c3aed'],
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const PRIMARY = ['Salsa', 'Bachata', 'Kizomba']
const expanded = ref(false)

// Primary styles present in the data lead; the rest follow.
const ordered = computed(() => {
  const primary = PRIMARY.filter((s) => props.styles.includes(s))
  const rest = props.styles.filter((s) => !PRIMARY.includes(s))
  return [...primary, ...rest]
})
const leadCount = computed(() => Math.max(PRIMARY.filter((s) => props.styles.includes(s)).length, 3))
const visible = computed(() => (expanded.value ? ordered.value : ordered.value.slice(0, leadCount.value)))
const hiddenCount = computed(() => Math.max(0, ordered.value.length - leadCount.value))

function select(s: string) {
  emit('update:modelValue', props.modelValue === s ? '' : s)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="(style, i) in visible"
        :key="style"
        type="button"
        class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all"
        :style="modelValue === style
          ? { background: accents[i % accents.length], color: 'white' }
          : { background: 'white', color: accents[i % accents.length], border: '1px solid ' + accents[i % accents.length] + '55' }"
        @click="select(style)"
      >
        {{ style }}
      </button>

      <button
        v-if="hiddenCount && !expanded"
        type="button"
        class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all"
        style="background:white; color:#5b3a1d; border:1px solid #3b1f0d33;"
        @click="expanded = true"
      >
        + {{ hiddenCount }} more
      </button>
      <button
        v-else-if="expanded && ordered.length > leadCount"
        type="button"
        class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all"
        style="background:white; color:#9a5614; border:1px solid #3b1f0d33;"
        @click="expanded = false"
      >
        Less
      </button>
    </div>
  </div>
</template>
