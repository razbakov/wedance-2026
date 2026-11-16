<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
import { ticketProvider } from '~/lib/outbound'
import type { Festival } from '~/types/festival'
import { Instagram, Globe, Facebook, Users, Star, Ticket, Check, Plus, Ban, X, CalendarDays, MapPin, ChevronDown, ChevronRight, ArrowUpRight, TrainFront, Car, Footprints, Shirt } from 'lucide-vue-next'
import { venueHints, lineBadgeInk } from '#shared/types/venueInfo'
import { daysUntil as formatDaysUntil } from '#shared/utils/festivalDateFormatter'
import { accentText, readableAccent } from '~/lib/accent'
import { Button } from '~/components/ui/button'
import { initialOf } from '#shared/utils/initials'
import { heroTagline } from '#shared/utils/heroTagline'

// Shared hero for festivals AND events (an event is just a smaller festival).
// `reviewTargetType` + `entityLabel` let the same hero serve either.
const props = withDefaults(defineProps<{
  festival: Festival
  reviewTargetType?: 'festival' | 'event' | 'venue' | 'artist' | 'organizer'
  /** The reviews' key when it isn't `festival.slug` (an event with a programme: its id, RAZ-1011). */
  reviewTargetSlug?: string
  entityLabel?: string
  // Where the non-ticket CTA scrolls (festivals use the in-page #discover flow;
  // events point at their #discover section too). And an optional clearer label.
  ctaAnchor?: string
  ctaFallbackLabel?: string
  // Add-to-plan ("Pick") state — shown alongside tickets. Parent owns the store
  // (year-plan for festivals, week-plan for events) and toggles on `pick`.
  picked?: boolean
  // Pre-formatted date line (events pass wall-clock time in the event's zone).
  dateLabel?: string
  // Venue address + Google Maps link (events pass these from the synced data).
  venueAddress?: string
  mapUrl?: string
  // Every pass is €0 — say so in the hero instead of a €0 checkout (RAZ-731).
  freeEntry?: boolean
  // Cancelled by its organiser (RAZ-948): said here, in the hero, where the eye goes —
  // a "Cancelled" pill instead of the countdown, the date struck through, the reason
  // under it, no tickets / "I'm going"; someone who had it on their plan can take it off.
  cancelled?: { reason?: string | null } | null
  /** The event's picture (its cover / flyer), on the left of the hero — on top on phones (RAZ-1008). */
  image?: string | null
  /** Who presents it: "[logo] Lionsnight presents" above the title (organiser first, co-organisers after). */
  presenters?: { username?: string | null; name: string }[] | null
  /** The description: its first sentence goes before the buttons; "More" opens the rest in place. */
  description?: string | null
  /** Bump to reload the rating under the picture (after a review was posted). */
  ratingVersion?: number
}>(), { reviewTargetType: 'festival', entityLabel: 'festival', ctaAnchor: '#discover' })

// `reviews`: the stars under the picture open the page's Reviews tab (RAZ-1011).
defineEmits<{ pick: []; reviews: [] }>()

// Review rating (client-side — the tRPC client is client-only). Renders after
// mount; null until then so SSR + first client render match (no hydration jump).
const { $trpc } = useNuxtApp()
const rating = ref<{ average: number; count: number } | null>(null)
async function loadRating() {
  try {
    const r = await $trpc.review.list.query({ targetType: props.reviewTargetType, targetSlug: props.reviewTargetSlug || props.festival.slug })
    rating.value = { average: r.average, count: r.count }
  } catch { /* leave as it was */ }
}
onMounted(loadRating)
// A new review (the event's "How was it?", RAZ-1011) bumps this to refresh the stars.
watch(() => props.ratingVersion, (v, old) => { if (v !== old) loadRating() })

// Primary CTA: external tickets when we have a link, else scroll to the
// in-page join/discover flow.
const hasTickets = computed(() => !!props.festival.ticketUrl)
const ctaHref = computed(() => props.festival.ticketUrl || props.ctaAnchor)
const ctaLabel = computed(() => (props.festival.ticketUrl ? 'Get tickets' : (props.ctaFallbackLabel || `Join the ${props.entityLabel}`)))

