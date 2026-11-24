<script setup lang="ts">
/**
 * Email the contacts the Contacts list shows (RAZ-975 / RAZ-960): write, or start from
 * "Invite to <event>" (an event card with a "Book my spot" button), preview, send a test
 * to yourself, send. Only contacts the page may email get it — the rest are counted and
 * left out. Data: contactMailing.options / eventCard / sendTest / send.
 */
import { Mail, Send, Eye, PencilLine, FlaskConical, Check, History } from 'lucide-vue-next'
import { ContactMailingSchema } from '#shared/validation'
import { FIRST_NAME_TOKEN, inviteTemplate, mailingRecipients, renderMailingHtml, type MailableContact, type MailingEventCard } from '#shared/utils/contactMailing'
import { mailingStatsLine } from '#shared/utils/mailingTracking'

const props = defineProps<{
  username: string
  /** The contacts the list shows now. */
  contacts: MailableContact[]
  /** The filter in words ("" = everyone) and as data, for the send log. */
  segment: string
  filter: Record<string, unknown>
  /** The list's event filter, preselected as the invite when it's still to come. */
  eventId?: string | null
}>()

const { $trpc } = useNuxtApp()
const { track } = useTrack()
const open = ref(false)

const to = computed(() => mailingRecipients(props.contacts))
const skipped = computed(() => props.contacts.length - to.value.length)

type Options = Awaited<ReturnType<typeof $trpc.contactMailing.options.query>>
const opts = ref<Options | null>(null)
const error = ref<string | null>(null)

const form = reactive({ subject: '', body: '' })
const { errors, validate, fieldAttrs } = useFormValidation(ContactMailingSchema, form)
const eventId = ref<string | null>(null)
const card = ref<MailingEventCard | null>(null)
const mode = ref<'write' | 'preview'>('write')
const testTo = ref<string | null>(null)
const testing = ref(false)
const confirming = ref(false)
const sending = ref(false)
const result = ref<{ recipients: number; sent: number; failed: number } | null>(null)
// The text the last template wrote: picking another event replaces it only while it's untouched.
let lastTemplate = { subject: '', body: '' }

async function start() {
  open.value = true
  result.value = null
  confirming.value = false
  testTo.value = null
  error.value = null
  mode.value = 'write'
  try {
    opts.value = await $trpc.contactMailing.options.query({ username: props.username })
    if (!form.body && props.eventId && opts.value.events.some(e => e.id === props.eventId)) pickEvent(props.eventId)
  } catch (e: any) { error.value = e?.message || 'Couldn’t open the email.' }
}

function pickEvent(id: string | null) {
  eventId.value = id
  card.value = null
  const ev = opts.value?.events.find(e => e.id === id)
  const untouched = (!form.subject && !form.body) || (form.subject === lastTemplate.subject && form.body === lastTemplate.body)
  if (ev && untouched) {
    lastTemplate = inviteTemplate(ev, opts.value!.profile.name)
    Object.assign(form, lastTemplate)
  }
  if (id) $trpc.contactMailing.eventCard.query({ username: props.username, eventId: id }).then((c) => { if (eventId.value === id) card.value = c }).catch(() => {})
}

const previewHtml = computed(() => renderMailingHtml(
  { profileName: opts.value?.profile.name ?? '', subject: form.subject, body: form.body || '…', event: card.value, pageUrl: opts.value?.pageUrl },
  { name: to.value[0]?.name ?? null },
))

async function sendTest() {
  const r = validate()
  if (!r.success) { mode.value = 'write'; return }
  testing.value = true
  error.value = null
  try {
    testTo.value = (await $trpc.contactMailing.sendTest.mutate({ username: props.username, ...r.data, eventId: eventId.value })).to
  } catch (e: any) { error.value = e?.message || 'The test didn’t go out.' } finally { testing.value = false }
}

function askToSend() {
  const r = validate()
  if (!r.success) { mode.value = 'write'; return }
  confirming.value = true
}

async function send() {
  const r = validate()
  if (!r.success) { confirming.value = false; mode.value = 'write'; return }
  sending.value = true
  error.value = null
  try {
    result.value = await $trpc.contactMailing.send.mutate({
      username: props.username, ...r.data, eventId: eventId.value,
      contactIds: to.value.map(c => c.id), segment: props.segment, filter: props.filter,
    })
    track('contacts_emailed', { recipients: result.value.recipients, has_event: !!eventId.value, filtered: !!props.segment, tested: !!testTo.value, profile: props.username })
    Object.assign(form, { subject: '', body: '' })
    eventId.value = null
    card.value = null
    lastTemplate = { subject: '', body: '' }
  } catch (e: any) { error.value = e?.message || 'It didn’t go out.' } finally { sending.value = false; confirming.value = false }
}

