<script setup lang="ts">
/**
 * One step of the launch workspace (Business → page → Launch), shown on its own:
 * why it matters, what to fill in, the text to paste, the one button that opens
 * the right screen, the proof link when the step needs one, and "Done — next".
 * Everything secondary (correcting a link, notes, AI redraft) sits one tap away.
 *
 *   <BusinessLaunchStep :username="u" :data="data" :step-key="'maps.name'" @loaded="d => data = d" @next="…" @back="…" />
 */
import { Check, Copy, ExternalLink, Link2, RotateCcw, Sparkles, Trash2, Plus, ArrowLeft, ArrowRight, CircleCheck } from 'lucide-vue-next'
import { stepByKey } from '#shared/utils/launch'

type Data = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['businessLaunch']['get']['query']>>
const props = defineProps<{ username: string; data: Data; stepKey: string; position: number; total: number; stageTitle: string; hasBack: boolean }>()
const emit = defineEmits<{ loaded: [Data]; next: []; back: [] }>()
const { $trpc } = useNuxtApp()

const meta = computed(() => stepByKey(props.stepKey)!)
const state = computed(() => props.data.steps.find(s => s.key === props.stepKey)!)
const error = ref<string | null>(null)
const busy = ref<string | null>(null)

async function run(label: string, fn: () => Promise<Data>) {
  busy.value = label
  error.value = null
  try { emit('loaded', await fn()); return true } catch (e: any) { error.value = e?.data?.zodError ? 'Check the fields.' : (e?.message || 'Didn’t work. Try again.'); return false } finally { busy.value = null }
}

// --- fields
const form = reactive<Record<string, string>>({})
const resetForm = () => { for (const f of meta.value.fields) form[f.key] = state.value.fields[f.key] ?? '' }
watch(() => [props.stepKey, state.value.fields], resetForm, { immediate: true })
const fieldsDirty = computed(() => meta.value.fields.some(f => (form[f.key] ?? '') !== (state.value.fields[f.key] ?? '')))
const saveFields = () => run('fields', () => $trpc.businessLaunch.saveStep.mutate({ username: props.username, stepKey: props.stepKey, fields: { ...form } }))

// --- texts
const texts = reactive<Record<string, string>>({})
watch(() => props.stepKey + state.value.copy.map(c => c.text).join('\u0000'), () => { for (const c of state.value.copy) texts[c.key] = c.text }, { immediate: true })
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

// --- links: the first is the button, a wrong one can be corrected
const editingLink = ref<number | null>(null)
const linkDraft = ref('')
function editLink(i: number, url: string) { editingLink.value = i; linkDraft.value = url }
const saveLink = async (i: number) => { if (await run('link', () => $trpc.businessLaunch.saveStep.mutate({ username: props.username, stepKey: props.stepKey, fields: { [`link:${i}`]: linkDraft.value } }))) editingLink.value = null }
const isInternal = (u: string) => u.startsWith('/')

// --- proof: a link that shows it's live (proof steps), else an optional note
const proofUrl = ref('')
const note = ref('')
const addProof = async () => { if (await run('proof', () => $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: props.stepKey, url: proofUrl.value }))) proofUrl.value = '' }
const addNote = async () => { if (await run('note', () => $trpc.businessLaunch.addEvidence.mutate({ username: props.username, stepKey: props.stepKey, note: note.value }))) note.value = '' }
const removeEvidence = (id: string) => run(`ev:${id}`, () => $trpc.businessLaunch.removeEvidence.mutate({ username: props.username, id }))
const needsProof = computed(() => meta.value.proof === 'link' && meta.value.kind !== 'names')
const links = computed(() => state.value.evidence.filter(e => e.url))
const notes = computed(() => state.value.evidence.filter(e => !e.url))

watch(() => props.stepKey, () => { error.value = null; editingLink.value = null; proofUrl.value = ''; note.value = '' })

// --- done
async function done() {
  if (fieldsDirty.value && !(await saveFields())) return
  if (!(await run('status', () => $trpc.businessLaunch.setStatus.mutate({ username: props.username, stepKey: props.stepKey, status: 'done' })))) return
  useTrack().track('launch_step_completed', { profile: props.username, step: props.stepKey, stage: meta.value.stage })
  emit('next')
}
const reopen = () => run('status', () => $trpc.businessLaunch.setStatus.mutate({ username: props.username, stepKey: props.stepKey, status: 'doing' }))
// Unsaved fields don't block "done": they're saved first. The blocker is about proof / a chosen name.
const blocker = computed(() => state.value.status === 'done' ? null : state.value.blocker)
</script>

