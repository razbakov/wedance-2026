<script setup lang="ts">
// Per-event privacy toggle for the public attendee roster.
//
// Three levels (matching the `roster_visibility` column):
//   public_full    — show name + city + photo
//   public_minimal — show name + city only (default)
//   hidden         — hide me from the public roster
//
// Initial value is fetched via `festivalSignup.getMyVisibility` so the
// component is self-contained — pages don't need to feed it. Mutations go
// through `festivalSignup.setMyVisibility`. Wired up by PR 3.

type Level = 'public_full' | 'public_minimal' | 'hidden'

const props = defineProps<{
  festivalSlug: string
}>()

const emit = defineEmits<{
  change: [level: Level]
}>()

const { $trpc } = useNuxtApp()

const level = ref<Level>('public_minimal')
const initialized = ref(false)
const pending = ref(false)
const error = ref<string | null>(null)

const OPTIONS: Array<{ value: Level; label: string; hint: string }> = [
  { value: 'public_full', label: 'Show name + photo', hint: 'Your name, city, and profile photo' },
  { value: 'public_minimal', label: 'Show name only', hint: 'Your name and city — no photo' },
  { value: 'hidden', label: 'Hide me from the roster', hint: 'You\'ll be counted but not listed' },
]

async function loadInitial() {
  try {
    const res = await $trpc.festivalSignup.getMyVisibility.query({
      festivalSlug: props.festivalSlug,
    })
    if (res.level) level.value = res.level
  } catch (e: any) {
    // Non-fatal — fall back to the conservative default.
    error.value = e?.message ?? null
  } finally {
    initialized.value = true
  }
}

// Client-only fetch — the tRPC client's relative URL ('/api/trpc') breaks
// during Nitro SSR (PR 3 hotfix #28 documented this). Fetch on mount so
// hydration succeeds without a server-side 500.
onMounted(loadInitial)
watch(() => props.festivalSlug, (next, prev) => {
  if (next !== prev) loadInitial()
})

async function pick(next: Level) {
  if (pending.value || next === level.value) return
  const previous = level.value
  level.value = next
  pending.value = true
  error.value = null
  try {
    await $trpc.festivalSignup.setMyVisibility.mutate({
      festivalSlug: props.festivalSlug,
      level: next,
    })
    emit('change', next)
  } catch (e: any) {
    // Roll back the optimistic change.
    level.value = previous
    error.value = e?.message ?? 'Could not update your privacy setting.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <fieldset class="space-y-2" :disabled="!initialized || pending">
    <legend class="text-sm font-medium">
      Who can see you on the attendee list?
    </legend>

    <div class="space-y-1.5">
      <label
        v-for="opt in OPTIONS"
        :key="opt.value"
        class="flex items-start gap-2 rounded-md border bg-background p-2.5 cursor-pointer transition-colors"
        :class="level === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'"
      >
        <input
          type="radio"
          name="roster-visibility"
          :value="opt.value"
          :checked="level === opt.value"
          class="mt-0.5 accent-primary"
          @change="pick(opt.value)"
        >
        <span class="flex-1 min-w-0">
          <span class="block text-sm font-medium">{{ opt.label }}</span>
          <span class="block text-xs text-muted-foreground">{{ opt.hint }}</span>
        </span>
      </label>
    </div>

    <p v-if="pending" class="text-xs text-muted-foreground">
      Saving…
    </p>
    <p v-else-if="error" class="text-xs text-destructive">
      {{ error }}
    </p>
  </fieldset>
</template>
