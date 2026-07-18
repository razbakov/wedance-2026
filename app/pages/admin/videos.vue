<script setup lang="ts">
/**
 * /admin/videos — moderation queue for city-video competition submissions.
 * Public submissions land as `pending` (cityVideo.submit) and are invisible on
 * the city page until approved here. Approve → shows in the leaderboard + vote;
 * Reject → hidden. Admin-gated the same way as /admin/festivals: a page-scoped
 * admin auth token, restored on leave.
 */
import { Loader2, ExternalLink, Check, X, RotateCcw } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })

useHead({ title: 'Admin: Video moderation | WeDance' })

const { $trpc } = useNuxtApp()

type PendingVideo = {
  id: string
  citySlug: string
  title: string
  videoUrl: string
  thumbnailUrl: string | null
  danceStyle: string | null
  submittedByEmail: string
  competitionMonth: string
  status: string
  createdAt: string | Date | null
}

const videos = ref<PendingVideo[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    videos.value = (await $trpc.cityVideo.pendingList.query({})) as PendingVideo[]
  } catch (e: any) {
    error.value = e?.message || 'Failed to load pending videos.'
  } finally {
    loading.value = false
  }
}

async function setStatus(v: PendingVideo, status: 'approved' | 'rejected') {
  busyId.value = v.id
  try {
    await $trpc.cityVideo.setStatus.mutate({ videoId: v.id, status })
    // Drop from the queue — pendingList only holds `pending`.
    videos.value = videos.value.filter(x => x.id !== v.id)
  } catch (e: any) {
    error.value = e?.message || 'Could not update that video.'
  } finally {
    busyId.value = null
  }
}

const cityLabel = (slug: string) =>
  slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <div>
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Admin</div>
        <h1 class="mt-2 text-3xl sm:text-4xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          Video <em class="italic" style="color:#dc2626;">moderation</em>
        </h1>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
        style="color:#9a5614; font-family: system-ui, sans-serif;"
        :disabled="loading"
        @click="load"
      >
        <RotateCcw class="w-3.5 h-3.5" /> Refresh
      </button>
    </div>
    <p class="mt-1 text-sm italic" style="color:#5b3a1d;">
      Pending submissions to the city-video competition. Approve to publish to the leaderboard + vote.
    </p>

      <div v-if="error" class="mt-6 rounded-xl border p-4 text-sm" style="border-color:#dc262655; background:#fdecec; color:#991b1b; font-family: system-ui, sans-serif;">
        {{ error }}
      </div>

      <div v-if="loading" class="flex items-center gap-2 py-16 justify-center" style="color:#9a5614;">
        <Loader2 class="w-5 h-5 animate-spin" />
        <span class="text-sm italic">Loading queue…</span>
      </div>

      <div
        v-else-if="!videos.length"
        class="mt-8 rounded-2xl border-2 border-dashed p-10 text-center"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <p class="text-sm font-bold" style="color:#3b1f0d;">No pending videos 🎉</p>
        <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">The moderation queue is clear.</p>
      </div>

      <div v-else class="mt-6 grid gap-4">
        <div
          v-for="v in videos"
          :key="v.id"
          class="flex flex-col sm:flex-row gap-4 rounded-2xl bg-white border p-4"
          style="border-color:#3b1f0d22; box-shadow:0 1px 0 #3b1f0d0f;"
        >
          <a
            :href="v.videoUrl"
            target="_blank"
            rel="noopener"
            class="block shrink-0 rounded-xl overflow-hidden bg-black/5 relative w-full sm:w-48 aspect-video"
          >
            <img
              v-if="v.thumbnailUrl"
              :src="v.thumbnailUrl"
              :alt="v.title"
              class="w-full h-full object-cover"
              loading="lazy"
            >
            <div class="absolute inset-0 flex items-center justify-center">
              <ExternalLink class="w-5 h-5 text-white drop-shadow" />
            </div>
          </a>

          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:#dc26261a; color:#dc2626;">{{ cityLabel(v.citySlug) }}</span>
              <span v-if="v.danceStyle" class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:#9a56141a; color:#9a5614;">{{ v.danceStyle }}</span>
              <span class="text-[10px] uppercase tracking-wider" style="color:#9a5614;">{{ v.competitionMonth }}</span>
            </div>
            <h3 class="mt-1.5 text-base font-bold leading-tight truncate" style="color:#3b1f0d;">{{ v.title }}</h3>
            <p class="text-xs truncate" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ v.submittedByEmail }}</p>
            <a :href="v.videoUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-1 text-xs font-bold hover:underline" style="color:#0891b2; font-family: system-ui, sans-serif;">
              Watch <ExternalLink class="w-3 h-3" />
            </a>
          </div>

          <div class="flex sm:flex-col gap-2 sm:justify-center shrink-0">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              style="background:#16a34a;"
              :disabled="busyId === v.id"
              @click="setStatus(v, 'approved')"
            >
              <Loader2 v-if="busyId === v.id" class="w-3.5 h-3.5 animate-spin" />
              <Check v-else class="w-3.5 h-3.5" /> Approve
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              style="border:1px solid #dc262655; color:#dc2626;"
              :disabled="busyId === v.id"
              @click="setStatus(v, 'rejected')"
            >
              <X class="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      </div>
  </div>
</template>
