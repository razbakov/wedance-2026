<script setup lang="ts">
/**
 * Sketch (RAZ-995): signing up for a class.
 *
 * Today a dated class that sells a pass (e.g. MontunoClub's "Casino
 * Partnerwork") asks three things in three places: "Going?" (the RSVP poll in
 * the hero), "Save" (the star on its one schedule row) and "Get this pass"
 * (the pass card further down). Going and Save both put it on My plan; neither
 * says whether you still have to pay. Once answered, the poll card stacks up
 * to seven blocks (answers, status, who's coming, bring friends, keep in
 * touch, pairing).
 *
 * "Now" is today's page, for reference. A–D are four directions, clickable.
 * Mock data only: nothing is sent or written.
 */
import { Check, ChevronDown, ChevronRight, Hand, MapPin, Star, Ticket, Users, X, ArrowRight, Share2, Mail } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Class sign-up sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Variant = 'now' | 'A' | 'B' | 'C' | 'D' | 'E'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'now',
    name: 'Today',
    idea: 'The page as it is: the poll in the hero, a Save star on the one schedule row, a pass card further down.',
    good: 'Nothing to build.',
    cost: 'Three verbs for one intent; "Going" never says you still have to pay; the poll card grows to seven blocks.',
  },
  {
    id: 'A',
    name: 'One button, a short sheet',
    idea: 'The hero has one button: "Join · €10". A sheet asks how you come (partner / leader / follower), then how you pay (now or at the door). After that the hero shows one line: "You’re in · leader · paid". No Save, no pass section for a one-session class.',
    good: 'One verb, one place. Calmest page. Works the same for free classes (the sheet skips the pay step).',
    cost: 'The live counts per answer hide inside the sheet, so "a leader is looking for a follower" is less visible on the page.',
  },
  {
    id: 'B',
    name: 'Calm poll + price in the same card',
    idea: 'The poll stays, but as three compact chips with small counts. The price sits right under it: "€10 · Pay now" or "pay at the door". Once answered, one status line with "Change"; who’s coming, pairing and keep-in-touch fold into a row of small links.',
    good: 'Smallest change to today’s code (same poll, same data). The role question stays on the page, which organisers need to balance leaders and followers.',
    cost: 'Still two actions (answer, then pay) in one card; people may answer and think they’re done.',
  },
  {
    id: 'C',
    name: 'Ticket first',
    idea: 'For a paid class the hero CTA is the price: "Book your spot · €10". The role is one question inside checkout. No poll card on paid classes; under the button a social line: "2 going · 1 leader looking for a follower". Free classes keep the poll.',
    good: 'Clearest money path: the thing you must do is the one button. Fewest "going but never paid" sign-ups.',
    cost: 'No way to say "I’m coming, I’ll pay at the door" — a hard filter for drop-in classes. Two different hero CTAs (paid vs free).',
  },
  {
    id: 'D',
    name: 'Recommended: two numbered steps',
    idea: 'One card in the hero: ① "I’m coming as…" (three chips) → ② "Pay €10" (now, or at the door). A done step folds to one line with a ✓. Who’s coming and pairing move out of the card into their own section under the hero. No Save, no separate pass section for a one-session class.',
    good: 'Says exactly what "signed up" means (you said how you come AND how you pay). The card stays small; the social part still has room below.',
    cost: 'Two taps minimum. "At the door" needs a new organiser setting (default on for classes) and organisers see unpaid sign-ups apart from paid ones.',
  },
]

VARIANTS.push({
  id: 'E',
  name: 'Recommended: A’s one button opens D’s steps',
  idea: 'One button ("Sign up · €10", "Get your pass · from €35"). It opens the steps right there, no popup: ① how you’re coming (alone as leader or follower, or with your partner) ② which pass, only when there’s more than one (whole course or one class; full, day or party pass) ③ pay now or at the door ④ your contact: name, email and phone (+ your partner’s name, optional; signed in: just the phone, once). The organiser uses them for this class (changes, its WhatsApp group); "tell me about next classes" is a separate tick. A finished step folds to one line with "Change". Afterwards the page shows one line, "You’re in · …".',
  good: 'One button and one card for a class, a course and a festival, signed in or out. With your partner = two people: the pass’s couple price, else 2 ×. "Keep in touch" is a checkbox where you give your email, or under "You’re in" when signed in, like A.',
  cost: 'New data: a couple price per pass and an organiser switch for "pay at the door". Paying while signed out means a Stripe checkout without an account (the account comes from the checkout email); today buying needs signing in first.',
})

const variant = ref<Variant>('E')
const device = ref<'desktop' | 'mobile'>('desktop')
const paid = ref<'paid' | 'free'>('paid')
type Kind = 'class' | 'course' | 'festival'
// Signed out, the page can't tell a new visitor from someone with an account, so there is one
// signed-out state; the difference only shows in the email (new account vs. sign-in link).
type Auth = 'signedOut' | 'signedIn'
const kind = ref<Kind>('class')
const auth = ref<Auth>('signedOut')
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Mock event ────────────────────────────────────────────────────────────────
const EVENT = { name: 'Casino Partnerwork', org: 'MontunoClub', teacher: 'Alösha', day: 'Sun, Nov 22', time: '20:00–21:00', venue: 'Buena Vista Bar', address: 'Am Einlaß 2A, 80469 München', price: 10, level: 'Intermediate', style: 'Casino' }
type Role = 'partner' | 'needLeader' | 'needFollower'
const ROLES: { id: Role, label: string, chip: string, short: string }[] = [
  { id: 'partner', label: 'With my partner', chip: 'With partner', short: 'with your partner' },
  { id: 'needLeader', label: 'I follow, need a leader', chip: 'I follow', short: 'follower' },
  { id: 'needFollower', label: 'I lead, need a follower', chip: 'I lead', short: 'leader' },
]
const BASE: Record<Role, number> = { partner: 0, needLeader: 0, needFollower: 1 }
const OTHERS = [{ name: 'Rafael', photo: 'https://i.pravatar.cc/80?u=rafael', role: 'needFollower' as Role }]

// ── Interactive state (reset whenever a toggle changes) ───────────────────────
const role = ref<Role | null>(null)
const pay = ref<'none' | 'now' | 'door'>('none')
const sheet = ref<null | 'role' | 'pay' | 'done'>(null)
const showWho = ref(false)
const fold = ref<null | 'who' | 'pair' | 'touch'>(null)
const saved = ref(false)
const checkout = ref(false)
function reset() {
  role.value = null; pay.value = 'none'; sheet.value = null; showWho.value = false; fold.value = null; saved.value = false; checkout.value = false
  eOpen.value = false; eStep.value = 'role'; ePass.value = null; eEmail.value = ''; eEmailError.value = ''; eKeep.value = false; ePhone.value = ''; ePhoneError.value = ''; eName.value = ''; eNameError.value = ''; ePartner.value = ''; eState.value = 'idle'; eSaved.value = new Set()
}

