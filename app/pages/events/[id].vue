<script setup lang="ts">
import { heroTagline } from '#shared/utils/heroTagline'
/**
 * /events/<name>-<short id> (old /events/<id> links redirect here) — a single event, rendered through the SAME rich view as a
 * festival (an event is just a smaller festival). It reuses FestivalHero and the
 * festival section language; sections appear only when the event has that
 * content, so an event can grow into a full festival-grade page over time.
 */
import { Check, ArrowLeft, Globe, User, Euro, Pencil, EyeOff } from 'lucide-vue-next'
import { findMockEvent, festivalSessionEvent } from '~/lib/mockEvents'
import { formatEventWhen, eventLocalDate } from '#shared/utils/eventTime'
import { Button } from '~/components/ui/button'
import { WD } from '~/lib/brand'
import { mixHex, readableOn } from '~/lib/contrast'
import { isUuid, eventSlug, sessionKey } from '#shared/utils/eventSlug'
import { festivalPath } from '#shared/utils/eventSlug'
import { nightWeekday } from '#shared/utils/eventReview'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { $trpc } = useNuxtApp()
const { weekPlanIds, toggleEvent } = useWeekPlan()

// Auth gate — "+ My plan" requires sign-in
const { isSignedIn } = useAuth()
const showSignUp = ref(false)
const signUpAction = ref('plan')
const signUpPrefill = ref<{ name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }>({})

function onSignIn(action?: string) {
  signUpAction.value = action || 'plan'
  showSignUp.value = true
}

// The RSVP is the organiser's poll (RAZ-718), shown in the hero in place of
// the Going button (RAZ-731).
const rsvpPoll = ref<any | null>(null)
function onPoll(p: any) { rsvpPoll.value = p }

function onPick() {
  if (!isSignedIn.value) {
    onSignIn('plan')
    return
  }
  const wasGoing = picked.value
  toggleEvent(ev.value.id, { event_type: ev.value.eventType || null, city: ev.value.citySlug || null, surface: 'event' })
  liveGoingCount.value = Math.max(0, liveGoingCount.value + (wasGoing ? -1 : 1))
}

const id = computed(() => String(route.params.id))
// ?preview=<invite token>: a venue or artist who was asked about a draft sees
// it before it's published (only that event, and only with their link).
const previewToken = computed(() => (typeof route.query.preview === 'string' ? route.query.preview : undefined))
const isPreview = ref(false)
const ev = ref<any>(null)
const festivalData = ref<Awaited<ReturnType<typeof $trpc.events.festival.query>> | null>(null)

// The page's data loads in the browser, so without this the server answered
// 200 with an empty shell for events that don't exist or were unpublished.
// During SSR, ask whether anything is behind this address; if not (and it
// isn't a mock city/festival-programme page either), answer HTTP 404 and
// render "Event not found" straight away. useState carries the verdict to the
// browser so it doesn't load (or flash a spinner) again.
const notFound = useState(`event-404:${id.value}`, () => false)
if (import.meta.server) {
  try {
    const { found } = await $fetch<{ found: boolean }>('/api/event-status', { query: { id: id.value, preview: previewToken.value } })
    if (!found && !findMockEvent(id.value)) {
      notFound.value = true
      const reqEvent = useRequestEvent()
      if (reqEvent) setResponseStatus(reqEvent, 404, 'Event not found')
    }
  } catch { /* status check failed — let the browser try as before */ }
}

const pending = ref(!notFound.value)
const failed = ref(notFound.value)

