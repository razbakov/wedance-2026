<script setup lang="ts">
/**
 * Sketch (RAZ-1006): what My plan's near-term sections are and what goes in each.
 *
 * Today the headings name a time ("Tonight", "This week", "This month") but each is
 * filled by a KIND of thing: Tonight = hangouts only, This week = nights out in the
 * next 7 days (today included), This month = every course, whatever its date. So
 * tonight's party sits under "This week" while Tonight says "Nothing planned yet",
 * and a class this Sunday sits under "This month".
 *
 * Four directions, clickable, mock data only (today = Mon 16 Nov, Munich).
 * Nothing is loaded or written.
 */
import { Plus, Utensils, Car, Beer, Calendar, MapPin, X, Share2, Sparkles, GraduationCap, Music, ArrowRight, Check, Users, Tent } from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — My plan sections sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Honest names',
    idea: 'Keep today’s four lists, rename them to what they hold: "Hangouts tonight", "Your nights out", "Your courses", "Your festivals". No section claims a time it doesn’t mean.',
    good: 'Smallest change: headings and summary lines only. Nothing contradicts anything any more.',
    cost: 'Still four lists to scan for "what am I doing tonight". Tonight’s party stays in nights out, apart from the hangouts that go with it. The near → far story of the page is gone.',
  },
  {
    id: 'B',
    name: 'Pure agenda',
    idea: 'Everything goes by date only: Tonight / This week (to Sunday) / Later. Nights out, classes and hangouts are one list; a hangout sits under the event it is for. Courses and festivals are just dated rows.',
    good: 'Answers "what am I doing when" in one read. Today’s party, its dinner and tonight’s class are together.',
    cost: 'No home for a course as a thing you have (enroll, drop, pay): it is only its next class. Festivals months away blur into "Later".',
  },
  {
    id: 'C',
    name: 'Recommended: agenda + what you have',
    idea: 'Two time sections — Tonight (today’s nights and classes, each with its hangouts, plus "I’m out") and This week (the rest to Sunday, nights and classes, with the weekend story) — then two "what you have" sections: Your courses and This year.',
    good: 'Time headings mean time, kind headings mean kind. Tonight is never empty when you’re going out. Courses keep a place to enroll and drop; the class itself shows on its day.',
    cost: 'A course shows twice (its class under the day, the course under Your courses). The weekend story needs a rule: nights only, or classes too.',
  },
  {
    id: 'D',
    name: 'Day strip',
    idea: 'One "Your week" block with a day strip (Today, Tue … Sun). Tap a day → that day’s nights, classes and hangouts. Your courses and This year below, as in C.',
    good: 'App-like and compact: one block instead of two, every day one tap away, dots show which days have something.',
    cost: 'Hides the week at a glance — you see one day at a time. The weekend story and "N nights out" need the whole week, so they sit above the strip.',
  },
]

const variant = ref<Variant>('C')
const device = ref<'desktop' | 'mobile'>('desktop')
const state = ref<'busy' | 'quiet' | 'empty'>('busy')
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Mock data — "today" is Mon 16 Nov 2026 ───────────────────────────────────
const DAYS = [
  { key: '16', short: 'Mon', label: 'Today' }, { key: '17', short: 'Tue', label: 'Tue' }, { key: '18', short: 'Wed', label: 'Wed' },
  { key: '19', short: 'Thu', label: 'Thu' }, { key: '20', short: 'Fri', label: 'Fri' }, { key: '21', short: 'Sat', label: 'Sat' }, { key: '22', short: 'Sun', label: 'Sun' },
]
type Kind = 'night' | 'class'
type Item = { id: string, kind: Kind, day: string, time: string, name: string, venue: string, style: string, color: string, friends: number, courseId?: string }
type Hangout = { id: string, kind: 'dinner' | 'ride' | 'bar', time: string, title: string, host: string, forId: string | null, going: number, mine?: boolean }
type Course = { id: string, name: string, school: string, style: string, color: string, next: string, venue: string, sessions: string }
type Festival = { slug: string, name: string, when: string, city: string }

