<script setup lang="ts">
/**
 * My plan's way into "Meet new friends" (RAZ-989): the deck has its own page,
 * `/meet`; here a compact card with the first faces waiting and how many.
 * `count` null = the deck hasn't loaded (or failed) — the card still leads there.
 */
import { ArrowRight, Users } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { meetEntryLine } from '~/lib/meetDeck'

const props = defineProps<{
  faces: ReadonlyArray<{ id: string; name: string; photo: string }>
  count: number | null
  /** my_plan (the plan) / my_plan_empty (nothing picked yet). */
  surface: string
}>()

const { track } = useTrack()
function opened() {
  track('meet_friends_opened', { surface: props.surface, people: props.count })
}
</script>

<template>
  <NuxtLink
    to="/meet"
    class="group flex items-center gap-4 rounded-2xl border bg-white px-5 py-4 text-left font-sans transition-shadow hover:shadow-md"
    style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
    data-testid="meet-entry"
    @click="opened"
  >
    <span v-if="faces.length" class="flex shrink-0 -space-x-3" aria-hidden="true">
      <img
        v-for="f in faces.slice(0, 3)"
        :key="f.id"
        :src="sizedImage(f.photo, IMG.avatar)"
        alt=""
        class="size-11 rounded-full object-cover ring-2 ring-white"
        draggable="false"
      >
    </span>
    <span v-else class="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-primary" aria-hidden="true">
      <Users class="size-5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-xl leading-tight font-display text-foreground">Meet new friends</span>
      <span class="block text-sm text-muted-foreground">{{ meetEntryLine(count) }}</span>
    </span>
    <ArrowRight class="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
  </NuxtLink>
</template>
