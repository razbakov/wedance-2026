<script setup lang="ts">
/**
 * Launch workspace, stage 2: name candidates, each with its evidence (source,
 * link, verdict free / taken / unclear, note) and a decision. The verdict is
 * computed from the evidence: "free" only with a link that says so, and any
 * "taken" wins. One click per check: open the search, then log what you saw.
 */
import { ExternalLink, Plus, Trash2, Check, X, Instagram, Crown } from 'lucide-vue-next'

type Data = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['businessLaunch']['get']['query']>>
const props = defineProps<{ username: string; data: Data }>()
const emit = defineEmits<{ loaded: [Data] }>()
const { $trpc } = useNuxtApp()
const STEP = 'name.pick'

const error = ref<string | null>(null)
const busy = ref<string | null>(null)
async function run(label: string, fn: () => Promise<Data>) {
  busy.value = label
  error.value = null
  try { emit('loaded', await fn()) } catch (e: any) { error.value = e?.message || 'Didn’t work. Try again.' } finally { busy.value = null }
}

const newName = ref('')
const add = () => run('add', async () => { const d = await $trpc.businessLaunch.addName.mutate({ username: props.username, name: newName.value }); newName.value = ''; return d })
const log = (nameId: string, source: string, url: string, verdict: 'free' | 'taken' | 'unclear', note = '') =>
  run(`log:${nameId}:${source}:${verdict}`, () => $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: STEP, nameId, source, url, verdict, note }))
const remove = (id: string) => run(`ev:${id}`, () => $trpc.businessLaunch.removeEvidence.mutate({ username: props.username, id }))
const decide = (id: string, decision: 'candidate' | 'chosen' | 'dropped') => run(`decide:${id}`, () => $trpc.businessLaunch.decideName.mutate({ username: props.username, id, decision }))
const removeName = (id: string) => run(`rm:${id}`, () => $trpc.businessLaunch.removeName.mutate({ username: props.username, id }))
const checkIg = (nameId: string, handle: string) => run(`ig:${nameId}`, () => $trpc.businessLaunch.checkInstagram.mutate({ username: props.username, stepKey: STEP, nameId, handle }))

// A custom evidence entry, per candidate.
type Custom = { source: string; url: string; verdict: 'free' | 'taken' | 'unclear'; note: string }
const custom = reactive<Record<string, Custom>>({})
const draftFor = (id: string): Custom => (custom[id] ??= { source: '', url: '', verdict: 'unclear', note: '' })
const addCustom = (id: string) => run(`custom:${id}`, async () => {
  const d = await $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: STEP, nameId: id, ...draftFor(id) })
  custom[id] = { source: '', url: '', verdict: 'unclear', note: '' }
  return d
})

