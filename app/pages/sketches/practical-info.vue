<script setup lang="ts">
/**
 * Sketch: where an event's practical info belongs (RAZ-1009).
 *
 * Today it is one free-text list (`festival.practicalInfo`) that opens from the venue row in
 * the hero. For DDF that is 12 lines mixing three kinds of information: the venue (floors,
 * getting there, parking, hotel), the nights (buffet, dress code, shoes, cloakroom, when
 * Sunday ends) and booking rules (sold-out follower tickets, refunds, fee, contact, posters).
 *
 * Four placements, clickable, with DDF's real text. Mock data only, no API, no DB.
 * In every variant the venue panel holds only venue things.
 */
import { MapPin, CalendarDays, ChevronDown, ArrowUpRight, ArrowRight, Train, Bus, Footprints, Car, BedDouble, Utensils, Shirt, Ban, Mail, Clock, Layers, Ticket, Info, Check, Image as ImageIcon, Music, GraduationCap, Sparkles, X } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Practical info sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D'
type Tab = 'overview' | 'schedule' | 'passes'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Where it’s used',
    idea: 'The table from the ticket: each piece sits where you need it. Venue panel = floors, route, parking, hotel. Schedule = posters on top, buffet as timeline items, dress code on each party, "Ends 17:00". Passes = "Sold out" on the follower pass + one line of fine print. Overview = "Good to know" tiles (shoes, cloakroom). Contact next to "Lionsnight presents".',
    good: 'Every fact shows up at the moment it matters: the fee when you pick a pass, the buffet when you plan the evening. Nothing reads as a wall of text.',
    cost: 'Spread over four places: someone who wants "everything I need to know" has to open each tab. Needs the most structured fields.',
  },
  {
    id: 'B',
    name: 'Know before you go',
    idea: 'One infographic card on Overview, three columns: Getting there · On the nights · Your ticket. Icons, swatches and times instead of sentences. The venue panel keeps only the venue. Schedule and Passes stay as they are.',
    good: 'One place to read it all, still structured. Easy to fill in: the form mirrors the card. Easy to screenshot and send to a friend.',
    cost: 'The fee and the sold-out followers aren’t on the Passes tab, where people decide. The buffet isn’t in the timeline.',
  },
  {
    id: 'C',
    name: 'Day by day',
    idea: 'The info told along the weekend, as you live it: Before (tickets, contact) → Getting there → Friday → Saturday → Sunday. Each day says when to arrive, what to wear, when food is, when it ends. Schedule days open with the same day card.',
    good: 'Matches how a dancer thinks: "what do I wear on Friday, when do I eat, when is my train home?" Dress code and food never feel like rules.',
    cost: 'Day-less facts (shoes, cloakroom, refunds) need a "Before" step that reads like a list again. A one-night event has just one day — the timeline is overkill there.',
  },
  {
    id: 'D',
    name: 'Recommended: A + day cards',
    idea: 'A’s placement, but in the Schedule each day opens with C’s day card (dress swatches · food · ends) instead of tags on single parties. Overview "Good to know" adds the dress codes and a short "Getting there" line, so the main things are readable at a glance before you dig in.',
    good: 'Each fact where it’s used, plus a glanceable Overview. Day cards hold up for a one-night event (one card) and a festival (one per day).',
    cost: 'Dress code and food show twice (Overview + Schedule). Same structured fields as A.',
  },
]

const variant = ref<Variant>('D')
const device = ref<'desktop' | 'mobile'>('desktop')
const tab = ref<Tab>('overview')
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)
const venueOpen = ref(true)
const posterOpen = ref<string | null>(null)
watch([variant, device], () => { venueOpen.value = true; posterOpen.value = null; tab.value = 'overview' })

