<script setup lang="ts">
import type { Festival } from '~/types/festival'
import { Instagram, Globe, Facebook, Users, Star, Ticket, Check, Plus } from 'lucide-vue-next'

// Shared hero for festivals AND events (an event is just a smaller festival).
// `reviewTargetType` + `entityLabel` let the same hero serve either.
const props = withDefaults(defineProps<{
  festival: Festival
  reviewTargetType?: 'festival' | 'event' | 'venue' | 'artist' | 'organizer'
  entityLabel?: string
  // Where the non-ticket CTA scrolls (festivals use the in-page #discover flow;
  // events point at their #going section). And an optional clearer label.
  ctaAnchor?: string
  ctaFallbackLabel?: string
  // Add-to-plan ("Pick") state — shown alongside tickets. Parent owns the store
  // (year-plan for festivals, week-plan for events) and toggles on `pick`.
  picked?: boolean
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
  const start = new Date(props.festival.startDate)
  const end = new Date(props.festival.endDate)
  // Single-day (events) → one date; multi-day (festivals) → a range.
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
})

const platformIcon: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  website: Globe,
}

const daysUntil = computed(() => {
  const now = new Date()
  const target = new Date(props.festival.startDate)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Past'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 30) return `In ${diff} days`
  if (diff <= 60) return `In ${Math.ceil(diff / 7)} weeks`
  return `In ${Math.ceil(diff / 30)} months`
})
</script>

<template>
  <section class="relative overflow-hidden" style="background:#fbf5ea;">
    <!-- Sun rays behind the whole hero, tinted by festival accent -->
    <svg
      class="absolute -top-16 -right-16 w-72 h-72 opacity-20 pointer-events-none"
      viewBox="0 0 100 100"
    >
      <g :stroke="festival.accentColor" stroke-width="1.5" fill="none">
        <line
          v-for="i in 24"
          :key="i"
          x1="50"
          y1="50"
          :x2="50 + 48 * Math.cos(2 * Math.PI * i / 24)"
          :y2="50 + 48 * Math.sin(2 * Math.PI * i / 24)"
        />
      </g>
    </svg>

    <div class="relative max-w-4xl mx-auto px-4 pt-10 pb-12">
      <div class="flex items-start gap-5">
        <!-- Logo with V3 red drop-shadow border -->
        <div class="shrink-0 relative">
          <img
            v-if="festival.logo"
            :src="festival.logo"
            :alt="festival.name"
            class="w-20 h-20 rounded-full border-4"
            :style="{ borderColor: '#fbf5ea', boxShadow: '4px 5px 0 -1px ' + festival.accentColor }"
          >
          <div
            v-else
            class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white border-4"
            :style="{ background: festival.accentColor, borderColor: '#fbf5ea', boxShadow: '4px 5px 0 -1px ' + festival.accentColor }"
          >
            {{ festival.name.charAt(0) }}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <!-- Eyebrow: days-until in Caveat, colored -->
          <div
            class="text-lg leading-none mb-2"
            :style="{ fontFamily: 'Caveat, cursive', color: festival.accentColor }"
          >
            — {{ daysUntil }}
          </div>

          <!-- Festival name in Playfair -->
          <h1
            class="text-3xl sm:text-5xl leading-[0.98] tracking-tight"
            style="font-family:'Playfair Display', serif; color:#3b1f0d;"
          >
            {{ festival.name }}
          </h1>

          <!-- Date + venue -->
          <p
            class="mt-2 text-sm sm:text-base italic"
            style="color:#5b3a1d; font-family:'Playfair Display', serif;"
          >
            {{ dateRange }} <span style="color:#9a5614;">·</span> {{ festival.venue.name }}
          </p>

          <!-- Meta: attendees + socials -->
          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold"
              :style="{ background: festival.accentColor + '18', color: festival.accentColor, fontFamily: 'system-ui, sans-serif' }"
            >
              <Users class="w-3 h-3" />
              {{ festival.attendeeCount }} planning
            </span>
            <!-- Review rating (appears once loaded), links to the reviews section -->
            <a
              v-if="rating && rating.count"
              href="#reviews"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold"
              style="background:#f59e0b1f; color:#b45309; font-family: system-ui, sans-serif;"
            >
              <Star class="w-3 h-3" style="fill:#f59e0b; color:#f59e0b;" />
              {{ rating.average.toFixed(1) }}
              <span style="opacity:0.65;">· {{ rating.count }}</span>
            </a>
            <div v-if="festival.socialLinks.length" class="flex items-center gap-2">
              <a
                v-for="link in festival.socialLinks"
                :key="link.platform"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors"
                :title="link.platform"
                style="color:#9a5614;"
                @mouseover="(e) => (e.currentTarget as HTMLElement).style.color = '#dc2626'"
                @mouseleave="(e) => (e.currentTarget as HTMLElement).style.color = '#9a5614'"
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

          <!-- CTAs: Get tickets (external, if any) + Pick (add to plan). Both. -->
          <div class="mt-4 flex flex-wrap gap-2">
            <a
              v-if="hasTickets"
              :href="festival.ticketUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white"
              :style="{ background: 'linear-gradient(135deg, ' + festival.accentColor + ', #f97316)', boxShadow: '0 3px 0 -1px ' + festival.accentColor }"
              @click="useTrack().track('ticket_cta_click', { entity: reviewTargetType, slug: festival.slug })"
            >
              <Ticket class="w-4 h-4" /> Get tickets
            </a>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider transition-all"
              :style="picked
                ? { background: festival.accentColor, color: 'white', boxShadow: '0 3px 0 -1px ' + festival.accentColor }
                : { background: 'white', color: festival.accentColor, border: '1.5px solid ' + festival.accentColor + '66' }"
              @click="$emit('pick')"
            >
              <component :is="picked ? Check : Plus" class="w-4 h-4" /> {{ picked ? 'Going!' : 'Going?' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Wave divider, matching the homepage -->
    <svg
      class="block w-full h-10 -mb-px"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
    >
      <path
        d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z"
        fill="#3b1f0d"
        opacity="0.08"
      />
    </svg>
  </section>
</template>
