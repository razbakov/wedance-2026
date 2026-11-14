<script setup lang="ts">
/**
 * "My dance year" Instagram story (RAZ-897) — the picture drawn on a canvas
 * (`~/lib/yearStory`), "Share to story" through the phone's share sheet (the
 * link copied first, for the link sticker), "Save picture", "Copy link", and
 * the sharer's own line. The link opens their year page (/my-year?user=…).
 * Same panel as the weekend story (`WeekendStory.vue`). Shown in
 * `ShareYearPlanModal`.
 */
import { Check, Copy, Download, Instagram, Loader2, Shuffle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { drawYearStory } from '~/lib/yearStory'
import { STORY_LINE_MAX, cleanStoryLine } from '#shared/utils/storyLines'
import { pickYearLine, yearOfPlan, yearStoryLinkText, type YearStoryFestival } from '#shared/utils/yearStory'

const props = defineProps<{
  festivals: YearStoryFestival[]
  sharerName: string
  /** The year page link the story leads to. */
  url: string
  /** Where it is shown, for analytics. */
  surface: string
}>()

const { track } = useTrack()

const storyBlob = ref<Blob | null>(null)
const storyUrl = ref('')
const making = ref(false)
const copied = ref(false)
const canShareFiles = ref(false)
const year = computed(() => yearOfPlan(props.festivals, new Date().getFullYear()))

const storyLine = ref('')
const lineIsOwn = ref(false)
function shuffleLine() {
  storyLine.value = pickYearLine(storyLine.value)
  lineIsOwn.value = false
}
let redraw = false

async function makeStory() {
  if (making.value) { redraw = true; return }
  if (!props.festivals.length) return
  if (!storyLine.value && !lineIsOwn.value) storyLine.value = pickYearLine()
  making.value = true
  try {
    storyBlob.value = await drawYearStory({
      sharerName: props.sharerName,
      year: year.value,
      line: cleanStoryLine(storyLine.value),
      festivals: props.festivals,
      link: yearStoryLinkText(props.url),
    })
    if (storyUrl.value) URL.revokeObjectURL(storyUrl.value)
    storyUrl.value = URL.createObjectURL(storyBlob.value)
    const file = new File([storyBlob.value], 'wedance-year.png', { type: 'image/png' })
    canShareFiles.value = !!navigator.canShare?.({ files: [file] })
  } catch (e) {
    console.warn('[year] story failed', e)
  } finally {
    making.value = false
    if (redraw) { redraw = false; makeStory() }
  }
}
onMounted(makeStory)
watch(
  () => [props.url, props.sharerName, props.festivals.map(f => `${f.name}@${f.startDate}`).join(',')].join('|'),
  () => makeStory(),
)
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
  track('year_story_shared', { method, festivals: props.festivals.length, own_line: lineIsOwn.value, surface: props.surface })
}

async function copyLink(silent = false) {
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
    if (!silent) shared('copy')
  } catch { /* no clipboard */ }
}

async function shareStory() {
  if (!storyBlob.value) return
  // The link goes on the clipboard first: Instagram's link sticker pastes it.
  await copyLink(true)
  const file = new File([storyBlob.value], 'wedance-year.png', { type: 'image/png' })
  try {
    await navigator.share({ files: [file] })
    shared('native')
  } catch { /* cancelled */ }
}

function downloadStory() {
  if (!storyUrl.value) return
  const a = document.createElement('a')
  a.href = storyUrl.value
  a.download = 'wedance-year.png'
  a.click()
  copyLink(true)
  shared('download')
}
</script>

<template>
  <section class="rounded-2xl border bg-card p-4" data-testid="year-story">
    <div class="flex items-start gap-4">
      <div class="w-28 shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-muted grid place-items-center">
        <img v-if="storyUrl" :src="storyUrl" alt="Your dance year as an Instagram story" class="w-full h-full object-cover" data-testid="year-story-preview">
        <Loader2 v-else class="size-5 animate-spin text-muted-foreground" aria-label="Making your story" />
      </div>
      <div class="min-w-0 font-sans">
        <h2 class="text-lg font-bold font-display">Post it as a story</h2>
        <ol class="mt-1 text-sm text-muted-foreground list-decimal pl-4 space-y-0.5">
          <li>Share the picture to your Instagram story.</li>
          <li>Add a <b>Link</b> sticker and paste — the link is already copied.</li>
          <li>Friends tap it and see your whole year.</li>
        </ol>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button v-if="canShareFiles" size="sm" :disabled="!storyBlob" data-testid="year-share-story" @click="shareStory">
            <Instagram class="size-4" /> Share to story
          </Button>
          <Button size="sm" :variant="canShareFiles ? 'outline' : 'default'" :disabled="!storyBlob" data-testid="year-download-story" @click="downloadStory">
            <Download class="size-4" /> Save picture
          </Button>
          <Button size="sm" variant="outline" data-testid="year-copy-link" @click="copyLink()">
            <Check v-if="copied" class="size-4" /><Copy v-else class="size-4" /> {{ copied ? 'Link copied' : 'Copy link' }}
          </Button>
        </div>
      </div>
    </div>
    <div class="mt-4 font-sans" data-testid="year-line">
      <label :for="`year-line-${surface}`" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your line</label>
      <div class="mt-1 flex gap-2">
        <input
          :id="`year-line-${surface}`"
          v-model="storyLine"
          type="text"
          :maxlength="STORY_LINE_MAX"
          placeholder="Which one are you coming to?"
          class="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-background"
          data-testid="year-line-input"
          @input="lineIsOwn = true"
        >
        <Button type="button" size="sm" variant="outline" title="Another line" data-testid="year-line-shuffle" @click="shuffleLine">
          <Shuffle class="size-4" /> Another
        </Button>
      </div>
      <p class="mt-1 text-xs text-muted-foreground">Write your own — a question gets the most replies.</p>
    </div>
    <slot />
  </section>
</template>
