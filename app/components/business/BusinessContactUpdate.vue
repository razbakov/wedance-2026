<script setup lang="ts">
/**
 * Contacts → "Send an update" (RAZ-960). The segment is whatever the Contacts filters show
 * (source, WeDance activity, one event — not the search box); only people the page may email
 * get it, and imported lists stay out unless ticked in. Write it, or start from "Invite to my
 * next event" (event card + RSVP), preview it, send a test to yourself, then send — with one
 * more click that names the number of people. Past sends are listed underneath.
 * Server: contactUpdates router.
 */
import { Send, Eye, FlaskConical, CalendarPlus, X, Check, History } from 'lucide-vue-next'
import { ContactUpdateSchema } from '#shared/validation'
import { IMPORTED_SOURCES, inviteTemplate, segmentLabel, type UpdateSegment } from '#shared/utils/contactUpdate'

const props = defineProps<{
  username: string
  pageName: string
  /** From the Contacts filters; includeImported is decided here. */
  segment: Omit<UpdateSegment, 'includeImported'>
  eventName?: string | null
}>()
const emit = defineEmits<{ close: [] }>()

const { $trpc } = useNuxtApp()
type Compose = Awaited<ReturnType<typeof $trpc.contactUpdates.compose.query>>
type Preview = Awaited<ReturnType<typeof $trpc.contactUpdates.preview.mutate>>
const compose = ref<Compose | null>(null)
const preview = ref<Preview | null>(null)
const showPreview = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const form = reactive({ subject: '', body: '' })
const { errors, validate, fieldAttrs } = useFormValidation(ContactUpdateSchema, form)
const eventId = ref<string | null>(null)
const template = ref<'invite_next_event' | null>(null)
// Off by default; picking an imported source on Contacts says you mean them.
const includeImported = ref(props.segment.sources.some(s => IMPORTED_SOURCES.includes(s)))

const fullSegment = computed<UpdateSegment>(() => ({ ...props.segment, includeImported: includeImported.value }))
const label = computed(() => segmentLabel(fullSegment.value, props.eventName))
const draft = computed(() => ({ username: props.username, segment: fullSegment.value, subject: form.subject.trim(), body: form.body.trim(), eventId: eventId.value }))

onMounted(async () => {
  try { compose.value = await $trpc.contactUpdates.compose.query({ username: props.username }) }
  catch (e: any) { error.value = e?.message || 'Couldn’t open the composer.' }
  refresh()
})

const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
async function refresh() {
  loading.value = true
  try { preview.value = await $trpc.contactUpdates.preview.mutate(draft.value); error.value = null }
  catch (e: any) { error.value = e?.message || 'Couldn’t count who gets it.' }
  finally { loading.value = false }
}
// The count follows the segment; the preview follows the words (debounced).
watch(fullSegment, () => { confirming.value = false; refresh() }, { deep: true })
watch(() => [form.subject, form.body, eventId.value], () => {
  confirming.value = false
  clearTimeout(timer)
  timer = setTimeout(refresh, 500)
})

function useInvite() {
  const ev = compose.value?.events.find(e => e.id === (eventId.value ?? compose.value?.events[0]?.id))
  if (!ev) return
  eventId.value = ev.id
  const t = inviteTemplate(ev, props.pageName)
  form.subject = t.subject
  form.body = t.body
  template.value = 'invite_next_event'
}
const eventLabel = (e: { name: string, startDate: string | Date, timezone?: string | null }) =>
  `${new Date(e.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: e.timezone || 'Europe/Berlin' })} · ${e.name}`

