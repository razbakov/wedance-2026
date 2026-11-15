<script setup lang="ts">
/**
 * Sketch: Business → Home (/business). Today it repeats Events: six "Needs you" chores (drafts,
 * flyers for weekly classes that start in an hour) and then the same events again under
 * "Next 14 days". Nothing on it says how the business is doing or who noticed it.
 *
 * Four directions, clickable, mock data only (MontunoClub, Munich, Sun 15 Nov) — no API, no DB.
 * Shared rules in every variant: tasks shrink to one line that opens Events filtered; no flyer
 * reminders for weekly classes or events less than 24 h away.
 */
import {
  CalendarDays, Plus, ArrowRight, Users, Heart, MousePointerClick, ScanLine, Share2, Check,
  ChevronDown, ChevronUp, Sparkles, Mail, UserPlus, Lightbulb, TrendingUp, TrendingDown, Copy, X, Home, UserSquare, Settings, Globe, Contact, Palette, ExternalLink,
} from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Business home sketches', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Tonight first',
    idea: 'Home is what you open on the day itself: today’s events big, each with who’s coming, a door check-in and a story to share. The rest of the week is one compact strip.',
    good: 'Has a reason to be opened every event day. Uses data we have (plans, RSVPs, check-in). Faces make it warm.',
    cost: 'On a day without events the top is empty (it falls back to the next event). Says nothing about how the month went.',
  },
  {
    id: 'B',
    name: 'Pulse first',
    idea: 'Home answers “is it working?”: three numbers for the last 7 days with a trend, one sentence that stands out, and which event pulls people best.',
    good: 'The only page that shows results, so it never repeats Events. Gives organisers a reason to share more.',
    cost: 'Small schools see small numbers; zeros feel bad (Quiet week shows the fallback). Clicks/views live in PostHog, so v1 uses DB numbers only.',
  },
  {
    id: 'C',
    name: 'People first',
    idea: 'A short feed of people: who plans to come, new followers, booking and join requests, each with its one action (Reply, Approve, Follow back).',
    good: 'The most welcoming: it’s about dancers, not forms. Pulls bookings and requests out from under the flyer chores.',
    cost: 'A feed needs volume; for most pages it will be 2–3 items a week. Hard to scan for “what’s on tonight”.',
  },
  {
    id: 'D',
    name: 'Mix (recommended)',
    idea: 'One greeting line, today as a compact strip with faces and Door / Share, three pulse numbers that hide below a threshold, the top 3 people items, tasks as one line, and an idea for an empty week.',
    good: 'Every block is something Events doesn’t show. Works for a busy school and a quiet one. Each part is small enough to build one by one.',
    cost: 'Four blocks to build and keep honest. Needs care so it doesn’t grow back into a dashboard.',
  },
]

const variant = ref<Variant>('D')
const device = ref<'desktop' | 'mobile'>('desktop')
const week = ref<'busy' | 'quiet'>('busy')
const isMobile = computed(() => device.value === 'mobile')
const busy = computed(() => week.value === 'busy')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Mock data ───────────────────────────────────────────────────────────────
interface Person { name: string, color: string }
const P = (name: string, color: string): Person => ({ name, color })
const people = [P('Maria', 'bg-rose-400'), P('Jonas', 'bg-sky-500'), P('Lucía', 'bg-amber-500'), P('Ahmed', 'bg-emerald-500'), P('Olga', 'bg-violet-500'), P('Tom', 'bg-orange-500'), P('Sara', 'bg-teal-500'), P('Ivan', 'bg-indigo-500')]
const initials = (n: string) => n.slice(0, 1)

interface Ev { id: string, name: string, day: string, time: string, today?: boolean, draft?: boolean, weekly?: boolean, going: Person[], plans: number }
const EVENTS_BUSY: Ev[] = [
  { id: 'zero', name: 'Salsa From Zero', day: 'Today', time: '18:00', today: true, weekly: true, going: people.slice(0, 6), plans: 6 },
  { id: 'rueda', name: 'Rueda de Casino', day: 'Today', time: '19:00', today: true, weekly: true, going: people.slice(2, 6), plans: 4 },
  { id: 'casino', name: 'Casino Partnerwork', day: 'Today', time: '20:00', today: true, weekly: true, going: people.slice(0, 8), plans: 8 },
  { id: 'kiz', name: 'Kizomba Party · Wednesday', day: 'Wed 18.11.', time: '20:00', draft: true, going: [], plans: 0 },
  { id: 'salsa', name: 'Salsa Party · Saturday', day: 'Sat 28.11.', time: '20:00', draft: true, going: [], plans: 0 },
]
const EVENTS_QUIET: Ev[] = [
  { id: 'casino', name: 'Casino Partnerwork', day: 'Tue 17.11.', time: '20:00', weekly: true, going: people.slice(0, 1), plans: 1 },
]
const events = computed(() => busy.value ? EVENTS_BUSY : EVENTS_QUIET)
const today = computed(() => events.value.filter(e => e.today))
const nextUp = computed(() => events.value.filter(e => !e.today))
const goingToday = computed(() => today.value.reduce((n, e) => n + e.plans, 0))

