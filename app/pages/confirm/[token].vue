<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
import { SESSION_TYPE_LABEL, isWorkshop, sessionTimeRange, sessionType } from '#shared/utils/programme'
/**
 * /confirm/<token> — the page an artist opens from an organizer's link (or a
 * venue asked to host the event: then it answers can host · another date ·
 * no, with its terms, instead of the line-up questions). First:
 * check and approve what the organizer needs (name, photos, video, bio,
 * Instagram), change it, or add more. Signed out, the answer needs an email:
 * its "That's me" link signs them in and, when nobody owns the page yet, makes
 * it theirs. Email and password is the fallback when no email is on file.
 *
 * /confirm/@<handle> is the same page for someone who already manages it
 * (from "Needs you" on the Business home): it needs them signed in.
 */
import { VENUE_INCLUDES } from '#shared/types/venueAsk'
import { windowRange } from '#shared/utils/venueAsk'
import { Check, X, ImagePlus, Loader2, Star, Plus, Clock, PartyPopper, Instagram, MapPin, CalendarDays, Users, ExternalLink, ThumbsUp, MessageSquare, Euro, Pencil, MailCheck } from 'lucide-vue-next'
import { videoEmbedUrl } from '#shared/utils/video'

// /ask/<token> is the link venues get: the same page, a word that doesn't sound like a done deal.
definePageMeta({ layout: false, alias: ['/ask/:token'] })
useHead({ title: 'Your answer | WeDance', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn, register, confirmInviteEmail } = useAuth()
const param = computed(() => String(route.params.token))
const key = computed(() => (param.value.startsWith('@') ? { username: param.value.slice(1) } : { token: param.value }))

type Data = Awaited<ReturnType<typeof $trpc.artistInvites.get.query>>
const data = ref<Data | null>(null)
const error = ref<string | null>(null)
// A venue answers first (check), then sees its page as it is (page); changing it
// needs an account (account), then the form (edit). An artist does it on one page.
const step = ref<'check' | 'page' | 'account' | 'edit' | 'done'>('check')
const pageSaved = ref(false)
// Saved for this event's flyer only (they don't run the page): the done screen says so.
const eventSaved = ref(false)
const initialPhoto = ref<string | null>(null)
// Where their answer goes in writing (signed out). The email's "That's me" proves it's theirs.
const answerEmail = ref('')
const sentTo = ref<string | null>(null)
const emailError = ref<string | null>(null)
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
/** The email for this answer: required to say yes (or another date), optional to say no. */
function emailFor(positive: boolean): { email?: string } | null {
  emailError.value = null
  if (isSignedIn.value) return {}
  const e = answerEmail.value.trim()
  if (!e && !positive) return {}
  if (!emailOk(e)) { emailError.value = positive ? 'Add your email: your answer and the next steps go there.' : 'Check your email address.'; return null }
  return { email: e }
}
// Back from "That's me" in the answer email (?that=…): confirm it and sign them in.
const confirmedNow = ref(false)
async function confirmFromEmail() {
  const that = route.query.that
  if (typeof that !== 'string' || !('token' in key.value)) return
  try {
    await confirmInviteEmail(key.value.token, that)
    confirmedNow.value = true
  } catch (e: any) {
    error.value = e?.message || 'This confirmation link doesn’t work any more.'
  }
  navigateTo({ query: { ...route.query, that: undefined } }, { replace: true })
}

// After answering signed out: the email is the way in. "Edit your page" points
// at it, "Send it again" re-sends the copy, "Wrong email?" sends it elsewhere.
const nudge = ref(false)
const resending = ref(false)
const resendNote = ref<string | null>(null)
const resendError = ref<string | null>(null)
const fixingEmail = ref(false)
const fixedEmail = ref('')
const emailWayIn = computed(() => !!sentTo.value && !isSignedIn.value && !!data.value && !data.value.member)
function nudgeEmail() {
  nudge.value = false
  nextTick(() => {
    nudge.value = true
    document.getElementById('answer-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
async function resendEmail(to?: string) {
  if (!('token' in key.value)) return
  resendError.value = null
  resendNote.value = null
  if (to !== undefined && !emailOk(to.trim())) { resendError.value = 'Check your email address.'; return }
  resending.value = true
  try {
    const r = await $trpc.artistInvites.resendAnswerEmail.mutate({ token: key.value.token, ...(to !== undefined ? { email: to.trim() } : {}) })
    sentTo.value = r.email
    fixingEmail.value = false
    resendNote.value = `Sent again to ${r.email}.`
  } catch (e: any) {
    resendError.value = e?.message || 'Couldn’t send it. Try again in a minute.'
  } finally {
    resending.value = false
  }
}

// The answer, built up on the page.
const form = reactive({ name: '', bio: '', city: '', styles: [] as string[], instagram: '', website: '', facebook: '', mainPhoto: null as string | null, address: '', floorType: '' })
// Fields the organizer may have suggested a new value for (shown as "Use theirs / Keep mine").
const FIELDS = [
  { kind: 'name', label: 'Name' }, { kind: 'bio', label: 'About' }, { kind: 'city', label: 'City' }, { kind: 'styles', label: 'Dance styles' },
  { kind: 'instagram', label: 'Instagram' }, { kind: 'website', label: 'Website' }, { kind: 'facebook', label: 'Facebook' },
] as const
type FieldKind = (typeof FIELDS)[number]['kind']
const show = (k: FieldKind, v: string) => (k === 'styles' ? (JSON.parse(v) as string[]).join(', ') : v) || '(empty)'
function setField(k: FieldKind, v: string) {
  if (k === 'styles') form.styles = JSON.parse(v || '[]')
  else (form as any)[k] = v
}
const currentValue = (k: FieldKind) => {
  const p = data.value!.profile as any
  return k === 'styles' ? JSON.stringify(p.styles ?? []) : (p[k] ?? '')
}
const decisions = ref<Record<string, boolean>>({})
const removePhotos = ref<string[]>([])
const addPhotos = ref<string[]>([])
const addVideos = ref<string[]>([])

async function load() {
  error.value = null
  try {
    data.value = await $trpc.artistInvites.get.query(key.value)
    const p = data.value.profile
    Object.assign(form, { name: p.name, bio: p.bio, city: p.city, styles: [...p.styles], instagram: p.instagram, website: p.website, facebook: p.facebook, mainPhoto: p.photo, address: p.address, floorType: p.floorType })
    // Fields the organizer sent are approved by default (the field shows them). Their
    // photos of an artist are not: only the ones the artist ticks go on the page.
    // Not their team (yet): the link changes this event's flyer only, so start from what it uses.
    const ev = data.value.event
    if (ev && data.value.kind !== 'venue' && !data.value.member) {
      form.name = ev.lineupName || p.name
      form.mainPhoto = ev.flyerPhoto !== undefined ? ev.flyerPhoto : p.photo
    }
    initialPhoto.value = form.mainPhoto
    decisions.value = Object.fromEntries(data.value.pending.map(s => [s.id, !(s.kind === 'photo' && data.value!.kind !== 'venue' && data.value!.event)]))
    for (const s of data.value.pending) if (FIELDS.some(f => f.kind === s.kind)) setField(s.kind as FieldKind, s.value)
  } catch (e: any) {
    error.value = e?.message || 'This link doesn’t work.'
  }
}
onMounted(async () => { await confirmFromEmail(); await load() })
watch(isSignedIn, () => load())

const pendingFields = computed(() => (data.value?.pending ?? [])
  .filter(s => FIELDS.some(f => f.kind === s.kind) && s.value !== currentValue(s.kind as FieldKind))
  .map(s => ({ ...s, label: FIELDS.find(f => f.kind === s.kind)!.label })))
function useTheirs(id: string, theirs: boolean) {
  const s = data.value?.pending.find(x => x.id === id)
  if (!s) return
  decisions.value[id] = theirs
  setField(s.kind as FieldKind, theirs ? s.value : currentValue(s.kind as FieldKind))
}
const pendingPhotos = computed(() => data.value?.pending.filter(s => s.kind === 'photo') ?? [])
const pendingVideos = computed(() => data.value?.pending.filter(s => s.kind === 'video') ?? [])
const currentPhotos = computed(() => (data.value?.profile.photos ?? []).map(p => p.url).filter(u => !removePhotos.value.includes(u)))
const toggleRemove = (url: string) => {
  const i = removePhotos.value.indexOf(url)
  i > -1 ? removePhotos.value.splice(i, 1) : removePhotos.value.push(url)
  if (form.mainPhoto === url) form.mainPhoto = null
}

const uploading = ref(false)
async function upload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? []).filter(f => f.type.startsWith('image/'))
  input.value = ''
  uploading.value = true
  try {
    for (const f of files) {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch('/api/media/image?folder=profiles', { method: 'POST', body })
      if (!res.ok) throw new Error()
      addPhotos.value.push((await res.json()).url)
    }
  } catch {
    error.value = 'A photo didn’t upload. Try again.'
  } finally {
    uploading.value = false
  }
}
const newVideo = ref('')
const videoError = ref<string | null>(null)
function addVideo() {
  const e = videoEmbedUrl(newVideo.value)
  if (!e) { videoError.value = 'Paste a YouTube or Vimeo link.'; return }
  videoError.value = null
  if (!addVideos.value.includes(e)) addVideos.value.push(e)
  newVideo.value = ''
}

// The line-up answers.
const answer = reactive({ participation: null as 'confirmed' | 'declined' | null, programmeOk: null as boolean | null, programmeNote: '', postsOk: false, message: '' })
watch(data, (d) => {
  const a = d?.answer
  if (!a) return
  answer.participation = a.status === 'invited' ? null : a.status
  answer.programmeOk = a.programmeOk
  answer.programmeNote = a.programmeNote ?? ''
  // Not answered yet: promoting them is ticked (they're on the flyer already); they untick it.
  answer.postsOk = a.status === 'invited' ? true : a.postsOk
  answer.message = a.message ?? ''
})
const declined = computed(() => answer.participation === 'declined')

// A venue's answer.
const isVenue = computed(() => data.value?.kind === 'venue')
// A venue ask or an artist's line-up link answers in steps (answer → their page);
// a page without an event (Business "Needs you") is still one form.
const staged = computed(() => isVenue.value || !!data.value?.event)
const venue = reactive({ answer: null as 'confirmed' | 'proposed' | 'declined' | null, alternative: '', rent: '', minSpend: '', doorSplit: '', deposit: '', capacity: null as number | null, includes: [] as string[], notes: '' })
watch(data, (d) => {
  if (d?.kind !== 'venue' || !d.ask) return
  const st = d.answer?.status
  venue.answer = st && st !== 'invited' ? st : null
  venue.alternative = d.ask.alternative ?? ''
  const t = d.ask.terms ?? {}
  Object.assign(venue, { rent: t.rent ?? '', minSpend: t.minSpend ?? '', doorSplit: t.doorSplit ?? '', deposit: t.deposit ?? '', capacity: t.capacity ?? null, includes: [...(t.includes ?? [])], notes: t.notes ?? '' })
})
const toggleInclude = (x: string) => { venue.includes = venue.includes.includes(x) ? venue.includes.filter(y => y !== x) : [...venue.includes, x] }
const FLOORS = ['Wood', 'Parquet', 'Dance floor (vinyl)', 'Tiles', 'Concrete', 'Stone']
const fmtDays = (e: NonNullable<Data['event']>) => {
  const f = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' })
  // A night that ends after midnight is still one day.
  const overnight = !!e.endDate && +new Date(e.endDate) - +new Date(e.startDate) < 24 * 3600_000
  return e.endDay && e.endDay !== e.startDay && !overnight
    ? `${f(e.startDay, { weekday: 'short', day: 'numeric', month: 'short' })} – ${f(e.endDay, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`
    : `${f(e.startDay, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${e.startTime}`
}
const fmtSession = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

const saving = ref(false)
async function save() {
  if (isVenue.value && step.value === 'check' && !venue.answer) { error.value = 'Tell them whether you can host it.'; return }
  if (isVenue.value && step.value === 'check' && venue.answer === 'proposed' && !venue.alternative.trim()) { error.value = 'Say which dates would work.'; return }
  if (!isVenue.value && data.value?.event && step.value === 'check' && !answer.participation) { error.value = 'Tell them whether you’re in.'; return }
  if (data.value?.event && !declined.value && answer.programmeOk === false && !answer.programmeNote.trim()) { error.value = 'Say what’s wrong with the programme.'; return }
  if ((!staged.value || step.value === 'edit') && !form.name.trim()) { error.value = 'Add your name.'; return }
  saving.value = true
  error.value = null
  try {
    // A venue's answer alone: its page comes after, and only if they want to change it.
    if (isVenue.value && step.value === 'check') {
      const em = emailFor(venue.answer !== 'declined')
      if (!em) return
      await $trpc.artistInvites.respond.mutate({
        ...key.value,
        ...em,
        venueAnswer: venue.answer!,
        alternative: venue.alternative,
        ...(venue.answer !== 'declined' ? { terms: { rent: venue.rent, minSpend: venue.minSpend, doorSplit: venue.doorSplit, deposit: venue.deposit, capacity: venue.capacity || null, includes: venue.includes, notes: venue.notes } } : {}),
        message: answer.message,
      })
      sentTo.value = em.email ?? null
      step.value = venue.answer === 'declined' ? 'done' : 'page'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    // An artist's review, all in one answer: in or not, the classes, name and photo, posts.
    if (staged.value && step.value === 'check') {
      const team = !!data.value?.member
      // Their team: the flyer photo must be on the page, so an organizer's photo they picked counts as kept.
      if (team) for (const ph of pendingPhotos.value) if (form.mainPhoto === ph.value) decisions.value[ph.id] = true
      const em = emailFor(!declined.value)
      if (!em) return
      await $trpc.artistInvites.respond.mutate({
        ...key.value,
        ...em,
        participation: answer.participation!,
        ...(declined.value ? {} : {
          programmeOk: answer.programmeOk ?? true,
          programmeNote: answer.programmeNote,
          postsOk: answer.postsOk,
          // Anyone else with the link changes this event's flyer only (name and photo).
          ...(team ? { decisions: Object.entries(decisions.value).map(([id, approve]) => ({ id, approve })), addPhotos: addPhotos.value } : {}),
          name: form.name.trim(),
          ...(form.mainPhoto && form.mainPhoto !== initialPhoto.value ? { mainPhoto: form.mainPhoto } : {}),
          artistTerms: { fee: deal.fee, needs: deal.needs },
        }),
        message: answer.message,
      })
      pageSaved.value = team && !declined.value
      eventSaved.value = !team && !declined.value
      sentTo.value = em.email ?? null
      step.value = 'done'
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    await $trpc.artistInvites.respond.mutate({
      ...key.value,
      decisions: Object.entries(decisions.value).map(([id, approve]) => ({ id, approve })),
      name: form.name.trim(),
      bio: form.bio,
      city: form.city,
      styles: form.styles,
      instagram: form.instagram,
      website: form.website,
      facebook: form.facebook,
      addPhotos: addPhotos.value,
      addVideos: addVideos.value,
      removePhotos: removePhotos.value,
      mainPhoto: form.mainPhoto,
      ...(isVenue.value ? {
        address: form.address,
        floorType: form.floorType,
      } : data.value?.event ? {
        participation: answer.participation!,
        ...(declined.value ? {} : { programmeOk: answer.programmeOk ?? true, programmeNote: answer.programmeNote, postsOk: answer.postsOk }),
        message: answer.message,
      } : {}),
    })
    if (staged.value) { pageSaved.value = true; step.value = 'done'; window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    // Nobody owns the page yet → offer it to them; else done.
    step.value = data.value && !data.value.managed && 'token' in key.value && !(isVenue.value ? venue.answer === 'declined' : declined.value) ? 'account' : 'done'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t save. Try again.'
  } finally {
    saving.value = false
  }
}

// Step two: own the page (sign up, or with the account they're signed in with).
const account = reactive({ email: '', password: '' })
const accountError = ref<string | null>(null)
const claiming = ref(false)
async function claim() {
  if (!('token' in key.value)) return
  claiming.value = true
  accountError.value = null
  const isSignedInBefore = isSignedIn.value
  try {
    if (!isSignedIn.value) {
      if (!/^\S+@\S+\.\S+$/.test(account.email)) throw new Error('Add your email.')
      if (account.password.length < 8) throw new Error('The password needs at least 8 characters.')
      await register({ name: form.name.trim(), email: account.email, password: account.password })
    }
    await $trpc.artistInvites.claim.mutate({ token: param.value })
    useTrack().track('profile_claimed', { via: 'invite', new_account: !isSignedInBefore })
    step.value = staged.value ? 'edit' : 'done'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    accountError.value = e?.message || 'Couldn’t create the account.'
  } finally {
    claiming.value = false
  }
}
const showSignIn = ref(false)
// An artist reviews everything on one page (all of it right unless they say so),
// then answers once: in, or can't make it.
const artistCheck = computed(() => !isVenue.value && !!data.value?.event && step.value === 'check')
const answeredBefore = ref<'confirmed' | 'declined' | null>(null)
watch(data, (d) => { answeredBefore.value = d?.answer && d.answer.status !== 'invited' ? d.answer.status as any : null })
// A venue the same way: everything open, terms only if theirs differ, one answer at the bottom.
const venueCheck = computed(() => isVenue.value && step.value === 'check')
const termsOpen = ref(false)
const proposing = ref(false)
watch(data, (d) => { termsOpen.value = !d?.ask?.facts?.offer || !!Object.values(d?.ask?.terms ?? {}).some(v => (Array.isArray(v) ? v.length : v)) })
function sendVenue(v: 'confirmed' | 'proposed' | 'declined') {
  venue.answer = v
  save()
}
// The artist's deal: the organizer's offer as is, or their own fee and needs.
const deal = reactive({ fee: '', needs: '' })
const dealOpen = ref(false)
watch(data, (d) => {
  const t = d?.deal?.terms
  deal.fee = t?.fee ?? ''
  deal.needs = t?.needs ?? ''
  dealOpen.value = !d?.deal?.offer || !!(t?.fee || t?.needs)
})
function send(p: 'confirmed' | 'declined') {
  answer.participation = p
  save()
}
// A new photo goes straight on as the flyer photo.
async function uploadMain(e: Event) {
  const before = addPhotos.value.length
  await upload(e)
  if (addPhotos.value.length > before) form.mainPhoto = addPhotos.value[addPhotos.value.length - 1]!
}
const photoChanged = computed(() => !!form.mainPhoto && form.mainPhoto !== initialPhoto.value)
// The photos they can pick for the flyer: their page's, new ones, and (not their team) the organizer's.
const flyerPhotoChoices = computed(() => [...new Set([...currentPhotos.value, ...addPhotos.value, ...(data.value?.member ? [] : pendingPhotos.value.map(s => s.value)), ...(form.mainPhoto && !data.value?.member ? [form.mainPhoto] : [])])])
const nameSuggestion = computed(() => pendingFields.value.find(s => s.kind === 'name') ?? null)
// "Change something" on the venue's page: theirs already → the form; else an account first.
function changePage() {
  // Signed out with an answer emailed: the email's "That's me" is the way in, not a password.
  if (emailWayIn.value) return nudgeEmail()
  if (!data.value?.member && !account.email) account.email = sentTo.value || answerEmail.value.trim()
  step.value = data.value?.member ? 'edit' : 'account'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
// A venue's ask, worked out from the event (plan at this venue, hours the room is needed, offer).
const facts = computed(() => data.value?.ask?.facts ?? null)
const planByDay = computed(() => {
  const out: { date: string; label: string; items: NonNullable<typeof facts.value>['plan'] }[] = []
  for (const x of facts.value?.plan ?? []) {
    let d = out.find(o => o.date === x.date)
    if (!d) out.push(d = { date: x.date, label: new Date(`${x.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }), items: [] })
    d.items.push(x)
  }
  return out
})
const venueHeadline = computed(() => {
  // Short: the date and the rest are in the card right below.
  return `${facts.value?.eventName || data.value?.event?.name || 'An event'} at ${data.value?.profile.name}?`
})
const accessText = computed(() => (facts.value?.access ?? []).map(w => (facts.value!.multiDay ? `${facts.value!.dayLabels[w.date] ?? w.date} ${windowRange(w)}` : windowRange(w))).join(' and '))
const fmtDate = (d: string | Date | null, tz?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz || 'Europe/Berlin' }) : ''
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main class="mx-auto max-w-2xl px-4 py-10 font-sans" :class="(artistCheck || venueCheck) && data?.canAnswer && (isSignedIn ? 'pb-48' : 'pb-64')">
      <AdminState v-if="!data && !error" kind="loading" />
      <AdminState v-else-if="!data" kind="error" :message="error!" />

      <template v-else>
        <p v-if="confirmedNow" class="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm" role="status">
          <Check class="size-4 shrink-0 text-primary" aria-hidden="true" /> Confirmed, thank you. {{ data.event?.host?.name || 'The organizer' }} now sees your answer as confirmed{{ data.member ? ', and the page is yours: you’re signed in.' : '.' }}
        </p>
        <!-- Done -->
        <section v-if="step === 'done'" class="rounded-2xl border bg-card p-6 text-center shadow-wd-card">
          <PartyPopper class="mx-auto size-8 text-primary" aria-hidden="true" />
          <h1 class="mt-2 font-display text-2xl font-bold">Thank you, {{ form.name }}</h1>
          <p v-if="staged" class="mt-1 text-sm text-muted-foreground">{{ pageSaved ? 'Your page is up to date. ' : eventSaved ? `Your name and photo are saved for ${data.event?.name || 'this event'}’s flyer. ` : '' }}{{ data.event?.host?.name || 'The organizer' }} sees your answer{{ data.event ? ` for ${data.event.name}` : '' }}{{ isVenue ? ' and will get back to you' : '' }}.</p>
          <div v-if="emailWayIn" id="answer-email" class="mx-auto mt-4 max-w-md rounded-2xl border-2 p-4 text-left text-sm transition-colors duration-500" :class="nudge ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/10'">
            <p class="flex items-center gap-2 font-bold"><MailCheck class="size-4 shrink-0 text-primary" aria-hidden="true" /> Check your inbox</p>
            <p class="mt-1">We sent your answer to <strong>{{ sentTo }}</strong>. Tap <strong>That’s me</strong> in it: {{ data.event?.host?.name || 'the organizer' }} sees it’s really you, and {{ data.profile.name }}’s page becomes yours to edit. No password needed.</p>
            <form v-if="fixingEmail" class="mt-3 flex flex-wrap items-center gap-2" novalidate @submit.prevent="resendEmail(fixedEmail)">
              <Input v-model="fixedEmail" type="email" autocomplete="email" placeholder="your@email.com" class="min-w-0 flex-1" aria-label="Your email" />
              <Button type="submit" size="pill-sm" variant="pill" :loading="resending">Send</Button>
              <button type="button" class="text-xs text-muted-foreground hover:underline" @click="fixingEmail = false">Cancel</button>
            </form>
            <p v-else class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-secondary">
              <button type="button" class="hover:underline disabled:opacity-50" :disabled="resending" @click="resendEmail()">Send it again</button>
              <button type="button" class="hover:underline" @click="fixedEmail = sentTo || ''; fixingEmail = true">Wrong email?</button>
            </p>
            <p v-if="resendNote" class="mt-1 text-xs text-wd-green-700" role="status">{{ resendNote }}</p>
            <p v-if="resendError" class="mt-1 text-xs text-destructive" role="alert">{{ resendError }}</p>
          </div>
          <p v-if="!sentTo && !staged" class="mt-1 text-sm text-muted-foreground">Your page is up to date{{ data.event ? ` and ${data.event.host?.name || 'the organizer'} can use it for ${data.event.name}` : '' }}.</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="pill" as-child><NuxtLink :to="`/@${data.profile.username}`">See your page</NuxtLink></Button>
            <Button v-if="isSignedIn" variant="outline-pill" as-child><NuxtLink :to="`/business/network/${data.profile.username}`">Manage it in Business</NuxtLink></Button>
            <Button v-else-if="staged && !isVenue && !declined" variant="outline-pill" @click="changePage"><Pencil /> {{ emailWayIn ? 'Edit your page' : 'Edit your whole page' }}</Button>
          </div>
        </section>

        <!-- A venue's page as it is, after the answer -->
        <section v-else-if="step === 'page'" class="grid gap-4">
          <div class="rounded-2xl border bg-card p-5 shadow-wd-card">
            <p class="flex items-center gap-1.5 text-sm font-bold text-wd-green-700"><Check class="size-4" aria-hidden="true" /> Sent. {{ data.event?.host?.name || 'The organizer' }} sees your answer and will get back to you.</p>
          <div v-if="emailWayIn" id="answer-email" class="mt-3 max-w-md rounded-2xl border-2 p-4 text-left text-sm transition-colors duration-500" :class="nudge ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary/10'">
            <p class="flex items-center gap-2 font-bold"><MailCheck class="size-4 shrink-0 text-primary" aria-hidden="true" /> Check your inbox</p>
            <p class="mt-1">We sent your answer to <strong>{{ sentTo }}</strong>. Tap <strong>That’s me</strong> in it: {{ data.event?.host?.name || 'the organizer' }} sees it’s really you, and {{ data.profile.name }}’s page becomes yours to edit. No password needed.</p>
            <form v-if="fixingEmail" class="mt-3 flex flex-wrap items-center gap-2" novalidate @submit.prevent="resendEmail(fixedEmail)">
              <Input v-model="fixedEmail" type="email" autocomplete="email" placeholder="your@email.com" class="min-w-0 flex-1" aria-label="Your email" />
              <Button type="submit" size="pill-sm" variant="pill" :loading="resending">Send</Button>
              <button type="button" class="text-xs text-muted-foreground hover:underline" @click="fixingEmail = false">Cancel</button>
            </form>
            <p v-else class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-secondary">
              <button type="button" class="hover:underline disabled:opacity-50" :disabled="resending" @click="resendEmail()">Send it again</button>
              <button type="button" class="hover:underline" @click="fixedEmail = sentTo || ''; fixingEmail = true">Wrong email?</button>
            </p>
            <p v-if="resendNote" class="mt-1 text-xs text-wd-green-700" role="status">{{ resendNote }}</p>
            <p v-if="resendError" class="mt-1 text-xs text-destructive" role="alert">{{ resendError }}</p>
          </div>
          </div>
          <div>
            <h1 class="font-display text-2xl font-bold">This is {{ data.profile.name }} on WeDance</h1>
            <p class="mt-1 text-sm text-muted-foreground">Organizers and dancers see this page when they look for a place. Does it look right?</p>
          </div>
          <article class="overflow-hidden rounded-2xl border bg-card shadow-wd-card">
            <img v-if="data.profile.photo" :src="sizedImage(data.profile.photo, IMG.large)" alt="" class="aspect-[16/9] w-full object-cover">
            <div v-else class="flex h-20 w-full items-center justify-center bg-muted text-sm text-muted-foreground"><ImagePlus class="mr-1.5 size-4" aria-hidden="true" /> No photo yet</div>
            <div class="p-4">
              <h2 class="font-display text-xl font-bold">{{ data.profile.name }}</h2>
              <p v-if="data.profile.address || data.profile.city" class="mt-1 flex items-start gap-1.5 text-sm"><MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{{ data.profile.address || data.profile.city }}</p>
              <p v-else class="mt-1 text-sm text-muted-foreground">No address yet</p>
              <p v-if="data.profile.floorType" class="mt-1 text-sm text-muted-foreground">Floor: {{ data.profile.floorType }}</p>
              <DanceStyleChips v-if="data.profile.styles.length" :styles="data.profile.styles" class="mt-2" />
              <p v-if="data.profile.bio" class="mt-2 line-clamp-3 text-sm text-muted-foreground">{{ data.profile.bio }}</p>
              <div v-if="data.profile.photos.length > 1" class="mt-3 flex gap-2 overflow-x-auto">
                <img v-for="ph in data.profile.photos.slice(0, 5)" :key="ph.url" :src="sizedImage(ph.url, IMG.card)" alt="" class="h-16 w-16 shrink-0 rounded-lg border object-cover">
              </div>
              <NuxtLink :to="`/@${data.profile.username}`" target="_blank" class="mt-3 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">Open the full page <ExternalLink class="size-3" aria-hidden="true" /></NuxtLink>
            </div>
          </article>
          <p v-if="data.pending.length" class="rounded-2xl bg-secondary/10 p-3 text-sm">{{ data.event?.host?.name || 'The organizer' }} suggested {{ data.pending.length === 1 ? 'a change' : `${data.pending.length} changes` }} to your page. You decide which to keep.</p>
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="pill" @click="step = 'done'"><ThumbsUp /> Looks right</Button>
            <Button variant="outline-pill" @click="changePage"><Pencil /> {{ data.pending.length ? 'See their changes' : 'Change something' }}</Button>
          </div>
        </section>

        <!-- Make it yours -->
        <section v-else-if="step === 'account'" class="rounded-2xl border bg-card p-6 shadow-wd-card">
          <p v-if="!staged" class="flex items-center gap-1.5 text-sm font-bold text-wd-green-700"><Check class="size-4" aria-hidden="true" /> Saved. Thank you!</p>
          <h1 class="mt-2 font-display text-2xl font-bold">{{ staged ? 'Make the page yours to edit it' : 'Make this page yours' }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ staged ? `So that only you can change ${data.profile.name}'s page, create a free account. Then you edit it right here, and ${isVenue ? 'answer the next organizer' : 'see every event you’re booked for'} in one place.` : 'Nobody manages your WeDance page yet. Take it over to keep it up to date, get booked, and see where you’re playing and teaching.' }}</p>
          <form class="mt-5 grid gap-3" novalidate @submit.prevent="claim">
            <template v-if="!isSignedIn">
              <Field id="acc-email" label="Email"><Input v-model="account.email" type="email" autocomplete="email" /></Field>
              <Field id="acc-password" label="Password" hint="At least 8 characters."><Input v-model="account.password" type="password" autocomplete="new-password" /></Field>
            </template>
            <p v-else class="text-sm">You’re signed in: it becomes part of your account.</p>
            <p v-if="accountError" class="text-sm text-destructive" role="alert">{{ accountError }}</p>
            <div class="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="pill" :loading="claiming">{{ isSignedIn ? 'Make it mine' : 'Create my account' }}</Button>
              <button v-if="!isSignedIn" type="button" class="text-xs font-bold text-secondary hover:underline" @click="showSignIn = true">I already have an account</button>
              <button type="button" class="text-xs text-muted-foreground hover:underline" @click="step = isVenue ? 'page' : 'done'">{{ staged ? 'Back' : 'Not now' }}</button>
            </div>
          </form>
          <SignUpModal v-model:open="showSignIn" action="signin" />
        </section>

        <!-- Check the details -->
        <template v-else>
          <template v-if="step === 'edit'">
            <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">{{ isVenue ? 'Your venue’s page' : 'Your page' }}</p>
            <h1 class="mt-1 font-display text-3xl font-bold">{{ data.profile.name }}</h1>
            <p class="mt-1 text-sm text-muted-foreground">What organizers and dancers see. Change what you like; everything is optional except the name.</p>
          </template>
          <template v-else>
          <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">WeDance</p>
          <h1 class="mt-1 font-display text-3xl font-bold">
            <template v-if="isVenue">{{ venueHeadline }}</template>
            <template v-else>{{ data.event ? `${data.event.name} with ${data.event.lineupName || data.profile.name}?` : 'Your page on WeDance' }}</template>
          </h1>
          <p v-if="isVenue" class="mt-1 text-sm text-muted-foreground">{{ data.event?.host?.name || 'An organizer' }} asks if you can host it. Check what they need, then answer at the bottom. It’s a question, not a booking: they get back to you to agree the details.</p>
          <p v-if="isVenue && step === 'check' && data.answer && data.answer.status !== 'invited'" class="mt-3 rounded-xl bg-muted p-3 text-xs">You answered already: {{ { confirmed: 'you can host it', proposed: 'another date', declined: 'not this time' }[data.answer.status as 'confirmed'] }}. Change anything and answer again.</p>

          <!-- The ask, with the event's flyer: what a venue decides on -->
          <section v-if="isVenue && facts" class="mt-5 grid gap-4 rounded-2xl border bg-card p-4 shadow-wd-card" :class="data.event?.flyer && 'sm:grid-cols-[13rem_1fr]'">
            <a v-if="data.event?.flyer" :href="data.event.flyer.url" target="_blank" rel="noopener" class="block self-start" aria-label="Open the flyer full size">
              <img :src="sizedImage(data.event.flyer.url, IMG.large)" alt="The event’s flyer" class="mx-auto max-h-[26rem] w-auto rounded-xl border sm:w-full">
            </a>
            <div class="grid min-w-0 content-start gap-2 text-sm">
              <p class="font-display text-xl font-bold">{{ facts.eventName || data.event?.name }} <span v-if="data.event?.type" class="text-sm font-normal text-muted-foreground">· {{ data.event.type }}</span></p>
              <p class="flex items-start gap-2"><CalendarDays class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span class="font-bold">{{ facts.when }}</span></p>
              <p v-if="accessText" class="flex items-start gap-2"><Clock class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>Room needed <span class="font-bold">{{ accessText }}</span> <span class="text-muted-foreground">(setup and cleanup included)</span></span></p>
              <p v-if="facts.guests" class="flex items-start gap-2"><Users class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>About <span class="font-bold">{{ facts.guests }} dancers</span><template v-if="facts.price"> · entry {{ facts.price }}</template></span></p>
              <p v-if="facts.needs.length" class="flex items-start gap-2"><MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>They need: {{ facts.needs.join(' · ') }}</span></p>
              <p class="flex items-start gap-2"><Euro class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span v-if="facts.offer">They offer: <span class="font-bold">{{ facts.offer }}</span></span><span v-else>No offer yet: <span class="font-bold">tell them your price</span> below.</span></p>
              <p v-if="facts.note" class="flex items-start gap-2"><MessageSquare class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span class="text-muted-foreground">“{{ facts.note }}”</span></p>
              <p v-if="data.event?.host" class="flex items-start gap-2"><PartyPopper class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>By <NuxtLink v-if="data.event.host.username" :to="`/@${data.event.host.username}`" target="_blank" class="font-bold hover:underline">{{ data.event.host.name }}</NuxtLink><span v-else class="font-bold">{{ data.event.host.name }}</span><template v-if="data.event.host.instagram"> · <a :href="data.event.host.instagram" target="_blank" rel="noopener" class="hover:underline">Instagram</a></template><template v-if="data.event.hostEvents >= 2"><span class="text-muted-foreground"> · {{ data.event.hostEvents }} events{{ data.event.hostCity ? ` in ${data.event.hostCity}` : '' }}</span></template></span>
              </p>
              <span v-if="data.event">
                <NuxtLink :to="data.event.published ? data.event.path : `${data.event.path}?preview=${encodeURIComponent(param)}`" target="_blank" class="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">{{ data.event.published ? 'See the event page' : 'Preview the event page' }} <ExternalLink class="size-3" aria-hidden="true" /></NuxtLink>
                <span v-if="!data.event.published" class="block text-xs text-muted-foreground">Not published yet: only you can see this preview.</span>
              </span>
            </div>
          </section>

          <!-- The plan at this venue -->
          <section v-if="isVenue && facts" class="mt-4 rounded-2xl border bg-card p-4">
            <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">The plan at your place</p>
            <template v-if="planByDay.length">
              <div v-for="d in planByDay" :key="d.date" class="mt-2">
                <p v-if="planByDay.length > 1" class="text-xs font-bold">{{ d.label }}</p>
                <ol class="mt-1 grid gap-1.5">
                  <li v-for="(x, i) in d.items" :key="i" class="grid grid-cols-[6.5rem_1fr] gap-2 text-sm">
                    <span class="font-mono text-xs leading-5 text-muted-foreground">{{ x.end ? `${x.time}–${x.end}` : x.time }}</span>
                    <span><span class="font-bold">{{ x.title }}</span><span class="block text-xs text-muted-foreground">{{ [x.kind !== x.title && x.kind, x.who, x.room && `Room ${x.room}`].filter(Boolean).join(' · ') }}</span></span>
                  </li>
                </ol>
              </div>
            </template>
            <p v-else class="mt-1 text-sm text-muted-foreground">They haven’t written the plan yet: {{ facts.when }}.</p>
            <p v-if="facts.elsewhere" class="mt-2 text-xs text-muted-foreground">{{ facts.elsewhere }} more {{ facts.elsewhere === 1 ? 'item is' : 'items are' }} at another venue.</p>
          </section>
          <template v-else-if="!isVenue && data.event">
            <p class="mt-1 text-sm text-muted-foreground">{{ data.event.host?.name || 'An organizer' }} put you in the line-up. Check what they have, fix anything that’s off, then answer at the bottom.</p>
            <p v-if="answeredBefore && step === 'check'" class="mt-3 rounded-xl bg-muted p-3 text-xs">You answered already: {{ answeredBefore === 'declined' ? 'you can’t make it' : 'you’re in' }}. Change anything and answer again.</p>

            <!-- The event, with its flyer -->
            <section class="mt-5 grid gap-4 rounded-2xl border bg-card p-4 shadow-wd-card" :class="data.event.flyer && 'sm:grid-cols-[13rem_1fr]'">
              <a v-if="data.event.flyer" :href="data.event.flyer.url" target="_blank" rel="noopener" class="block self-start" aria-label="Open the flyer full size">
                <img :src="sizedImage(data.event.flyer.url, IMG.large)" alt="The event’s flyer" class="mx-auto max-h-[26rem] w-auto rounded-xl border sm:w-full">
              </a>
              <div class="min-w-0 text-sm">
                <p class="font-display text-xl font-bold">{{ data.event.name }} <span v-if="data.event.type" class="text-sm font-normal text-muted-foreground">· {{ data.event.type }}</span></p>
                <p class="mt-2 flex items-start gap-1.5"><CalendarDays class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> <span class="font-bold">{{ fmtDays(data.event) }}</span></p>
                <p v-if="data.event.venue || data.event.city" class="mt-1 flex items-start gap-1.5"><MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{{ [data.event.venue, data.event.address || data.event.city].filter(Boolean).join(', ') }}<template v-if="data.event.otherVenues.length"><br><span class="text-muted-foreground">Also at: {{ data.event.otherVenues.join(' · ') }}</span></template></span>
                </p>
                <p v-if="data.event.host" class="mt-1 flex items-start gap-1.5"><Users class="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>By <NuxtLink v-if="data.event.host.username" :to="`/@${data.event.host.username}`" target="_blank" class="font-bold hover:underline">{{ data.event.host.name }}</NuxtLink><span v-else class="font-bold">{{ data.event.host.name }}</span><template v-if="data.event.host.instagram"> · <a :href="data.event.host.instagram" target="_blank" rel="noopener" class="hover:underline">Instagram</a></template><template v-if="data.event.hostEvents >= 2"><span class="text-muted-foreground"> · {{ data.event.hostEvents }} events{{ data.event.hostCity ? ` in ${data.event.hostCity}` : '' }}</span></template></span>
                </p>
                <template v-if="data.event.lineup.length">
                  <p class="mt-3 text-xs font-bold">With</p>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    <span v-for="a in data.event.lineup" :key="a.username" class="inline-flex items-center gap-1.5 rounded-full border bg-background py-0.5 pl-0.5 pr-2 text-xs">
                      <img v-if="a.photo" :src="sizedImage(a.photo, IMG.avatar)" alt="" class="size-5 rounded-full object-cover"><span v-else class="size-5 rounded-full bg-muted" /> {{ a.name }}
                    </span>
                  </div>
                </template>
                <NuxtLink :to="data.event.published ? data.event.path : `${data.event.path}?preview=${encodeURIComponent(param)}`" target="_blank" class="mt-3 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">{{ data.event.published ? 'See the event page' : 'Preview the event page' }} <ExternalLink class="size-3" aria-hidden="true" /></NuxtLink>
                <span v-if="!data.event.published" class="block text-xs text-muted-foreground">Not published yet: only you can see this preview.</span>
              </div>
            </section>
          </template>
          <div v-if="data.ask?.outcome" class="mt-4 rounded-2xl p-4 text-sm" :class="data.ask.outcome === 'booked' ? 'bg-wd-green-700/10' : 'bg-muted'">
            <p class="font-bold">{{ data.ask.outcome === 'booked' ? 'You’re booked 🎉' : 'They booked another venue for this one' }}</p>
            <p class="text-muted-foreground">{{ data.ask.outcome === 'booked' ? `${data.event?.host?.name || 'The organizer'} picked ${data.profile.name}. Sort out the details with them directly.` : 'Thanks for answering. Your page stays up to date for the next organizer who asks.' }}</p>
          </div>

          </template>

          <div v-if="!data.canAnswer" class="mt-6 rounded-2xl bg-secondary/10 p-4 text-sm">
            <p class="font-bold">This page has an owner.</p>
            <p class="text-muted-foreground">Sign in with the account that manages @{{ data.profile.username }} to approve the changes.</p>
            <Button variant="pill" size="pill-sm" class="mt-3" @click="showSignIn = true">Sign in</Button>
            <SignUpModal v-model:open="showSignIn" action="signin" />
          </div>

          <form v-else class="mt-4 grid gap-4" novalidate @submit.prevent="save">
            <template v-if="venueCheck">
              <!-- Terms: only when theirs differ from the offer -->
              <section class="rounded-2xl border bg-card p-4">
                <p class="text-sm font-bold">{{ facts?.offer ? 'Their offer' : 'Your price' }}</p>
                <p class="text-xs text-muted-foreground">{{ facts?.offer ? `${facts.offer}. Fine as it is? Nothing to do here.` : 'What you’d charge for this.' }} Only {{ data.event?.host?.name || 'the organizer' }} sees your terms.</p>
                <button v-if="!termsOpen" type="button" class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline" @click="termsOpen = true"><Euro class="size-3.5" aria-hidden="true" /> Different terms?</button>
                <template v-else>
                  <div class="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field id="v-rent" label="Rent" optional><Input v-model="venue.rent" placeholder="e.g. €300, or free" /></Field>
                    <Field id="v-min" label="Minimum bar spend" optional><Input v-model="venue.minSpend" placeholder="e.g. €1,500" /></Field>
                    <Field id="v-door" label="Door split" optional><Input v-model="venue.doorSplit" placeholder="e.g. 70/30 for the organizer" /></Field>
                    <Field id="v-dep" label="Deposit" optional><Input v-model="venue.deposit" placeholder="e.g. €200, back after" /></Field>
                    <Field id="v-cap" label="People it holds" optional><Input v-model.number="venue.capacity" type="number" min="1" class="w-32" /></Field>
                  </div>
                  <p class="mt-3 text-sm font-bold">Included</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5">
                    <Button v-for="x in VENUE_INCLUDES" :key="x" type="button" size="sm" :variant="venue.includes.includes(x) ? 'soft' : 'outline'" :aria-pressed="venue.includes.includes(x)" @click="toggleInclude(x)">{{ x }}</Button>
                  </div>
                  <Field id="v-notes" label="Anything else about the terms" optional class="mt-3"><Textarea v-model="venue.notes" :rows="2" /></Field>
                </template>
              </section>

              <Field id="c-msg" :label="`Anything else for ${data.event?.host?.name || 'the organizer'}?`" optional>
                <Textarea v-model="answer.message" :rows="2" />
              </Field>
              <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

              <!-- The one answer (right-aligned: the help bubble sits bottom-left) -->
              <div class="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur"><div class="mx-auto max-w-2xl px-4 py-3">
                <div v-if="!isSignedIn" class="mb-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                  <label for="c-email" class="text-xs text-muted-foreground">{{ data.answer?.email ? `Your copy went to ${data.answer.email}${data.answer.emailConfirmed ? ' (confirmed)' : ''}. Email:` : 'Your email, for your copy:' }}</label>
                  <Input id="c-email" v-model="answerEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" class="h-9 w-full max-w-64 text-sm" :aria-invalid="emailError ? true : undefined" aria-describedby="c-email-error" />
                  <FieldError id="c-email-error" :message="emailError ?? undefined" class="w-full text-right" />
                </div>
                <template v-if="proposing">
                  <Field id="v-alt" label="Which dates work instead?" hint="E.g. “Friday 16 October”, “any Wednesday in November”.">
                    <Input v-model="venue.alternative" autofocus />
                  </Field>
                  <div class="mt-2 flex flex-wrap items-center justify-end gap-2">
                    <Button type="button" variant="ghost" :disabled="saving" @click="proposing = false">Back</Button>
                    <Button type="button" variant="pill" :loading="saving" :disabled="!venue.alternative.trim()" @click="sendVenue('proposed')"><CalendarDays /> Suggest this date</Button>
                  </div>
                </template>
                <div v-else class="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="ghost" :loading="saving && venue.answer === 'declined'" :disabled="saving" @click="sendVenue('declined')">No, sorry</Button>
                  <Button type="button" variant="outline-pill" :disabled="saving" @click="proposing = true">Another date</Button>
                  <Button type="button" variant="pill" :loading="saving && venue.answer === 'confirmed'" :disabled="saving" @click="sendVenue('confirmed')"><Check /> Yes, we can</Button>
                </div>
                <p v-if="data.event?.host?.instagram" class="mt-1.5 text-right text-xs text-muted-foreground"><template v-if="data.event?.host?.instagram">Rather talk? <a :href="data.event.host.instagram" target="_blank" rel="noopener" class="font-bold text-secondary hover:underline">Message {{ data.event.host.name }}</a></template></p>
              </div></div>
            </template>
            <template v-else-if="artistCheck && data.event">
              <!-- Your classes -->
              <section class="rounded-2xl border bg-card p-4">
                <p class="text-sm font-bold">{{ data.event.programme.length ? 'Your classes' : 'Your slot' }}</p>
                <ul v-if="data.event.programme.length" class="mt-2 grid gap-1.5">
                  <li v-for="(x, i) in data.event.programme" :key="i" class="rounded-xl bg-background px-3 py-2 text-sm">
                    <span class="font-bold tabular-nums">{{ new Set(data.event.programme.map(y => y.date)).size > 1 ? `${fmtSession(x.date)} · ` : '' }}{{ sessionTimeRange(x) }}</span> {{ x.title }}
                    <span class="block text-xs text-muted-foreground">{{ [isWorkshop(x.type) ? [x.style !== x.title && x.style, x.level].filter(Boolean).join(' · ') : SESSION_TYPE_LABEL[sessionType(x.type)], x.with.length ? `with ${x.with.join(' & ')}` : '', x.room && `Room ${x.room}`, x.venue].filter(Boolean).join(' · ') }}</span>
                  </li>
                </ul>
                <p v-else class="mt-1 text-sm text-muted-foreground">They haven’t put you in the programme yet. Fine for them to decide, or tell them what suits you.</p>
                <button v-if="answer.programmeOk !== false" type="button" class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline" @click="answer.programmeOk = false"><MessageSquare class="size-3.5" aria-hidden="true" /> {{ data.event.programme.length ? 'Something’s wrong?' : 'Have a wish?' }}</button>
                <template v-else>
                  <Field id="c-prog" label="What should change?" class="mt-3" hint="E.g. “I can only teach Saturday”, “that’s Intermediate”, “I teach it with Ana”.">
                    <Textarea v-model="answer.programmeNote" :rows="3" />
                  </Field>
                  <button type="button" class="mt-1 text-xs text-muted-foreground hover:underline" @click="answer.programmeOk = null; answer.programmeNote = ''">Never mind, it’s right</button>
                </template>
              </section>

              <!-- The deal: their offer as is, or the artist's fee and needs -->
              <section class="rounded-2xl border bg-card p-4">
                <p class="text-sm font-bold">{{ data.deal?.offer ? 'Their offer' : 'Your fee' }}</p>
                <p v-if="data.deal?.offer" class="text-sm">{{ data.deal.offer }}</p>
                <p class="text-xs text-muted-foreground">{{ data.deal?.offer ? 'Fine as it is? Nothing to do here.' : 'Optional. Coming for a pass or for free? Leave it empty.' }} Only {{ data.event.host?.name || 'the organizer' }} sees this.</p>
                <button v-if="!dealOpen" type="button" class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline" @click="dealOpen = true"><Euro class="size-3.5" aria-hidden="true" /> Different terms?</button>
                <div v-else class="mt-3 grid gap-3">
                  <Field id="a-fee" label="Your fee" optional><Input v-model="deal.fee" placeholder="e.g. €120 per class, or €300 for the day" maxlength="200" /></Field>
                  <Field id="a-needs" label="What else you need" optional hint="Travel, a room, meals, a partner’s pass…"><Textarea v-model="deal.needs" :rows="2" maxlength="1000" /></Field>
                </div>
              </section>

              <!-- Name and photo, as the flyer shows them -->
              <section class="rounded-2xl border bg-card p-4">
                <p class="text-sm font-bold">{{ data.event.flyer ? 'You on the flyer' : 'Your name and photo' }}</p>
                <p class="text-xs text-muted-foreground">{{ data.event.flyer ? 'The flyer uses this name and photo. Fix them if they’re wrong.' : 'Used on the flyer and the event page.' }}<template v-if="!data.member"> This changes {{ data.event.name }} only: your WeDance page stays as it is.</template></p>
                <Field id="f-name" label="Your name as it should appear" class="mt-3"><Input v-model="form.name" /></Field>
                <p v-if="nameSuggestion" class="mt-1 text-xs text-muted-foreground">{{ data.event.host?.name || 'They' }} wrote “{{ nameSuggestion.value }}”, your page says “{{ data.profile.name }}”.
                  <button type="button" class="font-bold text-secondary hover:underline" @click="useTheirs(nameSuggestion.id, !decisions[nameSuggestion.id])">{{ decisions[nameSuggestion.id] ? 'Keep mine' : 'Use theirs' }}</button>
                </p>
                <p class="mt-4 text-sm font-bold">Your photo</p>
                <p class="text-xs text-muted-foreground">Tap another one, or add a new one.</p>
                <div class="mt-2 flex flex-wrap gap-3">
                  <button v-for="url in flyerPhotoChoices" :key="url" type="button" class="relative rounded-xl focus-visible:shadow-wd-focus" :aria-pressed="form.mainPhoto === url" :aria-label="form.mainPhoto === url ? 'Your flyer photo' : 'Use this photo'" @click="form.mainPhoto = url">
                    <img :src="sizedImage(url, IMG.card)" alt="" class="h-32 w-24 rounded-xl border-2 object-cover" :class="form.mainPhoto === url ? 'border-primary' : 'border-transparent opacity-70'">
                    <span v-if="form.mainPhoto === url" class="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-card/90 py-0.5 text-[11px] font-bold"><Star class="size-3 fill-current text-wd-amber-600" aria-hidden="true" /> {{ data.event.flyer ? 'On the flyer' : 'Your photo' }}</span>
                  </button>
                  <label class="flex h-32 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-center text-xs text-muted-foreground has-[:focus-visible]:shadow-wd-focus">
                    <Loader2 v-if="uploading" class="size-5 animate-spin" aria-hidden="true" /><ImagePlus v-else class="size-5" aria-hidden="true" /> Add a photo
                    <input type="file" accept="image/*" class="sr-only" @change="uploadMain">
                  </label>
                </div>
                <template v-if="pendingPhotos.length && data.member">
                  <p class="mt-4 text-sm font-bold">Photos {{ data.event.host?.name || 'the organizer' }} added</p>
                  <p class="text-xs text-muted-foreground">Tick the ones they may use. The others stay off your page.</p>
                  <div class="mt-2 flex flex-wrap gap-3">
                    <label v-for="ph in pendingPhotos" :key="ph.id" class="relative cursor-pointer">
                      <img :src="sizedImage(ph.value, IMG.card)" alt="Photo the organizer added" class="h-32 w-24 rounded-xl border-2 object-cover" :class="decisions[ph.id] ? 'border-primary' : 'border-transparent opacity-60'">
                      <span class="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-card/90 py-0.5 text-[11px] font-bold">
                        <Checkbox v-model="decisions[ph.id]" /> {{ decisions[ph.id] ? 'Use it' : 'Don’t use' }}
                      </span>
                      <button v-if="decisions[ph.id] && form.mainPhoto !== ph.value" type="button" class="absolute left-1 top-1 rounded-full bg-card/90 p-1" aria-label="Use this photo for the flyer" @click.prevent="form.mainPhoto = ph.value"><Star class="size-3.5" /></button>
                      <span v-else-if="form.mainPhoto === ph.value" class="absolute left-1 top-1 rounded-full bg-card/90 p-1"><Star class="size-3.5 fill-current text-wd-amber-600" aria-hidden="true" /></span>
                    </label>
                  </div>
                </template>
                <p v-if="data.event.flyer && photoChanged" class="mt-3 rounded-xl bg-secondary/10 p-3 text-xs">The flyer that’s out now keeps the photo it was made with. The next version uses your new one.</p>
              </section>

              <!-- Promoting them -->
              <section class="rounded-2xl border bg-card p-4">
                <label class="flex cursor-pointer items-start gap-3 text-sm">
                  <Checkbox v-model="answer.postsOk" class="mt-0.5" />
                  <span><span class="font-bold">Promote me</span><span class="block text-xs text-muted-foreground">{{ data.event.host?.name || 'The organizer' }} may use your name and photos in posts about {{ data.event.name }}.</span></span>
                </label>
              </section>

              <Field id="c-msg" :label="`Anything else for ${data.event.host?.name || 'the organizer'}?`" optional>
                <Textarea v-model="answer.message" :rows="2" />
              </Field>
              <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

              <!-- The one answer -->
              <div class="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur"><div class="mx-auto max-w-2xl px-4 py-3">
                <!-- Right-aligned: the help bubble sits bottom-left. -->
                <div v-if="!isSignedIn" class="mb-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                  <label for="c-email" class="text-xs text-muted-foreground">{{ data.answer?.email ? `Your copy went to ${data.answer.email}${data.answer.emailConfirmed ? ' (confirmed)' : ''}. Email:` : 'Your email, for your copy:' }}</label>
                  <Input id="c-email" v-model="answerEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" class="h-9 w-full max-w-64 text-sm" :aria-invalid="emailError ? true : undefined" aria-describedby="c-email-error" />
                  <FieldError id="c-email-error" :message="emailError ?? undefined" class="w-full text-right" />
                </div>
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="outline-pill" :loading="saving && answer.participation === 'declined'" :disabled="saving" @click="send('declined')">I can’t make it</Button>
                  <Button type="button" variant="pill" :loading="saving && answer.participation === 'confirmed'" :disabled="saving" @click="send('confirmed')"><Check /> Yes, I’m in</Button>
                </div>
                <p v-if="data.event.host?.instagram" class="mt-1.5 text-right text-xs text-muted-foreground"><template v-if="data.event.host?.instagram">Rather talk? <a :href="data.event.host.instagram" target="_blank" rel="noopener" class="font-bold text-secondary hover:underline">Message {{ data.event.host.name }}</a></template></p>
              </div></div>
            </template>
            <template v-if="!staged || step === 'edit'">
            <!-- Name -->
            <section class="rounded-2xl border bg-card p-4">
              <Field id="c-name" :label="isVenue ? 'The venue’s name' : 'Your name as it should appear'">
                <Input v-model="form.name" />
              </Field>
              <Field id="c-city" label="City" optional class="mt-3"><CityCombobox v-model="form.city" placeholder="e.g. Vienna" /></Field>
              <template v-if="isVenue">
                <Field id="c-address" label="Address" optional class="mt-3"><Input v-model="form.address" placeholder="Street and number, postcode" /></Field>
                <Field id="c-floor" label="Floor" optional class="mt-3"><Select v-model="form.floorType" :options="[{ label: 'Not set', value: '' }, ...[...new Set([...FLOORS, form.floorType].filter(Boolean))].map(f => ({ label: f, value: f }))]" /></Field>
              </template>
              <Field :label="isVenue ? 'Music you host' : 'Dance styles'" :optional="isVenue" class="mt-3"><DanceStylePicker v-model="form.styles" /></Field>
            </section>

            <!-- What the organizer changed, field by field -->
            <section v-if="pendingFields.length" class="rounded-2xl border-2 border-secondary/30 bg-card p-4">
              <p class="flex items-center gap-1.5 text-sm font-bold"><Clock class="size-4 text-muted-foreground" aria-hidden="true" /> Changes from {{ data.event?.host?.name || 'the organizer' }}</p>
              <ul class="mt-2 grid gap-3">
                <li v-for="s in pendingFields" :key="s.id" class="text-sm">
                  <p class="font-bold">{{ s.label }}</p>
                  <p class="text-xs"><span class="text-muted-foreground">Theirs:</span> {{ show(s.kind as any, s.value) }}</p>
                  <p class="text-xs"><span class="text-muted-foreground">Yours now:</span> {{ show(s.kind as any, currentValue(s.kind as any)) }}</p>
                  <div class="mt-1 flex gap-2">
                    <Button type="button" size="sm" :variant="decisions[s.id] ? 'soft' : 'ghost'" @click="useTheirs(s.id, true)">Use theirs</Button>
                    <Button type="button" size="sm" :variant="decisions[s.id] ? 'ghost' : 'soft'" @click="useTheirs(s.id, false)">Keep mine</Button>
                  </div>
                </li>
              </ul>
            </section>

            <!-- Photos -->
            <section class="rounded-2xl border bg-card p-4">
              <p class="text-sm font-bold">Photos</p>
              <p class="text-xs text-muted-foreground">{{ isVenue ? 'The room, the floor, the bar: organizers and dancers look at these. Tap the star for the main one.' : 'Organizers pick from these for flyers. Tap the star for your main photo.' }}</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <div v-for="url in [...currentPhotos, ...addPhotos]" :key="url" class="relative">
                  <img :src="sizedImage(url, IMG.card)" alt="Your photo" class="h-32 w-24 rounded-xl border object-cover">
                  <button type="button" class="absolute left-1 top-1 rounded-full bg-card/90 p-1" :aria-label="form.mainPhoto === url ? 'Main photo' : 'Make this the main photo'" :aria-pressed="form.mainPhoto === url" @click="form.mainPhoto = url">
                    <Star class="size-3.5" :class="form.mainPhoto === url ? 'fill-current text-wd-amber-600' : ''" />
                  </button>
                  <button type="button" class="absolute right-1 top-1 rounded-full bg-card/90 p-1" aria-label="Remove this photo" @click="addPhotos.includes(url) ? addPhotos.splice(addPhotos.indexOf(url), 1) : toggleRemove(url)"><X class="size-3.5" /></button>
                </div>
                <label class="flex h-32 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-center text-xs text-muted-foreground has-[:focus-visible]:shadow-wd-focus">
                  <Loader2 v-if="uploading" class="size-5 animate-spin" aria-hidden="true" /><ImagePlus v-else class="size-5" aria-hidden="true" /> Add photos
                  <input type="file" accept="image/*" multiple class="sr-only" @change="upload">
                </label>
              </div>
              <template v-if="pendingPhotos.length">
                <p class="mt-4 flex items-center gap-1.5 text-sm font-bold"><Clock class="size-4 text-muted-foreground" aria-hidden="true" /> Added by {{ data.event?.host?.name || 'an organizer' }}</p>
                <div class="mt-2 flex flex-wrap gap-3">
                  <label v-for="s in pendingPhotos" :key="s.id" class="relative cursor-pointer">
                    <img :src="s.value" alt="Photo the organizer added" class="h-32 w-24 rounded-xl border-2 object-cover" :class="decisions[s.id] ? 'border-primary' : 'border-transparent opacity-50'">
                    <span class="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-card/90 py-0.5 text-[11px] font-bold">
                      <Checkbox v-model="decisions[s.id]" /> {{ decisions[s.id] ? 'Keep' : 'Don’t use' }}
                    </span>
                  </label>
                </div>
              </template>
            </section>

            <!-- Videos -->
            <section v-if="!isVenue" class="rounded-2xl border bg-card p-4">
              <p class="text-sm font-bold">Videos <span class="font-normal text-muted-foreground">(optional)</span></p>
              <ul class="mt-2 grid gap-1 text-sm">
                <li v-for="v in data.profile.videos" :key="v.url" class="truncate text-muted-foreground">{{ v.url }}</li>
                <li v-for="v in addVideos" :key="v" class="flex items-center gap-2"><span class="truncate">{{ v }}</span><button type="button" aria-label="Remove video" @click="addVideos.splice(addVideos.indexOf(v), 1)"><X class="size-3.5" /></button></li>
                <li v-for="s in pendingVideos" :key="s.id">
                  <label class="flex items-center gap-2"><Checkbox v-model="decisions[s.id]" /> <span class="truncate">{{ s.value }}</span> <span class="shrink-0 text-xs text-muted-foreground">· added by the organizer</span></label>
                </li>
              </ul>
              <div class="mt-2 flex gap-2">
                <Input v-model="newVideo" placeholder="YouTube or Vimeo link" aria-label="Add a video link" class="flex-1" @keydown.enter.prevent="addVideo" />
                <Button type="button" variant="ghost" size="sm" @click="addVideo"><Plus /> Add</Button>
              </div>
              <p v-if="videoError" class="mt-1 text-xs text-destructive" role="alert">{{ videoError }}</p>
            </section>

            <!-- About -->
            <section class="rounded-2xl border bg-card p-4">
              <Field id="c-bio" :label="isVenue ? 'About the venue' : 'About you'" optional :hint="isVenue ? 'Rooms, sound, bar, what kind of nights you host.' : 'A few lines: what you teach or play, where you’re from.'">
                <Textarea v-model="form.bio" :rows="4" />
              </Field>
              <Field id="c-ig" label="Instagram" optional class="mt-3">
                <div class="relative">
                  <Instagram class="absolute left-3.5 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <Input v-model="form.instagram" class="pl-10" placeholder="instagram.com/yourname" />
                </div>
              </Field>
              <Field id="c-web" label="Website" optional class="mt-3"><Input v-model="form.website" placeholder="https://…" /></Field>
              <Field id="c-fb" label="Facebook" optional class="mt-3"><Input v-model="form.facebook" placeholder="facebook.com/…" /></Field>
            </section>
            </template>

            <template v-if="!artistCheck && !venueCheck">
            <Field v-if="data.event && step !== 'edit'" id="c-msg" label="Anything else for the organizer?" optional>
              <Textarea v-model="answer.message" :rows="2" />
            </Field>
            <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
            <div class="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="pill" :loading="saving"><Check /> {{ step === 'edit' ? 'Save my page' : data.event || isVenue ? 'Send my answer' : 'Looks good, save' }}</Button>
              <button v-if="step === 'edit'" type="button" class="text-xs text-muted-foreground hover:underline" @click="step = 'done'">Cancel</button>
              <a v-if="staged && step === 'check' && data.event?.host?.instagram" :href="data.event.host.instagram" target="_blank" rel="noopener" class="text-xs font-bold text-secondary hover:underline">Rather talk? Message {{ data.event.host.name }} on Instagram</a>
            </div>
            </template>
          </form>
        </template>
      </template>
    </main>
  </div>
</template>
