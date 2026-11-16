<script setup lang="ts">
/**
 * Your year in dance (RAZ-966): the look back at a dancer's year as a story
 * they step through (tap / arrow keys, Wrapped style) and post at New Year.
 * Every screen is a 1080×1920 picture (`~/lib/yearReviewStory`), so what they
 * see is what they share: "Share" sends the current one (or all of them)
 * through the phone's share sheet, "Save" downloads it. The last screen turns
 * to next year: celebrate first, then plan (`plan-next` emit → My plan's
 * "Your festivals", or /festivals).
 */
import { ChevronLeft, ChevronRight, Download, Images, Loader2, Share2, Sparkles } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { drawYearReviewScreen } from '~/lib/yearReviewStory'
import { screenText, type YearReview } from '#shared/utils/yearReview'

const props = defineProps<{
  review: YearReview | null
  loading?: boolean
  signedIn: boolean
}>()

const emit = defineEmits<{
  (e: 'sign-in'): void
  (e: 'plan-next'): void
}>()

const { track, trackOnce } = useTrack()

const index = ref(0)
const pictures = ref<Array<{ blob: Blob; url: string } | null>>([])
const canShareFiles = ref(false)
const canShareMany = ref(false)

const screens = computed(() => props.review?.screens ?? [])
const current = computed(() => screens.value[index.value] ?? null)
const isLast = computed(() => index.value === screens.value.length - 1)
const hasYear = computed(() => (props.review?.nights ?? 0) > 0)
const alt = computed(() => current.value && props.review ? screenText(current.value, props.review.year) : '')

function fileName(i: number) {
  return `wedance-${props.review?.year ?? 'year'}-${i + 1}.png`
}

function freePictures() {
  for (const p of pictures.value) if (p) URL.revokeObjectURL(p.url)
  pictures.value = []
}

let drawing = 0
async function drawAll() {
  const review = props.review
  freePictures()
  index.value = 0
  if (!review || !hasYear.value) return
  const run = ++drawing
  pictures.value = review.screens.map(() => null)
  // The one on screen first, then the rest.
  for (let i = 0; i < review.screens.length; i++) {
    try {
      const blob = await drawYearReviewScreen(review, i)
      if (run !== drawing) return
      pictures.value[i] = { blob, url: URL.createObjectURL(blob) }
    } catch (e) {
      console.warn('[year review] picture failed', e)
    }
  }
  const files = pictures.value.filter(Boolean).map((p, i) => new File([p!.blob], fileName(i), { type: 'image/png' }))
  canShareFiles.value = !!files[0] && !!navigator.canShare?.({ files: [files[0]] })
  canShareMany.value = files.length > 1 && !!navigator.canShare?.({ files })
}

watch(() => props.review, (r) => {
  drawAll()
  if (r) trackOnce(`year-review-${r.year}`, 'year_review_viewed', { year: r.year, nights: r.nights, screens: r.screens.length, festivals: r.festivals })
}, { immediate: true })
onBeforeUnmount(() => { drawing++; freePictures() })

function go(delta: number) {
  const next = index.value + delta
  if (next < 0 || next >= screens.value.length) return
  index.value = next
}

function onTap(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const x = e.clientX - el.getBoundingClientRect().left
  go(x < el.clientWidth / 3 ? -1 : 1)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') { go(1); e.preventDefault() }
  if (e.key === 'ArrowLeft') { go(-1); e.preventDefault() }
}

function shared(method: 'native' | 'download', count: number) {
  track('year_review_shared', { method, screens: count, screen: current.value?.kind ?? null, year: props.review?.year ?? null })
}

async function share(all: boolean) {
  const list = all ? pictures.value : [pictures.value[index.value]]
  const files = list.map((p, i) => p && new File([p.blob], fileName(all ? i : index.value), { type: 'image/png' })).filter(Boolean) as File[]
  if (!files.length) return
  try {
    await navigator.share({ files, text: props.review && current.value && !all ? screenText(current.value, props.review.year) : undefined })
    shared('native', files.length)
  } catch { /* cancelled */ }
}

function save(all: boolean) {
  const which = all ? pictures.value.map((p, i) => [p, i] as const) : [[pictures.value[index.value], index.value] as const]
  let n = 0
  for (const [p, i] of which) {
    if (!p) continue
    const a = document.createElement('a')
    a.href = p.url
    a.download = fileName(i)
    a.click()
    n++
  }
  if (n) shared('download', n)
}

function planNext(to: 'plan' | 'festivals') {
  track('year_review_plan_clicked', { to, year: props.review?.year ?? null, nights: props.review?.nights ?? 0 })
  if (to === 'plan') emit('plan-next')
  else navigateTo('/festivals')
}
</script>

