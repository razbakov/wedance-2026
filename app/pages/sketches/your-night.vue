<script setup lang="ts">
/**
 * Sketch (RAZ-1007): "Your night" — booking an event with a programme.
 *
 * One booking covers the night (19:00 class → 20:00 party → 22:00 live band). Booking
 * ticks what your pass covers; the ticks stay editable, because they tell you when to
 * arrive and tell the organiser how many come to what. Unticking keeps your spot and
 * your price. Items your pass doesn't cover say so, with the upgrade.
 *
 * Mock data only: nothing is sent or written.
 */
import { ArrowRight, CalendarPlus, Check, Clock, MapPin, Music, Plus, Ticket, Users, MicVocal, GraduationCap } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Your night sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type ItemId = 'class' | 'party' | 'band'
const ITEMS: { id: ItemId, start: string, end: string, title: string, sub: string, kind: string, icon: any }[] = [
  { id: 'class', start: '19:00', end: '20:00', title: 'Reparto class', sub: 'Beginner · Yunior', kind: 'Class', icon: GraduationCap },
  { id: 'party', start: '20:00', end: '00:00', title: 'Bachata Dominicana & Timba', sub: 'with DJ Hamza', kind: 'Party', icon: Music },
  { id: 'band', start: '22:00', end: '22:15', title: 'Live Band', sub: 'Concert', kind: 'Concert', icon: MicVocal },
]
type PassId = 'full' | 'party'
const PASSES: { id: PassId, name: string, price: number, covers: ItemId[] }[] = [
  { id: 'full', name: 'Class + party', price: 15, covers: ['class', 'party', 'band'] },
  { id: 'party', name: 'Party only', price: 8, covers: ['party', 'band'] },
]

// Sketch controls
const booked = ref(false)
const view = ref<'both' | 'dancer' | 'organiser'>('both')
const device = ref<'desktop' | 'mobile'>('desktop')

// Before booking: "+ My plan" on the programme = interest; it picks the pass.
const interested = ref<Set<ItemId>>(new Set(['class', 'party']))
const suggestedPass = computed<PassId>(() => interested.value.has('class') ? 'full' : 'party')
const pass = ref<PassId>('full')
watch(suggestedPass, p => { if (!booked.value) pass.value = p }, { immediate: true })
const chosen = computed(() => PASSES.find(p => p.id === pass.value)!)
function toggleInterest(id: ItemId) {
  const s = new Set(interested.value)
  s.has(id) ? s.delete(id) : s.add(id)
  interested.value = s
}

// After booking: your night = what the pass covers, ticked; editable.
const attending = ref<Set<ItemId>>(new Set())
// Booking ticks everything the pass covers (most people do nothing more).
function book() {
  attending.value = new Set(chosen.value.covers)
  booked.value = true
}
watch(booked, b => { attending.value = b ? new Set(chosen.value.covers) : new Set() })
function toggleAttending(id: ItemId) {
  const s = new Set(attending.value)
  s.has(id) ? s.delete(id) : s.add(id)
  attending.value = s
}
function upgrade() {
  pass.value = 'full'
  attending.value = new Set([...attending.value, 'class'])
}
const covered = (id: ItemId) => chosen.value.covers.includes(id)