// Tasks: drafts + flyers, minus flyer nags for weekly classes / events < 24 h.
interface Task { kind: 'Draft' | 'Flyer', title: string, hidden?: boolean }
const TASKS: Task[] = [
  { kind: 'Draft', title: 'Kizomba Party · Wednesday — publish it' },
  { kind: 'Draft', title: 'Salsa Party · Saturday — publish it' },
  { kind: 'Draft', title: 'Christmas Follies — publish it' },
  { kind: 'Flyer', title: 'Salsa From Zero flyer is out of date', hidden: true },
  { kind: 'Flyer', title: 'Rueda de Casino has no flyer', hidden: true },
  { kind: 'Flyer', title: 'Casino Partnerwork has no flyer', hidden: true },
]
const tasks = computed(() => busy.value ? TASKS.filter(t => !t.hidden) : [{ kind: 'Draft' as const, title: 'Christmas Follies — publish it' }])
const hiddenNags = computed(() => busy.value ? TASKS.filter(t => t.hidden).length : 0)
const tasksOpen = ref(false)

// Pulse (last 7 days vs the 7 before). Under the threshold a number hides.
const PULSE_BUSY = [
  { id: 'plans', label: 'Put you in their plan', value: 23, delta: +8, icon: CalendarDays },
  { id: 'followers', label: 'New followers', value: 5, delta: +2, icon: Heart },
  { id: 'clicks', label: 'Ticket & website clicks', value: 41, delta: -6, icon: MousePointerClick },
]
const PULSE_QUIET = [
  { id: 'plans', label: 'Put you in their plan', value: 1, delta: 0, icon: CalendarDays },
  { id: 'followers', label: 'New followers', value: 0, delta: 0, icon: Heart },
  { id: 'clicks', label: 'Ticket & website clicks', value: 2, delta: -1, icon: MousePointerClick },
]
const pulse = computed(() => busy.value ? PULSE_BUSY : PULSE_QUIET)
const THRESHOLD = 3
const pulseShown = computed(() => pulse.value.filter(p => p.value >= THRESHOLD))
const highlight = computed(() => busy.value ? 'Casino Partnerwork pulls the most people: 8 plan to come tonight, the most of any class this month.' : null)
const bestEvents = [
  { name: 'Casino Partnerwork', plans: 8, views: 96 },
  { name: 'Salsa From Zero', plans: 6, views: 74 },
  { name: 'Rueda de Casino', plans: 4, views: 51 },
]

// People feed
type FeedKind = 'going' | 'follow' | 'booking' | 'join'
interface Feed { id: string, kind: FeedKind, who: Person[], text: string, when: string, action?: string }
const FEED_BUSY: Feed[] = [
  { id: 'b1', kind: 'booking', who: [P('Lena', 'bg-pink-500')], text: 'Lena wants to book a private class for her wedding (2 people)', when: '2 h ago', action: 'Reply' },
  { id: 'g1', kind: 'going', who: people.slice(0, 5), text: 'Maria, Jonas and 6 others plan to come to Casino Partnerwork tonight', when: 'today' },
  { id: 'j1', kind: 'join', who: [P('Carlos', 'bg-cyan-600')], text: 'Carlos asks to join MontunoClub’s team as a teacher', when: 'yesterday', action: 'Approve' },
  { id: 'f1', kind: 'follow', who: people.slice(4, 8), text: 'Olga, Tom, Sara and Ivan started following MontunoClub', when: 'this week', action: 'Say hi' },
  { id: 'g2', kind: 'going', who: people.slice(2, 4), text: 'Lucía and Ahmed came to Rueda de Casino for the 4th week in a row', when: 'Sun 8.11.' },
]
const FEED_QUIET: Feed[] = [
  { id: 'g1', kind: 'going', who: people.slice(0, 1), text: 'Maria plans to come to Casino Partnerwork on Tuesday', when: 'today' },
]
const feed = computed(() => busy.value ? FEED_BUSY : FEED_QUIET)
const done = ref<Record<string, boolean>>({})
const FEED_ICON = { going: CalendarDays, follow: UserPlus, booking: Mail, join: Users } as const

