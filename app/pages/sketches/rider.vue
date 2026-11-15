<script setup lang="ts">
/**
 * Sketch (RAZ-965): what an organiser gets once an artist says yes, and where
 * the artist keeps their rider (standard terms).
 *
 * Today the artist's deal is two free-text fields (fee, needs) on the invite,
 * shown to the organiser as one line ("Fee €120 · Needs: train from Vienna").
 * A request from the booking page goes out by email and WeDance never learns
 * the answer.
 *
 * Four directions, each with an organiser view (the agreed sheet for one artist
 * on one event) and an artist view (where the rider is filled in):
 *   A — Deal line: terms only, free text, the line-up row opens up
 *   B — One-page agreement: structured sheet, rider vs this event, PDF
 *   C — Run sheet: to-dos with owners + weekend timeline, rider as a wizard
 *   D — Recommended: B's sheet + 4 to-dos, rider saved from the first yes
 *
 * Mock data only: no API calls, no DB. Every name, fee and time below is an
 * example, not Milaila's real terms.
 */
import {
  Check, Euro, Train, BedDouble, Speaker, Users, CreditCard, CalendarDays, Clock,
  FileDown, Share2, Pencil, Plus, Mail, Phone, MessageCircle, ChevronDown, ChevronRight,
  Sparkles, Eye, Lock, Globe, CircleDot, ListChecks, ArrowRight, X,
} from 'lucide-vue-next'
import type { Component } from 'vue'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Rider & agreed sheet sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'A' | 'B' | 'C' | 'D'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Deal line',
    idea: 'The line-up row opens into the artist\'s terms: fee, travel, stay, needs, payment, in their words. The rider is six text boxes on the artist\'s page. A booking-page request stays email-only.',
    good: 'Smallest change: today\'s two fields become six, plus a saved default. No new flow for anyone to learn.',
    cost: 'Free text can\'t be compared or checked. Nothing tracks travel, hotel or payment, so that stays in WhatsApp. Booking-page yeses still vanish into email.',
  },
  {
    id: 'B',
    name: 'One-page agreement',
    idea: 'A sheet per artist per event: fee, schedule, travel, stay, needs, payment, contacts. Every line says whether it comes from the rider or was agreed for this event. Both sides see it, either can propose a change, PDF for the team.',
    good: 'Looks like a real rider, so artists take it seriously. The "changed for this event" marks stop the classic "but my rider says…" argument.',
    cost: 'A propose/accept loop for changes is a real flow to build. Shows the terms but not what\'s still to do.',
  },
  {
    id: 'C',
    name: 'Run sheet',
    idea: 'To-dos first: who books the train, the hotel, who pays the deposit, each with an owner and a tick. Then the weekend as a timeline (arrival, classes, show, departure). Terms fold away below. The rider is a 5-step wizard.',
    good: 'The organiser works from it on the day. The artist ticks their own items (send invoice, send train times), so there are fewer "did you…?" messages.',
    cost: 'Most to build, and to-dos without reminders go stale. Overkill for a single class with a €80 fee.',
  },
  {
    id: 'D',
    name: 'Recommended: sheet + short to-do, rider from the first yes',
    idea: 'B\'s sheet with the rider / this-event marks, plus four fixed to-dos (travel, hotel, deposit, final payment) with no owners or reminders. The artist doesn\'t fill a rider up front: their first yes saves it ("Keep these as my rider"), and every later yes starts from it. A booking-page request gets the same Yes button.',
    good: 'No empty form to face. The organiser gets one sheet and the four things that actually go wrong. Booking-page yeses land on WeDance too.',
    cost: 'Needs a structured yes on booking requests (new state on booking_inquiries) and a rider store per artist page. Four fixed to-dos won\'t fit every deal.',
  },
]
const variant = ref<Variant>('D')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)
const view = ref<'organiser' | 'artist'>('organiser')
const device = ref<'desktop' | 'mobile'>('desktop')
const isMobile = computed(() => device.value === 'mobile')
const source = ref<'invite' | 'request'>('invite')

// ── Mock data (examples) ──────────────────────────────────────────────────
const ARTIST = { name: 'Milaila Capote', handle: 'milailacapote', city: 'Vienna', styles: 'Cuban salsa · Son · Rumba', initials: 'MC' }
const EVENT = { name: 'Cuban Weekend Munich', dates: 'Fri 12 – Sun 14 Mar 2027', venue: 'Tanzschule Am Ring', host: 'Casa Cubana Munich' }
const ORGANISER = { name: 'Tom', role: 'Casa Cubana Munich' }

type Origin = 'rider' | 'event'
interface Line { label: string, value: string, origin: Origin, was?: string }
interface Section { id: string, icon: Component, title: string, lines: Line[] }