const count = computed(() => preview.value?.recipients ?? 0)
const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`

const testing = ref(false)
async function sendTest() {
  const result = validate()
  if (!result.success) return
  testing.value = true
  error.value = null
  try {
    const r = await $trpc.contactUpdates.sendTest.mutate(draft.value)
    notice.value = `Test sent to ${r.to}. Check your inbox.`
    useTrack().track('contact_update_test_sent', { profile: props.username, has_event: !!eventId.value, template: template.value })
  } catch (e: any) { error.value = e?.message || 'The test didn’t go out.' }
  finally { testing.value = false }
}

const confirming = ref(false)
const sending = ref(false)
function askToSend() {
  const result = validate()
  if (!result.success) return
  if (!count.value) return
  confirming.value = true
}
async function send() {
  sending.value = true
  error.value = null
  try {
    const r = await $trpc.contactUpdates.send.mutate({ ...draft.value, expected: count.value, template: template.value })
    useTrack().track('contact_update_sent', { profile: props.username, recipients: r.sent, has_event: !!eventId.value, template: template.value, include_imported: includeImported.value })
    notice.value = r.failed ? `Sent to ${people(r.sent)}; ${r.failed} didn’t go out.` : `Sent to ${people(r.sent)}.`
    confirming.value = false
    form.subject = ''
    form.body = ''
    eventId.value = null
    template.value = null
    compose.value = await $trpc.contactUpdates.compose.query({ username: props.username })
  } catch (e: any) {
    error.value = e?.message || 'It didn’t go out.'
    confirming.value = false
    refresh()
  } finally { sending.value = false }
}
const when = (d: string | Date) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <section class="mt-4 rounded-2xl border bg-card p-4 text-sm shadow-wd-card" aria-labelledby="update-title" data-contact-update>
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 id="update-title" class="text-base font-bold">Send an update</h2>
        <p class="mt-1" data-update-audience>
          To <b>{{ label }}</b>:
          <template v-if="preview"><b>{{ people(count) }}</b> you can email<template v-if="preview.over"> (the first 2000)</template>.</template>
          <template v-else>counting…</template>
        </p>
        <p v-if="preview && (preview.cantEmail || preview.imported)" class="mt-1 text-xs text-muted-foreground">
          Left out: <template v-if="preview.cantEmail">{{ preview.cantEmail }} who can’t be emailed (unsubscribed or never asked for your emails)</template><template v-if="preview.cantEmail && preview.imported"> · </template><template v-if="preview.imported">{{ preview.imported }} from imported lists</template>.
        </p>
        <p class="mt-1 text-xs text-muted-foreground">Change who gets it with the filters (not the search box).</p>
      </div>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Close" @click="emit('close')"><X /></Button>
    </div>

    <Checkbox v-model="includeImported" class="mt-3 gap-2" data-update-imported>
      <span>Include imported lists <span class="text-muted-foreground">(HubSpot imports, wedance.vip subscribers): only the ones who said yes to your emails since</span></span>
    </Checkbox>

    <div v-if="compose?.events.length" class="mt-4 flex flex-wrap items-center gap-2">
      <select v-model="eventId" class="rounded-lg border bg-background px-2 py-1.5 text-sm" aria-label="Event to invite to" data-update-event>
        <option :value="null">No event card</option>
        <option v-for="e in compose.events" :key="e.id" :value="e.id">{{ eventLabel(e) }}</option>
      </select>
      <Button type="button" size="sm" variant="soft" data-update-template @click="useInvite"><CalendarPlus /> Invite to {{ eventId ? 'this' : 'my next' }} event</Button>
    </div>
    <p v-else-if="compose" class="mt-4 text-xs text-muted-foreground">No upcoming events yet, so no invite template. Write your own update.</p>

    <form class="mt-3 grid gap-3" novalidate @submit.prevent="askToSend">
      <Field id="update-subject" label="Subject" :error="errors.subject">
        <Input v-model="form.subject" maxlength="150" v-bind="fieldAttrs('subject', 'update-subject-error')" />
      </Field>
      <Field id="update-body" label="Your update" hint="{name} becomes each person’s first name. With an event picked, its card and an “I’m coming” button go under your words." :error="errors.body">
        <Textarea v-model="form.body" :rows="7" maxlength="5000" v-bind="fieldAttrs('body', 'update-body-error')" />
      </Field>

      <AdminState v-if="error" kind="error" :message="error" />
      <p v-if="notice" class="flex items-center gap-1 text-sm font-bold text-wd-green-700" role="status"><Check class="size-4" aria-hidden="true" /> {{ notice }}</p>

      <div v-if="!confirming" class="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" :aria-expanded="showPreview" @click="showPreview = !showPreview; refresh()"><Eye /> {{ showPreview ? 'Hide preview' : 'Preview' }}</Button>
        <Button type="button" size="sm" variant="outline" :loading="testing" @click="sendTest"><FlaskConical /> Send a test to me</Button>
        <Button type="submit" size="sm" variant="pill" :disabled="!count || loading" data-update-send><Send /> Send to {{ people(count) }}</Button>
      </div>
      <div v-else class="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3" data-update-confirm>
        <p class="font-bold">Send “{{ form.subject }}” to {{ people(count) }} now?</p>
        <p class="text-muted-foreground">It goes out at once and can’t be taken back. Each email has an unsubscribe link for {{ pageName }}.</p>
        <div class="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="pill" :loading="sending" @click="send"><Send /> Yes, send to {{ people(count) }}</Button>
          <Button type="button" size="sm" variant="ghost" @click="confirming = false">Not yet</Button>
        </div>
      </div>
    </form>

    <div v-if="showPreview && preview" class="mt-4">
      <p class="mb-1 text-xs text-muted-foreground">Subject: <b>{{ preview.subject || '(no subject)' }}</b> · as you would get it</p>
      <iframe :srcdoc="preview.html" title="Email preview" sandbox="" class="h-[28rem] w-full rounded-xl border bg-white" data-update-preview />
    </div>

    <div v-if="compose?.sends.length" class="mt-5">
      <h3 class="mb-1 flex items-center gap-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground"><History class="size-4" aria-hidden="true" /> Sent before</h3>
      <ul class="divide-y rounded-xl border" data-update-log>
        <li v-for="s in compose.sends" :key="s.id" class="p-2">
          <p class="font-bold">{{ s.subject }}</p>
          <p class="text-xs text-muted-foreground">{{ when(s.createdAt) }} · {{ s.byName || 'Someone' }} · {{ s.segmentLabel }} · {{ people(s.recipients) }}<template v-if="s.failed"> · {{ s.failed }} failed</template></p>
        </li>
      </ul>
    </div>
  </section>
</template>
