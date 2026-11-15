<script setup lang="ts">
/**
 * Sketch: My plan — section names and order on a time scale (RAZ-895 follow-up).
 *
 * Today /my-plan runs far → near: to-do strip, Goals ("Where you're headed"),
 * This year ("Where you're going"), This month ("Where you show up"), This week
 * ("Where you're dancing"), Tonight ("Who's out"), Discover. Four headlines are
 * near-synonyms, "This week" appears twice, and the things you act on today sit
 * at the bottom. Clickable local prototype only — mock data, nothing navigates,
 * nothing is wired to the DB.
 */
import {
  Share2, Check, X, Sparkles, Target, Ticket, CalendarDays, Moon, Music, Plus, ChevronRight,
  Users, Utensils, AlertCircle,
} from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — My plan sketches', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D' | 'E'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Today: far → near',
    idea: 'As live now. A to-do strip, then Goals → This year → This month → This week → Tonight → Discover, each headed "Where you’re …".',
    good: 'Reads like a coaching story: why first, then what. Nothing to build.',
    cost: 'Tonight and this week, the reasons people open the page, are at the bottom. Four headlines mean the same thing, and "This week" appears twice.',
  },
  {
    id: 'B',
    name: 'Near → far, time as the headline',
    idea: 'Same sections, reversed: Tonight → This week → This month → This year → Goals → Discover. The time scale is the headline, with a one-line summary under it. To-dos sit on the row they belong to, so the strip goes.',
    good: 'Opening the page answers "what now?" first. Headlines say what is inside. A small change: reorder and rename.',
    cost: 'Long scroll to reach festivals. Goals, the "why", end up near the bottom.',
  },
  {
    id: 'C',
    name: 'B + sticky time bar',
    idea: 'B’s order, plus a sticky bar Tonight · Week · Month · Year · Goals with counts and a red dot for a to-do. Tap to jump. A scale with nothing in it folds into one line.',
    good: 'You see the whole year at a glance and jump to any scale in one tap. Empty scales no longer cost a screen each.',
    cost: 'One more sticky bar on phones (~44px) under the site header.',
  },
  {
    id: 'D',
    name: 'One agenda',
    idea: 'One date-ordered list, grouped Tonight / This week / This month / This year, mixing hangouts, socials, courses and festivals with a type chip. Goals become a ring in the header.',
    good: 'The purest timeline: one list to read, like a calendar’s schedule view.',
    cost: 'Loses each type’s own tools (picking nights, workshop tracks, course payments). Weekly courses repeat and clutter the list. The biggest rebuild.',
  },
  {
    id: 'E',
    name: 'Recommended: C + goal ring + "next up"',
    idea: 'C’s order and time bar. The header shows a goal ring and the single next thing ("Tonight 19:00 · Dinner before Son de Cuba"). Each scale has its own "Post story" (tonight, week, year, goals), and courses only post on a milestone.',
    good: 'The goal stays in view without taking a screen. The next action is the first thing you see. Every story from RAZ-895 has an obvious home.',
    cost: 'More than a reorder: header and time bar are new code. Goal progress needs real data before the ring means anything.',
  },
]

const variant = ref<Variant>('E')
const device = ref<'desktop' | 'mobile'>('mobile')
const week = ref<'full' | 'quiet'>('full')
const isMobile = computed(() => device.value === 'mobile')
const quiet = computed(() => week.value === 'quiet')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Mock data: a Munich dancer in mid-November ───────────────────────────
type Row = { id: string, when: string, sub?: string, title: string, meta: string, color: string, todo?: string, done?: string, kind: string }

