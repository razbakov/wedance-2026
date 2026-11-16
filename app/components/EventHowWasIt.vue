<script setup lang="ts">
/**
 * "How was it?" in the event hero (RAZ-1011, sketch /sketches/event-review): after the night,
 * for a dancer who went, in place of the sign-up button. Tap a star, add a line if you like,
 * post → the review is up and the page opens its Reviews tab. The morning-after email's star
 * links land here with the rating picked (`initialRating`); signed out, the post asks to sign
 * in first. `missedToken` (the email's "didn't make it") shows a one-tap "don't ask again".
 */
import { Check, Star } from 'lucide-vue-next'
import { ratingWord } from '#shared/utils/eventReview'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'

const props = defineProps<{
  eventId: string
  eventName: string
  /** "Thursday" — the night, as the card names it. */
  weekday: string
  /** null = signed out (asked to sign in before posting). */
  mine: { rating: number; text: string | null } | null
  signedIn: boolean
  initialRating?: number | null
  /** From the email: the rating came from a star link. */
  fromEmail?: boolean
  missedToken?: string | null
}>()
const emit = defineEmits<{ posted: []; reviews: []; signIn: []; missed: [] }>()

const { $trpc } = useNuxtApp()
const rating = ref(props.mine?.rating ?? props.initialRating ?? 0)
const hover = ref(0)
const text = ref(props.mine?.text ?? '')
const editing = ref(!props.mine)
const posting = ref(false)
const err = ref('')
watch(() => props.mine, (m) => { if (m && !posting.value) { rating.value = m.rating; text.value = m.text ?? ''; editing.value = false } })

const missedState = ref<'ask' | 'saving' | 'done'>('ask')

async function post() {
  err.value = ''
  if (!rating.value) { err.value = 'Pick a rating.'; return }
  if (!props.signedIn) { emit('signIn'); return }
  posting.value = true
  try {
    await $trpc.review.create.mutate({ targetType: 'event', targetSlug: props.eventId, targetName: props.eventName, rating: rating.value, text: text.value.trim() || undefined })
    useTrack().track('review_submitted', { target_type: 'event', target: props.eventId, rating: rating.value, has_text: !!text.value.trim(), updated: !!props.mine, via: props.fromEmail ? 'email' : 'page', surface: 'event_hero' })
    editing.value = false
    emit('posted')
  } catch (e: any) {
    err.value = e?.message || 'Could not post your review.'
  } finally {
    posting.value = false
  }
}

async function saidMissed() {
  if (!props.missedToken) return
  missedState.value = 'saving'
  try {
    await $trpc.review.missed.mutate({ token: props.missedToken })
    useTrack().track('review_ask_missed', { event_id: props.eventId, signed_in: props.signedIn })
    missedState.value = 'done'
    emit('missed')
  } catch (e: any) {
    err.value = e?.message || 'Could not save that.'
    missedState.value = 'ask'
  }
}
</script>

<template>
  <div class="mt-4 max-w-xl rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 font-sans" data-how-was-it>
    <!-- From the email's "Didn't make it? Tell us" -->
    <template v-if="missedToken">
      <p v-if="missedState === 'done'" class="flex items-center gap-2 font-bold text-wd-green-700" role="status" data-review-missed-done><Check class="size-4" aria-hidden="true" /> Got it — we won’t ask about this one.</p>
      <template v-else>
        <p class="font-bold">Didn’t make it to {{ weekday }}?</p>
        <p class="text-sm text-muted-foreground">We’ll stop asking how it was.</p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="pill" size="pill-sm" :loading="missedState === 'saving'" data-review-missed @click="saidMissed">Don’t ask me again</Button>
        </div>
        <p v-if="err" class="mt-2 text-sm font-bold text-destructive">{{ err }}</p>
      </template>
    </template>

    <!-- Posted (or already reviewed) -->
    <template v-else-if="!editing && mine">
      <p class="flex flex-wrap items-center gap-2 font-bold text-wd-green-700" role="status" data-review-posted>
        <Check class="size-4" aria-hidden="true" /> Thanks — your {{ mine.rating }}★ review is up.
        <span class="ml-auto flex gap-3 text-sm">
          <button type="button" class="font-bold text-primary hover:underline cursor-pointer" @click="$emit('reviews')">See it</button>
          <button type="button" class="font-bold text-muted-foreground hover:underline cursor-pointer" @click="editing = true">Change</button>
        </span>
      </p>
    </template>

    <template v-else>
      <p class="font-bold">You were here on {{ weekday }}. How was it?</p>
      <div class="mt-2 flex items-center gap-1" role="group" aria-label="Your rating" @mouseleave="hover = 0">
        <button
          v-for="n in 5" :key="n" type="button" class="cursor-pointer" :aria-label="`${n} star${n === 1 ? '' : 's'}`" :aria-pressed="n <= rating"
          :data-rate="n" @mouseenter="hover = n" @focus="hover = n" @blur="hover = 0" @click="rating = n; err = ''"
        >
          <Star class="size-8 transition-transform hover:scale-110" :class="n <= (hover || rating) ? 'text-wd-amber-500 fill-wd-amber-500' : 'text-border'" aria-hidden="true" />
        </button>
        <span class="ml-2 text-sm font-bold text-secondary">{{ ratingWord(hover || rating) }}</span>
      </div>
      <template v-if="rating">
        <Textarea v-model="text" :rows="2" :resize="false" maxlength="1000" placeholder="What made the night? (optional)" aria-label="Your review (optional)" class="mt-3" />
        <div class="mt-2 flex flex-wrap items-center gap-3">
          <Button variant="pill" size="pill-sm" :loading="posting" data-review-post @click="post">{{ signedIn ? (mine ? 'Update review' : 'Post review') : 'Sign in to post' }}</Button>
          <button v-if="mine" type="button" class="text-sm text-muted-foreground hover:underline cursor-pointer" @click="editing = false; rating = mine.rating; text = mine.text ?? ''">Cancel</button>
        </div>
      </template>
      <p v-if="err" class="mt-2 text-sm font-bold text-destructive">{{ err }}</p>
    </template>
  </div>
</template>