const dateRange = computed(() => {
  if (props.dateLabel) return props.dateLabel
  const start = new Date(props.festival.startDate)
  const end = new Date(props.festival.endDate)
  // Never the viewer's zone (SSR runs in UTC; west of UTC a date-only
  // "2026-05-01" read back locally is Apr 30): date-only strings parse as UTC
  // midnight so read them in UTC, datetimes in the event's own zone.
  const timeZone = String(props.festival.startDate).includes('T') ? (props.festival.timezone || 'Europe/Berlin') : 'UTC'
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', { ...o, timeZone })
  const day = { year: 'numeric', month: 'numeric', day: 'numeric' } as const
  // Single-day (events) → one date; multi-day (festivals) → a range. A night
  // that runs past midnight (21:00–03:00) is still one date, not "Oct 29 – Oct 30".
  const overnight = end.getTime() - start.getTime() <= 18 * 3600_000
  if (fmt(start, day) === fmt(end, day) || overnight) {
    return fmt(start, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  return `${fmt(start, { month: 'short', day: 'numeric' })} – ${fmt(end, { month: 'short', day: 'numeric', year: 'numeric' })}`
})

const platformIcon: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  website: Globe,
}

// "Lionsnight presents" / "Lionsnight & meet & DANCE present" — only real names, never a guess.
const presentersShown = computed(() => (props.presenters ?? []).filter(p => p.name?.trim()).slice(0, 2))
const presentsVerb = computed(() => presentersShown.value.length > 1 ? 'present' : 'presents')
// One sentence, ~160 characters: enough to say what it is without pushing the buttons down.
const tagline = computed(() => heroTagline(props.description))
const taglineCut = computed(() => !!tagline.value && tagline.value.length < (props.description ?? '').trim().length)
const expanded = ref(false)

// Practical info sits under the venue, opened from its row (RAZ-1008). Links in it are
// clickable and read as words, not URLs: a picture is "picture", anything else its site.
const venueOpen = ref(false)
// Google Maps for the venue: the parent's link, else built from name + address / coordinates.
const venueMapUrl = computed(() => {
  if (props.mapUrl) return props.mapUrl
  const v = props.festival.venue
  const q = [v?.name, props.venueAddress || v?.address].filter(Boolean).join(', ')
  if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  if (v?.coordinates?.lat != null) return `https://www.google.com/maps/search/?api=1&query=${v.coordinates.lat},${v.coordinates.lng}`
  return ''
})
// The venue page's own hints (RAZ-1012), as Airbnb's "Where you'll be": one row each. Only venue things:
// the event's own practical info is on Overview → "Good to know" (RAZ-1009).
const hints = computed(() => venueHints(props.festival.venue?.info))
const HINT_ICON = { transit: TrainFront, parking: Car, shoes: Footprints, cloakroom: Shirt } as const
// Nothing to open: no chevron, the address opens directions.
const venueExpands = computed(() => hints.value.length > 0)
const venuePlace = computed(() => props.festival.venue?.place || '')
// OpenStreetMap's embed needs no key; only when we know where the venue is.
const venueMapEmbed = computed(() => {
  const c = props.festival.venue?.coordinates
  if (c?.lat == null || c?.lng == null) return ''
  const bbox = [c.lng - 0.01, c.lat - 0.005, c.lng + 0.01, c.lat + 0.005].map(n => n.toFixed(4)).join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat}%2C${c.lng}`
})

const daysUntil = computed(() => formatDaysUntil(props.festival.startDate, props.festival.timezone, props.festival.endDate))

// Accent text on its own tint / white-on-accent buttons, darkened only when the
// festival colour is too light for 4.5:1.
const chipText = computed(() => accentText(props.festival.accentColor))
const buttonAccent = computed(() => readableAccent(props.festival.accentColor))

// Sun rays. Rounded so SSR and the client serialise identical coordinates
// (raw Math.cos output differed in the last digits → hydration mismatch).
const rays = Array.from({ length: 24 }, (_, i) => {
  const a = 2 * Math.PI * (i + 1) / 24
  return { x: Math.round((50 + 48 * Math.cos(a)) * 1000) / 1000, y: Math.round((50 + 48 * Math.sin(a)) * 1000) / 1000 }
})
</script>

<template>
  <section class="relative overflow-hidden bg-background">
    <!-- Sun rays behind the whole hero, tinted by festival accent -->
    <svg
      class="absolute -top-16 -right-16 w-72 h-72 opacity-20 pointer-events-none"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <g :stroke="festival.accentColor" stroke-width="1.5" fill="none">
        <line
          v-for="(r, i) in rays"
          :key="i"
          x1="50"
          y1="50"
          :x2="r.x"
          :y2="r.y"
        />
      </g>
    </svg>

    <div class="relative max-w-4xl mx-auto px-4 pt-10 pb-12">
      <div class="grid gap-5 sm:gap-8" :class="image ? 'sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-start' : ''">
        <!-- The event's picture: the whole flyer beside the text, at its own shape (RAZ-1015 — a 4:5 crop cut
             off the flyer's bottom line), capped so a story-shaped one stays sane; a short band on top on
             phones (the buttons stay in view), cropped from the top; tap for the whole thing. -->
        <div v-if="image">
          <a :href="image" target="_blank" rel="noopener" class="block overflow-hidden rounded-2xl border border-border shadow-wd-card bg-wd-brown-900/[3.9%]" data-hero-image>
            <img :src="sizedImage(image, IMG.large)" :alt="`${festival.name} — picture`" class="w-full h-36 object-cover object-top sm:h-auto sm:max-h-[36rem] sm:object-contain">
          </a>
          <!-- How it's rated, under the picture (RAZ-1011): the stars open the Reviews tab. -->
          <a
            v-if="rating && rating.count"
            href="#reviews"
            class="mt-2 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 font-sans text-sm hover:bg-muted/60"
            :aria-label="`Rated ${rating.average.toFixed(1)} out of 5 from ${rating.count} ${rating.count === 1 ? 'review' : 'reviews'} — read the reviews`"
            data-hero-rating
            @click.prevent="$emit('reviews')"
          >
            <span class="flex" aria-hidden="true">
              <Star v-for="n in 5" :key="n" class="size-4" :class="n <= Math.round(rating.average) ? 'text-wd-amber-500 fill-wd-amber-500' : 'text-border'" />
            </span>
            <b class="text-foreground">{{ rating.average.toFixed(1) }}</b>
            <span class="text-xs text-muted-foreground underline underline-offset-2">{{ rating.count }} {{ rating.count === 1 ? 'review' : 'reviews' }}</span>
          </a>
        </div>

        <div class="min-w-0">
          <!-- Who presents it (RAZ-1008): the organiser's logo + name, linking to their page. -->
          <p v-if="presentersShown.length" class="mb-3 flex items-center gap-2 text-sm font-sans text-muted-foreground" data-hero-presents>
            <img v-if="festival.logo" :src="sizedImage(festival.logo, IMG.avatar)" alt="" class="size-7 rounded-full object-cover border border-border">
            <span>
              <template v-for="(p, i) in presentersShown" :key="p.username || p.name">
                <template v-if="i"> &amp; </template>
                <NuxtLink v-if="p.username" :to="`/@${p.username}`" class="font-bold text-foreground hover:underline">{{ p.name }}</NuxtLink>
                <b v-else class="text-foreground">{{ p.name }}</b>
              </template>
              {{ presentsVerb }}
            </span>
          </p>

          <!-- Eyebrow: days-until in Caveat, colored -->
          <p
            v-if="cancelled"
            class="mb-2 inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-black uppercase tracking-widest text-white font-sans"
            data-testid="event-cancelled-badge"
          >
            <Ban class="size-3.5" aria-hidden="true" /> Cancelled
          </p>

          <!-- Festival name in Playfair -->
          <h1
            class="text-3xl sm:text-5xl leading-[0.98] tracking-tight font-display text-foreground"
          >
            {{ festival.name }}
          </h1>

          <!-- The facts, one per row (RAZ-1008): when (with the countdown as a chip) and where
               (the venue, its address under it, linking to the map). -->
          <dl class="mt-3 space-y-2 text-sm sm:text-base font-sans" data-hero-facts>
            <div class="flex items-start gap-2.5">
              <dt class="sr-only">When</dt>
              <CalendarDays class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
              <dd class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-bold text-foreground" :class="cancelled ? 'line-through decoration-destructive decoration-2' : ''">{{ dateRange }}</span>
                <span
                  v-if="!cancelled"
                  data-visual-mask
                  class="rounded-full px-2 py-0.5 text-xs font-bold"
                  :style="{ background: festival.accentColor + '18', color: chipText }"
                >{{ daysUntil }}</span>
              </dd>
            </div>
            <!-- Where (RAZ-1008, RAZ-1012): the row opens the venue's card in place — a map, directions,
                 the venue page's own hints (nearest stop, parking, shoes, cloakroom) and the venue's page.
                 No hints: nothing to open, the address links to directions. -->
            <div v-if="festival.venue?.name || venueAddress">
              <dt class="sr-only">Where</dt>
              <dd>
                <button
                  v-if="venueExpands"
                  type="button"
                  class="group flex w-full items-start gap-2.5 text-left cursor-pointer"
                  :aria-expanded="venueOpen"
                  aria-controls="hero-venue-info"
                  data-hero-venue
                  @click="venueOpen = !venueOpen"
                >
                  <MapPin class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span class="min-w-0">
                    <span class="flex items-center gap-1 font-bold text-foreground group-hover:underline">
                      {{ festival.venue?.name || venueAddress }}
                      <ChevronDown class="size-4 shrink-0 text-secondary transition-transform" :class="venueOpen ? 'rotate-180' : ''" aria-hidden="true" />
                    </span>
                    <span v-if="venueAddress && festival.venue?.name" class="block text-sm text-muted-foreground">{{ venueAddress }}</span>
                  </span>
                </button>
                <div v-else class="flex items-start gap-2.5" data-hero-venue>
                  <MapPin class="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span class="min-w-0">
                    <NuxtLink v-if="festival.venue?.name && festival.venue?.handle" :to="`/@${festival.venue.handle}`" class="block font-bold text-foreground hover:underline">{{ festival.venue.name }}</NuxtLink>
                    <span v-else-if="festival.venue?.name" class="block font-bold text-foreground">{{ festival.venue.name }}</span>
                    <a v-if="venueAddress && venueMapUrl" :href="venueMapUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline" data-outbound-kind="map" data-hero-map>
                      {{ venueAddress }} <ArrowUpRight class="size-3.5 shrink-0" aria-hidden="true" />
                    </a>
                    <span v-else-if="venueAddress" class="block text-sm text-muted-foreground">{{ venueAddress }}</span>
                  </span>
                </div>

                <!-- Airbnb's "Where you'll be": the map first, then one row per fact (big outline icon, a
                     bold title, a quiet line under it), plain underlined links. -->
                <div
                  v-if="venueExpands && venueOpen"
                  id="hero-venue-info"
                  class="mt-3 max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_6px_16px_rgba(0,0,0,0.08)] sm:ml-6.5"
                  data-hero-venue-info
                >
                  <iframe v-if="venueMapEmbed" :src="venueMapEmbed" :title="`Map of ${festival.venue?.name || 'the venue'}`" class="block h-44 w-full border-0" loading="lazy" />
                  <div class="px-5 py-4 text-sm sm:text-base">
                    <div class="flex items-baseline justify-between gap-3">
                      <p class="font-semibold text-foreground">{{ venuePlace || venueAddress || festival.venue?.name }}</p>
                      <a v-if="venueMapUrl" :href="venueMapUrl" target="_blank" rel="noopener noreferrer" class="shrink-0 font-semibold text-foreground underline underline-offset-2" data-outbound-kind="map" data-hero-map>Directions</a>
                    </div>
                    <ul v-if="hints.length" class="mt-4 space-y-4 border-t border-border pt-4" data-hero-hints>
                      <li v-for="h in hints" :key="h.kind" class="flex items-start gap-3" :data-hint="h.kind">
                        <!-- One fixed-width column, so every title lines up whatever the badge's length. -->
                        <span class="flex w-8 shrink-0 justify-center">
                          <span
                            v-if="h.kind === 'transit' && h.line"
                            class="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none"
                            :class="h.color ? '' : 'bg-foreground text-background'"
                            :style="h.color ? { background: h.color, color: lineBadgeInk(h.color) } : undefined"
                            data-hero-line
                          >{{ h.line }}</span>
                          <span v-else class="relative" aria-hidden="true">
                            <component :is="HINT_ICON[h.kind]" class="size-6" :class="h.kind === 'cloakroom' ? 'text-muted-foreground' : 'text-foreground'" :stroke-width="1.5" />
                            <span v-if="h.kind === 'cloakroom'" class="absolute left-1/2 top-1/2 h-[1.5px] w-7 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-muted-foreground ring-2 ring-card" />
                          </span>
                        </span>
                        <span class="min-w-0">
                          <span v-if="h.kind === 'cloakroom'" class="block font-semibold text-muted-foreground line-through"><span class="sr-only">No </span>{{ h.title }}</span>
                          <span v-else class="block font-semibold text-foreground">{{ h.title }}</span>
                          <span v-if="'detail' in h && h.detail" class="block text-muted-foreground">{{ h.detail }}</span>
                        </span>
                      </li>
                    </ul>
                    <p v-if="festival.venue?.handle" class="mt-4 border-t border-border pt-4">
                      <NuxtLink :to="`/@${festival.venue.handle}`" class="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-2">
                        About the venue <ChevronRight class="size-4" aria-hidden="true" />
                      </NuxtLink>
                    </p>
                  </div>
                </div>
              </dd>
            </div>
          </dl>

          <!-- What it is, in a sentence, before the buttons (RAZ-1008). "More" opens the whole text right here. -->
          <div v-if="tagline" class="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-foreground font-sans" data-hero-tagline>
            <p v-if="!expanded">
              {{ tagline }}
              <button v-if="taglineCut" type="button" class="ml-1 font-bold text-secondary hover:underline cursor-pointer" :aria-expanded="false" data-hero-more @click="expanded = true">More</button>
            </p>
            <template v-else>
              <p class="whitespace-pre-line">{{ description?.trim() }}</p>
              <button type="button" class="mt-1 font-bold text-secondary hover:underline cursor-pointer" :aria-expanded="true" data-hero-less @click="expanded = false">Less</button>
            </template>
          </div>

          <p v-if="cancelled" class="mt-3 max-w-xl text-sm text-foreground font-sans" data-testid="event-cancelled-reason">
            <b class="text-destructive">Cancelled by the organiser.</b>
            <template v-if="cancelled.reason">
              “{{ cancelled.reason }}”
            </template>
          </p>

          <!-- Meta: attendees + socials -->
          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span
              v-if="!cancelled || festival.attendeeCount"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-sans"
              :style="{ background: festival.accentColor + '18', color: chipText }"
            >
              <Users class="w-3 h-3" aria-hidden="true" />
              {{ festival.attendeeCount }} {{ cancelled ? (festival.attendeeCount === 1 ? 'was' : 'were') + ' going' : 'going' }}
            </span>
            <span
              v-if="freeEntry && !cancelled"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-sans bg-success/10 text-wd-green-700"
              data-free-entry
            >
              Free entry
            </span>
            <!-- Review rating (appears once loaded) when there's no picture to put it under; opens Reviews -->
            <a
              v-if="rating && rating.count && !image"
              href="#reviews"
              @click.prevent="$emit('reviews')"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold font-sans bg-wd-amber-500/12 text-wd-amber-700"
            >
              <Star class="w-3 h-3 fill-wd-amber-500 text-wd-amber-500" aria-hidden="true" />
              {{ rating.average.toFixed(1) }}
              <span class="opacity-65">· {{ rating.count }}</span>
            </a>
            <div v-if="festival.socialLinks.length" class="flex items-center gap-2">
              <a
                v-for="link in festival.socialLinks"
                :key="link.platform"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors text-secondary hover:text-primary"
                :title="link.platform"
                :aria-label="link.platform"
              >
                <component
                  :is="platformIcon[link.platform]"
                  v-if="platformIcon[link.platform]"
                  class="w-4 h-4"
                />
                <span v-else class="text-xs capitalize italic">{{ link.platform }}</span>
              </a>
            </div>
          </div>

          <!-- What's inside (RAZ-1008): the parent's summary of its tabs, right before the buttons. -->
          <div v-if="$slots['before-cta']" class="mt-4">
            <slot name="before-cta" />
          </div>

          <!-- The one "am I coming?" control (RAZ-731). The parent can replace it
               (a dated event's poll, a festival's Get pass); the default is
               external tickets when linked, else + My plan (add to plan). -->
          <div v-if="cancelled" class="mt-4 flex flex-wrap gap-2">
            <Button
              v-if="picked"
              type="button"
              variant="outline-pill"
              class="px-5 font-sans"
              data-testid="event-cancelled-remove"
              @click="$emit('pick')"
            >
              <X aria-hidden="true" /> Remove from my plan
            </Button>
          </div>
          <div v-else-if="$slots.cta" >
            <slot name="cta" />
          </div>
          <div v-else class="mt-4 flex flex-wrap gap-2">
            <Button v-if="hasTickets" as-child variant="cta" :accent="buttonAccent" class="px-5">
              <a
                :href="festival.ticketUrl"
                target="_blank"
                rel="noopener noreferrer"
                data-outbound-kind="ticket"
                @click="useTrack().track('ticket_cta_click', { entity: reviewTargetType, slug: festival.slug, festival: festival.slug, provider: ticketProvider(festival.ticketUrl) })"
              >
                <Ticket aria-hidden="true" /> Get tickets
              </a>
            </Button>
            <Button
              type="button"
              :variant="picked ? 'pill' : 'outline-pill'"
              :accent="buttonAccent"
              class="px-5 font-sans"
              :aria-pressed="picked"
              @click="$emit('pick')"
            >
              <component :is="picked ? Check : Plus" aria-hidden="true" /> My plan
            </Button>
          </div>
          <!-- Under the control, as on any event (RAZ-1008): what comes after "I'm going",
               e.g. a festival's "Meet who's going" once it's on your plan. -->
          <div v-if="!cancelled && $slots['after-cta']" >
            <slot name="after-cta" />
          </div>
        </div>
      </div>
    </div>

    <!-- Wave divider, matching the homepage -->
    <WaveDivider class="-mb-px" />
  </section>
</template>
