<script setup lang="ts">
/**
 * The "Meet new friends" example deck for visitors (signed-out /meet): the same
 * swipe cards as the real deck, played with example dancers, all on the page —
 * nothing is saved. Yes on two dancers heading to the same festival shows the
 * "suggest it for your year" nudge the real deck shows. When the cards run out
 * the deck shows the `end` slot (on /meet: the dance card), else asks the
 * visitor to join (emits `join`).
 */
import { Plane, MapPin, X, Heart, Undo2, Sparkles } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { WD } from '~/lib/brand'

export type LandingPerson = {
  id: string
  name: string
  city: string
  photo: string
  danceStyles: readonly string[]
  /** Going to a festival (chip + nudge), or to a night out near you (RAZ-981). */
  festivalName?: string
  festivalColor?: string
  night?: string
  reason: string
}

const props = defineProps<{ people: readonly LandingPerson[] }>()
const emit = defineEmits<{ join: [] }>()

const index = ref(0)
const yeses = ref<LandingPerson[]>([])
const history = ref<Array<{ person: LandingPerson; yes: boolean }>>([])
const current = computed(() => props.people[index.value])
const next = computed(() => props.people[index.value + 1])
const after = computed(() => props.people[index.value + 2])

// Yes on two people going to the same festival → the nudge.
const nudge = computed(() => {
  const byFest = new Map<string, LandingPerson[]>()
  for (const p of yeses.value) if (p.festivalName) byFest.set(p.festivalName, [...(byFest.get(p.festivalName) ?? []), p])
  for (const [fest, ps] of byFest) if (ps.length >= 2) return { fest, names: ps.map(p => p.name), color: ps[0].festivalColor }
  return null
})

// Drag
const dragDx = ref(0)
const dragging = ref(false)
const exitDir = ref<0 | 1 | -1>(0)
let startX = 0
function onDown(e: PointerEvent) {
  dragging.value = true
  startX = e.clientX
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}
function onMove(e: PointerEvent) { if (dragging.value) dragDx.value = e.clientX - startX }
function onUp() {
  if (!dragging.value) return
  dragging.value = false
  if (Math.abs(dragDx.value) > 90) decide(dragDx.value > 0)
  else dragDx.value = 0
}
const transform = computed(() => {
  if (exitDir.value) return `translateX(${exitDir.value * 520}px) rotate(${exitDir.value * 18}deg)`
  return `translateX(${dragDx.value}px) rotate(${dragDx.value / 18}deg)`
})

function decide(yes: boolean) {
  const person = current.value
  if (!person || exitDir.value) return
  exitDir.value = yes ? 1 : -1
  setTimeout(() => {
    history.value.push({ person, yes })
    if (yes) yeses.value.push(person)
    index.value++
    exitDir.value = 0
    dragDx.value = 0
  }, 240)
}
function undo() {
  const last = history.value.pop()
  if (!last) return
  index.value--
  if (last.yes) yeses.value = yeses.value.filter(p => p.id !== last.person.id)
}
</script>