// ── E: one button → inline steps, for a class, a course and a festival ───────
type Pass = { id: string, name: string, detail: string, price: number, couple: number | null }
type Session = { id: string, day: string, time: string, name: string, who: string }
const KINDS: Record<Kind, { name: string, when: string, meta: string, door: boolean, passes: Pass[], sessions: Session[], save: boolean, heading: string }> = {
  class: {
    name: 'Casino Partnerwork', when: 'Sun, Nov 22 · 20:00–21:00 · Buena Vista Bar', meta: 'Casino · Intermediate · with Alösha', door: true,
    passes: [{ id: 'drop', name: 'This class', detail: 'Sun, Nov 22', price: 10, couple: 18 }],
    sessions: [{ id: 's1', day: 'Sun, Nov 22', time: '20:00', name: 'Casino Partnerwork', who: 'Alösha' }], save: false, heading: 'Sunday, Nov 22',
  },
  course: {
    name: 'Casino Level 2', when: '4 Sundays · Nov 22 – Dec 13 · 20:00–21:00 · Buena Vista Bar', meta: 'Casino · Intermediate · with Alösha', door: true,
    passes: [
      { id: 'course', name: 'Whole course', detail: '4 classes · Nov 22 – Dec 13', price: 60, couple: 110 },
      { id: 'drop', name: 'Just one class', detail: 'Drop-in · Sun, Nov 22', price: 18, couple: 32 },
    ],
    sessions: ['Nov 22', 'Nov 29', 'Dec 6', 'Dec 13'].map((d, i) => ({ id: `c${i}`, day: `Sun, ${d}`, time: '20:00', name: `Week ${i + 1}`, who: 'Alösha' })), save: false, heading: 'The course · 4 Sundays',
  },
  festival: {
    name: 'Munich Salsa Weekend', when: 'Fri–Sun, Dec 4–6 · Kesselhaus', meta: 'Salsa · Casino · Bachata · 24 workshops, 3 parties', door: false,
    passes: [
      { id: 'full', name: 'Full pass', detail: 'All workshops + 3 parties', price: 129, couple: null },
      { id: 'sat', name: 'Saturday pass', detail: 'Saturday workshops + party', price: 69, couple: null },
      { id: 'party', name: 'Party pass', detail: '3 parties, no workshops', price: 35, couple: null },
    ],
    sessions: [
      { id: 'f1', day: 'Sat, Dec 5', time: '12:00', name: 'Casino Partnerwork', who: 'Alösha' },
      { id: 'f2', day: 'Sat, Dec 5', time: '14:00', name: 'Bachata Musicality', who: 'Ana & Leo' },
      { id: 'f3', day: 'Sun, Dec 6', time: '12:00', name: 'Rueda de Casino', who: 'MontunoClub' },
    ], save: true, heading: 'Workshops',
  },
}
const K = computed(() => KINDS[kind.value])
const signedIn = computed(() => auth.value === 'signedIn')
const passes = computed(() => (isPaid.value ? K.value.passes : []))
const two = computed(() => role.value === 'partner')
const priceOf = (p: Pass) => (two.value ? (p.couple ?? p.price * 2) : p.price)
const priceLabel = (p: Pass) => (two.value ? (p.couple ? `€${p.couple} for two` : `2 × €${p.price} = €${p.price * 2}`) : `€${p.price}`)
const ePass = ref<string | null>(null)
const chosenPass = computed(() => passes.value.find(p => p.id === ePass.value) ?? (passes.value.length === 1 ? passes.value[0] : null))
const total = computed(() => (chosenPass.value ? priceOf(chosenPass.value) : 0))
type Step = 'role' | 'pass' | 'pay' | 'you'
const eSteps = computed(() => ([
  'role',
  passes.value.length > 1 ? 'pass' : null,
  passes.value.length ? 'pay' : null,
  'you', // signed in: just the phone (skipped when the account has one), else email + phone
] as (Step | null)[]).filter((s): s is Step => !!s))
const STEP_TITLE: Record<Step, string> = { role: 'How are you coming?', pass: 'Pick your pass', pay: 'Pay', you: 'Your contact' }
const ACCOUNT_EMAIL = 'alex@example.com' // the signed-in mock: an account with no phone yet
const eOpen = ref(false)
const eStep = ref<Step>('role')
const eEmail = ref('')
const eEmailError = ref('')
const eKeep = ref(false)
const ePhone = ref('')
const eState = ref<'idle' | 'in' | 'sent'>('idle')
const eSaved = ref<Set<string>>(new Set())
const stepIndex = (s: Step) => eSteps.value.indexOf(s)
const ctaLabel = computed(() => {
  if (!isPaid.value) return 'I’m coming'
  const min = Math.min(...K.value.passes.map(p => p.price))
  if (kind.value === 'festival') return `Get your pass · from €${min}`
  return K.value.passes.length > 1 ? `Sign up · from €${min}` : `Sign up · €${min}`
})
const summary = computed(() => [
  roleOf(role.value)?.short,
  chosenPass.value && passes.value.length > 1 ? chosenPass.value.name : null,
  chosenPass.value ? (pay.value === 'now' ? `paid €${total.value}` : `€${total.value} at the door`) : null,
].filter(Boolean).join(' · '))
function eStart() { eOpen.value = true; eStep.value = 'role' }
function eNext() {
  const i = stepIndex(eStep.value)
  if (i < eSteps.value.length - 1) { eStep.value = eSteps.value[i + 1]!; return }
  eFinish()
}
function eFinish() {
  if (pay.value === 'now') { checkout.value = true; return }
  eOpen.value = false
  eState.value = signedIn.value ? 'in' : 'sent'
}
function eRole(r: Role) { role.value = r; eNext() }
function ePick(id: string) { ePass.value = id; eNext() }
function ePay(p: 'now' | 'door') { pay.value = p; eNext() }
const ePhoneError = ref('')
const eName = ref('')
const eNameError = ref('')
const ePartner = ref('')
function eSubmit() {
  eNameError.value = !signedIn.value && eName.value.trim().split(/\s+/).filter(Boolean).length < 2 ? `Enter your first and last name, as ${EVENT.org} will see it.` : ''
  eEmailError.value = !signedIn.value && !/^\S+@\S+\.\S+$/.test(eEmail.value) ? 'Enter your email, so we can confirm your spot.' : ''
  ePhoneError.value = ePhone.value.replace(/\D/g, '').length < 7 ? `Enter your phone: ${EVENT.org} uses it for changes to this ${kind.value === 'festival' ? 'event' : 'class'} and its WhatsApp group.` : ''
  if (eNameError.value || eEmailError.value || ePhoneError.value) return
  eFinish()
}
const ACCOUNT_NAME = 'Alex Razbakov'
// Who's coming shows faces only to a signed-in viewer (rsvp.poll). Signing up signed out
// makes you signed in once the link is opened or Stripe sends you back.
const seesFaces = computed(() => signedIn.value || eState.value === 'in')

