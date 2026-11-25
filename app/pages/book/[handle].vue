<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
/**
 * /@handle/book — book an artist or venue. Its own page so it can be linked
 * from their website, Instagram bio or email signature. Anyone can send one,
 * no account needed (BookingInquiryForm → inquiries.send).
 *
 * Signed in with business pages: the form is filled in and sent as one of
 * them. The request is the page's main action — ask first, book second
 * (RAZ-964). Under it, for an artist, one small line: add them to one of your
 * upcoming events (a short picker: same styles, one row per series — see
 * inquiries.me) or draft a new event with them in it.
 */
import { Plus, Check, ChevronDown } from 'lucide-vue-next'

definePageMeta({ layout: false, path: '/@:handle/book' })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()
type Me = Awaited<ReturnType<typeof $trpc.inquiries.me.query>>
const me = ref<Me | null>(null)
const adding = ref<string | null>(null)
const pickerOpen = ref(false)
const showSignIn = ref(false)
async function loadMe() {
  if (isSignedIn.value && profile.value) me.value = await $trpc.inquiries.me.query({ handle: profile.value.username }).catch(() => null)
}
// Signed in from here: fill the form and show the shortcuts without a reload.
watch(isSignedIn, (v) => { if (v) loadMe() })
const addErr = ref('')
const handle = computed(() => String(route.params.handle))
const profile = ref<any>(null)
const spaces = ref<any[]>([])
const artistSlots = ref<{ dayOfWeek: number; startTime: string; endTime: string }[]>([])
const pending = ref(true)

onMounted(async () => {
  try {
    const pro = await $trpc.entity.getByHandle.query({ handle: handle.value })
    if (pro) {
      profile.value = pro.profile; spaces.value = pro.spaces ?? []
      if (pro.profile.type === 'artist') {
        const avail = await $trpc.booking.artistAvailability.query({ username: pro.profile.username }).catch(() => null)
        artistSlots.value = avail?.slots ?? []
      }
      await loadMe()
    }
    else {
      const moved = await $trpc.entity.movedTo.query({ handle: handle.value }).catch(() => null)
      if (moved) return navigateTo(`/@${moved.handle}/book`, { replace: true })
    }
  } catch {}
  pending.value = false
})

// Venues with bookable spaces take requests on their page's calendar.
const bookable = computed(() => !!profile.value && (profile.value.type === 'artist' || profile.value.type === 'promoter' || (profile.value.type === 'venue' && !spaces.value.length)))
const firstName = computed(() => profile.value?.type === 'artist' ? profile.value.name.split(/\s+/)[0] : profile.value?.name)
// The shortcuts: only for an artist, only for someone who runs an event page.
const canPlan = computed(() => profile.value?.type === 'artist' && !!me.value?.profiles.length)
const draftLink = computed(() => profile.value ? `/business/events/new?artist=${encodeURIComponent(profile.value.username)}` : '')
const day = (d: string | Date, tz?: string | null) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz || 'Europe/Berlin' })
async function addTo(eventId: string) {
  addErr.value = ''
  adding.value = eventId
  try {
    await $trpc.inquiries.addToEvent.mutate({ eventId, handle: profile.value.username })
    const row = me.value?.events.find(e => e.id === eventId)
    useTrack().track('booking_added_to_event', { profile: profile.value.username, series: !!row?.series, rows: me.value?.events.length ?? 0 })
    await navigateTo(`/business/events/${eventId}?added=${encodeURIComponent(profile.value.username)}#lineup`)
  } catch (e: any) { addErr.value = e?.message || 'Couldn’t add them.'; adding.value = null }
}

