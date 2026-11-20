<script setup lang="ts">
/**
 * The event editor's Publish step (RAZ-1026). While the event is a draft, one
 * big button saves and publishes. A dialog then confirms the setup is finished:
 * dancers can see it now, with the event's link. Once it's live, the step shows
 * that link and the button is gone.
 */
import { Rocket, ExternalLink, Copy, Check } from 'lucide-vue-next'

const props = defineProps({
  /** Saved state: the button shows only while this is false. */
  published: { type: Boolean, required: true },
  saving: { type: Boolean, default: false },
  /** The step's own line, from the steps list. */
  hint: { type: String, default: 'Put it on WeDance when you’re ready.' },
  /** Absolute public URL. Shown once the event is live. */
  url: { type: String, default: '' },
  /** The form still has edits; publishing saves them too. */
  dirty: { type: Boolean, default: false },
  /** The event's name, in the confirmation. */
  name: { type: String, default: '' },
})
const confirm = defineModel<boolean>('confirm', { default: false })
const emit = defineEmits<{ publish: [] }>()

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  if (!props.url) return
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch { /* the link stays on screen to copy by hand */ }
}
onBeforeUnmount(() => clearTimeout(copiedTimer))
const shortUrl = computed(() => props.url.replace(/^https?:\/\//, ''))
</script>

<template>
  <div
    id="ev-step-publish"
    class="scroll-mt-20 rounded-xl p-4"
    :class="published ? 'bg-success/10' : 'bg-primary/5'"
    data-testid="event-publish-step"
  >
    <template v-if="!published">
      <p class="text-sm text-muted-foreground">{{ hint }} Only you can see it until then.</p>
      <Button
        type="button"
        variant="cta"
        size="lg"
        class="mt-4 h-14 w-full px-10 text-base sm:w-auto sm:min-w-72"
        :loading="saving"
        data-testid="event-publish"
        aria-label="Publish this event"
        @click="emit('publish')"
      ><Rocket /> Publish</Button>
      <p v-if="dirty" class="mt-2 text-xs text-muted-foreground">Your unsaved changes are saved with it.</p>
    </template>
    <template v-else>
      <p class="text-sm font-bold text-wd-green-700">Dancers can see it now.</p>
      <div v-if="url" class="mt-2 flex min-w-0 items-center gap-2">
        <a :href="url" target="_blank" rel="noopener" class="min-w-0 break-words text-sm font-bold underline-offset-2 hover:underline" data-testid="event-publish-link">{{ shortUrl }}</a>
        <Button type="button" variant="ghost" size="icon-sm" :aria-label="copied ? 'Link copied' : 'Copy the link'" @click="copy">
          <component :is="copied ? Check : Copy" aria-hidden="true" />
        </Button>
      </div>
      <Button v-if="url" variant="outline-pill" size="pill-sm" class="mt-3" as-child>
        <a :href="url" target="_blank" rel="noopener"><ExternalLink /> Open the event</a>
      </Button>
    </template>
  </div>

  <Dialog v-model:open="confirm">
    <DialogContent class="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md" data-testid="event-published-dialog">
      <DialogHeader class="text-left">
        <DialogTitle class="font-display text-2xl font-bold">Published</DialogTitle>
        <DialogDescription class="text-base text-foreground">
          <template v-if="name">Dancers can see <span class="font-bold">{{ name }}</span> now.</template>
          <template v-else>Dancers can see it now.</template>
        </DialogDescription>
      </DialogHeader>
      <div v-if="url">
        <p class="text-xs font-bold uppercase tracking-wider text-secondary">The event’s link</p>
        <div class="mt-1.5 flex min-w-0 items-center gap-2 rounded-xl bg-muted px-3 py-2">
          <a :href="url" target="_blank" rel="noopener" class="min-w-0 flex-1 break-words text-sm font-bold underline-offset-2 hover:underline">{{ url }}</a>
          <Button type="button" variant="ghost" size="icon-sm" :aria-label="copied ? 'Link copied' : 'Copy the link'" @click="copy">
            <component :is="copied ? Check : Copy" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <DialogFooter class="gap-2 sm:gap-2">
        <DialogClose as-child>
          <Button type="button" variant="outline">Done</Button>
        </DialogClose>
        <Button v-if="url" variant="cta" as-child>
          <a :href="url" target="_blank" rel="noopener"><ExternalLink /> Open the event</a>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