const ALL_ITEMS: Item[] = [
  { id: 'baila', kind: 'night', day: '16', time: '17:00', name: 'Baila en Cuba', venue: 'Havana', style: 'Casino', color: 'var(--wd-red-600)', friends: 3 },
  { id: 'lady', kind: 'class', day: '18', time: '19:00', name: 'Bachata Lady Style', venue: 'Tanzschule Mitte', style: 'Bachata', color: 'var(--wd-purple-500)', friends: 0, courseId: 'c-lady' },
  { id: 'timberia', kind: 'night', day: '19', time: '19:00', name: 'La Timberia — Live Band & Party with DJ Hamza', venue: 'La Timberia', style: 'Salsa', color: 'var(--wd-red-600)', friends: 5 },
  { id: 'bailala', kind: 'night', day: '21', time: '22:00', name: 'Bailala Saturday', venue: 'Bailala', style: 'Bachata', color: 'var(--wd-purple-500)', friends: 2 },
  { id: 'casino', kind: 'class', day: '22', time: '20:00', name: 'Casino Partnerwork', venue: 'Buena Vista Bar', style: 'Salsa', color: 'var(--wd-amber-600)', friends: 1, courseId: 'c-casino' },
]
const ALL_HANGOUTS: Hangout[] = [
  { id: 'h1', kind: 'dinner', time: '15:30', title: 'Tacos before Baila en Cuba', host: 'Maria', forId: 'baila', going: 4 },
  { id: 'h2', kind: 'ride', time: '16:20', title: 'Ride from Schwabing, 2 seats', host: 'Jonas', forId: 'baila', going: 1 },
  { id: 'h3', kind: 'bar', time: '22:30', title: 'Drinks after, anyone?', host: 'Lea', forId: null, going: 2 },
]
const ALL_COURSES: Course[] = [
  { id: 'c-casino', name: 'Casino Partnerwork', school: 'Salsa Libre', style: 'Salsa', color: 'var(--wd-amber-600)', next: 'Sun 22 Nov, 20:00', venue: 'Buena Vista Bar', sessions: 'Class 3 of 8' },
  { id: 'c-lady', name: 'Bachata Lady Style', school: 'Tanzschule Mitte', style: 'Bachata', color: 'var(--wd-purple-500)', next: 'Wed 18 Nov, 19:00', venue: 'Tanzschule Mitte', sessions: 'Class 5 of 6' },
]
const LATER: Item[] = [
  { id: 'casino2', kind: 'class', day: 'Sun 29 Nov', time: '20:00', name: 'Casino Partnerwork', venue: 'Buena Vista Bar', style: 'Salsa', color: 'var(--wd-amber-600)', friends: 1, courseId: 'c-casino' },
]
const FESTIVALS: Festival[] = [
  { slug: 'salsa-bavaria', name: 'Salsa Bavaria', when: '12–15 Feb', city: 'Munich' },
  { slug: 'berlin-congress', name: 'Berlin Salsa Congress', when: '19–22 Mar', city: 'Berlin' },
]

// ── Local, resettable UI state ───────────────────────────────────────────────
const removed = ref<Set<string>>(new Set())
const extraHangouts = ref<Hangout[]>([])
const formOpen = ref(false)
const formTitle = ref('')
const formFor = ref<string>('')
const storyOpen = ref(false)
const enrollOpen = ref(false)
const day = ref('16')
watch([variant, device, state], () => {
  removed.value = new Set(); extraHangouts.value = []; formOpen.value = false; formTitle.value = ''
  storyOpen.value = false; enrollOpen.value = false; day.value = '16'
})

