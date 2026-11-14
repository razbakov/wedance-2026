<script setup lang="ts">
import { jobs, type JobId } from '~/lib/jobs'
import { uxItems, uxJourneys, uxStatusLabel, type UxJourneyId, type UxStatus } from '~/lib/ux-map'

definePageMeta({ layout: 'docs' })

/**
 * Jobs To Be Done, J1–J7: who has each job, the journeys (CUJ) its backlog
 * stories belong to, and how well the UX map's journeys for it are built.
 * Data: app/lib/jobs.ts (kept equal to docs/issues/_reference-cuj-jtbd.md by
 * jobs.test.ts) and app/lib/ux-map.ts.
 */
const statuses: UxStatus[] = ['live', 'partial', 'missing', 'gap']
const bar: Record<UxStatus, string> = {
  live: 'bg-success',
  partial: 'bg-warning',
  missing: 'bg-destructive',
  gap: 'bg-muted-foreground/40',
}

const journeyOf = (id: UxJourneyId) => uxJourneys.find(j => j.id === id)!
/** UX map rows whose main job is this one. */
const mainJourneys = (id: JobId) => uxJourneys.filter(j => j.jobId === id)
const health = (id: JobId) => {
  const rows = mainJourneys(id).map(j => j.id)
  const items = uxItems.filter(i => rows.includes(i.journey))
  const count = (st: UxStatus) => items.filter(i => i.status === st).length
  return { total: items.length || 1, size: items.length, live: count('live'), partial: count('partial'), missing: count('missing'), gap: count('gap') }
}
</script>

<template>
  <DesignPage
    eyebrow="Product"
    site="WeDance Docs"
    title="Jobs to be done"
    lead="The seven jobs people hire WeDance for. Every backlog story names one (J1–J7), every journey on the UX map serves one."
  >
    <DesignSection id="list" title="All jobs">
      <div class="overflow-x-auto rounded-2xl border border-border bg-card">
        <table class="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th class="border-b border-border p-3">Job</th>
              <th class="border-b border-border p-3">Who it's for</th>
              <th class="border-b border-border p-3">Journeys</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in jobs" :key="job.id" class="align-top">
              <td class="border-b border-border p-3">
                <a :href="`#${job.id.toLowerCase()}`" class="font-mono font-bold text-primary hover:underline">{{ job.id }}</a>
                <span class="ml-2 font-bold">{{ job.statement }}</span>
              </td>
              <td class="border-b border-border p-3 text-muted-foreground">{{ job.who }}</td>
              <td class="border-b border-border p-3 whitespace-nowrap font-mono text-xs">{{ job.journeys.join(' · ') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-sm text-muted-foreground mt-3 max-w-2xl">
        A job is what someone is trying to get done, whatever the product. A journey (C1–C8) is how one kind of person
        moves through WeDance to do it. One job can run through several journeys: a venue and a festival organiser both
        want to run a great event.
      </p>
    </DesignSection>

    <DesignSection
      v-for="job in jobs"
      :id="job.id.toLowerCase()"
      :key="job.id"
      :title="`${job.id} · ${job.statement}`"
      :lead="job.who"
    >
      <div class="grid gap-6 sm:grid-cols-2">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Journeys with stories for this job</div>
          <ul class="mt-2 flex flex-wrap gap-1.5">
            <li v-for="c in job.journeys" :key="c">
              <NuxtLink
                :to="`/docs/ux-map?journey=${c}`"
                class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm hover:border-foreground"
              >
                <span class="font-mono text-xs font-bold text-primary">{{ c }}</span>
                {{ journeyOf(c).who }}
              </NuxtLink>
            </li>
          </ul>
          <template v-if="job.flows.length">
            <div class="mt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Flows</div>
            <ul class="mt-2 space-y-1 text-sm">
              <li v-for="f in job.flows" :key="f.to">
                <NuxtLink :to="f.to" class="text-secondary hover:underline">{{ f.title }}</NuxtLink>
              </li>
            </ul>
          </template>
        </div>

        <div v-if="mainJourneys(job.id).length">
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            How it's built · UX map {{ mainJourneys(job.id).map(j => j.who).join(' + ') }}
          </div>
          <div
            class="mt-2 flex h-3 overflow-hidden rounded bg-muted"
            role="img"
            :aria-label="`${health(job.id).live} live, ${health(job.id).partial} partial, ${health(job.id).missing} not built, ${health(job.id).gap} gaps`"
          >
            <span v-for="st in statuses" :key="st" :class="bar[st]" :style="{ width: `${(health(job.id)[st] / health(job.id).total) * 100}%` }" />
          </div>
          <ul class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
            <li v-for="st in statuses" :key="st">
              <span class="mr-1 inline-block size-2 rounded-full" :class="bar[st]" />{{ uxStatusLabel[st] }}: {{ health(job.id)[st] }}
            </li>
          </ul>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="sources" title="Sources">
      <p class="text-sm text-muted-foreground max-w-2xl">
        The jobs come from the landing-promise audit: each story in
        <code class="font-mono text-[13px]">docs/issues/</code> carries a <code class="font-mono text-[13px]">jtbd:</code> line, and the same
        issues in Linear a <code class="font-mono text-[13px]">jtbd:J#</code> label. The list is defined in
        <code class="font-mono text-[13px]">docs/issues/_reference-cuj-jtbd.md</code> and mirrored in
        <code class="font-mono text-[13px]">app/lib/jobs.ts</code>; a test fails when they differ or when a story's journeys change.
        Build status is read from the <NuxtLink to="/docs/ux-map" class="text-secondary hover:underline">UX map</NuxtLink>.
      </p>
    </DesignSection>
  </DesignPage>
</template>