<template>
  <div class="mx-auto max-w-sm font-sans" data-testid="landing-friends-deck">
    <!-- Nudge: two yeses heading to the same festival -->
    <div
      v-if="nudge"
      class="mb-4 rounded-2xl px-4 py-3 text-sm border"
      :style="{ background: (nudge.color ?? WD.red600) + '12', borderColor: (nudge.color ?? WD.red600) + '44' }"
      role="status"
    >
      <span class="font-bold text-foreground">{{ nudge.names.join(' & ') }} both go to {{ nudge.fest }}.</span>
      <span class="text-muted-foreground"> On your plan we'd suggest it for your year.</span>
    </div>

    <!-- End of the example deck -->
    <!-- The slot (My plan: the dance card) takes over when the examples run out. -->
    <slot v-if="!current" name="end" :yeses="yeses">
      <div class="rounded-3xl p-8 text-center border-2 border-dashed border-input bg-white/60">
        <Sparkles class="w-9 h-9 mx-auto mb-3 text-secondary" aria-hidden="true" />
        <p class="text-lg font-display text-foreground">That's how it works.</p>
        <p class="mt-2 text-sm text-muted-foreground">
          <template v-if="yeses.length">You said yes to {{ yeses.map(p => p.name).join(', ') }}. </template>
          Join and meet real dancers going where you go.
        </p>
        <Button variant="cta" class="mt-5" @click="emit('join')">Meet dancers near me</Button>
      </div>
    </slot>

    <div v-else class="relative min-h-[430px]">
      <div v-if="after" class="absolute inset-0 rounded-3xl bg-white border border-border" style="transform: scale(0.88) translateY(20px); opacity:0.35;" />
      <div v-if="next" class="absolute inset-0 rounded-3xl bg-white border border-border" style="transform: scale(0.94) translateY(10px); opacity:0.65;" />
      <div
        :key="current.id"
        class="relative rounded-3xl bg-white border border-border overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        :style="{ boxShadow: '0 12px 32px rgba(0,0,0,0.14)', transform, transition: dragging ? 'none' : 'transform 240ms ease-out' }"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <div
          class="absolute top-6 left-6 z-10 px-3 py-1 rounded-full border-2 text-sm font-black uppercase tracking-widest pointer-events-none text-primary border-wd-red-600"
          style="transform: rotate(-10deg);" :style="{ opacity: Math.min(1, Math.max(0, -dragDx / 100)) }"
        >Skip</div>
        <div
          class="absolute top-6 right-6 z-10 px-3 py-1 rounded-full border-2 text-sm font-black uppercase tracking-widest pointer-events-none text-wd-green-600 border-wd-green-600"
          style="transform: rotate(10deg);" :style="{ opacity: Math.min(1, Math.max(0, dragDx / 100)) }"
        >Yes</div>

        <img :src="sizedImage(current.photo, IMG.card)" :alt="current.name" class="w-full h-60 object-cover" draggable="false">
        <div class="p-5">
          <div class="flex items-baseline justify-between gap-3">
            <div class="text-xl font-black font-display text-foreground">{{ current.name }}</div>
            <div class="text-xs italic text-secondary font-display">{{ current.city }}</div>
          </div>
          <div
            v-if="current.festivalName"
            class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            :style="{ background: (current.festivalColor ?? WD.red600) + '18', color: current.festivalColor }"
          >
            <Plane class="w-3 h-3" style="stroke-width:1.5;" /> Going to {{ current.festivalName }}
          </div>
          <div
            v-else-if="current.night"
            class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-wd-green-600"
            style="background:color-mix(in srgb, var(--wd-green-600) 9.4%, transparent);"
          >
            <MapPin class="w-3 h-3" style="stroke-width:1.5;" /> Going to {{ current.night }}
          </div>
          <div class="mt-3 flex flex-wrap gap-1">
            <span
              v-for="st in current.danceStyles" :key="st"
              class="text-eyebrow font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-muted-foreground"
              style="background:color-mix(in srgb, var(--wd-brown-900) 3.9%, transparent);"
            >{{ st }}</span>
          </div>
          <p class="mt-3 text-xs italic leading-snug text-muted-foreground font-display">{{ current.reason }}</p>
        </div>
      </div>
    </div>

    <!-- Buttons -->
    <div v-if="current" class="mt-5 flex items-center justify-center gap-4">
      <button type="button" class="size-14 rounded-full bg-white border border-border grid place-items-center shadow-sm text-primary" aria-label="Skip" @click="decide(false)">
        <X class="w-6 h-6" aria-hidden="true" />
      </button>
      <button type="button" class="size-10 rounded-full bg-white border border-border grid place-items-center text-muted-foreground disabled:opacity-40" aria-label="Undo" :disabled="!history.length" @click="undo">
        <Undo2 class="w-4 h-4" aria-hidden="true" />
      </button>
      <button type="button" class="size-14 rounded-full grid place-items-center shadow-sm text-white" style="background:var(--wd-green-600)" aria-label="Yes" @click="decide(true)">
        <Heart class="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
    <p v-if="current" class="mt-3 text-xs text-center italic text-muted-foreground">
      Example dancers — drag or use the buttons · {{ people.length - index }} left
    </p>
    <p v-if="current && $slots.end" class="mt-1 text-center">
      <button type="button" class="text-xs font-bold underline text-primary" data-testid="skip-to-dance-card" @click="index = people.length">
        Skip to my dance card →
      </button>
    </p>
  </div>
</template>
