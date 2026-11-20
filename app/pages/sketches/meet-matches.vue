<script setup lang="ts">
/**
 * Sketch (RAZ-985): what happens when two dancers say yes to each other.
 *
 * Today a Yes in "Meet new friends" (My plan) goes nowhere: the other dancer is
 * never told and a mutual Yes is never noticed. Festival waves are a second,
 * separate "yes" that only shows on the festival page as "festival friends".
 *
 * Four directions, clickable. Mock data by default; WeDance admins can flip
 * "Real data" to see their own matches from plan.meetMatches (mutual Yes in
 * discover_swipes + mutual festival_waves). Nothing is sent, nothing is written.
 */
import { Heart, Instagram, MessageCircle, CalendarDays, MapPin, Mail, Sparkles, Check, Users, Ticket } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { eventLocalTime, eventLocalWeekday } from '#shared/utils/eventTime'
import { festivalPath } from '#shared/utils/eventSlug'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Meet new friends: matches sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Match above the deck',
    idea: 'A "You and Gila both said yes" card right above the deck, one at a time. Its one next step is a night out you could both go to — "I’m going too" puts it in your plan. Festival waves stay on the festival page.',
    good: 'Smallest change, exactly where the Yes was made. Leads to meeting on the floor, which is what locals do anyway.',
    cost: 'Two "yes" systems stay apart (deck vs. waves). The other dancer only learns of it the next time they open My plan.',
  },
  {
    id: 'B',
    name: 'One "dance friends" list',
    idea: 'Deck matches and festival waves become one list, "Your dance friends", each row tagged with where you matched. Its one step is "Say hi" — their Instagram, else their profile.',
    good: 'One system: a yes is a yes, wherever you said it. A direct line to the person, which locals asked for.',
    cost: 'Saying hi is a cold DM on another app — many won’t. Needs their Instagram, which not everyone has.',
  },
  {
    id: 'C',
    name: 'Tell them by email',
    idea: 'A’s card, plus the other dancer gets an email the moment it becomes a match: "Gila said yes too — Friday’s salsa night?" with one button back to My plan.',
    good: 'Actually "tells both dancers": nobody has to happen to open My plan. Brings people back.',
    cost: 'A new email type (opt-out, frequency, wording). Turns a private Yes into a message — the copy has to say so before anyone swipes.',
  },
  {
    id: 'D',
    name: 'Recommended: one list, night first',
    idea: 'B’s single list (deck + festival waves) with A’s night as the one step on each match; "Say hi" is a small link. The newest match sits on top as "New". Email = your call (C).',
    good: 'One place for every mutual yes, and every match ends in a concrete night out — the shortest way from "yes" to dancing together.',
    cost: 'Biggest of the four in UI. Festival matches without a night in your city fall back to "See you at <festival>".',
  },
]

const variant = ref<Variant>('D')
const device = ref<'desktop' | 'mobile'>('desktop')
const state = ref<'matches' | 'one' | 'none'>('matches')
const realData = ref(false)
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Data: mock, or the admin's own matches from plan.meetMatches ──────────────
type Night = { eventId: string, name: string, path: string, startISO: string, timezone: string | null, venue: string, youGoing: boolean, theyGoing: boolean }
type Match = {
  dancerId: string, name: string, photo: string | null, username: string | null, city: string, styles: string[],
  instagram: string | null, matchedAt: string, deck: boolean, festivals: { slug: string, name: string }[], night: Night | null
}
const inDays = (d: number, h = 20) => { const t = new Date(); t.setUTCDate(t.getUTCDate() + d); t.setUTCHours(h - 1, 0, 0, 0); return t.toISOString() }
const MOCK: Match[] = [
  {
    dancerId: 'gila', name: 'Gila Weiss', photo: 'https://i.pravatar.cc/300?u=gila', username: 'gila', city: 'Munich', styles: ['Salsa', 'Bachata'],
    instagram: 'gila.dances', matchedAt: inDays(0, 12), deck: true, festivals: [],
    night: { eventId: 'e1', name: 'Salsa Friday at Bar Buena Vista', path: '#', startISO: inDays(2, 21), timezone: 'Europe/Berlin', venue: 'Bar Buena Vista', youGoing: false, theyGoing: true },
  },
  {
    dancerId: 'marco', name: 'Marco Rossi', photo: 'https://i.pravatar.cc/300?u=marco', username: 'marco', city: 'Milan', styles: ['Salsa'],
    instagram: null, matchedAt: inDays(-3, 12), deck: false, festivals: [{ slug: 'salsa-bavaria', name: 'Salsa Bavaria' }], night: null,
  },
  {
    dancerId: 'lena', name: 'Lena Huber', photo: 'https://i.pravatar.cc/300?u=lena', username: null, city: 'Munich', styles: ['Bachata'],
    instagram: 'lena.bachata', matchedAt: inDays(-6, 12), deck: true, festivals: [{ slug: 'bachata-weekend', name: 'Bachata Weekend' }],
    night: { eventId: 'e2', name: 'Bachata Sensual Social', path: '#', startISO: inDays(5, 20), timezone: 'Europe/Berlin', venue: 'Tanzhaus West', youGoing: false, theyGoing: false },
  },
]

