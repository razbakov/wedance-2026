<script setup lang="ts">
/**
 * "Confirm" for an artist in the line-up: how the confirmation works, their
 * personal link, and a message to paste into WhatsApp or Instagram.
 */
import { Copy, Check, Loader2, Link2, MessageCircle } from 'lucide-vue-next'
import { ARTIST_OFFERS } from '#shared/types/artistDeal'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps({
  eventId: { type: String, required: true },
  handle: { type: String, required: true },
  name: { type: String, required: true },
})

const { $trpc } = useNuxtApp()
type L = Awaited<ReturnType<typeof $trpc.artistInvites.link.mutate>>
const link = ref<L | null>(null)
const error = ref<string | null>(null)
watch(open, async (v) => {
  if (!v || link.value) return
  error.value = null
  try {
    link.value = await $trpc.artistInvites.link.mutate({ eventId: props.eventId, handle: props.handle })
    offer.value = link.value.offer
  } catch (e: any) { error.value = e?.message || 'Couldn’t make the link.' }
}, { immediate: true })

// What you offer them: saved on their link, and the message says it.
const offer = ref('')
const savingOffer = ref(false)
let offerTimer: ReturnType<typeof setTimeout> | undefined
watch(offer, (v) => {
  if (!link.value || v === link.value.offer) return
  clearTimeout(offerTimer)
  offerTimer = setTimeout(async () => {
    savingOffer.value = true
    try { link.value = await $trpc.artistInvites.link.mutate({ eventId: props.eventId, handle: props.handle, offer: v }) } catch (e: any) { error.value = e?.message || 'Couldn’t save the offer.' } finally { savingOffer.value = false }
  }, 600)
})
const addOffer = (x: string) => { offer.value = offer.value.trim() ? `${offer.value.trim()} + ${x}` : x }

// Written on the server from the event: when, where, their classes, the flyer, the link last.
const message = computed(() => link.value?.message ?? '')
const copied = ref<'link' | 'message' | null>(null)
async function copy(what: 'link' | 'message') {
  try {
    await navigator.clipboard.writeText(what === 'link' ? link.value!.url : message.value)
    copied.value = what
    setTimeout(() => (copied.value = null), 2000)
  } catch {
    error.value = 'Copy didn’t work: select the text and copy it.'
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Ask {{ name }} to confirm</DialogTitle>
        <DialogDescription>Send them the message with their link. They confirm, fix their name and photo for the flyer, and can tell you their fee.</DialogDescription>
      </DialogHeader>

      <AdminState v-if="error" kind="error" :message="error" />
      <div v-else-if="!link" class="flex justify-center py-4"><Loader2 class="size-5 animate-spin text-muted-foreground" aria-hidden="true" /></div>
      <template v-else>
        <Field :id="`confirm-offer-${handle}`" label="What you offer" optional hint="Only they see it. Empty: they name their fee.">
          <Input v-model="offer" placeholder="e.g. €80 per class + free pass" maxlength="200" />
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <Button v-for="x in ARTIST_OFFERS" :key="x" type="button" size="sm" variant="outline" @click="addOffer(x)">+ {{ x }}</Button>
          </div>
        </Field>
        <Field :id="`confirm-msg-${handle}`" :label="savingOffer ? 'Message (updating…)' : 'Message'">
          <Textarea :model-value="message" readonly :rows="5" class="text-sm" />
        </Field>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="pill" @click="copy('message')"><Check v-if="copied === 'message'" /><MessageCircle v-else /> {{ copied === 'message' ? 'Copied' : 'Copy message' }}</Button>
          <Button type="button" variant="outline-pill" @click="copy('link')"><Check v-if="copied === 'link'" /><Link2 v-else /> {{ copied === 'link' ? 'Copied' : 'Just the link' }}</Button>
        </div>
        <BusinessContactLinks :contacts="link.contacts" :managed="link.managed" :answered="link.answered" :event-id="eventId" :handle="handle" :notified-at="link.notifiedAt" />
        <details class="text-sm text-muted-foreground">
          <summary class="cursor-pointer font-medium text-foreground">What they’ll see</summary>
          <ul class="mt-2 grid list-disc gap-1 pl-5">
            <li>Their classes and slots at {{ link.eventName || 'your event' }}: they say if they’re in.</li>
            <li>Your offer: they can answer with their own fee.</li>
            <li>The flyer: they fix their name and pick the photo. Their WeDance page changes only once they make it theirs.</li>
            <li v-if="!link.managed">No one runs their page yet: they can sign up and make it theirs.</li>
          </ul>
        </details>
      </template>
    </DialogContent>
  </Dialog>
</template>
