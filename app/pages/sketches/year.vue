<script setup lang="ts">
/**
 * Sketch: "Steal from friends → postcard from Dec 31"
 *
 * Combines Crazy 8s #7 (social input — assemble your year by stealing from
 * friends' picks) with #8 (narrative output — the saved artifact is a
 * postcard from future-you, not a checklist). Tappable local prototype only,
 * not wired to DB. Mock data for friends + festivals.
 */
import { Plus, Check, Heart, Share2, Camera, MapPin } from 'lucide-vue-next'

definePageMeta({ layout: false })

type Festival = {
  slug: string
  name: string
  city: string
  dateLabel: string
  ticketEur: number
}

const FESTIVALS: Record<string, Festival> = {
  meneate: { slug: 'meneate', name: '¡Menéate Viena!', city: 'Vienna', dateLabel: 'Mar 26–29', ticketEur: 85 },
  cubanFire: { slug: 'cubanFire', name: 'Cuban Fire', city: 'Munich', dateLabel: 'Mar 14–15', ticketEur: 55 },
  caribbean: { slug: 'caribbean', name: 'Caribbean Urban Fire', city: 'Munich', dateLabel: 'Mar 21–22', ticketEur: 50 },
  charanga: { slug: 'charanga', name: 'Charanga Habanera', city: 'Munich', dateLabel: 'May 23', ticketEur: 65 },
  berlinSO: { slug: 'berlinSO', name: 'Salsa Open Berlin', city: 'Berlin', dateLabel: 'Sep 18–20', ticketEur: 90 },
  timbaLDN: { slug: 'timbaLDN', name: 'Timba Fest London', city: 'London', dateLabel: 'Oct 9–11', ticketEur: 110 },
}

type Source = { name: string; emoji: string; tagline: string; picks: string[] }

// State 0 / 1 — cold-start: editorial archetypes. The platform has an opinion.
// No social graph required, no consent issues, no chicken-and-egg.
const ARCHETYPES: Source[] = [
  {
    name: 'The Spicy Local',
    emoji: '🌶️',
    tagline: 'Munich every weekend, one big trip in summer.',
    picks: ['cubanFire', 'caribbean', 'charanga'],
  },
  {
    name: 'The Festival Tourist',
    emoji: '✈️',
    tagline: '6 cities, 8 events, one new style each.',
    picks: ['meneate', 'berlinSO', 'timbaLDN'],
  },
  {
    name: 'The Timba Purist',
    emoji: '🔥',
    tagline: 'Only nights with a real live Cuban band.',
    picks: ['charanga', 'berlinSO', 'timbaLDN'],
  },
]

// State 3 — warm: actual friends with picks. Names + flags.
const FRIENDS: Source[] = [
  {
    name: 'Maxine',
    emoji: '🇰🇪',
    tagline: 'Casino · Rumba · Vienna-anchored',
    picks: ['meneate', 'cubanFire', 'charanga'],
  },
  {
    name: 'Dayron',
    emoji: '🇨🇺',
    tagline: 'Timba purist · will travel for a real band',
    picks: ['charanga', 'berlinSO', 'timbaLDN'],
  },
  {
    name: 'Mark',
    emoji: '🇩🇪',
    tagline: 'Salsa lead · weekends only',
    picks: ['cubanFire', 'berlinSO', 'meneate'],
  },
]

const route = useRoute()
const isWarm = computed(() => route.query.state === 'warm')
const sources = computed<Source[]>(() => (isWarm.value ? FRIENDS : ARCHETYPES))
const sectionTitle = computed(() => (isWarm.value ? 'People you trust' : 'Years to copy'))
const sectionSubtitle = computed(() =>
  isWarm.value
    ? 'Your friends already mapped their 2026. Take what fits.'
    : "You don't need friends here yet. Pick a vibe, steal it, change anything.",
)

const mySlugs = ref<Set<string>>(new Set())

const myFestivals = computed(() =>
  Array.from(mySlugs.value).map(s => FESTIVALS[s]).filter(Boolean),
)

const stealAll = (source: Source) => {
  source.picks.forEach(s => mySlugs.value.add(s))
  mySlugs.value = new Set(mySlugs.value) // trigger reactivity on Set
}

const toggle = (slug: string) => {
  if (mySlugs.value.has(slug)) mySlugs.value.delete(slug)
  else mySlugs.value.add(slug)
  mySlugs.value = new Set(mySlugs.value)
}

const friendsWithOverlap = computed(() => {
  const myCount = mySlugs.value.size
  if (myCount === 0) return []
  return sources.value.map(f => ({
    name: f.name,
    shared: f.picks.filter(p => mySlugs.value.has(p)).length,
  })).filter(x => x.shared > 0)
})

