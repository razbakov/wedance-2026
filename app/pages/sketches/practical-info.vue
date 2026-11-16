<script setup lang="ts">
/**
 * Sketch: what the hero says about the venue (RAZ-1009, step 1).
 *
 * Today the venue row opens `festival.practicalInfo`: one free-text list mixing the venue, the
 * nights and the ticket rules, hidden behind a toggle. The new row has no toggle: up to three
 * short hints under the address, each answering a question you have before leaving home
 * (how do I get there, where do I park, what do I bring). They come from the venue's page, so
 * every event there shows them; a venue with none shows just its name and address.
 * DDF's venue, meet & DANCE in Dachau, with its real details. Mock data, no API, no DB.
 */
import type { Component } from 'vue'
import { MapPin, CalendarDays, ChevronDown, ChevronRight, ArrowUpRight, ArrowRight, TrainFront, Car, Footprints, Shirt } from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Venue row sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'today' | 'new'
const VARIANTS: { id: Variant, name: string, idea: string }[] = [
  { id: 'today', name: 'Today', idea: 'The venue row opens DDF’s whole practical-info list: 12 lines about the venue, the nights and the tickets.' },
  { id: 'new', name: 'New', idea: 'The venue row expands into the venue’s own hints (Airbnb-style). "What’s inside" keeps one card per tab: the Schedule card counts sessions and parties, its line is each night’s dress code.' },
]

const variant = ref<Variant>('new')
const device = ref<'desktop' | 'mobile'>('desktop')
const filled = ref(true)
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)
// Closed, as on the event page: tap the venue to open its card.
const venueOpen = ref(false)
watch([variant, device, filled], () => { venueOpen.value = false })

const venue = {
  name: 'meet & DANCE – Die Tanzschule',
  address: 'Münchner Str. 87b, Dachau',
  mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=48.2442085,11.4478376',
  // OpenStreetMap embed: no key needed for the sketch.
  mapEmbed: 'https://www.openstreetmap.org/export/embed.html?bbox=11.4378%2C48.2392%2C11.4578%2C48.2492&layer=mapnik&marker=48.2442085%2C11.4478376',
}
// The venue's three hints: a title and one quiet line each.
const HINTS: { icon: Component, line?: { name: string, color: string }, text: string, detail: string, missing?: boolean }[] = [
  // The nearest stop leads with its line badge, in the line's own colour (Munich S2 = green).
  { icon: TrainFront, line: { name: 'S2', color: '#76B82A' }, text: 'Dachau Bahnhof', detail: '20 min walk or 5 min by bus' },
  { icon: Car, text: 'Garage next door', detail: 'Entrance by the Audi dealership' },
  { icon: Footprints, text: 'Indoor dance shoes only', detail: 'Bring a pair to change into' },
  // Something the venue doesn't have: Airbnb's unavailable amenity — struck through, icon crossed.
  { icon: Shirt, text: 'Cloakroom', detail: '', missing: true },
]
const hints = computed(() => filled.value ? HINTS : [])

