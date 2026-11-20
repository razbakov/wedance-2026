<script setup lang="ts">
/**
 * Cancel one or several events (RAZ-948): an optional short reason, then
 * businessEvents.cancel. Before confirming, it says how many people will be
 * emailed (businessEvents.cancelPreview): everyone with it on their plan, a
 * "yes" on the poll, or a ticket. The events stay listed, marked "Cancelled".
 * Used in the event editor (one id) and on Business → Events (a selection).
 */
import { Ban } from 'lucide-vue-next'
import { EventCancelSchema } from '#shared/validation'

const props = defineProps<{
  ids: string[]
  /** The button that opens the form. */
  label?: string
  /** Field id prefix, unique on the page. */
  idPrefix?: string
}>()
const emit = defineEmits<{ cancelled: [result: { notified: number; count: number }] }>()

const { $trpc } = useNuxtApp()
const open = ref(false)
const form = reactive({ reason: '' })
const { errors, validate, fieldAttrs } = useFormValidation(EventCancelSchema, form)
const preview = ref<{ toNotify: number; tickets: number } | null>(null)
const loadingPreview = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const fid = computed(() => `${props.idPrefix || 'cancel'}-reason`)

async function start() {
  open.value = true
  error.value = null
  preview.value = null
  loadingPreview.value = true
  try {
    const p = await $trpc.businessEvents.cancelPreview.query({ ids: props.ids })
    preview.value = { toNotify: p.toNotify, tickets: p.events.reduce((n, e) => n + e.ticketHolders, 0) }
  } catch (e: any) {
    error.value = e?.message || 'Could not check who signed up.'
  } finally { loadingPreview.value = false }
}

async function submit() {
  const result = validate()
  if (!result.success) return
  saving.value = true
  error.value = null
  try {
    const r = await $trpc.businessEvents.cancel.mutate({ ids: props.ids, reason: result.data.reason || null })
    const fresh = r.events.filter(e => !e.alreadyCancelled).length
    useTrack().track('event_cancelled', {
      event_id: props.ids.length === 1 ? props.ids[0] : null, events: fresh, notified: r.notified, has_reason: !!result.data.reason, bulk: props.ids.length > 1,
    })
    open.value = false
    form.reason = ''
    emit('cancelled', { notified: r.notified, count: fresh })
  } catch (e: any) {
    error.value = e?.message || 'Could not cancel it.'
  } finally { saving.value = false }
}

const many = computed(() => props.ids.length > 1)
const who = computed(() => {
  const p = preview.value
  if (!p) return ''
  if (!p.toNotify) return 'Nobody has signed up yet, so nobody needs an email.'
  return `We’ll email ${p.toNotify} ${p.toNotify === 1 ? 'person' : 'people'} who signed up${p.tickets ? ` (${p.tickets} with a ticket: they’re asked to contact you about a refund)` : ''}.`
})
</script>

<template>
  <div>
    <Button v-if="!open" type="button" variant="destructive" size="sm" :disabled="!ids.length" @click="start"><Ban /> {{ label || 'Cancel event' }}</Button>
    <form v-else class="grid gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3" novalidate data-testid="cancel-events-form" @submit.prevent="submit">
      <p class="text-sm font-bold">{{ many ? `Cancel ${ids.length} events?` : 'Cancel this event?' }}</p>
      <p class="text-sm text-muted-foreground">
        {{ many ? 'They stay' : 'It stays' }} on WeDance and your website, marked “Cancelled” with your reason. You can undo it.
        <span v-if="loadingPreview"> Checking who signed up…</span>
        <span v-else-if="preview"> {{ who }}</span>
      </p>
      <Field :id="fid" label="Reason" optional hint="Shown on the event and in the email, e.g. “Tanzverbot today”." :error="errors.reason">
        <Textarea v-model="form.reason" :rows="2" maxlength="280" v-bind="fieldAttrs('reason', `${fid}-error`)" />
      </Field>
      <AdminState v-if="error" kind="error" :message="error" />
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="destructive" size="sm" :loading="saving" :disabled="loadingPreview"><Ban /> {{ many ? `Cancel ${ids.length} events` : 'Yes, cancel it' }}</Button>
        <Button type="button" variant="ghost" size="sm" @click="open = false">Keep {{ many ? 'them' : 'it' }}</Button>
      </div>
    </form>
  </div>
</template>
