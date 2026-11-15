<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

// "It's on again" for a cancelled event's managers, in the "You manage this event"
// bar on the public page (RAZ-948). Same as Business → event → It's on again:
// the "Cancelled" mark goes and nobody is emailed.
const props = defineProps<{ eventId: string }>()
const { $trpc } = useNuxtApp()
const busy = ref(false)
const error = ref('')
async function uncancel() {
  busy.value = true
  error.value = ''
  try {
    await $trpc.businessEvents.uncancel.mutate({ id: props.eventId })
    window.location.reload()
  } catch (e: any) {
    error.value = e?.message || 'Could not undo it.'
    busy.value = false
  }
}
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span v-if="error" class="text-xs text-destructive" role="alert">{{ error }}</span>
    <span class="text-destructive font-bold">Cancelled</span>
    <Button type="button" variant="outline-pill" size="pill-sm" :disabled="busy" data-testid="event-uncancel" @click="uncancel">
      <RotateCcw aria-hidden="true" /> It’s on again
    </Button>
  </span>
</template>
