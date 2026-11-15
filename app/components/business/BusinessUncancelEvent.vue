<script setup lang="ts">
/**
 * "It's on again" (RAZ-969): takes the "Cancelled" mark off an event and offers
 * to email the people who got the cancellation email "Good news, it's on again".
 * Before confirming it says how many that is (businessEvents.uncancelPreview),
 * like the cancel form does.
 */
import { Undo2, Mail } from 'lucide-vue-next'

const props = defineProps<{ id: string }>()
const emit = defineEmits<{ uncancelled: [result: { notified: number }] }>()

const { $trpc } = useNuxtApp()
const open = ref(false)
const preview = ref<{ toNotify: number; tickets: number } | null>(null)
const loadingPreview = ref(false)
const saving = ref<'notify' | 'quiet' | null>(null)
const error = ref<string | null>(null)

async function start() {
  open.value = true
  error.value = null
  preview.value = null
  loadingPreview.value = true
  try {
    const p = await $trpc.businessEvents.uncancelPreview.query({ ids: [props.id] })
    preview.value = { toNotify: p.toNotify, tickets: p.events.reduce((n, e) => n + e.ticketHolders, 0) }
  } catch (e: any) {
    error.value = e?.message || 'Could not check who was told.'
  } finally { loadingPreview.value = false }
}

async function submit(notify: boolean) {
  saving.value = notify ? 'notify' : 'quiet'
  error.value = null
  try {
    const r = await $trpc.businessEvents.uncancel.mutate({ id: props.id, notify })
    useTrack().track('event_uncancelled', { event_id: props.id, notify, notified: r.notified })
    open.value = false
    emit('uncancelled', { notified: r.notified })
  } catch (e: any) {
    error.value = e?.message || 'Could not undo it.'
  } finally { saving.value = null }
}

const count = computed(() => preview.value?.toNotify ?? 0)
const people = computed(() => `${count.value} ${count.value === 1 ? 'person' : 'people'}`)
</script>

<template>
  <div class="w-full sm:w-auto">
    <Button v-if="!open" type="button" variant="outline-pill" size="pill-sm" @click="start"><Undo2 /> It’s on again</Button>
    <div v-else class="grid gap-3 rounded-xl border bg-card p-3" data-testid="uncancel-event-form">
      <p class="text-sm font-bold">It’s on again?</p>
      <p class="text-sm text-muted-foreground">
        The “Cancelled” mark comes off on WeDance and your website.
        <span v-if="loadingPreview"> Checking who was told…</span>
        <template v-else-if="preview">
          <span v-if="count"> {{ people }} got the cancellation email. We can email {{ count === 1 ? 'them' : 'them all' }}: “Good news, it’s on again”.</span>
          <span v-else> Nobody got the cancellation email, so there’s nobody to tell.</span>
        </template>
      </p>
      <AdminState v-if="error" kind="error" :message="error" />
      <div class="flex flex-wrap items-center gap-2">
        <Button v-if="count" type="button" size="sm" :loading="saving === 'notify'" :disabled="!!saving" data-testid="uncancel-notify" @click="submit(true)"><Mail /> On again + email {{ people }}</Button>
        <Button type="button" :variant="count ? 'outline' : 'default'" size="sm" :loading="saving === 'quiet'" :disabled="loadingPreview || !!saving" @click="submit(false)"><Undo2 /> {{ count ? 'Just remove the mark' : 'Yes, it’s on again' }}</Button>
        <Button type="button" variant="ghost" size="sm" @click="open = false">Keep it cancelled</Button>
      </div>
    </div>
  </div>
</template>