const verdictStyle: Record<string, string> = { free: 'bg-success/15 text-wd-green-700', taken: 'bg-destructive/10 text-destructive', unclear: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', unchecked: 'bg-muted text-muted-foreground' }
const verdictLabel: Record<string, string> = { free: 'Free — with evidence', taken: 'Taken', unclear: 'Unclear', unchecked: 'Not checked yet' }
const rank = (d: string) => (d === 'chosen' ? 0 : d === 'candidate' ? 1 : 2)
const sorted = computed(() => [...props.data.names].sort((a, b) => rank(a.decision) - rank(b.decision)))
</script>

<template>
  <div class="grid gap-3">
    <AdminState v-if="error" kind="error" :message="error" />
    <p v-if="data.chosenName" class="inline-flex items-center gap-1.5 self-start rounded-xl bg-success/10 px-3 py-2 text-sm font-bold text-wd-green-700"><Crown class="size-4" aria-hidden="true" /> Decided: {{ data.chosenName }}</p>

    <article v-for="n in sorted" :key="n.id" class="rounded-xl border p-3" :class="n.decision === 'dropped' ? 'opacity-60' : n.decision === 'chosen' ? 'border-success/50 bg-success/5' : 'bg-card'">
      <div class="flex flex-wrap items-center gap-2">
        <p class="font-display text-lg font-bold" :class="n.decision === 'dropped' ? 'line-through' : ''">{{ n.name }}</p>
        <span class="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider" :class="verdictStyle[n.verdict]">{{ verdictLabel[n.verdict] }}</span>
        <span v-if="n.decision !== 'candidate'" class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{{ n.decision }}</span>
        <span class="flex-1" />
        <Button v-if="n.decision !== 'chosen'" type="button" size="sm" variant="soft" :disabled="n.verdict !== 'free'" :title="n.verdict !== 'free' ? 'Needs evidence that it’s free' : undefined" :loading="busy === `decide:${n.id}`" @click="decide(n.id, 'chosen')"><Crown /> Choose</Button>
        <Button v-if="n.decision !== 'candidate'" type="button" size="sm" variant="ghost" :loading="busy === `decide:${n.id}`" @click="decide(n.id, 'candidate')">Back to candidates</Button>
        <Button v-if="n.decision === 'candidate'" type="button" size="sm" variant="ghost" :loading="busy === `decide:${n.id}`" @click="decide(n.id, 'dropped')"><X /> Drop</Button>
      </div>
      <p v-if="n.note" class="mt-1 text-sm text-muted-foreground">{{ n.note }}</p>

      <ul v-if="n.evidence.length" class="mt-2 grid gap-1.5">
        <li v-for="e in n.evidence" :key="e.id" class="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <span class="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase" :class="verdictStyle[e.verdict ?? 'unchecked']">{{ e.verdict ?? 'note' }}</span>
          <span class="min-w-0 flex-1">
            <span class="font-bold">{{ e.source }}</span>
            <span v-if="e.via !== 'manual'" class="ml-1 text-[11px] text-muted-foreground">(automated)</span>
            <a v-if="e.url" :href="e.url" target="_blank" rel="noopener" class="block break-all text-xs text-secondary underline">{{ e.url }}</a>
            <span v-if="e.note" class="block text-muted-foreground">{{ e.note }}</span>
          </span>
          <button type="button" class="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove this evidence" @click="remove(e.id)"><Trash2 class="size-3.5" /></button>
        </li>
      </ul>

      <details v-if="n.decision !== 'dropped'" class="mt-2" :open="!n.evidence.length">
        <summary class="cursor-pointer text-sm font-bold text-secondary">Check it</summary>
        <ul class="mt-2 grid gap-1.5">
          <li v-for="c in n.checks" :key="c.source" class="flex flex-wrap items-center gap-1.5 text-sm">
            <a :href="c.url" target="_blank" rel="noopener" class="inline-flex w-36 items-center gap-1 font-bold text-secondary underline"><ExternalLink class="size-3.5" aria-hidden="true" /> {{ c.source }}</a>
            <span class="text-xs text-muted-foreground">I saw:</span>
            <Button v-for="v in (['free', 'taken', 'unclear'] as const)" :key="v" type="button" size="sm" variant="outline" class="h-7 px-2 text-xs" :loading="busy === `log:${n.id}:${c.source}:${v}`" @click="log(n.id, c.source, c.url, v)">{{ v }}</Button>
            <Button v-if="c.handle && data.instagramCheck" type="button" size="sm" variant="ghost" class="h-7 px-2 text-xs" :loading="busy === `ig:${n.id}`" @click="checkIg(n.id, c.handle)"><Instagram /> Check @{{ c.handle }} automatically</Button>
          </li>
        </ul>
        <form novalidate class="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr_7rem_1fr_auto]" @submit.prevent="addCustom(n.id)">
          <Input v-model="draftFor(n.id).source" placeholder="Source" aria-label="Source" />
          <Input v-model="draftFor(n.id).url" type="url" placeholder="https://…" aria-label="Link" />
          <select v-model="draftFor(n.id).verdict" class="h-9 rounded-md border bg-card px-2 text-sm" aria-label="Verdict">
            <option value="free">free</option><option value="taken">taken</option><option value="unclear">unclear</option>
          </select>
          <Input v-model="draftFor(n.id).note" placeholder="What you found" aria-label="Note" />
          <Button type="submit" variant="outline" size="sm" :disabled="draftFor(n.id).verdict === 'free' ? !draftFor(n.id).url : !draftFor(n.id).url && !draftFor(n.id).note" :loading="busy === `custom:${n.id}`"><Plus /> Log</Button>
        </form>
        <p class="mt-1 text-[11px] text-muted-foreground">“free” needs a link — a check without evidence doesn’t count.</p>
        <button v-if="!n.evidence.length" type="button" class="mt-1 text-[11px] text-muted-foreground underline" @click="removeName(n.id)">Remove this candidate</button>
      </details>
    </article>

    <form novalidate class="flex gap-2" @submit.prevent="add">
      <Input v-model="newName" placeholder="Another name to check" aria-label="New name candidate" class="max-w-sm" />
      <Button type="submit" variant="outline" size="sm" :disabled="!newName.trim()" :loading="busy === 'add'"><Plus /> Add</Button>
    </form>
    <p v-if="!data.chosenName && data.names.some(n => n.verdict === 'free')" class="flex items-center gap-1 text-xs text-muted-foreground"><Check class="size-3.5" aria-hidden="true" /> A name with evidence that it’s free can be chosen.</p>
  </div>
</template>