<template>
  <article :id="`step-${stepKey}`" class="rounded-3xl border bg-card p-5 sm:p-7">
    <p class="text-eyebrow font-bold uppercase tracking-[0.25em] text-secondary">Step {{ position }} of {{ total }} · {{ stageTitle }}</p>
    <h2 class="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{{ meta.title }}</h2>
    <p class="mt-1.5 text-muted-foreground">{{ meta.why }}</p>

    <p v-if="state.status === 'done'" class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm font-bold text-wd-green-700"><CircleCheck class="size-4" aria-hidden="true" /> Done</p>

    <div class="mt-6 grid grid-cols-1 gap-6">
      <AdminState v-if="error" kind="error" :message="error" />

      <!-- The name step's own body -->
      <slot />

      <!-- Fill in -->
      <form v-if="meta.fields.length" novalidate class="grid grid-cols-1 gap-3 sm:grid-cols-2" @submit.prevent="saveFields">
        <Field v-for="f in meta.fields" :id="`${stepKey}-${f.key}`" :key="f.key" :label="f.label" :hint="f.hint" :class="f.kind === 'textarea' ? 'sm:col-span-2' : ''">
          <Textarea v-if="f.kind === 'textarea'" v-model="form[f.key]" :rows="3" :maxlength="f.max" />
          <Input v-else v-model="form[f.key]" :type="f.kind === 'url' ? 'url' : 'text'" />
        </Field>
        <div v-if="fieldsDirty" class="sm:col-span-2">
          <Button type="submit" variant="soft" size="sm" :loading="busy === 'fields'">Save</Button>
        </div>
      </form>

      <!-- Text to paste -->
      <div v-for="c in state.copy" :key="c.key">
        <div class="flex items-baseline justify-between gap-2">
          <p class="text-sm font-bold">{{ c.label }}</p>
          <span v-if="c.max" class="text-xs tabular-nums" :class="(texts[c.key]?.length ?? 0) > c.max ? 'font-bold text-destructive' : 'text-muted-foreground'">{{ texts[c.key]?.length ?? 0 }} / {{ c.max }}</span>
        </div>
        <p v-if="c.hint" class="text-xs text-muted-foreground">{{ c.hint }}</p>
        <Textarea v-model="texts[c.key]" :rows="Math.min(8, Math.max(2, (texts[c.key] ?? '').split('\n').length + 1))" class="mt-1.5 text-sm" :aria-label="c.label" />
        <p v-if="!texts[c.key]" class="mt-1 text-xs text-muted-foreground">Fill in the first steps (your brand and the place) and this text writes itself.</p>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Button type="button" variant="outline" size="sm" :disabled="!texts[c.key]" @click="copy(c.key)"><Check v-if="copied === c.key" /><Copy v-else /> {{ copied === c.key ? 'Copied' : 'Copy' }}</Button>
          <Button v-if="textDirty(c.key)" type="button" variant="soft" size="sm" :loading="busy === `text:${c.key}`" @click="saveText(c.key)">Keep my edit</Button>
          <button v-if="c.edited && !textDirty(c.key)" type="button" class="inline-flex items-center gap-1 text-xs text-muted-foreground underline" :disabled="busy === `text:${c.key}`" @click="resetText(c.key)"><RotateCcw class="size-3" aria-hidden="true" /> Back to our draft</button>
          <button type="button" class="inline-flex items-center gap-1 text-xs text-muted-foreground underline" :disabled="busy === `ai:${c.key}`" @click="aiDraft(c.key)"><Sparkles class="size-3" aria-hidden="true" /> {{ busy === `ai:${c.key}` ? 'Writing…' : 'Try another wording' }}</button>
        </div>
      </div>

      <!-- Where to do it -->
      <div v-if="state.links.length" class="grid grid-cols-1 gap-2">
        <div v-for="(l, i) in state.links" :key="i">
          <div v-if="editingLink === i" class="flex flex-wrap items-center gap-2">
            <Input v-model="linkDraft" type="url" class="h-9 max-w-md flex-1" :aria-label="`Link for ${l.label}`" />
            <Button type="button" size="sm" variant="soft" :loading="busy === 'link'" @click="saveLink(i)">Save</Button>
            <Button type="button" size="sm" variant="ghost" @click="editingLink = null">Cancel</Button>
          </div>
          <div v-else class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button :variant="i === 0 ? 'default' : 'outline'" :size="i === 0 ? 'default' : 'sm'" as-child>
              <NuxtLink :to="l.url" :target="isInternal(l.url) ? undefined : '_blank'" :rel="isInternal(l.url) ? undefined : 'noopener'" data-outbound-kind="launch">
                {{ l.label }} <ExternalLink v-if="!isInternal(l.url)" /><Link2 v-else />
              </NuxtLink>
            </Button>
            <button type="button" class="text-xs text-muted-foreground underline" @click="editLink(i, l.url)">{{ l.checked ? 'Wrong link?' : 'Not sure this link is right — correct it' }}</button>
          </div>
        </div>
      </div>

      <!-- Proof -->
      <div v-if="needsProof && state.status !== 'done'" class="rounded-2xl bg-muted/40 p-4">
        <p class="text-sm font-bold">When it’s live, paste the link here</p>
        <p class="text-xs text-muted-foreground">So you (and anyone helping) can see it’s really done.</p>
        <form novalidate class="mt-2 flex gap-2" @submit.prevent="addProof">
          <Input v-model="proofUrl" type="url" placeholder="https://…" aria-label="Link that shows it’s live" class="flex-1" />
          <Button type="submit" variant="outline" size="sm" :disabled="!proofUrl.trim()" :loading="busy === 'proof'"><Plus /> Add</Button>
        </form>
      </div>
      <ul v-if="links.length" class="grid grid-cols-1 gap-1.5">
        <li v-for="e in links" :key="e.id" class="flex items-center gap-2 text-sm">
          <Check class="size-4 shrink-0 text-wd-green-700" aria-hidden="true" />
          <a :href="e.url!" target="_blank" rel="noopener" class="min-w-0 flex-1 truncate text-secondary underline">{{ e.url }}</a>
          <button type="button" class="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove this link" @click="removeEvidence(e.id)"><Trash2 class="size-3.5" /></button>
        </li>
      </ul>

      <!-- Notes, optional -->
      <details v-if="meta.kind !== 'names'" class="text-sm" :open="notes.length > 0">
        <summary class="cursor-pointer text-muted-foreground">Add a note</summary>
        <ul v-if="notes.length" class="mt-2 grid grid-cols-1 gap-1.5">
          <li v-for="e in notes" :key="e.id" class="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span class="min-w-0 flex-1">{{ e.note }}</span>
            <button type="button" class="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Remove this note" @click="removeEvidence(e.id)"><Trash2 class="size-3.5" /></button>
          </li>
        </ul>
        <form novalidate class="mt-2 flex gap-2" @submit.prevent="addNote">
          <Input v-model="note" placeholder="e.g. Submitted, waiting for them to publish it" aria-label="Note" class="flex-1" />
          <Button type="submit" variant="outline" size="sm" :disabled="!note.trim()" :loading="busy === 'note'">Add</Button>
        </form>
      </details>
    </div>

    <!-- Move on: the main button first on a phone, on the right on a wide screen -->
    <div class="mt-8 border-t pt-5">
      <p v-if="blocker" class="mb-2 text-sm text-muted-foreground sm:text-right">{{ blocker }}</p>
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3 sm:contents">
          <Button v-if="hasBack" type="button" variant="ghost" size="sm" @click="emit('back')"><ArrowLeft /> Back</Button>
          <span class="flex-1" />
          <button v-if="state.status === 'done'" type="button" class="text-sm text-muted-foreground underline" :disabled="busy === 'status'" @click="reopen">Not done after all</button>
          <button v-else type="button" class="text-sm text-muted-foreground underline" @click="emit('next')">Skip for now</button>
        </div>
        <Button v-if="state.status === 'done'" type="button" variant="cta" class="w-full sm:w-auto" @click="emit('next')">Next step <ArrowRight /></Button>
        <Button v-else type="button" variant="cta" class="w-full sm:w-auto" :disabled="!!blocker" :loading="busy === 'status'" @click="done"><Check /> Done — next step</Button>
      </div>
    </div>
  </article>
</template>