const SECTIONS: Section[] = [
  {
    id: 'fee', icon: Euro, title: 'Fee', lines: [
      { label: 'Festival day', value: '€450 (3 classes + show), Saturday', origin: 'rider' },
      { label: 'Extra class', value: '€120, Sunday Ladies style', origin: 'event' },
      { label: 'Total', value: '€570', origin: 'event' },
    ],
  },
  {
    id: 'schedule', icon: CalendarDays, title: 'Schedule', lines: [
      { label: 'Sat 14:00', value: 'Son workshop · 60 min · Room 1', origin: 'event' },
      { label: 'Sat 15:30', value: 'Rueda de casino · 60 min · Room 1', origin: 'event' },
      { label: 'Sat 17:00', value: 'Rumba basics · 60 min · Room 2', origin: 'event' },
      { label: 'Sat 22:30', value: 'Show with Ariel · 6 min', origin: 'event' },
      { label: 'Sun 13:00', value: 'Ladies style · 60 min · Room 1', origin: 'event' },
    ],
  },
  {
    id: 'travel', icon: Train, title: 'Travel', lines: [
      { label: 'From', value: 'Vienna, by train (2nd class is fine)', origin: 'rider' },
      { label: 'Booked by', value: 'Organiser books, for 2 people', origin: 'event', was: 'Organiser reimburses' },
      { label: 'Arrives', value: 'Fri 21:05 München Hbf, pickup by Tom', origin: 'event' },
    ],
  },
  {
    id: 'stay', icon: BedDouble, title: 'Stay', lines: [
      { label: 'Room', value: 'Double room, 2 nights (Fri–Sun), near the venue', origin: 'rider' },
      { label: 'Meals', value: 'Lunch and dinner on Saturday', origin: 'rider' },
    ],
  },
  {
    id: 'needs', icon: Speaker, title: 'Floor & sound', lines: [
      { label: 'Floor', value: 'Wooden or dance floor, no carpet or tiles', origin: 'rider' },
      { label: 'Sound', value: 'Speaker with aux or Bluetooth; headset mic for 40+ people', origin: 'rider' },
    ],
  },
  {
    id: 'partner', icon: Users, title: 'Dance partner', lines: [
      { label: 'Partner', value: 'Ariel teaches with her; free pass, shares the room', origin: 'rider' },
    ],
  },
  {
    id: 'payment', icon: CreditCard, title: 'Payment', lines: [
      { label: 'Deposit', value: '50% (€285) when confirmed', origin: 'rider' },
      { label: 'Rest', value: '€285 on Saturday, cash or bank transfer', origin: 'rider' },
      { label: 'Invoice', value: 'She sends one after the weekend', origin: 'rider' },
    ],
  },
]
const CONTACTS = [
  { who: ARTIST.name, how: 'Messages on WeDance · WhatsApp after the yes', icon: MessageCircle },
  { who: `${ORGANISER.name} (organiser)`, how: 'Messages on WeDance · phone shared after the yes', icon: Phone },
]
const TIMELINE = [
  { when: 'Fri 21:05', what: 'Arrives München Hbf · Tom picks up', kind: 'travel' },
  { when: 'Fri 22:00', what: 'Check-in, Hotel am Ring', kind: 'stay' },
  { when: 'Sat 14:00', what: 'Son workshop', kind: 'class' },
  { when: 'Sat 15:30', what: 'Rueda de casino', kind: 'class' },
  { when: 'Sat 17:00', what: 'Rumba basics', kind: 'class' },
  { when: 'Sat 22:30', what: 'Show with Ariel', kind: 'show' },
  { when: 'Sun 13:00', what: 'Ladies style', kind: 'class' },
  { when: 'Sun 17:42', what: 'Train back to Vienna', kind: 'travel' },
]

interface Todo { id: string, text: string, owner: 'you' | 'artist', done: boolean, due?: string }
const C_TODOS: Todo[] = [
  { id: 't1', text: 'Book 2 train tickets Vienna ↔ Munich', owner: 'you', done: true, due: 'by 1 Feb' },
  { id: 't2', text: 'Book a double room, 2 nights', owner: 'you', done: true, due: 'by 1 Feb' },
  { id: 't3', text: 'Pay the deposit, €285', owner: 'you', done: false, due: 'by 30 Nov' },
  { id: 't4', text: 'Send train times she prefers', owner: 'artist', done: true },
  { id: 't5', text: 'Approve the flyer and posts', owner: 'artist', done: false },
  { id: 't6', text: 'Check the floor and sound at the venue', owner: 'you', done: false, due: 'by 1 Mar' },
  { id: 't7', text: 'Pay the rest, €285, on Saturday', owner: 'you', done: false },
  { id: 't8', text: 'Send the invoice', owner: 'artist', done: false },
]
const D_TODOS: Todo[] = [
  { id: 'd1', text: 'Travel booked', owner: 'you', done: true },
  { id: 'd2', text: 'Room booked', owner: 'you', done: false },
  { id: 'd3', text: 'Deposit paid (€285)', owner: 'you', done: false },
  { id: 'd4', text: 'Rest paid (€285)', owner: 'you', done: false },
]

// ── Local state (reset on every toggle) ───────────────────────────────────
const todos = ref<Todo[]>([])
const openRow = ref<string | null>(null)
const openSection = ref<Set<string>>(new Set())
const proposing = ref(false)
const proposal = ref('')
const proposed = ref(false)
const toast = ref('')
const termsOpen = ref(false)
const wizardStep = ref(0)
const artistTab = ref<'rider' | 'answer'>('answer')
const keepAsRider = ref(true)
const answered = ref(false)
const emailTerms = ref(false)
const riderVisibility = ref<'public' | 'organisers' | 'after-yes'>('after-yes')

// A's free-text rider
const riderText = reactive({
  fee: '€120 per class · €250 a show · €450 a festival day (3 classes + show)',
  travel: 'From Vienna, train preferred. Organiser books or pays it back.',
  stay: 'Double room near the venue (I come with my partner). Meals on teaching days.',
  floor: 'Wooden floor, no carpet. Speaker with aux; headset mic for big groups.',
  partner: 'Ariel teaches with me: needs a free pass and shares my room.',
  payment: '50% when we confirm, the rest on the day. Invoice after.',
})
// B / D structured fee table
interface FeeRow { kind: string, price: string }
const feeRows = ref<FeeRow[]>([])
const FEE_DEFAULT: FeeRow[] = [
  { kind: 'Class (60 min)', price: '€120' },
  { kind: 'Show', price: '€250' },
  { kind: 'Festival day (3 classes + show)', price: '€450' },
  { kind: 'Private class (per hour)', price: '€80' },
]
const FEE_KINDS = ['Class (60 min)', 'Show', 'Festival day', 'Private class', 'Social / DJ set', 'Bootcamp (per day)']
// The answer to this invite in D (starts from the rider)
const answer = reactive({ fee: '€450 festival day', extra: '+ €120 Sunday class', travel: 'Organiser books, for 2', note: '' })

function reset() {
  todos.value = (variant.value === 'C' ? C_TODOS : D_TODOS).map(t => ({ ...t }))
  openRow.value = variant.value === 'A' ? 'milaila' : null
  openSection.value = new Set(['fee', 'schedule', 'travel'])
  proposing.value = false
  proposal.value = ''
  proposed.value = false
  toast.value = ''
  termsOpen.value = false
  wizardStep.value = 0
  artistTab.value = 'answer'
  keepAsRider.value = true
  answered.value = false
  emailTerms.value = false
  riderVisibility.value = 'after-yes'
  feeRows.value = FEE_DEFAULT.map(r => ({ ...r }))
}
watch([variant, view, device, source], reset, { immediate: true })

