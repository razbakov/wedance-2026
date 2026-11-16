<script setup lang="ts">
/**
 * "Your dance friends" on My plan (RAZ-985, sketch /sketches/meet-matches variant D):
 * every dancer you and they both said yes to — in the Meet deck or with a wave on a
 * festival page — newest first. Each match leads with one night out you could both
 * go to: "I'm going too" (adds it to your plan, and tells this match you're going)
 * or "Next time" (something came up: that night is skipped, the next one shows).
 * Festival matches without a night fall back to "See you at <festival>".
 * Renders nothing until there is a match.
 */
import { CalendarDays, Check, Heart, MapPin, Ticket, Users } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { eventLocalTime, eventLocalWeekday } from '#shared/utils/eventTime'
import { festivalPath } from '#shared/utils/eventSlug'

type Night = { eventId: string; name: string; path: string; startISO: string; timezone: string | null; venue: string; youGoing: boolean; theyGoing: boolean }
type Match = {
  dancerId: string; name: string; photo: string | null; username: string | null; city: string; styles: string[]
  matchedAt: string; deck: boolean; festivals: { slug: string; name: string }[]; night: Night | null
}

const emit = defineEmits<{ planned: [eventId: string] }>()

const { $trpc } = useNuxtApp()
const { track } = useTrack()
const { syncEvent } = useWeekPlan()
const route = useRoute()

const matches = ref<Match[]>([])
/** Nights added from a card this visit — shown as going before the reload. */
const going = ref(new Set<string>())
/** The last "Next time", for Undo. */
const skipped = ref<{ night: Night; name: string } | null>(null)