async function load() {
  if (notFound.value) return
  pending.value = true; failed.value = false
  try {
    // Booking requests are only linked by their full id; anything else is a dated event.
    if (!isUuid(id.value)) throw new Error('not a booking')
    ev.value = await $trpc.booking.getEvent.query({ id: id.value })
  } catch {
    try {
      // One item of a festival's programme (f~<key>~<session id>).
      const session = sessionKey(id.value)
      if (session && !findMockEvent(id.value)) {
        const fest = await $trpc.events.get.query({ id: session.key })
        ev.value = festivalSessionEvent(await $trpc.events.festival.query({ id: fest.id }), session.sessionId)
        if (!ev.value) throw new Error('no such session')
        // Any event can have a programme (RAZ-1003): the banner names what it really is.
        ev.value.parentFestival = { ...ev.value.parentFestival, kind: fest.isFestival || ['festival', 'weekender', 'congress'].includes(String(fest.type ?? '').toLowerCase()) ? 'Festival' : (fest.type ? String(fest.type).charAt(0).toUpperCase() + String(fest.type).slice(1) : 'Event') }
      } else {
        // A dated public event (wedance.vip mirror) — adapt to the booking shape.
        const e = await $trpc.events.get.query({ id: id.value, preview: previewToken.value })
        isPreview.value = !!e.preview
        // Every event renders the festival page (RAZ-1007): one layout, sections only where there is
        // content. A plain event has no colour of its own: its first style's.
        ev.value = fromSyncedEvent(e)
        const fd = await $trpc.events.festival.query({ id: e.id, preview: previewToken.value })
        if (!e.festival) fd.festival.accentColor = accent.value
        festivalData.value = fd
        // An old /events/<id> link, or a name that changed since → the current
        // address, without a new history entry.
        const canonical = eventSlug(e)
        if (id.value !== canonical) router.replace({ path: `/events/${canonical}`, query: route.query, hash: route.hash })
      }
    } catch {
      // Neither — fall back to a mock city event so it still has a page.
      const mock = findMockEvent(id.value)
      if (mock) ev.value = mock
      else failed.value = true
    }
  } finally { pending.value = false }
  // A preview isn't a public view (and the event isn't live yet).
  if (!isPreview.value) trackView()
}
onMounted(load)

// outbound_click on this page (ticket, venue site, map, …) is about this event.
useTrackContext(() => ev.value?.id && { object_type: ev.value.hasDetails ? 'festival' : 'event', object_id: ev.value.id, city: ev.value.citySlug || null })

// One view per mount (trackOnce also drops the remount after the canonical-URL replace).
function trackView() {
  const e = ev.value
  if (!e?.id) return
  const props = {
    event_id: e.id,
    city: e.citySlug || null,
    style: e.styles?.[0] || null,
    event_type: e.eventType || null,
    synced: !!e.synced,
    is_festival: !!e.hasDetails,
  }
  if (e.hasDetails) useTrack().trackOnce(e.id, 'festival_viewed', props)
  else useTrack().trackOnce(e.id, 'event_viewed', props)
}

// Managers of the hosting profile (and admins) get an Edit button. Bookings and
// synced events have no host on WeDance, so nobody edits them here.
const canEdit = ref(false)
watch(() => ev.value?.id, async (eid) => {
  canEdit.value = false
  if (!eid || !isUuid(eid)) return
  try { canEdit.value = (await $trpc.businessEvents.canEdit.query({ id: eid })).canEdit } catch { /* stays hidden */ }
})