const TONIGHT: Row[] = [
  { id: 't1', kind: 'Hangout', when: 'Sat', sub: '19:00', title: 'Dinner before Son de Cuba', meta: 'Café Kosmos · 4 going', color: '#e11d48', done: 'You’re in' },
]
const WEEK: Row[] = [
  { id: 'w1', kind: 'Social', when: 'Wed', sub: '19 Nov', title: 'Salsa Miércoles', meta: 'Ballhaus · Cuban salsa · 3 friends going', color: '#dc2626', done: 'Going' },
  { id: 'w2', kind: 'Social', when: 'Fri', sub: '21 Nov', title: 'Bachata Night', meta: 'Tanzhaus Süd · Bachata', color: '#9333ea', done: 'Going' },
  { id: 'w3', kind: 'Social', when: 'Sat', sub: '22 Nov', title: 'Timba Party', meta: 'Muffatwerk · Timba · 6 friends going', color: '#ea580c', done: 'Going' },
]
const MONTH: Row[] = [
  { id: 'm1', kind: 'Course', when: 'Tue', sub: '19:30', title: 'Bachata Sensual · Level 2', meta: 'Tanzschule Salsa Libre · class 5 of 8', color: '#9333ea', todo: 'Pay November' },
]
const YEAR: Row[] = [
  { id: 'y1', kind: 'Festival', when: 'Mar', sub: '14–15', title: 'Cuban Fire', meta: 'Munich', color: '#dc2626', done: 'Ticket ✓' },
  { id: 'y2', kind: 'Festival', when: 'Mar', sub: '26–29', title: '¡Menéate Viena!', meta: 'Vienna · from €85', color: '#ea580c', todo: 'Early-bird ends in 6 days' },
  { id: 'y3', kind: 'Festival', when: 'Sep', sub: '18–20', title: 'Salsa Open Berlin', meta: 'Berlin', color: '#2563eb' },
]
const GOAL = { title: 'Lead Bachata Sensual with confidence', why: 'Ask anyone to dance at Bachata Night', pct: 40, detail: '5 of 8 classes · 2 socials this month' }

const tonight = computed(() => (quiet.value ? [] : TONIGHT))
const weekRows = computed(() => (quiet.value ? [] : WEEK))

type ScaleId = 'tonight' | 'week' | 'month' | 'year' | 'goals'
type Scale = {
  id: ScaleId
  rows: Row[]
  // today's labels
  oldEyebrow: string
  oldTitle: [string, string]
  // proposed labels
  title: string
  summary: string
  emptyLine: string
  emptyCta: string
  story?: { headline: string, line: string, color: string }
  storyInE: boolean
}

const scales = computed<Record<ScaleId, Scale>>(() => ({
  tonight: {
    id: 'tonight', rows: tonight.value,
    oldEyebrow: 'Tonight · hangouts', oldTitle: ['Who’s', 'out.'],
    title: 'Tonight',
    summary: tonight.value.length ? `${tonight.value.length} plan · 4 friends out` : 'Nothing planned',
    emptyLine: 'Nothing tonight.', emptyCta: 'See who’s out',
    story: { headline: 'Out tonight', line: 'Son de Cuba · come dance', color: '#e11d48' }, storyInE: true,
  },
  week: {
    id: 'week', rows: weekRows.value,
    oldEyebrow: 'This week · socials · Munich', oldTitle: ['Where you’re', 'dancing.'],
    title: 'This week',
    summary: weekRows.value.length ? `${weekRows.value.length} nights out in Munich` : 'No nights picked yet',
    emptyLine: 'No nights picked this week.', emptyCta: 'Pick from 19 socials in Munich',
    story: { headline: 'Come dance with me', line: 'Wed · Fri · Sat in Munich', color: '#ea580c' }, storyInE: true,
  },
  month: {
    id: 'month', rows: MONTH,
    oldEyebrow: 'This month · courses', oldTitle: ['Where you', 'show up.'],
    title: 'This month',
    summary: '1 course · class 5 of 8',
    emptyLine: 'No course this month.', emptyCta: 'Find a course',
    story: { headline: 'Halfway there', line: 'Bachata L2 · class 5 of 8', color: '#9333ea' }, storyInE: false,
  },
  year: {
    id: 'year', rows: YEAR,
    oldEyebrow: 'This year · festivals', oldTitle: ['Where you’re', 'going.'],
    title: 'This year',
    summary: '3 festivals · 1 ticket to buy',
    emptyLine: 'No festivals yet.', emptyCta: 'Browse festivals',
    story: { headline: 'My 2027', line: 'Munich · Vienna · Berlin', color: '#2563eb' }, storyInE: true,
  },
  goals: {
    id: 'goals', rows: [],
    oldEyebrow: 'Goals · your compass', oldTitle: ['Where you’re', 'headed.'],
    title: 'Your goal',
    summary: `${GOAL.pct}% · ${GOAL.detail}`,
    emptyLine: 'No goal yet.', emptyCta: 'Set a goal',
    story: { headline: '40% there', line: GOAL.title, color: '#16a34a' }, storyInE: true,
  },
}))

