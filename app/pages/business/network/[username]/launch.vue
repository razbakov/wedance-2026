<script setup lang="ts">
/**
 * /business/network/<handle>/launch — the launch workspace: set up a new night
 * or business by doing the real work, stage by stage. Stages 1–3 (brand, name,
 * channels) are live; 4–8 are shown as "next". The steps are the catalogue in
 * shared/utils/launch.ts; their state is in launch_steps / launch_names /
 * launch_evidence (businessLaunch router). Members of the page only.
 */
import { Rocket, Check, Lock } from 'lucide-vue-next'
import { STAGES, STEPS } from '#shared/utils/launch'

definePageMeta({ layout: 'business' })
const route = useRoute()
const { $trpc } = useNuxtApp()
const username = computed(() => String(route.params.username))

type Data = Awaited<ReturnType<typeof $trpc.businessLaunch.get.query>>
const data = ref<Data | null>(null)
const error = ref<string | null>(null)
async function load() {
  try { data.value = await $trpc.businessLaunch.get.query({ username: username.value }); error.value = null } catch (e: any) { error.value = e?.message || 'Couldn’t load the launch workspace.' }
}
onMounted(load)
useHead(() => ({ title: `Launch · ${data.value?.profile.name ?? ''} | Business | WeDance` }))

const liveStages = STAGES.filter(s => s.live)
const stepsOf = (stage: string) => STEPS.filter(s => s.stage === stage)
const totals = computed(() => {
  const live = data.value?.steps.filter(s => STAGES.find(x => x.key === s.stage)?.live) ?? []
  return { done: live.filter(s => s.status === 'done').length, total: live.length }
})
// The first live stage that isn't done: where to look next.
const current = computed(() => data.value?.progress.find(p => p.state !== 'done' && p.state !== 'next')?.key ?? null)
</script>

<template>
  <div>
    <AdminState v-if="!data && !error" kind="loading" />
    <AdminState v-else-if="!data" kind="error" :message="error!" />
    <template v-else>
      <AdminPageHeader
        eyebrow="Launch"
        :title="data.chosenName || data.values.placeName || data.profile.name"
        description="Set it up by doing it: each step has the text to paste, the link to the right screen, a place for the evidence and a done tick."
        :back="{ to: `/business/network/${data.profile.username}`, label: 'The profile' }"
      />
      <AdminState v-if="error" kind="error" :message="error" />

      <!-- The path -->
      <nav aria-label="Launch stages" class="mt-6 rounded-2xl border bg-card p-4">
        <div class="flex items-center justify-between gap-2">
          <p class="flex items-center gap-1.5 text-eyebrow font-bold uppercase tracking-[0.3em] text-primary"><Rocket class="size-4" aria-hidden="true" /> The path</p>
          <p class="text-sm tabular-nums text-muted-foreground">{{ totals.done }} of {{ totals.total }} steps done</p>
        </div>
        <ol class="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8">
          <li v-for="s in data.progress" :key="s.key">
            <a
              :href="s.live ? `#stage-${s.key}` : undefined"
              class="flex h-full flex-col rounded-xl border p-2.5 text-sm"
              :class="s.state === 'done' ? 'border-success/40 bg-success/10' : s.key === current ? 'border-primary bg-primary/5' : s.state === 'next' ? 'border-dashed bg-muted/40 text-muted-foreground' : 'bg-card'"
              :aria-current="s.key === current ? 'step' : undefined"
            >
              <span class="flex items-center gap-1.5 font-bold">
                <span class="grid size-5 place-items-center rounded-full text-[11px]" :class="s.state === 'done' ? 'bg-wd-green-700 text-white' : s.state === 'next' ? 'bg-muted' : 'bg-primary text-white'">
                  <Check v-if="s.state === 'done'" class="size-3" aria-hidden="true" /><template v-else>{{ s.n }}</template>
                </span>
                {{ s.title }}
              </span>
              <span class="mt-1 text-[11px] leading-snug text-muted-foreground">{{ s.line }}</span>
              <span class="mt-auto pt-1.5 text-[11px] font-bold uppercase tracking-wider" :class="s.state === 'next' ? 'text-muted-foreground' : 'text-secondary'">
                <template v-if="s.state === 'next'"><Lock class="inline size-3" aria-hidden="true" /> Next</template>
                <template v-else>{{ s.done }}/{{ s.total }} done</template>
              </span>
            </a>
          </li>
        </ol>
      </nav>

      <!-- Stages 1–3 -->
      <section v-for="s in liveStages" :id="`stage-${s.key}`" :key="s.key" class="mt-8 scroll-mt-20">
        <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Stage {{ s.n }} · {{ s.title }}</h2>
        <p class="text-sm text-muted-foreground">{{ s.line }}</p>
        <div class="mt-3 grid gap-3">
          <BusinessLaunchStep v-for="step in stepsOf(s.key)" :key="step.key" :username="data.profile.username" :data="data" :step-key="step.key" @loaded="d => data = d">
            <BusinessLaunchNames v-if="step.kind === 'names'" :username="data.profile.username" :data="data" @loaded="d => data = d" />
          </BusinessLaunchStep>
        </div>
      </section>

      <!-- Stages 4–8 -->
      <section class="mt-8">
        <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-muted-foreground">Next</h2>
        <ul class="mt-3 grid gap-2 sm:grid-cols-2">
          <li v-for="s in STAGES.filter(x => !x.live)" :key="s.key" class="rounded-xl border border-dashed p-3 text-sm">
            <p class="font-bold">{{ s.n }} · {{ s.title }}</p>
            <p class="text-muted-foreground">{{ s.line }}</p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