useHead(() => ({
  title: profile.value ? `Book ${profile.value.name} | WeDance` : 'Book | WeDance',
  meta: profile.value ? [{ name: 'description', content: `Ask ${profile.value.name} about your event: a workshop, a show, a party. They answer you by email.` }] : [],
}))
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />
    <main class="max-w-xl mx-auto px-4 pt-10 pb-16">
      <div v-if="pending" class="py-24 text-center"><div class="inline-block w-8 h-8 rounded-full border-2 animate-spin" style="border-color:color-mix(in srgb, var(--wd-red-600) 20%, transparent); border-top-color:var(--wd-red-600);" /></div>

      <div v-else-if="!profile" class="py-16 text-center">
        <h1 class="text-3xl">Not on WeDance yet</h1>
        <p class="mt-3 text-sm text-muted-foreground font-sans"><span class="font-bold">@{{ handle }}</span> doesn’t have a page here.</p>
      </div>

      <div v-else-if="!bookable" class="py-16 text-center">
        <h1 class="text-3xl">Book {{ profile.name }}</h1>
        <p class="mt-3 text-sm text-muted-foreground font-sans">Pick a free slot on their calendar.</p>
        <Button variant="cta" class="mt-5" as-child><NuxtLink :to="`/@${profile.username}`">Open the calendar</NuxtLink></Button>
      </div>

      <template v-else>
        <NuxtLink :to="`/@${profile.username}`" class="flex items-center gap-4">
          <img v-if="profile.photo" :src="sizedImage(profile.photo, IMG.avatar)" :alt="profile.name" class="size-16 shrink-0 rounded-full object-cover border">
          <div class="min-w-0">
            <p class="text-eyebrow uppercase tracking-[0.3em] font-bold text-secondary font-sans">{{ profile.type === 'venue' ? 'Venue' : 'Artist' }}<template v-if="profile.city"> · {{ profile.city }}</template></p>
            <h1 class="text-3xl leading-tight">Book {{ profile.name }}</h1>
            <DanceStyleChips :styles="profile.styles || []" :max="5" class="mt-1 gap-1.5" />
          </div>
        </NuxtLink>
        <p class="mt-5 text-sm text-muted-foreground font-sans">Tell {{ firstName }} what you have in mind. They get it by email and answer you directly.<template v-if="!isSignedIn"> No account needed.</template></p>
        <!-- Has an account? Signing in fills the form, sends it as their page,
             and lets them add the artist to their event instead. -->
        <p v-if="!isSignedIn" class="mt-5 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-sm font-sans">
          Have a WeDance account?
          <button type="button" class="font-bold text-primary underline" @click="showSignIn = true">Sign in</button>
          to send it as your school or event{{ profile.type === 'artist' ? `, or add ${firstName} to one of your events` : '' }}.
        </p>

        <ArtistAvailability v-if="artistSlots.length" :slots="artistSlots" class="mt-6" />

        <div class="mt-6 rounded-2xl border bg-card p-5 sm:p-6 shadow-wd-card">
          <BookingInquiryForm :profile="profile" :me="me" />
        </div>

        <!-- Signed in and running events: a small way to book them straight in -->
        <section v-if="canPlan" class="mt-4 px-1 text-sm text-muted-foreground font-sans" data-testid="lineup-shortcut" aria-label="Already planning something">
          <p>
            Already planning something?
            <button type="button" class="font-bold text-foreground underline underline-offset-2 inline-flex items-center gap-0.5" :aria-expanded="pickerOpen" aria-controls="lineup-picker" @click="pickerOpen = !pickerOpen">
              Add {{ firstName }} to an event’s line-up<ChevronDown class="size-3.5 transition-transform" :class="pickerOpen && 'rotate-180'" aria-hidden="true" />
            </button>
            ·
            <NuxtLink :to="draftLink" class="font-bold text-foreground underline underline-offset-2">Draft a new event with {{ firstName }}</NuxtLink>
          </p>
          <div v-if="pickerOpen" id="lineup-picker" class="mt-3">
            <ul v-if="me!.events.length" class="grid gap-2">
              <li v-for="e in me!.events" :key="e.id" class="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold text-foreground">{{ e.name }}</p>
                  <p class="text-xs">{{ e.series ? `Next: ${day(e.startDate, e.timezone)}` : day(e.startDate, e.timezone) }} · {{ e.host }}</p>
                </div>
                <span v-if="e.inLineup" class="inline-flex items-center gap-1 text-xs font-bold text-wd-green-700"><Check class="size-3.5" aria-hidden="true" /> In the line-up</span>
                <Button v-else type="button" variant="outline-pill" size="pill-sm" :disabled="!!adding" @click="addTo(e.id)"><Plus aria-hidden="true" /> {{ adding === e.id ? 'Adding…' : 'Add' }}</Button>
              </li>
            </ul>
            <p v-else class="text-sm">{{ profile.styles?.length ? `None of your upcoming events has ${profile.styles.join(' or ')}.` : 'You have no upcoming events.' }} Draft a new one with {{ firstName }} instead.</p>
            <p v-if="me!.events.length" class="mt-2 text-xs">Then send {{ firstName }} the link from your event: they confirm and check their programme.</p>
            <p v-if="addErr" class="mt-2 text-sm text-destructive" role="alert">{{ addErr }}</p>
          </div>
        </section>
        <p class="mt-4 text-center text-xs text-muted-foreground font-sans">Through <NuxtLink to="/" class="font-bold hover:underline">WeDance</NuxtLink>, where dancers, artists and venues meet.</p>
      </template>
    </main>
    <SiteFooter />
    <SignUpModal v-model:open="showSignIn" action="signin" />
  </div>
</template>
