<script setup lang="ts">
/**
 * Signing up for a class, course or event (RAZ-995) — the one button in the hero, in place of the
 * old poll (EventRsvpPoll, removed) and the separate "Pick your pass" section. It opens the steps right there:
 *
 *   ① How are you coming?  the poll's answers (with my partner = two people)
 *   ② Pick your pass        only when there's more than one priced pass
 *   ③ Pay                   now (Stripe), or at the door when the organiser allows it
 *   ④ Your contact          signed out: name, email, phone · signed in: a review card
 *
 * A finished step folds to one line with "Change"; afterwards the hero shows one line, "Spot booked · …".
 * The organiser gets name, email and phone for this event; "Also tell me about next ones" is a separate,
 * unticked opt-in. Signed out, the sign-up is saved unconfirmed and a magic link confirms it (and, for
 * "Pay now", comes back with ?pay=now to continue to checkout). Rules: shared/utils/eventSignup.ts;
 * server: rsvp.signUp. Who's coming lives below the hero (EventWhosComing), fed by this poll.
 */
import { ArrowRight, Check, Mail, Ticket, X } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { signupGuestSchema, signupMemberSchema } from '#shared/validation'
import { rsvpOptions, type RsvpAnswer } from '#shared/utils/rsvp'
import { entryNoun, entryWords } from '#shared/utils/entryWord'
import { chosenPass, noPassForRole, passFor, passPriceLabel, passTotal, passesFor, peopleFor, pricedPasses, signupCta, signupState, signupNeedsPhone, signupSteps, type PayMethod, type SignupStep } from '#shared/utils/eventSignup'
import type { FestivalPass } from '#shared/types/festivalDetails'
import { sizedImage, IMG } from '#shared/utils/image'
import { includesLine, passCovers } from '#shared/utils/yourNight'

const props = defineProps<{
  /** Event id (or its /events/<param>). */
  eventId: string
  /** The event page path the magic link returns to. */
  path: string
  startDate: string
  endDate?: string | null
  timezone?: string | null
  organizerName?: string | null
  surface: string
  /** The event's passes (events.festival.passes); none = no pass and pay steps. */
  passes?: FestivalPass[]
  payAtDoor?: boolean
  /** The key ticketCheckout knows the passes by (events.festival.key). */
  passKey?: string | null
  /** This dancer already holds a paid ticket (festival sign-up with a verified ticket). */
  hasTicket?: boolean
  /** events.type: a class / course asks for the phone (signupNeedsPhone). A festival type says "pass". */
  eventType?: string | null
  /** Saved events.isFestival, when the page knows it. A festival says "pass"; a party or class says "ticket". */
  isFestival?: boolean
  /** A night's programme (RAZ-1007): each pass says what it includes. Empty = not a night. */
  programme?: { id: string; date: string; time: string; duration: number; type: any; title?: string }[]
  /** The page already lists the whole programme above: a pass that covers all of it needs no "Includes" line. */
  programmeShown?: boolean
  /** Programme items already on the dancer's plan: they pick the pass that fits. */
  plannedIds?: string[]
  /** A festival's pick: of these passes, the one covering the workshops on the dancer's plan. */
  recommend?: (passes: FestivalPass[]) => string | null
  /** Nobody on WeDance takes bookings for it (RAZ-1007): the button says where it comes from instead. */
  notBookable?: { imported: boolean; from?: string | null; checkedAt?: string | null } | null
}>()

type Poll = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['rsvp']['poll']['query']>>
const emit = defineEmits<{ poll: [Poll] }>()

const { $trpc } = useNuxtApp()
const { isSignedIn, requestMagicLink } = useAuth()
const route = useRoute()
const router = useRouter()