// The Overview's "What's inside" cards (FestivalView `summaryCards`). New: "party nights" second,
// its line = each night's dress code. DDF's real counts; the dress codes from its practical info.
type Card = { key: string, title: string, line: string, link: string, isNew?: boolean }
const CARDS_TODAY: Card[] = [
  { key: 'lineup', title: '32 artists', line: 'George & Iva, Jeff Ghys, Chamalo & T-ZER and more', link: 'Line-up' },
  { key: 'schedule', title: '42 sessions', line: '3 days · 13 styles · pick yours', link: 'Schedule' },
  { key: 'tickets', title: 'Passes from €10', line: 'We suggest the one for your plan', link: 'Passes' },
]
// One card per tab: the Schedule card counts sessions and parties, and its line is the dress codes.
const CARDS_NEW: Card[] = [
  CARDS_TODAY[0]!,
  { key: 'schedule', title: '42 workshops, 2 parties', line: 'Dress code: Fri red-black or black-white · Sat King & Queen', link: 'Schedule', isNew: true },
  CARDS_TODAY[2]!,
]
const cards = computed(() => variant.value === 'new' ? CARDS_NEW : CARDS_TODAY)

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
        <span class="text-sm font-bold">Venue row · RAZ-1009</span>
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
        <div v-if="variant === 'new'" class="flex rounded-lg border border-border p-0.5 text-sm">
          <button
            v-for="f in [true, false]" :key="String(f)" type="button"
            class="rounded-md px-3 py-1 font-bold cursor-pointer"
            :class="filled === f ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :data-testid="f ? 'state-filled' : 'state-empty'"
            @click="filled = f"
          >{{ f ? 'Venue filled in' : 'Venue with no hints' }}</button>
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

            <!-- Today: the row toggles the whole free-text list -->
            <div v-if="variant === 'today'">
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
                <div v-if="venueOpen" class="mt-2 ml-6.5 max-w-xl rounded-xl border border-border bg-card/80 px-3 py-3 space-y-2.5" data-sketch-venue-panel>
                  <ul class="space-y-1.5 text-sm text-muted-foreground">
                    <li v-for="(line, i) in TODAY" :key="i">{{ line }}</li>
                  </ul>
                  <p class="flex flex-wrap gap-x-4 text-sm font-bold">
                    <a :href="venue.mapUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-secondary hover:underline">Directions <ArrowUpRight class="size-3.5" /></a>
                    <span class="inline-flex items-center gap-1 text-secondary">About the venue <ArrowRight class="size-3.5" /></span>
                  </p>
                </div>
              </dd>
            </div>

            <!-- New: the row still expands, but only into the venue's hints. With no hints there is
                 nothing to expand: no chevron, the address opens directions. -->
            <div v-else>
              <dd>
                <button
                  v-if="hints.length"
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
                    <span class="block text-muted-foreground">{{ venue.address }}</span>
                  </span>
                </button>
                <div v-else class="flex items-start gap-2.5" data-sketch-venue>
                  <MapPin class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span class="min-w-0">
                    <span class="block font-bold">{{ venue.name }}</span>
                    <a :href="venue.mapUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                      {{ venue.address }} <ArrowUpRight class="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  </span>
                </div>

                <!-- Airbnb's "Where you'll be": the map first, then one row per fact (big outline
                     icon, a title, a quiet line under it), plain underlined links, no colour. -->
                <div
                  v-if="hints.length && venueOpen"
                  class="mt-3 max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
                  :class="isMobile ? '' : 'ml-6.5'"
                  data-sketch-venue-panel
                >
                  <iframe
                    :src="venue.mapEmbed"
                    title="Map of the venue"
                    class="block h-44 w-full border-0"
                    loading="lazy"
                  />
                  <div class="px-5 py-4">
                    <div class="flex items-baseline justify-between gap-3">
                      <p class="font-semibold text-foreground">Dachau, Germany</p>
                      <a :href="venue.mapUrl" target="_blank" rel="noopener noreferrer" class="shrink-0 font-semibold text-foreground underline underline-offset-2" data-sketch-directions>Directions</a>
                    </div>
                    <ul class="mt-4 space-y-4 border-t border-border pt-4" data-sketch-hints>
                      <li v-for="h in hints" :key="h.text" class="flex items-start gap-4">
                        <span
                          v-if="h.line"
                          class="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none text-white"
                          :style="{ background: h.line.color }"
                          data-sketch-line
                        >{{ h.line.name }}</span>
                        <span v-else class="relative shrink-0" aria-hidden="true">
                          <component :is="h.icon" class="size-6" :class="h.missing ? 'text-muted-foreground' : 'text-foreground'" :stroke-width="1.5" />
                          <span v-if="h.missing" class="absolute left-1/2 top-1/2 h-[1.5px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-muted-foreground ring-2 ring-card" />
                        </span>
                        <span class="min-w-0">
                          <span v-if="h.missing" class="block font-semibold text-muted-foreground line-through"><span class="sr-only">No </span>{{ h.text }}</span>
                          <span v-else class="block font-semibold text-foreground">{{ h.text }}</span>
                          <span v-if="h.detail" class="block text-muted-foreground">{{ h.detail }}</span>
                        </span>
                      </li>
                    </ul>
                    <p class="mt-4 border-t border-border pt-4">
                      <span class="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-2 cursor-pointer">About the venue <ChevronRight class="size-4" aria-hidden="true" /></span>
                    </p>
                  </div>
                </div>
              </dd>
            </div>
          </dl>

          <!-- What's inside: a row of cards that opens each tab (as on the event page). -->
          <ul
            class="mt-5 gap-2"
            :class="isMobile ? 'flex overflow-x-auto pb-1 snap-x' : 'grid max-w-3xl'"
            :style="isMobile ? undefined : { gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }"
            data-sketch-cards
          >
            <li v-for="c in cards" :key="c.key" :class="isMobile ? 'w-44 shrink-0 snap-start' : ''">
              <button
                type="button"
                class="group flex h-full w-full flex-col gap-1 rounded-2xl border bg-card/80 px-4 py-3 text-left transition-colors hover:bg-card cursor-pointer"
                :class="c.isNew ? 'border-primary/50' : 'border-border hover:border-primary/40'"
                :data-sketch-card="c.key"
              >
                <span class="text-lg font-black leading-tight text-foreground font-display">{{ c.title }}</span>
                <span class="text-sm text-muted-foreground line-clamp-3">{{ c.line }}</span>
                <span class="mt-auto pt-2 inline-flex items-center gap-1 text-sm font-bold text-secondary">
                  {{ c.link }} <ArrowRight class="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
