<script setup lang="ts">
/**
 * Sketch: My plan as zoom tabs — Today / Week / Month / Year (follow-up to RAZ-1006).
 *
 * Each tab is a decision horizon:
 *   1. everything that happens in that span, of every kind (a Sunday class shows in
 *      Today on Sunday, in Week and in Month — never only under one "kind" heading);
 *   2. the one plan to make at that scale (tonight: where and with whom; week: which
 *      nights + dinners / a taster; month: commit to a course, payments; year: festivals);
 *   3. the story to post (I'm out tonight · my week · my month · my year).
 * What a tab suggests depends on the dancer: a newcomer is pointed bigger (a taster this
 * week, a course for the month), a regular gets help around the nights they already have.
 *
 * Four directions, clickable. Mock data only (today = Mon 16 Nov 2026, Munich).
 */
import { Plus, Utensils, Car, Beer, Calendar, MapPin, Share2, GraduationCap, Sparkles, Tent, Target, ArrowRight, Check, Users, Wallet, Clock, X } from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — My plan zoom tabs sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D'
type Zoom = 'today' | 'week' | 'month' | 'year'
type Stage = 'regular' | 'newcomer'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Plain tabs',
    idea: 'Today / Week / Month / Year as tabs, always opening on Today. Each tab: what happens in that span (a list, grouped by day or week), then one "plan" card for that scale, then "Share as a story".',
    good: 'Simplest to learn and build; the four words carry the whole idea.',
    cost: 'Opens on Today even when nothing is on tonight. A payment due this month or an early-bird ending this week hides behind a tab you may never open.',
  },
  {
    id: 'B',
    name: 'Smart tabs',
    idea: 'A’s tabs, but the page opens where you have something to do — tonight if you’re out, else your week; a newcomer opens on Week (try a taster). A number on a tab says what needs you there: a dinner forming tonight, a course to pay, an early-bird ending.',
    good: 'Nothing urgent gets lost behind a tab, and every dancer lands on the horizon that matters to them now.',
    cost: 'The page opening on different tabs can surprise ("where did Today go?"). The badge rules need care so they don’t nag.',
  },
  {
    id: 'C',
    name: 'Zoom calendar',
    idea: 'The tabs are zoom levels of one calendar: Year is 12 months with your festivals, Month is a calendar grid with a dot per planned day, Week is the day strip, Today is tonight. Tap a month to zoom in to it, a day to zoom to that day.',
    good: 'Feels like zooming a timeline — the mental model you described. Gaps are visible at a glance ("nothing on Fridays").',
    cost: 'Calendars are heavy on a phone, and a grid of dots says less than a list. Still opens on Today, still hides to-dos.',
  },
  {
    id: 'D',
    name: 'Recommended: zoom + smart',
    idea: 'C’s zoom (year → month → week → day, tap to zoom in) with B’s smart opening tab and to-do numbers. Under the calendar of each level the list of what’s on, then the plan card, then the story.',
    good: 'The timeline model, nothing urgent hidden, and each dancer starts at the right zoom. Week and Year already have their stories; Today and Month get new ones.',
    cost: 'The most to build: a month grid and a year strip are new. Two new stories (tonight, month) to design.',
  },
]

