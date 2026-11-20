<script setup lang="ts">
/**
 * /business — business home (RAZ-973, sketch /sketches/business-home variant D). Only what
 * Events doesn't show: today with the faces of who's coming, the last 7 days, what dancers
 * are waiting on, an idea for an empty week, and the chores folded into one line.
 * Sidebar switcher filters. Data: businessEvents.inbox.
 */
import { ArrowRight, Plus, Search, Share2, Check, Users, ChevronDown, ChevronUp, Sparkles, Lightbulb, Copy, TrendingUp, TrendingDown, Heart } from 'lucide-vue-next'
import { eventLocalTime, eventLocalWeekday, eventLocalDate } from '#shared/utils/eventTime'
import { greetingFor, isTask, namesLine, visiblePulse } from '#shared/utils/businessHome'
import { initialsOf } from '#shared/utils/initials'

definePageMeta({ layout: 'business' })
useHead({ title: 'Business | WeDance' })

const { $trpc } = useNuxtApp()
const { track } = useTrack()
const { dancerName } = useAuth()
const businessProfile = useBusinessProfile()
type Inbox = Awaited<ReturnType<typeof $trpc.businessEvents.inbox.query>>
const data = ref<Inbox | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Switching profiles quickly: only the latest request may fill the page.
let latest = 0
async function load() {
  const run = ++latest
  loading.value = true
  error.value = null
  try {
    const res = await $trpc.businessEvents.inbox.query(businessProfile.value ? { profile: businessProfile.value } : undefined)
    if (run === latest) data.value = res
  } catch (e: any) {
    if (run === latest) error.value = e?.message || 'Could not load your home.'
  } finally {
    if (run === latest) loading.value = false
  }
}
onMounted(load)
watch(businessProfile, load)

const now = new Date()
const firstName = computed(() => (dancerName.value ?? '').trim().split(/\s+/)[0] || '')
const greeting = computed(() => `${greetingFor(now.getHours())}${firstName.value ? `, ${firstName.value}` : ''}.`)
const pageName = computed(() => data.value?.profiles.find((p: any) => p.username === businessProfile.value)?.name ?? null)
const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

function dayLabel(iso: string | Date, tz: string | null) {
  const zone = tz || 'Europe/Berlin'
  const d = eventLocalDate(iso, zone)
  const today = eventLocalDate(new Date(), zone)
  const tomorrow = eventLocalDate(new Date(Date.now() + 86400_000), zone)
  if (d === today) return 'today'
  if (d === tomorrow) return 'tomorrow'
  return `on ${eventLocalWeekday(iso, zone).slice(0, 3)} ${Number(d.slice(8))}.${Number(d.slice(5, 7))}.`
}

const today = computed(() => data.value?.today ?? [])
const goingToday = computed(() => today.value.reduce((n, e) => n + e.going, 0))
const nextUp = computed(() => data.value?.comingUp.find(e => e.published && !today.value.some(t => t.id === e.id)) ?? null)
const summary = computed(() => {
  if (today.value.length) {
    const n = today.value.length
    return `${n} ${n === 1 ? 'event' : 'events'} today${goingToday.value ? `, ${goingToday.value} ${goingToday.value === 1 ? 'person plans' : 'people plan'} to come` : ''}.`
  }
  if (nextUp.value) return `Nothing today. Next up: ${nextUp.value.name} ${dayLabel(nextUp.value.startDate, nextUp.value.timezone)}.`
  return 'Nothing on in the next two weeks.'
})

const pulse = computed(() => visiblePulse(data.value?.pulse ?? []))
const tasks = computed(() => (data.value?.needs ?? []).filter(n => isTask(n.kind)))
const fromDancers = computed(() => (data.value?.needs ?? []).filter(n => !isTask(n.kind)))
const missingCount = computed(() => tasks.value.filter(n => n.kind === 'missing' || n.kind === 'draft').length)
const tasksOpen = ref(false)
const tasksLine = computed(() => {
  const count = (k: string) => tasks.value.filter(t => t.kind === k).length
  const drafts = count('draft'), missing = count('missing'), flyers = count('flyer')
  return [
    drafts && `${drafts} ${drafts === 1 ? 'draft' : 'drafts'} to publish`,
    missing && `${missing} missing details`,
    flyers && `${flyers} ${flyers === 1 ? 'flyer' : 'flyers'} to make`,
  ].filter(Boolean).join(' · ')
})
const followersLine = computed(() => {
  const f = data.value?.newFollowers
  return f ? `${namesLine(f.names, f.count)} started following ${f.profile ?? 'your pages'}` : ''
})

