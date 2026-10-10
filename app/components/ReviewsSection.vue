<script setup lang="ts">
/**
 * Reviews + ratings for any entity, keyed by (targetType, targetSlug).
 * Read for everyone; write for signed-in dancers. Client-side fetch (the app's
 * tRPC client is client-only). 2026 tropical style.
 */
import { Star } from 'lucide-vue-next'
import { ReviewSchema } from '#shared/validation'

const props = defineProps<{
  targetType: 'festival' | 'venue' | 'artist' | 'organizer' | 'event'
  targetSlug: string
  targetName?: string
  citySlug?: string
}>()

const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()

const data = ref<{ reviews: any[]; average: number; count: number }>({ reviews: [], average: 0, count: 0 })
const loading = ref(true)
const showForm = ref(false)
const form = reactive({ rating: 5, text: '' })
const submitting = ref(false)
const err = ref('')
const { errors, validate, reset: resetValidation, fieldAttrs } = useFormValidation(ReviewSchema, form)
const uid = useId()

async function load() {
  loading.value = true
  try {
    data.value = await $trpc.review.list.query({ targetType: props.targetType, targetSlug: props.targetSlug })
  } catch { /* leave empty */ } finally { loading.value = false }
}
onMounted(load)

async function submit() {
  err.value = ''
  const result = validate()
  if (!result.success) return
  submitting.value = true
  try {
    await $trpc.review.create.mutate({
      targetType: props.targetType,
      targetSlug: props.targetSlug,
      targetName: props.targetName,
      citySlug: props.citySlug,
      ...result.data,
    })
    showForm.value = false
    form.text = ''
    form.rating = 5
    await load()
  } catch (e: any) {
    err.value = e?.message || 'Could not submit your review.'
  } finally {
    submitting.value = false
  }
}

function fmtDate(d: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch { return '' }
}
</script>

<template>
  <section class="mt-10" style="font-family:var(--wd-font-sans);">
    <div class="flex items-center justify-between">
      <h3 class="text-2xl" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">Reviews</h3>
      <div v-if="data.count" class="flex items-center gap-1.5">
        <Star class="w-4 h-4" style="color:var(--wd-amber-500); fill:var(--wd-amber-500);" />
        <span class="font-bold" style="color:var(--wd-brown-900);">{{ data.average.toFixed(1) }}</span>
        <span class="text-xs" style="color:var(--wd-amber-600);">· {{ data.count }} review{{ data.count === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <!-- Write CTA / form -->
    <div v-if="isSignedIn" class="mt-4">
      <button
        v-if="!showForm"
        type="button"
        class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider"
        style="background:color-mix(in srgb, var(--wd-red-600) 7.8%, transparent); color:var(--wd-red-600);"
        @click="showForm = true"
      >Write a review</button>

      <div v-else class="rounded-2xl border p-4 mt-1" style="border-color:color-mix(in srgb, var(--wd-red-600) 20%, transparent); background:white;">
        <div class="flex items-center gap-1 mb-3" role="group" aria-label="Rating" v-bind="fieldAttrs('rating', `${uid}-rating-error`)">
          <button v-for="n in 5" :key="n" type="button" @click="form.rating = n" :aria-label="`${n} stars`">
            <Star class="w-6 h-6" :style="n <= form.rating ? 'color:var(--wd-amber-500); fill:var(--wd-amber-500);' : 'color:color-mix(in srgb, var(--wd-brown-900) 20%, transparent);'" />
          </button>
        </div>
        <FieldError :id="`${uid}-rating-error`" :message="errors.rating" class="-mt-2 mb-2" />
        <textarea v-model="form.text" rows="3" maxlength="1000" placeholder="What was it like?" class="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style="background:var(--wd-cream); border:1px solid color-mix(in srgb, var(--wd-brown-900) 20%, transparent); color:var(--wd-brown-900);" v-bind="fieldAttrs('text', `${uid}-text-error`)" />
        <FieldError :id="`${uid}-text-error`" :message="errors.text" />
        <p v-if="err" class="text-sm font-bold mt-2" style="color:var(--wd-red-600);">{{ err }}</p>
        <div class="flex gap-2 mt-3">
          <button type="button" :disabled="submitting" class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-60" style="background:linear-gradient(135deg,var(--wd-red-600),var(--wd-orange-500));" @click="submit">{{ submitting ? 'Posting…' : 'Post review' }}</button>
          <button type="button" class="rounded-full px-4 py-2 text-xs font-bold" style="color:var(--wd-amber-600);" @click="showForm = false; resetValidation()">Cancel</button>
        </div>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="mt-4 text-sm" style="color:var(--wd-amber-600);">Loading reviews…</div>
    <p v-else-if="!data.count" class="mt-4 text-sm italic" style="color:var(--wd-amber-600);">No reviews yet. Be the first.</p>
    <ul v-else class="mt-5 space-y-4">
      <li v-for="r in data.reviews" :key="r.id" class="rounded-2xl border p-4" style="border-color:color-mix(in srgb, var(--wd-brown-900) 10.2%, transparent); background:white;">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <NuxtLink v-if="r.reviewerUsername" :to="`/u/${r.reviewerUsername}`" class="text-sm font-bold hover:underline" style="color:var(--wd-brown-900);">{{ r.reviewerName || 'A dancer' }}</NuxtLink>
            <span v-else class="text-sm font-bold" style="color:var(--wd-brown-900);">{{ r.reviewerName || 'A dancer' }}</span>
            <span v-if="r.source === 'recommendation'" class="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5" style="background:color-mix(in srgb, var(--wd-green-600) 9.4%, transparent); color:var(--wd-green-600);">Recommended</span>
          </div>
          <div class="flex items-center gap-0.5">
            <Star v-for="n in 5" :key="n" class="w-3.5 h-3.5" :style="n <= r.rating ? 'color:var(--wd-amber-500); fill:var(--wd-amber-500);' : 'color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);'" />
          </div>
        </div>
        <p v-if="r.text" class="mt-2 text-sm leading-relaxed" style="color:var(--wd-brown-700);">{{ r.text }}</p>
        <div class="mt-1 text-[10px]" style="color:var(--wd-amber-600);">{{ fmtDate(r.createdAt) }}</div>
      </li>
    </ul>
  </section>
</template>