<template>
  <section class="max-w-3xl mx-auto px-4 pt-6 pb-10" data-testid="year-review" aria-labelledby="year-review-title">
    <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Look back</p>
    <h1 id="year-review-title" class="text-2xl sm:text-3xl leading-tight font-display text-foreground">
      Your {{ review?.year ?? 'year' }} in dance
    </h1>

    <!-- Signed out -->
    <div v-if="!signedIn" class="mt-4 rounded-2xl border bg-card p-6 font-sans" data-testid="year-review-signed-out">
      <p class="text-muted-foreground">Sign in to see the story of your year: the nights you were going to, your style, your home floor, your festivals.</p>
      <Button class="mt-4" @click="emit('sign-in')">Sign in</Button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading || !review" class="mt-4 mx-auto w-full max-w-[360px] aspect-[9/16] rounded-3xl bg-muted animate-pulse" aria-busy="true">
      <span class="sr-only" role="status">Loading your year…</span>
    </div>

    <!-- Nothing to look back at yet -->
    <div v-else-if="!hasYear" class="mt-4 rounded-2xl border bg-card p-6 font-sans" data-testid="year-review-empty">
      <p class="font-bold text-foreground">Nothing to look back at for {{ review.year }} yet.</p>
      <p class="mt-1 text-muted-foreground">
        Your story builds itself: tap <b>+ My plan</b> on nights out, answer event polls, add festivals to your plan.
        Next New Year you’ll have a year to celebrate.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <Button data-testid="year-review-plan" @click="planNext('plan')"><Sparkles class="size-4" /> Plan {{ review.year + 1 }}</Button>
        <Button variant="outline" @click="planNext('festivals')">Find festivals</Button>
      </div>
    </div>

    <!-- The story -->
    <div v-else class="mt-4 flex flex-col items-center gap-4">
      <div
        class="relative w-full max-w-[360px] aspect-[9/16] rounded-3xl overflow-hidden bg-muted shadow-lg select-none cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-ring"
        role="group"
        aria-roledescription="story"
        :aria-label="`Screen ${index + 1} of ${screens.length}. Tap or use the arrow keys.`"
        tabindex="0"
        data-testid="year-review-player"
        @click="onTap"
        @keydown="onKey"
      >
        <img v-if="pictures[index]" :src="pictures[index]!.url" :alt="alt" class="absolute inset-0 w-full h-full object-cover" data-testid="year-review-picture">
        <div v-else class="absolute inset-0 grid place-items-center">
          <Loader2 class="size-6 animate-spin text-muted-foreground" aria-label="Drawing your story" />
        </div>
        <!-- Progress, like a story -->
        <div class="absolute top-2 inset-x-2 flex gap-1" aria-hidden="true">
          <span
            v-for="(s, i) in screens"
            :key="i"
            class="h-1 flex-1 rounded-full"
            :class="i <= index ? 'bg-white' : 'bg-white/40'"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 font-sans">
        <Button variant="outline" size="icon" :disabled="index === 0" aria-label="Previous" data-testid="year-review-prev" @click="go(-1)">
          <ChevronLeft class="size-4" />
        </Button>
        <span class="text-sm text-muted-foreground tabular-nums w-14 text-center" data-testid="year-review-count">{{ index + 1 }} / {{ screens.length }}</span>
        <Button variant="outline" size="icon" :disabled="isLast" aria-label="Next" data-testid="year-review-next" @click="go(1)">
          <ChevronRight class="size-4" />
        </Button>
      </div>

      <div class="flex flex-wrap justify-center gap-2 font-sans">
        <Button v-if="canShareFiles" size="sm" :disabled="!pictures[index]" data-testid="year-review-share" @click="share(false)">
          <Share2 class="size-4" /> Share this one
        </Button>
        <Button v-if="canShareMany" size="sm" variant="outline" data-testid="year-review-share-all" @click="share(true)">
          <Images class="size-4" /> Share all {{ screens.length }}
        </Button>
        <Button size="sm" :variant="canShareFiles ? 'outline' : 'default'" :disabled="!pictures[index]" data-testid="year-review-save" @click="save(false)">
          <Download class="size-4" /> Save picture
        </Button>
        <Button v-if="!canShareMany && screens.length > 1" size="sm" variant="outline" data-testid="year-review-save-all" @click="save(true)">
          <Images class="size-4" /> Save all {{ screens.length }}
        </Button>
      </div>

      <div v-if="isLast" class="w-full max-w-[360px] rounded-2xl border bg-card p-4 font-sans text-center" data-testid="year-review-next-step">
        <p class="font-bold text-foreground">Celebrated? Now {{ review.year + 1 }}.</p>
        <p class="mt-1 text-sm text-muted-foreground">Pick the festivals and nights you don’t want to miss.</p>
        <div class="mt-3 flex flex-wrap justify-center gap-2">
          <Button data-testid="year-review-plan" @click="planNext('plan')"><Sparkles class="size-4" /> Plan {{ review.year + 1 }}</Button>
          <Button variant="outline" @click="planNext('festivals')">Find festivals</Button>
        </div>
      </div>
    </div>
  </section>
</template>
