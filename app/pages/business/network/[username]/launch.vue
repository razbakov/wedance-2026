<script setup lang="ts">
/**
 * /business/network/<handle>/launch — the launch workspace: set up a new night
 * or business one step at a time. One step is on screen (the first not done,
 * or ?step=<key>); "Done — next step" moves on. The whole list is one tap away.
 * Stages 1–3 (brand, name, channels) are live; 4–8 are named as "later".
 * The steps are the catalogue in shared/utils/launch.ts; their state is in
 * launch_steps / launch_names / launch_evidence (businessLaunch router).
 */
import { Check, PartyPopper } from 'lucide-vue-next'
import { STAGES, STEPS } from '#shared/utils/launch'

definePageMeta({ layout: 'business' })
const route = useRoute()
const router = useRouter()
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
const laterStages = STAGES.filter(s => !s.live)
const order = STEPS.filter(s => liveStages.some(x => x.key === s.stage))
const statusOf = (key: string) => data.value?.steps.find(s => s.key === key)?.status ?? 'todo'
const doneCount = computed(() => order.filter(s => statusOf(s.key) === 'done').length)
const firstOpen = computed(() => order.find(s => statusOf(s.key) !== 'done')?.key ?? null)

// The step on screen: ?step=…, else the first one not done. null = all done.
const focus = computed(() => {
  const q = String(route.query.step ?? '')
  return order.some(s => s.key === q) ? q : firstOpen.value
})
const focusIndex = computed(() => order.findIndex(s => s.key === focus.value))
const focusStep = computed(() => order[focusIndex.value] ?? null)
const stageTitle = (key: string) => STAGES.find(s => s.key === key)?.title ?? ''

function go(key: string | null) {
  router.replace({ query: key ? { ...route.query, step: key } : {} })
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
// Next: the next step after this one that isn't done, else the first open one anywhere.
function next() {
  const i = focusIndex.value
  const after = order.slice(i + 1).find(s => statusOf(s.key) !== 'done') ?? order.find(s => statusOf(s.key) !== 'done' && s.key !== focus.value)
  go(after?.key ?? null)
}
// Pin the step in the URL once loaded: otherwise ticking it done would swap the
// card out from under itself (focus = "first not done") before it can say "next".
watch(() => !!data.value, (ready) => {
  if (ready && !route.query.step && firstOpen.value) router.replace({ query: { ...route.query, step: firstOpen.value } })
}, { immediate: true })
const back = () => { const prev = order[focusIndex.value - 1]; if (prev) go(prev.key) }

const showAll = ref(false)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AdminState v-if="!data && !error" kind="loading" />
    <AdminState v-else-if="!data" kind="error" :message="error!" />
    <template v-else>
      <AdminPageHeader
        eyebrow="Launch"
        :title="data.chosenName || data.values.placeName || data.profile.name"
        description="We go one step at a time. Each step tells you why, gives you the text to paste and opens the right page."
        :back="{ to: `/business/network/${data.profile.username}`, label: 'The profile' }"
      />

      <!-- Where you are -->
      <div class="mt-5">
        <div class="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" :aria-valuenow="doneCount" aria-valuemin="0" :aria-valuemax="order.length" :aria-label="`${doneCount} of ${order.length} steps done`">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${(doneCount / order.length) * 100}%` }" />
        </div>
        <ol class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <li v-for="p in data.progress.filter(x => x.live)" :key="p.key" class="inline-flex items-center gap-1" :class="focusStep?.stage === p.key ? 'font-bold text-foreground' : 'text-muted-foreground'">
            <Check v-if="p.state === 'done'" class="size-3.5 text-wd-green-700" aria-hidden="true" />
            {{ p.title }}
            <span v-if="p.state !== 'done' && p.total > 1" class="text-xs tabular-nums">{{ p.done }}/{{ p.total }}</span>
          </li>
        </ol>
      </div>

      <!-- The one step -->
      <div class="mt-6">
        <BusinessLaunchStep
          v-if="focusStep"
          :key="focusStep.key"
          :username="data.profile.username"
          :data="data"
          :step-key="focusStep.key"
          :position="focusIndex + 1"
          :total="order.length"
          :stage-title="stageTitle(focusStep.stage)"
          :has-back="focusIndex > 0"
          @loaded="d => data = d"
          @next="next"
          @back="back"
        >
          <BusinessLaunchNames v-if="focusStep.kind === 'names'" :username="data.profile.username" :data="data" @loaded="d => data = d" />
        </BusinessLaunchStep>

        <div v-else class="rounded-3xl border bg-card p-7 text-center">
          <PartyPopper class="mx-auto size-10 text-primary" aria-hidden="true" />
          <h2 class="mt-3 font-display text-2xl font-bold">Brand, name and channels: done.</h2>
          <p class="mt-1.5 text-muted-foreground">People can find you now. Next we set goals and plan the first campaigns — that part is coming soon.</p>
        </div>
      </div>

      <!-- Everything, one tap away -->
      <div class="mt-6 text-sm">
        <button type="button" class="text-muted-foreground underline" :aria-expanded="showAll" @click="showAll = !showAll">{{ showAll ? 'Hide the list' : `See all ${order.length} steps` }}</button>
        <div v-if="showAll" class="mt-3 grid gap-4">
          <section v-for="s in liveStages" :key="s.key">
            <h3 class="text-eyebrow font-bold uppercase tracking-[0.25em] text-muted-foreground">{{ s.title }}</h3>
            <ul class="mt-1">
              <li v-for="st in STEPS.filter(x => x.stage === s.key)" :key="st.key">
                <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted" :class="st.key === focus ? 'bg-muted font-bold' : ''" @click="go(st.key)">
                  <Check v-if="statusOf(st.key) === 'done'" class="size-4 shrink-0 text-wd-green-700" aria-hidden="true" />
                  <span v-else class="size-4 shrink-0 rounded-full border-2" :class="statusOf(st.key) === 'doing' ? 'border-primary' : 'border-muted-foreground/40'" aria-hidden="true" />
                  <span :class="statusOf(st.key) === 'done' ? 'text-muted-foreground' : ''">{{ st.title }}</span>
                </button>
              </li>
            </ul>
          </section>
        </div>
        <p class="mt-4 text-xs text-muted-foreground">Later: {{ laterStages.map(s => s.title).join(' · ') }}</p>
      </div>
    </template>
  </div>
</template>