const { isAdmin, isSignedIn } = useAuth()
const { $trpc } = useNuxtApp()
const real = ref<Match[] | null>(null)
const realError = ref('')
watch(realData, async (on) => {
  if (!on || real.value) return
  try { real.value = (await ($trpc as any).plan.meetMatches.query()).matches }
  catch (err: any) { realError.value = err?.message ?? 'Could not load' }
})

const matches = computed<Match[]>(() => {
  if (realData.value) return real.value ?? []
  if (state.value === 'none') return []
  return state.value === 'one' ? MOCK.slice(0, 1) : MOCK
})
const newest = computed(() => matches.value[0] ?? null)
const ME = { name: 'Alex', photo: 'https://i.pravatar.cc/300?u=alex' }

// ── Local, resettable UI state ───────────────────────────────────────────────
const going = ref<Set<string>>(new Set())
const dismissed = ref<Set<string>>(new Set())
const emailOpen = ref(false)
watch([variant, device, state, realData], () => { going.value = new Set(); dismissed.value = new Set(); emailOpen.value = false })
const toggleGoing = (id: string) => { const s = new Set(going.value); s.has(id) ? s.delete(id) : s.add(id); going.value = s }
const dismiss = (id: string) => { dismissed.value = new Set([...dismissed.value, id]) }
const deckCard = computed(() => matches.value.find(m => !dismissed.value.has(m.dancerId)) ?? null)

