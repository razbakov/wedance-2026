<script setup lang="ts">
/**
 * /business/events/new — start an event with one question (RAZ-939): where
 * does the organiser start from?
 *
 *   • "I have a post"      → the Instagram link becomes a draft
 *                             (eventImport.fromInstagram, as MCP import_from_instagram, #453).
 *   • "Like my last event" → pick one of my events and a new date: a draft copy,
 *                             or a weekly series of drafts (businessEvents.copy).
 *   • "From scratch"       → Run by (prefilled), type and music, date and start
 *                             time. The city comes from the host; the name is
 *                             suggested and can be changed now or later.
 *
 * Each makes a DRAFT (RAZ-927; "Publish it now" stays for a simple weekly
 * social) and opens the editor on its steps: venue, line-up, entry, flyer,
 * publish. Nothing here needs a saved event.
 *
 * ?artist=<handle> (from /@handle/book) starts from scratch with that artist in
 * the line-up; ?type=Festival (from /organizers) starts from scratch as that type.
 */
import { Plus, Search, Instagram, Loader2, Copy, PenLine, Check, Pencil } from 'lucide-vue-next'
import { EventStartSchema, EventCopySchema, InstagramPostImportSchema } from '#shared/validation'
import { suggestEventName, nextSameWeekday, type EventStart } from '#shared/utils/eventStart'
import { eventLocalDate, eventLocalTime } from '#shared/utils/eventTime'
import { emptyEventDetails } from '#shared/utils/programme'
import { blankBusinessEvent, toBusinessEventInput } from '~/lib/businessEvent'

definePageMeta({ layout: 'business' })
useHead({ title: 'New event | Business | WeDance' })

const { $trpc } = useNuxtApp()
const route = useRoute()
const { track } = useTrack()
const artist = typeof route.query.artist === 'string' ? route.query.artist.replace(/^@/, '') : ''
const TYPES = ['Party', 'Workshop', 'Course', 'Festival', 'Weekender', 'Congress', 'Concert', 'Show'] as const
type EventType = typeof TYPES[number]
const queryType = typeof route.query.type === 'string' && (TYPES as readonly string[]).includes(route.query.type) ? route.query.type as EventType : null
const businessProfile = useBusinessProfile()
const hosts = ref<{ username: string; name: string; type: string; city: string | null }[] | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    hosts.value = (await $trpc.business.myProfiles.query()).managed
  } catch (e: any) {
    error.value = e?.message || 'Could not load your profiles.'
  }
})

// Default host: the switcher's profile, else the only one, else an organizer.
const defaultHost = computed(() => {
  const list = hosts.value ?? []
  return (list.find(h => h.username === businessProfile.value) ?? (list.length === 1 ? list[0] : list.find(h => h.type === 'organizer')))?.username ?? ''
})
const hostOptions = computed(() => (hosts.value ?? []).map(h => ({ label: h.name, value: h.username })))

// ── The one question ─────────────────────────────────────────────────────────
const start = ref<EventStart | null>(null)
function choose(s: EventStart) {
  if (start.value === s) return
  start.value = s
  track('event_form_opened', { start: s })
  if (s === 'copy') loadPast()
}
const STARTS: { key: EventStart; icon: any; title: string; text: string }[] = [
  { key: 'post', icon: Instagram, title: 'I have a post', text: 'Paste your Instagram post or reel. We read it into a draft.' },
  { key: 'copy', icon: Copy, title: 'Like my last event', text: 'Pick an earlier event and the new date. Venue, line-up and prices come along.' },
  { key: 'scratch', icon: PenLine, title: 'From scratch', text: 'Type, music, date and time. The rest comes step by step.' },
]
// Links that already say what to make go straight to "From scratch".
onMounted(() => { if (artist || queryType) choose('scratch') })

// ── "I have a post" ──────────────────────────────────────────────────────────
const post = reactive({ url: '', profile: '' })
watch(defaultHost, h => { if (!post.profile) post.profile = h }, { immediate: true })
const { errors: postErrors, validate: validatePost, fieldAttrs: postAttrs } = useFormValidation(InstagramPostImportSchema, post)
const importing = ref(false)
const importError = ref<string | null>(null)
async function importPost() {
  const result = validatePost()
  if (!result.success) return
  importing.value = true
  importError.value = null
  try {
    const r = await $trpc.eventImport.fromInstagram.mutate(result.data)
    track('event_imported', { event_id: r.id, source: 'instagram', created: r.created, lineup: r.lineup.length, has_cover: r.cover })
    await navigateTo(`/business/events/${r.id}?created=draft`)
  } catch (e: any) {
    importError.value = e?.message || 'Could not read that post.'
  } finally {
    importing.value = false
  }
}

