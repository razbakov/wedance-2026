<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
/**
 * One artist on the organiser's shortlist board: the same facts on every
 * card so two artists can be compared, plus a private tag and note.
 */
import { MapPin } from 'lucide-vue-next'
import { displayDanceStyle } from '#shared/dance-styles'
import { initialsOf } from '#shared/utils/initials'
import { shortlistDetailsSchema } from '#shared/validation'
import {
  SHORTLIST_OCCASIONS,
  SHORTLIST_OCCASION_LABEL,
  type ShortlistOccasion,
} from '#shared/utils/artistShortlist'

const props = defineProps<{
  artist: {
    username: string
    name: string
    photo: string | null
    city: string | null
    styles: string[]
    occasion: ShortlistOccasion | null
    note: string | null
  }
  busy: boolean
  notice: string
}>()

const emit = defineEmits<{
  save: [payload: { occasion: ShortlistOccasion | null; note: string }]
  remove: []
}>()

const state = reactive({
  occasion: (props.artist.occasion ?? '') as ShortlistOccasion | '',
  note: props.artist.note ?? '',
})

watch(() => [props.artist.occasion, props.artist.note] as const, () => {
  state.occasion = props.artist.occasion ?? ''
  state.note = props.artist.note ?? ''
})

const { errors, validate, fieldAttrs } = useFormValidation(shortlistDetailsSchema, state)
const fieldId = (name: string) => `shortlist-${props.artist.username.replace(/[^a-z0-9]+/gi, '-')}-${name}`
const initials = computed(() => initialsOf(props.artist.name))
const firstName = computed(() => props.artist.name.split(/\s+/)[0] || props.artist.name)

function onSubmit() {
  const result = validate()
  if (!result.success) return
  emit('save', {
    occasion: result.data.occasion === '' ? null : result.data.occasion,
    note: result.data.note,
  })
}
</script>

<template>
  <article class="flex min-w-0 flex-col rounded-2xl border bg-card p-4 font-sans">
    <div class="flex min-w-0 gap-3">
      <img
        v-if="artist.photo"
        :src="sizedImage(artist.photo, IMG.avatar)"
        :alt="artist.name"
        class="w-16 h-16 rounded-full object-cover object-top shrink-0"
      >
      <div v-else class="w-16 h-16 rounded-full shrink-0 grid place-items-center text-lg font-bold text-white" style="background:linear-gradient(135deg,var(--wd-red-600),var(--wd-orange-500));">
        {{ initials }}
      </div>
      <div class="min-w-0">
        <h2 class="font-display text-lg leading-tight text-foreground break-words">{{ artist.name }}</h2>
        <p class="text-xs text-muted-foreground break-all">@{{ artist.username }}</p>
        <p v-if="artist.city" class="mt-1 text-xs inline-flex items-center gap-1 text-muted-foreground">
          <MapPin class="w-3 h-3" aria-hidden="true" /> {{ artist.city }}
        </p>
      </div>
    </div>

    <ul v-if="artist.styles.length" class="mt-3 flex flex-wrap gap-1.5">
      <li v-for="style in artist.styles" :key="style" class="text-eyebrow font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-foreground">
        {{ displayDanceStyle(style) }}
      </li>
    </ul>

    <form class="mt-4 flex flex-col gap-3" novalidate @submit.prevent="onSubmit">
      <Field :id="fieldId('for')" label="For" :error="errors.occasion">
        <select
          :id="fieldId('for')"
          v-model="state.occasion"
          class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          v-bind="fieldAttrs('occasion', fieldId('for') + '-error')"
        >
          <option value="">No tag yet</option>
          <option v-for="occasion in SHORTLIST_OCCASIONS" :key="occasion" :value="occasion">
            {{ SHORTLIST_OCCASION_LABEL[occasion] }}
          </option>
        </select>
      </Field>
      <Field :id="fieldId('note')" label="Note" optional hint="Only you see this." :error="errors.note">
        <Textarea
          v-model="state.note"
          :rows="3"
          :maxlength="500"
          :resize="false"
          placeholder="Travel, budget, who to ask…"
          v-bind="fieldAttrs('note', fieldId('note') + '-error')"
        />
      </Field>
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="pill" size="pill-sm" :disabled="busy">{{ busy ? 'Saving…' : 'Save' }}</Button>
        <span v-if="notice" role="status" class="text-xs font-bold text-wd-green-700">{{ notice }}</span>
      </div>
    </form>

    <div class="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold">
      <NuxtLink :to="`/@${artist.username}/book`" class="text-primary hover:underline">Book {{ firstName }}</NuxtLink>
      <NuxtLink :to="`/@${artist.username}`" class="text-muted-foreground hover:text-foreground hover:underline">Profile</NuxtLink>
      <button type="button" class="ml-auto text-muted-foreground hover:text-foreground" :disabled="busy" @click="emit('remove')">
        Remove
      </button>
    </div>
  </article>
</template>
