<script setup lang="ts">
import { UX_UPDATED, uxHandoffs, uxItems, uxJourneys, uxStages, uxStatusLabel, type UxItem, type UxJourneyId, type UxStatus } from '~/lib/ux-map'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'UX map · WeDance Docs',
  description: 'Every WeDance user journey across six stages, from discovering to bringing friends, with what is live, partial, missing or a gap.',
})

/**
 * The UX map: journeys as rows, stages as columns, each cell the real pages
 * and features at that step. Data: app/lib/ux-map.ts (hand-maintained).
 */
const statuses: UxStatus[] = ['live', 'partial', 'missing', 'gap']
const shown = ref<Set<UxStatus>>(new Set(statuses))
const focus = ref<UxJourneyId | null>(null)
const selected = ref<UxItem | null>(null)

function toggle(st: UxStatus) {
  const next = new Set(shown.value)
  if (next.has(st)) next.delete(st)
  else next.add(st)
  shown.value = next
}

const cell = (j: UxJourneyId, stage: string) =>
  uxItems.filter(i => i.journey === j && i.stage === stage && shown.value.has(i.status))

const health = computed(() => uxStages.map((s) => {
  const items = uxItems.filter(i => i.stage === s.key && (!focus.value || i.journey === focus.value))
  const count = (st: UxStatus) => items.filter(i => i.status === st).length
  return { ...s, total: items.length || 1, live: count('live'), partial: count('partial'), missing: count('missing'), gap: count('gap') }
}))

const total = (st: UxStatus) => uxItems.filter(i => i.status === st).length
const returnItems = uxItems.filter(i => i.stage === 'return')
const returnWeak = returnItems.filter(i => i.status !== 'live').length

const chip: Record<UxStatus, string> = {
  live: 'bg-success/12 border-transparent',
  partial: 'bg-warning/15 border-transparent',
  missing: 'bg-destructive/10 border-transparent',
  gap: 'bg-transparent border-dashed border-muted-foreground/50 text-muted-foreground',
}
const dot: Record<UxStatus, string> = {
  live: 'bg-success',
  partial: 'bg-warning',
  missing: 'bg-destructive',
  gap: 'border border-dashed border-muted-foreground',
}
const bar: Record<UxStatus, string> = {
  live: 'bg-success',
  partial: 'bg-warning',
  missing: 'bg-destructive',
  gap: 'bg-muted-foreground/40',
}
const tone = { live: 'good', partial: 'warn', missing: 'bad', gap: 'neutral' } as const

const journeyOf = (id: UxJourneyId) => uxJourneys.find(j => j.id === id)!
const stageOf = (key: string) => uxStages.find(s => s.key === key)!
const refUrl = (r: string) =>
  r.startsWith('#') ? `https://github.com/razbakov/wedance-2026/pull/${r.slice(1)}`
    : r.startsWith('RAZ-') ? `https://linear.app/alosha/issue/${r}`
      : null
</script>