const variant = ref<Variant>('D')
const device = ref<'desktop' | 'mobile'>('desktop')
const stage = ref<Stage>('regular')
const full = ref(true)
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Calendar — today is Mon 16 Nov 2026 ─────────────────────────────────────
const TODAY = '2026-11-16'
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (s: string, n: number) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return iso(d) }
const WEEK = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i)) // 16–22 Nov
const MONTH_END = '2026-11-30'
const dayShort = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })
const dayNum = (s: string) => new Date(`${s}T12:00:00`).getDate()
const dayLong = (s: string) => s === TODAY ? 'Tonight' : new Date(`${s}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

// ── Mock data ────────────────────────────────────────────────────────────────
type Kind = 'night' | 'class' | 'taster'
type Item = { id: string, kind: Kind, date: string, time: string, name: string, venue: string, style: string, color: string, friends: number, state: 'signed' | 'planned', price?: string }
type Hangout = { id: string, kind: 'dinner' | 'ride' | 'bar', time: string, title: string, host: string, forId: string | null, going: number, forming?: boolean }
type Course = { id: string, name: string, school: string, style: string, color: string, when: string, venue: string, progress: string, payDue?: string }
type Festival = { id: string, name: string, month: number, year: number, when: string, city: string, bought: boolean, earlyBird?: string, friends: number }
type Suggestion = { id: string, title: string, sub: string, cta: string, icon: any }

const RED = 'var(--wd-red-600)'
const PURPLE = 'var(--wd-purple-500)'
const AMBER = 'var(--wd-amber-600)'
const GREEN = 'var(--wd-green-600)'

const REGULAR_ITEMS: Item[] = [
  { id: 'baila', kind: 'night', date: '2026-11-16', time: '17:00', name: 'Baila en Cuba', venue: 'Havana', style: 'Casino', color: RED, friends: 3, state: 'signed' },
  { id: 'lady', kind: 'class', date: '2026-11-18', time: '19:00', name: 'Bachata Lady Style', venue: 'Tanzschule Mitte', style: 'Bachata', color: PURPLE, friends: 0, state: 'signed' },
  { id: 'timberia', kind: 'night', date: '2026-11-19', time: '19:00', name: 'La Timberia — Live Band & DJ Hamza', venue: 'La Timberia', style: 'Salsa', color: RED, friends: 5, state: 'planned', price: '€12' },
  { id: 'bailala', kind: 'night', date: '2026-11-21', time: '22:00', name: 'Bailala Saturday', venue: 'Bailala', style: 'Bachata', color: PURPLE, friends: 2, state: 'planned' },
  { id: 'casino', kind: 'class', date: '2026-11-22', time: '20:00', name: 'Casino Partnerwork', venue: 'Buena Vista Bar', style: 'Salsa', color: AMBER, friends: 1, state: 'signed' },
  { id: 'lady2', kind: 'class', date: '2026-11-25', time: '19:00', name: 'Bachata Lady Style', venue: 'Tanzschule Mitte', style: 'Bachata', color: PURPLE, friends: 0, state: 'signed' },
  { id: 'rumba', kind: 'night', date: '2026-11-27', time: '21:00', name: 'La Rumba Friday', venue: 'La Rumba', style: 'Salsa', color: RED, friends: 6, state: 'planned' },
  { id: 'casino2', kind: 'class', date: '2026-11-29', time: '20:00', name: 'Casino Partnerwork', venue: 'Buena Vista Bar', style: 'Salsa', color: AMBER, friends: 1, state: 'signed' },
]
const NEWCOMER_ITEMS: Item[] = [
  { id: 'taster', kind: 'taster', date: '2026-11-18', time: '19:30', name: 'Salsa taster — first class free', venue: 'La Rumba', style: 'Salsa', color: RED, friends: 0, state: 'planned' },
]
const HANGOUTS: Hangout[] = [
  { id: 'h1', kind: 'dinner', time: '15:30', title: 'Tacos before Baila en Cuba', host: 'Maria', forId: 'baila', going: 4, forming: true },
  { id: 'h2', kind: 'ride', time: '16:20', title: 'Ride from Schwabing, 2 seats', host: 'Jonas', forId: 'baila', going: 1 },
  { id: 'h3', kind: 'bar', time: '22:30', title: 'Drinks after, anyone?', host: 'Lea', forId: null, going: 2 },
]
const COURSES: Course[] = [
  { id: 'c-casino', name: 'Casino Partnerwork', school: 'Salsa Libre', style: 'Salsa', color: AMBER, when: 'Sundays 20:00', venue: 'Buena Vista Bar', progress: 'Class 3 of 8', payDue: '€60 for December' },
  { id: 'c-lady', name: 'Bachata Lady Style', school: 'Tanzschule Mitte', style: 'Bachata', color: PURPLE, when: 'Wednesdays 19:00', venue: 'Tanzschule Mitte', progress: 'Class 5 of 6' },
]
const FESTIVALS: Festival[] = [
  { id: 'bavaria', name: 'Salsa Bavaria', month: 1, year: 2027, when: '12–15 Feb', city: 'Munich', bought: false, earlyBird: 'ends Friday', friends: 3 },
  { id: 'berlin', name: 'Berlin Salsa Congress', month: 2, year: 2027, when: '19–22 Mar', city: 'Berlin', bought: true, friends: 5 },
  { id: 'cubanfire', name: 'Cuban Fire', month: 5, year: 2027, when: '4–7 Jun', city: 'Vienna', bought: false, friends: 1 },
]
const GOALS = ['Lead a whole Casino song without stopping', 'Dance at three festivals']

// Suggestions — only where a tab has room to think bigger (they never fill the plan itself).
const SUGGEST: Record<Stage, Record<Zoom, { title: string, items: Suggestion[] }>> = {
  regular: {
    today: { title: 'Make tonight social', items: [
      { id: 's1', title: 'Offer a ride to Baila en Cuba', sub: '3 friends going · Jonas has 2 seats, you could take 2 more', cta: 'Offer a ride', icon: Car },
      { id: 's2', title: 'Post “I’m out” — a ride or drinks after', sub: 'dancers show up when someone starts', cta: 'I’m out', icon: Plus },
    ] },
    week: { title: 'Plan around your nights', items: [
      { id: 's3', title: 'Dinner before La Timberia on Thursday?', sub: '5 friends going — start one, they get a nudge', cta: 'Start a dinner', icon: Utensils },
      { id: 's4', title: 'Offer a ride to Bailala on Saturday', sub: '2 friends going from your side of town', cta: 'Offer a ride', icon: Car },
    ] },
    month: { title: 'Keep your courses going', items: [
      { id: 's5', title: 'Pay December for Casino Partnerwork', sub: '€60 · due before Sun 29 Nov', cta: 'Pay €60', icon: Wallet },
      { id: 's6', title: 'Bachata Lady Style ends next week', sub: 'Level 2 starts Wed 2 Dec · same teacher', cta: 'See level 2', icon: GraduationCap },
    ] },
    year: { title: 'Pick your festivals', items: [
      { id: 's7', title: 'Salsa Bavaria early-bird ends Friday', sub: '€145 → €175 after · 3 friends going', cta: 'Buy €145', icon: Clock },
      { id: 's8', title: 'Set a goal for the summer', sub: 'one thing to work towards in class', cta: 'Add a goal', icon: Target },
    ] },
  },
  newcomer: {
    today: { title: 'Try something tonight', items: [
      { id: 'n1', title: 'Beginner class + social at Havana, 19:00', sub: 'first class free · then dance with everyone', cta: '+ My plan', icon: Sparkles },
    ] },
    week: { title: 'Try a taster this week', items: [
      { id: 'n2', title: 'Bachata taster, Thu 19:00', sub: 'Tanzschule Mitte · free · come alone, we rotate', cta: '+ My plan', icon: Sparkles },
      { id: 'n3', title: 'Watch a social on Saturday', sub: 'Bailala · a regular will show you round', cta: '+ My plan', icon: Users },
    ] },
    month: { title: 'Commit to a course', items: [
      { id: 'n4', title: 'Salsa Beginners · 4 weeks from Mon 30 Nov', sub: 'La Rumba · €80 · 12 dancers signed up', cta: 'Book €80', icon: GraduationCap },
      { id: 'n5', title: 'Bachata Basics · 6 weeks from Tue 1 Dec', sub: 'Tanzschule Mitte · €95', cta: 'Book €95', icon: GraduationCap },
    ] },
    year: { title: 'Your first festival', items: [
      { id: 'n6', title: 'Munich Salsa Weekend · Mar', sub: 'has a beginners’ track · in your city', cta: '+ My year', icon: Tent },
      { id: 'n7', title: 'A goal: dance a whole social night by summer', sub: 'we’ll show you the steps to get there', cta: 'Add it', icon: Target },
    ] },
  },
}

// ── State per toggle ─────────────────────────────────────────────────────────
const removed = ref<Set<string>>(new Set())
const added = ref<Set<string>>(new Set())
const storyOpen = ref(false)
const pickedDay = ref(TODAY)
const zoom = ref<Zoom>('today')

const items = computed<Item[]>(() => {
  if (!full.value) return []
  const base = stage.value === 'regular' ? REGULAR_ITEMS : NEWCOMER_ITEMS
  return base.filter(i => !removed.value.has(i.id))
})
const hangouts = computed(() => (full.value && stage.value === 'regular' ? HANGOUTS : full.value ? HANGOUTS.filter(h => !h.forId) : []))
const courses = computed(() => (full.value && stage.value === 'regular' ? COURSES : []))
const festivals = computed(() => (full.value && stage.value === 'regular' ? FESTIVALS : []))
const goals = computed(() => (full.value && stage.value === 'regular' ? GOALS : []))

// What needs you on each tab (B, D): a dinner forming tonight, a course to pay, an early-bird ending.
const todo = computed<Record<Zoom, number>>(() => ({
  today: hangouts.value.filter(h => h.forming).length,
  week: items.value.filter(i => WEEK.includes(i.date) && i.state === 'planned' && i.price).length,
  month: courses.value.filter(c => c.payDue).length + (stage.value === 'newcomer' ? 1 : 0),
  year: festivals.value.filter(f => f.earlyBird && !f.bought).length,
}))
// Smart opening tab (B, D): tonight if you're out, else your week; a newcomer starts at Week (a taster).
const smartZoom = computed<Zoom>(() => {
  if (stage.value === 'newcomer') return 'week'
  return items.value.some(i => i.date === TODAY) || hangouts.value.some(h => h.forming) ? 'today' : 'week'
})
const smart = computed(() => variant.value === 'B' || variant.value === 'D')
const zoomCal = computed(() => variant.value === 'C' || variant.value === 'D')
function reset() {
  removed.value = new Set(); added.value = new Set(); storyOpen.value = false; pickedDay.value = TODAY
  zoom.value = smart.value ? smartZoom.value : 'today'
  if (zoom.value === 'week' && !on(TODAY).length) pickedDay.value = WEEK.find(d => on(d).length) ?? TODAY
}
watch(zoom, (z) => {
  storyOpen.value = false
  // The week opens on the first day with something on it when today is empty.
  if (z === 'week' && !on(pickedDay.value).length) pickedDay.value = WEEK.find(d => on(d).length) ?? TODAY
})

const TABS: { id: Zoom, label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' },
]
const on = (d: string) => items.value.filter(i => i.date === d).sort((a, b) => a.time.localeCompare(b.time))
// After `on`: reset() uses it, and the immediate watch runs it right away.
watch([variant, device, stage, full], reset, { immediate: true })
const inWeek = computed(() => items.value.filter(i => WEEK.includes(i.date)))
const inMonth = computed(() => items.value.filter(i => i.date >= TODAY && i.date <= MONTH_END))
const hangoutsFor = (id: string) => hangouts.value.filter(h => h.forId === id)
const looseHangouts = computed(() => hangouts.value.filter(h => !h.forId || !on(TODAY).some(i => i.id === h.forId)))
const hangoutIcon = (k: Hangout['kind']) => k === 'dinner' ? Utensils : k === 'ride' ? Car : Beer
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const kindLabel = (k: Kind) => k === 'class' ? 'Class' : k === 'taster' ? 'Taster' : ''
const kindIcon = (k: Kind) => k === 'night' ? Sparkles : GraduationCap

// Month grid: the weeks of November 2026 (Mon start). Dots = planned days.
const MONTH_DAYS = (() => {
  const first = '2026-11-01'
  const lead = (new Date(`${first}T12:00:00`).getDay() + 6) % 7 // Sunday 1 Nov → 6 blanks
  const days: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= 30; d++) days.push(`2026-11-${String(d).padStart(2, '0')}`)
  while (days.length % 7) days.push(null)
  return days
})()
// Year strip: Nov 2026 → Oct 2027.
const YEAR_MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 10 + i, 1)
  return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-GB', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), current: i === 0 }
})
const festivalsIn = (m: { month: number, year: number }) => festivals.value.filter(f => f.month === m.month && f.year === m.year)

// Lines under the tab title.
const summary = computed(() => {
  const nights = (list: Item[]) => list.filter(i => i.kind === 'night').length
  const classes = (list: Item[]) => list.filter(i => i.kind !== 'night').length
  const line = (list: Item[]) => [nights(list) ? plural(nights(list), 'night') + ' out' : '', classes(list) ? plural(classes(list), 'class', 'classes') : ''].filter(Boolean).join(' · ')
  switch (zoom.value) {
    case 'today': return [line(on(TODAY)), hangouts.value.length ? plural(hangouts.value.length, 'hangout') : ''].filter(Boolean).join(' · ') || 'Nothing planned tonight'
    case 'week': return line(inWeek.value) || 'Nothing planned this week'
    case 'month': return [line(inMonth.value), courses.value.length ? plural(courses.value.length, 'course') : ''].filter(Boolean).join(' · ') || 'Nothing planned this month'
    default: return festivals.value.length ? `${plural(festivals.value.length, 'festival')} · ${plural(goals.value.length, 'goal')}` : 'No festival yet'
  }
})

// The story each horizon can post.
const story = computed(() => {
  const s = stage.value === 'newcomer'
  switch (zoom.value) {
    case 'today': return { title: s ? 'Trying salsa tonight!' : 'I’m out tonight', lines: on(TODAY).map(i => `${i.time} · ${i.name}`).concat(hangouts.value.filter(h => h.forId).map(h => `${h.time} · ${h.title}`)), bg: RED, foot: 'Join me →' }
    case 'week': return { title: s ? 'My first dance week' : 'Where I’m dancing this week', lines: inWeek.value.filter(i => i.kind !== 'class').map(i => `${dayShort(i.date).toUpperCase()} · ${i.name}`), bg: PURPLE, foot: 'Nights only — classes stay off it' }
    case 'month': return { title: s ? 'November: I started dancing' : 'My November in dance', lines: [plural(inMonth.value.filter(i => i.kind === 'night').length + 4, 'night') + ' out', plural(inMonth.value.filter(i => i.kind !== 'night').length + 3, 'class', 'classes'), courses.value.length ? `${courses.value[0]!.name} · ${courses.value[0]!.progress}` : 'Next: Salsa Beginners'], bg: AMBER, foot: 'New story' }
    default: return { title: s ? 'My first dance year' : 'My 2027 dance year', lines: festivals.value.map(f => `${f.when.split(' ').pop()?.toUpperCase()} · ${f.name}`), bg: GREEN, foot: 'The year story (exists)' }
  }
})
// A story needs something planned in its span (the month's counts alone don't make one).
const storyReady = computed(() => zoom.value === 'month' ? inMonth.value.length > 0 || courses.value.length > 0 : story.value.lines.length > 0)

function zoomTo(z: Zoom, day?: string) { zoom.value = z; if (day) pickedDay.value = day }
const toggleAdd = (id: string) => { const s = new Set(added.value); s.has(id) ? s.delete(id) : s.add(id); added.value = s }
const remove = (id: string) => { removed.value = new Set([...removed.value, id]) }
const weekDayList = computed(() => (zoomCal.value ? on(pickedDay.value) : null))
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">My plan · zoom</span>
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
            v-for="s in (['regular', 'newcomer'] as const)" :key="s" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="stage === s ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="stage = s"
          >{{ s === 'regular' ? 'Regular dancer' : 'Newcomer' }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="f in ([true, false] as const)" :key="String(f)" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="full === f ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="full = f"
          >{{ f ? 'Plan full' : 'Plan empty' }}</button>
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
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '720px' }"
      >
        <div class="h-full overflow-y-auto" :class="isMobile ? 'p-4' : 'p-8'" data-testid="sketch-body">
          <p class="text-xs uppercase tracking-[0.3em] text-secondary font-display text-center">My plan</p>
          <h1 class="mt-1 font-display text-center" :class="isMobile ? 'text-3xl' : 'text-4xl'">Hey, {{ stage === 'regular' ? 'Alex' : 'Sam' }}</h1>
          <p class="mt-1 text-center text-sm text-muted-foreground">Monday 16 November · Munich</p>

          <!-- ═════════════ Zoom tabs ═════════════ -->
          <div class="mt-8 sticky top-0 z-10 bg-background/95 backdrop-blur pt-1 pb-2">
            <div class="grid grid-cols-4 gap-1 rounded-full border border-border bg-card p-1" role="tablist" aria-label="Zoom">
              <button
                v-for="t in TABS" :key="t.id" type="button" role="tab"
                class="relative h-10 rounded-full text-sm font-bold transition-colors"
                :class="zoom === t.id ? 'bg-wd-brown-900 text-white' : 'text-muted-foreground hover:text-foreground'"
                :aria-selected="zoom === t.id"
                :data-testid="`tab-${t.id}`"
                @click="zoomTo(t.id)"
              >
                {{ t.label }}
                <span
                  v-if="smart && todo[t.id]"
                  class="absolute -top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] leading-5"
                  :aria-label="`${todo[t.id]} to do`"
                >{{ todo[t.id] }}</span>
              </button>
            </div>
          </div>

          <!-- Tab header -->
          <div class="mt-4 flex items-baseline justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-display leading-tight" :class="isMobile ? 'text-2xl' : 'text-3xl'">
                {{ zoom === 'today' ? 'Tonight' : zoom === 'week' ? 'This week' : zoom === 'month' ? 'November' : 'Your next 12 months' }}
              </h2>
              <p class="mt-1 text-sm text-muted-foreground">{{ summary }}</p>
            </div>
            <button v-if="zoom === 'today'" type="button" class="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-wd-brown-900 text-white"><Plus class="size-3.5" /> I'm out</button>
            <button v-else-if="zoom === 'month'" type="button" class="shrink-0 text-xs italic text-secondary font-display">+ Enroll</button>
            <button v-else-if="zoom === 'year'" type="button" class="shrink-0 text-xs italic text-secondary font-display">Find festivals →</button>
            <span v-else class="shrink-0 text-xs italic text-secondary font-display">Full week →</span>
          </div>

          <!-- ═════════════ Zoom visuals (C, D) ═════════════ -->
          <!-- Week: day strip -->
          <div v-if="zoomCal && zoom === 'week'" class="mt-4 grid grid-cols-7 gap-1 rounded-2xl bg-card border border-border p-1.5" data-testid="week-strip">
            <button
              v-for="d in WEEK" :key="d" type="button"
              class="rounded-xl py-2 text-center"
              :class="pickedDay === d ? 'bg-wd-brown-900 text-white' : 'hover:bg-muted'"
              @click="pickedDay = d"
            >
              <span class="block text-eyebrow font-black uppercase tracking-widest">{{ d === TODAY ? 'Today' : dayShort(d) }}</span>
              <span class="block text-sm font-bold">{{ dayNum(d) }}</span>
              <span class="mx-auto mt-1 block size-1.5 rounded-full" :class="on(d).length ? (pickedDay === d ? 'bg-white' : 'bg-primary') : 'bg-transparent'" />
            </button>
          </div>
          <!-- Month: calendar grid, tap a day → Week on that day -->
          <div v-if="zoomCal && zoom === 'month'" class="mt-4 rounded-2xl bg-card border border-border p-2" data-testid="month-grid">
            <div class="grid grid-cols-7 text-center text-eyebrow font-black uppercase tracking-widest text-muted-foreground mb-1">
              <span v-for="d in ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']" :key="d">{{ d }}</span>
            </div>
            <div class="grid grid-cols-7 gap-1">
              <template v-for="(d, i) in MONTH_DAYS" :key="i">
                <span v-if="!d" />
                <button
                  v-else type="button"
                  class="rounded-lg py-1.5 text-center text-sm"
                  :class="[d < TODAY ? 'text-muted-foreground/50' : 'hover:bg-muted', d === TODAY ? 'ring-2 ring-wd-brown-900 font-bold' : '', WEEK.includes(d) ? 'bg-muted/60' : '']"
                  :disabled="d < TODAY"
                  @click="WEEK.includes(d) ? zoomTo(d === TODAY ? 'today' : 'week', d) : null"
                >
                  {{ dayNum(d) }}
                  <span class="mx-auto mt-0.5 flex justify-center gap-0.5">
                    <span v-for="it in on(d)" :key="it.id" class="size-1.5 rounded-full" :style="{ background: it.color }" />
                    <span v-if="!on(d).length" class="size-1.5" />
                  </span>
                </button>
              </template>
            </div>
            <p class="mt-2 px-1 text-[11px] text-muted-foreground">Tap a day this week to zoom in. Earlier this month: 4 nights, 3 classes.</p>
          </div>
          <!-- Year: 12-month strip, tap the current month → Month -->
          <div v-if="zoomCal && zoom === 'year'" class="mt-4 grid gap-1 rounded-2xl bg-card border border-border p-2" :class="isMobile ? 'grid-cols-4' : 'grid-cols-6'" data-testid="year-strip">
            <button
              v-for="m in YEAR_MONTHS" :key="m.key" type="button"
              class="rounded-xl p-2 text-left min-h-16"
              :class="m.current ? 'ring-2 ring-wd-brown-900' : 'hover:bg-muted'"
              @click="m.current ? zoomTo('month') : null"
            >
              <span class="block text-eyebrow font-black uppercase tracking-widest" :class="festivalsIn(m).length ? 'text-foreground' : 'text-muted-foreground'">{{ m.label }}<template v-if="m.month === 0"> ’27</template></span>
              <span v-for="f in festivalsIn(m)" :key="f.id" class="mt-1 block truncate rounded px-1 text-[10px] font-bold text-white" :style="{ background: f.bought ? GREEN : AMBER }">{{ f.name }}</span>
              <span v-if="m.current && inMonth.length" class="mt-1 block text-[10px] text-muted-foreground">{{ plural(inMonth.length, 'plan') }}</span>
            </button>
          </div>

          <!-- ═════════════ What happens in the span ═════════════ -->
          <section class="mt-4" data-testid="span-list">
            <!-- TODAY -->
            <template v-if="zoom === 'today'">
              <div v-if="!on(TODAY).length && !hangouts.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">Nothing planned tonight.</div>
              <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                <template v-for="(s, i) in on(TODAY)" :key="s.id">
                  <div class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                    <component :is="kindIcon(s.kind)" class="size-4 shrink-0" :style="{ color: s.color }" />
                    <span class="text-sm font-bold w-12">{{ s.time }}</span>
                    <div class="min-w-0 flex-1"><div class="text-sm font-bold truncate">{{ s.name }}</div><div class="text-xs text-muted-foreground truncate"><template v-if="kindLabel(s.kind)">{{ kindLabel(s.kind) }} · </template>{{ s.venue }} · <span :style="{ color: s.color }">{{ s.style }}</span><template v-if="s.friends"> · {{ plural(s.friends, 'friend') }}</template></div></div>
                    <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap">{{ s.state === 'signed' ? '✓ Signed up' : '✓ My plan' }}</span>
                  </div>
                  <div v-for="h in hangoutsFor(s.id)" :key="h.id" class="flex items-center gap-3 pl-11 pr-4 py-2 bg-muted/40 text-xs">
                    <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                    <span class="font-bold w-10">{{ h.time }}</span>
                    <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                    <button type="button" class="font-bold text-primary">Join</button>
                  </div>
                </template>
                <template v-if="looseHangouts.length">
                  <p class="px-4 pt-3 pb-1 text-eyebrow uppercase tracking-widest font-bold text-secondary" :class="on(TODAY).length ? 'border-t border-border/50' : ''">Also out tonight</p>
                  <div v-for="h in looseHangouts" :key="h.id" class="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <component :is="hangoutIcon(h.kind)" class="size-3.5 shrink-0 text-secondary" />
                    <span class="font-bold w-10">{{ h.time }}</span>
                    <span class="min-w-0 flex-1 truncate"><strong>{{ h.title }}</strong> · {{ h.host }} · {{ h.going }} going</span>
                    <button type="button" class="font-bold text-primary">Join</button>
                  </div>
                </template>
              </div>
            </template>

            <!-- WEEK: C/D one picked day; A/B grouped by day -->
            <template v-else-if="zoom === 'week'">
              <template v-if="weekDayList">
                <p class="mb-2 text-sm font-bold">{{ dayLong(pickedDay) }}</p>
                <div v-if="!weekDayList.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">{{ pickedDay === TODAY ? 'Nothing planned tonight.' : `Nothing planned on ${dayLong(pickedDay)}.` }}</div>
                <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                  <div v-for="(s, i) in weekDayList" :key="s.id" class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                    <component :is="kindIcon(s.kind)" class="size-4 shrink-0" :style="{ color: s.color }" />
                    <span class="text-sm font-bold w-12">{{ s.time }}</span>
                    <div class="min-w-0 flex-1"><div class="text-sm font-bold truncate">{{ s.name }}</div><div class="text-xs text-muted-foreground truncate"><template v-if="kindLabel(s.kind)">{{ kindLabel(s.kind) }} · </template>{{ s.venue }}</div></div>
                    <span v-if="s.state === 'planned' && s.price" class="text-xs font-bold px-3 py-1.5 rounded-full border border-primary/40 text-primary whitespace-nowrap">Book · {{ s.price }} →</span>
                    <span v-else class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap">{{ s.state === 'signed' ? '✓ Signed up' : '✓ My plan' }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <div v-if="!inWeek.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">Nothing planned this week.</div>
                <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                  <div v-for="(s, i) in inWeek" :key="s.id" class="flex items-center gap-3 px-4 py-3" :class="i ? 'border-t border-border/50' : ''">
                    <span class="w-12 text-center text-eyebrow font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-tight bg-muted">{{ s.date === TODAY ? 'Today' : dayShort(s.date) }}<span class="block font-bold normal-case tracking-normal">{{ dayNum(s.date) }} Nov</span></span>
                    <span class="text-sm font-bold">{{ s.time }}</span>
                    <div class="min-w-0 flex-1"><div class="text-sm font-bold truncate">{{ s.name }}</div><div class="text-xs text-muted-foreground truncate"><template v-if="kindLabel(s.kind)">{{ kindLabel(s.kind) }} · </template>{{ s.venue }}</div></div>
                    <span v-if="s.state === 'planned' && s.price" class="text-xs font-bold px-3 py-1.5 rounded-full border border-primary/40 text-primary whitespace-nowrap">Book · {{ s.price }} →</span>
                    <span v-else class="text-xs font-bold px-3 py-1.5 rounded-full bg-wd-green-600 text-white whitespace-nowrap">✓</span>
                  </div>
                </div>
              </template>
            </template>

            <!-- MONTH: courses (commitments) + what's on, by week -->
            <template v-else-if="zoom === 'month'">
              <div v-if="courses.length" class="grid gap-3" :class="isMobile ? '' : 'grid-cols-2'">
                <div v-for="c in courses" :key="c.id" class="rounded-2xl bg-white p-4 border" :style="{ borderColor: c.color }">
                  <div class="flex justify-between gap-2"><div class="font-bold">{{ c.name }}</div><span class="text-xs text-muted-foreground">{{ c.progress }}</span></div>
                  <div class="text-xs text-secondary">{{ c.school }} · {{ c.when }}</div>
                  <div class="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin class="size-3" /> {{ c.venue }}</div>
                  <div v-if="c.payDue" class="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary"><Wallet class="size-3" /> {{ c.payDue }}</div>
                </div>
              </div>
              <div v-if="!zoomCal" class="mt-3">
                <div v-if="!inMonth.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">Nothing planned for the rest of November.</div>
                <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                  <template v-for="(s, i) in inMonth" :key="s.id">
                    <p v-if="i === 0 || (WEEK.includes(s.date) !== WEEK.includes(inMonth[i - 1]!.date))" class="px-4 pt-3 pb-1 text-eyebrow uppercase tracking-widest font-bold text-secondary" :class="i ? 'border-t border-border/50' : ''">{{ WEEK.includes(s.date) ? 'This week' : 'Later in November' }}</p>
                    <div class="flex items-center gap-3 px-4 py-2.5">
                      <span class="text-xs font-bold w-16 shrink-0">{{ dayShort(s.date) }} {{ dayNum(s.date) }}</span>
                      <component :is="kindIcon(s.kind)" class="size-3.5 shrink-0" :style="{ color: s.color }" />
                      <div class="min-w-0 flex-1 text-sm truncate"><strong>{{ s.name }}</strong> <span class="text-xs text-muted-foreground">· {{ s.time }}</span></div>
                    </div>
                  </template>
                </div>
              </div>
              <p v-else-if="inMonth.length" class="mt-3 text-xs text-muted-foreground">Rest of November: {{ summary }} — tap a day above for its plans.</p>
            </template>

            <!-- YEAR: festivals + goals -->
            <template v-else>
              <div v-if="!zoomCal && festivals.length" class="grid gap-3" :class="isMobile ? '' : 'grid-cols-2'">
                <div v-for="f in festivals" :key="f.id" class="rounded-2xl bg-white border border-border p-4 flex items-center gap-3">
                  <Tent class="size-5 text-secondary shrink-0" />
                  <div class="min-w-0 flex-1"><div class="font-bold truncate">{{ f.name }}</div><div class="text-xs text-muted-foreground">{{ f.when }} · {{ f.city }} · {{ plural(f.friends, 'friend') }}</div></div>
                  <span class="text-xs font-bold" :class="f.bought ? 'text-wd-green-700' : 'text-primary'">{{ f.bought ? 'Ticket ✓' : f.earlyBird ? 'Early-bird ' + f.earlyBird : 'No ticket' }}</span>
                </div>
              </div>
              <div v-if="goals.length" class="mt-3 rounded-2xl bg-white border border-border p-4">
                <p class="text-eyebrow uppercase tracking-widest font-bold text-secondary">Your goals</p>
                <p v-for="g in goals" :key="g" class="mt-1.5 text-sm flex items-center gap-2"><Target class="size-3.5 text-primary shrink-0" /> {{ g }}</p>
              </div>
              <div v-if="!festivals.length && !goals.length" class="rounded-2xl p-5 text-center border-2 border-dashed border-input bg-white/50 text-sm text-muted-foreground">No festival or goal yet.</div>
            </template>
          </section>

          <!-- ═════════════ The plan to make at this scale ═════════════ -->
          <section class="mt-6 rounded-2xl border border-primary/30 bg-primary/[4%] p-4" data-testid="plan-card">
            <p class="text-eyebrow uppercase tracking-widest font-bold text-primary">Plan {{ zoom === 'today' ? 'tonight' : 'your ' + zoom }}</p>
            <p class="mt-0.5 font-display text-xl">{{ SUGGEST[stage][zoom].title }}</p>
            <div class="mt-3 grid gap-2">
              <div v-for="s in SUGGEST[stage][zoom].items" :key="s.id" class="flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2.5" :class="isMobile ? 'flex-wrap' : ''">
                <component :is="s.icon" class="size-4 shrink-0 text-primary" />
                <div class="min-w-0 flex-1"><div class="text-sm font-bold">{{ s.title }}</div><div class="text-xs text-muted-foreground">{{ s.sub }}</div></div>
                <button
                  type="button"
                  class="shrink-0 rounded-full px-3 h-8 text-xs font-bold"
                  :class="added.has(s.id) ? 'bg-wd-green-600 text-white' : 'bg-primary text-primary-foreground'"
                  @click="toggleAdd(s.id)"
                >
                  <Check v-if="added.has(s.id)" class="inline size-3.5" /> {{ added.has(s.id) ? 'Done' : s.cta }}
                </button>
              </div>
            </div>
          </section>

          <!-- ═════════════ The story of this horizon ═════════════ -->
          <section class="mt-4">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 h-9 text-xs font-bold disabled:opacity-50"
              :disabled="!storyReady"
              data-testid="story-button"
              @click="storyOpen = !storyOpen"
            >
              <Share2 class="size-3.5" /> {{ storyReady ? 'Share as a story' : 'Plan something to make a story' }}
            </button>
            <div v-if="storyOpen && storyReady" class="mt-3 mx-auto w-48 aspect-[9/16] rounded-xl p-3 text-white flex flex-col gap-2" :style="{ background: story.bg }" data-testid="story">
              <p class="font-display text-lg leading-none">{{ story.title }}</p>
              <div v-for="l in story.lines" :key="l" class="rounded bg-black px-2 py-1 text-[10px] leading-tight">{{ l }}</div>
              <p class="mt-auto text-[9px] opacity-80">{{ story.foot }}</p>
            </div>
          </section>

          <p class="mt-10 text-center text-xs text-muted-foreground"><Users class="inline size-3 -mt-0.5" /> Meet new friends · …</p>
        </div>
      </div>
    </div>
  </div>
</template>
