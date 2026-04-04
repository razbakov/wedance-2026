<script setup lang="ts">
import type { DanceStyle } from '~/types/schedule'

const props = defineProps<{
  festivalSlug: string
  festivalName: string
  city?: string
  currentDay: string | null
  currentStyle: DanceStyle | null
}>()

const { share, toastVisible, toastMessage } = useShare()
const { trackShareInitiated, trackLinkCopied, trackShareCompleted } = useAnalytics()

async function handleShare() {
  const shareMethod = await share({
    festivalSlug: props.festivalSlug,
    festivalName: props.festivalName,
    city: props.city,
    currentDay: props.currentDay,
    currentStyle: props.currentStyle,
  })

  trackShareInitiated(shareMethod)

  if (shareMethod === 'copy_link') {
    const { buildShareUrl } = useShare()
    trackLinkCopied(buildShareUrl({
      festivalSlug: props.festivalSlug,
      festivalName: props.festivalName,
      city: props.city,
      currentDay: props.currentDay,
      currentStyle: props.currentStyle,
    }))
  } else {
    trackShareCompleted()
  }
}
</script>

<template>
  <div class="relative">
    <button
      class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      style="--tw-ring-color: var(--festival-accent, #E8453C)"
      @click="handleShare"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
      Share
    </button>

    <!-- Toast notification -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="toastVisible"
        class="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>