const items = computed(() => {
  const base = state.value === 'empty' ? [] : state.value === 'quiet' ? ALL_ITEMS.filter(i => i.id === 'casino' || i.id === 'timberia') : ALL_ITEMS
  return base.filter(i => !removed.value.has(i.id))
})
const hangouts = computed(() => {
  const base = state.value === 'busy' ? ALL_HANGOUTS : state.value === 'quiet' ? ALL_HANGOUTS.filter(h => h.id === 'h3') : []
  return [...base, ...extraHangouts.value]
})
const courses = computed(() => (state.value === 'empty' ? [] : state.value === 'quiet' ? ALL_COURSES.slice(0, 1) : ALL_COURSES).filter(c => !removed.value.has(c.id)))
const festivals = computed(() => state.value === 'empty' ? [] : FESTIVALS)

const today = computed(() => items.value.filter(i => i.day === '16'))
const restOfWeek = computed(() => items.value.filter(i => i.day !== '16'))
const nights = computed(() => items.value.filter(i => i.kind === 'night'))
const hangoutsFor = (id: string) => hangouts.value.filter(h => h.forId === id)
const looseHangouts = computed(() => hangouts.value.filter(h => !h.forId || !today.value.some(i => i.id === h.forId)))
const dayItems = (key: string) => items.value.filter(i => i.day === key)
const dayHas = (key: string) => dayItems(key).length > 0 || (key === '16' && hangouts.value.length > 0)
const dayName = (key: string) => {
  const d = DAYS.find(x => x.key === key)
  return key === '16' ? 'Today' : `${d?.short} ${key} Nov`
}

