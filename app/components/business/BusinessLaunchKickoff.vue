<script setup lang="ts">
/**
 * Launch kickoff: one plain question per screen. Taps are prefilled from the
 * page, its events and the venue. Skip leaves that fact out — we don't invent it.
 * The last answer is what the drafts are written from.
 */
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { kickoffQuestions, kickoffSelection, type KickoffQuestion } from '#shared/utils/launchKickoff'

type Data = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['businessLaunch']['get']['query']>>
const props = defineProps<{ username: string; data: Data }>()
const emit = defineEmits<{ loaded: [Data]; done: [] }>()
const { $trpc } = useNuxtApp()

const questions = computed(() => kickoffQuestions(props.data.known, props.data.values))
const error = ref<string | null>(null)
const busy = ref(false)
// Local position so Back doesn't need a round trip. The server's `at` is where a refresh resumes.
const index = ref(0)
function resume() {
  if (props.data.kickoff.status === 'done') return
  const i = questions.value.findIndex(q => q.key === props.data.kickoff.at)
  if (i >= 0) index.value = i
}
watch(() => props.data.kickoff.at, resume, { immediate: true })
const question = computed(() => questions.value[index.value] ?? questions.value[0]!)

const selected = ref<string[]>([])
const custom = ref('')
function syncSelection(q: KickoffQuestion) {
  const sel = kickoffSelection(q, props.data.values, props.data.kickoff.skipped, props.data.kickoff.picks)
  selected.value = [...sel.optionIds]
  custom.value = sel.custom
}
watch(question, syncSelection, { immediate: true })

function toggle(id: string) {
  custom.value = ''
  if (question.value.pick === 'single') {
    selected.value = selected.value[0] === id ? [] : [id]
    return
  }
  selected.value = selected.value.includes(id) ? selected.value.filter(x => x !== id) : [...selected.value, id]
}
watch(custom, (v) => { if (v.trim()) selected.value = [] })

const canNext = computed(() => selected.value.length > 0 || !!custom.value.trim())

async function send(skip: boolean) {
  busy.value = true
  error.value = null
  const key = question.value.key
  const last = index.value >= questions.value.length - 1
  const wasDone = props.data.kickoff.status === 'done'
  try {
    const data = await $trpc.businessLaunch.answerKickoff.mutate({
      username: props.username,
      question: key,
      optionIds: skip ? [] : selected.value,
      custom: skip ? '' : custom.value.trim(),
      skip,
    })
    emit('loaded', data)
    if (last || data.kickoff.status === 'done') {
      if (!wasDone) useTrack().track('launch_step_completed', { profile: props.username, step: 'kickoff', stage: 'brand' })
      emit('done')
    } else {
      const i = questions.value.findIndex(q => q.key === data.kickoff.at)
      index.value = i >= 0 ? i : Math.min(index.value + 1, questions.value.length - 1)
    }
  } catch (e: any) {
    error.value = e?.message || 'Didn’t save. Try again.'
  } finally {
    busy.value = false
  }
}
const back = () => { if (index.value > 0) index.value -= 1 }
</script>

<template>
  <article class="rounded-3xl border bg-card p-5 sm:p-7">
    <p class="text-eyebrow font-bold uppercase tracking-[0.25em] text-secondary">Question {{ index + 1 }} of {{ questions.length }} · Kickoff</p>
    <h2 class="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">{{ question.prompt }}</h2>
    <p class="mt-1.5 text-muted-foreground">{{ question.hint }}</p>

    <div v-if="error" class="mt-4">
      <AdminState kind="error" :message="error" />
    </div>

    <div
      class="mt-6"
      :class="question.layout === 'chips' ? 'flex flex-wrap gap-2' : 'grid gap-2'"
      :role="question.pick === 'single' ? 'radiogroup' : 'group'"
      :aria-label="question.prompt"
    >
      <button
        v-for="o in question.options"
        :key="o.id"
        type="button"
        class="rounded-full border px-4 py-2 text-left text-sm font-bold transition-colors"
        :class="[
          question.layout === 'stack' ? 'rounded-2xl px-4 py-3' : '',
          selected.includes(o.id) ? 'border-primary bg-primary text-white' : 'bg-card hover:bg-muted',
        ]"
        :role="question.pick === 'single' ? 'radio' : undefined"
        :aria-checked="question.pick === 'single' ? selected.includes(o.id) : undefined"
        :aria-pressed="question.pick === 'multi' ? selected.includes(o.id) : undefined"
        :disabled="busy"
        @click="toggle(o.id)"
      >{{ o.label }}</button>
    </div>

    <div v-if="question.ownWords" class="mt-4">
      <label :for="`kickoff-${question.key}`" class="text-sm font-bold">Or in your words</label>
      <Input
        :id="`kickoff-${question.key}`"
        v-model="custom"
        :maxlength="question.ownWords.max"
        :placeholder="question.ownWords.placeholder"
        class="mt-1.5"
        :disabled="busy"
      />
    </div>

    <div class="mt-8 border-t pt-5">
      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3 sm:contents">
          <Button v-if="index > 0" type="button" variant="ghost" size="sm" :disabled="busy" @click="back"><ArrowLeft /> Back</Button>
          <span class="flex-1" />
          <button type="button" class="text-sm text-muted-foreground underline" :disabled="busy" @click="send(true)">Skip</button>
        </div>
        <Button type="button" variant="cta" class="w-full sm:w-auto" :disabled="!canNext" :loading="busy" @click="send(false)">Next <ArrowRight /></Button>
      </div>
    </div>
  </article>
</template>
