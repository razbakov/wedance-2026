<script setup lang="ts">
import { GoalSchema, validateForm } from '#shared/validation'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [title: string, why: string]
}>()

const title = ref('')
const why = ref('')
const titleInput = ref<HTMLInputElement | null>(null)
const goal = computed(() => validateForm(GoalSchema, { title: title.value, why: why.value }))

watch(() => props.open, (val) => {
  if (val) {
    title.value = ''
    why.value = ''
    nextTick(() => titleInput.value?.focus())
  }
})

function cancel() {
  emit('update:open', false)
}

function submit() {
  if (!goal.value.success) return
  emit('confirm', goal.value.data.title, goal.value.data.why)
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Add a goal</DialogTitle>
        <DialogDescription>
          What are you working toward this year?
        </DialogDescription>
      </DialogHeader>
      <form class="space-y-4 py-2" novalidate @submit.prevent="submit">
        <div class="space-y-1.5">
          <label for="goal-title" class="text-sm font-medium">Goal</label>
          <input
            id="goal-title"
            ref="titleInput"
            v-model="title"
            type="text"
            placeholder="e.g. Learn Bachata Sensual"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div class="space-y-1.5">
          <label for="goal-why" class="text-sm font-medium">
            Why does it matter?
            <span class="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="goal-why"
            v-model="why"
            type="text"
            placeholder="e.g. Feel confident on the dance floor"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <DialogFooter class="gap-2 sm:gap-0">
          <button
            type="button"
            class="h-10 px-4 rounded-md text-sm font-medium border hover:bg-muted transition-colors"
            @click="cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="h-10 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            :disabled="!goal.success"
          >
            Add goal
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