// "Be there around …": 10 min before the first item you tick.
const minus10 = (t: string) => { const [h, m] = t.split(':').map(Number); const d = h * 60 + m - 10; return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}` }
const firstItem = computed(() => ITEMS.find(i => attending.value.has(i.id)) ?? null)
const arrival = computed(() => firstItem.value ? (firstItem.value.id === 'class' ? minus10(firstItem.value.start) : firstItem.value.start) : null)
// The latest end of what you tick (00:00 = midnight, after 22:15).
const endMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h < 6 ? h + 24 : h) * 60 + m }
const lastEnd = computed(() => ITEMS.filter(i => attending.value.has(i.id)).sort((a, b) => endMin(b.end) - endMin(a.end))[0]?.end ?? null)

// Organiser: counts per item (mock base + this dancer, a leader).
const BASE = { class: { total: 23, leaders: 12, followers: 11 }, party: { total: 60 }, band: { total: 57 } }
const count = (id: ItemId) => BASE[id].total + (booked.value && attending.value.has(id) ? 1 : 0)
const leaders = computed(() => BASE.class.leaders + (booked.value && attending.value.has('class') ? 1 : 0))
const arrivals = computed(() => {
  const fromClass = count('class')
  const fromParty = count('party') - fromClass
  const fromBand = Math.max(0, count('band') - count('party') + 4)
  return [
    { at: '19:00', n: fromClass, label: 'for the class' },
    { at: '20:00', n: Math.max(0, fromParty), label: 'for the party' },
    { at: '22:00', n: fromBand, label: 'for the band' },
  ]
})
const maxArrival = computed(() => Math.max(...arrivals.value.map(a => a.n), 1))
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground font-sans">
    <!-- Sketch controls (not part of the prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Your night · sketch</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button v-for="b in [false, true]" :key="String(b)" type="button" class="px-3 h-7 rounded-full font-semibold"
            :class="booked === b ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="booked = b">{{ b ? 'Booked' : 'Not booked' }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button v-for="v in (['both', 'dancer', 'organiser'] as const)" :key="v" type="button" class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="view === v ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="view = v">{{ v }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button" class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="device = d">{{ d }}</button>
        </div>
        <span class="text-xs text-muted-foreground ml-auto">Mock data — nothing is saved.</span>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8 grid gap-8" :class="view === 'both' && device === 'desktop' ? 'lg:grid-cols-[1.25fr_1fr]' : ''">
      <!-- ── Dancer: the event page ─────────────────────────────── -->
      <section v-if="view !== 'organiser'" class="mx-auto w-full" :class="device === 'mobile' ? 'max-w-[390px]' : ''">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Dancer · event page</p>
        <div class="rounded-3xl bg-background border border-border shadow-sm overflow-hidden">
          <div class="p-5 sm:p-6">
            <p class="font-hand text-secondary text-lg">— In 3 days</p>
            <h1 class="font-display text-3xl sm:text-4xl leading-tight text-foreground">La Timberia — Live Band &amp; Party with DJ Hamza</h1>
            <p class="mt-1 font-display italic text-muted-foreground flex items-center gap-1"><MapPin class="size-4" /> Thu, Nov 19 · La Timberia, Neuhauser Str. 47</p>

            <!-- Not booked: the programme to plan + the passes, each saying what it covers -->
            <template v-if="!booked">
              <div class="mt-5 space-y-2">
                <p class="text-xs font-bold uppercase tracking-widest text-secondary">Plan your night</p>
                <div v-for="it in ITEMS" :key="it.id" class="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                  <span class="w-12 text-sm font-bold tabular-nums">{{ it.start }}</span>
                  <component :is="it.icon" class="size-4 text-muted-foreground shrink-0" />
                  <span class="flex-1 min-w-0"><span class="font-bold">{{ it.title }}</span><span class="block text-xs text-muted-foreground">{{ it.sub }}</span></span>
                  <Button type="button" size="pill-sm" :variant="interested.has(it.id) ? 'pill' : 'outline-pill'" class="font-sans normal-case tracking-normal" :aria-pressed="interested.has(it.id)" @click="toggleInterest(it.id)">
                    <component :is="interested.has(it.id) ? Check : Plus" /> My plan
                  </Button>
                </div>
              </div>

              <div class="mt-5 space-y-2">
                <p class="text-xs font-bold uppercase tracking-widest text-secondary">Your pass</p>
                <button v-for="p in PASSES" :key="p.id" type="button"
                  class="w-full text-left rounded-xl border-2 px-4 py-3 transition-colors"
                  :class="pass === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'"
                  @click="pass = p.id">
                  <span class="flex items-center gap-2">
                    <span class="font-bold">{{ p.name }}</span>
                    <span v-if="p.id === suggestedPass" class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-wd-green-700">Fits your plan</span>
                    <span class="ml-auto font-bold">€{{ p.price }}</span>
                  </span>
                  <span class="block text-xs text-muted-foreground mt-0.5">Includes {{ ITEMS.filter(i => p.covers.includes(i.id)).map(i => `${i.start} ${i.kind.toLowerCase()}`).join(' · ') }}</span>
                </button>
              </div>

              <Button variant="cta" class="mt-5 px-6" @click="book"><Ticket /> Book my spot · €{{ chosen.price }}</Button>
              <p class="mt-2 text-xs text-muted-foreground">Then: how you’re coming (lead, follow, with a partner), pay, your contact — the booking steps as today.</p>
            </template>

            <!-- Booked: the status line + your night, editable -->
            <template v-else>
              <div class="mt-5 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 space-y-1">
                <p class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" /> Spot booked · leader · {{ chosen.name }} · paid €{{ chosen.price }}</span>
                  <span class="ml-auto inline-flex gap-4 text-sm"><button class="font-bold text-primary hover:underline">Change</button><button class="text-muted-foreground hover:underline" @click="booked = false">Cancel my spot</button></span>
                </p>
              </div>

              <div class="mt-4 rounded-2xl border border-border bg-card px-4 py-4">
                <div class="flex items-baseline justify-between gap-3">
                  <p class="font-bold">Your night</p>
                  <p v-if="arrival" class="text-sm text-wd-green-700 font-bold inline-flex items-center gap-1"><Clock class="size-4" /> Be there around {{ arrival }}</p>
                  <p v-else class="text-sm text-muted-foreground">Nothing ticked — your spot is still yours.</p>
                </div>
                <ul class="mt-3 space-y-1.5">
                  <li v-for="it in ITEMS" :key="it.id" class="flex items-center gap-3 rounded-xl px-2 py-2" :class="covered(it.id) ? 'hover:bg-muted/50' : 'opacity-80'">
                    <button v-if="covered(it.id)" type="button" role="checkbox" :aria-checked="attending.has(it.id)"
                      class="size-5 rounded border-2 flex items-center justify-center shrink-0"
                      :class="attending.has(it.id) ? 'bg-wd-green-600 border-wd-green-600 text-white' : 'border-muted-foreground/40'"
                      @click="toggleAttending(it.id)"><Check v-if="attending.has(it.id)" class="size-3.5" /></button>
                    <span v-else class="size-5 shrink-0" />
                    <span class="w-12 text-sm font-bold tabular-nums">{{ it.start }}</span>
                    <span class="flex-1 min-w-0" :class="attending.has(it.id) ? '' : 'text-muted-foreground'">
                      <span class="font-bold">{{ it.title }}</span><span class="block text-xs">{{ it.sub }}</span>
                    </span>
                    <button v-if="!covered(it.id)" type="button" class="text-xs font-bold text-primary border border-primary/40 rounded-full px-2.5 py-1 hover:bg-primary/5" @click="upgrade">
                      Not in your pass · +€{{ PASSES[0].price - chosen.price }}
                    </button>
                  </li>
                </ul>
                <p class="mt-3 text-xs text-muted-foreground">Untick what you’ll skip: you keep your spot and your price. It tells you when to come, and the organiser how many come to what.</p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline-pill" size="pill-sm" class="font-sans normal-case tracking-normal"><CalendarPlus /> Add to calendar<span v-if="arrival" class="text-muted-foreground font-normal">· {{ arrival }}–{{ lastEnd }}</span></Button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- My plan: one row for the night -->
        <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-8 mb-2">Dancer · My plan, this week</p>
        <div class="rounded-2xl bg-background border border-border px-4 py-3 flex flex-wrap items-center gap-3">
          <span class="w-12 text-center text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded leading-tight bg-primary/10 text-primary">Thu<span class="block font-bold normal-case tracking-normal">19 Nov</span></span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-bold truncate">La Timberia — Live Band &amp; Party</span>
            <span class="block text-xs text-muted-foreground truncate">
              <template v-if="booked">{{ chosen.name }}<template v-if="arrival"> · from {{ arrival }}: {{ ITEMS.filter(i => attending.has(i.id)).map(i => i.kind.toLowerCase()).join(', ') }}</template></template>
              <template v-else>Planned: {{ ITEMS.filter(i => interested.has(i.id)).map(i => i.kind.toLowerCase()).join(', ') || 'nothing ticked' }}</template>
            </span>
          </span>
          <span v-if="booked" class="text-xs font-bold px-3 py-1.5 rounded-full text-white bg-wd-green-600">✓ Spot booked</span>
          <span v-else class="inline-flex items-center gap-3 text-xs">
            <span class="text-muted-foreground">Planned</span>
            <span class="font-bold px-3 py-1.5 rounded-full border text-primary border-primary/40">Book · €{{ chosen.price }} →</span>
            <span class="text-muted-foreground">Remove</span>
          </span>
        </div>
      </section>

      <!-- ── Organiser: who's coming to what ────────────────────── -->
      <section v-if="view !== 'dancer'" class="mx-auto w-full" :class="device === 'mobile' ? 'max-w-[390px]' : ''">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Organiser · event → Who’s coming</p>
        <div class="rounded-3xl bg-background border border-border shadow-sm p-5 sm:p-6 space-y-5">
          <div>
            <p class="font-bold flex items-center gap-2"><Users class="size-4" /> {{ count('party') + (booked && !attending.has('party') ? 1 : 0) }} spots booked</p>
            <p class="text-xs text-muted-foreground">Bookings plus what each dancer ticked for their night.</p>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-bold uppercase tracking-widest text-secondary">By programme item</p>
            <div v-for="it in ITEMS" :key="it.id" class="rounded-xl border border-border px-3 py-2.5">
              <div class="flex items-center gap-3">
                <span class="w-12 text-sm font-bold tabular-nums">{{ it.start }}</span>
                <span class="flex-1 font-bold">{{ it.title }}</span>
                <span class="text-lg font-black tabular-nums">{{ count(it.id) }}</span>
              </div>
              <div v-if="it.id === 'class'" class="mt-2 pl-[3.75rem]">
                <div class="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div class="bg-secondary" :style="{ width: `${leaders / count('class') * 100}%` }" />
                  <div class="bg-primary/60" :style="{ width: `${(count('class') - leaders) / count('class') * 100}%` }" />
                </div>
                <p class="mt-1 text-xs text-muted-foreground">{{ leaders }} leaders · {{ count('class') - leaders }} followers<template v-if="leaders > count('class') - leaders"> — {{ leaders - (count('class') - leaders) }} more leader{{ leaders - (count('class') - leaders) === 1 ? '' : 's' }}</template></p>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-xs font-bold uppercase tracking-widest text-secondary">When they arrive</p>
            <div v-for="a in arrivals" :key="a.at" class="flex items-center gap-3 text-sm">
              <span class="w-12 font-bold tabular-nums">{{ a.at }}</span>
              <div class="flex-1 h-3 rounded-full bg-muted overflow-hidden"><div class="h-full bg-primary/70 rounded-full" :style="{ width: `${a.n / maxArrival * 100}%` }" /></div>
              <span class="w-28 text-xs text-muted-foreground">~{{ a.n }} {{ a.label }}</span>
            </div>
            <p class="text-xs text-muted-foreground">For the door and the bar: when the room fills up.</p>
          </div>
        </div>

        <div class="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground space-y-2">
          <p class="font-bold text-foreground">What this needs</p>
          <p>Passes linked to programme items ("Party only" covers 20:00 and 22:00). Today a pass has a name and a price only.</p>
          <p>The ticks saved per booking. Sessions already save to the plan, so it’s close.</p>
          <p>Festivals with parallel rooms keep picking per workshop (with role and partner), because there the ticks are a choice, not an opt-out.</p>
        </div>
      </section>
    </div>
  </div>
</template>