const sentWhen = (d: Date | string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <Button variant="cta" size="pill-sm" :disabled="!to.length" data-contacts-email @click="start"><Mail /> Email {{ to.length }}</Button>
  <Dialog v-model:open="open">
    <DialogScrollContent class="sm:max-w-2xl">
      <DialogHeader class="text-left">
        <DialogTitle>Email {{ to.length }} {{ to.length === 1 ? 'person' : 'people' }}</DialogTitle>
        <DialogDescription>
          {{ segment ? `Your contacts shown now: ${segment}.` : 'Everyone in your contacts who can be emailed.' }}
          <template v-if="skipped"> {{ skipped }} more in this list can’t be emailed — they never signed up for your emails or unsubscribed — and won’t get it.</template>
        </DialogDescription>
      </DialogHeader>

      <AdminState v-if="!opts && !error" kind="loading" />
      <div v-else-if="result" class="grid gap-3 py-2" data-mailing-sent>
        <p class="flex items-center gap-2 font-bold"><Check class="size-5 text-green-700" aria-hidden="true" /> Sent to {{ result.sent }} {{ result.sent === 1 ? 'person' : 'people' }}.</p>
        <p v-if="result.failed" class="text-sm text-destructive">{{ result.failed }} didn’t go out. Try again later with a new subject.</p>
        <p class="text-sm text-muted-foreground">Replies go to {{ opts?.myEmail || 'your email' }}. Anyone who unsubscribes shows as “Unsubscribed” in your contacts.</p>
        <div><Button type="button" variant="ghost" size="sm" @click="open = false">Done</Button></div>
      </div>
      <form v-else-if="opts" class="grid gap-4" novalidate data-mailing-form @submit.prevent="askToSend">
        <Field id="mailing-event" label="Invite to an event" optional :hint="opts.events.length ? 'Adds the event with a “Book my spot” button, and writes an invite you can change.' : 'No published events coming up.'">
          <select id="mailing-event" :value="eventId ?? ''" class="w-full rounded-lg border bg-background px-3 py-2 text-sm" :disabled="!opts.events.length" @change="pickEvent(($event.target as HTMLSelectElement).value || null)">
            <option value="">No event</option>
            <option v-for="e in opts.events" :key="e.id" :value="e.id">{{ e.when.split(' · ')[0] }} · {{ e.name }}</option>
          </select>
        </Field>

        <div class="flex gap-1" role="tablist">
          <Button type="button" size="sm" :variant="mode === 'write' ? 'secondary' : 'ghost'" role="tab" :aria-selected="mode === 'write'" @click="mode = 'write'"><PencilLine /> Write</Button>
          <Button type="button" size="sm" :variant="mode === 'preview' ? 'secondary' : 'ghost'" role="tab" :aria-selected="mode === 'preview'" data-mailing-preview-tab @click="mode = 'preview'"><Eye /> Preview</Button>
        </div>

        <template v-if="mode === 'write'">
          <Field id="mailing-subject" label="Subject" :error="errors.subject">
            <Input v-model="form.subject" maxlength="150" v-bind="fieldAttrs('subject', 'mailing-subject-error')" />
          </Field>
          <Field id="mailing-body" label="Message" :hint="`${FIRST_NAME_TOKEN} becomes each person’s first name. Links work as they are.`" :error="errors.body">
            <Textarea v-model="form.body" :rows="9" maxlength="5000" v-bind="fieldAttrs('body', 'mailing-body-error')" />
          </Field>
        </template>
        <div v-else class="rounded-xl border bg-white text-black" data-mailing-preview>
          <p class="border-b px-4 py-2 text-sm"><b>{{ opts.profile.name }}</b> · {{ form.subject.split(FIRST_NAME_TOKEN).join(to[0]?.name?.split(' ')[0] || 'there') || 'No subject yet' }}</p>
          <!-- eslint-disable-next-line vue/no-v-html -- built by renderMailingHtml, every value escaped -->
          <div v-html="previewHtml" />
        </div>

        <AdminState v-if="error" kind="error" :message="error" />
        <p v-if="testTo" class="text-sm text-muted-foreground" data-mailing-test-sent>Test sent to {{ testTo }}.</p>

        <div v-if="confirming" class="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p class="text-sm font-bold">Send “{{ form.subject }}” to {{ to.length }} {{ to.length === 1 ? 'person' : 'people' }} now? It can’t be taken back.</p>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="cta" size="sm" :loading="sending" data-mailing-confirm @click="send"><Send /> Yes, send to {{ to.length }}</Button>
            <Button type="button" variant="ghost" size="sm" :disabled="sending" @click="confirming = false">Not yet</Button>
          </div>
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <Button type="submit" variant="cta" size="sm" data-mailing-send><Send /> Send to {{ to.length }}</Button>
          <Button type="button" variant="outline" size="sm" :loading="testing" @click="sendTest"><FlaskConical /> Send me a test</Button>
        </div>
      </form>

      <details v-if="opts?.sends.length" class="mt-2 text-sm">
        <summary class="cursor-pointer text-muted-foreground"><History class="mr-1 inline size-4" aria-hidden="true" /> Sent before ({{ opts.sends.length }})</summary>
        <ul class="mt-2 divide-y">
          <li v-for="s in opts.sends" :key="s.id" class="py-2">
            <p class="font-bold">{{ s.subject }}</p>
            <p class="text-muted-foreground">{{ sentWhen(s.createdAt) }} · {{ s.sent }} of {{ s.recipients }} sent<template v-if="s.byName"> · by {{ s.byName }}</template><template v-if="s.segment"> · {{ s.segment }}</template></p>
            <p v-if="s.stats" class="text-muted-foreground" data-testid="mailing-stats">{{ mailingStatsLine(s.stats) }}</p>
          </li>
        </ul>
      </details>
    </DialogScrollContent>
  </Dialog>
</template>
