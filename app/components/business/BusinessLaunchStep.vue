<script setup lang="ts">
/**
 * One step of the launch workspace (Business → page → Launch): why it matters,
 * the fields, ready-to-paste texts (editable, with copy buttons and an optional
 * AI redraft), the links to the right screen, the evidence and the done tick.
 *
 *   <BusinessLaunchStep :username="u" :data="data" :step-key="'maps.name'" @loaded="d => data = d" />
 */
import { Check, Copy, ExternalLink, Link2, Pencil, RotateCcw, Sparkles, Trash2, Plus, Circle, CircleDot, CircleCheck, AlertTriangle } from 'lucide-vue-next'
import { stepByKey } from '#shared/utils/launch'

type Data = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['businessLaunch']['get']['query']>>
const props = defineProps<{ username: string; data: Data; stepKey: string }>()
const emit = defineEmits<{ loaded: [Data] }>()
const { $trpc } = useNuxtApp()

const meta = computed(() => stepByKey(props.stepKey)!)
const state = computed(() => props.data.steps.find(s => s.key === props.stepKey)!)
const open = ref(state.value.status !== 'done')
const error = ref<string | null>(null)
const busy = ref<string | null>(null)

async function run(label: string, fn: () => Promise<Data>) {
  busy.value = label
  error.value = null
  try { emit('loaded', await fn()) } catch (e: any) { error.value = e?.data?.zodError ? 'Check the fields.' : (e?.message || 'Didn’t work. Try again.') } finally { busy.value = null }
}

// --- fields
const form = reactive<Record<string, string>>({})
const resetForm = () => { for (const f of meta.value.fields) form[f.key] = state.value.fields[f.key] ?? '' }
watch(() => state.value.fields, resetForm, { immediate: true })
const fieldsDirty = computed(() => meta.value.fields.some(f => (form[f.key] ?? '') !== (state.value.fields[f.key] ?? '')))
const saveFields = () => run('fields', () => $trpc.businessLaunch.saveStep.mutate({ username: props.username, stepKey: props.stepKey, fields: { ...form } }))

// --- texts
const texts = reactive<Record<string, string>>({})
watch(() => state.value.copy.map(c => c.text).join('\u0000'), () => { for (const c of state.value.copy) texts[c.key] = c.text }, { immediate: true })
const textDirty = (k: string) => texts[k] !== state.value.copy.find(c => c.key === k)?.text
const saveText = (k: string) => run(`text:${k}`, () => $trpc.businessLaunch.saveStep.mutate({ username: props.username, stepKey: props.stepKey, copy: { [k]: texts[k] ?? '' } }))
const resetText = (k: string) => run(`text:${k}`, () => $trpc.businessLaunch.saveStep.mutate({ username: props.username, stepKey: props.stepKey, copy: { [k]: null } }))
const copied = ref<string | null>(null)
async function copy(k: string) {
  try { await navigator.clipboard.writeText(texts[k] ?? ''); copied.value = k; setTimeout(() => { if (copied.value === k) copied.value = null }, 1500) } catch { error.value = 'Couldn’t copy. Select the text and copy it by hand.' }
}
async function aiDraft(k: string) {
  busy.value = `ai:${k}`
  error.value = null
  try { texts[k] = (await $trpc.businessLaunch.draft.mutate({ username: props.username, stepKey: props.stepKey, copyKey: k })).text } catch (e: any) { error.value = e?.message || 'Couldn’t write a draft.' } finally { busy.value = null }
}

// --- links (correctable)
const editingLink = ref<number | null>(null)
const linkDraft = ref('')
function editLink(i: number, url: string) { editingLink.value = i; linkDraft.value = url }
const saveLink = (i: number) => run('link', async () => { const d = await $trpc.businessLaunch.saveStep.mutate({ username: props.username, stepKey: props.stepKey, fields: { [`link:${i}`]: linkDraft.value } }); editingLink.value = null; return d })
const isInternal = (u: string) => u.startsWith('/')

// --- evidence
const ev = reactive({ source: '', url: '', note: '' })
const addEvidence = () => run('evidence', async () => {
  const d = await $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: props.stepKey, source: ev.source, url: ev.url, note: ev.note })
  ev.source = ''; ev.url = ''; ev.note = ''
  return d
})
const removeEvidence = (id: string) => run(`ev:${id}`, () => $trpc.businessLaunch.removeEvidence.mutate({ username: props.username, id }))

