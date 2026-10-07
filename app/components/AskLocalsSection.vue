<script setup lang="ts">
/**
 * "Ask locals" for a city — newcomers post a question; locals answer by
 * recommending an organizer/venue, which becomes an auto-5★ review on that
 * target. Client-side fetch. 2026 tropical style.
 */
import { MessagesSquare, Send, ThumbsUp } from 'lucide-vue-next'
import { AskLocalsSchema, RecommendPlaceSchema } from '#shared/validation'

const props = defineProps<{ citySlug: string; cityName?: string }>()
const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()

const questions = ref<any[]>([])
const loading = ref(true)

const asking = reactive({ open: false, text: '', busy: false, err: '' })
const rec = reactive({ open: false, type: 'organizer' as 'organizer' | 'venue', name: '', text: '', busy: false, err: '', done: false })
const askForm = reactive(useFormValidation(AskLocalsSchema, () => ({ question: asking.text })))
const recForm = reactive(useFormValidation(RecommendPlaceSchema, () => ({ targetType: rec.type, targetName: rec.name, text: rec.text })))
const uid = useId()

async function load() {
  loading.value = true
  try { questions.value = await $trpc.askLocals.listByCity.query({ citySlug: props.citySlug }) }
  catch { questions.value = [] } finally { loading.value = false }
}
onMounted(load)

async function ask() {
  asking.err = ''
  const result = askForm.validate()
  if (!result.success) return
  asking.busy = true
  try {
    await $trpc.askLocals.ask.mutate({ citySlug: props.citySlug, ...result.data })
    // CUJ: "Ask locals" — question posted.
    useTrack().track('ask_locals_post', { city: props.citySlug, kind: 'ask' })
    asking.text = ''; asking.open = false
    await load()
  } catch (e: any) { asking.err = e?.message || 'Could not post.' } finally { asking.busy = false }
}

async function recommend() {
  rec.err = ''; rec.done = false
  const result = recForm.validate()
  if (!result.success) return
  rec.busy = true
  try {
    await $trpc.askLocals.recommend.mutate({ citySlug: props.citySlug, ...result.data })
    // CUJ: "Ask locals" — recommendation posted (auto 5-star review).
    useTrack().track('ask_locals_post', { city: props.citySlug, kind: 'recommend', target_type: rec.type })
    rec.done = true; rec.name = ''; rec.text = ''
  } catch (e: any) { rec.err = e?.message || 'Could not recommend.' } finally { rec.busy = false }
}
</script>

<template>
  <section class="mt-10" style="font-family: system-ui, sans-serif;">
    <div class="flex items-center gap-2">
      <MessagesSquare class="w-5 h-5" style="color:#a855f7;" />
      <h3 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Ask locals</h3>
    </div>
    <p class="mt-1 text-sm" style="color:#5b3a1d;">
      New{{ cityName ? ` to ${cityName}` : ' in town' }}? Ask who's good — locals recommend the best organizers &amp; venues.
    </p>

    <!-- Recommend (locals share picks) -->
    <div class="mt-4 flex flex-wrap gap-2">
      <button v-if="isSignedIn && !rec.open" type="button" class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider" style="background:#a855f714; color:#a855f7;" @click="rec.open = true">
        <ThumbsUp class="w-3.5 h-3.5" /> Recommend a place
      </button>
      <button v-if="isSignedIn && !asking.open" type="button" class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider" style="background:#dc262614; color:#dc2626;" @click="asking.open = true">
        Ask a question
      </button>
      <p v-if="!isSignedIn" class="text-xs italic" style="color:#9a5614;">Sign in to ask or recommend.</p>
    </div>

    <!-- Ask form -->
    <div v-if="asking.open" class="mt-3 rounded-2xl border p-4" style="border-color:#dc262633; background:white;">
      <textarea v-model="asking.text" rows="2" maxlength="280" placeholder="e.g. Where's the best bachata social on Fridays?" class="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style="background:#fbf5ea; border:1px solid #3b1f0d33; color:#3b1f0d;" v-bind="askForm.fieldAttrs('question', `${uid}-question-error`)" />
      <FieldError :id="`${uid}-question-error`" :message="askForm.errors.question" />
      <p v-if="asking.err" class="text-sm font-bold mt-1" style="color:#dc2626;">{{ asking.err }}</p>
      <div class="flex gap-2 mt-2">
        <button type="button" :disabled="asking.busy" class="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60" style="background:linear-gradient(135deg,#dc2626,#f97316);" @click="ask"><Send class="w-3.5 h-3.5" /> {{ asking.busy ? 'Posting…' : 'Post' }}</button>
        <button type="button" class="rounded-full px-3 py-2 text-xs font-bold" style="color:#9a5614;" @click="asking.open = false; askForm.reset()">Cancel</button>
      </div>
    </div>

    <!-- Recommend form -->
    <div v-if="rec.open" class="mt-3 rounded-2xl border p-4" style="border-color:#a855f733; background:white;">
      <div class="flex gap-2 mb-2">
        <button type="button" class="flex-1 h-9 rounded-lg text-xs font-bold" :style="rec.type==='organizer' ? 'background:#a855f7; color:white;' : 'background:#a855f714; color:#a855f7;'" @click="rec.type='organizer'">Organizer</button>
        <button type="button" class="flex-1 h-9 rounded-lg text-xs font-bold" :style="rec.type==='venue' ? 'background:#a855f7; color:white;' : 'background:#a855f714; color:#a855f7;'" @click="rec.type='venue'">Venue</button>
      </div>
      <input v-model="rec.name" type="text" :placeholder="rec.type==='organizer' ? 'Organizer name' : 'Venue name'" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33; color:#3b1f0d;" v-bind="recForm.fieldAttrs('targetName', `${uid}-rec-name-error`)">
      <FieldError :id="`${uid}-rec-name-error`" :message="recForm.errors.targetName" />
      <textarea v-model="rec.text" rows="2" maxlength="1000" placeholder="Why do you recommend them?" class="w-full mt-2 rounded-xl px-3 py-2 text-sm outline-none resize-none" style="background:#fbf5ea; border:1px solid #3b1f0d33; color:#3b1f0d;" v-bind="recForm.fieldAttrs('text', `${uid}-rec-text-error`)" />
      <FieldError :id="`${uid}-rec-text-error`" :message="recForm.errors.text" />
      <p v-if="rec.err" class="text-sm font-bold mt-1" style="color:#dc2626;">{{ rec.err }}</p>
      <p v-if="rec.done" class="text-sm font-bold mt-1" style="color:#16a34a;">Thanks — added as a 5★ recommendation.</p>
      <div class="flex gap-2 mt-2">
        <button type="button" :disabled="rec.busy" class="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60" style="background:#a855f7;" @click="recommend"><ThumbsUp class="w-3.5 h-3.5" /> {{ rec.busy ? 'Adding…' : 'Recommend' }}</button>
        <button type="button" class="rounded-full px-3 py-2 text-xs font-bold" style="color:#9a5614;" @click="rec.open = false; recForm.reset()">Close</button>
      </div>
    </div>

    <!-- Open questions -->
    <div v-if="loading" class="mt-4 text-sm" style="color:#9a5614;">Loading…</div>
    <ul v-else-if="questions.length" class="mt-5 space-y-2">
      <li v-for="q in questions" :key="q.id" class="rounded-xl border p-3" style="border-color:#3b1f0d1a; background:white;">
        <p class="text-sm" style="color:#3b1f0d;">{{ q.question }}</p>
      </li>
    </ul>
  </section>
</template>
