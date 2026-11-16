<script setup lang="ts">
/**
 * Sketch: the venue panel (RAZ-1009, step 1).
 *
 * Today the venue row in an event's hero opens `festival.practicalInfo` — one free-text list
 * mixing the venue, the nights and the ticket rules. Start small: the panel shows only what
 * is true about the venue itself, for every event held there (filled in once, on the venue's
 * page). DDF's venue, meet & DANCE in Dachau, with its real details. Mock data, no API, no DB.
 */
import { MapPin, CalendarDays, ChevronDown, ArrowUpRight, ArrowRight, Layers, Train, Car, Footprints } from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Venue panel sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'today' | 'new'
const VARIANTS: { id: Variant, name: string, idea: string }[] = [
  { id: 'today', name: 'Today', idea: 'The venue row opens DDF’s whole practical-info list: 12 lines about the venue, the nights and the tickets.' },
  { id: 'new', name: 'Venue only', idea: 'The venue row opens only the venue: rooms, getting there, parking, house rules. Filled in once on the venue’s page, so every event there shows it.' },
]

const variant = ref<Variant>('new')
const device = ref<'desktop' | 'mobile'>('desktop')
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)
const venueOpen = ref(true)
watch([variant, device], () => { venueOpen.value = true })

const venue = {
  name: 'meet & DANCE – Die Tanzschule',
  address: 'Münchner Str. 87b, 85221 Dachau',
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=48.2442085,11.4478376',
  rooms: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 5', 'Bar'],
  transit: 'S2 to Dachau Bahnhof (about 25 min from Munich, every 20 min)',
  lastMile: 'Then bus or taxi 5–10 min, or walk 20–25 min',
  parking: 'Garage next door, entrance between the studio and the Audi dealership',
  rules: ['Indoor dance shoes only', 'No cloakroom'],
}

// DDF's practicalInfo as it is stored today (the poster links shortened).
const TODAY = [
  'Venue: meet & DANCE – Die Tanzschule, Münchner Str. 87b, 85221 Dachau (Floors 1, 2, 3, 5 and a bar area)',
  'From Munich: S2 towards Dachau / Petershausen (about every 20 min) to Dachau Bahnhof, then 5–10 min by bus or taxi, or a 20–25 min walk',
  'Parking garage next to the dance school (entrance between the studio and the Audi dealership)',
  'Hotel: FreshSuites & Bar Dachau, Karwendelstraße 16 (freshsuites.de)',
  'Buffet in the bar area: Friday from about 19:00, Saturday from about 16:30',
  'Dress code: Friday red-black or black-white · Saturday King & Queen, "elegant in gold & black"',
  'Indoor dance shoes only. There is no cloakroom.',
  'Single follower tickets are sold out to keep the balance; couple passes and masterclasses are still on sale. Women who dance as leaders can contact the organisers.',
  'Sunday ends at 17:00. No farewell party this year.',
  'Tickets are non-refundable but can be transferred through the organisers. About 2.5% service fee on top.',
  'Contact: ddf.festival@gmail.com',
  'Schedule posters: Friday (picture) · Saturday (picture) · Sunday (picture)',
]
</script>

<template>
  <div class="min-h-screen bg-muted/40 font-sans">
    <!-- Control bar (not part of the design) -->
    <div class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur px-4 py-2.5">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2">
        <span class="text-sm font-bold">Venue panel · RAZ-1009</span>
        <div class="flex rounded-lg border border-border p-0.5 text-sm">
          <button
            v-for="v in VARIANTS" :key="v.id" type="button"
            class="rounded-md px-3 py-1 font-bold cursor-pointer"
            :class="variant === v.id ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :data-testid="`variant-${v.id}`"
            @click="variant = v.id"
          >{{ v.name }}</button>
        </div>
        <div class="flex rounded-lg border border-border p-0.5 text-sm">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button"
            class="rounded-md px-3 py-1 font-bold capitalize cursor-pointer"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="device = d"
          >{{ d }}</button>
        </div>
        <p class="w-full text-xs text-muted-foreground">{{ current.idea }}</p>
      </div>
    </div>

    <div class="flex justify-center px-4 py-6">
      <div
        :class="isMobile
          ? 'w-[390px] overflow-y-auto rounded-[2rem] border-8 border-foreground bg-background shadow-xl'
          : 'w-full max-w-5xl rounded-2xl border border-border bg-background shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 160px))' } : undefined"
      >
        <!-- The hero's facts, as on the event page -->
        <div :class="isMobile ? 'px-4 py-6' : 'px-8 py-10'">
          <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lionsnight presents</p>
          <h1 class="mt-1 font-display font-black leading-tight" :class="isMobile ? 'text-3xl' : 'text-5xl'">
            DDF – Deutschland Dance Festival 2026
          </h1>

          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex items-start gap-2.5">
              <CalendarDays class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
              <dd class="font-bold">Fri 16 – Sun 18 Oct 2026</dd>
            </div>
            <div>
              <dd>
                <button
                  type="button"
                  class="group flex w-full items-start gap-2.5 text-left cursor-pointer"
                  :aria-expanded="venueOpen"
                  data-sketch-venue
                  @click="venueOpen = !venueOpen"
                >
                  <MapPin class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span class="min-w-0">
                    <span class="flex items-center gap-1 font-bold group-hover:underline">
                      {{ venue.name }}
                      <ChevronDown class="size-4 shrink-0 text-secondary transition-transform" :class="venueOpen ? 'rotate-180' : ''" aria-hidden="true" />
                    </span>
                    <span class="block text-sm text-muted-foreground">{{ venue.address }}</span>
                  </span>
                </button>

                <!-- Today: the whole free-text list -->
                <div v-if="venueOpen && variant === 'today'" class="mt-2 ml-6.5 max-w-xl rounded-xl border border-border bg-card/80 px-3 py-3 space-y-2.5" data-sketch-venue-panel>
                  <ul class="space-y-1.5 text-sm text-muted-foreground">
                    <li v-for="(line, i) in TODAY" :key="i">{{ line }}</li>
                  </ul>
                  <p class="flex flex-wrap gap-x-4 text-sm font-bold">
                    <a :href="venue.mapUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-secondary hover:underline">Directions <ArrowUpRight class="size-3.5" /></a>
                    <span class="inline-flex items-center gap-1 text-secondary">About the venue <ArrowRight class="size-3.5" /></span>
                  </p>
                </div>

                <!-- New: the venue only -->
                <div v-if="venueOpen && variant === 'new'" class="mt-2 ml-6.5 max-w-xl rounded-xl border border-border bg-card/80 px-3 py-3 space-y-3 text-sm" data-sketch-venue-panel>
                  <div class="flex items-start gap-2.5">
                    <Layers class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="r in venue.rooms" :key="r" class="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{{ r }}</span>
                    </div>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <Train class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p>
                      <span class="font-bold">{{ venue.transit }}</span>
                      <span class="block text-muted-foreground">{{ venue.lastMile }}</span>
                    </p>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <Car class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p>{{ venue.parking }}</p>
                  </div>
                  <div class="flex items-start gap-2.5">
                    <Footprints class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p>{{ venue.rules.join(' · ') }}</p>
                  </div>
                  <p class="flex flex-wrap gap-x-4 font-bold">
                    <a :href="venue.mapUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-secondary hover:underline">Directions <ArrowUpRight class="size-3.5" /></a>
                    <span class="inline-flex items-center gap-1 text-secondary">About the venue <ArrowRight class="size-3.5" /></span>
                  </p>
                </div>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>