// ── "Like my last event" ─────────────────────────────────────────────────────
type Past = { id: string; name: string; startDate: string | Date; timezone: string | null; host: { name: string } | null; published: boolean; city: string | null; styles: string[] | null }
const past = ref<Past[] | null>(null)
const pastError = ref<string | null>(null)
async function loadPast() {
  if (past.value) return
  try {
    const l = await $trpc.businessEvents.list.query()
    // Mine only (not line-ups I play), newest first, one row per name.
    const seen = new Set<string>()
    past.value = ([...l.upcoming, ...l.drafts, ...l.past] as any[])
      .filter(e => e.role === 'host')
      .sort((a, b) => +new Date(b.startDate) - +new Date(a.startDate))
      .filter(e => { const k = (e.name ?? '').trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
      .slice(0, 12)
    if (past.value.length) pick(past.value[0]!)
  } catch (e: any) {
    pastError.value = e?.message || 'Could not load your events.'
  }
}
const tzOf = (e: Past) => e.timezone || 'Europe/Berlin'
const todayIso = () => new Date().toISOString().slice(0, 10)
const copy = reactive({ id: '', date: '', repeatWeeks: 0 })
function pick(e: Past) {
  copy.id = e.id
  copy.date = nextSameWeekday(eventLocalDate(e.startDate, tzOf(e)), todayIso())
}
const picked = computed(() => past.value?.find(e => e.id === copy.id) ?? null)
const fmtDay = (d: string) => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''
const repeatOptions = [{ label: 'Just this date', value: '0' }, ...Array.from({ length: 12 }, (_, i) => ({ label: `And ${i + 1} more ${i ? 'weeks' : 'week'}`, value: String(i + 1) }))]
const repeat = computed({ get: () => String(copy.repeatWeeks), set: (v: string) => { copy.repeatWeeks = Number(v) || 0 } })
const { errors: copyErrors, validate: validateCopy } = useFormValidation(EventCopySchema, copy)
const copying = ref(false)
async function makeCopy() {
  const result = validateCopy()
  if (!result.success) return
  copying.value = true
  error.value = null
  try {
    const r = await $trpc.businessEvents.copy.mutate(result.data)
    const src = picked.value
    track('event_created', { event_id: r.id, is_festival: false, city: src?.city ?? null, style: src?.styles?.[0] ?? null, published: false, source: 'copy', dates: r.created.length })
    await navigateTo(`/business/events/${r.id}?created=draft`)
  } catch (e: any) {
    error.value = e?.message || 'Could not copy the event.'
  } finally {
    copying.value = false
  }
}

// ── "From scratch" ───────────────────────────────────────────────────────────
const scratch = reactive({ hostUsername: '', type: (queryType ?? 'Party') as EventType, styles: [] as string[], date: '', startTime: '20:00', name: '', published: false })
watch(defaultHost, h => { if (!scratch.hostUsername) scratch.hostUsername = h }, { immediate: true })
const suggested = computed(() => suggestEventName(scratch))
const naming = ref(false)
function editName() {
  if (!scratch.name) scratch.name = suggested.value
  naming.value = true
}
const host = computed(() => hosts.value?.find(h => h.username === scratch.hostUsername) ?? null)
const { errors: scratchErrors, validate: validateScratch } = useFormValidation(EventStartSchema, scratch)
const saving = ref(false)
async function createFromScratch() {
  const result = validateScratch()
  if (!result.success) return
  saving.value = true
  error.value = null
  try {
    const d = result.data
    const input = toBusinessEventInput({
      ...blankBusinessEvent(),
      hostUsername: d.hostUsername,
      name: d.name || suggested.value,
      type: d.type,
      styles: d.styles,
      date: d.date,
      startTime: d.startTime,
      city: host.value?.city ?? '',
      artists: artist ? [artist] : [],
      published: d.published,
      // Every editor event carries its details (programme, passes, info).
      festival: emptyEventDetails(),
    })
    const { id } = await $trpc.businessEvents.create.mutate(input)
    const props = { event_id: id, is_festival: ['Festival', 'Weekender', 'Congress'].includes(input.type), city: input.city || null, style: input.styles?.[0] ?? null }
    track('event_created', { ...props, published: !!input.published, source: 'scratch' })
    if (input.published) track('event_published', props)
    await navigateTo(`/business/events/${id}?created=${input.published ? 'live' : 'draft'}`)
  } catch (e: any) {
    error.value = e?.message || 'Could not create the event.'
  } finally {
    saving.value = false
  }
}
// An event's local start time, as on its page.
const timeOf = (e: Past) => eventLocalTime(e.startDate, tzOf(e))
</script>

<template>
  <div>
    <AdminPageHeader eyebrow="Business" title="New event" :back="{ to: '/business/events', label: 'Events' }" />
    <AdminState v-if="error" kind="error" :message="error" />
    <AdminState v-if="!hosts" kind="loading" />
    <div v-else-if="!hosts.length" class="mt-6 rounded-2xl border-2 border-dashed border-input bg-card/60 p-8 text-center">
      <p class="font-display text-lg font-bold">First, a profile</p>
      <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Events are run by a profile: your festival, school, party series or venue. Make one in a minute, then you’re back here. Already on WeDance? Find yours.</p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="pill" as-child><NuxtLink :to="{ path: '/business/new', query: { type: 'organizer', next: $route.fullPath } }"><Plus /> Create a profile</NuxtLink></Button>
        <Button variant="outline-pill" as-child><NuxtLink to="/business/claim"><Search /> Find my profile</NuxtLink></Button>
      </div>
    </div>
    <template v-else>
      <h2 class="mt-6 font-display text-xl font-bold">Where are you starting from?</h2>
      <p class="mt-1 text-sm text-muted-foreground">It starts as a draft only you see. Then we go through the venue, line-up, entry and flyer, one step at a time.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Where are you starting from?">
        <button
          v-for="s in STARTS"
          :key="s.key"
          type="button"
          role="radio"
          :aria-checked="start === s.key"
          :data-start="s.key"
          class="flex flex-col gap-1 rounded-2xl border-2 bg-card p-4 text-left transition-colors hover:border-primary/40"
          :class="start === s.key ? 'border-primary' : 'border-input'"
          @click="choose(s.key)"
        >
          <span class="flex items-center gap-2 font-bold"><component :is="s.icon" class="size-5 text-muted-foreground" aria-hidden="true" /> {{ s.title }}<Check v-if="start === s.key" class="ml-auto size-4 text-primary" aria-hidden="true" /></span>
          <span class="text-sm text-muted-foreground">{{ s.text }}</span>
        </button>
      </div>

      <!-- I have a post -->
      <section v-if="start === 'post'" class="mt-4 rounded-2xl border bg-card p-4" data-start-panel="post">
        <h3 class="font-bold">Paste the link of your post or reel</h3>
        <p class="text-sm text-muted-foreground">We fill in the date and times, price, programme, line-up, venue and the picture. You check it before anything goes public.</p>
        <form novalidate class="mt-3 grid gap-3" @submit.prevent="importPost">
          <div>
            <Input v-model="post.url" type="url" inputmode="url" placeholder="https://www.instagram.com/p/…" aria-label="Instagram post link" :disabled="importing" v-bind="postAttrs('url', 'ig-post-url-error')" />
            <FieldError id="ig-post-url-error" :message="postErrors.url" />
          </div>
          <div v-if="hosts.length > 1">
            <Select v-model="post.profile" :options="hostOptions" placeholder="Run by" aria-label="Run by" v-bind="postAttrs('profile', 'ig-post-profile-error')" />
            <FieldError id="ig-post-profile-error" :message="postErrors.profile" />
          </div>
          <AdminState v-if="importError" kind="error" :message="importError" />
          <div class="flex items-center justify-end gap-3">
            <p v-if="importing" class="mr-auto text-xs text-muted-foreground" role="status">This takes up to a minute.</p>
            <Button type="submit" variant="pill" :disabled="importing">
              <template v-if="importing"><Loader2 class="animate-spin" aria-hidden="true" /> Reading the post…</template>
              <template v-else>Make the draft</template>
            </Button>
          </div>
        </form>
      </section>

      <!-- Like my last event -->
      <section v-if="start === 'copy'" class="mt-4 rounded-2xl border bg-card p-4" data-start-panel="copy">
        <AdminState v-if="pastError" kind="error" :message="pastError" />
        <AdminState v-else-if="!past" kind="loading" />
        <div v-else-if="!past.length" class="text-sm">
          <p class="font-bold">No earlier events yet.</p>
          <p class="text-muted-foreground">Start from a post or from scratch. Next time, this copies it.</p>
          <Button type="button" variant="outline-pill" size="pill-sm" class="mt-3" @click="choose('scratch')"><PenLine /> From scratch</Button>
        </div>
        <form v-else novalidate class="grid gap-4" @submit.prevent="makeCopy">
          <fieldset>
            <legend class="font-bold">Which event?</legend>
            <ul class="mt-2 grid gap-1.5">
              <li v-for="e in past" :key="e.id">
                <label class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm" :class="copy.id === e.id ? 'border-primary bg-primary/5' : 'border-input'">
                  <input type="radio" name="copy-source" class="accent-primary" :checked="copy.id === e.id" @change="pick(e)">
                  <span class="min-w-0 flex-1">
                    <span class="block truncate font-bold">{{ e.name }}</span>
                    <span class="block text-xs text-muted-foreground">{{ fmtDay(eventLocalDate(e.startDate, tzOf(e))) }} · {{ timeOf(e) }}{{ e.host ? ` · ${e.host.name}` : '' }}{{ e.published ? '' : ' · draft' }}</span>
                  </span>
                </label>
              </li>
            </ul>
            <FieldError id="copy-source-error" :message="copyErrors.id" />
          </fieldset>
          <div class="grid gap-4 sm:grid-cols-2">
            <Field id="copy-date" label="New date" :error="copyErrors.date" :hint="picked ? `Same start time: ${timeOf(picked)}.` : undefined">
              <Input v-model="copy.date" type="date" :min="todayIso()" />
            </Field>
            <Field id="copy-repeat" label="Repeat weekly">
              <Select v-model="repeat" :options="repeatOptions" />
            </Field>
          </div>
          <BusinessSameDays v-if="picked" :city="picked.city ?? ''" :from="copy.date" :styles="picked.styles ?? []" />
          <div class="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="pill" :loading="copying"><Copy /> {{ copy.repeatWeeks ? `Make ${copy.repeatWeeks + 1} draft copies` : 'Make a draft copy' }}</Button>
            <span class="text-xs text-muted-foreground">Same venue, line-up, prices and programme. Only you see the copies until you publish.</span>
          </div>
        </form>
      </section>

      <!-- From scratch -->
      <section v-if="start === 'scratch'" class="mt-4 rounded-2xl border bg-card p-4" data-start-panel="scratch">
        <form novalidate class="grid gap-4" @submit.prevent="createFromScratch">
          <Field v-if="hosts.length > 1" id="new-host" label="Run by" :error="scratchErrors.hostUsername">
            <Select v-model="scratch.hostUsername" :options="hostOptions" placeholder="Pick one of your profiles" />
          </Field>
          <p v-else class="text-sm text-muted-foreground">Run by <span class="font-bold text-foreground">{{ host?.name }}</span>{{ host?.city ? ` · ${host.city}` : '' }}</p>
          <div class="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <Field id="new-type" label="What is it?" :error="scratchErrors.type">
              <Select v-model="scratch.type" :options="[...TYPES]" />
            </Field>
            <Field id="new-styles" label="The music" optional :error="scratchErrors.styles">
              <DanceStylePicker v-model="scratch.styles" />
            </Field>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:max-w-md">
            <Field id="new-date" :label="['Festival', 'Weekender', 'Congress'].includes(scratch.type) ? 'First day' : 'Date'" :error="scratchErrors.date">
              <Input v-model="scratch.date" type="date" :min="todayIso()" />
            </Field>
            <Field id="new-start" label="Starts" :error="scratchErrors.startTime" hint="Local time.">
              <Input v-model="scratch.startTime" type="time" />
            </Field>
          </div>
          <BusinessSameDays :city="host?.city ?? ''" :from="scratch.date" :styles="scratch.styles" />
          <div class="text-sm" data-suggested-name>
            <Field v-if="naming" id="new-name" label="Name" :error="scratchErrors.name" hint="The title on the flyer. Change it any time.">
              <Input v-model="scratch.name" :placeholder="suggested" />
            </Field>
            <p v-else class="flex flex-wrap items-center gap-2">
              <span class="text-muted-foreground">Called</span> <span class="font-bold">{{ suggested }}</span>
              <Button type="button" variant="ghost" size="sm" @click="editName"><Pencil /> Change</Button>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="inline-flex items-center gap-2 text-sm font-bold">
              <Checkbox v-model="scratch.published" data-publish-now /> Publish it now
            </label>
            <span class="text-xs text-muted-foreground">{{ scratch.published ? 'Dancers see it as soon as you create it. Good for a simple weekly social.' : 'It starts as a draft: only you see it.' }}</span>
          </div>
          <div>
            <Button type="submit" variant="pill" :loading="saving">{{ scratch.published ? 'Create and publish' : 'Create the draft' }}</Button>
          </div>
        </form>
      </section>

      <AiAppCta surface="business_event_new" title="Rather do it in ChatGPT?" class="mt-8">
        Paste your announcement and ask ChatGPT to put it on WeDance. It sets up the venue, the line-up and the flyer, and shows you the event before anything goes public.
      </AiAppCta>
    </template>
  </div>
</template>
