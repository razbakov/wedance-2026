<script setup lang="ts">
/**
 * The "Come dance with me" Instagram story (#527) — the picture drawn on a
 * canvas (`~/lib/weekendStory`), "Share to story" through the phone's share
 * sheet (the link copied first, for the link sticker), "Save picture", "Copy
 * link", and the sharer's own line. Used on /w/<code> and, in place, under
 * "Where you're dancing" on My plan (RAZ-895).
 */
import { Check, Copy, Download, Instagram, Loader2, Shuffle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { drawWeekendStory } from '~/lib/weekendStory'
import { storyParties } from '#shared/utils/weekendShare'
import { STORY_LINE_MAX, cleanStoryLine, pickStoryLine } from '#shared/utils/storyLines'
import type { WeekendView } from '~~/server/trpc/routers/weekend'

const props = defineProps<{
  plan: WeekendView
  /** Where it is shown, for analytics: `weekend-page` · `my_plan`. */
  surface: string
}>()

const { track } = useTrack()

const storyBlob = ref<Blob | null>(null)
const storyUrl = ref('')
const making = ref(false)
const copied = ref(false)
const canShareFiles = ref(false)
const parties = computed(() => storyParties(props.plan.events))

// The line under the headline: one of ours for the first party's style, shuffled or rewritten by the sharer.
const storyLine = ref('')
const lineIsOwn = ref(false)
function shuffleLine() {
  storyLine.value = pickStoryLine(parties.value, storyLine.value)
  lineIsOwn.value = false
}
/** A change while a story is being drawn: draw again once it's done. */
let redraw = false

async function makeStory() {
  if (making.value) { redraw = true; return }
  if (!storyLine.value && !lineIsOwn.value) storyLine.value = pickStoryLine(parties.value)
  making.value = true
  try {
    storyBlob.value = await drawWeekendStory({
      sharerName: props.plan.sharer.name,
      line: cleanStoryLine(storyLine.value),
      parties: parties.value,
      link: props.plan.url,
    })
    if (storyUrl.value) URL.revokeObjectURL(storyUrl.value)
    storyUrl.value = URL.createObjectURL(storyBlob.value)
    const file = new File([storyBlob.value], 'wedance-weekend.png', { type: 'image/png' })
    canShareFiles.value = !!navigator.canShare?.({ files: [file] })
  } catch (e) {
    console.warn('[weekend] story failed', e)
  } finally {
    making.value = false
    if (redraw) { redraw = false; makeStory() }
  }
}
onMounted(makeStory)
// A new link or other parties (My plan changed): draw again.
watch(() => [props.plan.url, parties.value.map(p => p.id).join(',')].join('|'), () => makeStory())
let lineTimer: ReturnType<typeof setTimeout> | undefined
watch(storyLine, () => {
  if (!storyBlob.value) return
  clearTimeout(lineTimer)
  lineTimer = setTimeout(makeStory, 350)
})
onBeforeUnmount(() => {
  clearTimeout(lineTimer)
  if (storyUrl.value) URL.revokeObjectURL(storyUrl.value)
})

function shared(method: 'native' | 'download' | 'copy') {
  track('weekend_story_shared', { method, parties: props.plan.events.length, own_line: lineIsOwn.value, surface: props.surface })
}

async function copyLink(silent = false) {
  try {
    await navigator.clipboard.writeText(props.plan.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
    if (!silent) shared('copy')
  } catch { /* no clipboard */ }
}

async function shareStory() {
  if (!storyBlob.value) return
  // The link goes on the clipboard first: Instagram's link sticker pastes it.
  await copyLink(true)
  const file = new File([storyBlob.value], 'wedance-weekend.png', { type: 'image/png' })
  try {
    await navigator.share({ files: [file] })
    shared('native')
  } catch { /* cancelled */ }
}

function downloadStory() {
  if (!storyUrl.value) return
  const a = document.createElement('a')
  a.href = storyUrl.value
  a.download = 'wedance-weekend.png'
  a.click()
  copyLink(true)
  shared('download')
}
</script>

<template>
  <section class="rounded-2xl border bg-card p-4" data-testid="weekend-story">
    <div class="flex items-start gap-4">
      <div class="w-28 shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-muted grid place-items-center">
        <img v-if="storyUrl" :src="storyUrl" alt="Your Instagram story" class="w-full h-full object-cover" data-testid="weekend-story-preview">
        <Loader2 v-else class="size-5 animate-spin text-muted-foreground" aria-label="Making your story" />
      </div>
      <div class="min-w-0 font-sans">
        <h2 class="text-lg font-bold font-display">Post it as a story</h2>
        <ol class="mt-1 text-sm text-muted-foreground list-decimal pl-4 space-y-0.5">
          <li>Share the picture to your Instagram story.</li>
          <li>Add a <b>Link</b> sticker and paste — the link is already copied.</li>
          <li>We email you when a friend taps “I’m in”.</li>
        </ol>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button v-if="canShareFiles" size="sm" :disabled="!storyBlob" data-testid="weekend-share-story" @click="shareStory">
            <Instagram class="size-4" /> Share to story
          </Button>
          <Button size="sm" :variant="canShareFiles ? 'outline' : 'default'" :disabled="!storyBlob" data-testid="weekend-download-story" @click="downloadStory">
            <Download class="size-4" /> Save picture
          </Button>
          <Button size="sm" variant="outline" data-testid="weekend-copy-link" @click="copyLink()">
            <Check v-if="copied" class="size-4" /><Copy v-else class="size-4" /> {{ copied ? 'Link copied' : 'Copy link' }}
          </Button>
        </div>
      </div>
    </div>
    <div class="mt-4 font-sans" data-testid="weekend-line">
      <label :for="`weekend-line-${surface}`" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your line</label>
      <div class="mt-1 flex gap-2">
        <input
          :id="`weekend-line-${surface}`"
          v-model="storyLine"
          type="text"
          :maxlength="STORY_LINE_MAX"
          :placeholder="parties[0]?.venueName ? `Who’s coming to ${parties[0].venueName}?` : `Who’s coming?`"
          class="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-background"
          data-testid="weekend-line-input"
          @input="lineIsOwn = true"
        >
        <Button type="button" size="sm" variant="outline" title="Another line" data-testid="weekend-line-shuffle" @click="shuffleLine">
          <Shuffle class="size-4" /> Another
        </Button>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">Write your own — a question gets the most replies.</p>
    </div>
    <p v-if="plan.isOwner" class="mt-3 text-sm font-sans" data-testid="weekend-friends">
      <template v-if="plan.friends">🎉 <b>{{ plan.friends }} friend{{ plan.friends === 1 ? '' : 's' }}</b> joined so far.</template>
      <template v-else>No one has joined yet — post the story and see who comes.</template>
    </p>
    <slot />
  </section>
</template>