const poll = ref<Poll | null>(null)
const passes = computed(() => props.passes ?? [])
// A festival sells passes; a party or class sells tickets — the same word as the editor (RAZ-1029).
const words = computed(() => entryWords(entryNoun({ type: props.eventType, isFestival: props.isFestival })))
const priced = computed(() => pricedPasses(passes.value))
// The steps follow how you're coming: a festival sells passes per role, so a follower
// on their own is offered follower passes, a couple the couple passes, priced once for both.
const steps = computed(() => signupSteps({ passes: passes.value, answer: answer.value }))
const mine = computed(() => poll.value?.mine ?? null)
const state = computed(() => signupState(mine.value))
const coming = computed(() => state.value !== 'book')
const me = computed(() => poll.value?.me ?? null)
const org = computed(() => props.organizerName || 'The organiser')
const ended = computed(() => {
  const end = props.endDate ? new Date(props.endDate) : new Date(new Date(props.startDate).getTime() + 3 * 3600_000)
  return end.getTime() < Date.now()
})

// The answers as "how are you coming", without "Next time".
const partnerDance = computed(() => poll.value?.partner ?? true)
const roleOptions = computed(() => rsvpOptions(partnerDance.value).filter(o => o.id !== 'next').map(o => ({
  ...o,
  title: o.id === 'partner' ? (partnerDance.value ? 'With my partner' : 'With a friend')
    : o.id === 'needLeader' ? 'Alone, I follow' : o.id === 'needFollower' ? 'Alone, I lead' : 'Just me',
  sub: o.id === 'partner' ? '2 people' : o.id === 'needLeader' ? 'find me a leader' : o.id === 'needFollower' ? 'find me a follower' : '1 person',
})))
const roleShort = (a: RsvpAnswer | null | undefined) => (a === 'partner' ? (partnerDance.value ? 'with your partner' : 'with a friend')
  : a === 'needLeader' ? 'follower' : a === 'needFollower' ? 'leader' : '')
// The folded first step: "With your partner · 2 people", "Alone, as leader", "Just you".
const roleLine = (a: RsvpAnswer | null | undefined) => (a === 'partner' ? `${partnerDance.value ? 'With your partner' : 'With a friend'} · 2 people`
  : a === 'yes' ? 'Just you' : `Alone, as ${roleShort(a)}`)

// ── The steps' draft (the saved sign-up fills it when changing) ───────────────
const open = ref(false)
const step = ref<SignupStep>('role')
const answer = ref<RsvpAnswer | null>(null)
const passName = ref<string | null>(null)
const pay = ref<PayMethod | null>(null)
const keepInTouch = ref(false)
const editingPhone = ref(false)
const people = computed(() => peopleFor(answer.value))
const fitting = computed(() => (answer.value ? passesFor(passes.value, answer.value) : priced.value))
const noneForRole = computed(() => noPassForRole(passes.value, answer.value))
const pass = computed(() => chosenPass(passes.value, passName.value, answer.value))
const total = computed(() => (pass.value ? passTotal(pass.value, people.value) : 0))
const stepIndex = (s: SignupStep) => steps.value.indexOf(s)

const form = reactive({ name: '', email: '', phone: '', partnerName: '' })
const needsPhone = computed(() => signupNeedsPhone({ type: props.eventType, passes: passes.value }))
const schema = computed(() => (isSignedIn.value ? signupMemberSchema(needsPhone.value) : signupGuestSchema(needsPhone.value)))
const { errors, validate, fieldAttrs, reset } = useFormValidation(schema, form)
// Signed in with a phone on the account: nothing to type unless they choose Edit.
const phoneKnown = computed(() => isSignedIn.value && !!me.value?.phone && !editingPhone.value)
const phonePlaceholder = computed(() => (needsPhone.value ? 'Phone / WhatsApp' : 'Phone / WhatsApp (optional)'))

// RAZ-1007: a night's passes say what they include; the one covering what you planned is suggested.
const programmeItems = computed(() => props.programme ?? [])
const includesOf = (p: FestivalPass | null) => programmeItems.value.length ? includesLine(p, programmeItems.value) : ''
/** The "Includes" line under the button: left out when it would only repeat the programme card. */
const includesUnderButton = computed(() => {
  const p = priced.value[0] ?? null
  if (props.programmeShown && passCovers(p, programmeItems.value).length === passCovers(null, programmeItems.value).length) return ''
  return includesOf(p)
})
const fitsPlan = computed(() => {
  const want = (props.plannedIds ?? []).filter(id => programmeItems.value.some(s => s.id === id))
  if (!want.length) return props.recommend?.(fitting.value.filter(p => !p.soldOut)) ?? null
  return fitting.value.filter(p => !p.soldOut)
    .filter(p => { const c = new Set(passCovers(p, programmeItems.value).map(s => s.id)); return want.every(id => c.has(id)) })
    .sort((a, b) => Number(a.price) - Number(b.price))[0]?.name ?? null
})

