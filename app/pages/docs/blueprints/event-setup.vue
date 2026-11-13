<script setup lang="ts">
import { BLUEPRINT_UPDATED, bpGaps, bpLanes, bpMarkLabel, bpPhases, bpSteps, type BpGap, type BpLane, type BpMark, type BpPhase, type BpStep } from '~/lib/blueprint-event-setup'
import { uxStatusLabel, type UxStatus } from '~/lib/ux-map'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Event setup blueprint · WeDance Docs',
  description: 'How an event gets set up on WeDance, lane by lane: organiser, WeDance, venue, artists and dancers, with every wait, hand-carried link and missed update.',
})

/**
 * Service blueprint for setting up an event. Lanes = who acts, phases = when.
 * Data: app/lib/blueprint-event-setup.ts (hand-maintained from the code).
 */
const marks: BpMark[] = ['wait', 'manual', 'silent']
const selected = shallowRef<BpStep | null>(null)
const gapFocus = shallowRef<BpGap | null>(null)

const cell = (lane: BpLane, phase: BpPhase) => bpSteps.filter(s => s.lane === lane && s.phase === phase)
const lit = (s: BpStep) => !gapFocus.value || gapFocus.value.steps.includes(s.id)

const friction = bpPhases.map((p) => {
  const steps = bpSteps.filter(s => s.phase === p.key)
  const count = (m: BpMark) => steps.filter(s => s.marks.includes(m)).length
  return { ...p, wait: count('wait'), manual: count('manual'), silent: count('silent'), weak: steps.filter(s => s.status !== 'live').length, total: steps.length }
})
const maxFriction = Math.max(...friction.map(f => f.wait + f.manual + f.silent), 1)
const markTotal = (m: BpMark) => bpSteps.filter(s => s.marks.includes(m)).length

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
const tone = { live: 'good', partial: 'warn', missing: 'bad', gap: 'neutral' } as const
const statuses: UxStatus[] = ['live', 'partial', 'missing', 'gap']

const laneOf = (k: BpLane) => bpLanes.find(l => l.key === k)!
const phaseOf = (k: BpPhase) => bpPhases.find(p => p.key === k)!
const stepOf = (id: string) => bpSteps.find(s => s.id === id)!
const refUrl = (r: string) => r.startsWith('#') ? `https://github.com/razbakov/wedance-2026/pull/${r.slice(1)}` : null

