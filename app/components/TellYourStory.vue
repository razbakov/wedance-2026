<script setup lang="ts">
/**
 * After booking (RAZ-1010): one button to the story that already lives on
 * My plan. Shown on the booked card, not in Going together, and not before
 * they book. A class gets nothing — that story is nights. See storyAfterBooking.
 */
import { ArrowRight, Share2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { storyAfterBooking } from '~/lib/shareInvite'

const props = defineProps<{
  type?: string | null
  isFestival?: boolean
  startDate?: string | null
  timezone?: string | null
  /** Where the tap came from, for story_prompt_opened. */
  surface: string
  /**
   * Sketch only. Omit it and the signed-in account decides — a signed-out
   * dancer never sees the button.
   */
  signedIn?: boolean
}>()

const { isSignedIn } = useAuth()
const signedIn = computed(() => props.signedIn ?? isSignedIn.value)
const prompt = computed(() => storyAfterBooking({
  booked: true,
  signedIn: signedIn.value,
  type: props.type,
  isFestival: props.isFestival,
  startDate: props.startDate,
  timezone: props.timezone,
}))

function opened() {
  if (!prompt.value) return
  useTrack().track('story_prompt_opened', { where: prompt.value.where, surface: props.surface })
}
</script>

<template>
  <div v-if="prompt" class="space-y-1" data-tell-story>
    <Button as-child variant="outline-pill" size="pill-sm">
      <NuxtLink :to="prompt.href" @click="opened">
        <Share2 aria-hidden="true" /> {{ prompt.label }} <ArrowRight aria-hidden="true" />
      </NuxtLink>
    </Button>
    <p class="text-xs text-muted-foreground">{{ prompt.line }}</p>
  </div>
</template>