/** Open the steps; `withPass` picks a pass up front ("Not in your pass · +€7" on Your night). */
// "Book my spot" on an event nobody here takes bookings for: where it comes from, not the steps.
const showImported = ref(false)

function start(withPass?: string) {
  justCancelled.value = false
  if (props.notBookable && !coming.value) {
    showImported.value = !showImported.value
    if (showImported.value) useTrack().track('event_signup_opened', { surface: props.surface, event_id: poll.value?.eventId, changing: false, not_bookable: true })
    return
  }
  const s = mine.value?.signup
  answer.value = coming.value ? mine.value!.answer : null
  passName.value = (typeof withPass === 'string' ? withPass : null) ?? s?.pass ?? fitsPlan.value ?? null
  pay.value = s?.pay ?? null
  keepInTouch.value = s?.keepInTouch ?? false
  form.partnerName = s?.partnerName ?? ''
  form.phone = s?.phone ?? me.value?.phone ?? ''
  editingPhone.value = false
  reset()
  error.value = ''
  step.value = 'role'
  open.value = true
  useTrack().track('event_signup_opened', { surface: props.surface, event_id: poll.value?.eventId, changing: coming.value })
}
function next() {
  const i = stepIndex(step.value)
  if (i < steps.value.length - 1) step.value = steps.value[i + 1]!
}
function pickRole(a: RsvpAnswer) {
  answer.value = a
  // A pass picked for another way of coming (or the only one left) is redone for this one.
  if (passName.value && !fitting.value.some(p => p.name === passName.value)) passName.value = fitsPlan.value
  if (!passName.value && fitting.value.length === 1 && !noneForRole.value) passName.value = fitting.value[0]!.name
  next()
}
function pickPass(name: string) { passName.value = name; next() }
function pickPay(p: PayMethod) { pay.value = p; next() }

// ── Poll ─────────────────────────────────────────────────────────────────────
const GUEST_KEY = 'wd-rsvp-guest'
function guestToken(): string | undefined {
  if (!import.meta.client) return undefined
  let t = localStorage.getItem(GUEST_KEY)
  if (!t) { t = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, t) }
  return t
}
function setPoll(p: Poll) { poll.value = p; emit('poll', p) }
async function load() {
  try { setPoll(await $trpc.rsvp.poll.query({ event: props.eventId, guestToken: guestToken() })) }
  catch { /* the page still works without it */ }
}
onMounted(async () => {
  await load()
  // Back from the magic link after "Pay now" while signed out: continue to checkout.
  if (route.query.pay === 'now') {
    router.replace({ query: { ...route.query, pay: undefined } })
    const s = mine.value?.signup
    if (isSignedIn.value && mine.value?.confirmed && s?.pay === 'now' && s.pass && !props.hasTicket) await checkout(s.pass, peopleFor(mine.value.answer))
  }
})
watch(isSignedIn, load)

