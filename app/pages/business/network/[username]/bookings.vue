<script setup lang="ts">
/**
 * /business/network/<username>/bookings — people who asked to book this page
 * (inquiries.forProfile), newest first. Answer by email (opens a reply), then
 * mark it answered or declined. Also the booking link to put on your own site.
 * Artists set the weekly times they are free for a private booking here.
 */
import { Mail, Copy, Check, CalendarDays, MapPin, Users, Wallet, ExternalLink, Phone, Plus, Trash2 } from 'lucide-vue-next'
import { WEEKDAYS } from '#shared/types/venueDetails'

definePageMeta({ layout: 'business' })
const route = useRoute()
const username = computed(() => String(route.params.username))
useHead({ title: 'Bookings | Business | WeDance' })

const { $trpc } = useNuxtApp()
type Row = Awaited<ReturnType<typeof $trpc.inquiries.forProfile.query>>[number]
const rows = ref<Row[] | null>(null)
const error = ref<string | null>(null)
async function load() {
  try { rows.value = await $trpc.inquiries.forProfile.query({ username: username.value }); error.value = null }
  catch (e: any) { error.value = e?.message || 'Couldn’t load the bookings.' }
}
onMounted(load)

const site = useRequestURL().origin
const link = computed(() => `${site}/@${username.value}/book`)
const copied = ref(false)
async function copy() {
  try { await navigator.clipboard.writeText(link.value); copied.value = true; setTimeout(() => (copied.value = false), 2000) } catch {}
}

async function setStatus(r: Row, status: 'new' | 'answered' | 'declined') {
  const before = r.status
  r.status = status
  try { await $trpc.inquiries.setStatus.mutate({ username: username.value, id: r.id, status }) } catch { r.status = before }
}
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const when = (d: string | Date) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const reply = (r: Row) => `mailto:${r.email}?subject=${encodeURIComponent(`Re: booking${r.what ? ` · ${r.what}` : ''}${r.eventDate ? ` · ${day(r.eventDate)}` : ''}`)}`
const open = computed(() => (rows.value ?? []).filter(r => r.status === 'new'))
const closed = computed(() => (rows.value ?? []).filter(r => r.status !== 'new'))

// Artists publish weekly windows here. Venues set times on each room instead.
type Window = { dayOfWeek: number; startTime: string; endTime: string }
const isArtist = ref(false)
const draft = ref<Window[]>([])
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
onMounted(async () => {
  try {
    const page = await $trpc.business.get.query({ username: username.value })
    isArtist.value = page.type === 'artist'
    if (!isArtist.value) return
    const avail = await $trpc.booking.artistAvailability.query({ username: username.value })
    draft.value = avail.slots.map(s => ({ ...s }))
  } catch { /* the requests list already reports its own error */ }
})
function addWindow() {
  saved.value = false
  draft.value.push({ dayOfWeek: 6, startTime: '18:00', endTime: '23:00' })
}
async function saveAvailability() {
  saveError.value = ''
  saved.value = false
  if (draft.value.some(s => !s.startTime || !s.endTime)) {
    saveError.value = 'Each window needs a start and an end.'
    return
  }
  saving.value = true
  try {
    const slots = draft.value.map(s => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime.slice(0, 5), endTime: s.endTime.slice(0, 5) }))
    const result = await $trpc.booking.setArtistAvailability.mutate({ username: username.value, slots })
    saved.value = true
    useTrack().track('artist_availability_saved', { profile: username.value, slots: draft.value.length, published: result.published })
  } catch (e: any) {
    saveError.value = e?.message || 'Couldn’t save your times.'
  } finally { saving.value = false }
}
</script>

