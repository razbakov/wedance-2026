<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
import { ticketProvider } from '~/lib/outbound'
import type { Festival } from '~/types/festival'
import { Instagram, Globe, Facebook, Users, Star, Ticket, Check, Plus, Ban, X } from 'lucide-vue-next'
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
  /** Who's coming sits right under the hero (RAZ-995): don't say the count twice. */
  hideGoing?: boolean
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
}>(), { reviewTargetType: 'festival', entityLabel: 'festival', ctaAnchor: '#discover' })

defineEmits<{ pick: [] }>()

// Review rating (client-side — the tRPC client is client-only). Renders after
// mount; null until then so SSR + first client render match (no hydration jump).
const { $trpc } = useNuxtApp()
const rating = ref<{ average: number; count: number } | null>(null)
onMounted(async () => {
  try {
    const r = await $trpc.review.list.query({ targetType: props.reviewTargetType, targetSlug: props.festival.slug })
    rating.value = { average: r.average, count: r.count }
  } catch { /* leave null */ }
})

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
        <!-- The event's picture: 4:5 beside the text, a short band on top on phones (the buttons stay in view).
             Flyers are busy, so it's cropped from the top; tap for the whole thing. -->
        <a v-if="image" :href="image" target="_blank" rel="noopener" class="block overflow-hidden rounded-2xl border border-border shadow-wd-card bg-wd-brown-900/[3.9%]" data-hero-image>
          <img :src="sizedImage(image, IMG.large)" :alt="`${festival.name} — picture`" class="w-full h-36 sm:h-auto sm:aspect-[4/5] object-cover object-top">
        </a>

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

          <!-- Date + venue -->
          <p
            class="mt-2 text-sm sm:text-base italic font-display text-muted-foreground"
          >
            <span :class="cancelled ? 'line-through decoration-destructive decoration-2' : ''">{{ dateRange }}</span>
            <template v-if="!cancelled">{{ ' ' }}<span data-visual-mask class="not-italic font-hand text-lg leading-none" :style="{ color: festival.accentColor }">— {{ daysUntil }}</span></template>
            {{ ' ' }}<span class="text-secondary">·</span> {{ festival.venue.name }}
            <template v-if="venueAddress">
              {{ ' ' }}<span class="text-secondary">·</span>{{ ' ' }}
              <a v-if="mapUrl" :href="mapUrl" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">{{ venueAddress }}</a>
              <span v-else>{{ venueAddress }}</span>
            </template>
          </p>

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
              v-if="!hideGoing && (!cancelled || festival.attendeeCount)"
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
            <!-- Review rating (appears once loaded), links to the reviews section -->
            <a
              v-if="rating && rating.count"
              href="#reviews"
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