const doneCount = computed(() => todos.value.filter(t => t.done).length)
function toggleTodo(id: string) {
  const t = todos.value.find(x => x.id === id)
  if (t) t.done = !t.done
}
function toggleSection(id: string) {
  const s = new Set(openSection.value)
  s.has(id) ? s.delete(id) : s.add(id)
  openSection.value = s
}
let toastTimer: ReturnType<typeof setTimeout> | undefined
function say(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}
function sendProposal() {
  proposing.value = false
  proposed.value = true
  say('Sent to Milaila — the line stays marked until she accepts.')
}

const LINEUP = [
  { id: 'milaila', name: ARTIST.name, initials: 'MC', role: 'Teacher · Show', status: 'in' },
  { id: 'yoel', name: 'Yoel Rodríguez', initials: 'YR', role: 'Teacher', status: 'waiting' },
  { id: 'dj', name: 'DJ Habanero', initials: 'DH', role: 'DJ · Saturday', status: 'in' },
]
const WIZARD = ['Fees', 'Travel', 'Stay', 'Floor & sound', 'Partner & payment']

const VIS = [
  { id: 'public' as const, icon: Globe, label: 'Public', hint: 'Anyone on your booking page sees your fees.' },
  { id: 'organisers' as const, icon: Eye, label: 'Signed-in organisers', hint: 'Organisers see it before they ask.' },
  { id: 'after-yes' as const, icon: Lock, label: 'After a yes', hint: 'Only the organiser you said yes to. Your page shows "from €120".' },
]
const frameClass = computed(() => isMobile.value
  ? 'mx-auto w-[390px] rounded-[2rem] border-[6px] border-foreground/85 shadow-2xl overflow-hidden'
  : 'mx-auto w-full max-w-4xl rounded-2xl border border-border shadow-wd-card overflow-hidden')
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- ═══════════ Sketch controls (not part of any variant) ═══════════ -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Rider · RAZ-965</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background" role="group" aria-label="Variant">
          <button
            v-for="v in VARIANTS" :key="v.id" type="button"
            class="px-3 h-8 rounded-full text-sm font-bold transition-colors"
            :class="variant === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="variant = v.id"
          >{{ v.id }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background" role="group" aria-label="Who is looking">
          <button
            v-for="m in (['organiser', 'artist'] as const)" :key="m" type="button"
            class="px-3 h-8 rounded-full text-xs font-bold transition-colors"
            :class="view === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
            @click="view = m"
          >{{ m === 'organiser' ? 'Organiser · agreed sheet' : 'Artist · rider' }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background" role="group" aria-label="Device">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button"
            class="px-3 h-8 rounded-full text-xs font-bold transition-colors"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
            @click="device = d"
          >{{ d === 'desktop' ? 'Desktop' : 'Phone' }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background" role="group" aria-label="Where the yes came from">
          <button
            v-for="s in (['invite', 'request'] as const)" :key="s" type="button"
            class="px-3 h-8 rounded-full text-xs font-bold transition-colors"
            :class="source === s ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
            @click="source = s"
          >{{ s === 'invite' ? 'Yes to a line-up invite' : 'Yes to a booking request' }}</button>
        </div>
        <button type="button" class="ml-auto text-xs font-bold text-primary underline underline-offset-2" @click="reset">Reset</button>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 grid sm:grid-cols-[1.3fr_1fr_1fr] gap-3 text-xs">
        <p><span class="font-display text-base font-bold block">{{ current.id }} · {{ current.name }}</span>{{ current.idea }}</p>
        <p><span class="font-bold text-wd-green-700 block uppercase tracking-wider">Good</span>{{ current.good }}</p>
        <p><span class="font-bold text-primary block uppercase tracking-wider">Cost</span>{{ current.cost }}</p>
      </div>
    </div>

    <div class="px-4 py-8">
      <div :class="frameClass" class="bg-background">
        <div :class="isMobile ? 'h-[min(760px,calc(100vh-220px))] overflow-y-auto' : ''" class="relative">
          <!-- Mock app bar -->
          <div class="flex items-center gap-2 border-b border-border bg-card px-4 h-12 text-sm">
            <span class="font-display font-bold text-primary shrink-0">WeDance</span>
            <span class="text-muted-foreground truncate">· {{ view === 'organiser' ? `Business · ${EVENT.host}` : `Business · ${ARTIST.name}` }}</span>
          </div>

          <!-- ═════════════════════ ORGANISER VIEW ═════════════════════ -->
          <div v-if="view === 'organiser'" class="p-4 sm:p-6" :class="isMobile ? '!p-4' : ''">
            <p class="text-xs text-muted-foreground">Events › {{ EVENT.name }} ›{{ variant === 'A' ? ' Line-up' : '' }}<template v-if="variant !== 'A'"> Line-up › {{ ARTIST.name }}</template></p>
            <h1 class="font-display text-2xl font-bold mt-1 leading-tight">{{ variant === 'A' ? 'Line-up' : ARTIST.name }}</h1>
            <p class="text-sm text-muted-foreground">{{ EVENT.name }} · {{ EVENT.dates }} · {{ EVENT.venue }}</p>

            <!-- Where the yes came from -->
            <div
              class="mt-3 rounded-xl border px-3 py-2 text-xs flex items-start gap-2"
              :class="source === 'request' && variant === 'A' ? 'border-wd-amber-500/50 bg-wd-amber-500/10' : 'border-success/40 bg-success/10'"
            >
              <Mail v-if="source === 'request' && variant === 'A'" class="size-4 shrink-0 mt-0.5" />
              <Check v-else class="size-4 shrink-0 mt-0.5 text-wd-green-700" />
              <span v-if="source === 'invite'">Said yes to your line-up invite on 15 Nov, from her rider<template v-if="variant !== 'A'"> with 2 changes for this event</template>.</span>
              <span v-else-if="variant === 'A'">You asked from her booking page on 14 Nov. Her answer went to your email, so WeDance doesn't know the terms.</span>
              <span v-else>You asked from her booking page on 14 Nov. She said yes on WeDance on 15 Nov, starting from her rider.</span>
            </div>

            <!-- ───────── A · Deal line ───────── -->
            <template v-if="variant === 'A'">
              <ul class="mt-4 flex flex-col gap-2">
                <li v-for="r in LINEUP" :key="r.id" class="rounded-2xl border border-border bg-card">
                  <button type="button" class="w-full flex items-center gap-3 p-3 text-left" @click="openRow = openRow === r.id ? null : r.id">
                    <span class="size-10 shrink-0 rounded-full bg-gradient-to-br from-wd-red-600 to-wd-orange-500 text-white font-bold grid place-items-center text-sm">{{ r.initials }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block font-bold truncate">{{ r.name }}</span>
                      <span class="block text-xs text-muted-foreground truncate">{{ r.role }}<template v-if="r.id === 'milaila' && !(source === 'request' && !emailTerms)"> · Fee €450 + €120 · Train from Vienna</template></span>
                    </span>
                    <Badge :class="r.status === 'in' ? 'border-transparent bg-success/15 text-wd-green-700' : 'border-border bg-muted text-muted-foreground'">{{ r.status === 'in' ? 'In' : 'Waiting' }}</Badge>
                    <ChevronDown class="size-4 shrink-0 transition-transform" :class="openRow === r.id ? 'rotate-180' : ''" />
                  </button>
                  <div v-if="openRow === r.id && r.id === 'milaila'" class="border-t border-border p-3 text-sm">
                    <template v-if="source === 'request' && !emailTerms">
                      <p class="text-muted-foreground">No terms on WeDance yet. Copy what she wrote in the email so your team sees it.</p>
                      <Button variant="soft" size="pill-sm" class="mt-2" @click="emailTerms = true"><Pencil /> Add her terms</Button>
                    </template>
                    <dl v-else class="grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                      <div v-for="(val, key) in riderText" :key="key">
                        <dt class="text-eyebrow uppercase tracking-[0.15em] font-bold text-muted-foreground">{{ key }}</dt>
                        <dd>{{ val }}</dd>
                      </div>
                    </dl>
                    <p v-if="!(source === 'request' && !emailTerms)" class="mt-3 text-xs text-muted-foreground">Her message: "Happy to add a Ladies style class on Sunday for €120."</p>
                  </div>
                  <div v-else-if="openRow === r.id" class="border-t border-border p-3 text-sm text-muted-foreground">{{ r.status === 'in' ? 'No terms set: your offer stands.' : 'Hasn\'t answered yet.' }}</div>
                </li>
              </ul>
              <p class="mt-4 text-xs text-muted-foreground">Travel, room and payment: tracked wherever you track them today.</p>
            </template>

            <!-- ───────── B · One-page agreement ───────── -->
            <template v-else-if="variant === 'B'">
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <Badge class="border-transparent bg-success/15 text-wd-green-700"><Check class="size-3" /> Both agreed · 15 Nov</Badge>
                <span class="text-xs text-muted-foreground inline-flex items-center gap-2">
                  <span class="inline-flex items-center gap-1"><span class="size-2 rounded-full bg-muted-foreground/40" /> from her rider</span>
                  <span class="inline-flex items-center gap-1"><span class="size-2 rounded-full bg-primary" /> agreed for this event</span>
                </span>
                <span class="flex-1" />
                <Button variant="outline-pill" size="pill-sm" @click="say('PDF ready: milaila-capote-cuban-weekend.pdf')"><FileDown /> PDF</Button>
                <Button variant="outline-pill" size="pill-sm" @click="say('Shared with your team (3 people).')"><Share2 /> Team</Button>
              </div>
              <div class="mt-4 rounded-2xl border border-border bg-card divide-y divide-border">
                <section v-for="s in SECTIONS" :key="s.id" class="p-4">
                  <h2 class="flex items-center gap-2 font-display font-bold"><component :is="s.icon" class="size-4 text-primary" /> {{ s.title }}</h2>
                  <dl class="mt-2 grid gap-1.5 text-sm">
                    <div v-for="l in s.lines" :key="l.label" class="grid gap-x-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-[9rem_1fr]'">
                      <dt class="text-muted-foreground flex items-center gap-1.5">
                        <span class="size-2 rounded-full shrink-0" :class="l.origin === 'event' ? 'bg-primary' : 'bg-muted-foreground/40'" />{{ l.label }}
                      </dt>
                      <dd :class="l.origin === 'event' ? 'font-semibold' : ''">
                        {{ l.value }}
                        <span v-if="l.was" class="block text-xs text-muted-foreground font-normal">Her rider: {{ l.was }}</span>
                      </dd>
                    </div>
                  </dl>
                </section>
                <section class="p-4">
                  <h2 class="flex items-center gap-2 font-display font-bold"><MessageCircle class="size-4 text-primary" /> Contacts</h2>
                  <ul class="mt-2 text-sm grid gap-1">
                    <li v-for="c in CONTACTS" :key="c.who"><span class="font-semibold">{{ c.who }}</span> · <span class="text-muted-foreground">{{ c.how }}</span></li>
                  </ul>
                </section>
              </div>
              <div class="mt-4">
                <Button v-if="!proposing && !proposed" variant="soft" size="pill-sm" @click="proposing = true"><Pencil /> Propose a change</Button>
                <div v-else-if="proposing" class="rounded-2xl border border-primary/30 bg-card p-4">
                  <Field id="b-proposal" label="What should change?" hint="Milaila gets it and accepts or answers. The sheet marks the line until then.">
                    <Textarea v-model="proposal" :rows="2" placeholder="e.g. Show at 23:00 instead of 22:30" />
                  </Field>
                  <div class="mt-2 flex gap-2">
                    <Button variant="pill" size="pill-sm" :disabled="!proposal.trim()" @click="sendProposal">Send to Milaila</Button>
                    <Button variant="ghost" size="sm" @click="proposing = false">Cancel</Button>
                  </div>
                </div>
                <p v-else class="text-sm rounded-xl bg-wd-amber-500/10 border border-wd-amber-500/40 px-3 py-2">Waiting for Milaila: "{{ proposal }}"</p>
              </div>
            </template>

            <!-- ───────── C · Run sheet ───────── -->
            <template v-else-if="variant === 'C'">
              <div class="mt-4 rounded-2xl border border-border bg-card p-4">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="font-display font-bold flex items-center gap-2"><ListChecks class="size-4 text-primary" /> Still to do</h2>
                  <span class="text-sm font-bold">{{ doneCount }} / {{ todos.length }}</span>
                </div>
                <div class="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div class="h-full bg-primary transition-all" :style="{ width: `${(doneCount / todos.length) * 100}%` }" /></div>
                <ul class="mt-3 grid gap-1">
                  <li v-for="t in todos" :key="t.id">
                    <label class="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/60 cursor-pointer">
                      <input type="checkbox" class="mt-0.5 size-4 accent-[var(--primary)]" :checked="t.done" :disabled="t.owner === 'artist'" @change="toggleTodo(t.id)">
                      <span class="flex-1 text-sm" :class="t.done ? 'line-through text-muted-foreground' : ''">{{ t.text }}</span>
                      <span class="text-xs shrink-0" :class="t.owner === 'you' ? 'text-wd-red-800 font-semibold' : 'text-muted-foreground'">{{ t.owner === 'you' ? 'You' : 'Milaila' }}<template v-if="t.due && !t.done"> · {{ t.due }}</template></span>
                    </label>
                  </li>
                </ul>
                <p class="mt-2 text-xs text-muted-foreground">Milaila ticks her own items; you get a nudge 3 days before a date.</p>
              </div>
              <div class="mt-4 rounded-2xl border border-border bg-card p-4">
                <h2 class="font-display font-bold flex items-center gap-2"><Clock class="size-4 text-primary" /> Her weekend</h2>
                <ol class="mt-3 relative border-l-2 border-border ml-2">
                  <li v-for="(s, i) in TIMELINE" :key="i" class="pl-4 pb-3 relative">
                    <span class="absolute -left-[7px] top-1 size-3 rounded-full" :class="s.kind === 'show' ? 'bg-primary' : s.kind === 'class' ? 'bg-wd-amber-500' : 'bg-muted-foreground/50'" />
                    <span class="text-xs font-bold text-muted-foreground">{{ s.when }}</span>
                    <span class="block text-sm">{{ s.what }}</span>
                  </li>
                </ol>
              </div>
              <button type="button" class="mt-4 w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between text-left" @click="termsOpen = !termsOpen">
                <span><span class="font-display font-bold block">Terms</span><span class="text-xs text-muted-foreground">€570 · train for 2 · double room · 50% deposit</span></span>
                <ChevronDown class="size-4 transition-transform" :class="termsOpen ? 'rotate-180' : ''" />
              </button>
              <div v-if="termsOpen" class="mt-2 rounded-2xl border border-border bg-card p-4 text-sm grid gap-2">
                <p v-for="s in SECTIONS.filter(x => x.id !== 'schedule')" :key="s.id"><span class="font-semibold">{{ s.title }}:</span> {{ s.lines.map(l => l.value).join(' · ') }}</p>
              </div>
            </template>

            <!-- ───────── D · Recommended ───────── -->
            <template v-else>
              <div class="mt-4 grid gap-4" :class="isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_16rem] items-start'">
                <div class="rounded-2xl border border-border bg-card divide-y divide-border">
                  <div class="p-4 flex flex-wrap items-center gap-2">
                    <span class="text-xs text-muted-foreground inline-flex items-center gap-2">
                      <span class="inline-flex items-center gap-1"><span class="size-2 rounded-full bg-muted-foreground/40" /> rider</span>
                      <span class="inline-flex items-center gap-1"><span class="size-2 rounded-full bg-primary" /> this event</span>
                    </span>
                    <span class="flex-1" />
                    <Button variant="outline-pill" size="pill-sm" @click="say('PDF ready: milaila-capote-cuban-weekend.pdf')"><FileDown /> PDF</Button>
                  </div>
                  <section v-for="s in SECTIONS" :key="s.id">
                    <button type="button" class="w-full flex items-center gap-2 p-4 text-left" @click="toggleSection(s.id)">
                      <component :is="s.icon" class="size-4 text-primary shrink-0" />
                      <span class="font-display font-bold">{{ s.title }}</span>
                      <span v-if="s.lines.some(l => l.origin === 'event')" class="size-2 rounded-full bg-primary" />
                      <span v-if="!openSection.has(s.id)" class="text-xs text-muted-foreground truncate flex-1 min-w-0">{{ s.lines[0]!.value }}</span>
                      <span v-else class="flex-1" />
                      <ChevronRight class="size-4 shrink-0 transition-transform" :class="openSection.has(s.id) ? 'rotate-90' : ''" />
                    </button>
                    <dl v-if="openSection.has(s.id)" class="px-4 pb-4 -mt-1 grid gap-1.5 text-sm">
                      <div v-for="l in s.lines" :key="l.label" class="grid gap-x-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-[8rem_1fr]'">
                        <dt class="text-muted-foreground flex items-center gap-1.5"><span class="size-2 rounded-full shrink-0" :class="l.origin === 'event' ? 'bg-primary' : 'bg-muted-foreground/40'" />{{ l.label }}</dt>
                        <dd :class="l.origin === 'event' ? 'font-semibold' : ''">{{ l.value }}<span v-if="l.was" class="block text-xs text-muted-foreground font-normal">Her rider: {{ l.was }}</span></dd>
                      </div>
                    </dl>
                  </section>
                  <section class="p-4">
                    <h2 class="flex items-center gap-2 font-display font-bold"><MessageCircle class="size-4 text-primary" /> Contacts</h2>
                    <ul class="mt-2 text-sm grid gap-1">
                      <li v-for="c in CONTACTS" :key="c.who"><span class="font-semibold">{{ c.who }}</span> · <span class="text-muted-foreground">{{ c.how }}</span></li>
                    </ul>
                  </section>
                </div>
                <aside class="rounded-2xl border border-border bg-card p-4" :class="isMobile ? '-order-1' : 'sticky top-4'">
                  <div class="flex items-center justify-between">
                    <h2 class="font-display font-bold">To do</h2>
                    <span class="text-sm font-bold">{{ doneCount }} / {{ todos.length }}</span>
                  </div>
                  <ul class="mt-2 grid gap-1">
                    <li v-for="t in todos" :key="t.id">
                      <label class="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/60 cursor-pointer text-sm">
                        <input type="checkbox" class="size-4 accent-[var(--primary)]" :checked="t.done" @change="toggleTodo(t.id)">
                        <span :class="t.done ? 'line-through text-muted-foreground' : ''">{{ t.text }}</span>
                      </label>
                    </li>
                  </ul>
                  <p class="mt-2 text-xs text-muted-foreground">Only you see these ticks.</p>
                  <Button variant="soft" size="pill-sm" class="mt-3 w-full" @click="say('Opens a message to Milaila with the line you picked.')"><MessageCircle /> Ask Milaila to change a line</Button>
                </aside>
              </div>
            </template>

            <div v-if="toast" class="sticky bottom-3 mt-4 mx-auto w-fit rounded-full bg-foreground text-background text-xs font-bold px-4 py-2 shadow-lg">{{ toast }}</div>
          </div>

          <!-- ═════════════════════ ARTIST VIEW ═════════════════════ -->
          <div v-else class="p-4 sm:p-6" :class="isMobile ? '!p-4' : ''">
            <!-- ───────── A · six text boxes ───────── -->
            <template v-if="variant === 'A'">
              <p class="text-xs text-muted-foreground">Business › {{ ARTIST.name }} › Booking</p>
              <h1 class="font-display text-2xl font-bold mt-1">Your terms</h1>
              <p class="text-sm text-muted-foreground">Every line-up invite starts from these. Change them per event in your answer.</p>
              <div class="mt-4 grid gap-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                <Field v-for="(_, key) in riderText" :id="`a-${key}`" :key="key" :label="key[0]!.toUpperCase() + key.slice(1)" optional>
                  <Textarea v-model="riderText[key]" :rows="2" />
                </Field>
              </div>
              <p class="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1"><Lock class="size-3.5" /> Only organisers who invite you see these.</p>
              <div class="mt-3"><Button variant="pill" size="pill-sm" @click="say('Saved.')">Save</Button></div>
              <p class="mt-6 text-xs rounded-xl border border-border bg-card p-3 text-muted-foreground">Requests from your booking page still reach you by email; you answer there.</p>
            </template>

            <!-- ───────── B · structured rider ───────── -->
            <template v-else-if="variant === 'B'">
              <p class="text-xs text-muted-foreground">Business › {{ ARTIST.name }} › Rider</p>
              <h1 class="font-display text-2xl font-bold mt-1">Your rider</h1>
              <p class="text-sm text-muted-foreground">The sheet every organiser gets after your yes. Change a line per event; your rider stays as it is.</p>
              <div class="mt-4 rounded-2xl border border-border bg-card p-4">
                <h2 class="font-display font-bold flex items-center gap-2"><Euro class="size-4 text-primary" /> Fees</h2>
                <ul class="mt-2 grid gap-2">
                  <li v-for="(r, i) in feeRows" :key="i" class="grid gap-2 items-center" :class="isMobile ? 'grid-cols-[1fr_5rem_2rem]' : 'grid-cols-[1fr_8rem_2rem]'">
                    <select v-model="r.kind" class="h-10 rounded-xl border border-input bg-card px-3 text-sm">
                      <option v-for="k in [...new Set([r.kind, ...FEE_KINDS])]" :key="k">{{ k }}</option>
                    </select>
                    <Input v-model="r.price" />
                    <button type="button" class="size-8 grid place-items-center rounded-full hover:bg-muted" aria-label="Remove fee" @click="feeRows.splice(i, 1)"><X class="size-4" /></button>
                  </li>
                </ul>
                <Button variant="ghost" size="sm" class="mt-2" @click="feeRows.push({ kind: 'Show', price: '' })"><Plus /> Add a fee</Button>
              </div>
              <div class="mt-3 grid gap-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                <div class="rounded-2xl border border-border bg-card p-4 grid gap-3">
                  <h2 class="font-display font-bold flex items-center gap-2"><Train class="size-4 text-primary" /> Travel & stay</h2>
                  <Field id="b-from" label="You travel from"><Input model-value="Vienna" /></Field>
                  <Field id="b-how" label="How"><Input model-value="Train preferred · flights economy + 1 bag" /></Field>
                  <Field id="b-room" label="Room"><Input model-value="Double room near the venue" /></Field>
                </div>
                <div class="rounded-2xl border border-border bg-card p-4 grid gap-3">
                  <h2 class="font-display font-bold flex items-center gap-2"><Speaker class="size-4 text-primary" /> Floor, sound, partner</h2>
                  <Field id="b-floor" label="Floor"><Input model-value="Wooden, no carpet or tiles" /></Field>
                  <Field id="b-sound" label="Sound"><Input model-value="Aux/Bluetooth · headset mic for 40+" /></Field>
                  <Field id="b-partner" label="Dance partner" optional><Input model-value="Ariel · free pass, shares the room" /></Field>
                </div>
                <div class="rounded-2xl border border-border bg-card p-4 grid gap-3" :class="isMobile ? '' : 'col-span-2'">
                  <h2 class="font-display font-bold flex items-center gap-2"><CreditCard class="size-4 text-primary" /> Payment</h2>
                  <div class="grid gap-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
                    <Field id="b-dep" label="Deposit"><Input model-value="50% when confirmed" /></Field>
                    <Field id="b-rest" label="The rest"><Input model-value="On the day" /></Field>
                    <Field id="b-pay" label="How"><Input model-value="Cash or bank transfer · I send an invoice" /></Field>
                  </div>
                </div>
              </div>
              <div class="mt-4 rounded-2xl border border-border bg-card p-4">
                <h2 class="font-display font-bold">Who sees it</h2>
                <div class="mt-2 grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
                  <button
                    v-for="o in VIS" :key="o.id" type="button"
                    class="rounded-xl border p-3 text-left text-sm transition-colors"
                    :class="riderVisibility === o.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'"
                    @click="riderVisibility = o.id"
                  >
                    <span class="font-bold flex items-center gap-1.5"><component :is="o.icon" class="size-4" /> {{ o.label }}</span>
                    <span class="block text-xs text-muted-foreground mt-1">{{ o.hint }}</span>
                  </button>
                </div>
              </div>
              <div class="mt-4"><Button variant="pill" size="pill-sm" @click="say('Rider saved.')">Save rider</Button></div>
            </template>

            <!-- ───────── C · wizard ───────── -->
            <template v-else-if="variant === 'C'">
              <p class="text-xs text-muted-foreground">Business › {{ ARTIST.name }} › Set up your rider</p>
              <h1 class="font-display text-2xl font-bold mt-1">Your rider · step {{ wizardStep + 1 }} of {{ WIZARD.length }}</h1>
              <ol class="mt-3 flex gap-1">
                <li v-for="(w, i) in WIZARD" :key="w" class="flex-1">
                  <button type="button" class="w-full h-1.5 rounded-full" :class="i <= wizardStep ? 'bg-primary' : 'bg-muted'" :aria-label="w" @click="wizardStep = i" />
                  <span v-if="!isMobile" class="block mt-1 text-xs" :class="i === wizardStep ? 'font-bold' : 'text-muted-foreground'">{{ w }}</span>
                </li>
              </ol>
              <div class="mt-4 grid gap-4" :class="isMobile ? 'grid-cols-1' : 'grid-cols-[1fr_18rem]'">
                <div class="rounded-2xl border border-border bg-card p-4 grid gap-3">
                  <template v-if="wizardStep === 0">
                    <p class="font-bold">What do you charge?</p>
                    <div class="flex flex-wrap gap-2">
                      <button v-for="k in FEE_KINDS" :key="k" type="button" class="rounded-full border px-3 h-8 text-xs font-bold" :class="feeRows.some(r => r.kind.startsWith(k)) ? 'border-primary bg-primary/10 text-wd-red-800' : 'border-border'" @click="feeRows.some(r => r.kind.startsWith(k)) ? feeRows.splice(feeRows.findIndex(r => r.kind.startsWith(k)), 1) : feeRows.push({ kind: k, price: '' })">{{ k }}</button>
                    </div>
                    <div v-for="(r, i) in feeRows" :key="i" class="grid grid-cols-[1fr_6rem] gap-2 items-center text-sm"><span>{{ r.kind }}</span><Input v-model="r.price" placeholder="€" /></div>
                  </template>
                  <template v-else-if="wizardStep === 1">
                    <p class="font-bold">Where do you travel from?</p>
                    <Field id="c-from" label="City"><Input model-value="Vienna" /></Field>
                    <Field id="c-mode" label="How you like to travel"><Input model-value="Train; flights economy + 1 bag" /></Field>
                    <Field id="c-book" label="Who books it"><Input model-value="The organiser" /></Field>
                  </template>
                  <template v-else-if="wizardStep === 2">
                    <p class="font-bold">Where do you sleep?</p>
                    <Field id="c-room" label="Room"><Input model-value="Double room near the venue" /></Field>
                    <Field id="c-meals" label="Meals" optional><Input model-value="On teaching days" /></Field>
                  </template>
                  <template v-else-if="wizardStep === 3">
                    <p class="font-bold">What does the room need?</p>
                    <Field id="c-floor" label="Floor"><Input model-value="Wooden, no carpet" /></Field>
                    <Field id="c-sound" label="Sound"><Input model-value="Aux · headset mic for 40+" /></Field>
                  </template>
                  <template v-else>
                    <p class="font-bold">Partner and payment</p>
                    <Field id="c-partner" label="Dance partner" optional><Input model-value="Ariel" /></Field>
                    <Field id="c-pay" label="Payment"><Input model-value="50% when confirmed, rest on the day" /></Field>
                  </template>
                  <div class="flex gap-2 mt-1">
                    <Button v-if="wizardStep > 0" variant="ghost" size="sm" @click="wizardStep--">Back</Button>
                    <Button v-if="wizardStep < WIZARD.length - 1" variant="pill" size="pill-sm" @click="wizardStep++">Next <ArrowRight /></Button>
                    <Button v-else variant="pill" size="pill-sm" @click="say('Rider saved. Organisers see it after your yes.')">Save rider</Button>
                  </div>
                </div>
                <div class="rounded-2xl border border-dashed border-border p-4 text-sm">
                  <p class="text-eyebrow uppercase tracking-[0.15em] font-bold text-muted-foreground">On your booking page</p>
                  <p class="mt-2 font-display font-bold text-lg">{{ ARTIST.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ ARTIST.styles }} · from {{ ARTIST.city }}</p>
                  <p class="mt-3 font-bold">From {{ feeRows[0]?.price || '€…' }}</p>
                  <p class="text-xs text-muted-foreground">Full rider shared after a yes</p>
                  <div class="mt-3"><Button variant="pill" size="pill-sm" disabled>Ask to book</Button></div>
                </div>
              </div>
              <div class="mt-4 rounded-2xl border border-border bg-card p-4 text-sm">
                <p class="font-bold flex items-center gap-2"><ListChecks class="size-4 text-primary" /> Your to-dos for Cuban Weekend Munich</p>
                <ul class="mt-2 grid gap-1">
                  <li v-for="t in C_TODOS.filter(x => x.owner === 'artist')" :key="t.id" class="flex items-center gap-2"><CircleDot class="size-3.5" :class="t.done ? 'text-wd-green-700' : 'text-muted-foreground'" />{{ t.text }}</li>
                </ul>
              </div>
            </template>

            <!-- ───────── D · rider from the first yes ───────── -->
            <template v-else>
              <div class="flex rounded-full border border-border p-0.5 bg-card w-fit">
                <button type="button" class="px-3 h-8 rounded-full text-xs font-bold" :class="artistTab === 'answer' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'" @click="artistTab = 'answer'">{{ source === 'invite' ? 'Answer the invite' : 'Answer the request' }}</button>
                <button type="button" class="px-3 h-8 rounded-full text-xs font-bold" :class="artistTab === 'rider' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'" @click="artistTab = 'rider'">Your rider</button>
              </div>

              <template v-if="artistTab === 'answer'">
                <p class="mt-4 text-xs text-muted-foreground">{{ source === 'invite' ? `${EVENT.host} invited you to their line-up` : `${EVENT.host} asked from your booking page` }}</p>
                <h1 class="font-display text-2xl font-bold mt-1">{{ EVENT.name }}</h1>
                <p class="text-sm text-muted-foreground">{{ EVENT.dates }} · {{ EVENT.venue }}</p>
                <div v-if="source === 'request'" class="mt-3 rounded-xl border border-border bg-card p-3 text-sm">
                  <p class="font-semibold">Tom wrote:</p>
                  <p class="text-muted-foreground">"Could you teach 3 classes on Saturday and do a show with Ariel? Sunday class would be a bonus."</p>
                </div>
                <div v-if="!answered" class="mt-4 rounded-2xl border border-border bg-card p-4 grid gap-3">
                  <p class="text-sm flex items-center gap-1.5"><Sparkles class="size-4 text-primary" /> Filled in from your rider. Change anything for this event.</p>
                  <div class="grid gap-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                    <Field id="d-fee" label="Fee"><Input v-model="answer.fee" /></Field>
                    <Field id="d-extra" label="Extra for this event" optional><Input v-model="answer.extra" /></Field>
                    <Field id="d-travel" label="Travel"><Input v-model="answer.travel" /></Field>
                    <Field id="d-room" label="Room"><Input model-value="Double room, 2 nights" /></Field>
                  </div>
                  <p class="text-xs text-muted-foreground">Floor, sound, partner and payment: as in your rider. <button type="button" class="font-bold text-wd-red-800 underline" @click="artistTab = 'rider'">See</button></p>
                  <Field id="d-note" label="A message to Tom" optional><Textarea v-model="answer.note" :rows="2" placeholder="Happy to add a Ladies style class on Sunday." /></Field>
                  <label class="flex items-start gap-2 text-sm cursor-pointer">
                    <input v-model="keepAsRider" type="checkbox" class="mt-0.5 size-4 accent-[var(--primary)]">
                    <span>Keep travel and room as my rider for next time<span class="block text-xs text-muted-foreground">The extra Sunday class stays on this event only.</span></span>
                  </label>
                  <div class="flex flex-wrap gap-2">
                    <Button variant="pill" @click="answered = true"><Check /> Yes, I'm in</Button>
                    <Button variant="outline-pill" @click="say('Tom hears you can\'t make it.')">Can't make it</Button>
                  </div>
                </div>
                <div v-else class="mt-4 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm">
                  <p class="font-bold flex items-center gap-2"><Check class="size-4 text-wd-green-700" /> Tom has your yes and the agreed sheet.</p>
                  <p class="mt-1 text-muted-foreground">{{ keepAsRider ? 'Your rider now has these travel and room terms.' : 'Your rider is unchanged.' }} You'll find the sheet under Business › Bookings.</p>
                </div>
              </template>

              <template v-else>
                <h1 class="font-display text-2xl font-bold mt-4">Your rider</h1>
                <p class="text-sm text-muted-foreground">Saved from your answers. Every new yes starts from it.</p>
                <div class="mt-4 rounded-2xl border border-border bg-card p-4">
                  <h2 class="font-display font-bold flex items-center gap-2"><Euro class="size-4 text-primary" /> Fees</h2>
                  <ul class="mt-2 grid gap-2">
                    <li v-for="(r, i) in feeRows" :key="i" class="grid gap-2 items-center" :class="isMobile ? 'grid-cols-[1fr_5rem_2rem]' : 'grid-cols-[1fr_8rem_2rem]'">
                      <Input v-model="r.kind" />
                      <Input v-model="r.price" />
                      <button type="button" class="size-8 grid place-items-center rounded-full hover:bg-muted" aria-label="Remove fee" @click="feeRows.splice(i, 1)"><X class="size-4" /></button>
                    </li>
                  </ul>
                  <Button variant="ghost" size="sm" class="mt-2" @click="feeRows.push({ kind: '', price: '' })"><Plus /> Add a fee</Button>
                </div>
                <div class="mt-3 rounded-2xl border border-border bg-card divide-y divide-border text-sm">
                  <div v-for="s in SECTIONS.filter(x => !['fee', 'schedule'].includes(x.id))" :key="s.id" class="p-3 flex items-start gap-2">
                    <component :is="s.icon" class="size-4 text-primary mt-0.5 shrink-0" />
                    <div class="flex-1 min-w-0"><span class="font-bold">{{ s.title }}</span><span class="block text-muted-foreground">{{ s.lines.filter(l => l.origin === 'rider' || l.was).map(l => l.was ?? l.value).join(' · ') }}</span></div>
                    <button type="button" class="size-8 grid place-items-center rounded-full hover:bg-muted shrink-0" :aria-label="`Edit ${s.title}`" @click="say('Opens this part to edit.')"><Pencil class="size-4" /></button>
                  </div>
                </div>
                <p class="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1"><Lock class="size-3.5" /> Your booking page shows "from €120". The rest goes only to an organiser you said yes to.</p>
              </template>
            </template>

            <div v-if="toast" class="sticky bottom-3 mt-4 mx-auto w-fit rounded-full bg-foreground text-background text-xs font-bold px-4 py-2 shadow-lg">{{ toast }}</div>
          </div>
        </div>
      </div>
      <p class="mt-4 text-center text-xs text-muted-foreground">Example data, not Milaila's real terms. Nothing here is saved.</p>
    </div>
  </div>
</template>