const FAR_TO_NEAR: ScaleId[] = ['goals', 'year', 'month', 'week', 'tonight']
const NEAR_TO_FAR: ScaleId[] = ['tonight', 'week', 'month', 'year', 'goals']
const order = computed(() => (variant.value === 'A' ? FAR_TO_NEAR : NEAR_TO_FAR))

const todos = computed(() => [
  { label: '¡Menéate Viena! · early-bird', detail: 'Ends in 6d · from €85' },
  { label: 'Bachata Sensual L2 · pay this month', detail: 'Tue 19:30' },
])

const nextUp = computed(() => tonight.value[0]
  ? { when: 'Tonight 19:00', title: tonight.value[0].title, color: tonight.value[0].color }
  : weekRows.value[0]
    ? { when: `${weekRows.value[0].when} ${weekRows.value[0].sub}`, title: weekRows.value[0].title, color: weekRows.value[0].color }
    : { when: 'Tue 19:30', title: 'Bachata Sensual · Level 2', color: '#9333ea' })

// D: one agenda
const agenda = computed(() => [
  { label: 'Tonight', rows: tonight.value },
  { label: 'This week', rows: [...weekRows.value, { ...MONTH[0], id: 'm1w', when: 'Tue', sub: '18 Nov' }] },
  { label: 'This month', rows: [{ ...MONTH[0], id: 'm1b', when: 'Tue', sub: '25 Nov' }] },
  { label: 'This year', rows: YEAR },
].filter(g => g.rows.length))

// ── Interaction state, reset on every toggle ─────────────────────────────
const storyFor = ref<Scale | null>(null)
const active = ref<ScaleId>('tonight')
const scroller = ref<HTMLElement | null>(null)
watch([variant, device, week], () => {
  storyFor.value = null
  active.value = 'tonight'
  nextTick(() => scroller.value?.scrollTo({ top: 0 }))
})

const showBar = computed(() => variant.value === 'C' || variant.value === 'E')
const folds = computed(() => variant.value === 'C' || variant.value === 'E')
const canPost = (s: Scale) => {
  if (!s.story) return false
  if (variant.value === 'A') return s.id === 'week' && s.rows.length > 0
  if (variant.value === 'E') return s.storyInE && (s.rows.length > 0 || s.id === 'goals')
  return s.rows.length > 0 || s.id === 'goals'
}

function barCount(id: ScaleId) {
  if (id === 'goals') return `${GOAL.pct}%`
  return String(scales.value[id].rows.length)
}
const barTodo = (id: ScaleId) => scales.value[id].rows.some(r => r.todo)
const BAR_LABEL: Record<ScaleId, string> = { tonight: 'Tonight', week: 'Week', month: 'Month', year: 'Year', goals: 'Goal' }

function jump(id: ScaleId) {
  const el = scroller.value?.querySelector<HTMLElement>(`[data-scale="${id}"]`)
  if (!el || !scroller.value) return
  active.value = id
  scroller.value.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' })
}
function onScroll() {
  if (!showBar.value || !scroller.value) return
  const top = scroller.value.scrollTop + 80
  let cur: ScaleId = 'tonight'
  for (const id of NEAR_TO_FAR) {
    const el = scroller.value.querySelector<HTMLElement>(`[data-scale="${id}"]`)
    if (el && el.offsetTop <= top) cur = id
  }
  // At the very bottom the last scale can't reach the top: light it anyway.
  const s = scroller.value
  if (s.scrollTop + s.clientHeight >= s.scrollHeight - 4) cur = 'goals'
  active.value = cur
}