// --- status
async function setStatus(status: 'todo' | 'doing' | 'done') {
  await run('status', () => $trpc.businessLaunch.setStatus.mutate({ username: props.username, stepKey: props.stepKey, status }))
  if (status === 'done' && !error.value) {
    useTrack().track('launch_step_completed', { profile: props.username, step: props.stepKey, stage: meta.value.stage })
    open.value = false
  }
}
const statusLabel = { todo: 'To do', doing: 'In progress', done: 'Done' } as const
</script>

<template>
  <article :id="`step-${stepKey}`" class="rounded-2xl border bg-card" :class="state.status === 'done' ? 'border-success/40' : ''">
    <button type="button" class="flex w-full items-start gap-3 p-4 text-left" :aria-expanded="open" @click="open = !open">
      <CircleCheck v-if="state.status === 'done'" class="mt-0.5 size-5 shrink-0 text-wd-green-700" aria-hidden="true" />
      <CircleDot v-else-if="state.status === 'doing'" class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
      <Circle v-else class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block font-bold leading-snug">{{ meta.title }}</span>
        <span class="mt-0.5 block text-sm text-muted-foreground">{{ meta.why }}</span>
      </span>
      <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider" :class="state.status === 'done' ? 'bg-success/15 text-wd-green-700' : state.status === 'doing' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'">{{ statusLabel[state.status] }}</span>
    </button>

    <div v-if="open" class="grid gap-5 border-t p-4">
      <AdminState v-if="error" kind="error" :message="error" />

      <!-- The name step's own body -->
      <slot />

      <!-- Fields -->
      <form v-if="meta.fields.length" novalidate class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveFields">
        <Field v-for="f in meta.fields" :id="`${stepKey}-${f.key}`" :key="f.key" :label="f.label" :hint="f.hint" :class="f.kind === 'textarea' ? 'sm:col-span-2' : ''">
          <Textarea v-if="f.kind === 'textarea'" v-model="form[f.key]" :rows="3" :maxlength="f.max" />
          <Input v-else v-model="form[f.key]" :type="f.kind === 'url' ? 'url' : 'text'" />
        </Field>
        <div class="sm:col-span-2">
          <Button type="submit" variant="pill" size="pill-sm" :disabled="!fieldsDirty" :loading="busy === 'fields'">Save</Button>
        </div>
      </form>

      <!-- Ready-to-paste texts -->
      <div v-for="c in state.copy" :key="c.key" class="rounded-xl border bg-muted/30 p-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-sm font-bold">{{ c.label }} <span v-if="c.edited" class="ml-1 text-[11px] font-normal text-muted-foreground">your edit</span></p>
          <span v-if="c.max" class="text-[11px] tabular-nums" :class="(texts[c.key]?.length ?? 0) > c.max ? 'font-bold text-destructive' : 'text-muted-foreground'">{{ texts[c.key]?.length ?? 0 }} / {{ c.max }}</span>
        </div>
        <p v-if="c.hint" class="text-xs text-muted-foreground">{{ c.hint }}</p>
        <Textarea v-model="texts[c.key]" :rows="Math.min(8, Math.max(2, (texts[c.key] ?? '').split('\n').length + 1))" class="mt-1.5 bg-card text-sm" :aria-label="c.label" />
        <p v-if="!texts[c.key]" class="mt-1 text-xs text-muted-foreground">Fill the brand fields above (stage 1) and the draft writes itself.</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <Button type="button" variant="outline" size="sm" :disabled="!texts[c.key]" @click="copy(c.key)"><Check v-if="copied === c.key" /><Copy v-else /> {{ copied === c.key ? 'Copied' : 'Copy' }}</Button>
          <Button v-if="textDirty(c.key)" type="button" variant="soft" size="sm" :loading="busy === `text:${c.key}`" @click="saveText(c.key)">Keep my edit</Button>
          <Button v-if="c.edited" type="button" variant="ghost" size="sm" :loading="busy === `text:${c.key}`" @click="resetText(c.key)"><RotateCcw /> Back to the draft</Button>
          <Button type="button" variant="ghost" size="sm" :loading="busy === `ai:${c.key}`" @click="aiDraft(c.key)"><Sparkles /> Redraft with AI</Button>
        </div>
      </div>

      <!-- Where to do it -->
      <div v-if="state.links.length">
        <p class="text-sm font-bold">Where to do it</p>
        <ul class="mt-1.5 grid gap-1.5">
          <li v-for="(l, i) in state.links" :key="i" class="flex flex-wrap items-center gap-2">
            <template v-if="editingLink === i">
              <Input v-model="linkDraft" type="url" class="h-8 max-w-md flex-1" :aria-label="`Link for ${l.label}`" />
              <Button type="button" size="sm" variant="soft" :loading="busy === 'link'" @click="saveLink(i)">Save</Button>
              <Button type="button" size="sm" variant="ghost" @click="editingLink = null">Cancel</Button>
            </template>
            <template v-else>
              <Button variant="outline-pill" size="pill-sm" as-child>
                <NuxtLink :to="l.url" :target="isInternal(l.url) ? undefined : '_blank'" :rel="isInternal(l.url) ? undefined : 'noopener'" data-outbound-kind="launch">
                  <ExternalLink v-if="!isInternal(l.url)" /><Link2 v-else /> {{ l.label }}
                </NuxtLink>
              </Button>
              <span v-if="!l.checked" class="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><AlertTriangle class="size-3" aria-hidden="true" /> link not checked</span>
              <button type="button" class="rounded p-1 text-muted-foreground hover:text-foreground" :aria-label="`Correct the link for ${l.label}`" @click="editLink(i, l.url)"><Pencil class="size-3.5" /></button>
            </template>
          </li>
        </ul>
      </div>

      <!-- Evidence (the name step logs its own per candidate) -->
      <div v-if="meta.kind !== 'names'">
        <p class="text-sm font-bold">Evidence <span class="font-normal text-muted-foreground">— {{ meta.proof === 'link' ? 'a link that shows it’s live (needed to tick it done)' : 'links and notes, optional' }}</span></p>
        <ul v-if="state.evidence.length" class="mt-1.5 grid gap-1.5">
          <li v-for="e in state.evidence" :key="e.id" class="flex items-start gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
            <span class="min-w-0 flex-1">
              <span v-if="e.source" class="font-bold">{{ e.source }} </span>
              <a v-if="e.url" :href="e.url" target="_blank" rel="noopener" class="break-all text-secondary underline">{{ e.url }}</a>
              <span v-if="e.note" class="block text-muted-foreground">{{ e.note }}</span>
            </span>
            <button type="button" class="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove this evidence" @click="removeEvidence(e.id)"><Trash2 class="size-3.5" /></button>
          </li>
        </ul>
        <form novalidate class="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]" @submit.prevent="addEvidence">
          <Input v-model="ev.source" placeholder="Source" aria-label="Source" />
          <Input v-model="ev.url" type="url" placeholder="https://…" aria-label="Link" />
          <Input v-model="ev.note" placeholder="Note" aria-label="Note" />
          <Button type="submit" variant="outline" size="sm" :disabled="!ev.url && !ev.note" :loading="busy === 'evidence'"><Plus /> Add</Button>
        </form>
      </div>

      <!-- Status -->
      <div class="flex flex-wrap items-center gap-2 border-t pt-3">
        <span class="text-sm font-bold">Status</span>
        <Button v-for="s in (['todo', 'doing'] as const)" :key="s" type="button" size="sm" :variant="state.status === s ? 'soft' : 'ghost'" :aria-pressed="state.status === s" :disabled="busy === 'status'" @click="setStatus(s)">{{ statusLabel[s] }}</Button>
        <Button type="button" size="sm" :variant="state.status === 'done' ? 'soft' : 'cta'" :aria-pressed="state.status === 'done'" :disabled="!!state.blocker || state.status === 'done'" :loading="busy === 'status'" @click="setStatus('done')"><Check /> Mark done</Button>
        <span v-if="state.blocker && state.status !== 'done'" class="text-xs text-muted-foreground">{{ state.blocker }}</span>
      </div>
    </div>
  </article>
</template>