// ── Submit ───────────────────────────────────────────────────────────────────
const busy = ref(false)
const error = ref('')
const sentTo = ref('')
const showSignIn = ref(false)
async function submit() {
  if (busy.value || !answer.value) return
  const result = validate()
  if (!result.success) return
  const data = result.data as { name?: string, email?: string, phone: string, partnerName?: string }
  const phone = phoneKnown.value ? me.value!.phone! : (data.phone || '')
  busy.value = true; error.value = ''
  const signedIn = isSignedIn.value
  try {
    const p = await $trpc.rsvp.signUp.mutate({
      event: props.eventId,
      answer: answer.value,
      guestToken: guestToken(),
      ...(pass.value ? { pass: pass.value.name, pay: pay.value ?? undefined } : {}),
      ...(signedIn ? {} : { name: data.name }),
      phone,
      ...(answer.value === 'partner' && data.partnerName ? { partnerName: data.partnerName } : {}),
      keepInTouch: keepInTouch.value,
    })
    setPoll(p)
    if (signedIn) useWeekPlan().syncEvent(p.eventId, true)
    useTrack().track('event_signed_up', {
      answer: answer.value, signed_in: signedIn, has_pass: !!pass.value, pay: pay.value, people: people.value,
      keep_in_touch: keepInTouch.value, surface: props.surface, event_id: p.eventId,
    })
    if (!signedIn) {
      // The link confirms it; after "Pay now" it comes back to continue to checkout.
      const redirect = pay.value === 'now' ? `${props.path}?pay=now` : props.path
      await requestMagicLink({ email: data.email!, redirect, do: answer.value, guest: guestToken() })
      sentTo.value = data.email!
      open.value = false
      return
    }
    if (pass.value && pay.value === 'now' && !props.hasTicket) { await checkout(pass.value.name, people.value); return }
    open.value = false
  } catch (e: any) {
    error.value = e?.data?.code === 'BAD_REQUEST' && e?.message ? e.message : 'Couldn’t sign you up. Please try again.'
  } finally { busy.value = false }
}

async function checkout(name: string, n: 1 | 2) {
  if (!props.passKey) return
  busy.value = true; error.value = ''
  useTrack().track('ticket_cta_click', { festival: props.passKey, provider: 'stripe', tickets: 1, ticket: name, people: n, surface: 'event_signup' })
  try {
    const res = await $trpc.festivalSignup.ticketCheckout.mutate({ festivalSlug: props.passKey, ticketNames: [name], people: n })
    if (res.checkoutUrl) {
      const p = chosenPass(passes.value, name)
      sessionStorage.setItem('wedance_checkout', JSON.stringify({ festivalName: '', ticketName: name, amount: p ? passTotal(p, n) : 0 }))
      window.location.href = res.checkoutUrl
    }
  } catch (e: any) {
    error.value = e?.message?.includes('sold out') ? `This ${words.value.one} is sold out.` : 'Couldn’t start the payment. Please try again.'
  } finally { busy.value = false }
}

// "Cancel my spot" (after its confirm) — the poll's "next".
// "Cancel my spot" (RAZ-1003): one confirm that says what happens — the spot goes,
// the organiser sees it, it leaves your plan, a paid pass isn't refunded by us.
const confirmCancel = ref(false)
const justCancelled = ref(false)
const cancelNote = computed(() => {
  const s = saved.value
  if (!s) return []
  const lines: string[] = []
  if (s.pass && props.hasTicket && mine.value?.signup.pay !== 'door') lines.push(`You paid €${s.price}. Refunds are up to ${org.value}: ask them before you cancel.`)
  else if (s.pass && mine.value?.signup.pay === 'door') lines.push(`You were paying €${s.price} at the door, so there’s nothing to refund.`)
  else if (s.unpaid) lines.push('Your payment isn’t finished, so nothing was charged.')
  if (s.people === 2) lines.push('This cancels both of you.')
  lines.push(`${org.value} sees you’re not coming, your spot opens up, and the night comes off your plan.`)
  return lines
})

async function cantCome() {
  busy.value = true
  try {
    setPoll(await $trpc.rsvp.answer.mutate({ event: props.eventId, answer: 'next', guestToken: guestToken() }))
    confirmCancel.value = false
    justCancelled.value = true
    if (isSignedIn.value) useWeekPlan().syncEvent(poll.value!.eventId, false)
    useTrack().track('rsvp_answered', { answer: 'next', signed_in: isSignedIn.value, surface: props.surface, event_id: poll.value?.eventId })
  } catch { error.value = 'Couldn’t save that. Please try again.' } finally { busy.value = false }
}