function pickGap(g: BpGap) {
  gapFocus.value = gapFocus.value === g ? null : g
  if (gapFocus.value) document.getElementById('blueprint')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprint"
    site="WeDance Docs"
    title="Event setup"
    lead="How an event gets made, from getting the organiser’s page to the night, drawn lane by lane. Every row is someone who has to act; every marker is a place where someone waits, carries a link by hand, or never hears about a change."
  >
    <DesignSection id="legend" title="How to read it">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Status (as on the UX map)</div>
          <ul class="flex flex-wrap gap-2">
            <li v-for="st in statuses" :key="st" class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
              <span class="size-2.5 shrink-0 rounded-full" :class="dot[st]" /> {{ uxStatusLabel[st] }}
            </li>
          </ul>
        </div>
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Friction markers</div>
          <ul class="space-y-1 text-sm">
            <li v-for="m in marks" :key="m">
              <span aria-hidden="true">{{ bpMarkLabel[m].icon }}</span>
              <strong>{{ bpMarkLabel[m].label }}</strong> <span class="tabular-nums text-muted-foreground">({{ markTotal(m) }})</span>:
              {{ bpMarkLabel[m].hint }}
            </li>
          </ul>
        </div>
      </div>
      <p class="text-sm text-muted-foreground mt-4 max-w-2xl">
        Gaps are where markers cluster. Click a step for its code, or a gap below to light up its steps.
        Built from the routers on {{ BLUEPRINT_UPDATED }}; see the
        <NuxtLink to="/docs/ux-map" class="underline">UX map</NuxtLink> for the dancer journeys.
      </p>
    </DesignSection>

    <DesignSection id="friction" title="Friction by phase">
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        <div v-for="f in friction" :key="f.key" class="space-y-1.5">
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ f.label }}</div>
          <div
            class="flex h-3 overflow-hidden rounded bg-muted"
            role="img"
            :aria-label="`${f.label}: ${f.wait} waits, ${f.manual} by hand, ${f.silent} silent`"
          >
            <span class="bg-warning" :style="{ width: `${(f.wait / maxFriction) * 100}%` }" />
            <span class="bg-destructive/70" :style="{ width: `${(f.manual / maxFriction) * 100}%` }" />
            <span class="bg-foreground/70" :style="{ width: `${(f.silent / maxFriction) * 100}%` }" />
          </div>
          <div class="text-xs text-muted-foreground tabular-nums">
            ⏳{{ f.wait }} ✋{{ f.manual }} 🔇{{ f.silent }} · {{ f.weak }}/{{ f.total }} not live
          </div>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="blueprint" title="Lanes × phases">
      <div v-if="gapFocus" class="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span>Showing: <strong>{{ gapFocus.title }}</strong></span>
        <button type="button" class="rounded border border-border px-2 py-0.5" @click="gapFocus = null">Show all</button>
      </div>
      <div class="overflow-x-auto rounded-xl border border-border">
        <table class="w-full min-w-[1350px] border-collapse text-sm">
          <thead>
            <tr class="bg-muted/50">
              <th scope="col" class="w-36 p-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Who</th>
              <th v-for="p in bpPhases" :key="p.key" scope="col" class="p-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {{ p.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in bpLanes" :key="l.key" class="border-t border-border align-top" :class="l.key === 'system' ? 'bg-muted/30' : ''">
              <th scope="row" class="p-2 text-left font-normal">
                <div class="font-bold">{{ l.label }}</div>
                <div class="text-xs text-muted-foreground">{{ l.hint }}</div>
              </th>
              <td v-for="p in bpPhases" :key="p.key" class="p-1.5">
                <div class="flex flex-col gap-1.5">
                  <button
                    v-for="s in cell(l.key, p.key)"
                    :key="s.id"
                    type="button"
                    class="rounded-lg border px-2 py-1.5 text-left leading-snug transition-opacity hover:border-foreground"
                    :class="[chip[s.status], lit(s) ? '' : 'opacity-25', selected?.id === s.id ? 'ring-2 ring-foreground' : '']"
                    :aria-pressed="selected?.id === s.id"
                    @click="selected = selected?.id === s.id ? null : s"
                  >
                    <span class="block">{{ s.name }}</span>
                    <span v-if="s.marks.length" class="mt-0.5 block text-xs" :aria-label="s.marks.map(m => bpMarkLabel[m].label).join(', ')">
                      {{ s.marks.map(m => bpMarkLabel[m].icon).join(' ') }}
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="selected" class="fixed bottom-4 right-4 z-40 w-[min(28rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto rounded-2xl border border-foreground bg-card p-4 shadow-xl" aria-live="polite">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-xs text-muted-foreground">{{ laneOf(selected.lane).label }} · {{ phaseOf(selected.phase).label }}</div>
            <h3 class="font-display text-xl font-bold mt-0.5">{{ selected.name }}</h3>
          </div>
          <button type="button" class="rounded border border-border px-2 py-0.5 text-sm" @click="selected = null">Close</button>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <ArchPill :tone="tone[selected.status]">{{ uxStatusLabel[selected.status] }}</ArchPill>
          <span v-for="m in selected.marks" :key="m" class="text-xs">{{ bpMarkLabel[m].icon }} {{ bpMarkLabel[m].label }}</span>
          <NuxtLink v-if="selected.route && !selected.route.includes('[')" :to="selected.route" class="underline">{{ selected.route }}</NuxtLink>
          <code v-else-if="selected.route" class="text-xs">{{ selected.route }}</code>
        </div>
        <p class="mt-2 text-sm">{{ selected.note }}</p>
        <p v-if="selected.code" class="mt-2 text-xs text-muted-foreground"><code>{{ selected.code }}</code></p>
        <div v-if="selected.refs?.length" class="mt-2 flex flex-wrap gap-2 text-xs">
          <a v-for="r in selected.refs" :key="r" :href="refUrl(r) ?? undefined" target="_blank" rel="noopener" class="underline">{{ r }}</a>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="gaps" title="Where it breaks" lead="Each gap is a cluster of markers. Click one to light its steps on the blueprint.">
      <ol class="grid gap-3 md:grid-cols-2">
        <li v-for="(g, i) in bpGaps" :key="g.title">
          <button
            type="button"
            class="h-full w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground"
            :class="gapFocus === g ? 'border-foreground ring-2 ring-foreground' : 'border-border'"
            :aria-pressed="gapFocus === g"
            @click="pickGap(g)"
          >
            <div class="text-xs text-muted-foreground tabular-nums">Gap {{ i + 1 }}</div>
            <h3 class="font-display text-lg font-bold">{{ g.title }}</h3>
            <p class="mt-1 text-sm">{{ g.why }}</p>
            <p class="mt-2 text-sm"><strong>Fix:</strong> {{ g.fix }}</p>
            <p class="mt-2 text-xs text-muted-foreground">Steps: {{ g.steps.map(id => stepOf(id).name).join(' · ') }}</p>
          </button>
        </li>
      </ol>
    </DesignSection>
  </DesignPage>
</template>
