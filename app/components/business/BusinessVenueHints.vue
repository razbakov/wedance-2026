<script setup lang="ts">
/**
 * "Getting there & house rules" (RAZ-1012): the venue's own hints, shown in the venue row of every
 * event held there — nearest stop, parking, indoor dance shoes only, cloakroom. Each shows only when
 * filled in. Used on the venue's Business page and in an event's venue step (BusinessEventVenueHints).
 *
 *   <BusinessVenueHints v-model="form" id-prefix="venue" />
 */
import { TrainFront, Car, Footprints } from 'lucide-vue-next'
import { VENUE_INFO_LIMITS as L, NEUTRAL_LINE_COLOR, lineBadgeInk, type VenueInfoForm } from '#shared/types/venueInfo'

const model = defineModel<VenueInfoForm>({ required: true })
const props = defineProps({ idPrefix: { type: String, default: 'venue-info' } })
const id = (k: string) => `${props.idPrefix}-${k}`

const cloakroomOptions = [
  { label: 'Not set', value: '' },
  { label: 'Yes, there is one', value: 'yes' },
  { label: 'No cloakroom', value: 'no' },
]
// The colour picker needs a value; an empty colour = the neutral badge.
const pickerColor = computed(() => /^#[0-9a-f]{6}$/i.test(model.value.color) ? model.value.color : NEUTRAL_LINE_COLOR)
</script>

<template>
  <div class="grid gap-5" data-venue-hints-form>
    <fieldset class="grid gap-3">
      <legend class="flex items-center gap-1.5 text-sm font-bold"><TrainFront class="size-4 text-muted-foreground" aria-hidden="true" /> Nearest stop</legend>
      <div class="grid gap-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
        <Field :id="id('line')" label="Line" optional>
          <div class="flex items-center gap-2">
            <Input v-model="model.line" :maxlength="L.line" placeholder="S2" />
            <label v-if="model.line.trim()" class="relative shrink-0 cursor-pointer" :title="'Line colour'">
              <span class="sr-only">Line colour</span>
              <span
                class="flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
                :class="model.color ? '' : 'bg-foreground text-background'"
                :style="model.color ? { background: model.color, color: lineBadgeInk(model.color) } : undefined"
                aria-hidden="true"
              >{{ model.line.trim().slice(0, 4) }}</span>
              <input type="color" class="absolute inset-0 size-full cursor-pointer opacity-0" :value="pickerColor" :aria-label="`Colour of line ${model.line.trim()}`" @input="model.color = ($event.target as HTMLInputElement).value">
            </label>
          </div>
        </Field>
        <Field :id="id('stop')" label="Stop" optional>
          <Input v-model="model.stop" :maxlength="L.stop" placeholder="Dachau Bahnhof" />
        </Field>
      </div>
      <button v-if="model.color" type="button" class="justify-self-start text-xs font-bold text-secondary hover:underline" @click="model.color = ''">No line colour</button>
      <Field :id="id('transit-detail')" label="From the stop" optional>
        <Input v-model="model.transitDetail" :maxlength="L.detail" placeholder="20 min walk or 5 min by bus" />
      </Field>
    </fieldset>

    <fieldset class="grid gap-3 sm:grid-cols-2">
      <legend class="mb-3 flex items-center gap-1.5 text-sm font-bold"><Car class="size-4 text-muted-foreground" aria-hidden="true" /> Parking</legend>
      <Field :id="id('parking')" label="Where to park" optional>
        <Input v-model="model.parking" :maxlength="L.text" placeholder="Garage next door" />
      </Field>
      <Field :id="id('parking-detail')" label="Detail" optional>
        <Input v-model="model.parkingDetail" :maxlength="L.detail" placeholder="Entrance by the Audi dealership" />
      </Field>
    </fieldset>

    <div class="grid gap-3 sm:grid-cols-2">
      <label class="flex items-start gap-2 text-sm">
        <Checkbox v-model="model.indoorShoesOnly" class="mt-0.5" />
        <span><span class="flex items-center gap-1.5 font-bold"><Footprints class="size-4 text-muted-foreground" aria-hidden="true" /> Indoor dance shoes only</span>
          <span class="block text-muted-foreground">Dancers bring a pair to change into.</span></span>
      </label>
      <Field :id="id('cloakroom')" label="Cloakroom" optional hint="“No” is shown, so people leave big coats at home.">
        <Select v-model="model.cloakroom" :options="cloakroomOptions" />
      </Field>
    </div>
  </div>
</template>
