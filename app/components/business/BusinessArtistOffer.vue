<script setup lang="ts">
/**
 * Song list, services and public pricing on an artist page (RAZ-1084).
 * Pricing is only what the artist writes — a blank note stays blank.
 *
 *   <BusinessArtistOffer ref="offerForm" v-model="offer" />
 *   const result = offerForm.validate(); if (!result.success) return
 */
import { Plus, Trash2 } from 'lucide-vue-next'
import { ARTIST_OFFER_LIMITS, ARTIST_SERVICES, type ArtistOfferForm, type ArtistServiceId } from '#shared/types/artistOffer'
import { ArtistOfferSchema } from '#shared/validation'

const model = defineModel<ArtistOfferForm>({ required: true })
const { errors, validate, fieldAttrs } = useFormValidation(ArtistOfferSchema, model)

function toggle(id: ArtistServiceId, on: boolean) {
  const has = model.value.services.includes(id)
  if (on && !has) model.value.services = [...model.value.services, id]
  if (!on && has) model.value.services = model.value.services.filter(s => s !== id)
}
function addSong() {
  if (model.value.songs.length >= ARTIST_OFFER_LIMITS.songs) return
  model.value.songs.push({ title: '', by: '', url: '' })
}
function removeSong(i: number) {
  model.value.songs.splice(i, 1)
}

defineExpose({ validate })
</script>

<template>
  <section class="rounded-2xl border bg-card p-5 shadow-wd-card">
    <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Song list, services and pricing</h2>
    <p class="mt-1 text-sm text-muted-foreground">What organizers see when they plan a corporate event, a birthday or a wedding.</p>

    <fieldset class="mt-4">
      <legend class="text-sm font-bold">Services</legend>
      <div class="mt-1 flex flex-col">
        <Checkbox
          v-for="s in ARTIST_SERVICES"
          :key="s.id"
          :model-value="model.services.includes(s.id)"
          @update:model-value="toggle(s.id, !!$event)"
        >
          {{ s.label }}
        </Checkbox>
      </div>
    </fieldset>

    <Field
      id="artist-pricing"
      class="mt-2"
      label="Pricing"
      optional
      hint="In your own words. Leave this blank if you don’t publish a price — WeDance won’t add one."
      :error="errors.pricing"
    >
      <Textarea v-model="model.pricing" rows="3" v-bind="fieldAttrs('pricing', 'artist-pricing-error')" />
    </Field>

    <div class="mt-4">
      <p class="text-sm font-bold">Song list</p>
      <p class="text-xs text-muted-foreground">Songs organizers can use for a playlist. A title is enough; a link helps them find it.</p>
      <ul v-if="model.songs.length" class="mt-3 space-y-3">
        <li v-for="(song, i) in model.songs" :key="i" class="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-start">
          <Field :id="`song-${i}-title`" label="Title" :error="errors[`songs.${i}.title`]">
            <Input v-model="song.title" v-bind="fieldAttrs(`songs.${i}.title`, `song-${i}-title-error`)" />
          </Field>
          <Field :id="`song-${i}-by`" label="By" optional :error="errors[`songs.${i}.by`]">
            <Input v-model="song.by" placeholder="Original artist" v-bind="fieldAttrs(`songs.${i}.by`, `song-${i}-by-error`)" />
          </Field>
          <Field :id="`song-${i}-url`" label="Link" optional :error="errors[`songs.${i}.url`]">
            <Input v-model="song.url" type="url" placeholder="https://" v-bind="fieldAttrs(`songs.${i}.url`, `song-${i}-url-error`)" />
          </Field>
          <Button type="button" size="icon-sm" variant="ghost" class="sm:mt-7" :aria-label="`Remove ${song.title || 'song'}`" @click="removeSong(i)">
            <Trash2 />
          </Button>
        </li>
      </ul>
      <Button type="button" variant="outline-pill" size="pill-sm" class="mt-3" :disabled="model.songs.length >= ARTIST_OFFER_LIMITS.songs" @click="addSong">
        <Plus /> Add a song
      </Button>
    </div>
  </section>
</template>