// ── Who's coming at festival scale (1,000 people) ───────────────────────────
// Never a list of everyone up front: a few faces picked for YOU (people you follow,
// then dancers who fit your answer), the totals, and "See all" = search + filters,
// paged from the server. Replaces both the poll's 60-name cap and GoingSection.
const FIRST = ['Anna', 'Marco', 'Lena', 'Juan', 'Sofia', 'Ivan', 'Mia', 'Leo', 'Nina', 'Omar', 'Clara', 'Tomas', 'Eva', 'Diego', 'Yuki', 'Paul', 'Rosa', 'Ali', 'Jana', 'Felix']
const CITIES = ['Munich', 'Vienna', 'Milan', 'Prague']
type Person = { id: string, name: string, photo: string, role: Role, city: string, friend: boolean }
const FEST_PEOPLE: Person[] = Array.from({ length: 60 }, (_, i) => ({
  id: `p${i}`,
  name: i < 20 ? FIRST[i]! : `${FIRST[i % 20]} ${String.fromCharCode(65 + (i % 26))}.`,
  photo: `https://i.pravatar.cc/80?u=fest${i}`,
  role: (['partner', 'needLeader', 'needFollower'] as Role[])[i % 3]!,
  city: CITIES[i % 4]!,
  friend: i < 3,
}))
const FEST_COUNTS: Record<Role, number> = { partner: 312, needLeader: 140, needFollower: 95 }
const whoRef = ref<HTMLElement | null>(null)
const isBig = computed(() => variant.value === 'E' && kind.value === 'festival')
const mineIn = computed(() => eState.value !== 'idle' && !!role.value)
const whoCounts = computed(() => {
  if (!isBig.value) return counts.value
  const c = { ...FEST_COUNTS }
  if (mineIn.value) c[role.value!]++
  return c
})
const whoTotal = computed(() => (isBig.value ? 1000 + (mineIn.value ? 1 : 0) : going.value))
// Who fits your answer: a follower looking for a leader ↔ a leader looking for a follower.
const fitRole = computed<Role | null>(() => (role.value === 'needLeader' ? 'needFollower' : role.value === 'needFollower' ? 'needLeader' : null))
const preview = computed(() => {
  const friends = FEST_PEOPLE.filter(p => p.friend)
  const fit = fitRole.value ? FEST_PEOPLE.filter(p => !p.friend && p.role === fitRole.value) : []
  const rest = FEST_PEOPLE.filter(p => !p.friend && !fit.includes(p))
  return [...friends, ...fit, ...rest].slice(0, 8)
})
const whoAllOpen = ref(false)
const whoQuery = ref('')
const whoFilter = ref<'all' | 'friends' | Role>('all')
const whoShown = ref(20)
const whoList = computed(() => FEST_PEOPLE.filter(p =>
  (whoFilter.value === 'all' || (whoFilter.value === 'friends' ? p.friend : p.role === whoFilter.value))
  && (!whoQuery.value || `${p.name} ${p.city}`.toLowerCase().includes(whoQuery.value.toLowerCase()))))
const roleWord = (r: Role) => (r === 'partner' ? 'couple' : r === 'needLeader' ? 'follower, needs a leader' : 'leader, needs a follower')
function openWhoAll(f: 'all' | 'friends' | Role = 'all') { whoFilter.value = f; whoQuery.value = ''; whoShown.value = 20; whoAllOpen.value = true }
watch([variant, kind, auth], () => { whoAllOpen.value = false })
const contactLine = computed(() => `${signedIn.value ? ACCOUNT_NAME : eName.value.trim()}${ePartner.value.trim() ? ` (+ ${ePartner.value.trim()})` : ''} · ${signedIn.value ? ACCOUNT_EMAIL : eEmail.value} · ${ePhone.value}`)
function eToggleSave(id: string) { const s = new Set(eSaved.value); s.has(id) ? s.delete(id) : s.add(id); eSaved.value = s }
watch([variant, device, paid, kind, auth], reset)

const isPaid = computed(() => paid.value === 'paid')
const counts = computed(() => {
  const c = { ...BASE }
  if (role.value) c[role.value]++
  return c
})
const going = computed(() => 1 + (role.value ? 1 : 0))
const maxVotes = computed(() => Math.max(1, ...Object.values(counts.value)))
const roleOf = (r: Role | null) => ROLES.find(x => x.id === r)
const signedUp = computed(() => !!role.value && (!isPaid.value || pay.value !== 'none'))