// ── The line once signed up ──────────────────────────────────────────────────
const saved = computed(() => {
  if (!coming.value) return null
  const s = mine.value!.signup
  const p = chosenPass(passes.value, s.pass)
  const n = peopleFor(mine.value!.answer)
  const price = p ? passTotal(p, n) : 0
  const payLine = !p ? null : s.pay === 'door' ? `€${price} at the door` : props.hasTicket ? `paid €${price}` : null
  return {
    parts: [roleShort(mine.value!.answer), priced.value.length > 1 ? p?.name : null, payLine].filter(Boolean).join(' · '),
    unpaid: !!p && s.pay === 'now' && !props.hasTicket,
    pass: p, people: n, price,
  }
})
const payLabel = (p: FestivalPass) => passPriceLabel(p, people.value)

defineExpose({ start })
</script>

<template>
  <div v-if="poll && !ended" class="font-sans" data-event-signup>
    <!-- Closed: the one button, or the line that says you're in -->
    <template v-if="!open">
      <p v-if="!coming && justCancelled" class="mb-2 text-sm text-muted-foreground" role="status" data-signup-cancelled>Spot cancelled. Changed your mind? Sign up again.</p>
      <!-- One chain (book / booked / sent): nothing may sit between the v-if / v-else-if / v-else. -->
      <template v-if="state === 'book'">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="cta" class="px-6" data-signup-start @click="start">
          <Ticket aria-hidden="true" /> {{ signupCta(passes) }}
        </Button>
        <!-- A quieter option next to it, e.g. "+ My plan" (RAZ-1003). -->
        <slot name="beside" />
      </div>
      <p v-if="priced.length <= 1 && includesUnderButton" class="mt-2 text-xs text-muted-foreground" data-signup-includes>Includes {{ includesUnderButton }}</p>
      <EventImportedNotice v-if="showImported && notBookable" :imported="notBookable.imported" :from="notBookable.from" :checked-at="notBookable.checkedAt" :organizer-name="org" />
      </template>
      <template v-else-if="state === 'booked'">
      <div class="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 space-y-1" role="status" data-signup-in>
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" aria-hidden="true" /> Spot booked<template v-if="saved?.parts"> · {{ saved.parts }}</template></span>
          <span v-if="!confirmCancel" class="ml-auto inline-flex items-center gap-4">
            <Button type="button" variant="link" size="sm" class="h-auto p-0" data-signup-change @click="start">Change</Button>
            <Button type="button" variant="link" size="sm" class="h-auto p-0 text-muted-foreground" data-signup-cancel @click="confirmCancel = true">Cancel my spot</Button>
          </span>
        </p>
        <p v-if="saved?.unpaid" class="flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted-foreground">Payment not finished.</span>
          <Button type="button" variant="cta" size="pill-sm" :loading="busy" data-signup-pay @click="checkout(saved.pass!.name, saved.people)">Pay €{{ saved.price }} <ArrowRight aria-hidden="true" /></Button>
        </p>
        <p v-if="!confirmCancel" class="text-xs text-muted-foreground">
          {{ org }} has your {{ mine?.signup.phone ? 'name, email and phone' : 'name and email' }} for this event.
          <!-- Signed up = on your plan (RAZ-1003): a status, not a switch. -->
          <NuxtLink v-if="isSignedIn" to="/my-plan" class="ml-1 inline-flex items-center gap-1 font-bold text-wd-green-700 hover:underline" data-signup-on-plan><Check class="size-3" aria-hidden="true" /> On My plan</NuxtLink>
        </p>
        <div v-else class="mt-2 rounded-xl bg-white/70 border border-border px-3 py-3 space-y-2" role="alertdialog" aria-labelledby="cancel-spot-title" data-signup-cancel-confirm>
          <p id="cancel-spot-title" class="font-bold text-foreground">Cancel your spot?</p>
          <p v-for="(l, i) in cancelNote" :key="i" class="text-sm text-muted-foreground">{{ l }}</p>
          <div class="flex flex-wrap items-center gap-3 pt-1">
            <Button type="button" variant="outline-pill" size="pill-sm" :loading="busy" data-signup-cant @click="cantCome">Cancel my spot</Button>
            <Button type="button" variant="link" size="sm" class="h-auto p-0" @click="confirmCancel = false">Keep my spot</Button>
          </div>
        </div>
      </div>
      <!-- RAZ-1007: the night you booked (the page fills it). -->
      <slot name="booked" :pass="saved?.pass ?? null" />
      <!-- RAZ-981: signing up is how you get into Meet new friends. -->
      <EventMeetPrompt :event-id="eventId" :answer="mine.answer" :surface="`${surface}_signup`" class="mt-3" />
      </template>

      <div v-else class="rounded-2xl border border-warning/40 bg-warning/[12%] px-4 py-3 space-y-1" role="status" data-signup-sent>
        <p class="inline-flex items-center gap-1.5 font-bold text-foreground"><Mail class="size-4" aria-hidden="true" /> Almost there: open the link we sent{{ sentTo ? ` to ${sentTo}` : '' }}</p>
        <p class="text-sm text-muted-foreground">
          It confirms your spot{{ saved?.parts ? ` (${saved.parts})` : '' }} and signs you in; new here, it makes your account, no password.
          Until then {{ org }} sees you as unconfirmed for 48 hours.
        </p>
        <Button type="button" variant="link" size="sm" class="h-auto p-0" @click="start">Change</Button>
      </div>
      <p v-if="error" role="alert" class="mt-2 text-sm font-bold text-primary">{{ error }}</p>
    </template>

    <!-- Open: the steps, in place -->
    <div v-else class="max-w-xl rounded-2xl border border-border bg-card shadow-wd-card divide-y divide-border" data-signup-card>
      <div class="px-4 py-3 flex items-center">
        <p class="font-display text-lg font-black">Book my spot</p>
        <Button type="button" variant="ghost" size="icon-sm" class="ml-auto" aria-label="Close" @click="open = false"><X /></Button>
      </div>

      <div v-for="(s, i) in steps" :key="s" class="p-4" :class="i > stepIndex(step) ? 'opacity-50' : ''" :data-signup-step="s">
        <!-- A finished step: one line -->
        <p v-if="i < stepIndex(step)" class="flex items-center gap-2 text-sm">
          <span class="size-6 rounded-full bg-success text-white grid place-items-center shrink-0"><Check class="size-3.5" aria-hidden="true" /></span>
          <span class="font-bold">
            <template v-if="s === 'role'">{{ roleLine(answer) }}</template>
            <template v-else-if="s === 'pass'">{{ pass?.name }} · {{ pass && payLabel(pass) }}</template>
            <template v-else-if="s === 'pay'">{{ pay === 'now' ? `Pay now · €${total}` : `Pay €${total} at the door` }}</template>
          </span>
          <Button type="button" variant="link" size="sm" class="ml-auto h-auto p-0" @click="step = s">Change</Button>
        </p>

        <template v-else>
          <p class="flex items-center gap-2 font-bold">
            <span class="size-6 rounded-full grid place-items-center text-xs shrink-0" :class="i === stepIndex(step) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">{{ i + 1 }}</span>
            {{ s === 'role' ? 'How are you coming?' : s === 'pass' ? `Pick your ${words.one}` : s === 'pay' ? (i === stepIndex(step) ? `Pay €${total}` : 'Pay') : isSignedIn ? 'Check and confirm' : 'Your contact' }}
          </p>

          <template v-if="i === stepIndex(step)">
            <!-- ① How are you coming -->
            <div v-if="s === 'role'" class="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="How are you coming?">
              <button
                v-for="o in roleOptions" :key="o.id" type="button"
                class="rounded-xl border px-3 py-2.5 text-left hover:border-primary transition-colors"
                :class="answer === o.id ? 'border-primary bg-primary/5' : 'border-border'"
                :aria-pressed="answer === o.id"
                :data-rsvp="o.id"
                @click="pickRole(o.id)"
              >
                <span class="block text-sm font-bold">{{ o.title }}</span>
                <span class="block text-xs text-muted-foreground">{{ o.sub }}<template v-if="poll.counts[o.id]"> · {{ poll.counts[o.id] }} so far</template></span>
              </button>
            </div>

            <!-- ② Pick your pass -->
            <div v-else-if="s === 'pass'" class="mt-3 space-y-2">
              <p v-if="noneForRole" class="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground" data-signup-no-role-pass>
                No {{ answer === 'needLeader' ? 'follower' : 'leader' }} {{ words.many }} left on their own. Coming with a partner? Change how you're coming for the couple {{ words.many }}.
              </p>
              <button
                v-for="p in fitting" :key="p.name" type="button"
                class="w-full rounded-xl border px-3 py-2.5 text-left flex items-center gap-3 hover:border-primary transition-colors disabled:opacity-50"
                :class="passName === p.name ? 'border-primary bg-primary/5' : 'border-border'"
                :disabled="p.soldOut"
                :data-signup-pass="p.name"
                @click="pickPass(p.name)"
              >
                <span class="min-w-0">
                  <span class="block text-sm font-bold">{{ p.name }}<template v-if="p.soldOut"> · sold out</template></span>
                  <span v-if="p.description" class="block text-xs text-muted-foreground">{{ p.description }}</span>
                  <span v-if="includesOf(p)" class="block text-xs text-muted-foreground" data-signup-pass-includes>Includes {{ includesOf(p) }}</span>
                  <span v-if="fitsPlan === p.name" class="mt-1 inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-wd-green-700">Fits your plan</span>
                </span>
                <span class="ml-auto text-right shrink-0">
                  <span class="block font-display text-lg font-black">€{{ passTotal(p, people) }}</span>
                  <span v-if="people === 2" class="block text-xs text-muted-foreground">{{ passFor(p) === 'couple' ? 'for two' : p.couplePrice ? `for two · saves €${p.price * 2 - p.couplePrice}` : `2 × €${p.price}` }}</span>
                </span>
              </button>
            </div>

            <!-- ③ Pay -->
            <div v-else-if="s === 'pay'" class="mt-3">
              <p v-if="fitting.length === 1 && pass" class="mb-3 text-sm text-muted-foreground">{{ pass.name }}<template v-if="pass.description"> · {{ pass.description }}</template> · {{ payLabel(pass) }}</p>
              <div class="flex flex-wrap gap-2">
                <Button type="button" variant="cta" size="pill-sm" data-signup-pay-now @click="pickPay('now')">Pay now <ArrowRight aria-hidden="true" /></Button>
                <Button v-if="payAtDoor" type="button" variant="outline-pill" size="pill-sm" data-signup-pay-door @click="pickPay('door')">At the door</Button>
              </div>
              <p v-if="!payAtDoor" class="mt-2 text-xs text-muted-foreground">{{ org }} takes payment online only.</p>
            </div>

            <!-- ④ Signed in: a review, only asking what's missing -->
            <form v-else-if="isSignedIn" class="mt-3 space-y-3" novalidate data-signup-review @submit.prevent="submit">
              <div class="rounded-xl border border-border p-3 flex items-start gap-3">
                <Avatar class="size-10">
                  <AvatarImage v-if="me?.photo" :src="sizedImage(me.photo, IMG.avatar)" alt="" />
                  <AvatarFallback>{{ (me?.name || '?').slice(0, 1) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0 flex-1 text-sm">
                  <p class="font-bold">{{ me?.name }}<template v-if="answer === 'partner' && form.partnerName"> + {{ form.partnerName }}</template></p>
                  <p class="text-muted-foreground truncate">{{ me?.email }}</p>
                  <p v-if="phoneKnown" class="text-muted-foreground">{{ me?.phone }}</p>
                </div>
                <Button v-if="phoneKnown" type="button" variant="link" size="sm" class="h-auto p-0" @click="editingPhone = true; form.phone = me?.phone ?? ''">Edit</Button>
              </div>
              <div v-if="!phoneKnown">
                <Input v-model="form.phone" type="tel" :placeholder="me?.phone ? phonePlaceholder : `Add your ${phonePlaceholder.replace('Phone', 'phone')}`" autocomplete="tel" aria-label="Phone or WhatsApp" v-bind="fieldAttrs('phone', 'signup-phone-error')" />
                <FieldError id="signup-phone-error" :message="errors.phone" />
                <p v-if="!errors.phone" class="mt-1 text-xs text-muted-foreground">For changes to this event{{ needsPhone ? ' and its WhatsApp group' : '' }}. Saved to your account.</p>
              </div>
              <div v-if="answer === 'partner'">
                <Input v-model="form.partnerName" type="text" placeholder="Your partner’s name (optional)" aria-label="Your partner’s name (optional)" v-bind="fieldAttrs('partnerName', 'signup-partner-error')" />
                <FieldError id="signup-partner-error" :message="errors.partnerName" />
              </div>
              <label class="flex items-start gap-2 text-sm"><Checkbox v-model="keepInTouch" class="mt-0.5" /> <span>Also tell me about {{ org }}’s next events</span></label>
              <p v-if="error" role="alert" class="text-sm font-bold text-primary">{{ error }}</p>
              <Button type="submit" :variant="pay === 'now' ? 'cta' : 'pill'" class="w-full" :loading="busy" data-signup-submit>
                {{ pay === 'now' && !hasTicket ? `Pay €${total}` : 'Book my spot' }} <ArrowRight aria-hidden="true" />
              </Button>
              <p class="text-center text-xs text-muted-foreground">{{ org }} sees your name, email{{ phoneKnown || form.phone ? ' and phone' : '' }} for this event.</p>
            </form>

            <!-- ④ Signed out: name, email, phone -->
            <form v-else class="mt-3 space-y-3" novalidate data-signup-contact @submit.prevent="submit">
              <p class="text-sm rounded-lg bg-muted/60 px-3 py-2">
                Been here before?
                <Button type="button" variant="link" size="sm" class="h-auto p-0" data-signup-signin @click="showSignIn = true">Sign in</Button>
                and we’ll fill this in.
              </p>
              <div>
                <Input v-model="form.name" type="text" placeholder="First and last name" autocomplete="name" aria-label="First and last name" v-bind="fieldAttrs('name', 'signup-name-error')" />
                <FieldError id="signup-name-error" :message="errors.name" />
              </div>
              <div>
                <Input v-model="form.email" type="email" placeholder="Email" autocomplete="email" aria-label="Email" v-bind="fieldAttrs('email', 'signup-email-error')" />
                <FieldError id="signup-email-error" :message="errors.email" />
                <p v-if="!errors.email" class="mt-1 text-xs text-muted-foreground">No password: we email you a link{{ pay === 'now' ? ', then you pay' : ' that confirms your spot' }}.</p>
              </div>
              <div>
                <Input v-model="form.phone" type="tel" :placeholder="phonePlaceholder" autocomplete="tel" aria-label="Phone or WhatsApp" v-bind="fieldAttrs('phone', 'signup-phone-error')" />
                <FieldError id="signup-phone-error" :message="errors.phone" />
              </div>
              <div v-if="answer === 'partner'">
                <Input v-model="form.partnerName" type="text" placeholder="Your partner’s name (optional)" aria-label="Your partner’s name (optional)" v-bind="fieldAttrs('partnerName', 'signup-partner-error')" />
                <FieldError id="signup-partner-error" :message="errors.partnerName" />
              </div>
              <p class="text-xs text-muted-foreground rounded-lg bg-muted/60 px-3 py-2">
                {{ org }} gets your name, email{{ needsPhone ? ' and phone' : ' (and phone, if you add it)' }} for this event only: changes, cancellations, and checking who joins its WhatsApp group.
              </p>
              <label class="flex items-start gap-2 text-sm"><Checkbox v-model="keepInTouch" class="mt-0.5" /> <span>Also tell me about {{ org }}’s next events</span></label>
              <p v-if="error" role="alert" class="text-sm font-bold text-primary">{{ error }}</p>
              <Button type="submit" :variant="pay === 'now' ? 'cta' : 'pill'" class="w-full" :loading="busy" data-signup-submit>
                {{ pay === 'now' ? `Continue to payment · €${total}` : 'Book my spot' }} <ArrowRight aria-hidden="true" />
              </Button>
            </form>
          </template>
        </template>
      </div>
    </div>
    <!-- Signing in keeps the steps: the card turns into the review once the account loads. -->
    <SignUpModal v-model:open="showSignIn" action="signin" />
  </div>
</template>