function fromSyncedEvent(e: any) {
  return {
    id: e.id,
    title: e.name,
    eventType: e.type,
    styles: e.styles || [],
    artists: [],
    eventDate: eventLocalDate(e.startDate, e.timezone),
    startDate: e.startDate,
    endDate: e.endDate,
    when: formatEventWhen(e.startDate, e.endDate, e.timezone),
    timezone: e.timezone,
    message: e.description || '',
    ticketUrl: e.ticketUrl || '',
    link: e.link || '',
    price: e.price || '',
    editedAt: e.editedAt || null,
    checkedBy: e.checkedBy || null,
    // The night's programme (business-mode events): [{ time, what }].
    agenda: (e.agenda || []) as { time: string; what: string }[],
    cover: e.cover || '',
    venueName: e.venueName || '',
    venueAddress: e.venueAddress || '',
    venueCity: e.city || '',
    venueCountry: e.country || '',
    // The venue's page and its own hints (RAZ-1012) for the hero's venue row.
    venueHandle: e.venueUsername || null,
    venueInfo: e.venueInfo || null,
    venueCoords: e.venueLat && e.venueLng ? { lat: e.venueLat, lng: e.venueLng } : undefined,
    citySlug: e.citySlug || '',
    mapUrl: (() => {
      const parts = [e.venueName, e.venueAddress].filter(Boolean).join(', ')
      if (parts) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`
      if (e.venueLat && e.venueLng) return `https://www.google.com/maps/search/?api=1&query=${e.venueLat},${e.venueLng}`
      return ''
    })(),
    organizerName: e.organizerName || '',
    organizerHandle: e.organizerUsername || '',
    // Named next to the organiser (#456): [{ username, name, role }].
    coOrganizers: (e.coOrganizers || []) as { username: string; name: string; role: string }[],
    archived: !!e.archived,
    // Cancelled by its organiser (RAZ-948): still shown, with the reason; no RSVP.
    cancelled: !!e.cancelledAt,
    cancelReason: e.cancelReason || '',
    synced: e.source === 'wedance-v3',
    // Every event, festivals too, is booked through the same steps (RAZ-995): how you come,
    // pass, pay, contact. A festival still lives in the year plan, not the week.
    pollable: true,
    isFestival: !!e.isFestival,
    // Has festival details (programme, passes…): counted as festival_viewed, as before RAZ-1007.
    hasDetails: !!e.festival,
    // Nobody on WeDance takes its bookings (RAZ-1007): "Book my spot" says where it comes from.
    notBookable: e.bookable ? null : { imported: e.source === 'wedance-v3', from: e.link || null, checkedAt: e.syncedAt || null },
  }
}

const styleColor: Record<string, string> = {
  salsa: WD.red600, bachata: WD.purple500, kizomba: WD.pink500, timba: WD.amber500,
  casino: WD.green600, rueda: WD.cyan600, afro: WD.violet600, zouk: WD.cyan600,
}
const accent = computed(() => styleColor[String(ev.value?.styles?.[0] || '').toLowerCase()] || WD.red600)
// Accent text darkened just enough for 4.5:1 — on the cream page, or on its own '14' tint (chips).
const ink = (c: string) => readableOn(c, WD.cream)
const chipInk = (c: string) => readableOn(c, mixHex(c, WD.cream, 0.078))
const picked = computed(() => rsvpPoll.value
  ? !!rsvpPoll.value.mine && rsvpPoll.value.mine.answer !== 'next'
  : !!ev.value && weekPlanIds?.value?.has(ev.value.id))
const parentFestival = computed(() => ev.value?.parentFestival ?? null)

// What the old event page showed that FestivalView doesn't (RAZ-1007). A festival says these
// through its passes, programme and links, so only plain events pass them.
const eventExtras = computed(() => {
  const e = ev.value
  if (!e || e.hasDetails) return null
  return {
    facts: { type: e.eventType, styles: e.styles, price: e.price, link: e.link, agenda: e.agenda },
    checked: e.editedAt ? { at: e.editedAt, by: e.checkedBy } : null,
    archived: e.archived,
    city: e.citySlug ? { slug: e.citySlug, name: e.venueCity || e.citySlug } : null,
  }
})

// Live going count from plan items (replaces static headcount).
// Keyed by the event's id — that's what "Going" stores, not the URL slug.
const liveGoingCount = ref(0)
watch(() => ev.value?.id, async (eid) => {
  if (!eid) return
  try {
    liveGoingCount.value = await $trpc.plan.count.query({ itemType: 'event', itemId: eid })
  } catch { /* non-critical */ }
})