<template>
  <div>
    <AdminPageHeader eyebrow="Business" title="Bookings" :description="`People who asked to book @${username}.`" :back="{ to: `/business/network/${username}`, label: 'Profile' }" />

    <!-- The booking link -->
    <section class="mt-6 rounded-2xl border bg-card p-5 shadow-wd-card">
      <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Your booking link</h2>
      <p class="mt-1 text-sm text-muted-foreground">Put it on your website, your Instagram bio or your email signature. It opens a booking page with your photo and a short form. No account needed to send one.</p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <code class="min-w-0 flex-1 truncate rounded-lg border bg-background px-3 py-2 text-sm">{{ link }}</code>
        <Button type="button" variant="pill" size="pill-sm" @click="copy"><component :is="copied ? Check : Copy" /> {{ copied ? 'Copied' : 'Copy' }}</Button>
        <Button variant="outline-pill" size="pill-sm" as-child><a :href="link" target="_blank" rel="noopener"><ExternalLink /> Try it</a></Button>
      </div>
    </section>

    <section v-if="isArtist" data-testid="artist-availability-editor" class="mt-6 rounded-2xl border bg-card p-5 shadow-wd-card">
      <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">When you’re free</h2>
      <p class="mt-1 text-sm text-muted-foreground">Weekly times you take a private event, a wedding or a corporate booking. Organisers see them on your page. Leave this empty and save to publish nothing.</p>
      <ul class="mt-4 grid gap-2">
        <li v-for="(slot, i) in draft" :key="i" class="flex flex-wrap items-center gap-2">
          <label class="sr-only" :for="`avail-day-${i}`">Day</label>
          <select :id="`avail-day-${i}`" v-model.number="slot.dayOfWeek" class="h-9 rounded-lg border bg-card px-2 text-sm" @change="saved = false">
            <option v-for="(label, idx) in WEEKDAYS" :key="label" :value="idx + 1">{{ label }}</option>
          </select>
          <label class="sr-only" :for="`avail-start-${i}`">Start</label>
          <input :id="`avail-start-${i}`" v-model="slot.startTime" type="time" class="h-9 rounded-lg border bg-card px-2 text-sm" @input="saved = false">
          <span class="text-sm text-muted-foreground" aria-hidden="true">–</span>
          <label class="sr-only" :for="`avail-end-${i}`">End</label>
          <input :id="`avail-end-${i}`" v-model="slot.endTime" type="time" class="h-9 rounded-lg border bg-card px-2 text-sm" @input="saved = false">
          <Button type="button" variant="ghost" size="sm" @click="draft.splice(i, 1); saved = false"><Trash2 aria-hidden="true" /> Remove</Button>
        </li>
      </ul>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline-pill" size="pill-sm" @click="addWindow"><Plus aria-hidden="true" /> Add a time</Button>
        <Button type="button" variant="pill" size="pill-sm" :disabled="saving" @click="saveAvailability">{{ saving ? 'Saving…' : 'Save' }}</Button>
      </div>
      <p v-if="saved" class="mt-3 text-sm text-wd-green-700" role="status">{{ draft.length ? 'Saved. Organisers can see this on your page.' : 'Saved. Nothing is published, so organisers won’t see times.' }}</p>
      <p v-if="saveError" class="mt-3 text-sm text-destructive" role="alert">{{ saveError }}</p>
    </section>

    <AdminState v-if="error" kind="error" :message="error" />
    <AdminState v-else-if="!rows" kind="loading" />
    <template v-else>
      <p v-if="!rows.length" class="mt-6 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">No requests yet. Share your booking link and they land here, and in your email.</p>
      <section v-for="group in [{ title: 'Waiting for you', list: open }, { title: 'Done', list: closed }]" v-show="group.list.length" :key="group.title" class="mt-6">
        <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">{{ group.title }}</h2>
        <ul class="mt-3 grid gap-3">
          <li v-for="r in group.list" :key="r.id" class="rounded-2xl border bg-card p-4" :class="r.status !== 'new' ? 'opacity-70' : ''">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <p class="font-bold">{{ r.what }} <span class="font-normal text-muted-foreground">· {{ r.name }}<template v-if="r.organization">, {{ r.organization }}</template></span></p>
              <span class="text-xs text-muted-foreground">{{ when(r.createdAt) }}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span v-if="r.eventDate" class="inline-flex items-center gap-1"><CalendarDays class="size-3.5" aria-hidden="true" /> {{ day(r.eventDate) }}</span>
              <span v-if="r.city" class="inline-flex items-center gap-1"><MapPin class="size-3.5" aria-hidden="true" /> {{ r.city }}</span>
              <span v-if="r.guests" class="inline-flex items-center gap-1"><Users class="size-3.5" aria-hidden="true" /> {{ r.guests }} people</span>
              <span v-if="r.budget" class="inline-flex items-center gap-1"><Wallet class="size-3.5" aria-hidden="true" /> {{ r.budget }}</span>
            </div>
            <p class="mt-3 whitespace-pre-line text-sm">{{ r.message }}</p>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="pill" size="pill-sm" as-child><a :href="reply(r)"><Mail /> Reply to {{ r.email }}</a></Button>
              <Button v-if="r.phone" variant="outline-pill" size="pill-sm" as-child><a :href="`https://wa.me/${r.phone.replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, '')}`" target="_blank" rel="noopener"><Phone /> WhatsApp</a></Button>
              <Button v-if="r.phone" variant="ghost" size="sm" as-child><a :href="`tel:${r.phone.replace(/[^\d+]/g, '')}`">Call {{ r.phone }}</a></Button>
              <template v-if="r.status === 'new'">
                <Button type="button" variant="outline-pill" size="pill-sm" @click="setStatus(r, 'answered')"><Check /> Answered</Button>
                <Button type="button" variant="ghost" size="sm" @click="setStatus(r, 'declined')">Decline</Button>
              </template>
              <template v-else>
                <AdminStatus :tone="r.status === 'answered' ? 'success' : 'neutral'">{{ r.status === 'answered' ? 'Answered' : 'Declined' }}</AdminStatus>
                <Button type="button" variant="ghost" size="sm" @click="setStatus(r, 'new')">Move back</Button>
              </template>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