const KIND_ICON: Record<string, any> = { Hangout: Utensils, Social: Music, Course: CalendarDays, Festival: Ticket }
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">My plan sketch</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background">
          <button
            v-for="v in VARIANTS" :key="v.id"
            class="px-3 h-8 rounded-full text-sm font-bold transition-colors"
            :class="variant === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            :data-testid="`variant-${v.id}`"
            @click="variant = v.id"
          >{{ v.id }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d"
            class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="device = d"
          >{{ d }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="w in (['full', 'quiet'] as const)" :key="w"
            class="px-3 h-7 rounded-full font-semibold"
            :class="week === w ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="week = w"
          >{{ w === 'full' ? 'Busy week' : 'Quiet week' }}</button>
        </div>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 grid sm:grid-cols-[1.2fr_1fr_1fr] gap-3 text-xs">
        <p><span class="font-display text-base font-bold block">{{ current.id }} · {{ current.name }}</span>{{ current.idea }}</p>
        <p><span class="font-bold text-green-700 block uppercase tracking-wider">Good</span>{{ current.good }}</p>
        <p><span class="font-bold text-primary block uppercase tracking-wider">Cost</span>{{ current.cost }}</p>
      </div>
    </div>

    <!-- Device frame -->
    <div class="py-6 px-4 flex justify-center">
      <div
        class="relative bg-background overflow-hidden shadow-xl border border-border"
        :class="isMobile ? 'w-[390px] h-[min(760px,calc(100vh-13rem))] rounded-[2.25rem]' : 'w-full max-w-5xl h-[calc(100vh-12rem)] min-h-[560px] rounded-xl'"
      >
        <div ref="scroller" class="relative h-full overflow-y-auto" @scroll.passive="onScroll">
          <!-- Mock site header -->
          <div class="h-14 px-5 flex items-center justify-between border-b border-border bg-background">
            <span class="font-display text-lg font-bold">We<span class="text-primary">Dance</span></span>
            <span class="w-8 h-8 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-bold">A</span>
          </div>

          <!-- ───────────── Hero ───────────── -->
          <section v-if="variant !== 'E' && variant !== 'D'" class="text-center" :class="isMobile ? 'px-5 pt-8 pb-4' : 'px-8 pt-12 pb-6'">
            <div class="text-sm tracking-widest uppercase mb-3 text-secondary">Hey, Alösha</div>
            <h1 class="leading-[0.98] font-display" :class="isMobile ? 'text-4xl' : 'text-6xl'">
              Your floor in <em class="italic text-primary">Munich</em>
            </h1>
            <p v-if="variant === 'A'" class="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
              Salsa, Bachata — every festival, course and social you care about, in one place.
            </p>
          </section>

          <!-- D / E hero: goal ring + next up -->
          <section v-else :class="isMobile ? 'px-5 pt-6 pb-4' : 'px-8 pt-10 pb-6 max-w-3xl mx-auto'">
            <div class="text-sm tracking-widest uppercase text-secondary">Hey, Alösha</div>
            <div class="mt-3 flex items-center gap-4">
              <button class="relative shrink-0" :class="isMobile ? 'w-16 h-16' : 'w-20 h-20'" title="Your goal" @click="variant === 'E' ? jump('goals') : null">
                <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" class="text-muted" stroke-width="4" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--wd-green-600)" stroke-width="4" stroke-linecap="round" :stroke-dasharray="`${GOAL.pct * 0.974} 100`" />
                </svg>
                <span class="absolute inset-0 grid place-items-center text-sm font-black">{{ GOAL.pct }}%</span>
              </button>
              <div class="min-w-0">
                <div class="text-xs uppercase tracking-widest text-muted-foreground font-bold">Your goal</div>
                <div class="font-display leading-tight" :class="isMobile ? 'text-xl' : 'text-2xl'">{{ GOAL.title }}</div>
                <div class="text-xs text-muted-foreground mt-0.5">{{ GOAL.detail }}</div>
              </div>
            </div>
            <div v-if="variant === 'E'" class="mt-5 rounded-2xl p-4 text-white flex items-center gap-3" :style="{ background: nextUp.color }">
              <div class="min-w-0 flex-1">
                <div class="text-[11px] uppercase tracking-widest font-bold text-white/80">Next up · {{ nextUp.when }}</div>
                <div class="font-display text-xl leading-tight truncate">{{ nextUp.title }}</div>
              </div>
              <ChevronRight class="w-5 h-5 shrink-0" />
            </div>
          </section>

          <!-- ───────────── C / E sticky time bar ───────────── -->
          <nav v-if="showBar" class="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border" aria-label="Time scale">
            <div class="flex gap-1 px-3 py-2 overflow-x-auto" :class="isMobile ? '' : 'justify-center'">
              <button
                v-for="id in NEAR_TO_FAR" :key="id"
                class="relative shrink-0 flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-bold transition-colors"
                :class="[
                  active === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                  id !== 'goals' && !scales[id].rows.length ? 'opacity-50' : '',
                ]"
                :data-testid="`bar-${id}`"
                @click="jump(id)"
              >
                {{ BAR_LABEL[id] }}
                <span class="text-[10px] font-black px-1.5 rounded-full" :class="active === id ? 'bg-background/20' : 'bg-muted'">{{ barCount(id) }}</span>
                <span v-if="barTodo(id)" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
              </button>
            </div>
          </nav>

          <div :class="isMobile ? 'px-4 pb-16' : 'px-8 pb-16 max-w-3xl mx-auto'">
            <!-- A: to-do strip -->
            <div v-if="variant === 'A'" class="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div class="text-xs uppercase tracking-[0.3em] font-bold text-primary">This week · do these first</div>
              <div v-for="t in todos" :key="t.label" class="mt-2 flex items-center gap-2 text-sm">
                <AlertCircle class="w-4 h-4 text-primary shrink-0" />
                <span class="font-bold">{{ t.label }}</span>
                <span class="text-muted-foreground text-xs truncate">{{ t.detail }}</span>
              </div>
            </div>

            <!-- ───────────── D: one agenda ───────────── -->
            <template v-if="variant === 'D'">
              <div v-for="g in agenda" :key="g.label" class="mt-8">
                <div class="flex items-center justify-between">
                  <h2 class="font-display text-2xl">{{ g.label }}</h2>
                  <button class="text-xs font-bold text-primary flex items-center gap-1" @click="storyFor = scales[g.label === 'Tonight' ? 'tonight' : g.label === 'This week' ? 'week' : g.label === 'This month' ? 'month' : 'year']">
                    <Share2 class="w-3.5 h-3.5" /> Post story
                  </button>
                </div>
                <ol class="mt-3 border-l-2 border-border ml-2 space-y-3">
                  <li v-for="r in g.rows" :key="r.id" class="relative pl-5">
                    <span class="absolute -left-[7px] top-2 w-3 h-3 rounded-full border-2 border-background" :style="{ background: r.color }" />
                    <div class="flex items-baseline gap-2 text-xs text-muted-foreground">
                      <span class="font-bold text-foreground">{{ r.when }} {{ r.sub }}</span>
                      <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-semibold"><component :is="KIND_ICON[r.kind]" class="w-3 h-3" />{{ r.kind }}</span>
                    </div>
                    <div class="text-sm font-bold mt-0.5">{{ r.title }}</div>
                    <div class="text-xs text-muted-foreground">{{ r.meta }}</div>
                    <div v-if="r.todo" class="mt-1 text-xs font-bold text-primary">{{ r.todo }}</div>
                  </li>
                </ol>
              </div>
              <div v-if="quiet" class="mt-8 rounded-2xl border-2 border-dashed border-input p-5 text-center text-sm text-muted-foreground">
                Nothing tonight or this week. <span class="font-bold text-primary">Pick from 19 socials in Munich</span>
              </div>
            </template>

            <!-- ───────────── A / B / C / E: sections ───────────── -->
            <template v-else>
              <section v-for="id in order" :key="id" :data-scale="id" class="mt-10" :data-testid="`section-${id}`">
                <template v-for="s in [scales[id]]" :key="s.id">
                  <!-- Folded empty scale (C, E) -->
                  <div
                    v-if="folds && id !== 'goals' && !s.rows.length"
                    class="flex items-center justify-between gap-3 rounded-xl border border-dashed border-input px-4 py-3"
                  >
                    <div class="min-w-0">
                      <span class="font-display text-lg">{{ s.title }}</span>
                      <span class="text-sm text-muted-foreground"> · {{ s.emptyLine }}</span>
                    </div>
                    <span class="text-xs font-bold text-primary shrink-0 flex items-center gap-1"><Plus class="w-3.5 h-3.5" />{{ s.emptyCta }}</span>
                  </div>

                  <template v-else>
                    <!-- Heading -->
                    <div class="flex items-end justify-between gap-3 mb-4">
                      <div class="min-w-0">
                        <template v-if="variant === 'A'">
                          <div class="text-xs uppercase tracking-[0.3em] text-secondary">{{ s.oldEyebrow }}</div>
                          <h2 class="mt-2 text-2xl leading-tight font-display">
                            {{ s.oldTitle[0] }} <em class="italic text-primary">{{ s.oldTitle[1] }}</em>
                          </h2>
                        </template>
                        <template v-else>
                          <h2 class="text-3xl leading-tight font-display">{{ s.title }}</h2>
                          <div class="text-sm text-muted-foreground mt-0.5">{{ s.summary }}</div>
                        </template>
                      </div>
                      <Button
                        v-if="canPost(s) && variant !== 'A'"
                        variant="outline" size="sm" class="rounded-full shrink-0 gap-1.5"
                        :data-testid="`story-${id}`"
                        @click="storyFor = s"
                      >
                        <Share2 class="w-3.5 h-3.5" /> Post story
                      </Button>
                    </div>

                    <!-- Goals body -->
                    <div v-if="id === 'goals'" class="rounded-2xl bg-card border border-border p-5">
                      <div class="flex items-center gap-3">
                        <Target class="w-5 h-5 text-wd-green-600 shrink-0" style="color:var(--wd-green-600)" />
                        <div class="font-bold">{{ GOAL.title }}</div>
                      </div>
                      <div class="text-xs text-muted-foreground mt-1 ml-8">{{ GOAL.why }}</div>
                      <div class="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div class="h-full rounded-full" :style="{ width: GOAL.pct + '%', background: 'var(--wd-green-600)' }" />
                      </div>
                      <div class="mt-1.5 text-xs text-muted-foreground">{{ GOAL.pct }}% · {{ GOAL.detail }}</div>
                    </div>

                    <!-- Empty (A, B) -->
                    <div v-else-if="!s.rows.length" class="rounded-2xl p-6 text-center border-2 border-dashed border-input bg-white/50">
                      <Sparkles class="w-7 h-7 mx-auto mb-2 text-secondary" />
                      <p class="text-sm font-bold">{{ s.emptyLine }}</p>
                      <p class="mt-2 text-xs font-bold text-primary underline">{{ s.emptyCta }}</p>
                    </div>

                    <!-- Rows -->
                    <div v-else class="rounded-2xl bg-white border border-border overflow-hidden">
                      <div
                        v-for="(r, i) in s.rows" :key="r.id"
                        class="flex items-center gap-3 px-4 py-3" :class="i > 0 ? 'border-t border-border/50' : ''"
                      >
                        <span class="w-12 shrink-0 text-center text-[10px] font-black uppercase tracking-widest px-1.5 py-1 rounded leading-tight" :style="{ background: r.color + '18', color: r.color }">
                          {{ r.when }}<span v-if="r.sub" class="block font-bold normal-case tracking-normal">{{ r.sub }}</span>
                        </span>
                        <div class="min-w-0 flex-1">
                          <div class="text-sm font-bold truncate">{{ r.title }}</div>
                          <div class="text-xs text-muted-foreground truncate">{{ r.meta }}</div>
                          <div v-if="r.todo && variant !== 'A'" class="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                            <AlertCircle class="w-3.5 h-3.5" />{{ r.todo }}
                          </div>
                        </div>
                        <span v-if="r.done" class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap text-white" style="background:var(--wd-green-600)">
                          <Check class="w-3 h-3 inline -mt-0.5" /> {{ r.done }}
                        </span>
                        <span v-else-if="r.todo && !isMobile" class="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap bg-primary text-primary-foreground">
                          {{ r.kind === 'Festival' ? 'Get ticket' : 'Pay' }}
                        </span>
                      </div>
                    </div>

                    <!-- A: today's weekend story, inline under the week -->
                    <div v-if="variant === 'A' && id === 'week' && s.rows.length" class="mt-4 flex items-center gap-4 rounded-2xl bg-card border border-border p-4">
                      <div class="w-16 aspect-[9/16] rounded-lg grid place-items-center text-white text-[9px] font-black text-center leading-tight px-1" style="background:#ea580c">COME DANCE WITH ME</div>
                      <div class="min-w-0">
                        <div class="text-sm font-bold">Your weekend story</div>
                        <button class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3 py-1.5 text-xs font-bold" @click="storyFor = s">
                          <Share2 class="w-3.5 h-3.5" /> Share to story
                        </button>
                      </div>
                    </div>

                    <!-- E: courses post only on a milestone -->
                    <p v-if="variant === 'E' && id === 'month'" class="mt-2 text-xs text-muted-foreground">
                      A story shows up here when you start or finish a course.
                    </p>
                  </template>
                </template>
              </section>
            </template>

            <!-- Discover (all variants) -->
            <section class="mt-12">
              <template v-if="variant === 'A'">
                <div class="text-xs uppercase tracking-[0.3em] text-secondary">Widen your year · discover</div>
                <h2 class="mt-2 text-2xl leading-tight font-display">What could <em class="italic text-primary">rearrange</em> the year?</h2>
              </template>
              <template v-else>
                <h2 class="text-3xl leading-tight font-display">Discover</h2>
                <div class="text-sm text-muted-foreground mt-0.5">Festivals and nights you haven’t added</div>
              </template>
              <div class="mt-4 rounded-2xl p-5 text-white" style="background:linear-gradient(135deg,#7c3aed,#db2777)">
                <div class="text-[11px] uppercase tracking-widest font-bold text-white/80">Festival · not in your year</div>
                <div class="font-display text-2xl mt-1">Timba Fest London</div>
                <div class="text-sm text-white/85">Oct 9–11 · 3 friends going</div>
                <div class="mt-4 flex gap-2">
                  <span class="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold"><X class="w-3 h-3 inline" /> Skip</span>
                  <span class="rounded-full bg-white text-foreground px-3 py-1.5 text-xs font-bold"><Plus class="w-3 h-3 inline" /> Add to my year</span>
                </div>
              </div>
            </section>
          </div>

          <!-- Story sheet (mock) -->
          <div v-if="storyFor" class="absolute inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center" @click.self="storyFor = null">
            <div class="bg-card w-full rounded-t-3xl p-5" :class="isMobile ? '' : 'max-w-sm rounded-3xl'" data-testid="story-sheet">
              <div class="flex items-center justify-between">
                <div class="font-bold">{{ storyFor.title }} · story</div>
                <button aria-label="Close" @click="storyFor = null"><X class="w-5 h-5" /></button>
              </div>
              <div class="mt-4 mx-auto w-40 aspect-[9/16] rounded-2xl p-3 flex flex-col justify-end text-white" :style="{ background: storyFor.story!.color }">
                <div class="font-display text-2xl leading-none uppercase">{{ storyFor.story!.headline }}</div>
                <div class="mt-2 text-[11px] font-bold bg-black/80 rounded px-2 py-1">{{ storyFor.story!.line }}</div>
                <div class="mt-2 text-[9px] text-white/80">wedance.vip</div>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-2">
                <Button class="rounded-full gap-1.5"><Share2 class="w-4 h-4" /> Share to story</Button>
                <Button variant="outline" class="rounded-full">Save picture</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