// Adapt the event into the Festival shape FestivalHero expects.
const asFestival = computed(() => ({
  slug: ev.value.id,
  name: ev.value.title || 'Event',
  logo: '',
  accentColor: accent.value,
  startDate: ev.value.startDate || ev.value.eventDate,
  endDate: ev.value.endDate || ev.value.eventDate,
  timezone: ev.value.timezone || null,
  venue: {
    name: [ev.value.spaceName, ev.value.venueName].filter(Boolean).join(' · '),
    ...(ev.value.venueHandle ? { handle: ev.value.venueHandle } : {}),
    ...(ev.value.venueInfo ? { info: ev.value.venueInfo } : {}),
    coordinates: ev.value.venueCoords,
    place: [ev.value.venueCity, ev.value.venueCountry].filter(Boolean).join(', ') || undefined,
  },
  attendeeCount: rsvpPoll.value ? rsvpPoll.value.coming : liveGoingCount.value,
  socialLinks: [] as any[],
  ticketUrl: ev.value.ticketUrl || undefined,
  tickets: [] as any[],
})) as any

// "Lionsnight presents" in the hero (RAZ-1008): the organiser, then the co-organisers.
const heroPresenters = computed(() => [
  ...(ev.value?.organizerName ? [{ username: ev.value.organizerHandle || null, name: ev.value.organizerName }] : []),
  ...(ev.value?.coOrganizers ?? []).map((c: any) => ({ username: c.username, name: c.name })),
])