async function load() {
  try {
    matches.value = (await $trpc.plan.meetMatches.query()).matches as Match[]
  } catch (err) {
    console.warn('[meet-matches] load failed:', err)
  }
}
onMounted(async () => {
  await load()
  // From the "said yes too" email / "It's a match" on /meet: land on the list once it's there.
  if (route.hash === '#dance-friends' && matches.value.length) {
    await nextTick()
    document.getElementById('dance-friends')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

const NEW_DAYS = 7
const isNew = (m: Match) => Date.now() - new Date(m.matchedAt).getTime() < NEW_DAYS * 86400_000
const first = (name: string) => name.split(' ')[0] || name
const when = (n: Night) => `${eventLocalWeekday(n.startISO, n.timezone ?? undefined)} ${eventLocalTime(n.startISO, n.timezone ?? undefined)}`
const where = (m: Match) => [m.deck ? 'Meet new friends' : '', ...m.festivals.map(f => f.name)].filter(Boolean).join(' · ')
const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
const youGoing = (n: Night) => n.youGoing || going.value.has(n.eventId)
function nightLine(m: Match) {
  const n = m.night!
  if (youGoing(n) && n.theyGoing) return 'You’re both going'
  if (n.theyGoing) return `${first(m.name)} is going`
  if (youGoing(n)) return going.value.has(n.eventId) ? `You’re going — ${first(m.name)} sees it` : 'You’re going'
  return 'You could both go'
}

function goToo(m: Match) {
  const n = m.night!
  going.value = new Set([...going.value, n.eventId])
  syncEvent(n.eventId, true)
  track('meet_match_answered', { answer: 'going', they_going: n.theyGoing, source: m.deck ? 'deck' : 'festival', event_id: n.eventId })
  $trpc.plan.add
    .mutate({ itemType: 'event', itemId: n.eventId, metadata: { with: m.dancerId } })
    .then(() => emit('planned', n.eventId))
    .catch((err) => {
      console.warn('[meet-matches] add failed:', err)
      const s = new Set(going.value); s.delete(n.eventId); going.value = s
      syncEvent(n.eventId, false)
    })
}

async function nextTime(m: Match) {
  const n = m.night!
  track('meet_match_answered', { answer: 'next_time', they_going: n.theyGoing, source: m.deck ? 'deck' : 'festival', event_id: n.eventId })
  skipped.value = { night: n, name: first(m.name) }
  try {
    await $trpc.plan.discoverSwipe.mutate({ targetKind: 'event', targetId: n.eventId, decision: 'skip' })
    await load()
  } catch (err) {
    console.warn('[meet-matches] next time not saved:', err)
    skipped.value = null
  }
}

async function undoNextTime() {
  const s = skipped.value
  if (!s) return
  skipped.value = null
  try {
    await $trpc.plan.discoverUnswipe.mutate({ targetKind: 'event', targetId: s.night.eventId })
    await load()
  } catch (err) {
    console.warn('[meet-matches] undo failed:', err)
  }
}
</script>

<template>
  <section v-if="matches.length" id="dance-friends" class="scroll-mt-20 font-sans" data-testid="meet-matches" aria-labelledby="meet-matches-title">
    <h2 id="meet-matches-title" class="flex items-center gap-2 text-2xl leading-tight font-display text-foreground">
      <Users class="size-5 text-primary" aria-hidden="true" /> Your dance friends
      <span class="font-hand text-lg text-secondary">— {{ matches.length }}</span>
    </h2>
    <p class="mt-1 text-sm text-muted-foreground">You both said yes — in Meet new friends or on a festival’s page.</p>

    <ul class="mt-4 grid grid-cols-1 gap-3">
      <li
        v-for="m in matches"
        :key="m.dancerId"
        class="min-w-0 rounded-2xl border bg-white p-4"
        :class="isNew(m) ? 'border-primary/40' : ''"
        :style="isNew(m) ? undefined : 'border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);'"
        data-testid="meet-match"
      >
        <div class="flex items-center gap-3">
          <component :is="m.username ? 'NuxtLink' : 'span'" :to="m.username ? `/u/${m.username}` : undefined" class="shrink-0">
            <img v-if="m.photo" :src="sizedImage(m.photo, IMG.avatar)" :alt="m.name" class="size-12 rounded-full object-cover">
          </component>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="truncate font-bold text-foreground">{{ m.name }}</span>
              <span v-if="isNew(m)" class="rounded-full bg-primary px-2 py-0.5 text-eyebrow font-bold uppercase tracking-wider text-primary-foreground">New</span>
            </div>
            <p class="truncate text-xs text-muted-foreground">
              {{ [m.city, m.styles.join(', ')].filter(Boolean).join(' · ') }} · matched {{ ago(m.matchedAt) }} in {{ where(m) }}
            </p>
          </div>
        </div>

        <!-- The one next step: a night out you could both go to. -->
        <div class="mt-3 rounded-xl bg-muted/60 p-3 sm:flex sm:items-center sm:gap-3">
          <template v-if="m.night">
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-wd-green-700">{{ nightLine(m) }}</p>
              <NuxtLink :to="m.night.path" class="block truncate font-semibold text-foreground hover:underline">
                <CalendarDays class="inline size-4 -mt-0.5" aria-hidden="true" /> {{ when(m.night) }} · {{ m.night.name }}
              </NuxtLink>
              <p v-if="m.night.venue" class="truncate text-xs text-muted-foreground">
                <MapPin class="inline size-3 -mt-0.5" aria-hidden="true" /> {{ m.night.venue }}
              </p>
            </div>
            <div v-if="!m.night.youGoing" class="mt-2 flex shrink-0 items-center gap-3 sm:mt-0">
              <span
                v-if="going.has(m.night.eventId)"
                class="inline-flex h-9 items-center gap-1.5 rounded-full bg-wd-green-600 px-4 text-sm font-bold text-white"
                role="status"
              >
                <Check class="size-4" aria-hidden="true" /> In your plan
              </span>
              <template v-else>
                <button
                  type="button"
                  class="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"
                  data-testid="meet-match-going"
                  @click="goToo(m)"
                >
                  <Heart class="size-4" aria-hidden="true" /> {{ m.night.theyGoing ? 'I’m going too' : 'I’m going' }}
                </button>
                <button
                  type="button"
                  class="text-sm font-bold text-muted-foreground hover:text-foreground"
                  data-testid="meet-match-next-time"
                  @click="nextTime(m)"
                >
                  Next time
                </button>
              </template>
            </div>
          </template>
          <template v-else-if="m.festivals.length">
            <p class="flex-1 text-sm">
              <Ticket class="inline size-4 -mt-0.5" aria-hidden="true" /> See you at <span class="font-semibold">{{ m.festivals[0]!.name }}</span> — plan a dance there.
            </p>
            <NuxtLink :to="`${festivalPath(m.festivals[0]!.slug)}#discover`" class="mt-2 inline-block shrink-0 text-sm font-bold text-primary hover:underline sm:mt-0">Open festival</NuxtLink>
          </template>
          <p v-else class="text-sm text-muted-foreground">No night out in the next two weeks yet.</p>
        </div>
      </li>
    </ul>

    <p v-if="skipped" class="mt-3 text-xs text-muted-foreground" role="status">
      Next time, then — {{ skipped.night.name }} won’t come up again.
      <button type="button" class="font-bold text-primary hover:underline" @click="undoNextTime">Undo</button>
    </p>
  </section>
</template>
