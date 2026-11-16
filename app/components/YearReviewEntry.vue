<script setup lang="ts">
/**
 * Where dancers find "Your year in dance" (RAZ-966): in My plan, not the main
 * navigation. All year it's a quiet link under "Your year"; around the turn of
 * the year (December, January) it's a banner at the top, so the year gets
 * closed properly before the next one is planned.
 */
import { ArrowRight, PartyPopper } from 'lucide-vue-next'
import { isYearTurn, lookBackYear } from '#shared/utils/yearReview'

const props = defineProps<{
  /** banner = the turn-of-the-year card at the top; link = the quiet line. */
  variant: 'banner' | 'link'
}>()

const now = new Date()
const year = lookBackYear(now)
const january = now.getUTCMonth() === 0

const { track } = useTrack()
function opened() {
  track('year_review_entry_clicked', { variant: props.variant, year, year_turn: isYearTurn(now) })
}
</script>

<template>
  <NuxtLink
    v-if="variant === 'banner'"
    to="/my-year"
    class="group flex items-center gap-4 rounded-2xl px-5 py-4 text-white bg-wd-red-600 font-sans"
    style="background: linear-gradient(135deg, var(--wd-red-600), var(--wd-orange-500)); box-shadow: 0 3px 0 -1px var(--wd-red-800);"
    data-testid="year-review-entry"
    @click="opened"
  >
    <PartyPopper class="size-8 shrink-0" aria-hidden="true" />
    <span class="min-w-0 flex-1">
      <span class="block text-eyebrow uppercase tracking-[0.3em] font-bold opacity-80">{{ january ? 'Close last year' : 'Before the year ends' }}</span>
      <span class="block text-xl leading-tight font-display">Your {{ year }} in dance</span>
      <span class="block text-sm opacity-90">The story of your year, ready to post. Then plan {{ year + 1 }}.</span>
    </span>
    <ArrowRight class="size-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
  </NuxtLink>
  <NuxtLink
    v-else
    to="/my-year"
    class="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline font-sans"
    data-testid="year-review-entry"
    @click="opened"
  >
    <PartyPopper class="size-4" aria-hidden="true" />
    Your {{ year }} in dance so far
    <ArrowRight class="size-4" aria-hidden="true" />
  </NuxtLink>
</template>