<template>
  <DesignPage
    eyebrow="Product"
    site="WeDance Docs"
    title="UX map"
    lead="Every user journey, stage by stage. Read a row for one person's experience from first visit to bringing friends; read a column to see how well the whole product handles that moment."
  >
    <DesignSection id="legend" title="How to read it">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Show statuses">
        <button
          v-for="st in statuses"
          :key="st"
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm transition-opacity"
          :class="shown.has(st) ? '' : 'opacity-40'"
          :aria-pressed="shown.has(st)"
          @click="toggle(st)"
        >
          <span class="size-2.5 shrink-0 rounded-full" :class="dot[st]" />
          {{ uxStatusLabel[st] }} <span class="text-muted-foreground tabular-nums">{{ total(st) }}</span>
        </button>
      </div>
      <p class="text-sm text-muted-foreground mt-3 max-w-2xl">
        Click a status to hide it, a journey to focus it, an item for its page and stories.
        “Gap” marks a stage that needs something and has nothing built or planned. Those are judgement calls, not stories.
      </p>
    </DesignSection>

    <DesignSection id="health" title="Stage health" :lead="focus ? `${journeyOf(focus).who} only.` : 'All journeys.'">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div v-for="s in health" :key="s.key" class="space-y-1.5">
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ s.label }}</div>
          <div
            class="flex h-3 overflow-hidden rounded bg-muted"
            role="img"
            :aria-label="`${s.label}: ${s.live} live, ${s.partial} partial, ${s.missing} not built, ${s.gap} gaps`"
          >
            <span v-for="st in statuses" :key="st" :class="bar[st]" :style="{ width: `${(s[st] / s.total) * 100}%` }" />
          </div>
          <div class="text-xs text-muted-foreground tabular-nums">{{ s.live }} live · {{ s.partial }} partial · {{ s.missing + s.gap }} missing</div>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="map" title="Journeys × stages">
      <div class="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Focus a journey">
        <button
          type="button"
          class="rounded-md border px-2.5 py-1 text-sm"
          :class="!focus ? 'bg-foreground text-background border-foreground' : 'border-border bg-card'"
          :aria-pressed="!focus"
          @click="focus = null"
        >All</button>
        <button
          v-for="j in uxJourneys"
          :key="j.id"
          type="button"
          class="rounded-md border px-2.5 py-1 text-sm"
          :class="focus === j.id ? 'bg-foreground text-background border-foreground' : 'border-border bg-card'"
          :aria-pressed="focus === j.id"
          @click="focus = focus === j.id ? null : j.id"
        >{{ j.who }}</button>
      </div>

      <div v-if="selected" class="fixed bottom-4 right-4 z-40 w-[min(28rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto rounded-2xl border border-foreground bg-card p-4 shadow-xl" aria-live="polite">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs text-muted-foreground">{{ selected.journey }} {{ journeyOf(selected.journey).who }} · {{ stageOf(selected.stage).label }}</div>
            <h3 class="font-display text-xl font-bold mt-0.5">{{ selected.name }}</h3>
          </div>
          <button type="button" class="rounded border border-border px-2 py-0.5 text-sm" @click="selected = null">Close</button>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <ArchPill :tone="tone[selected.status]">{{ uxStatusLabel[selected.status] }}</ArchPill>
          <NuxtLink v-if="selected.route.startsWith('/') && !selected.route.includes('[')" :to="selected.route" class="font-mono text-[13px] text-secondary hover:underline">{{ selected.route }}</NuxtLink>
          <code v-else-if="selected.route" class="font-mono text-[13px]">{{ selected.route }}</code>
        </div>
        <p v-if="selected.note" class="mt-2 text-sm max-w-2xl">{{ selected.note }}</p>
        <div v-if="selected.refs.length" class="mt-2 flex flex-wrap gap-2 text-xs">
          <template v-for="r in selected.refs" :key="r">
            <a v-if="refUrl(r)" :href="refUrl(r)!" target="_blank" rel="noopener" class="font-mono text-secondary hover:underline">{{ r }}</a>
            <span v-else class="font-mono text-muted-foreground">{{ r }}</span>
          </template>
        </div>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-border bg-card">
        <table class="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr>
              <th class="w-44 border-b border-r border-border p-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Journey</th>
              <th v-for="s in uxStages" :key="s.key" class="border-b border-r border-border p-3 last:border-r-0 align-top">
                <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ s.label }}</div>
                <div class="text-xs font-normal text-muted-foreground">{{ s.hint }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in uxJourneys" :key="j.id" class="transition-opacity" :class="focus && focus !== j.id ? 'opacity-25' : ''">
              <th scope="row" class="border-b border-r border-border bg-background p-3 align-top">
                <div class="text-[11px] font-bold tracking-wider text-primary">{{ j.id }}</div>
                <div class="font-display text-base font-bold leading-tight">{{ j.who }}</div>
                <div class="mt-1 text-xs font-normal text-muted-foreground">{{ j.what }}<br>“{{ j.job }}”</div>
              </th>
              <td v-for="s in uxStages" :key="s.key" class="border-b border-r border-border p-2 align-top last:border-r-0">
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="it in cell(j.id, s.key)"
                    :key="it.name"
                    type="button"
                    class="flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-[12.5px] leading-snug hover:border-foreground"
                    :class="[chip[it.status], selected === it ? 'ring-2 ring-foreground' : '']"
                    @click="selected = it"
                  >
                    <span class="mt-1 size-2 shrink-0 rounded-full" :class="dot[it.status]" />
                    <span>{{ it.name }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DesignSection>

    <DesignSection id="findings" title="What the map shows" :lead="`Read on ${UX_UPDATED}. Re-read it when the map changes.`">
      <ul class="space-y-4 max-w-2xl">
        <li>
          <p class="font-bold">“Come back” is the weakest stage.</p>
          <p class="text-muted-foreground">{{ returnWeak }} of {{ returnItems.length }} return items are partial, missing or gaps. Dancers get no email or notification; every email sent today goes to businesses or is about signing in. Someone who RSVPs has no reason to return next week.</p>
        </li>
        <li>
          <p class="font-bold">The business side is ahead of the dancer side.</p>
          <p class="text-muted-foreground">Organizer and Artist are mostly green: event setup, flyers, Instagram, websites, invites. Seeker and Traveler are mostly amber. Tools for organisers are growing faster than the dancer demand that makes them worth paying for.</p>
        </li>
        <li>
          <p class="font-bold">Nothing turns a Seeker into a Regular.</p>
          <p class="text-muted-foreground">The Seeker row has gaps from “Commit” on: no beginner filter, no first-class guide, no follow-up after a first class.</p>
        </li>
        <li>
          <p class="font-bold">Traveler features are built but empty.</p>
          <p class="text-muted-foreground">Ride shares, roommates, dinners and who's going only work with several real people on the same festival.</p>
        </li>
        <li>
          <p class="font-bold">Using the site found what reading the code missed.</p>
          <p class="text-muted-foreground">Walked on 2026-11-14: door check-in has no screen, the promo kit lives only in the AI app, the “Who's going” faces left the pages in #327, there is no festival map, and a new event from the form goes live before it has a venue or line-up. On a phone, the answer buttons for venues and artists hide under the tab bar.</p>
        </li>
      </ul>
    </DesignSection>

    <DesignSection id="handoffs" title="Handoffs between journeys" lead="Where one person's journey turns into another's.">
      <ul class="grid gap-2 sm:grid-cols-2">
        <li v-for="h in uxHandoffs" :key="h.route" class="rounded-2xl border border-border bg-card p-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-xs font-bold">{{ h.route }}</span>
            <span class="font-bold text-sm">{{ h.name }}</span>
            <ArchPill :tone="tone[h.status]">{{ h.status }}</ArchPill>
          </div>
          <p class="mt-1 text-sm text-muted-foreground">{{ h.why }}</p>
        </li>
      </ul>
    </DesignSection>

    <DesignSection id="sources" title="Sources">
      <p class="text-sm text-muted-foreground max-w-2xl">
        The routes in <code class="font-mono text-[13px]">app/pages</code> (docs, sketches and admin left out), the landing-promise stories in
        <code class="font-mono text-[13px]">docs/issues/P*.md</code> with statuses corrected against merged PRs, and the email senders in
        <code class="font-mono text-[13px]">server/utils/email.ts</code>, then checked by using the site on 2026-11-14: signed out on 2026.wedance.vip, and as a dancer, an organiser,
        a venue and an artist on a local copy of the database, on desktop and a phone (RAZ-898; what couldn't be run is in RAZ-931). Data lives in <code class="font-mono text-[13px]">app/lib/ux-map.ts</code>: update an item when you ship or change it.
        For stories mapped to tables and procedures, see <NuxtLink to="/docs/architecture/stories" class="text-secondary hover:underline">User stories</NuxtLink>.
      </p>
    </DesignSection>
  </DesignPage>
</template>