const remove = (id: string) => { removed.value = new Set([...removed.value, id]) }
function postHangout() {
  if (!formTitle.value.trim()) return
  extraHangouts.value = [...extraHangouts.value, { id: `x${Date.now()}`, kind: 'bar', time: 'now', title: formTitle.value.trim(), host: 'You', forId: formFor.value || null, going: 1, mine: true }]
  formOpen.value = false; formTitle.value = ''; formFor.value = ''
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const hangoutIcon = (k: Hangout['kind']) => k === 'dinner' ? Utensils : k === 'ride' ? Car : Beer
const tonightLine = computed(() => {
  const parts = [today.value.length ? plural(today.value.length, 'plan') : '', hangouts.value.length ? plural(hangouts.value.length, 'hangout') : '']
  return parts.filter(Boolean).join(' · ') || 'Nothing planned tonight'
})
const weekLine = computed(() => {
  const n = restOfWeek.value.filter(i => i.kind === 'night').length
  const c = restOfWeek.value.filter(i => i.kind === 'class').length
  return [n ? plural(n, 'night') + ' out' : '', c ? plural(c, 'class', 'classes') : ''].filter(Boolean).join(' · ') || 'Nothing else this week'
})
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">My plan · sections</span>
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
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="s in (['busy', 'quiet', 'empty'] as const)" :key="s" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="state === s ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="state = s"
          >{{ s === 'busy' ? 'Busy week' : s === 'quiet' ? 'Nothing today' : 'Empty plan' }}</button>
        </div>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 text-xs leading-relaxed">
        <span class="font-bold">{{ current.id }} · {{ current.name }}.</span>
        <span class="text-muted-foreground"> {{ current.idea }}</span>
        <span class="text-wd-green-700"> Good: {{ current.good }}</span>
        <span class="text-wd-red-800"> Cost: {{ current.cost }}</span>
      </div>
    </div>

    <div class="py-6 px-4">
      <div
        class="relative mx-auto bg-background overflow-hidden"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-4xl rounded-2xl border border-border shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '640px' }"
      >
        <div class="h-full overflow-y-auto" :class="isMobile ? 'p-4' : 'p-8'" data-testid="sketch-body">
          <p class="text-xs uppercase tracking-[0.3em] text-secondary font-display text-center">My plan</p>
          <h1 class="mt-1 font-display text-center" :class="isMobile ? 'text-3xl' : 'text-4xl'">Hey, Alex</h1>
          <p class="mt-1 text-center text-sm text-muted-foreground">Monday 16 November · Munich</p>

          <!-- ═════════════ Shared bits as inline templates ═════════════ -->

          <!-- I'm out form (B, C, D) -->
          <template v-if="formOpen">
            <div class="mt-4 rounded-2xl bg-card border border-border p-4" data-testid="hangout-form">
              <p class="text-sm font-bold">You’re out tonight — what’s the plan?</p>
              <input v-model="formTitle" placeholder="Drinks at Havana after the party" class="mt-2 w-full rounded-lg border border-input bg-background px-3 h-9 text-sm">
              <select v-if="variant !== 'A'" v-model="formFor" class="mt-2 w-full rounded-lg border border-input bg-background px-3 h-9 text-sm">
                <option value="">Not tied to an event</option>
                <option v-for="i in today" :key="i.id" :value="i.id">For {{ i.name }}</option>
              </select>
              <div class="mt-3 flex gap-2">
                <button type="button" class="rounded-full bg-primary text-primary-foreground px-4 h-8 text-xs font-bold" @click="postHangout">Post it</button>
                <button type="button" class="rounded-full px-4 h-8 text-xs font-bold text-muted-foreground" @click="formOpen = false">Cancel</button>
              </div>
            </div>
          </template>

          <!-- ═════════════ A · Honest names ═════════════ -->
          <template v-if="variant === 'A'">
            <section class="mt-10">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">Hangouts tonight</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ hangouts.length ? plural(hangouts.length, 'hangout') : 'Dinners, rides and bar hops around tonight’s parties' }}</p>
                </div>
                <button type="button" class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-wd-brown-900 text-white" @click="formOpen = !formOpen"><Plus class="size-3.5" /> I'm out</button>
              </div>
              <div v-if="!hangouts.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">Nobody's out yet. Post a dinner, a bar hop, or a ride.</div>
              <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                <div v-for="(h, i) in hangouts" :key="h.id" class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                  <component :is="hangoutIcon(h.kind)" class="size-4 shrink-0 text-secondary" />
                  <span class="text-sm font-bold w-12">{{ h.time }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-bold truncate">{{ h.title }}</div>
                    <div class="text-xs text-muted-foreground truncate">{{ h.host }} · {{ h.going }} going<template v-if="h.forId"> · for {{ ALL_ITEMS.find(x => x.id === h.forId)?.name }}</template></div>
                  </div>
                </div>
              </div>
            </section>

            <section class="mt-12">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">Your nights out</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ nights.length ? `${plural(nights.length, 'night')} in the next 7 days` : 'No nights picked for the next 7 days' }}</p>
                </div>
                <span class="text-xs italic text-secondary font-display">Full week →</span>
              </div>
              <div v-if="nights.length" class="rounded-2xl bg-white border border-border overflow-hidden">
                <div v-for="(s, i) in nights" :key="s.id" class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                  <span class="w-12 text-center text-eyebrow font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-tight bg-muted">{{ s.day === '16' ? 'Today' : DAYS.find(d => d.key === s.day)?.short }}<span class="block font-bold normal-case tracking-normal">{{ s.day }} Nov</span></span>
                  <span class="text-sm font-bold">{{ s.time }}</span>
                  <div class="min-w-0 flex-1"><div class="text-sm font-bold truncate">{{ s.name }}</div><div class="text-xs text-muted-foreground truncate">{{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span></div></div>
                  <button type="button" class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap" :aria-label="`${s.name} is in your plan — tap to remove`" @click="remove(s.id)">{{ isMobile ? '✓' : '✓ My plan' }}</button>
                </div>
              </div>
              <div v-else class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">Pick the nights you're going out from this week in Munich.</div>
            </section>

            <section class="mt-12">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">Your courses</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ courses.length ? plural(courses.length, 'course') : 'No course yet' }}</p>
                </div>
                <button type="button" class="text-xs italic text-secondary font-display" @click="enrollOpen = !enrollOpen">+ Enroll</button>
              </div>
              <div class="grid gap-3" :class="isMobile ? '' : 'grid-cols-2'">
                <div v-for="c in courses" :key="c.id" class="rounded-2xl bg-white p-4 border border-border">
                  <div class="flex justify-between gap-2"><div class="font-bold">{{ c.name }}</div><button type="button" :aria-label="`Drop ${c.name}`" class="text-primary" @click="remove(c.id)"><X class="size-4" /></button></div>
                  <div class="text-xs text-secondary">{{ c.school }} · {{ c.style }}</div>
                  <div class="mt-2 text-xs text-muted-foreground flex items-center gap-1.5"><Calendar class="size-3" /> Next class <strong>{{ c.next }}</strong></div>
                </div>
              </div>
            </section>
          </template>

          <!-- ═════════════ B · Pure agenda ═════════════ -->
          <template v-if="variant === 'B'">
            <section v-for="block in [{ key: 'tonight', title: 'Tonight', list: today }, { key: 'week', title: 'This week', list: restOfWeek }]" :key="block.key" class="mt-10">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">{{ block.title }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ block.key === 'tonight' ? tonightLine : weekLine }}</p>
                </div>
                <button v-if="block.key === 'tonight'" type="button" class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-wd-brown-900 text-white" @click="formOpen = !formOpen"><Plus class="size-3.5" /> I'm out</button>
                <span v-else class="text-xs italic text-secondary font-display">Full week →</span>
              </div>
              <div v-if="!block.list.length && !(block.key === 'tonight' && looseHangouts.length)" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">
                {{ block.key === 'tonight' ? 'Nothing tonight. Find a party, or post "I’m out" and see who joins.' : 'Nothing else this week.' }}
              </div>
              <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                <template v-for="(s, i) in block.list" :key="s.id">
                  <div class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                    <span v-if="block.key !== 'tonight'" class="w-12 text-center text-eyebrow font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-tight bg-muted">{{ DAYS.find(d => d.key === s.day)?.short }}<span class="block font-bold normal-case tracking-normal">{{ s.day }} Nov</span></span>
                    <span class="text-sm font-bold">{{ s.time }}</span>
                    <div class="min-w-0 flex-1">
                      <div class="text-sm font-bold truncate">{{ s.name }}</div>
                      <div class="text-xs text-muted-foreground truncate">{{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span><template v-if="s.kind === 'class'"> · class</template></div>
                    </div>
                    <button type="button" class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap" :aria-label="`${s.name} is in your plan — tap to remove`" @click="remove(s.id)">{{ isMobile ? '✓' : '✓ My plan' }}</button>
                  </div>
                  <div v-for="h in (block.key === 'tonight' ? hangoutsFor(s.id) : [])" :key="h.id" class="flex items-center gap-3 pl-10 pr-4 py-2 bg-muted/40 text-xs">
                    <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                    <span class="font-bold w-10">{{ h.time }}</span>
                    <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                    <button type="button" class="font-bold text-primary">Join</button>
                  </div>
                </template>
                <div v-for="h in (block.key === 'tonight' ? looseHangouts : [])" :key="h.id" class="flex items-center gap-3 px-4 py-2.5 border-t border-border/50 text-xs">
                  <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                  <span class="font-bold w-10">{{ h.time }}</span>
                  <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                  <button type="button" class="font-bold text-primary">Join</button>
                </div>
              </div>
            </section>
            <section class="mt-10">
              <h2 class="text-3xl leading-tight font-display">Later</h2>
              <p class="mt-1 text-sm text-muted-foreground">Next week and beyond</p>
              <div class="mt-3 rounded-2xl bg-white border border-border overflow-hidden">
                <div v-for="(s, i) in [...(courses.some(c => c.id === 'c-casino') ? LATER : [])]" :key="s.id" class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                  <span class="text-xs font-bold w-24 shrink-0">{{ s.day }}</span>
                  <div class="min-w-0 flex-1 text-sm"><strong>{{ s.name }}</strong> <span class="text-xs text-muted-foreground">· class · {{ s.time }}</span></div>
                </div>
                <div v-for="f in festivals" :key="f.slug" class="flex items-center gap-3 px-4 py-3 border-t border-border/50">
                  <span class="text-xs font-bold w-24 shrink-0">{{ f.when }}</span>
                  <div class="min-w-0 flex-1 text-sm"><strong>{{ f.name }}</strong> <span class="text-xs text-muted-foreground">· festival · {{ f.city }}</span></div>
                </div>
                <p v-if="!festivals.length && !courses.length" class="px-4 py-4 text-sm text-muted-foreground">Nothing yet.</p>
              </div>
            </section>
          </template>

          <!-- ═════════════ C · Agenda + what you have ═════════════ -->
          <!-- ═════════════ D · Day strip ═════════════ -->
          <template v-if="variant === 'C' || variant === 'D'">
            <!-- C: Tonight -->
            <section v-if="variant === 'C'" class="mt-10" data-testid="c-tonight">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">Tonight</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ tonightLine }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button type="button" class="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-wd-brown-900 text-white" @click="formOpen = !formOpen"><Plus class="size-3.5" /> I'm out</button>
                  <span v-if="!isMobile" class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-primary bg-primary/10"><span class="size-1.5 rounded-full animate-pulse bg-wd-red-600" /> Live</span>
                </div>
              </div>
              <div v-if="!today.length && !hangouts.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50">
                <Sparkles class="size-6 mx-auto mb-2 text-secondary" />
                <p class="text-sm font-bold">Nothing tonight.</p>
                <p class="text-sm text-muted-foreground">3 parties in Munich tonight — or post “I’m out” and see who joins.</p>
                <span class="mt-3 inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold bg-wd-brown-900 text-white">Tonight in Munich <ArrowRight class="size-3.5" /></span>
              </div>
              <div v-else class="grid gap-3">
                <div v-for="s in today" :key="s.id" class="rounded-2xl bg-white border overflow-hidden" :style="{ borderColor: s.color }">
                  <div class="flex items-center gap-3 px-4 py-3">
                    <component :is="s.kind === 'class' ? GraduationCap : Music" class="size-5 shrink-0" :style="{ color: s.color }" />
                    <span class="text-lg font-bold font-display">{{ s.time }}</span>
                    <div class="min-w-0 flex-1">
                      <div class="font-bold truncate">{{ s.name }}</div>
                      <div class="text-xs text-muted-foreground truncate">{{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span><template v-if="s.friends"> · {{ plural(s.friends, 'friend') }} going</template></div>
                    </div>
                    <button type="button" class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap" :aria-label="`${s.name} is in your plan — tap to remove`" @click="remove(s.id)">{{ isMobile ? '✓' : '✓ My plan' }}</button>
                  </div>
                  <div v-for="h in hangoutsFor(s.id)" :key="h.id" class="flex items-center gap-3 px-4 py-2 border-t border-border/50 bg-muted/40 text-xs">
                    <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                    <span class="font-bold w-10">{{ h.time }}</span>
                    <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                    <button type="button" class="font-bold text-primary">Join</button>
                  </div>
                  <button v-if="!hangoutsFor(s.id).length" type="button" class="w-full text-left px-4 py-2 border-t border-border/50 text-xs text-muted-foreground hover:text-foreground" @click="formOpen = true; formFor = s.id">+ Dinner or a ride before {{ s.name }}?</button>
                </div>
                <div v-if="looseHangouts.length" class="rounded-2xl bg-white border border-border overflow-hidden">
                  <p class="px-4 pt-3 text-eyebrow uppercase tracking-widest font-bold text-secondary">Also out tonight</p>
                  <div v-for="h in looseHangouts" :key="h.id" class="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                    <span class="font-bold w-10">{{ h.time }}</span>
                    <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                    <button type="button" class="font-bold text-primary">Join</button>
                  </div>
                </div>
              </div>
            </section>

            <!-- C: This week -->
            <section v-if="variant === 'C'" class="mt-12" data-testid="c-week">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">This week</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ weekLine }} · to Sunday</p>
                </div>
                <span class="text-xs italic text-secondary font-display shrink-0">Full week →</span>
              </div>
              <div v-if="!restOfWeek.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">Nothing else this week. Pick nights out from this week in Munich.</div>
              <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                <div v-for="(s, i) in restOfWeek" :key="s.id" class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                  <span class="w-12 text-center text-eyebrow font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-tight" :style="{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }">{{ DAYS.find(d => d.key === s.day)?.short }}<span class="block font-bold normal-case tracking-normal">{{ s.day }} Nov</span></span>
                  <span class="text-sm font-bold">{{ s.time }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-bold truncate">{{ s.name }}</div>
                    <div class="text-xs text-muted-foreground truncate">
                      <template v-if="s.kind === 'class'"><GraduationCap class="inline size-3 -mt-0.5" /> Class · </template>{{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span><template v-if="s.friends"> · {{ plural(s.friends, 'friend') }} going</template>
                    </div>
                  </div>
                  <button type="button" class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap" :aria-label="`${s.name} is in your plan — tap to remove`" @click="remove(s.id)">{{ isMobile ? '✓' : '✓ My plan' }}</button>
                </div>
              </div>
            </section>

            <!-- D: Your week, one day at a time -->
            <section v-if="variant === 'D'" class="mt-10" data-testid="d-week">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">Your week</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ nights.length ? plural(nights.length, 'night') + ' out' : 'No nights out yet' }} · {{ plural(items.filter(i => i.kind === 'class').length, 'class', 'classes') }}</p>
                </div>
                <button type="button" class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-wd-brown-900 text-white" @click="formOpen = !formOpen"><Plus class="size-3.5" /> I'm out</button>
              </div>
              <div class="grid grid-cols-7 gap-1 rounded-2xl bg-white border border-border p-1.5">
                <button
                  v-for="d in DAYS" :key="d.key" type="button"
                  class="rounded-xl py-2 text-center"
                  :class="day === d.key ? 'bg-wd-brown-900 text-white' : 'hover:bg-muted'"
                  :data-testid="`day-${d.key}`"
                  @click="day = d.key"
                >
                  <span class="block text-eyebrow font-black uppercase tracking-widest">{{ d.label }}</span>
                  <span class="block text-sm font-bold">{{ d.key }}</span>
                  <span class="mx-auto mt-1 block size-1.5 rounded-full" :class="dayHas(d.key) ? (day === d.key ? 'bg-white' : 'bg-primary') : 'bg-transparent'" />
                </button>
              </div>
              <div class="mt-3">
                <p class="text-sm font-bold mb-2">{{ dayName(day) }}</p>
                <div v-if="!dayItems(day).length && !(day === '16' && hangouts.length)" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">
                  Nothing planned {{ day === '16' ? 'tonight' : 'this day' }}. <span class="font-bold text-primary">See {{ day === '16' ? 'tonight' : dayName(day) }} in Munich →</span>
                </div>
                <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                  <template v-for="(s, i) in dayItems(day)" :key="s.id">
                    <div class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                      <component :is="s.kind === 'class' ? GraduationCap : Music" class="size-4 shrink-0" :style="{ color: s.color }" />
                      <span class="text-sm font-bold">{{ s.time }}</span>
                      <div class="min-w-0 flex-1"><div class="text-sm font-bold truncate">{{ s.name }}</div><div class="text-xs text-muted-foreground truncate">{{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span></div></div>
                      <button type="button" class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap" :aria-label="`${s.name} is in your plan — tap to remove`" @click="remove(s.id)">{{ isMobile ? '✓' : '✓ My plan' }}</button>
                    </div>
                    <div v-for="h in (day === '16' ? hangoutsFor(s.id) : [])" :key="h.id" class="flex items-center gap-3 pl-10 pr-4 py-2 bg-muted/40 text-xs">
                      <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                      <span class="font-bold w-10">{{ h.time }}</span>
                      <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                      <button type="button" class="font-bold text-primary">Join</button>
                    </div>
                  </template>
                  <div v-for="h in (day === '16' ? looseHangouts : [])" :key="h.id" class="flex items-center gap-3 px-4 py-2.5 border-t border-border/50 text-xs">
                    <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                    <span class="font-bold w-10">{{ h.time }}</span>
                    <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                    <button type="button" class="font-bold text-primary">Join</button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Weekend story (C under This week, D under the strip) -->
            <div v-if="nights.length" class="mt-3">
              <button type="button" class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 h-9 text-xs font-bold" @click="storyOpen = !storyOpen">
                <Share2 class="size-3.5" /> Share my week as a story
              </button>
              <div v-if="storyOpen" class="mt-3 mx-auto w-48 aspect-[9/16] rounded-xl p-3 text-white flex flex-col gap-2" style="background: var(--wd-red-600);" data-testid="story">
                <p class="font-display text-lg leading-none">Where I’m dancing this week</p>
                <div v-for="n in nights" :key="n.id" class="rounded bg-black px-2 py-1 text-[10px] leading-tight">
                  <strong>{{ n.day === '16' ? 'TONIGHT' : DAYS.find(d => d.key === n.day)?.short.toUpperCase() }}</strong> · {{ n.name }}
                </div>
                <p class="mt-auto text-[9px] opacity-80">Nights only — classes stay off the story</p>
              </div>
            </div>

            <!-- Your courses (C, D) -->
            <section class="mt-12" data-testid="courses">
              <div class="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-3xl leading-tight font-display">Your courses</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{{ courses.length ? plural(courses.length, 'course') + ' — each class also shows on its day' : 'Weekly classes you’re enrolled in' }}</p>
                </div>
                <button type="button" class="text-xs italic text-secondary font-display shrink-0" @click="enrollOpen = !enrollOpen">+ Enroll</button>
              </div>
              <div v-if="enrollOpen" class="mb-3 rounded-2xl bg-card border border-border p-4 text-sm">
                <p class="font-bold">Courses in Munich for Salsa and Bachata</p>
                <p class="mt-1 text-muted-foreground text-xs">Cuban Basics · Tue 19:30 · La Rumba &nbsp;·&nbsp; Bachata Sensual 2 · Thu 20:00 · Bailala</p>
              </div>
              <div v-if="!courses.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">No course yet. Enroll in one and its classes land on your week.</div>
              <div v-else class="grid gap-3" :class="isMobile ? '' : 'grid-cols-2'">
                <div v-for="c in courses" :key="c.id" class="rounded-2xl bg-white p-4 border" :style="{ borderColor: c.color }">
                  <div class="flex justify-between gap-2"><div class="font-bold">{{ c.name }}</div><button type="button" :aria-label="`Drop ${c.name}`" class="text-primary" @click="remove(c.id)"><X class="size-4" /></button></div>
                  <div class="text-xs text-secondary">{{ c.school }} · {{ c.style }} · {{ c.sessions }}</div>
                  <div class="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div class="flex items-center gap-1.5"><Calendar class="size-3" /> Next class <strong>{{ c.next }}</strong></div>
                    <div class="flex items-center gap-1.5"><MapPin class="size-3" /> {{ c.venue }}</div>
                  </div>
                </div>
              </div>
            </section>
          </template>

          <!-- This year — unchanged in every variant (B folds it into Later) -->
          <section v-if="variant !== 'B'" class="mt-12">
            <h2 class="text-3xl leading-tight font-display">{{ variant === 'A' ? 'Your festivals' : 'This year' }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{{ festivals.length ? plural(festivals.length, 'festival') + ' ahead' : 'No festival yet' }}</p>
            <div class="mt-3 grid gap-3" :class="isMobile ? '' : 'grid-cols-2'">
              <div v-for="f in festivals" :key="f.slug" class="rounded-2xl bg-white border border-border p-4 flex items-center gap-3">
                <Tent class="size-5 text-secondary shrink-0" />
                <div class="min-w-0"><div class="font-bold truncate">{{ f.name }}</div><div class="text-xs text-muted-foreground">{{ f.when }} · {{ f.city }}</div></div>
              </div>
            </div>
          </section>

          <p class="mt-10 text-center text-xs text-muted-foreground"><Users class="inline size-3 -mt-0.5" /> Meet new friends · Your goals · …</p>
        </div>
      </div>
    </div>
  </div>
</template>
