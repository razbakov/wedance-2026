<script setup lang="ts">
/**
 * Video of the Day — pairwise vote widget.
 *
 * Shows two approved videos; tap one to vote. On vote we record it and load the
 * next pair, keeping the "keep voting" flow going until the session has seen
 * every distinct pair (or hits the per-session cap). Anti-gaming is handled
 * server-side via the `wd_vote_sid` cookie — this widget just calls getPair /
 * vote. Client-only fetch (relative tRPC URL throws under SSR).
 */
import { Play, Check } from 'lucide-vue-next'
import { parseVideoUrl } from '~/lib/videoEmbed'

const props = defineProps<{
  citySlug: string
  accent?: string
}>()

const { $trpc } = useNuxtApp()
const accent = computed(() => props.accent ?? '#dc2626')

interface Vid {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string | null
  danceStyle: string | null
}

const pair = ref<readonly [Vid, Vid] | null>(null)
const poolSize = ref(0)
const loading = ref(true)
const voting = ref(false)
const votesCast = ref(0)
const done = ref(false)        // exhausted all pairs
const capped = ref(false)      // hit per-session cap
const notEnough = ref(false)   // fewer than 2 videos
const activeEmbed = ref<string | null>(null) // id of the video expanded to a live embed

function embedFor(v: Vid) {
  return parseVideoUrl(v.videoUrl)
}

async function loadPair() {
  loading.value = true
  activeEmbed.value = null
  try {
    const res = await $trpc.cityVideo.getPair.query({ citySlug: props.citySlug })
    poolSize.value = res.poolSize
    if (res.pair) {
      pair.value = res.pair as unknown as readonly [Vid, Vid]
      done.value = false
      capped.value = false
      notEnough.value = false
    } else {
      pair.value = null
      capped.value = res.capped
      done.value = res.exhausted
      notEnough.value = res.poolSize < 2
    }
  } catch {
    pair.value = null
  } finally {
    loading.value = false
  }
}

async function vote(winner: Vid, loser: Vid) {
  if (voting.value) return
  voting.value = true
  try {
    await $trpc.cityVideo.vote.mutate({
      citySlug: props.citySlug,
      winnerVideoId: winner.id,
      loserVideoId: loser.id,
    })
    votesCast.value += 1
    await loadPair()
  } catch {
    // On error just try to reload a fresh pair.
    await loadPair()
  } finally {
    voting.value = false
  }
}

onMounted(loadPair)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-4 flex items-baseline justify-between gap-3">
      <div>
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Video of the day</div>
        <h3 class="mt-1 text-xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          Which one <em class="italic" :style="{ color: accent }">wins?</em>
        </h3>
      </div>
      <div
        v-if="votesCast > 0"
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
        :style="{ background: accent + '18', color: accent, fontFamily: 'system-ui, sans-serif' }"
      >
        <Check class="h-3 w-3" /> {{ votesCast }} vote{{ votesCast === 1 ? '' : 's' }}
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-3 sm:grid-cols-2">
      <div v-for="i in 2" :key="i" class="aspect-video rounded-xl animate-pulse" style="background:#3b1f0d0d;" />
    </div>

    <!-- Voting pair -->
    <div v-else-if="pair" class="grid gap-3 sm:grid-cols-2">
      <div
        v-for="(v, idx) in pair"
        :key="v.id"
        class="group/card overflow-hidden rounded-xl border bg-white transition-all"
        :style="{ borderColor: accent + '44', boxShadow: '0 1px 0 ' + accent + '18, 0 6px 16px rgba(59,31,18,0.05)' }"
      >
        <!-- Embed if opened, else thumbnail with play -->
        <div class="relative aspect-video" style="background:#3b1f0d;">
          <iframe
            v-if="activeEmbed === v.id && embedFor(v).embedUrl"
            :src="embedFor(v).embedUrl!"
            class="absolute inset-0 h-full w-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
          <button
            v-else
            type="button"
            class="absolute inset-0 h-full w-full"
            @click="embedFor(v).embedUrl ? (activeEmbed = v.id) : window.open(v.videoUrl, '_blank')"
          >
            <img
              v-if="embedFor(v).thumbnailUrl"
              :src="embedFor(v).thumbnailUrl!"
              :alt="v.title"
              class="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            >
            <div class="absolute inset-0" style="background:linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05));" />
            <span class="absolute inset-0 flex items-center justify-center">
              <span class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover/card:scale-110">
                <Play class="h-5 w-5 translate-x-0.5" :style="{ color: accent }" fill="currentColor" />
              </span>
            </span>
          </button>
        </div>

        <div class="p-3">
          <p class="truncate text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
            {{ v.title }}
          </p>
          <p v-if="v.danceStyle" class="mt-0.5 text-[11px]" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            {{ v.danceStyle }}
          </p>
          <button
            type="button"
            :disabled="voting"
            class="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-all disabled:opacity-50"
            :style="{ background: accent, boxShadow: '0 3px 0 -1px rgba(0,0,0,0.15)' }"
            @click="vote(v, pair![idx === 0 ? 1 : 0])"
          >
            Vote this one
          </button>
        </div>
      </div>
    </div>

    <!-- End states -->
    <div
      v-else
      class="rounded-xl border-2 border-dashed p-6 text-center"
      style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
    >
      <template v-if="notEnough">
        <p class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
          Not enough videos to vote yet
        </p>
        <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Submit yours below and get the competition started.
        </p>
      </template>
      <template v-else-if="capped">
        <p class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
          That's a lot of voting today — thank you!
        </p>
        <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Come back tomorrow for more.
        </p>
      </template>
      <template v-else>
        <p class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
          You've voted on every pairing — nice.
        </p>
        <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          {{ votesCast }} vote{{ votesCast === 1 ? '' : 's' }} counted. Check the leaderboard to see who's winning.
        </p>
      </template>
    </div>
  </div>
</template>