const totalEur = computed(() =>
  myFestivals.value.reduce((sum, f) => sum + f.ticketEur, 0),
)

const cities = computed(() => {
  const arr = Array.from(new Set(myFestivals.value.map(f => f.city)))
  if (arr.length === 0) return null
  if (arr.length === 1) return arr[0]
  if (arr.length === 2) return arr.join(' and ')
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1]
})

const friendListInline = computed(() => {
  const friends = friendsWithOverlap.value.map(f => f.name)
  if (friends.length === 0) return null
  if (friends.length === 1) return friends[0]
  if (friends.length === 2) return friends.join(' and ')
  return friends.slice(0, -1).join(', ') + ', and ' + friends[friends.length - 1]
})

const reelsGoal = ref<number | null>(null)
const movesGoal = ref<number | null>(null)

const saved = ref(false)
const saveMyYear = () => { saved.value = true }

useHead({
  title: 'Plan your 2026 dance year — sketch',
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f5f1] text-stone-900">
    <header class="border-b border-stone-200 bg-white">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="font-bold">WeDance</div>
        <div class="text-xs text-stone-500">Sketch · /sketches/year</div>
      </div>
    </header>

    <section class="max-w-5xl mx-auto px-4 pt-10 pb-6">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight">
        Build your 2026 dance year.
      </h1>
      <p class="text-stone-600 mt-2 max-w-2xl text-base">
        Don't start from scratch. Steal from people you trust — then watch a postcard from December write itself.
      </p>
    </section>

    <section class="max-w-5xl mx-auto px-4 pb-6">
      <div class="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 class="text-xs uppercase tracking-wider font-semibold text-stone-500">
            {{ sectionTitle }}
          </h2>
          <p class="text-sm text-stone-500 mt-1">{{ sectionSubtitle }}</p>
        </div>
        <NuxtLink
          :to="isWarm ? '/sketches/year' : '/sketches/year?state=warm'"
          class="text-[11px] uppercase tracking-wider font-semibold text-stone-500 border border-stone-300 px-2.5 py-1 rounded-full hover:border-stone-500 hover:text-stone-700 transition-colors"
        >
          Compare: {{ isWarm ? 'cold-start →' : 'with friends →' }}
        </NuxtLink>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          v-for="source in sources"
          :key="source.name"
          class="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-base sm:text-lg font-semibold truncate">{{ source.emoji }} {{ source.name }}</div>
              <div class="text-xs text-stone-500 mt-0.5">{{ source.tagline }}</div>
            </div>
            <button
              class="shrink-0 text-xs font-semibold uppercase tracking-wider bg-stone-900 text-white px-3 py-1.5 rounded-full hover:bg-stone-700 transition-colors"
              @click="stealAll(source)"
            >
              Steal all
            </button>
          </div>
          <ul class="flex flex-col gap-1.5">
            <li
              v-for="slug in source.picks"
              :key="slug"
              class="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 hover:bg-stone-50 cursor-pointer"
              @click="toggle(slug)"
            >
              <div class="min-w-0">
                <div class="text-sm font-medium truncate">{{ FESTIVALS[slug].name }}</div>
                <div class="text-[11px] text-stone-500 flex items-center gap-1">
                  <MapPin class="w-3 h-3" /> {{ FESTIVALS[slug].city }} · {{ FESTIVALS[slug].dateLabel }}
                </div>
              </div>
              <div
                class="ml-3 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="mySlugs.has(slug) ? 'bg-stone-900 border-stone-900' : 'border-stone-300'"
              >
                <Check v-if="mySlugs.has(slug)" class="w-3.5 h-3.5 text-white" />
                <Plus v-else class="w-3.5 h-3.5 text-stone-400" />
              </div>
            </li>
          </ul>
        </div>
      </div>

      <!-- Cold-start: invite friends prompt under the archetypes -->
      <div
        v-if="!isWarm"
        class="mt-4 rounded-xl border border-dashed border-stone-300 bg-white/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
      >
        <div class="text-sm text-stone-600 min-w-0">
          <span class="font-medium text-stone-800">No friends here yet?</span>
          When yours arrive, their years show above the archetypes.
        </div>
        <div class="flex gap-2">
          <button class="text-xs font-medium border border-stone-300 bg-white text-stone-700 px-3 py-1.5 rounded-full hover:bg-stone-50">
            Invite via Telegram
          </button>
          <button class="text-xs font-medium border border-stone-300 bg-white text-stone-700 px-3 py-1.5 rounded-full hover:bg-stone-50">
            Skip — keep stealing
          </button>
        </div>
      </div>
    </section>

    <!-- The postcard -->
    <section class="max-w-5xl mx-auto px-4 pb-24">
      <h2 class="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-3 mt-4">
        Postcard from Dec 31, 2026
      </h2>
      <div class="relative">
        <!-- Postcard card -->
        <div
          class="bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><rect width=%2240%22 height=%2240%22 fill=%22%23faf6ed%22/><circle cx=%222%22 cy=%222%22 r=%220.4%22 fill=%22%23c0a87a%22 opacity=%220.35%22/></svg>')] border border-stone-300 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
        >
          <!-- Decorative postage -->
          <div class="absolute top-4 right-4 sm:top-6 sm:right-6 border border-stone-300 bg-white/70 px-2 py-1 rounded-sm text-[10px] uppercase tracking-widest text-stone-500">
            Dec 31 · 2026
          </div>

          <p class="font-serif text-lg sm:text-xl leading-relaxed text-stone-800 max-w-2xl">
            Dear Alex —
          </p>

          <p class="font-serif text-base sm:text-lg leading-relaxed text-stone-800 max-w-2xl mt-3">
            This year you danced
            <span v-if="cities" class="font-semibold bg-yellow-100/70 px-1 rounded">in {{ cities }}</span>
            <span v-else class="text-stone-300 italic">in ______</span>,
            with
            <span v-if="friendListInline" class="font-semibold bg-yellow-100/70 px-1 rounded">{{ friendListInline }}</span>
            <span v-else class="text-stone-300 italic">______</span>,
            and met
            <span v-if="myFestivals.length" class="font-semibold bg-yellow-100/70 px-1 rounded">a few hundred</span>
            <span v-else class="text-stone-300 italic">______</span>
            new partners across
            <span v-if="myFestivals.length" class="font-semibold bg-yellow-100/70 px-1 rounded">{{ myFestivals.length }}</span>
            <span v-else class="text-stone-300 italic">______</span>
            festivals.
          </p>

          <p class="font-serif text-base sm:text-lg leading-relaxed text-stone-800 max-w-2xl mt-3">
            You spent
            <span v-if="totalEur" class="font-semibold bg-yellow-100/70 px-1 rounded">€{{ totalEur }}</span>
            <span v-else class="text-stone-300 italic">€______</span>
            on tickets. You filmed
            <input
              v-model.number="reelsGoal"
              type="number"
              min="0"
              max="999"
              inputmode="numeric"
              placeholder="__"
              class="font-serif font-semibold text-stone-800 bg-yellow-100/70 rounded px-1 w-12 text-center focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-stone-300 placeholder:font-normal placeholder:italic [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            >
            reels and learned
            <input
              v-model.number="movesGoal"
              type="number"
              min="0"
              max="999"
              inputmode="numeric"
              placeholder="__"
              class="font-serif font-semibold text-stone-800 bg-yellow-100/70 rounded px-1 w-12 text-center focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-stone-300 placeholder:font-normal placeholder:italic [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            >
            new moves.
          </p>

          <p class="font-serif text-base sm:text-lg leading-relaxed text-stone-800 max-w-2xl mt-4">
            Sincerely,<br>
            <span class="italic">future you.</span>
          </p>

          <!-- Stamp / chips for picked festivals -->
          <div v-if="myFestivals.length" class="mt-6 flex flex-wrap gap-2">
            <span
              v-for="f in myFestivals"
              :key="f.slug"
              class="inline-flex items-center gap-1.5 text-xs font-medium bg-white/70 border border-stone-300 px-2.5 py-1 rounded-full"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {{ f.name }} · {{ f.dateLabel }}
            </span>
          </div>
        </div>
      </div>

      <!-- Save bar -->
      <div class="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div class="text-sm text-stone-600">
          <span v-if="myFestivals.length">
            <span class="font-semibold text-stone-900">{{ myFestivals.length }}</span>
            festival<span v-if="myFestivals.length !== 1">s</span> ·
            <span class="font-semibold text-stone-900">€{{ totalEur }}</span> ticket budget
          </span>
          <span v-else class="text-stone-400">Steal a festival to start the postcard.</span>
        </div>
        <div class="flex gap-2">
          <button
            class="text-sm font-medium border border-stone-300 bg-white text-stone-700 px-4 py-2 rounded-full hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            :disabled="!myFestivals.length"
          >
            <Share2 class="w-4 h-4" /> Share postcard
          </button>
          <button
            class="text-sm font-semibold bg-stone-900 text-white px-5 py-2 rounded-full hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            :disabled="!myFestivals.length"
            @click="saveMyYear"
          >
            <Heart v-if="!saved" class="w-4 h-4" />
            <Check v-else class="w-4 h-4" />
            {{ saved ? 'Saved' : 'Save my year' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