// Two tabs under the hero (RAZ-1011): Overview (about, line-up) and Reviews, which the
// hero's stars open. The tab lives in ?tab=reviews; an old #reviews link opens it too.
// (An event with sessions renders FestivalView, which has its own tabs.)
type PageTab = 'overview' | 'reviews'
const PAGE_TABS: { id: PageTab; label: string }[] = [{ id: 'overview', label: 'Overview' }, { id: 'reviews', label: 'Reviews' }]
const tabFromRoute = (): PageTab => (route.query.tab === 'reviews' || route.hash === '#reviews' ? 'reviews' : 'overview')
const pageTab = ref<PageTab>(tabFromRoute())
watch(() => route.query.tab, () => { pageTab.value = tabFromRoute() })
const tabsNav = ref<HTMLElement | null>(null)
function openPageTab(t: PageTab, via: 'nav' | 'hero') {
  if (t !== pageTab.value) useTrack().track('event_tab_opened', { tab: t, via, event_id: ev.value?.id ?? null, is_festival: false })
  pageTab.value = t
  const query = { ...route.query }
  if (t === 'overview') delete query.tab
  else query.tab = t
  router.replace({ query, hash: '' })
  // From the stars: bring the tab into view; from the bar: back to its top if scrolled past.
  nextTick(() => {
    const el = tabsNav.value
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    if (via === 'hero' || window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
  })
}

// "How was it?" (RAZ-1011): after the night, people who went rate it in the hero, in place of
// the sign-up. The morning-after email's stars land here with ?rate=N; its "didn't make it"
// with ?review=missed&t=<token>.
// (An event with a programme renders FestivalView, which asks the same way.)
const {
  ask, load: loadAsk, show: showAsk, rateParam, missedToken, reviewsKey,
  onPosted: onReviewPosted, note: reviewNote, notAllowed: rateNotAllowed,
} = useEventReviewAsk({
  eventId: () => (festivalData.value ? null : ev.value?.id),
  blocked: () => !ev.value || !!ev.value.cancelled || isPreview.value,
  openReviews: () => openPageTab('reviews', 'hero'),
})

useHead(() => ({
  title: ev.value ? `${ev.value.title || 'Event'} — WeDance` : (failed.value ? 'Event not found — WeDance' : 'WeDance — Event'),
  meta: failed.value || isPreview.value ? [{ name: 'robots', content: 'noindex' }] : [],
}))
</script>

<template>
  <div v-if="isPreview && !pending" role="status" class="sticky top-0 z-50 border-b border-warning/40 bg-warning/[18%] font-sans backdrop-blur">
    <div class="max-w-3xl mx-auto px-4 py-2.5 flex items-start gap-2.5 text-sm text-wd-amber-800">
      <EyeOff class="size-4 mt-0.5 shrink-0" aria-hidden="true" />
      <p><b>Preview, not published yet.</b> The organiser shared this draft with you so you can see the plan. Dancers can't see it, and details may still change.</p>
    </div>
  </div>
  <FestivalView
    v-if="festivalData && !pending" :data="festivalData" :type="ev?.eventType" :edit-to="canEdit ? `/business/events/${festivalData.eventId}` : undefined" :cancelled="ev?.cancelled ? { reason: ev.cancelReason } : null" :plan-as="ev?.isFestival ? 'festival' : 'event'"
    :rsvp="ev?.pollable && !ev.archived && !isPreview ? { eventId: ev.id, path: route.path, startDate: ev.startDate, endDate: ev.endDate, timezone: ev.timezone, organizerName: ev.organizerName || (ev.organizerHandle ? `@${ev.organizerHandle}` : null), notBookable: ev.notBookable } : null"
    :date-label="ev?.isFestival ? undefined : ev?.when" :event="eventExtras"
  />
  <div v-else class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main>

    <section v-if="pending" class="max-w-2xl mx-auto px-4 py-24 text-center">
      <div class="inline-block w-8 h-8 rounded-full border-2 animate-spin border-primary/20 border-t-primary" role="status" aria-label="Loading event" />
    </section>

    <section v-else-if="failed || !ev" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl text-foreground">Event not found</h1>
      <NuxtLink to="/cities" class="inline-flex items-center gap-1 text-xs font-bold mt-6 text-primary font-sans"><ArrowLeft class="w-3 h-3" /> Browse cities</NuxtLink>
    </section>

    <template v-else>
      <!-- Part-of banner (one item of a festival's or any event's programme) -->
      <NuxtLink v-if="parentFestival" :to="`${festivalPath(parentFestival.slug)}`" class="block border-b hover:brightness-95 transition-all bg-primary/[6.3%] border-border">
        <div class="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground font-sans">
          <span class="text-eyebrow uppercase tracking-widest font-black shrink-0 text-primary">{{ parentFestival.kind || 'Festival' }}</span>
          <span class="truncate">Part of <b class="text-foreground">{{ parentFestival.name }}</b></span>
          <span class="ml-auto font-bold whitespace-nowrap shrink-0 text-primary">View {{ parentFestival.kind === 'Festival' || !parentFestival.kind ? 'festival' : 'event' }} →</span>
        </div>
      </NuxtLink>

      <div v-if="canEdit" class="border-b bg-secondary/[8%] border-border">
        <div class="max-w-3xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3 text-sm font-sans">
          <span class="text-muted-foreground">You manage this event.</span>
          <EventUncancel v-if="ev.cancelled" :event-id="ev.id" class="ml-auto" />
          <Button variant="outline-pill" size="pill-sm" :class="ev.cancelled ? '' : 'ml-auto'" as-child>
            <NuxtLink :to="`/business/events/${ev.id}`"><Pencil /> Edit event</NuxtLink>
          </Button>
        </div>
      </div>

      <div v-if="ev.editedAt" class="max-w-3xl mx-auto px-4 pt-3 font-sans">
        <p class="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-wd-green-700">
          <Check class="size-3.5" aria-hidden="true" /> Checked{{ ev.checkedBy ? ` by ${ev.checkedBy}` : '' }} · {{ new Date(ev.editedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}
        </p>
      </div>

      <!-- Same hero as festivals -->
      <FestivalHero :festival="asFestival" :rating-version="reviewsKey" :image="ev.cover" :presenters="heroPresenters" :description="ev.message" review-target-type="event" entity-label="event" cta-anchor="#rsvp" cta-fallback-label="I'm going" :picked="picked" :cancelled="ev.cancelled ? { reason: ev.cancelReason } : null" :date-label="ev.when" :venue-address="ev.venueAddress" :map-url="ev.mapUrl" @pick="onPick" @reviews="openPageTab('reviews', 'hero')">
        <!-- The RSVP: the organiser's poll IS the hero's Going question (RAZ-731). -->
        <template v-if="showAsk || (ev.pollable && !ev.archived && !isPreview && !ev.cancelled)" #cta>
          <EventHowWasIt
            v-if="showAsk" :event-id="ev.id" :event-name="ev.title || 'Event'" :weekday="nightWeekday(ev)" :mine="ask?.mine ?? null" :signed-in="!!ask?.signedIn"
            :initial-rating="rateParam" :from-email="!!rateParam" :missed-token="missedToken"
            @posted="onReviewPosted" @reviews="openPageTab('reviews', 'hero')" @sign-in="onSignIn('review')" @missed="loadAsk"
          />
          <p v-else-if="rateNotAllowed" class="mt-4 text-sm text-muted-foreground font-sans" data-review-not-went>Only people who signed up for this night can review it.</p>
          <div v-if="ev.pollable && !ev.archived && !isPreview && !ev.cancelled" id="rsvp" class="mt-4 max-w-xl scroll-mt-16">
            <EventSignup :event-type="ev.eventType" :event-id="ev.id" :path="route.path" :start-date="ev.startDate" :end-date="ev.endDate" :timezone="ev.timezone" :organizer-name="ev.organizerName || (ev.organizerHandle ? `@${ev.organizerHandle}` : null)" surface="event" @poll="onPoll" />
          </div>
        </template>
      </FestivalHero>

      <!-- Who's coming, under the sign-up (RAZ-995) -->
      <div v-if="rsvpPoll && ev.pollable && !ev.archived && !isPreview && !ev.cancelled" class="max-w-3xl mx-auto px-4 pt-6">
        <EventWhosComing :poll="rsvpPoll" />
      </div>

      <div v-if="ev.archived" class="max-w-3xl mx-auto px-4 pt-4 font-sans">
        <p class="rounded-xl px-4 py-3 text-sm bg-warning/[12.2%] text-wd-amber-800">This event is no longer listed by its organiser — it may have been cancelled or moved.</p>
      </div>

      <!-- Tabs (festival-style): Overview / Reviews (RAZ-1011) -->
      <nav ref="tabsNav" class="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm" aria-label="Event sections">
        <div class="max-w-3xl mx-auto flex items-center gap-1 px-4 overflow-x-auto" role="tablist">
          <button
            v-for="t in PAGE_TABS"
            :key="t.id"
            type="button"
            role="tab"
            :aria-selected="pageTab === t.id"
            :data-event-tab="t.id"
            class="relative px-3 py-3 text-sm italic whitespace-nowrap font-display cursor-pointer transition-colors"
            :class="pageTab === t.id ? 'font-bold text-foreground' : 'font-normal text-muted-foreground hover:text-foreground'"
            @click="openPageTab(t.id, 'nav')"
          >
            {{ t.label }}
            <span v-if="pageTab === t.id" class="absolute left-3 right-3 bottom-0 h-[2px] rounded-full" :style="{ background: accent }" />
          </button>
        </div>
      </nav>

      <div class="max-w-3xl mx-auto px-4 space-y-14 pt-8 pb-20 font-sans">
        <template v-if="pageTab === 'overview'">
        <!-- About -->
        <section v-if="(ev.message && !heroTagline(ev.message)) || ev.link || ev.price || ev.agenda?.length || ev.coOrganizers?.length" id="about" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-3 font-display text-foreground">About</h2>
          <div class="flex flex-wrap items-center gap-2 mb-4">
            <span v-if="ev.eventType" class="text-eyebrow font-black uppercase tracking-widest px-2 py-1 rounded bg-secondary/[9.4%] text-secondary">{{ ev.eventType }}</span>
            <DanceStyleChips :styles="ev.styles || []" size="md" class="gap-2" />
          </div>
          <ul class="space-y-1.5 text-sm mb-4 text-foreground">
            <li v-if="ev.price" class="flex items-start gap-2"><Euro class="w-4 h-4 mt-0.5 shrink-0 text-secondary" /> <span class="whitespace-pre-line">{{ ev.price }}</span></li>
            <li v-if="ev.organizerName" class="flex items-start gap-2">
              <User class="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
              <NuxtLink v-if="ev.organizerHandle" :to="`/@${ev.organizerHandle}`" class="font-bold hover:underline">{{ ev.organizerName }}</NuxtLink>
              <span v-else class="font-bold">{{ ev.organizerName }}</span>
            </li>
            <li v-for="c in ev.coOrganizers || []" :key="c.username" class="flex items-start gap-2" data-testid="event-co-organizer">
              <User class="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
              <span><NuxtLink :to="`/@${c.username}`" class="font-bold hover:underline">{{ c.name }}</NuxtLink> <span class="text-muted-foreground">· {{ c.role }}</span></span>
            </li>
            <li v-if="ev.link" class="flex items-start gap-2">
              <Globe class="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
              <a :href="ev.link" target="_blank" rel="noopener noreferrer" class="font-bold underline break-all" :style="{ color: ink(accent) }">Event website</a>
            </li>
          </ul>
          <div v-if="ev.agenda?.length" class="mb-4">
            <h3 class="text-eyebrow font-black uppercase tracking-widest text-secondary mb-1.5">Programme</h3>
            <ul class="space-y-1 text-sm text-foreground">
              <li v-for="(a, i) in ev.agenda" :key="i"><span class="font-bold tabular-nums">{{ a.time }}</span> {{ a.what }}</li>
            </ul>
          </div>
          <!-- The description lives in the hero (RAZ-1008); About keeps it only when the hero has
               nothing to show (a synced event's import notice and source link). -->
          <p v-if="ev.message && !heroTagline(ev.message)" class="text-sm leading-relaxed whitespace-pre-line break-words text-muted-foreground">{{ ev.message }}</p>
        </section>

        <!-- Lineup -->
        <section v-if="ev.artists?.length" id="lineup" class="scroll-mt-16">
          <h2 class="text-2xl font-black leading-tight mb-3 font-display text-foreground">Lineup</h2>
          <div class="flex flex-wrap gap-2">
            <template v-for="(a, i) in ev.artists" :key="i">
              <NuxtLink v-if="String(a).startsWith('@')" :to="`/${a}`" class="rounded-full px-4 py-2 text-sm font-bold" :style="{ background: accent + '14', color: chipInk(accent) }">{{ a }}</NuxtLink>
              <span v-else class="rounded-full px-4 py-2 text-sm font-bold" :style="{ background: accent + '14', color: chipInk(accent) }">{{ a }}</span>
            </template>
          </div>
        </section>

        <!-- The venue is in the hero (RAZ-1008); only the way to more nights in the city stays. -->
        <p v-if="ev.citySlug" class="text-sm"><NuxtLink :to="`/cities/${ev.citySlug}`" class="font-bold hover:underline text-secondary">More dancing in {{ ev.venueCity }} →</NuxtLink></p>

        </template>

        <!-- Reviews (same component as venues/festivals), its own tab -->
        <section v-else id="reviews" class="scroll-mt-16">
          <ReviewsSection :key="reviewsKey" target-type="event" :target-slug="ev.id" :target-name="ev.title || 'Event'" :can-write="false" :note="reviewNote" class="!mt-0" />
        </section>
      </div>
    </template>

    </main>


    <SiteFooter />

    <SignUpModal v-model:open="showSignUp" :action="signUpAction" :prefill="signUpPrefill" />
  </div>
</template>