function pickRole(r: Role) { role.value = role.value === r ? null : r; if (!role.value) pay.value = 'none' }
function startSheet() { sheet.value = 'role' }
function sheetRole(r: Role) { role.value = r; sheet.value = isPaid.value ? 'pay' : 'done' }
function sheetPay(p: 'now' | 'door') { pay.value = p; sheet.value = 'done' }
function payNow() { checkout.value = true }
function finishCheckout() {
  pay.value = 'now'; checkout.value = false; sheet.value = sheet.value ? 'done' : null
  if (variant.value === 'E') { eOpen.value = false; eState.value = 'in' }
}
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Class sign-up · RAZ-995</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background">
          <button
            v-for="v in VARIANTS" :key="v.id" type="button"
            class="px-3 h-8 rounded-full text-sm font-bold transition-colors"
            :class="variant === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            :data-testid="`variant-${v.id}`"
            @click="variant = v.id"
          >{{ v.id === 'now' ? 'Now' : v.id }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button"
            class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="device = d"
          >{{ d }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="p in (['paid', 'free'] as const)" :key="p" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="paid === p ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="paid = p"
          >{{ p === 'paid' ? 'Paid' : 'Free' }}</button>
        </div>
        <div v-if="variant === 'E'" class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="k in (['class', 'course', 'festival'] as const)" :key="k" type="button"
            class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="kind === k ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :data-testid="`kind-${k}`"
            @click="kind = k"
          >{{ k }}</button>
        </div>
        <div v-if="variant === 'E'" class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="a in (['signedOut', 'signedIn'] as const)" :key="a" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="auth === a ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :data-testid="`auth-${a}`"
            @click="auth = a"
          >{{ a === 'signedOut' ? 'Signed out' : 'Signed in' }}</button>
        </div>
        <button type="button" class="text-xs font-semibold text-muted-foreground underline" @click="reset">Start over</button>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 text-xs leading-relaxed">
        <span class="font-bold">{{ current.id === 'now' ? 'Now' : current.id }} · {{ current.name }}.</span>
        <span class="text-muted-foreground"> {{ current.idea }}</span>
        <span class="text-wd-green-700"> Good: {{ current.good }}</span>
        <span class="text-wd-red-800"> Cost: {{ current.cost }}</span>
      </div>
    </div>

    <div class="py-6 px-4">
      <div
        class="relative mx-auto bg-background overflow-hidden font-display"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-4xl rounded-2xl border border-border shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '640px' }"
      >
        <div class="h-full overflow-y-auto" :class="isMobile ? 'px-4 py-5' : 'px-10 py-8'">
          <!-- ── Hero (shared) ───────────────────────────────────────────── -->
          <div class="flex gap-4" :class="isMobile ? 'flex-col' : ''">
            <div class="size-16 shrink-0 rounded-full bg-wd-red-900 grid place-items-center text-white font-black text-xl">MC</div>
            <div class="min-w-0 flex-1">
              <p class="font-hand text-secondary">— In 7 days</p>
              <template v-if="variant === 'E'">
                <h1 class="font-black leading-none" :class="isMobile ? 'text-4xl' : 'text-5xl'">{{ K.name }}</h1>
                <p class="mt-2 italic text-muted-foreground">{{ K.when }}</p>
                <p class="mt-1 text-sm font-sans text-muted-foreground">{{ K.meta }}</p>
              </template>
              <template v-else>
                <h1 class="font-black leading-none" :class="isMobile ? 'text-4xl' : 'text-5xl'">{{ EVENT.name }}</h1>
                <p class="mt-2 italic text-muted-foreground">{{ EVENT.day }} · {{ EVENT.time }} · {{ EVENT.venue }}</p>
                <p class="mt-1 text-sm font-sans text-muted-foreground">{{ EVENT.style }} · {{ EVENT.level }} · with {{ EVENT.teacher }}<template v-if="isPaid"> · €{{ EVENT.price }}</template></p>
              </template>

              <!-- ══ NOW: today's poll card ══ -->
              <template v-if="variant === 'now'">
                <span class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-wd-amber-100 px-3 py-1 text-sm font-sans font-bold text-secondary"><Users class="size-4" /> {{ going }} going</span>
                <div class="mt-4 max-w-xl rounded-2xl border border-border bg-card p-4 shadow-wd-card font-sans">
                  <p class="font-display text-lg mb-3">Going? · Sun 22 Nov</p>
                  <div class="space-y-1.5">
                    <button
                      v-for="o in ROLES" :key="o.id" type="button"
                      class="relative w-full overflow-hidden rounded-xl border text-left text-sm px-3 py-2.5 flex items-center gap-2"
                      :class="role === o.id ? 'border-primary' : 'border-border'"
                      @click="pickRole(o.id)"
                    >
                      <span class="absolute inset-y-0 left-0 bg-primary/10" :style="{ width: `${(counts[o.id] / maxVotes) * 100}%` }" />
                      <span class="relative w-4 h-4 rounded-full border-2 grid place-items-center shrink-0" :class="role === o.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'">
                        <Check v-if="role === o.id" class="w-3 h-3 text-primary-foreground" />
                      </span>
                      <span class="relative font-semibold">{{ o.label }}</span>
                      <span class="relative ml-auto text-xs font-bold text-muted-foreground">{{ counts[o.id] }}</span>
                    </button>
                  </div>
                  <template v-if="role">
                    <p class="mt-3 text-sm"><span class="font-bold text-wd-green-700">✓ You’re going · {{ roleOf(role)!.short }}</span> <span class="text-muted-foreground">· tap again to undo</span></p>
                    <button type="button" class="mt-3 text-sm font-bold text-primary inline-flex items-center gap-1" @click="showWho = !showWho">See who’s coming <ChevronDown class="size-4" /></button>
                    <p v-if="showWho" class="mt-1 text-sm">Rafael · You</p>
                    <p class="mt-3 text-sm flex items-center gap-2"><Share2 class="size-4 text-secondary" /> <span class="text-muted-foreground">Bring friends:</span> <span class="font-bold text-primary">share your week from My plan →</span></p>
                    <div class="mt-4 border-t border-border pt-3 text-sm"><span class="font-bold text-wd-green-700">✓ {{ EVENT.org }} can reach you</span> <span class="text-muted-foreground">· by email</span> <span class="font-bold text-primary">Stop sharing</span></div>
                    <div v-if="role !== 'partner'" class="mt-4 border-t border-border pt-3">
                      <p class="text-eyebrow font-black uppercase tracking-widest text-secondary mb-2">{{ role === 'needLeader' ? 'Leaders looking for a follower' : 'Followers looking for a leader' }}</p>
                      <p class="text-sm text-muted-foreground">Nobody to pair with yet. They show up here when they answer.</p>
                    </div>
                  </template>
                </div>
              </template>

              <!-- ══ A: one button, a sheet ══ -->
              <template v-else-if="variant === 'A'">
                <div class="mt-4 max-w-xl font-sans">
                  <div v-if="!signedUp" class="flex flex-wrap items-center gap-3">
                    <Button variant="cta" class="px-6" data-testid="a-join" @click="startSheet"><Ticket /> Join{{ isPaid ? ` · €${EVENT.price}` : '' }}</Button>
                    <span class="text-sm text-muted-foreground">{{ going }} going · {{ counts.needFollower }} leader looking for a follower</span>
                  </div>
                  <div v-else class="rounded-2xl border border-wd-green-600/30 bg-wd-green-600/10 px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" /> You’re in · {{ roleOf(role)!.short }}</span>
                    <span v-if="isPaid" class="text-sm text-muted-foreground">· {{ pay === 'now' ? 'paid €10' : 'pay €10 at the door' }}</span>
                    <button type="button" class="ml-auto text-sm font-bold text-primary" @click="startSheet">Change</button>
                  </div>
                </div>
              </template>

              <!-- ══ B: calm poll + price ══ -->
              <template v-else-if="variant === 'B'">
                <div class="mt-4 max-w-xl rounded-2xl border border-border bg-card p-4 shadow-wd-card font-sans">
                  <template v-if="!role">
                    <p class="font-display text-lg mb-3">Coming? <span class="text-sm font-sans text-muted-foreground">· {{ going }} going</span></p>
                    <div class="grid grid-cols-3 gap-2">
                      <button
                        v-for="o in ROLES" :key="o.id" type="button"
                        class="rounded-xl border border-border px-2 py-2.5 text-center hover:border-foreground/30"
                        :data-testid="`b-${o.id}`"
                        @click="pickRole(o.id)"
                      >
                        <span class="block text-sm font-bold">{{ o.chip }}</span>
                        <span class="block text-xs text-muted-foreground">{{ counts[o.id] ? `${counts[o.id]} ${o.id === 'needFollower' ? 'needs a follower' : o.id === 'needLeader' ? 'needs a leader' : 'couple'}` : '—' }}</span>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <p class="flex flex-wrap items-center gap-x-2">
                      <span class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" /> You’re going · {{ roleOf(role)!.short }}</span>
                      <button type="button" class="ml-auto text-sm font-bold text-primary" @click="pickRole(role!)">Change</button>
                    </p>
                  </template>
                  <div v-if="isPaid" class="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span class="font-display text-2xl font-black">€{{ EVENT.price }}</span>
                    <template v-if="pay === 'now'"><span class="text-sm font-bold text-wd-green-700 inline-flex items-center gap-1"><Check class="size-4" /> Paid</span></template>
                    <template v-else>
                      <span class="text-sm text-muted-foreground">or pay at the door</span>
                      <Button variant="cta" size="pill-sm" class="ml-auto" @click="payNow">Pay now <ArrowRight /></Button>
                    </template>
                  </div>
                  <div v-if="role" class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm border-t border-border pt-3">
                    <button type="button" class="font-bold" :class="fold === 'who' ? 'text-foreground' : 'text-primary'" @click="fold = fold === 'who' ? null : 'who'">Who’s coming ({{ going }})</button>
                    <button v-if="role !== 'partner'" type="button" class="font-bold" :class="fold === 'pair' ? 'text-foreground' : 'text-primary'" @click="fold = fold === 'pair' ? null : 'pair'">Find a {{ role === 'needLeader' ? 'leader' : 'follower' }}</button>
                    <button type="button" class="font-bold" :class="fold === 'touch' ? 'text-foreground' : 'text-primary'" @click="fold = fold === 'touch' ? null : 'touch'">Stay in touch</button>
                  </div>
                  <div v-if="fold" class="mt-2 text-sm text-muted-foreground">
                    <template v-if="fold === 'who'">Rafael (leader) · You</template>
                    <template v-else-if="fold === 'pair'">Nobody to pair with yet — they show up here when they answer.</template>
                    <template v-else>Let {{ EVENT.org }} keep in touch? <span class="font-bold text-primary">Share my email</span></template>
                  </div>
                </div>
              </template>

              <!-- ══ C: ticket first ══ -->
              <template v-else-if="variant === 'C'">
                <div class="mt-4 max-w-xl font-sans">
                  <template v-if="isPaid">
                    <div v-if="pay !== 'now'" class="flex flex-wrap items-center gap-3">
                      <Button variant="cta" class="px-6" data-testid="c-book" @click="payNow"><Ticket /> Book your spot · €{{ EVENT.price }}</Button>
                    </div>
                    <div v-else class="rounded-2xl border border-wd-green-600/30 bg-wd-green-600/10 px-4 py-3">
                      <span class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" /> Your spot is booked · {{ roleOf(role)?.short }}</span>
                      <p class="text-sm text-muted-foreground">The ticket is in your email and in My plan.</p>
                    </div>
                    <p class="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
                      <span class="flex -space-x-1.5"><img v-for="o in OTHERS" :key="o.name" :src="o.photo" class="size-6 rounded-full ring-2 ring-background" alt=""></span>
                      {{ going }} going · {{ counts.needFollower }} leader looking for a follower
                    </p>
                  </template>
                  <div v-else class="rounded-2xl border border-border bg-card p-4 shadow-wd-card">
                    <p class="text-sm text-muted-foreground mb-2">Free class — the poll stays as today:</p>
                    <div class="space-y-1.5">
                      <button v-for="o in ROLES" :key="o.id" type="button" class="w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold flex" :class="role === o.id ? 'border-primary bg-primary/10' : 'border-border'" @click="pickRole(o.id)">
                        {{ o.label }}<span class="ml-auto text-xs text-muted-foreground">{{ counts[o.id] }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </template>

              <!-- ══ D: two numbered steps ══ -->
              <template v-else-if="variant === 'D'">
                <div class="mt-4 max-w-xl rounded-2xl border border-border bg-card shadow-wd-card font-sans divide-y divide-border">
                  <!-- Step 1 -->
                  <div class="p-4">
                    <div v-if="!role">
                      <p class="flex items-center gap-2 font-bold"><span class="size-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs">1</span> I’m coming as…</p>
                      <div class="mt-3 grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
                        <button
                          v-for="o in ROLES" :key="o.id" type="button"
                          class="rounded-xl border border-border px-3 py-2.5 text-left hover:border-primary"
                          :data-testid="`d-${o.id}`"
                          @click="pickRole(o.id)"
                        >
                          <span class="block text-sm font-bold">{{ o.id === 'partner' ? 'A couple' : o.id === 'needLeader' ? 'Follower' : 'Leader' }}</span>
                          <span class="block text-xs text-muted-foreground">{{ o.id === 'partner' ? 'with my partner' : o.id === 'needLeader' ? 'need a leader' : 'need a follower' }}<template v-if="counts[o.id]"> · {{ counts[o.id] }} so far</template></span>
                        </button>
                      </div>
                    </div>
                    <p v-else class="flex items-center gap-2">
                      <span class="size-6 rounded-full bg-wd-green-600 text-white grid place-items-center"><Check class="size-3.5" /></span>
                      <span class="font-bold">Coming as {{ roleOf(role)!.short }}</span>
                      <button type="button" class="ml-auto text-sm font-bold text-primary" @click="pickRole(role!)">Change</button>
                    </p>
                  </div>
                  <!-- Step 2 -->
                  <div v-if="isPaid" class="p-4" :class="role ? '' : 'opacity-50'">
                    <div v-if="pay === 'none'">
                      <p class="flex items-center gap-2 font-bold"><span class="size-6 rounded-full grid place-items-center text-xs" :class="role ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">2</span> Pay €{{ EVENT.price }}</p>
                      <div class="mt-3 flex flex-wrap gap-2">
                        <Button variant="cta" size="pill-sm" :disabled="!role" data-testid="d-pay" @click="payNow">Pay now <ArrowRight /></Button>
                        <Button variant="outline-pill" size="pill-sm" :disabled="!role" @click="pay = 'door'">At the door</Button>
                      </div>
                    </div>
                    <p v-else class="flex items-center gap-2">
                      <span class="size-6 rounded-full grid place-items-center" :class="pay === 'now' ? 'bg-wd-green-600 text-white' : 'bg-wd-amber-100 text-secondary'"><Check class="size-3.5" /></span>
                      <span class="font-bold">{{ pay === 'now' ? 'Paid €10' : 'Paying €10 at the door' }}</span>
                      <button v-if="pay === 'door'" type="button" class="ml-auto shrink-0 whitespace-nowrap text-sm font-bold text-primary" @click="payNow">Pay now instead</button>
                    </p>
                  </div>
                  <p v-if="signedUp" class="px-4 py-3 text-sm font-bold text-wd-green-700 bg-wd-green-600/10 rounded-b-2xl">You’re signed up. {{ EVENT.org }} sees you on the list.</p>
                </div>
              </template>

              <!-- ══ E: A's one button → D's inline steps ══ -->
              <template v-else-if="variant === 'E'">
                <div class="mt-4 max-w-xl font-sans">
                  <template v-if="!eOpen">
                    <div v-if="eState === 'idle'" class="flex flex-wrap items-center gap-3">
                      <Button variant="cta" class="px-6" data-testid="e-cta" @click="eStart"><Ticket /> {{ ctaLabel }}</Button>
                      <!-- Just the count: the breakdown lives once, in Who's coming below -->
                      <a href="#who" class="text-sm font-bold text-secondary hover:underline" data-testid="e-going-link" @click.prevent="whoRef?.scrollIntoView({ behavior: 'smooth', block: 'start' })">{{ whoTotal.toLocaleString('en') }} going ↓</a>
                    </div>
                    <div v-else-if="eState === 'in'" class="rounded-2xl border border-wd-green-600/30 bg-wd-green-600/10 px-4 py-3 space-y-2" data-testid="e-in">
                      <p class="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" /> You’re in · {{ summary }}</span>
                        <button type="button" class="ml-auto text-sm font-bold text-primary" @click="eStart">Change</button>
                      </p>
                      <p class="text-sm text-muted-foreground" data-testid="e-contact-line">{{ EVENT.org }} has you on the list as {{ contactLine }}, for changes to this {{ kind === 'festival' ? 'event' : 'class' }} and its WhatsApp group.<template v-if="!signedIn"> Your ticket and a link to your new account are in your email.</template></p>
                    </div>
                    <div v-else class="rounded-2xl border border-wd-amber-500/40 bg-wd-amber-100 px-4 py-3 space-y-1" data-testid="e-sent">
                      <p class="font-bold text-foreground inline-flex items-center gap-1.5"><Mail class="size-4" /> Almost there: open the link we sent to {{ eEmail }}</p>
                      <p class="text-sm text-muted-foreground">It confirms your spot ({{ summary }}) and signs you in; new here, it makes your account, no password. Until then {{ EVENT.org }} sees you as unconfirmed for 48 h.</p>
                      <p class="text-sm flex gap-4"><button type="button" class="font-bold text-primary">Resend</button> <button type="button" class="font-bold text-primary" @click="eStart">Change</button> <button type="button" class="text-xs text-muted-foreground underline ml-auto" data-testid="e-open-link" @click="eState = 'in'">(sketch: I opened the link)</button></p>
                    </div>
                  </template>

                  <div v-else class="rounded-2xl border border-border bg-card shadow-wd-card divide-y divide-border" data-testid="e-card">
                    <div class="px-4 py-3 flex items-center">
                      <p class="font-display text-lg font-black">{{ isPaid ? (kind === 'festival' ? 'Get your pass' : 'Sign up') : 'I’m coming' }}</p>
                      <button type="button" class="ml-auto" aria-label="Close" @click="eOpen = false"><X class="size-5" /></button>
                    </div>
                    <div v-for="(s, i) in eSteps" :key="s" class="p-4" :class="i > stepIndex(eStep) ? 'opacity-50' : ''">
                      <!-- a finished step: one line -->
                      <p v-if="i < stepIndex(eStep)" class="flex items-center gap-2 text-sm">
                        <span class="size-6 rounded-full bg-wd-green-600 text-white grid place-items-center shrink-0"><Check class="size-3.5" /></span>
                        <span class="font-bold">
                          <template v-if="s === 'role'">{{ two ? 'With your partner · 2 people' : `Alone, as ${roleOf(role)?.short}` }}</template>
                          <template v-else-if="s === 'pass'">{{ chosenPass?.name }} · {{ chosenPass && priceLabel(chosenPass) }}</template>
                          <template v-else-if="s === 'pay'">{{ pay === 'now' ? `Pay now · €${total}` : `Pay €${total} at the door` }}</template>
                        </span>
                        <button type="button" class="ml-auto text-sm font-bold text-primary" @click="eStep = s">Change</button>
                      </p>
                      <!-- the current or a later step -->
                      <template v-else>
                        <p class="flex items-center gap-2 font-bold">
                          <span class="size-6 rounded-full grid place-items-center text-xs shrink-0" :class="i === stepIndex(eStep) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">{{ i + 1 }}</span>
                          {{ s === 'pay' && i === stepIndex(eStep) ? `Pay €${total}` : STEP_TITLE[s] }}
                        </p>
                        <template v-if="i === stepIndex(eStep)">
                          <div v-if="s === 'role'" class="mt-3 grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
                            <button
                              v-for="o in ROLES" :key="o.id" type="button"
                              class="rounded-xl border px-3 py-2.5 text-left hover:border-primary"
                              :class="role === o.id ? 'border-primary bg-primary/5' : 'border-border'"
                              :data-testid="`e-${o.id}`"
                              @click="eRole(o.id)"
                            >
                              <span class="block text-sm font-bold">{{ o.id === 'partner' ? 'With my partner' : o.id === 'needLeader' ? 'Alone, I follow' : 'Alone, I lead' }}</span>
                              <span class="block text-xs text-muted-foreground">{{ o.id === 'partner' ? '2 people' : o.id === 'needLeader' ? 'find me a leader' : 'find me a follower' }}<template v-if="counts[o.id]"> · {{ counts[o.id] }} so far</template></span>
                            </button>
                          </div>
                          <div v-else-if="s === 'pass'" class="mt-3 space-y-2">
                            <button
                              v-for="p in passes" :key="p.id" type="button"
                              class="w-full rounded-xl border px-3 py-2.5 text-left flex items-center gap-3 hover:border-primary"
                              :class="ePass === p.id ? 'border-primary bg-primary/5' : 'border-border'"
                              :data-testid="`e-pass-${p.id}`"
                              @click="ePick(p.id)"
                            >
                              <span class="min-w-0"><span class="block text-sm font-bold">{{ p.name }}</span><span class="block text-xs text-muted-foreground">{{ p.detail }}</span></span>
                              <span class="ml-auto text-right shrink-0"><span class="block font-display text-lg font-black">€{{ priceOf(p) }}</span><span v-if="two" class="block text-xs text-muted-foreground">{{ p.couple ? `for two · saves €${p.price * 2 - p.couple}` : `2 × €${p.price}` }}</span></span>
                            </button>
                          </div>
                          <div v-else-if="s === 'pay'" class="mt-3">
                            <p v-if="passes.length === 1 && chosenPass" class="text-sm text-muted-foreground mb-3">{{ chosenPass.name }} · {{ chosenPass.detail }} · {{ priceLabel(chosenPass) }}</p>
                            <div class="flex flex-wrap gap-2">
                              <Button variant="cta" size="pill-sm" data-testid="e-pay-now" @click="ePay('now')">Pay now <ArrowRight /></Button>
                              <Button v-if="K.door" variant="outline-pill" size="pill-sm" data-testid="e-pay-door" @click="ePay('door')">At the door</Button>
                            </div>
                            <p v-if="!K.door" class="mt-2 text-xs text-muted-foreground">{{ EVENT.org }} sells these passes online only.</p>
                          </div>
                          <form v-else-if="s === 'you'" class="mt-3 space-y-3" novalidate @submit.prevent="eSubmit">
                            <div v-if="!signedIn">
                              <Input v-model="eName" type="text" placeholder="First and last name" autocomplete="name" aria-label="First and last name" data-testid="e-name" />
                              <p v-if="eNameError" class="mt-1 text-xs font-bold text-primary">{{ eNameError }}</p>
                            </div>
                            <div v-if="!signedIn">
                              <Input v-model="eEmail" type="email" placeholder="Email" autocomplete="email" aria-label="Email" data-testid="e-email" />
                              <p v-if="eEmailError" class="mt-1 text-xs font-bold text-primary">{{ eEmailError }}</p>
                              <p class="mt-1 text-xs text-muted-foreground">
                                No password: we email you a link{{ pay === 'now' ? ' after you pay, with your ticket' : ' that confirms your spot' }}.
                                Signed up before? Use the same email, it signs you in.
                              </p>
                            </div>
                            <p v-else class="text-sm text-muted-foreground"><span class="font-bold text-foreground">{{ ACCOUNT_NAME }}</span> · {{ ACCOUNT_EMAIL }} (your account)</p>
                            <div>
                              <Input v-model="ePhone" type="tel" placeholder="Phone / WhatsApp" autocomplete="tel" aria-label="Phone or WhatsApp" data-testid="e-phone" />
                              <p v-if="ePhoneError" class="mt-1 text-xs font-bold text-primary">{{ ePhoneError }}</p>
                              <p v-if="signedIn" class="mt-1 text-xs text-muted-foreground">Saved to your account, so next time this step is skipped.</p>
                            </div>
                            <div v-if="two">
                              <Input v-model="ePartner" type="text" placeholder="Your partner’s name (optional)" aria-label="Your partner’s name (optional)" data-testid="e-partner-name" />
                            </div>
                            <p class="text-xs text-muted-foreground rounded-lg bg-muted/60 px-3 py-2">
                              {{ EVENT.org }} gets your name, email and phone for this {{ kind === 'festival' ? 'event' : 'class' }} only: changes, cancellations, and checking who joins its WhatsApp group.
                            </p>
                            <label class="flex items-start gap-2 text-sm"><input v-model="eKeep" type="checkbox" class="mt-0.5 accent-primary" data-testid="e-keep"> <span>Also tell me about {{ EVENT.org }}’s next {{ kind === 'festival' ? 'events' : 'classes' }}</span></label>
                            <Button type="submit" :variant="pay === 'now' ? 'cta' : 'pill'" class="w-full" data-testid="e-submit">
                              {{ pay === 'now' ? `Continue to payment · €${total}` : 'Save my spot' }} <ArrowRight />
                            </Button>
                          </form>
                        </template>
                      </template>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- D: who's coming lives under the hero, not in the card -->
          <section v-if="variant === 'D' || variant === 'E'" id="who" ref="whoRef" class="mt-8 font-sans scroll-mt-4">
            <h2 class="font-display text-2xl font-black">Who’s coming <span class="font-hand text-secondary text-lg">— {{ whoTotal.toLocaleString('en') }}</span></h2>
            <!-- As rsvp.poll does: faces only for a signed-in viewer (confirmed answers, public profiles, first name).
                 A visitor sees counts. In E, finishing the steps signs you in (magic link / back from Stripe). -->
            <div v-if="variant === 'E' && !seesFaces" class="mt-3" data-testid="who-anon">
              <div class="flex items-center gap-3">
                <span class="flex -space-x-2" aria-hidden="true">
                  <span v-for="n in Math.min(whoTotal, 5)" :key="n" class="size-9 rounded-full bg-muted ring-2 ring-background grid place-items-center"><Users class="size-4 text-muted-foreground" /></span>
                </span>
                <span class="text-sm text-muted-foreground">{{ whoCounts.needFollower }} {{ whoCounts.needFollower === 1 ? 'leader looks' : 'leaders look' }} for a follower<template v-if="whoCounts.needLeader"> · {{ whoCounts.needLeader }} {{ whoCounts.needLeader === 1 ? 'follower looks' : 'followers look' }} for a leader</template><template v-if="whoCounts.partner"> · {{ whoCounts.partner }} {{ whoCounts.partner === 1 ? 'couple' : 'couples' }}</template></span>
              </div>
              <p class="mt-2 text-sm">
                <template v-if="eState === 'sent'"><span class="text-muted-foreground">Open the link in your email to see who they are.</span></template>
                <template v-else><span class="text-muted-foreground">Sign up to see who they are</span> · <button type="button" class="font-bold text-primary" data-testid="who-sign-in">Sign in</button></template>
              </p>
            </div>
            <!-- Festival scale: a few faces picked for you, totals, then search -->
            <div v-else-if="isBig" class="mt-3 space-y-4" data-testid="who-big">
              <div>
                <div class="flex items-center gap-3 flex-wrap">
                  <span class="flex -space-x-2">
                    <img v-for="p in preview" :key="p.id" :src="p.photo" :alt="p.name" :title="p.name" class="size-10 rounded-full ring-2 ring-background object-cover">
                  </span>
                  <span class="text-sm font-bold">+{{ (whoTotal - preview.length).toLocaleString('en') }}</span>
                </div>
                <p class="mt-2 text-sm"><span class="font-bold">Anna, Marco and Lena</span> <span class="text-muted-foreground">are going — people you follow.</span></p>
              </div>
              <p class="text-sm text-muted-foreground">{{ whoCounts.partner }} couples · {{ whoCounts.needLeader }} followers need a leader · {{ whoCounts.needFollower }} leaders need a follower</p>

              <div v-if="fitRole" class="rounded-2xl border border-border bg-card p-4" data-testid="who-fit">
                <p class="text-eyebrow font-black uppercase tracking-widest text-secondary">{{ fitRole === 'needFollower' ? 'Leaders looking for a follower' : 'Followers looking for a leader' }} · {{ whoCounts[fitRole] }}</p>
                <ul class="mt-2 space-y-2">
                  <li v-for="p in FEST_PEOPLE.filter(x => x.role === fitRole).slice(0, 4)" :key="p.id" class="flex items-center gap-3 text-sm">
                    <img :src="p.photo" class="size-9 rounded-full" alt=""> <span class="font-bold">{{ p.name }}</span> <span class="text-muted-foreground">{{ p.city }}</span>
                    <Button variant="outline-pill" size="pill-sm" class="ml-auto"><Hand /> Wave</Button>
                  </li>
                </ul>
                <button type="button" class="mt-2 text-sm font-bold text-primary" @click="openWhoAll(fitRole)">See all {{ whoCounts[fitRole] }}</button>
              </div>

              <Button variant="outline-pill" size="pill-sm" data-testid="who-see-all" @click="openWhoAll()"><Users /> See all {{ whoTotal.toLocaleString('en') }}</Button>

              <div v-if="whoAllOpen" class="rounded-2xl border border-border bg-card p-4" data-testid="who-all">
                <div class="flex items-center gap-2">
                  <Input v-model="whoQuery" type="search" placeholder="Search a name or city" aria-label="Search who's coming" class="flex-1" data-testid="who-search" @input="whoShown = 20" />
                  <button type="button" aria-label="Close" @click="whoAllOpen = false"><X class="size-5" /></button>
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <button
                    v-for="f in ([['all', 'All'], ['friends', 'People you follow'], ['partner', 'Couples'], ['needLeader', 'Need a leader'], ['needFollower', 'Need a follower']] as const)" :key="f[0]" type="button"
                    class="px-3 h-7 rounded-full border font-semibold"
                    :class="whoFilter === f[0] ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'"
                    :data-testid="`who-filter-${f[0]}`"
                    @click="whoFilter = f[0]; whoShown = 20"
                  >{{ f[1] }}</button>
                </div>
                <ul class="mt-3 grid gap-2" :class="isMobile ? 'grid-cols-1' : 'grid-cols-2'">
                  <li v-for="p in whoList.slice(0, whoShown)" :key="p.id" class="flex items-center gap-2 text-sm">
                    <img :src="p.photo" class="size-8 rounded-full" alt=""> <span class="font-bold">{{ p.name }}</span>
                    <span class="text-xs text-muted-foreground truncate">{{ roleWord(p.role) }} · {{ p.city }}</span>
                  </li>
                </ul>
                <p v-if="!whoList.length" class="mt-2 text-sm text-muted-foreground">Nobody by that name.</p>
                <button v-if="whoList.length > whoShown" type="button" class="mt-3 text-sm font-bold text-primary" data-testid="who-more" @click="whoShown += 20">Show 20 more</button>
                <p class="mt-2 text-xs text-muted-foreground">Sketch: 60 mock dancers; the real list pages through all {{ whoTotal.toLocaleString('en') }} from the server.</p>
              </div>
            </div>
            <ul v-else class="mt-3 flex flex-wrap gap-4" data-testid="who-faces">
              <li v-for="o in OTHERS" :key="o.name" class="flex flex-wrap items-center gap-2 text-sm font-bold">
                <img :src="o.photo" class="size-9 rounded-full" alt=""> {{ o.name }} <span class="text-xs font-normal text-muted-foreground">leader, needs a follower</span>
                <Button v-if="role === 'needLeader'" variant="outline-pill" size="pill-sm"><Hand /> Wave</Button>
              </li>
              <li v-if="variant === 'E' ? eState !== 'idle' : role" class="flex items-center gap-2 text-sm font-bold"><span class="size-9 rounded-full bg-secondary text-white grid place-items-center">Y</span> You</li>
            </ul>
            <p v-if="variant === 'D' && signedUp" class="mt-3 text-sm"><span class="text-muted-foreground">Let {{ EVENT.org }} tell you about the next class?</span> <span class="font-bold text-primary inline-flex items-center gap-1"><Mail class="size-3.5" /> Share my email</span></p>
          </section>

          <!-- ── Schedule (shared; Save only today) ─────────────────────── -->
          <!-- E: the programme of a class / course / festival -->
          <section v-if="variant === 'E'" class="mt-10">
            <h2 class="text-2xl font-black border-b border-border pb-2">{{ K.heading }}</h2>
            <div v-for="s in K.sessions" :key="s.id" class="mt-3 rounded-2xl border border-border bg-card p-4 flex items-center gap-4 font-sans">
              <div class="text-center shrink-0 w-16"><p class="text-xs text-muted-foreground">{{ s.day }}</p><p class="font-display text-xl font-black text-secondary">{{ s.time }}</p></div>
              <div class="min-w-0 flex-1">
                <p class="font-display text-lg font-black">{{ s.name }}</p>
                <p class="text-sm italic text-secondary">{{ s.who }}</p>
              </div>
              <Button v-if="K.save" :variant="eSaved.has(s.id) ? 'pill' : 'outline-pill'" size="pill-sm" @click="eToggleSave(s.id)"><Star :class="eSaved.has(s.id) ? 'fill-current' : ''" /> {{ eSaved.has(s.id) ? 'Saved' : 'Save' }}</Button>
            </div>
            <p class="mt-2 text-xs font-sans text-muted-foreground">
              <template v-if="kind === 'festival'">Many workshops: each row keeps Save (what you want to take); the pass up top is what gets you in.</template>
              <template v-else-if="kind === 'course'">The dates of the course. One class only? Pick "Just one class" when you sign up.</template>
              <template v-else>One session = the class itself, so no Save here: signing up puts it on My plan.</template>
            </p>
          </section>

          <section v-if="variant !== 'E'" class="mt-10">
            <h2 class="text-2xl font-black border-b border-border pb-2">{{ EVENT.day.replace('Sun', 'Sunday') }}</h2>
            <div class="mt-3 rounded-2xl border border-border bg-card p-4 flex items-start gap-4 font-sans" :class="isMobile ? 'flex-wrap' : ''">
              <div class="text-center shrink-0"><p class="font-display text-xl font-black text-secondary">20:00</p><p class="text-xs text-muted-foreground">–21:00</p></div>
              <div class="min-w-0 flex-1">
                <p class="flex gap-1.5"><span class="rounded-full bg-muted px-2 py-0.5 text-eyebrow font-bold uppercase">Casino</span><span class="rounded-full bg-wd-amber-100 px-2 py-0.5 text-eyebrow font-bold uppercase text-secondary">🌶️🌶️ Intermediate</span></p>
                <p class="mt-1 font-display text-lg font-black">{{ EVENT.name }}</p>
                <p class="text-sm italic text-secondary">{{ EVENT.teacher }}</p>
              </div>
              <Button v-if="variant === 'now'" :variant="saved ? 'pill' : 'outline-pill'" size="pill-sm" @click="saved = !saved"><Star :class="saved ? 'fill-current' : ''" /> {{ saved ? 'Saved' : 'Save' }}</Button>
            </div>
            <p v-if="variant !== 'now'" class="mt-2 text-xs font-sans text-muted-foreground">One session = the class itself, so the row has no Save (signing up above already puts it on My plan). A festival with many sessions keeps Save.</p>
          </section>

          <!-- ── Passes: today only (A–D fold the price into the sign-up) ── -->
          <section v-if="variant === 'now' && isPaid" class="mt-10">
            <p class="text-xs uppercase tracking-[0.3em] text-secondary">Passes</p>
            <h2 class="mt-2 text-2xl font-black">Pick your <em class="italic text-primary">pass.</em></h2>
            <div class="mt-4 max-w-xs rounded-2xl border border-border bg-card p-5 font-sans">
              <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Workshop</p>
              <p class="mt-2 font-display text-4xl font-black">€10</p>
              <span class="mt-1 inline-block rounded-full bg-wd-green-600/10 px-2 py-0.5 text-eyebrow font-bold uppercase text-wd-green-700">All days</span>
              <Button variant="cta" class="mt-4 w-full h-11 text-xs" @click="payNow">Get this pass <ArrowRight /></Button>
            </div>
          </section>

          <section class="mt-10 font-sans">
            <h2 class="font-display text-2xl font-black">Venue</h2>
            <p class="mt-2 flex items-center gap-2 text-sm"><MapPin class="size-4 text-secondary" /> {{ EVENT.venue }} · {{ EVENT.address }}</p>
          </section>
        </div>

        <!-- A: the sheet, inside the frame -->
        <div v-if="variant === 'A' && sheet" class="absolute inset-0 z-20 bg-foreground/40 flex font-sans" :class="isMobile ? 'items-end' : 'items-center justify-center'" @click.self="sheet = null">
          <div class="bg-background w-full p-5 shadow-xl" :class="isMobile ? 'rounded-t-3xl' : 'max-w-md rounded-2xl'">
            <div class="flex items-center">
              <p class="font-display text-xl font-black">{{ sheet === 'role' ? 'How are you coming?' : sheet === 'pay' ? `Pay €${EVENT.price}` : 'You’re in!' }}</p>
              <button type="button" class="ml-auto" aria-label="Close" @click="sheet = null"><X class="size-5" /></button>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">{{ EVENT.name }} · {{ EVENT.day }}, 20:00</p>
            <div v-if="sheet === 'role'" class="mt-4 space-y-2">
              <button v-for="o in ROLES" :key="o.id" type="button" class="w-full rounded-xl border border-border px-3 py-3 text-left flex items-center hover:border-primary" :data-testid="`a-${o.id}`" @click="sheetRole(o.id)">
                <span class="font-bold text-sm">{{ o.label }}</span>
                <span class="ml-auto text-xs text-muted-foreground">{{ counts[o.id] ? `${counts[o.id]} so far` : '' }}</span>
                <ChevronRight class="size-4 ml-2 text-muted-foreground" />
              </button>
            </div>
            <div v-else-if="sheet === 'pay'" class="mt-4 space-y-2">
              <Button variant="cta" class="w-full" data-testid="a-pay-now" @click="payNow">Pay €{{ EVENT.price }} now <ArrowRight /></Button>
              <Button variant="outline-pill" class="w-full" @click="sheetPay('door')">I’ll pay at the door</Button>
              <button type="button" class="block mx-auto text-xs text-muted-foreground underline" @click="sheet = 'role'">Back</button>
            </div>
            <div v-else class="mt-4 space-y-3 text-sm">
              <p class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" /> Coming as {{ roleOf(role)?.short }}<template v-if="isPaid"> · {{ pay === 'now' ? 'paid' : 'pay at the door' }}</template></p>
              <p class="text-muted-foreground">It’s on My plan. {{ role === 'needFollower' ? 'No follower is looking yet — we’ll show you when one answers.' : role === 'needLeader' ? 'Rafael leads and needs a follower:' : '' }}</p>
              <p v-if="role === 'needLeader'" class="flex items-center gap-2"><img :src="OTHERS[0].photo" class="size-8 rounded-full" alt=""> <span class="font-bold">Rafael</span> <Button variant="outline-pill" size="pill-sm" class="ml-auto"><Hand /> Wave</Button></p>
              <label class="flex items-center gap-2"><input type="checkbox" class="accent-primary" checked> Let {{ EVENT.org }} tell me about the next class</label>
              <Button variant="pill" class="w-full" @click="sheet = null">Done</Button>
            </div>
          </div>
        </div>

        <!-- Mock checkout (B / C / D / Now) -->
        <div v-if="checkout" class="absolute inset-0 z-30 bg-foreground/40 flex items-center justify-center font-sans p-4" @click.self="checkout = false">
          <div class="bg-background w-full max-w-sm rounded-2xl p-5 shadow-xl">
            <p class="font-display text-xl font-black">Checkout · €{{ variant === 'E' ? total : EVENT.price }}</p>
            <p class="text-xs text-muted-foreground">Stripe, as today.</p>
            <p v-if="variant === 'E'" class="mt-2 text-sm">{{ K.name }} · {{ chosenPass?.name }}{{ two ? ' · 2 people' : '' }}<template v-if="!signedIn"><br><span class="text-muted-foreground">Receipt to {{ eEmail }}; the account is made from this email.</span></template></p>
            <div v-if="variant === 'C'" class="mt-4">
              <p class="text-sm font-bold mb-2">How are you coming?</p>
              <div class="space-y-1.5">
                <button v-for="o in ROLES" :key="o.id" type="button" class="w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold" :class="role === o.id ? 'border-primary bg-primary/10' : 'border-border'" :data-testid="`c-${o.id}`" @click="role = o.id">{{ o.label }}</button>
              </div>
            </div>
            <Button variant="cta" class="mt-4 w-full" :disabled="variant === 'C' && !role" data-testid="checkout-pay" @click="finishCheckout">Pay €{{ EVENT.price }}</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
