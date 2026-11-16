<script setup lang="ts">
/**
 * One planned night or class in My plan's Today / Week / Month tabs (RAZ-1006).
 * Signed up (RAZ-1003) → "✓ Signed up", cancelled on the event page; planned and the event takes a
 * sign-up → "Planned · Book →" + Remove (nights only — a class is removed with its course under
 * Your courses); otherwise the plain "✓ My plan" toggle.
 */
import { GraduationCap, Sparkles } from 'lucide-vue-next'
import { WD } from '~/lib/brand'
import { eventPath } from '#shared/utils/eventSlug'

export type MyPlanEvent = {
  id: string
  name: string
  time: string
  venue: string
  style: string
  color: string
  friendsGoing: number
  isClass?: boolean
  signedUp?: boolean
  takesSignup?: boolean
  price?: string | null
  /** A night's programme (RAZ-1007): your pass, when to come, the parts you're at. */
  night?: { pass: string | null; arrival: string | null; parts: string[] } | null
}

const props = defineProps<{
  s: MyPlanEvent
  /** Two-line day chip ("Thu" / "19 Nov") instead of the kind icon — Week and Month lists. */
  chip?: { top: string, bottom: string } | null
  preview?: boolean
}>()
defineEmits<{ remove: [id: string] }>()
const link = computed(() => eventPath({ id: props.s.id, name: props.s.name }))
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-3 px-4 py-3"
    :style="{ background: WD.green600 + '08' }"
    :data-week-row="s.isClass ? 'class' : 'night'"
  >
    <span
      v-if="chip"
      class="w-12 text-center text-eyebrow font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-tight"
      :style="{ background: s.color + '18', color: s.color }"
    >{{ chip.top }}<span class="block font-bold normal-case tracking-normal">{{ chip.bottom }}</span></span>
    <component :is="s.isClass ? GraduationCap : Sparkles" v-else class="w-4 h-4 shrink-0" :style="{ color: s.color, 'stroke-width': 1.5 }" aria-hidden="true" />
    <span class="text-sm font-bold w-12 text-foreground font-sans">{{ s.time }}</span>
    <div class="min-w-0 flex-1">
      <NuxtLink v-if="!preview" :to="link" class="block text-sm font-bold truncate text-foreground hover:underline">{{ s.name }}</NuxtLink>
      <div v-else class="text-sm font-bold truncate text-foreground">{{ s.name }}</div>
      <div class="text-xs truncate text-muted-foreground font-sans">
        <template v-if="s.isClass">Class · </template>{{ s.venue }}<template v-if="s.style"> · <span :style="{ color: s.color }">{{ s.style }}</span></template><template v-if="s.friendsGoing > 0"> · {{ s.friendsGoing }} friend{{ s.friendsGoing === 1 ? '' : 's' }} going</template>
      </div>
      <!-- RAZ-1007: one row for the night — your pass, when to come, what you're at -->
      <div v-if="s.night && s.night.parts.length" class="text-xs truncate font-sans" :class="s.signedUp ? 'text-wd-green-700' : 'text-muted-foreground'" data-plan-night>
        <template v-if="s.signedUp">{{ [[s.night.pass, s.night.arrival ? `from ${s.night.arrival}` : null].filter(Boolean).join(' · '), s.night.parts.join(', ')].filter(Boolean).join(': ') }}</template>
        <template v-else>Planned: {{ s.night.parts.join(', ') }}</template>
      </div>
    </div>
    <!-- Signed up (RAZ-1003): a commitment, cancelled on the event page, never here. -->
    <NuxtLink
      v-if="s.signedUp && !preview"
      :to="link"
      class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap font-sans"
      style="background: var(--wd-green-600); color: white;"
      :title="'You’re signed up — to cancel, open the event'"
    >
      ✓ Signed up
    </NuxtLink>
    <!-- Only planned (RAZ-1003): the state, the next step (with its price), and Remove. -->
    <span v-else-if="s.takesSignup && !preview" class="inline-flex items-center gap-3 text-xs font-sans whitespace-nowrap">
      <span class="text-muted-foreground">Planned</span>
      <NuxtLink :to="link" class="font-bold px-3 py-1.5 rounded-full border text-primary border-primary/40 hover:bg-primary/5" data-plan-signup>
        Book{{ s.price ? ` · ${s.price}` : '' }} →
      </NuxtLink>
      <button v-if="!s.isClass" type="button" class="text-muted-foreground hover:text-primary hover:underline" :aria-label="`Remove ${s.name} from your plan`" data-plan-remove @click="$emit('remove', s.id)">Remove</button>
    </span>
    <!-- A class with nothing to book: it's managed under Your courses. -->
    <span v-else-if="s.isClass" class="text-xs text-muted-foreground font-sans whitespace-nowrap">In your courses</span>
    <button
      v-else
      type="button"
      class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap font-sans"
      style="background: var(--wd-green-600); color: white;"
      :aria-label="`${s.name} is in your plan — tap to remove it`"
      :title="'Tap to remove from your plan'"
      @click="$emit('remove', s.id)"
    >
      ✓ My plan
    </button>
  </div>
</template>
