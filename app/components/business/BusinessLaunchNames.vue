<script setup lang="ts">
/**
 * Launch workspace, stage 2: name candidates. Per name: open each search, then
 * say what you saw (free / taken / not sure). The verdict comes from those
 * answers: "free" only with a link, and any "taken" wins. A free name can be
 * chosen; dropped names fold away.
 */
import { ExternalLink, Plus, Trash2, Crown, Instagram } from 'lucide-vue-next'

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
  try { emit('loaded', await fn()); return true } catch (e: any) { error.value = e?.message || 'Didn’t work. Try again.'; return false } finally { busy.value = null }
}

const newName = ref('')
const add = async () => { if (await run('add', () => $trpc.businessLaunch.addName.mutate({ username: props.username, name: newName.value }))) newName.value = '' }
const log = (nameId: string, source: string, url: string, verdict: 'free' | 'taken' | 'unclear') =>
  run(`log:${nameId}:${source}`, () => $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: STEP, nameId, source, url, verdict }))
const remove = (id: string) => run(`ev:${id}`, () => $trpc.businessLaunch.removeEvidence.mutate({ username: props.username, id }))
const decide = (id: string, decision: 'candidate' | 'chosen' | 'dropped') => run(`decide:${id}`, () => $trpc.businessLaunch.decideName.mutate({ username: props.username, id, decision }))
const removeName = (id: string) => run(`rm:${id}`, () => $trpc.businessLaunch.removeName.mutate({ username: props.username, id }))
const checkIg = (nameId: string, handle: string) => run(`ig:${nameId}`, () => $trpc.businessLaunch.checkInstagram.mutate({ username: props.username, stepKey: STEP, nameId, handle }))

// Something found elsewhere, per candidate.
type Custom = { url: string; verdict: 'free' | 'taken' | 'unclear'; note: string }
const custom = reactive<Record<string, Custom>>({})
const draftFor = (id: string): Custom => (custom[id] ??= { url: '', verdict: 'taken', note: '' })
const addCustom = async (id: string) => { if (await run(`custom:${id}`, () => $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: STEP, nameId: id, source: 'Other', ...draftFor(id) }))) custom[id] = { url: '', verdict: 'taken', note: '' } }

const verdictStyle: Record<string, string> = { free: 'text-wd-green-700', taken: 'text-destructive', unclear: 'text-amber-700 dark:text-amber-300', unchecked: 'text-muted-foreground' }
const verdictLabel: Record<string, string> = { free: 'Looks free', taken: 'Taken', unclear: 'Not sure yet', unchecked: 'Not checked yet' }
const answerLabel: Record<string, string> = { free: 'free', taken: 'taken', unclear: 'not sure' }
const live = computed(() => props.data.names.filter(n => n.decision !== 'dropped').sort((a, b) => (a.decision === 'chosen' ? -1 : b.decision === 'chosen' ? 1 : 0)))
const dropped = computed(() => props.data.names.filter(n => n.decision === 'dropped'))
// The latest answer per source, so each check shows once.
const answerFor = (n: Data['names'][number], source: string) => n.evidence.filter(e => e.source === source).at(-1)
// "change" clears every answer from that source, so no hidden older answer still counts.
async function clearAnswers(n: Data['names'][number], source: string) {
  for (const e of n.evidence.filter(x => x.source === source)) if (!(await remove(e.id))) return
}
const otherEvidence = (n: Data['names'][number]) => n.evidence.filter(e => !n.checks.some(c => c.source === e.source))
</script>