// Door & share sheets (mock)
const door = ref<Ev | null>(null)
const checkedIn = ref<Record<string, boolean>>({})
const shared = ref<string | null>(null)
const ideaTaken = ref(false)

watch([variant, device, week], () => {
  tasksOpen.value = false; done.value = {}; door.value = null; checkedIn.value = {}; shared.value = null; ideaTaken.value = false
})

const greeting = computed(() => busy.value
  ? `${today.value.length} classes tonight, ${goingToday.value} people plan to come.`
  : 'Nothing tonight. Next up: Casino Partnerwork on Tuesday.')

const SIDEBAR = [
  { label: 'Home', icon: Home, active: true }, { label: 'Events', icon: CalendarDays }, { label: 'Network', icon: UserSquare },
]
const PAGE_MENU = [
  { label: 'Settings', icon: Settings }, { label: 'Team', icon: Users }, { label: 'Website', icon: Globe },
  { label: 'Contacts', icon: Contact }, { label: 'Flyer styles', icon: Palette }, { label: 'View page', icon: ExternalLink },
]
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Business home sketch</span>
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
            v-for="s in (['busy', 'quiet'] as const)" :key="s" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="week === s ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="week = s"
          >{{ s === 'busy' ? 'Busy week' : 'Quiet week' }}</button>
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
        class="relative mx-auto bg-background overflow-hidden flex"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-6xl rounded-2xl border border-border shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '720px' }"
      >
        <!-- Mock business sidebar (desktop only, as today) -->
        <aside v-if="!isMobile" class="w-56 shrink-0 border-r border-border bg-card/60 p-4 text-sm">
          <Brand class="shrink-0" />
          <p class="mt-6 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Business</p>
          <div class="mt-3 rounded-xl border bg-background px-3 py-2 font-semibold">MontunoClub</div>
          <ul class="mt-3 grid gap-1">
            <li v-for="i in SIDEBAR" :key="i.label" class="flex items-center gap-2 rounded-xl px-3 py-2" :class="i.active ? 'bg-primary/10 font-bold text-wd-red-800' : 'text-foreground'">
              <component :is="i.icon" class="size-4" /> {{ i.label }}
            </li>
          </ul>
          <p class="mt-5 px-3 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">MontunoClub</p>
          <ul class="mt-2 grid gap-1">
            <li v-for="i in PAGE_MENU" :key="i.label" class="flex items-center gap-2 rounded-xl px-3 py-1.5 text-muted-foreground"><component :is="i.icon" class="size-4" /> {{ i.label }}</li>
          </ul>
        </aside>

        <div class="flex-1 min-w-0 h-full overflow-y-auto" :class="isMobile ? 'p-4' : 'p-8'">
          <div :class="isMobile ? '' : 'max-w-3xl'">
            <!-- Header: greeting instead of "Home / What needs you" -->
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Sun 15 Nov · MontunoClub</p>
                <h1 class="mt-1 font-display font-bold leading-tight" :class="isMobile ? 'text-2xl' : 'text-4xl'">Good evening, Alösha.</h1>
                <p v-if="variant !== 'B' && variant !== 'C'" class="mt-1 text-muted-foreground" data-testid="greeting">{{ greeting }}</p>
                <p v-else-if="variant === 'B'" class="mt-1 text-muted-foreground">Here’s how the last 7 days went.</p>
                <p v-else class="mt-1 text-muted-foreground">{{ busy ? '5 things from dancers this week.' : 'One dancer this week.' }}</p>
              </div>
              <Button v-if="!isMobile" type="button" variant="pill" size="pill-sm" class="shrink-0"><Plus /> New event</Button>
            </div>

            <!-- ═════ A: Tonight first ═════ -->
            <template v-if="variant === 'A'">
              <section class="mt-6">
                <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">{{ today.length ? 'Tonight' : 'Next up' }}</h2>
                <div class="mt-3 grid gap-3">
                  <article v-for="e in (today.length ? today : nextUp.slice(0, 1))" :key="e.id" class="rounded-2xl border bg-card p-4 shadow-wd-card">
                    <div class="flex items-start gap-4" :class="isMobile ? 'flex-col gap-3' : ''">
                      <div class="w-16 shrink-0" :class="isMobile ? 'flex items-baseline gap-2 w-auto' : 'text-center'">
                        <p class="text-xs font-bold uppercase tracking-wider text-secondary">{{ e.day }}</p>
                        <p class="font-display text-xl font-bold">{{ e.time }}</p>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold">{{ e.name }}</p>
                        <div class="mt-2 flex items-center gap-2">
                          <div class="flex -space-x-2">
                            <span v-for="p in e.going.slice(0, 5)" :key="p.name" :title="p.name" class="grid size-7 place-items-center rounded-full border-2 border-card text-xs font-bold text-white" :class="p.color">{{ initials(p.name) }}</span>
                          </div>
                          <span class="text-sm text-muted-foreground">{{ e.plans }} {{ e.plans === 1 ? 'plans' : 'plan' }} to come</span>
                        </div>
                      </div>
                      <div class="flex gap-2 shrink-0">
                        <Button type="button" variant="pill" size="pill-sm" @click="door = e"><ScanLine /> Door</Button>
                        <Button type="button" variant="outline-pill" size="pill-sm" @click="shared = e.id"><Share2 /> {{ shared === e.id ? 'Story ready' : 'Share' }}</Button>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
              <section class="mt-6">
                <div class="flex items-baseline justify-between"><h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Later</h2><span class="text-xs font-bold text-secondary">All events →</span></div>
                <ul class="mt-2 divide-y rounded-2xl border bg-card">
                  <li v-for="e in (today.length ? nextUp : nextUp.slice(1))" :key="e.id" class="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span class="w-20 shrink-0 text-xs font-bold uppercase text-secondary">{{ e.day }}</span>
                    <span class="flex-1 truncate font-semibold">{{ e.name }}</span>
                    <AdminStatus v-if="e.draft" tone="warning">Draft</AdminStatus>
                  </li>
                  <li v-if="!(today.length ? nextUp : nextUp.slice(1)).length" class="px-4 py-3 text-sm text-muted-foreground">Nothing else in the next two weeks.</li>
                </ul>
              </section>
            </template>

            <!-- ═════ B: Pulse first ═════ -->
            <template v-if="variant === 'B'">
              <section class="mt-6">
                <div class="grid gap-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
                  <div v-for="p in pulse" :key="p.id" class="rounded-2xl border bg-card p-4 shadow-wd-card">
                    <p class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><component :is="p.icon" class="size-3.5" /> {{ p.label }}</p>
                    <p class="mt-1 font-display text-4xl font-bold">{{ p.value }}</p>
                    <p class="mt-1 flex items-center gap-1 text-xs font-bold" :class="p.delta > 0 ? 'text-wd-green-700' : p.delta < 0 ? 'text-wd-red-800' : 'text-muted-foreground'">
                      <TrendingUp v-if="p.delta > 0" class="size-3.5" /><TrendingDown v-else-if="p.delta < 0" class="size-3.5" />
                      {{ p.delta === 0 ? 'same as the week before' : `${p.delta > 0 ? '+' : ''}${p.delta} vs the week before` }}
                    </p>
                  </div>
                </div>
                <p v-if="highlight" class="mt-4 flex items-start gap-2 rounded-2xl bg-wd-amber-500/15 p-4 text-sm"><Sparkles class="mt-0.5 size-4 shrink-0 text-wd-amber-800" /> {{ highlight }}</p>
                <p v-else class="mt-4 flex items-start gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><Lightbulb class="mt-0.5 size-4 shrink-0" /> Quiet week. Pages that share an event as a story get about 3× more plans. <button type="button" class="font-bold text-wd-red-800 hover:underline" @click="shared = 'quiet'">{{ shared ? 'Story ready ✓' : 'Share Tuesday’s class' }}</button></p>
              </section>
              <section v-if="busy" class="mt-6">
                <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">What pulls people</h2>
                <ul class="mt-2 divide-y rounded-2xl border bg-card">
                  <li v-for="(e, i) in bestEvents" :key="e.name" class="flex items-center gap-3 px-4 py-3 text-sm">
                    <span class="w-5 font-display font-bold text-muted-foreground">{{ i + 1 }}</span>
                    <span class="flex-1 truncate font-semibold">{{ e.name }}</span>
                    <span class="text-xs text-muted-foreground">{{ e.views }} views</span>
                    <span class="w-16 text-right text-xs font-bold">{{ e.plans }} plans</span>
                  </li>
                </ul>
              </section>
            </template>

            <!-- ═════ C: People first ═════ -->
            <template v-if="variant === 'C'">
              <section class="mt-6">
                <ul class="grid gap-2">
                  <li v-for="f in feed" :key="f.id" class="flex items-start gap-3 rounded-2xl border bg-card p-4" :class="done[f.id] ? 'opacity-60' : ''">
                    <div class="flex -space-x-2 shrink-0">
                      <span v-for="p in f.who.slice(0, 3)" :key="p.name" class="grid size-9 place-items-center rounded-full border-2 border-card font-bold text-white" :class="p.color">{{ initials(p.name) }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm"><component :is="FEED_ICON[f.kind]" class="inline size-3.5 -mt-0.5 text-secondary" /> {{ f.text }}</p>
                      <p class="mt-0.5 text-xs text-muted-foreground">{{ f.when }}</p>
                    </div>
                    <Button v-if="f.action && !done[f.id]" type="button" :variant="f.kind === 'booking' || f.kind === 'join' ? 'pill' : 'outline-pill'" size="pill-sm" class="shrink-0" @click="done[f.id] = true">{{ f.action }}</Button>
                    <span v-else-if="f.action" class="shrink-0 text-xs font-bold text-wd-green-700"><Check class="inline size-3.5" /> Done</span>
                  </li>
                </ul>
                <p v-if="!busy" class="mt-3 flex items-start gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><Lightbulb class="mt-0.5 size-4 shrink-0" /> When dancers plan to come, follow you or ask to book, they show up here.</p>
              </section>
            </template>

            <!-- ═════ D: Mix ═════ -->
            <template v-if="variant === 'D'">
              <section v-if="today.length" class="mt-6">
                <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Tonight</h2>
                <div class="mt-3 flex gap-2" :class="isMobile ? '-mx-4 px-4 pb-2 overflow-x-auto snap-x snap-mandatory' : ''">
                  <article v-for="e in today" :key="e.id" class="min-w-0 rounded-2xl border bg-card p-3 shadow-wd-card" :class="isMobile ? 'w-60 shrink-0 snap-start' : 'flex-1'">
                    <div class="flex items-baseline justify-between gap-2">
                      <p class="font-display text-lg font-bold">{{ e.time }}</p>
                      <div class="flex -space-x-1.5">
                        <span v-for="p in e.going.slice(0, 4)" :key="p.name" class="grid size-6 place-items-center rounded-full border-2 border-card text-[10px] font-bold text-white" :class="p.color">{{ initials(p.name) }}</span>
                      </div>
                    </div>
                    <p class="truncate text-sm font-bold">{{ e.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ e.plans }} plan to come</p>
                    <div class="mt-2 flex gap-1.5">
                      <Button type="button" variant="pill" size="pill-sm" class="flex-1" @click="door = e"><ScanLine /> Door</Button>
                      <Button type="button" variant="outline-pill" size="pill-sm" :aria-label="`Share ${e.name}`" @click="shared = e.id"><Check v-if="shared === e.id" /><Share2 v-else /></Button>
                    </div>
                  </article>
                </div>
              </section>

              <section class="mt-6">
                <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Last 7 days</h2>
                <div v-if="pulseShown.length" class="mt-3 flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border bg-card p-4">
                  <div v-for="p in pulseShown" :key="p.id">
                    <p class="font-display text-3xl font-bold">{{ p.value }} <span class="text-xs font-bold" :class="p.delta > 0 ? 'text-wd-green-700' : 'text-wd-red-800'">{{ p.delta > 0 ? '+' : '' }}{{ p.delta }}</span></p>
                    <p class="text-xs text-muted-foreground">{{ p.label }}</p>
                  </div>
                  <p v-if="highlight" class="basis-full flex items-start gap-2 text-sm"><Sparkles class="mt-0.5 size-4 shrink-0 text-wd-amber-800" /> {{ highlight }}</p>
                </div>
                <p v-else class="mt-3 flex items-start gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  <Lightbulb class="mt-0.5 size-4 shrink-0" />
                  <span>Your numbers show up here once dancers start planning your events. Sharing Tuesday’s class as a story is the fastest way to get the first ones.
                    <button type="button" class="font-bold text-wd-red-800 hover:underline" @click="shared = 'quiet'">{{ shared ? 'Story ready ✓' : 'Share it' }}</button></span>
                </p>
              </section>

              <section class="mt-6">
                <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">From dancers</h2>
                <ul class="mt-3 grid gap-2">
                  <li v-for="f in feed.filter(f => f.kind !== 'going').slice(0, 3).concat(busy ? [] : feed)" :key="f.id" class="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3" :class="done[f.id] ? 'opacity-60' : ''">
                    <div class="flex -space-x-2 shrink-0">
                      <span v-for="p in f.who.slice(0, 3)" :key="p.name" class="grid size-8 place-items-center rounded-full border-2 border-card text-sm font-bold text-white" :class="p.color">{{ initials(p.name) }}</span>
                    </div>
                    <p class="flex-1 min-w-0 text-sm">{{ f.text }} <span class="text-xs text-muted-foreground">· {{ f.when }}</span></p>
                    <Button v-if="f.action && !done[f.id]" type="button" :variant="f.kind === 'follow' ? 'outline-pill' : 'pill'" size="pill-sm" class="shrink-0" @click="done[f.id] = true">{{ f.action }}</Button>
                    <span v-else-if="f.action" class="shrink-0 text-xs font-bold text-wd-green-700"><Check class="inline size-3.5" /></span>
                  </li>
                </ul>
              </section>

              <section v-if="!busy" class="mt-6">
                <div class="flex items-start gap-3 rounded-2xl bg-wd-amber-500/15 p-4" :class="isMobile ? 'flex-col' : ''">
                  <Lightbulb class="mt-0.5 size-5 shrink-0 text-wd-amber-800" />
                  <div class="flex-1 text-sm">
                    <p class="font-bold">Saturday 28th is still free.</p>
                    <p class="text-muted-foreground">Your last Salsa Party had 14 people planning to come. Copy it to the 28th?</p>
                  </div>
                  <Button type="button" variant="pill" size="pill-sm" class="shrink-0" @click="ideaTaken = true"><Copy /> {{ ideaTaken ? 'Draft made ✓' : 'Copy it' }}</Button>
                </div>
              </section>
            </template>

            <!-- Tasks in one line (every variant) -->
            <section class="mt-6" data-testid="tasks-line">
              <button type="button" class="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent/40" @click="tasksOpen = !tasksOpen">
                <AdminStatus tone="warning">{{ tasks.length }} to finish</AdminStatus>
                <span class="flex-1 min-w-0 truncate">{{ tasks.length }} {{ tasks.length === 1 ? 'draft' : 'drafts' }} not published yet</span>
                <ChevronUp v-if="tasksOpen" class="size-4 shrink-0 text-muted-foreground" /><ChevronDown v-else class="size-4 shrink-0 text-muted-foreground" />
              </button>
              <ul v-if="tasksOpen" class="mt-2 grid gap-1 pl-2 text-sm">
                <li v-for="t in tasks" :key="t.title" class="flex items-center gap-2"><ArrowRight class="size-3.5 text-muted-foreground" /> {{ t.title }}</li>
                <li class="mt-1 text-xs font-bold text-secondary">Open in Events →</li>
                <li v-if="hiddenNags" class="text-xs text-muted-foreground">{{ hiddenNags }} flyer reminders left out: weekly classes starting within 24 h don’t need a new flyer.</li>
              </ul>
            </section>
          </div>
        </div>

        <!-- Door sheet (mock check-in) -->
        <div v-if="door" class="absolute inset-0 z-20 flex items-end justify-center bg-foreground/40" :class="isMobile ? '' : 'items-center'" @click.self="door = null">
          <div class="w-full max-w-md rounded-t-3xl bg-background p-5 shadow-xl" :class="isMobile ? '' : 'rounded-3xl'">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Door · {{ door.time }}</p>
                <p class="font-display text-xl font-bold">{{ door.name }}</p>
                <p class="text-xs text-muted-foreground">{{ Object.values(checkedIn).filter(Boolean).length }} of {{ door.going.length }} here</p>
              </div>
              <button type="button" aria-label="Close" class="rounded-full p-1 hover:bg-muted" @click="door = null"><X class="size-5" /></button>
            </div>
            <ul class="mt-4 grid gap-2">
              <li v-for="p in door.going" :key="p.name" class="flex items-center gap-3">
                <span class="grid size-8 place-items-center rounded-full text-sm font-bold text-white" :class="p.color">{{ initials(p.name) }}</span>
                <span class="flex-1 text-sm font-semibold">{{ p.name }}</span>
                <Button type="button" :variant="checkedIn[p.name] ? 'outline-pill' : 'pill'" size="pill-sm" @click="checkedIn[p.name] = !checkedIn[p.name]">{{ checkedIn[p.name] ? 'Here ✓' : 'Check in' }}</Button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