// ── DDF, real data (event ba45acd1…, practicalInfo split by hand — no data changed) ──
const ACCENT = '#c9a227'
const LOGO = 'https://res.cloudinary.com/djumxevsm/image/upload/e_trim/c_fit,w_280,h_280/c_mpad,w_400,h_400,b_rgb:1a1410/v1792170298/wedance/ddf-2026/ddf-logo.png'
const COVER = 'https://res.cloudinary.com/djumxevsm/image/upload/v1792170301/wedance/ddf-2026/schedule-saturday.png'
const venue = {
  name: 'meet & DANCE – Die Tanzschule',
  address: 'Münchner Str. 87b, 85221 Dachau',
  floors: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 5', 'Bar area'],
  route: [
    { icon: Train, label: 'S2 from Munich', note: 'towards Dachau / Petershausen, every 20 min', mins: '≈ 25 min' },
    { icon: MapPin, label: 'Dachau Bahnhof', note: '', mins: '' },
    { icon: Bus, label: 'Bus or taxi', note: '', mins: '5–10 min' },
  ],
  walk: '20–25 min walk from the station',
  parking: 'Parking garage next to the school — entrance between the studio and the Audi dealership',
  hotel: { name: 'FreshSuites & Bar Dachau', address: 'Karwendelstraße 16', site: 'freshsuites.de' },
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=meet%20%26%20DANCE%2C%20M%C3%BCnchner%20Str.%2087b%2C%2085221%20Dachau',
}
const contact = 'ddf.festival@gmail.com'
const posters = [
  { day: 'Friday', url: 'https://res.cloudinary.com/djumxevsm/image/upload/v1792170303/wedance/ddf-2026/schedule-friday.png' },
  { day: 'Saturday', url: 'https://res.cloudinary.com/djumxevsm/image/upload/v1792170301/wedance/ddf-2026/schedule-saturday.png' },
  { day: 'Sunday', url: 'https://res.cloudinary.com/djumxevsm/image/upload/v1792170304/wedance/ddf-2026/schedule-sunday.png' },
]
type Swatch = { colors: string[], label: string }
type Day = { key: string, day: string, date: string, starts: string, ends: string, endsNote?: string, food?: string, dress?: { theme?: string, options: Swatch[] } }
const days: Day[] = [
  { key: 'fri', day: 'Friday', date: 'Oct 16', starts: '18:30', ends: '04:00', food: 'from ~19:00', dress: { options: [{ colors: ['#b91c1c', '#111'], label: 'red-black' }, { colors: ['#111', '#fff'], label: 'black-white' }] } },
  { key: 'sat', day: 'Saturday', date: 'Oct 17', starts: '14:00', ends: '05:00', food: 'from ~16:30', dress: { theme: 'King & Queen', options: [{ colors: ['#c9a227', '#111'], label: 'elegant in gold & black' }] } },
  { key: 'sun', day: 'Sunday', date: 'Oct 18', starts: '15:00', ends: '17:00', endsNote: 'No farewell party this year' },
]
type Item = { time: string, end?: string, title: string, who?: string, room: string, kind: 'workshop' | 'party' | 'food' | 'end' }
const schedule: Record<string, Item[]> = {
  fri: [
    { time: '18:30', title: 'Urban Kiz · Partnerwork', who: 'Fajul & Agnes', room: 'Floor 1', kind: 'workshop' },
    { time: '18:30', title: 'Kizomba Fusion · Technical Steps', who: 'Dadie & Eva', room: 'Floor 2', kind: 'workshop' },
    { time: '19:00', title: 'Buffet', room: 'Bar area', kind: 'food' },
    { time: '19:30', title: 'Urban Kiz · Groove Dynamics', who: 'Sanni & Inna', room: 'Floor 1', kind: 'workshop' },
    { time: '22:30', end: '04:00', title: 'Bachata Party', who: 'DJ Norb, DJ Tomquez, DJ Rob', room: 'Floor 2', kind: 'party' },
    { time: '22:30', end: '04:00', title: 'Salsa Party', who: 'DJ Suzy Q, DJ Papi, DJ Christiano Flow', room: 'Floor 5', kind: 'party' },
    { time: '23:30', end: '04:00', title: 'Urbankiz & Kizomba Party', who: 'DJ Remcy, DJ Charley', room: 'Floor 1 + 3', kind: 'party' },
  ],
  sat: [
    { time: '14:00', title: 'Urban Kiz · Partnerwork', who: 'Donald & Tabea', room: 'Floor 3', kind: 'workshop' },
    { time: '15:00', end: '19:00', title: 'Afternoon Social — Kizomba & Urbankiz', who: 'DJ Roberto, DJ Elmos, DJ Sorin', room: 'Bar area', kind: 'party' },
    { time: '15:00', title: 'Masterclass: Musicality', who: 'Asia', room: 'Floor 5', kind: 'workshop' },
    { time: '16:15', title: 'Masterclass: Master your Expression', who: 'Chamalo & T-ZER', room: 'Floor 5', kind: 'workshop' },
    { time: '16:30', title: 'Buffet', room: 'Bar area', kind: 'food' },
    { time: '21:00', end: '05:00', title: 'Bachata Party', who: 'DJ Tomquez, DJ Norb, DJ Rob, DJ Papi', room: 'Floor 2', kind: 'party' },
    { time: '21:00', end: '05:00', title: 'Salsa Party', who: 'DJ Suzy Q, DJ Papi, DJ Christiano Flow', room: 'Floor 5', kind: 'party' },
    { time: '23:00', end: '05:00', title: 'Urbankiz & Kizomba Party', who: 'DJ Fofojah, DJ Remcy, DJ Charley', room: 'Floor 1 + 3', kind: 'party' },
  ],
  sun: [
    { time: '15:00', title: 'Kizomba Fusion · Turns & Tricks', who: 'Joel & Eva', room: 'Floor 1', kind: 'workshop' },
    { time: '17:00', title: 'Ends', room: '', kind: 'end' },
  ],
}
const scheduleDay = ref('fri')
watch([variant, device], () => { scheduleDay.value = 'fri' })
const passes = [
  { name: 'Full Pass — Leader', price: 135, note: 'All workshops, socials and parties, Friday to Sunday' },
  { name: 'Full Pass — Follower', price: null, note: 'Sold out to keep the balance', soldOut: true, hint: 'Women who dance as leaders: write to the organisers.' },
  { name: 'Full Pass — Couple', price: 240, note: 'All workshops, socials and parties for two' },
  { name: 'Saturday Day Pass — Leader', price: 100, note: 'Workshops, social and party on Saturday' },
  { name: 'Party Pass Fri + Sat — Leader', price: 50, note: 'Both parties, no workshops, no social' },
  { name: 'Masterclass: Asia — Musicality', price: 25, note: '1 hour, Saturday' },
]
const finePrint = 'Non-refundable · transferable through the organisers · ≈ 2.5% service fee on top'
const goodToKnow = [
  { icon: Footprints, title: 'Indoor dance shoes only', note: 'Bring a pair to change into' },
  { icon: Ban, title: 'No cloakroom', note: 'Travel light' },
]
const TABS: { id: Tab, label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'schedule', label: 'Schedule' }, { id: 'passes', label: 'Passes' }]
const itemIcon = (k: Item['kind']) => k === 'party' ? Music : k === 'food' ? Utensils : k === 'end' ? Clock : GraduationCap
const dayOf = (key: string) => days.find(d => d.key === key)!
// A: dress code rides on each night's main party (the first party of the evening).
const dressOn = (dayKey: string, it: Item) => it.kind === 'party' && !it.title.startsWith('Afternoon') ? dayOf(dayKey).dress : undefined
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Practical info</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background">
          <button
            v-for="v in VARIANTS" :key="v.id" type="button"
            class="px-3 h-8 rounded-full text-sm font-bold transition-colors"
            :class="variant === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            :data-testid="`variant-${v.id}`"
            @click="variant = v.id"
          >{{ v.id }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button"
            class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="device = d"
          >{{ d }}</button>
        </div>
        <a href="/events/ba45acd1-8aea-4afc-8156-40ca39d7702f" target="_blank" class="text-xs font-semibold text-secondary hover:underline">Today’s page ↗</a>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 text-xs leading-relaxed">
        <span class="font-bold">{{ current.id }} · {{ current.name }}.</span>
        <span class="text-muted-foreground"> {{ current.idea }}</span>
        <span class="text-wd-green-700"> Good: {{ current.good }}</span>
        <span class="text-wd-red-800"> Cost: {{ current.cost }}</span>
      </div>
    </div>

    <div class="py-6 px-4">
      <div
        class="relative mx-auto bg-background overflow-hidden"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-4xl rounded-2xl border border-border shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '720px' }"
      >
        <div class="h-full overflow-y-auto" data-testid="sketch-body">
          <!-- ═════════════ Hero ═════════════ -->
          <section class="px-4 pt-6 pb-6" :class="isMobile ? '' : 'px-8 pt-10'">
            <div class="grid gap-5" :class="isMobile ? '' : 'grid-cols-[13rem_1fr] gap-8 items-start'">
              <img :src="sizedImage(COVER, IMG.large)" alt="DDF — picture" class="w-full rounded-2xl border border-border object-cover object-top" :class="isMobile ? 'h-32' : 'aspect-[4/5]'">
              <div class="min-w-0">
                <p class="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <img :src="LOGO" alt="" class="size-7 rounded-full object-cover border border-border">
                  <span><b class="text-foreground">Lionsnight</b> presents</span>
                  <!-- A / D: the contact sits with the organiser -->
                  <a v-if="variant === 'A' || variant === 'D'" :href="`mailto:${contact}`" class="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline" data-sketch-contact>
                    <Mail class="size-3.5" aria-hidden="true" /> Questions? {{ contact }}
                  </a>
                </p>
                <h1 class="font-display leading-[0.98] tracking-tight" :class="isMobile ? 'text-3xl' : 'text-5xl'">DDF – Deutschland Dance Festival 2026</h1>
                <dl class="mt-3 space-y-2 text-sm">
                  <div class="flex items-start gap-2.5">
                    <CalendarDays class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                    <dd class="flex flex-wrap items-center gap-x-2">
                      <span class="font-bold">Fri 18:30 – Sun 17:00 · Oct 16–18, 2026</span>
                    </dd>
                  </div>
                  <div>
                    <button type="button" class="group flex w-full items-start gap-2.5 text-left cursor-pointer" :aria-expanded="venueOpen" data-sketch-venue @click="venueOpen = !venueOpen">
                      <MapPin class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                      <span class="min-w-0">
                        <span class="flex items-center gap-1 font-bold group-hover:underline">
                          {{ venue.name }}
                          <ChevronDown class="size-4 text-secondary transition-transform" :class="venueOpen ? 'rotate-180' : ''" aria-hidden="true" />
                        </span>
                        <span class="block text-muted-foreground">{{ venue.address }}</span>
                      </span>
                    </button>

                    <!-- Venue panel — venue things only, in every variant -->
                    <div v-if="venueOpen" class="mt-2 ml-6.5 rounded-xl border border-border bg-card px-3 py-3 space-y-3" data-sketch-venue-panel>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <span class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold"><Layers class="size-3.5" aria-hidden="true" /> 4 floors + bar</span>
                        <span v-for="f in venue.floors" :key="f" class="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{{ f }}</span>
                      </div>
                      <div>
                        <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Getting there</p>
                        <ol class="mt-1.5 flex items-start" :class="isMobile ? 'flex-col gap-1.5' : 'gap-1'">
                          <li v-for="(s, i) in venue.route" :key="i" class="flex items-center gap-1.5 text-xs">
                            <span class="grid size-6 place-items-center rounded-full text-white shrink-0" :style="{ background: i === 1 ? '#6b7280' : '#0f7a3f' }"><component :is="s.icon" class="size-3.5" aria-hidden="true" /></span>
                            <span><b>{{ s.label }}</b><span v-if="s.mins" class="text-muted-foreground"> · {{ s.mins }}</span></span>
                            <ArrowRight v-if="!isMobile && i < venue.route.length - 1" class="size-3.5 text-muted-foreground mx-1" aria-hidden="true" />
                          </li>
                        </ol>
                        <p class="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Footprints class="size-3.5" aria-hidden="true" /> or {{ venue.walk }} · S2 runs every 20 min</p>
                      </div>
                      <p class="flex items-start gap-2 text-xs"><Car class="size-4 shrink-0 text-secondary" aria-hidden="true" /> <span>{{ venue.parking }}</span></p>
                      <a href="https://freshsuites.de" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 hover:bg-muted/60">
                        <BedDouble class="size-5 text-secondary shrink-0" aria-hidden="true" />
                        <span class="text-xs"><b class="block text-sm">{{ venue.hotel.name }}</b>{{ venue.hotel.address }} · {{ venue.hotel.site }}</span>
                        <ArrowUpRight class="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
                      </a>
                      <p class="flex flex-wrap gap-x-4 text-sm font-bold">
                        <a :href="venue.mapUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-secondary hover:underline">Directions <ArrowUpRight class="size-3.5" aria-hidden="true" /></a>
                        <span class="inline-flex items-center gap-1 text-secondary">About the venue <ArrowRight class="size-3.5" aria-hidden="true" /></span>
                      </p>
                    </div>
                  </div>
                </dl>
                <p class="mt-3 text-sm leading-relaxed">Three days of Kizomba, Urbankiz, Bachata and Salsa at meet &amp; DANCE in Dachau, 25 minutes from Munich by S-Bahn.</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-full px-5 h-10 text-sm font-bold text-white" :style="{ background: '#8a6d12' }"><Ticket class="size-4" aria-hidden="true" /> Get pass</span>
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-5 h-10 text-sm font-bold">+ My plan</span>
                </div>
              </div>
            </div>
          </section>

          <!-- ═════════════ Tabs ═════════════ -->
          <nav class="sticky top-0 z-10 border-y border-border bg-background/95 backdrop-blur px-4 flex gap-1" :class="isMobile ? '' : 'px-8'">
            <button
              v-for="t in TABS" :key="t.id" type="button"
              class="px-3 py-3 text-sm font-bold border-b-2 -mb-px"
              :class="tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'"
              :data-testid="`tab-${t.id}`"
              @click="tab = t.id"
            >{{ t.label }}</button>
          </nav>

          <div class="px-4 py-6 space-y-6" :class="isMobile ? '' : 'px-8'">
            <!-- ═════════ OVERVIEW ═════════ -->
            <template v-if="tab === 'overview'">
              <section>
                <h2 class="font-display text-2xl">What’s inside</h2>
                <div class="mt-3 grid gap-2" :class="isMobile ? 'grid-cols-2' : 'grid-cols-4'">
                  <div v-for="s in [['32', 'teaching acts'], ['14', 'DJs'], ['4', 'floors + bar'], ['2', 'masterclasses']]" :key="s[1]" class="rounded-xl border border-border bg-card px-3 py-2">
                    <b class="font-display text-2xl">{{ s[0] }}</b> <span class="text-xs text-muted-foreground">{{ s[1] }}</span>
                  </div>
                </div>
              </section>

              <!-- A / D: Good to know tiles -->
              <section v-if="variant === 'A' || variant === 'D'" data-sketch-good-to-know>
                <h2 class="font-display text-2xl">Good to know</h2>
                <div class="mt-3 grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                  <div v-if="variant === 'D'" class="rounded-xl border border-border bg-card p-3" :class="isMobile ? '' : 'col-span-2'">
                    <p class="flex items-center gap-2 text-sm font-bold"><Shirt class="size-4 text-secondary" aria-hidden="true" /> Dress code</p>
                    <div class="mt-2 grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                      <div v-for="d in days.filter(x => x.dress)" :key="d.key" class="flex items-center gap-3">
                        <span class="text-xs font-bold w-16">{{ d.day }}</span>
                        <span class="flex flex-wrap gap-2">
                          <span v-for="o in d.dress!.options" :key="o.label" class="inline-flex items-center gap-1.5 text-xs">
                            <span class="flex"><span v-for="c in o.colors" :key="c" class="size-4 rounded-full border border-border -mr-1" :style="{ background: c }" /></span>
                            <span class="ml-1">{{ d.dress!.theme ? `${d.dress!.theme} · ` : '' }}{{ o.label }}</span>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div v-for="g in goodToKnow" :key="g.title" class="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span class="grid size-10 place-items-center rounded-full bg-muted shrink-0"><component :is="g.icon" class="size-5 text-secondary" aria-hidden="true" /></span>
                    <span class="text-sm"><b class="block">{{ g.title }}</b><span class="text-xs text-muted-foreground">{{ g.note }}</span></span>
                  </div>
                  <div v-if="variant === 'D'" class="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span class="grid size-10 place-items-center rounded-full bg-muted shrink-0"><Utensils class="size-5 text-secondary" aria-hidden="true" /></span>
                    <span class="text-sm"><b class="block">Food on site</b><span class="text-xs text-muted-foreground">Buffet in the bar area · Fri ~19:00, Sat ~16:30</span></span>
                  </div>
                  <button v-if="variant === 'D'" type="button" class="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:bg-muted/60" @click="venueOpen = true">
                    <span class="grid size-10 place-items-center rounded-full bg-muted shrink-0"><Train class="size-5 text-secondary" aria-hidden="true" /></span>
                    <span class="text-sm"><b class="block">25 min from Munich</b><span class="text-xs text-muted-foreground">S2 to Dachau, then bus or a short walk · route in the venue ↑</span></span>
                  </button>
                </div>
              </section>

              <!-- B: one infographic card -->
              <section v-if="variant === 'B'" class="rounded-2xl border-2 bg-card p-4" :style="{ borderColor: ACCENT }" data-sketch-know-before>
                <h2 class="font-display text-2xl">Know before you go</h2>
                <div class="mt-4 grid gap-5" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
                  <div class="space-y-2.5">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Getting there</p>
                    <p class="flex items-start gap-2 text-sm"><Train class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span><b>S2</b> to Dachau Bf · ≈ 25 min<br><span class="text-xs text-muted-foreground">then bus 5–10 min or walk 20–25</span></span></p>
                    <p class="flex items-start gap-2 text-sm"><Car class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>Garage next door</span></p>
                    <p class="flex items-start gap-2 text-sm"><BedDouble class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>FreshSuites Dachau</span></p>
                  </div>
                  <div class="space-y-2.5">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">On the nights</p>
                    <div v-for="d in days.filter(x => x.dress)" :key="d.key" class="flex items-center gap-2 text-sm">
                      <span class="flex"><span v-for="c in d.dress!.options[0]!.colors" :key="c" class="size-4 rounded-full border border-border -mr-1" :style="{ background: c }" /></span>
                      <span class="ml-1"><b>{{ d.day.slice(0, 3) }}</b> {{ d.dress!.options.map(o => o.label).join(' or ') }}</span>
                    </div>
                    <p class="flex items-start gap-2 text-sm"><Utensils class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>Buffet Fri ~19:00 · Sat ~16:30</span></p>
                    <p class="flex items-start gap-2 text-sm"><Footprints class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>Indoor dance shoes · no cloakroom</span></p>
                    <p class="flex items-start gap-2 text-sm"><Clock class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>Sunday ends 17:00</span></p>
                  </div>
                  <div class="space-y-2.5">
                    <p class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your ticket</p>
                    <p class="flex items-start gap-2 text-sm"><X class="size-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" /><span>Single follower tickets sold out</span></p>
                    <p class="flex items-start gap-2 text-sm"><Info class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>Non-refundable, transferable · ≈ 2.5% fee</span></p>
                    <p class="flex items-start gap-2 text-sm"><Mail class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><a :href="`mailto:${contact}`" class="underline">{{ contact }}</a></p>
                    <p class="flex items-start gap-2 text-sm"><ImageIcon class="size-4 shrink-0 text-secondary mt-0.5" aria-hidden="true" /><span>Posters: <button v-for="p in posters" :key="p.day" type="button" class="underline mr-1" @click="posterOpen = p.url">{{ p.day.slice(0, 3) }}</button></span></p>
                  </div>
                </div>
              </section>

              <!-- C: the weekend as a timeline -->
              <section v-if="variant === 'C'" data-sketch-timeline>
                <h2 class="font-display text-2xl">Your weekend</h2>
                <ol class="mt-4 relative border-l-2 border-border ml-3 space-y-5">
                  <li class="pl-5 relative">
                    <span class="absolute -left-[9px] top-1 size-4 rounded-full bg-muted-foreground" />
                    <p class="text-sm font-bold">Before you go</p>
                    <ul class="mt-1 space-y-1 text-sm text-muted-foreground">
                      <li class="flex gap-2"><Ticket class="size-4 shrink-0" aria-hidden="true" /> Single follower tickets sold out · non-refundable, transferable · ≈ 2.5% fee</li>
                      <li class="flex gap-2"><Footprints class="size-4 shrink-0" aria-hidden="true" /> Pack indoor dance shoes · no cloakroom, travel light</li>
                      <li class="flex gap-2"><Mail class="size-4 shrink-0" aria-hidden="true" /> Questions: <a :href="`mailto:${contact}`" class="underline">{{ contact }}</a></li>
                    </ul>
                  </li>
                  <li class="pl-5 relative">
                    <span class="absolute -left-[9px] top-1 size-4 rounded-full bg-[#0f7a3f]" />
                    <p class="text-sm font-bold">Getting there</p>
                    <p class="mt-1 text-sm text-muted-foreground">S2 from Munich ≈ 25 min → bus 5–10 min or walk 20–25 · garage next door · stay at FreshSuites</p>
                  </li>
                  <li v-for="d in days" :key="d.key" class="pl-5 relative">
                    <span class="absolute -left-[9px] top-1 size-4 rounded-full" :style="{ background: ACCENT }" />
                    <p class="text-sm font-bold">{{ d.day }} · {{ d.date }} <span class="font-normal text-muted-foreground">{{ d.starts }} – {{ d.ends }}</span></p>
                    <div class="mt-1.5 flex flex-wrap gap-2 text-xs">
                      <span v-for="o in d.dress?.options ?? []" :key="o.label" class="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1">
                        <span class="flex"><span v-for="c in o.colors" :key="c" class="size-3.5 rounded-full border border-border -mr-1" :style="{ background: c }" /></span>
                        <span class="ml-1">{{ d.dress?.theme ? `${d.dress.theme} · ` : '' }}{{ o.label }}</span>
                      </span>
                      <span v-if="d.food" class="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1"><Utensils class="size-3.5" aria-hidden="true" /> Buffet {{ d.food }}</span>
                      <span class="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1"><Clock class="size-3.5" aria-hidden="true" /> Ends {{ d.ends }}</span>
                      <span v-if="d.endsNote" class="inline-flex items-center rounded-full bg-muted px-2 py-1 text-muted-foreground">{{ d.endsNote }}</span>
                    </div>
                  </li>
                </ol>
              </section>

              <section>
                <h2 class="font-display text-2xl">About</h2>
                <p class="mt-2 text-sm text-muted-foreground leading-relaxed">Workshops in Urbankiz, Kizomba Fusion, Tarraxo, Afro, Tango-Kiz, Menstyling, Bachata Sensual &amp; Moderna, Urban Bachata, Salsa Cubana, Salsa LA and Son Cubano…</p>
              </section>
            </template>

            <!-- ═════════ SCHEDULE ═════════ -->
            <template v-else-if="tab === 'schedule'">
              <!-- A / D: posters on top -->
              <div v-if="variant === 'A' || variant === 'D'" class="flex items-center gap-3" data-sketch-posters>
                <button v-for="p in posters" :key="p.day" type="button" class="group text-center" @click="posterOpen = p.url">
                  <img :src="sizedImage(p.url, IMG.card)" :alt="`${p.day} schedule poster`" class="h-20 w-16 rounded-md border border-border object-cover object-top group-hover:ring-2 ring-primary">
                  <span class="mt-1 block text-[11px] text-muted-foreground">{{ p.day }}</span>
                </button>
                <span class="text-xs text-muted-foreground">The organiser’s posters</span>
              </div>

              <div class="flex gap-1 rounded-full border border-border p-0.5 w-fit">
                <button
                  v-for="d in days" :key="d.key" type="button"
                  class="px-3 h-8 rounded-full text-sm font-bold"
                  :class="scheduleDay === d.key ? 'bg-foreground text-background' : 'text-muted-foreground'"
                  @click="scheduleDay = d.key"
                >{{ d.day.slice(0, 3) }} {{ d.date.split(' ')[1] }}</button>
              </div>

              <!-- C / D: the day card -->
              <div v-if="variant === 'C' || variant === 'D'" class="rounded-xl border border-border bg-card p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" data-sketch-day-card>
                <span class="font-bold">{{ dayOf(scheduleDay).day }} · {{ dayOf(scheduleDay).starts }} – {{ dayOf(scheduleDay).ends }}</span>
                <span v-for="(o, oi) in dayOf(scheduleDay).dress?.options ?? []" :key="o.label" class="inline-flex items-center gap-1.5 text-xs">
                  <Shirt v-if="!oi" class="size-3.5 text-secondary" aria-hidden="true" /><span v-else class="text-muted-foreground">or</span>
                  <span class="flex"><span v-for="c in o.colors" :key="c" class="size-3.5 rounded-full border border-border -mr-1" :style="{ background: c }" /></span>
                  <span class="ml-1">{{ dayOf(scheduleDay).dress?.theme ? `${dayOf(scheduleDay).dress!.theme} · ` : '' }}{{ o.label }}</span>
                </span>
                <span v-if="dayOf(scheduleDay).food" class="inline-flex items-center gap-1 text-xs"><Utensils class="size-3.5 text-secondary" aria-hidden="true" /> Buffet {{ dayOf(scheduleDay).food }}</span>
                <span v-if="dayOf(scheduleDay).endsNote" class="text-xs text-muted-foreground">{{ dayOf(scheduleDay).endsNote }}</span>
              </div>

              <ol class="space-y-2">
                <template v-for="(it, i) in schedule[scheduleDay]" :key="i">
                  <!-- B / C: food and "ends" stay out of the timeline (B) or live in the day card (C) -->
                  <li
                    v-if="!(it.kind === 'food' && (variant === 'B' || variant === 'C')) && !(it.kind === 'end' && variant === 'B')"
                    class="flex gap-3 rounded-xl border px-3 py-2.5"
                    :class="it.kind === 'food' ? 'border-dashed border-wd-amber-500 bg-wd-amber-500/8' : it.kind === 'end' ? 'border-dashed border-border bg-muted/50' : 'border-border bg-card'"
                  >
                    <span class="w-12 shrink-0 text-sm font-bold tabular-nums">{{ it.time }}</span>
                    <component :is="itemIcon(it.kind)" class="size-4 mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
                    <span class="min-w-0 text-sm">
                      <b class="block">{{ it.title }}<span v-if="it.end" class="font-normal text-muted-foreground"> · until {{ it.end }}</span></b>
                      <span v-if="it.who || it.room" class="text-xs text-muted-foreground">{{ [it.who, it.room].filter(Boolean).join(' · ') }}</span>
                      <span v-if="it.kind === 'end' && dayOf(scheduleDay).endsNote" class="block text-xs text-muted-foreground">{{ dayOf(scheduleDay).endsNote }}</span>
                      <!-- A: dress code on the night's parties -->
                      <span v-if="variant === 'A' && dressOn(scheduleDay, it)" class="mt-1 flex flex-wrap gap-2">
                        <span v-for="o in dressOn(scheduleDay, it)!.options" :key="o.label" class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                          <span class="flex"><span v-for="c in o.colors" :key="c" class="size-3 rounded-full border border-border -mr-0.5" :style="{ background: c }" /></span>
                          <span class="ml-1">{{ o.label }}</span>
                        </span>
                      </span>
                    </span>
                  </li>
                </template>
              </ol>
            </template>

            <!-- ═════════ PASSES ═════════ -->
            <template v-else>
              <ul class="space-y-2">
                <li
                  v-for="p in passes" :key="p.name"
                  class="flex items-start gap-3 rounded-xl border border-border px-3 py-3"
                  :class="p.soldOut && variant !== 'B' ? 'bg-muted/60' : 'bg-card'"
                >
                  <span class="min-w-0 flex-1 text-sm">
                    <b class="block" :class="p.soldOut && variant !== 'B' ? 'text-muted-foreground line-through decoration-1' : ''">{{ p.name }}</b>
                    <span class="text-xs text-muted-foreground">{{ p.soldOut && variant === 'B' ? 'Full pass for one follower' : p.note }}</span>
                    <span v-if="p.soldOut && variant !== 'B' && p.hint" class="block mt-1 text-xs">
                      {{ p.hint }}
                      <a v-if="variant !== 'C'" :href="`mailto:${contact}`" class="underline text-secondary">{{ contact }}</a>
                    </span>
                  </span>
                  <span v-if="p.soldOut && variant !== 'B'" class="rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-xs font-bold shrink-0" data-sketch-sold-out>Sold out</span>
                  <span v-else-if="p.price" class="text-sm font-bold shrink-0">€{{ p.price }}</span>
                  <span v-else class="text-sm font-bold shrink-0 text-muted-foreground">—</span>
                </li>
              </ul>
              <p v-if="variant !== 'B'" class="flex items-start gap-2 text-xs text-muted-foreground" data-sketch-fine-print>
                <Info class="size-3.5 shrink-0 mt-0.5" aria-hidden="true" /> {{ finePrint }}
              </p>
            </template>
          </div>
        </div>

        <!-- Poster viewer -->
        <div v-if="posterOpen" class="absolute inset-0 z-30 bg-black/80 grid place-items-center p-4" @click="posterOpen = null">
          <img :src="sizedImage(posterOpen, IMG.large)" alt="Schedule poster" class="max-h-full max-w-full rounded-lg">
          <button type="button" class="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white text-black" aria-label="Close" @click.stop="posterOpen = null"><X class="size-5" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