// Share an event's public link (the phone's share sheet, else copy).
type Shareable = { id: string, name: string | null, publicPath: string | null }
const shared = ref<string | null>(null)
async function share(e: Shareable) {
  if (!e.publicPath) return
  const url = `${location.origin}${e.publicPath}`
  let method = 'copy'
  try {
    if (navigator.share) { await navigator.share({ title: e.name ?? 'WeDance', url }); method = 'native' }
    else await navigator.clipboard.writeText(url)
  } catch { return }
  shared.value = e.id
  track('event_link_shared', { event_id: e.id, method, surface: 'business_home' })
}
// Quiet week: share today's event, else the next one (its public link comes with `today` only).
const nextToShare = computed<Shareable | null>(() => {
  if (today.value[0]) return today.value[0]
  const n = nextUp.value
  return n?.publicPath ? { id: n.id, name: n.name, publicPath: n.publicPath } : null
})
</script>

<template>
  <div>
    <header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div class="min-w-0">
        <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">{{ todayLabel }}{{ pageName ? ` · ${pageName}` : '' }}</p>
        <h1 class="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">{{ greeting }}</h1>
        <p v-if="data?.profiles.length" class="mt-1 text-muted-foreground" data-home-summary>{{ summary }}</p>
      </div>
      <Button v-if="data?.profiles.length" variant="pill" size="pill-sm" as-child>
        <NuxtLink to="/business/events/new"><Plus /> New event</NuxtLink>
      </Button>
    </header>

    <AdminState v-if="error" kind="error" :message="error" />
    <AdminState v-if="loading" kind="loading" />

    <template v-else-if="data">
      <!-- No profiles yet: the only thing to do is get one. -->
      <div v-if="!data.profiles.length" class="mt-6 rounded-2xl border-2 border-dashed border-input bg-card/60 p-8 text-center">
        <p class="font-display text-lg font-bold">Start with your profile</p>
        <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          WeDance already lists thousands of artists, venues and organizers. Find yours and claim it, or create a new one. Then you can add events.
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="pill" as-child><NuxtLink to="/business/claim"><Search /> Find my profile</NuxtLink></Button>
          <Button variant="outline-pill" as-child><NuxtLink to="/business/new"><Plus /> Create a profile</NuxtLink></Button>
        </div>
        <ul v-if="data.needs.length" class="mt-6 grid gap-2 text-left">
          <li v-for="n in data.needs" :key="n.title" class="rounded-xl border bg-card p-3 text-sm">
            <p class="font-bold">{{ n.title }}</p>
            <p v-if="n.detail" class="text-xs text-muted-foreground">{{ n.detail }}</p>
          </li>
        </ul>
      </div>

      <template v-else>
        <!-- Today: who's coming, their list, a link to share. Swipes sideways on a phone. -->
        <section v-if="today.length" class="mt-6" data-home-today>
          <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Today</h2>
          <div class="-mx-4 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:overflow-visible sm:px-0">
            <article v-for="e in today" :key="e.role + e.id" class="w-60 shrink-0 snap-start rounded-2xl border bg-card p-3 shadow-wd-card sm:w-auto">
              <div class="flex items-center justify-between gap-2">
                <p class="font-display text-lg font-bold">{{ eventLocalTime(e.startDate, e.timezone || 'Europe/Berlin') }}</p>
                <div v-if="e.faces.length" class="flex -space-x-1.5">
                  <Avatar v-for="(p, i) in e.faces.slice(0, 4)" :key="i" class="size-6 border-2 border-card text-[10px]">
                    <AvatarImage v-if="p.photo" :src="p.photo" :alt="p.name ?? ''" />
                    <AvatarFallback>{{ initialsOf(p.name) }}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <p class="truncate text-sm font-bold">{{ e.name }}</p>
              <p class="text-xs text-muted-foreground">
                <template v-if="e.role === 'lineup'">You’re in the line-up · </template>
                <template v-else-if="e.role === 'venue'">At your venue · </template>
                {{ e.going ? `${e.going} ${e.going === 1 ? 'plans' : 'plan'} to come` : 'No sign-ups yet' }}
              </p>
              <div class="mt-2 flex gap-1.5">
                <Button variant="pill" size="pill-sm" class="flex-1" as-child>
                  <NuxtLink :to="e.to.startsWith('/business/') ? `${e.to}#whos-coming` : e.to"><Users /> Who’s coming</NuxtLink>
                </Button>
                <Button v-if="e.publicPath" type="button" variant="outline-pill" size="pill-sm" :aria-label="`Share ${e.name}`" @click="share(e)">
                  <Check v-if="shared === e.id" /><Share2 v-else />
                </Button>
              </div>
            </article>
          </div>
        </section>

        <!-- The last 7 days: numbers that hide below 3, one line that stands out. -->
        <section class="mt-6" data-home-pulse>
          <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Last 7 days</h2>
          <div v-if="pulse.length" class="mt-3 flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border bg-card p-4">
            <div v-for="p in pulse" :key="p.id">
              <p class="font-display text-3xl font-bold">
                {{ p.value }}
                <span v-if="p.delta" class="inline-flex items-center gap-0.5 text-xs font-bold" :class="p.delta > 0 ? 'text-wd-green-700' : 'text-wd-red-800'">
                  <TrendingUp v-if="p.delta > 0" class="size-3" /><TrendingDown v-else class="size-3" />{{ p.delta > 0 ? '+' : '' }}{{ p.delta }}
                </span>
              </p>
              <p class="text-xs text-muted-foreground">{{ p.label }}</p>
            </div>
            <p v-if="data.highlight" class="flex basis-full items-start gap-2 text-sm">
              <Sparkles class="mt-0.5 size-4 shrink-0 text-wd-amber-800" aria-hidden="true" />
              <span>{{ data.highlight.name }} pulls the most people: {{ data.highlight.going }} plan to come{{ data.highlight.today ? ' today' : '' }}.</span>
            </p>
          </div>
          <p v-else class="mt-3 flex items-start gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            <Lightbulb class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Your numbers show up here once dancers put your events in their plan, follow you or answer your poll.
              <template v-if="nextToShare">
                Sharing {{ nextToShare.name }} is the fastest way to get the first ones.
                <button type="button" class="font-bold text-wd-red-800 hover:underline" @click="share(nextToShare)">{{ shared === nextToShare.id ? 'Link shared ✓' : 'Share it' }}</button>
              </template>
            </span>
          </p>
        </section>

        <!-- Dancers and organisers waiting on you, and who started following. -->
        <section class="mt-6" data-home-people>
          <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">From dancers</h2>
          <ul class="mt-3 grid gap-2">
            <li v-if="data.newFollowers" class="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
              <div class="flex shrink-0 -space-x-2">
                <Avatar v-for="(p, i) in data.newFollowers.faces" :key="i" class="size-8 border-2 border-card text-xs">
                  <AvatarImage v-if="p.photo" :src="p.photo" :alt="p.name ?? ''" />
                  <AvatarFallback>{{ initialsOf(p.name) }}</AvatarFallback>
                </Avatar>
              </div>
              <p class="min-w-0 flex-1 text-sm"><Heart class="-mt-0.5 inline size-3.5 text-secondary" aria-hidden="true" /> {{ followersLine }} <span class="text-xs text-muted-foreground">· this week</span></p>
            </li>
            <li v-for="n in fromDancers" :key="n.title + n.to">
              <NuxtLink :to="n.to" class="group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:bg-accent/40">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold">{{ n.title }}</p>
                  <p v-if="n.detail" class="mt-0.5 text-xs text-muted-foreground">{{ n.detail }}</p>
                </div>
                <ArrowRight class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </NuxtLink>
            </li>
          </ul>
          <p v-if="!data.newFollowers && !fromDancers.length" class="mt-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            Nobody is waiting on you. Booking requests, people asking to join your team and new followers show up here.
          </p>
        </section>

        <!-- An empty week: start from the last event. -->
        <section v-if="data.idea" class="mt-6" data-home-idea>
          <div class="flex flex-col gap-3 rounded-2xl bg-wd-amber-500/15 p-4 sm:flex-row sm:items-start">
            <Lightbulb class="mt-0.5 size-5 shrink-0 text-wd-amber-800" aria-hidden="true" />
            <div class="flex-1 text-sm">
              <p class="font-bold">Nothing of yours is on in the next 7 days.</p>
              <p class="text-muted-foreground">Start from {{ data.idea.lastName }}: “Like my last event” copies it to a new date.</p>
            </div>
            <Button variant="pill" size="pill-sm" class="shrink-0 self-start" as-child>
              <NuxtLink :to="data.idea.to"><Copy /> New date</NuxtLink>
            </Button>
          </div>
        </section>

        <!-- Chores in one line; the full list lives in Events. -->
        <section v-if="tasks.length" class="mt-6" data-home-tasks>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left text-sm hover:bg-accent/40"
            :aria-expanded="tasksOpen"
            @click="tasksOpen = !tasksOpen"
          >
            <AdminStatus tone="warning">{{ tasks.length }} to finish</AdminStatus>
            <span class="min-w-0 flex-1 truncate">{{ tasksLine }}</span>
            <ChevronUp v-if="tasksOpen" class="size-4 shrink-0 text-muted-foreground" /><ChevronDown v-else class="size-4 shrink-0 text-muted-foreground" />
          </button>
          <div v-if="tasksOpen" class="mt-2 grid gap-1">
            <NuxtLink v-for="t in tasks" :key="t.title + t.to" :to="t.to" class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-accent/40">
              <ArrowRight class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span class="min-w-0 flex-1"><span class="font-semibold">{{ t.title }}</span><span v-if="t.detail" class="text-muted-foreground"> · {{ t.detail }}</span></span>
            </NuxtLink>
            <AiAppCta v-if="missingCount >= 2" surface="business_dashboard_needs" variant="inline" label="Fill them in from ChatGPT" class="px-3 pt-1">
              Several events missing details?
            </AiAppCta>
            <NuxtLink to="/business/events" class="px-3 pt-1 text-xs font-bold text-secondary hover:underline">All events →</NuxtLink>
          </div>
        </section>
        <p v-else class="mt-6 text-sm text-muted-foreground">
          Your events have everything they need. <NuxtLink to="/business/events" class="font-bold text-secondary hover:underline">All events →</NuxtLink>
        </p>
      </template>
    </template>
  </div>
</template>