<template>
  <div class="grid grid-cols-1 gap-4">
    <AdminState v-if="error" kind="error" :message="error" />

    <article v-for="n in live" :key="n.id" class="rounded-2xl border p-4" :class="n.decision === 'chosen' ? 'border-success/50 bg-success/5' : ''">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p class="font-display text-xl font-bold">{{ n.name }}</p>
        <span v-if="n.decision === 'chosen'" class="inline-flex items-center gap-1 text-sm font-bold text-wd-green-700"><Crown class="size-4" aria-hidden="true" /> Your name</span>
        <span v-else class="text-sm font-bold" :class="verdictStyle[n.verdict]">{{ verdictLabel[n.verdict] }}</span>
        <span class="flex-1" />
        <Button v-if="n.decision !== 'chosen' && n.verdict === 'free'" type="button" size="sm" variant="cta" :loading="busy === `decide:${n.id}`" @click="decide(n.id, 'chosen')"><Crown /> Choose this name</Button>
      </div>

      <!-- The checks: open, look, answer -->
      <details class="mt-3" :open="n.decision !== 'chosen'">
        <summary class="cursor-pointer text-sm text-muted-foreground">{{ n.decision === 'chosen' ? 'How it was checked' : 'Search for it, then say what you saw' }}</summary>
        <ul class="mt-2 grid grid-cols-1 gap-2">
          <li v-for="c in n.checks" :key="c.source" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <a :href="c.url" target="_blank" rel="noopener" class="inline-flex min-w-28 items-center gap-1 font-bold text-secondary underline">{{ c.source }} <ExternalLink class="size-3.5" aria-hidden="true" /></a>
            <template v-if="answerFor(n, c.source)">
              <span class="font-bold" :class="verdictStyle[answerFor(n, c.source)!.verdict ?? 'unchecked']">{{ answerLabel[answerFor(n, c.source)!.verdict ?? 'unclear'] }}</span>
              <button type="button" class="text-xs text-muted-foreground underline" @click="clearAnswers(n, c.source)">change</button>
            </template>
            <template v-else>
              <Button v-for="v in (['free', 'taken', 'unclear'] as const)" :key="v" type="button" size="sm" variant="outline" class="h-7 px-2.5 text-xs" :disabled="busy === `log:${n.id}:${c.source}`" @click="log(n.id, c.source, c.url, v)">{{ answerLabel[v] }}</Button>
              <button v-if="c.handle && data.instagramCheck" type="button" class="inline-flex items-center gap-1 text-xs text-muted-foreground underline" :disabled="busy === `ig:${n.id}`" @click="checkIg(n.id, c.handle)"><Instagram class="size-3" aria-hidden="true" /> check for me</button>
            </template>
          </li>
          <li v-for="e in otherEvidence(n)" :key="e.id" class="flex items-start gap-2 text-sm">
            <span class="font-bold" :class="verdictStyle[e.verdict ?? 'unchecked']">{{ e.verdict ? answerLabel[e.verdict] : 'note' }}</span>
            <span class="min-w-0 flex-1">
              <a v-if="e.url" :href="e.url" target="_blank" rel="noopener" class="block truncate text-secondary underline">{{ e.url }}</a>
              <span v-if="e.note" class="block text-muted-foreground">{{ e.note }}</span>
            </span>
            <button type="button" class="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove" @click="remove(e.id)"><Trash2 class="size-3.5" /></button>
          </li>
        </ul>

        <details class="mt-3 text-sm">
          <summary class="cursor-pointer text-xs text-muted-foreground">Found it somewhere else?</summary>
          <form novalidate class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]" @submit.prevent="addCustom(n.id)">
            <Input v-model="draftFor(n.id).url" type="url" placeholder="Link to what you found" aria-label="Link" />
            <select v-model="draftFor(n.id).verdict" class="h-9 rounded-md border bg-card px-2 text-sm" aria-label="It shows the name is">
              <option value="taken">taken</option><option value="free">free</option><option value="unclear">not sure</option>
            </select>
            <Button type="submit" variant="outline" size="sm" :disabled="!draftFor(n.id).url.trim()" :loading="busy === `custom:${n.id}`"><Plus /> Add</Button>
          </form>
        </details>

        <div class="mt-3 flex gap-3 text-xs">
          <button v-if="n.decision === 'chosen'" type="button" class="text-muted-foreground underline" @click="decide(n.id, 'candidate')">Undo choice</button>
          <button v-else type="button" class="text-muted-foreground underline" @click="decide(n.id, 'dropped')">Drop this name</button>
          <button v-if="!n.evidence.length" type="button" class="text-muted-foreground underline" @click="removeName(n.id)">Delete</button>
        </div>
      </details>
    </article>

    <p v-if="!live.length" class="text-sm text-muted-foreground">Write down a name you like. Then we check it together.</p>
    <form novalidate class="flex gap-2" @submit.prevent="add">
      <Input v-model="newName" :placeholder="live.length ? 'Another name to check' : 'A name you like'" aria-label="Name to check" class="max-w-sm" />
      <Button type="submit" variant="outline" size="sm" :disabled="!newName.trim()" :loading="busy === 'add'"><Plus /> Add</Button>
    </form>

    <details v-if="dropped.length" class="text-sm">
      <summary class="cursor-pointer text-muted-foreground">Dropped ({{ dropped.length }})</summary>
      <ul class="mt-2 grid grid-cols-1 gap-1">
        <li v-for="n in dropped" :key="n.id" class="flex items-center gap-2">
          <span class="line-through">{{ n.name }}</span>
          <span class="text-xs" :class="verdictStyle[n.verdict]">{{ verdictLabel[n.verdict] }}</span>
          <button type="button" class="text-xs text-muted-foreground underline" @click="decide(n.id, 'candidate')">bring back</button>
        </li>
      </ul>
    </details>
  </div>
</template>
