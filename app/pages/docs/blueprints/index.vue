<script setup lang="ts">
import { bpMarkLabel } from '~/lib/blueprint'
import { blueprints, blueprintStats } from '~/lib/blueprints'
import { jobById, jobLink, jobs } from '~/lib/jobs'

definePageMeta({ layout: 'docs' })
useSeoMeta({
  title: 'Blueprints · WeDance Docs',
  description: 'Service blueprints for WeDance: one job’s flow drawn lane by lane, with every wait, hand-carried link and missed update. How they differ from the UX map, and which jobs have one.',
})

/**
 * Index of the service blueprints. Data: app/lib/blueprints.ts (registry),
 * each blueprint's own file for its steps and gaps.
 */
const cards = blueprints.map(b => ({ ...b, jobInfo: jobById(b.job), stats: blueprintStats(b.bp) }))
const covered = new Set(blueprints.map(b => b.job))
const missing = jobs.filter(j => !covered.has(j.id))
</script>

<template>
  <DesignPage
    eyebrow="Product · Blueprints"
    site="WeDance Docs"
    title="Blueprints"
    status="beta"
    lead="A service blueprint takes one job and draws its flow lane by lane: every row is someone who has to act, every column a phase, every marker a place where someone waits, carries a link by hand, or never hears about a change."
  >
    <DesignSection id="map-vs-blueprint" title="UX map or blueprint?">
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink to="/docs/ux-map" class="block rounded-2xl border border-border bg-card p-5 hover:border-foreground">
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">The whole picture</div>
          <div class="mt-1 text-lg font-bold">UX map</div>
          <p class="mt-2 text-sm text-muted-foreground">
            Every journey × six stages, one row each. Shows <em>what</em> exists, what is partial or missing, and where one
            journey hands off to the next. Start here.
          </p>
        </NuxtLink>
        <div class="rounded-2xl border border-border bg-card p-5">
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">One job in depth</div>
          <div class="mt-1 text-lg font-bold">Blueprint</div>
          <p class="mt-2 text-sm text-muted-foreground">
            One flow, with everyone in it, including the steps the dancer never sees. Shows <em>where it breaks</em>
            between people: {{ bpMarkLabel.wait.icon }} waits, {{ bpMarkLabel.manual.icon }} done by hand,
            {{ bpMarkLabel.silent.icon }} news that never arrives.
          </p>
        </div>
      </div>
      <p class="mt-3 max-w-2xl text-sm text-muted-foreground">
        Blueprints stay separate on purpose: each has its own lanes, and the markers only mean something inside one flow.
        Where flows meet (an event’s night is where dancers meet new friends), the UX map’s handoffs show it.
      </p>
    </DesignSection>

    <DesignSection id="all" title="All blueprints">
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="c in cards"
          :key="c.to"
          :to="c.to"
          class="block rounded-2xl border border-border bg-card p-5 hover:border-foreground"
        >
          <div class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span class="font-mono text-primary">{{ c.job }}</span> · {{ c.jobInfo.statement }}
          </div>
          <div class="mt-1 text-lg font-bold">{{ c.title }}</div>
          <p class="mt-2 text-sm text-muted-foreground">{{ c.summary }}</p>
          <dl class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="rounded-lg bg-muted p-2"><dt class="text-muted-foreground">Lanes</dt><dd class="text-base font-bold">{{ c.stats.lanes }}</dd></div>
            <div class="rounded-lg bg-muted p-2"><dt class="text-muted-foreground">Steps not live</dt><dd class="text-base font-bold">{{ c.stats.notLive }}/{{ c.stats.steps }}</dd></div>
            <div class="rounded-lg bg-muted p-2"><dt class="text-muted-foreground">Gaps</dt><dd class="text-base font-bold">{{ c.stats.gaps }}</dd></div>
          </dl>
          <div class="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span :title="bpMarkLabel.wait.hint">{{ bpMarkLabel.wait.icon }} {{ bpMarkLabel.wait.label }}: {{ c.stats.wait }}</span>
            <span :title="bpMarkLabel.manual.hint">{{ bpMarkLabel.manual.icon }} {{ bpMarkLabel.manual.label }}: {{ c.stats.manual }}</span>
            <span :title="bpMarkLabel.silent.hint">{{ bpMarkLabel.silent.icon }} {{ bpMarkLabel.silent.label }}: {{ c.stats.silent }}</span>
            <span class="ml-auto">checked {{ c.bp.updated }}</span>
          </div>
        </NuxtLink>
      </div>
    </DesignSection>

    <DesignSection id="not-yet" title="Jobs without a blueprint">
      <ul class="space-y-2 text-sm">
        <li v-for="j in missing" :key="j.id">
          <NuxtLink :to="jobLink(j.id)" class="font-mono font-bold text-primary hover:underline">{{ j.id }}</NuxtLink>
          <span class="ml-2 font-bold">{{ j.statement }}</span>
          <span class="text-muted-foreground"> — {{ j.who }}</span>
        </li>
      </ul>
      <p class="mt-3 max-w-2xl text-sm text-muted-foreground">
        A new blueprint is a data file like <code>app/lib/blueprint-meet-friends.ts</code>, a page that renders it with
        <code>DocsBlueprint</code>, and one line in <code>app/lib/blueprints.ts</code> plus its job’s flows.
      </p>
    </DesignSection>
  </DesignPage>
</template>