const first = (name: string) => name.split(' ')[0] || name
const when = (n: Night) => `${eventLocalWeekday(n.startISO, n.timezone ?? undefined)} ${eventLocalTime(n.startISO, n.timezone ?? undefined)}`
const ago = (iso: string) => {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
const where = (m: Match) => [m.deck ? 'My plan' : '', ...m.festivals.map(f => f.name)].filter(Boolean).join(' · ')
const nightLine = (m: Match) => {
  const n = m.night!
  if (going.value.has(n.eventId) || (n.youGoing && n.theyGoing)) return `You’re both going`
  if (n.theyGoing) return `${first(m.name)} is going`
  if (n.youGoing) return `You’re going — ask ${first(m.name)}`
  return `You could both go`
}
const hiHref = (m: Match) => m.instagram ? `https://instagram.com/${m.instagram.replace(/^@/, '')}` : m.username ? `/u/${m.username}` : null
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Meet new friends · matches</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background">
          <button
            v-for="v in VARIANTS" :key="v.id" type="button"
            class="px-3 h-8 rounded-full text-sm font-bold transition-colors"
            :class="variant === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            :data-testid="`variant-${v.id}`"
            @click="variant = v.id"
          >{{ v.id }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button"
            class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="device = d"
          >{{ d }}</button>
        </div>
        <div v-if="!realData" class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="s in (['matches', 'one', 'none'] as const)" :key="s" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="state === s ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="state = s"
          >{{ s === 'matches' ? '3 matches' : s === 'one' ? '1 new match' : 'No match yet' }}</button>
        </div>
        <label v-if="isSignedIn && isAdmin" class="inline-flex items-center gap-1.5 text-xs font-semibold">
          <input v-model="realData" type="checkbox" class="accent-primary"> Real data (my matches)
        </label>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 text-xs leading-relaxed">
        <span class="font-bold">{{ current.id }} · {{ current.name }}.</span>
        <span class="text-muted-foreground"> {{ current.idea }}</span>
        <span class="text-wd-green-700"> Good: {{ current.good }}</span>
        <span class="text-wd-red-800"> Cost: {{ current.cost }}</span>
        <span v-if="realData && realError" class="text-wd-red-800"> · {{ realError }}</span>
      </div>
    </div>

    <div class="py-6 px-4">
      <div
        class="relative mx-auto bg-background overflow-hidden"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-3xl rounded-2xl border border-border shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '640px' }"
      >
        <div class="h-full overflow-y-auto" :class="isMobile ? 'p-4' : 'p-8'">
          <p class="text-xs uppercase tracking-[0.3em] text-secondary font-display">My plan</p>

          <!-- B / D: the one list, above the deck -->
          <section v-if="(variant === 'B' || variant === 'D') && matches.length" class="mt-4" data-testid="friends-list">
            <h2 class="font-display text-2xl leading-tight flex items-center gap-2">
              <Users class="size-5 text-primary" /> Your dance friends
              <span class="font-hand text-secondary text-lg">— {{ matches.length }}</span>
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">You both said yes — in My plan or on a festival’s page.</p>
            <ul class="mt-4 grid grid-cols-1 gap-3">
              <li
                v-for="(m, i) in matches" :key="m.dancerId"
                class="min-w-0 rounded-2xl border bg-card p-4 shadow-wd-card"
                :class="variant === 'D' && i === 0 ? 'border-primary/40' : 'border-border'"
              >
                <div class="flex items-center gap-3" :class="isMobile ? 'flex-wrap' : ''">
                  <img v-if="m.photo" :src="sizedImage(m.photo, IMG.avatar)" :alt="m.name" class="size-12 rounded-full object-cover shrink-0">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-bold truncate">{{ m.name }}</span>
                      <span v-if="variant === 'D' && i === 0" class="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-eyebrow font-bold uppercase tracking-wider">New</span>
                    </div>
                    <p class="text-xs text-muted-foreground truncate">{{ m.city }} · {{ m.styles.join(', ') }} · matched {{ ago(m.matchedAt) }} in {{ where(m) }}</p>
                  </div>
                  <!-- B: say hi is THE step -->
                  <a
                    v-if="variant === 'B' && hiHref(m)" :href="hiHref(m)!" target="_blank" rel="noopener"
                    class="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 h-9 text-sm font-bold"
                    :class="isMobile ? 'w-full' : ''"
                  >
                    <Instagram v-if="m.instagram" class="size-4" /><MessageCircle v-else class="size-4" /> Say hi
                  </a>
                  <span v-else-if="variant === 'B'" class="shrink-0 text-xs text-muted-foreground italic">No way to reach them yet</span>
                </div>

                <!-- D: the night is the step, say hi is a small link -->
                <div v-if="variant === 'D'" class="mt-3 rounded-xl bg-muted/60 p-3" :class="isMobile ? '' : 'flex items-center gap-3'">
                  <template v-if="m.night">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-wd-green-700">{{ nightLine(m) }}</p>
                      <p class="font-semibold truncate"><CalendarDays class="inline size-4 -mt-0.5" /> {{ when(m.night) }} · {{ m.night.name }}</p>
                      <p class="text-xs text-muted-foreground truncate"><MapPin class="inline size-3 -mt-0.5" /> {{ m.night.venue }}</p>
                    </div>
                    <button
                      v-if="!m.night.youGoing" type="button"
                      class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-sm font-bold"
                      :class="[going.has(m.night.eventId) ? 'bg-wd-green-600 text-white' : 'bg-primary text-primary-foreground', isMobile ? 'mt-2' : '']"
                      @click="toggleGoing(m.night.eventId)"
                    >
                      <Check v-if="going.has(m.night.eventId)" class="size-4" /><Heart v-else class="size-4" />
                      {{ going.has(m.night.eventId) ? 'In your plan' : m.night.theyGoing ? 'I’m going too' : 'I’m going' }}
                    </button>
                  </template>
                  <template v-else-if="m.festivals.length">
                    <p class="flex-1 text-sm"><Ticket class="inline size-4 -mt-0.5" /> See you at <span class="font-semibold">{{ m.festivals[0].name }}</span> — plan a dance there.</p>
                    <NuxtLink :to="`${festivalPath(m.festivals[0].slug)}#discover`" class="shrink-0 text-sm font-bold text-primary hover:underline">Open festival</NuxtLink>
                  </template>
                  <p v-else class="text-sm text-muted-foreground">No night out in the next two weeks yet.</p>
                </div>
                <p v-if="variant === 'D' && hiHref(m)" class="mt-2 text-xs">
                  or <a :href="hiHref(m)!" target="_blank" rel="noopener" class="font-bold text-primary hover:underline">say hi to {{ first(m.name) }}</a>
                </p>
              </li>
            </ul>
          </section>

          <!-- A / C: one match card above the deck -->
          <section v-if="(variant === 'A' || variant === 'C') && deckCard" class="mt-4 rounded-3xl border-2 border-primary/30 bg-card p-5 shadow-wd-card text-center" data-testid="match-card">
            <div class="flex justify-center -space-x-4">
              <img :src="ME.photo" alt="You" class="size-20 rounded-full object-cover border-4 border-background">
              <img v-if="deckCard.photo" :src="sizedImage(deckCard.photo, IMG.avatar)" :alt="deckCard.name" class="size-20 rounded-full object-cover border-4 border-background">
            </div>
            <p class="mt-3 font-display text-2xl leading-tight">You and {{ first(deckCard.name) }} both said yes</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ deckCard.city }} · {{ deckCard.styles.join(', ') }}</p>
            <div v-if="deckCard.night" class="mt-4 rounded-2xl bg-muted/60 p-4 text-left">
              <p class="text-xs font-bold text-wd-green-700">{{ nightLine(deckCard) }}</p>
              <p class="font-semibold">{{ when(deckCard.night) }} · {{ deckCard.night.name }}</p>
              <p class="text-xs text-muted-foreground">{{ deckCard.night.venue }}</p>
              <button
                type="button"
                class="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 h-10 text-sm font-bold"
                :class="going.has(deckCard.night.eventId) ? 'bg-wd-green-600 text-white' : 'bg-primary text-primary-foreground'"
                @click="toggleGoing(deckCard.night.eventId)"
              >
                <Check v-if="going.has(deckCard.night.eventId)" class="size-4" />
                {{ going.has(deckCard.night.eventId) ? 'In your plan — see you there' : deckCard.night.theyGoing ? 'I’m going too' : 'Go that night' }}
              </button>
            </div>
            <p v-else-if="deckCard.festivals.length" class="mt-4 text-sm">See you at <span class="font-semibold">{{ deckCard.festivals[0].name }}</span>.</p>
            <div class="mt-3 flex justify-center gap-4 text-xs">
              <button type="button" class="font-bold text-muted-foreground hover:text-foreground" @click="dismiss(deckCard.dancerId)">
                {{ matches.length - dismissed.size > 1 ? 'Next match' : 'Close' }}
              </button>
              <button v-if="variant === 'C'" type="button" class="font-bold text-primary inline-flex items-center gap-1" @click="emailOpen = !emailOpen">
                <Mail class="size-3.5" /> What {{ first(deckCard.name) }} got by email
              </button>
            </div>

            <!-- C: the email the other dancer receives -->
            <div v-if="variant === 'C' && emailOpen" class="mt-4 rounded-2xl border border-border bg-background p-4 text-left text-sm" data-testid="email-preview">
              <p class="text-xs text-muted-foreground">From WeDance · to {{ first(deckCard.name) }}</p>
              <p class="mt-1 font-bold">{{ ME.name }} said yes too</p>
              <p class="mt-2">Hi {{ first(deckCard.name) }}, you and {{ ME.name }} both want to dance with each other.
                <template v-if="deckCard.night"> {{ deckCard.night.theyGoing ? 'You’re going to' : 'How about' }} {{ deckCard.night.name }}, {{ when(deckCard.night) }}?</template>
              </p>
              <span class="mt-3 inline-flex rounded-full bg-primary text-primary-foreground px-4 h-9 items-center font-bold">See it in My plan</span>
              <p class="mt-3 text-xs text-muted-foreground">One email per new match, at most one a day. Turn off in Settings → Emails.</p>
            </div>
          </section>
          <p v-if="variant === 'C'" class="mt-2 text-xs text-center text-muted-foreground">
            Deck copy changes to: “Yes = you’d like to dance with them. If they say yes too, we tell you both.”
          </p>

          <!-- Empty state -->
          <div v-if="!matches.length || ((variant === 'A' || variant === 'C') && !deckCard)" class="mt-4 rounded-2xl border-2 border-dashed border-input p-6 text-center text-sm text-muted-foreground">
            <Sparkles class="size-6 mx-auto mb-2 text-secondary" />
            <template v-if="!matches.length">No match yet. When someone you said yes to says yes back, you’ll both see it here.</template>
            <template v-else>That’s every match for now.</template>
          </div>

          <!-- Mock body: the deck, as on /my-plan -->
          <div class="mt-8">
            <h3 class="font-display text-3xl leading-tight">Meet new friends</h3>
            <p class="mt-1 text-sm text-muted-foreground">Dancers going where you go, and locals who dance like you</p>
            <div class="mt-4 mx-auto max-w-xs rounded-3xl border border-border bg-card overflow-hidden shadow-wd-card opacity-70">
              <img src="https://i.pravatar.cc/400?u=deck-next" alt="" class="w-full h-48 object-cover">
              <div class="p-4">
                <p class="font-bold">Sofia, Munich</p>
                <p class="text-xs text-muted-foreground">Salsa · Kizomba</p>
              </div>
            </div>
            <p class="mt-3 text-center text-xs italic text-secondary font-display">Drag or use the buttons · 12 left</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
