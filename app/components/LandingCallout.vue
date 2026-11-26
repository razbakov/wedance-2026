<script setup lang="ts">
/**
 * RAZ-1095. The tab's callout, in the two approved shapes:
 * `card` (Everyone) — an end-of-panel card, pill button, "Make the night yours."
 * `hero` (Artists, Organizers, Venues) — the hero `cta` with a handwritten line under it.
 */
import { ArrowRight, PartyPopper } from 'lucide-vue-next'
import { landingCallout, type LandingTab } from '~/lib/landingAudience'

const props = defineProps<{
  variant: 'card' | 'hero'
  tab: LandingTab
  surface: string
}>()

const copy = computed(() => landingCallout(props.tab))

function onClick() {
  useTrack().track('landing_callout_click', {
    tab: props.tab,
    cta: copy.value.cta,
    surface: props.surface,
  })
}
</script>

<template>
  <Card
    v-if="variant === 'card'"
    class="mt-14 overflow-hidden rounded-2xl border-t-4 border-t-wd-orange-500 text-center shadow-wd-card"
    data-testid="landing-callout"
  >
    <CardContent class="px-6 py-8 font-sans">
      <div
        class="mx-auto flex size-16 -rotate-3 items-center justify-center rounded-2xl bg-wd-orange-500 text-wd-brown-900 shadow-wd-float"
        aria-hidden="true"
      >
        <PartyPopper class="size-8" />
      </div>
      <h2 class="mt-4 font-display text-3xl leading-tight text-foreground">{{ copy.headline }}</h2>
      <p class="mt-2 text-balance text-muted-foreground">{{ copy.line }}</p>
      <div class="mt-5 flex justify-center">
        <Button as-child variant="pill" size="lg" class="whitespace-nowrap px-6">
          <NuxtLink :to="copy.to" @click="onClick">
            {{ copy.label }} <ArrowRight aria-hidden="true" />
          </NuxtLink>
        </Button>
      </div>
    </CardContent>
  </Card>

  <div v-else class="inline-flex max-w-full flex-col items-center" data-testid="landing-callout">
    <Button as-child variant="cta" size="lg" class="whitespace-nowrap px-6">
      <NuxtLink :to="copy.to" @click="onClick">
        {{ copy.label }} <ArrowRight aria-hidden="true" />
      </NuxtLink>
    </Button>
    <p class="mt-3 max-w-full text-balance text-center font-hand text-lg leading-snug text-secondary">{{ copy.hand }}</p>
  </div>
</template>
