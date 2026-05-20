<script setup lang="ts">
/**
 * David Calzado & Charanga Habanera concert — single-night event page (PR 3 of O-008).
 *
 * Why this file exists separately from `[slug].vue`:
 *   The dynamic `[slug].vue` is workshop/festival-shaped (cart, partner finder,
 *   workshop schedule, €1 unlock). Charanga is a single-night concert — wrong
 *   shape. Nuxt's file-based routing matches this exact filename before the
 *   dynamic catch-all, so this is the only thing the other festivals need to
 *   know: nothing. Their render path stays untouched.
 *
 * Data source: DB via `festival.bySlug`. Returns 404 if the seed is missing.
 * Tickets and money flow through TicketTailor — we just render the CTA.
 *
 * Roster placeholder: PR 2 ships the real `<AttendeeRoster />` component with
 * privacy toggles. For now we render copy that points buyers at `/charanga/claim`.
 */
import { Ticket, MapPin, Calendar, ArrowRight, Users } from 'lucide-vue-next'

const { $trpc } = useNuxtApp()

const SLUG = 'charanga-habanera-munich-2026'

const { data: festival, error } = await useAsyncData(`festival-${SLUG}`, async () => {
  const result = await $trpc.festival.bySlug.query({ slug: SLUG })
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Festival not found', fatal: true })
  }
  return result
})

// Re-throw a fatal 404 so Nuxt renders the error page instead of an empty template
if (error.value) {
  throw error.value
}

// Date formatting — Charanga is a single-night concert, so we render the
// start date in long form with the door time.
const eventDateLabel = computed(() => {
  if (!festival.value?.startDate) return ''
  const d = new Date(festival.value.startDate + 'T00:00:00')
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.toLocaleDateString('en-US', { day: 'numeric' })
  const year = d.getFullYear()
  return `${weekday}, ${month} ${day}, ${year} · 19:00`
})

// v0 price tiers — these mirror TicketTailor (the source of truth is over there).
// Hardcoded for v0 because syncing them adds no user value: buyers see live
// pricing on TicketTailor anyway.
const priceTiers = [
  { label: 'Super Early Bird', price: '€55', soldOut: true },
  { label: 'Early Bird', price: '€60', soldOut: true },
  { label: 'Late Bird', price: '€65', soldOut: false },
  { label: 'Regular', price: '€70', soldOut: false },
  { label: 'Group of 5', price: '€219', note: '€43.80/person', soldOut: false },
]

const VENUE_NAME = 'La Rumba Latin Club'
const VENUE_CITY = 'Munich'

useHead(() => ({
  title: festival.value
    ? `${festival.value.name} · ${VENUE_CITY} · ${festival.value.startDate}`
    : 'Charanga Habanera Munich',
  meta: [
    {
      name: 'description',
      content: festival.value
        ? `${festival.value.name} live at ${VENUE_NAME}, ${VENUE_CITY} — ${eventDateLabel.value}. Tickets via TicketTailor.`
        : 'David Calzado & Charanga Habanera live in Munich.',
    },
    { property: 'og:title', content: festival.value?.name ?? 'Charanga Habanera Munich' },
    { property: 'og:type', content: 'event' },
  ],
}))

function openTickets() {
  if (festival.value?.ticketUrl) {
    window.open(festival.value.ticketUrl, '_blank', 'noopener,noreferrer')
  }
}
</script>

<template>
  <div v-if="festival" class="min-h-screen bg-background">
    <!-- Hero -->
    <section
      class="relative overflow-hidden border-b"
      style="background: radial-gradient(circle at 20% 10%, hsl(var(--primary) / 0.15), transparent 55%), radial-gradient(circle at 90% 80%, hsl(var(--primary) / 0.10), transparent 60%);"
    >
      <div class="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-6">
        <div class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <span class="size-1.5 rounded-full bg-primary animate-pulse" />
          Live concert · {{ VENUE_CITY }}
        </div>

        <div class="space-y-3">
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            {{ festival.name }}
          </h1>
          <p class="text-base sm:text-lg text-muted-foreground max-w-2xl">
            Una sola noche. La banda de timba más viva de Cuba — en directo.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-sm">
          <div class="inline-flex items-center gap-2 text-foreground">
            <Calendar class="size-4 text-muted-foreground" />
            <span class="font-medium">{{ eventDateLabel }}</span>
          </div>
          <div class="inline-flex items-center gap-2 text-foreground">
            <MapPin class="size-4 text-muted-foreground" />
            <span class="font-medium">{{ VENUE_NAME }}, {{ VENUE_CITY }}</span>
          </div>
        </div>

        <!-- Primary CTA -->
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            size="lg"
            class="w-full sm:w-auto text-base px-8"
            :disabled="!festival.ticketUrl"
            @click="openTickets"
          >
            <Ticket class="size-5 mr-2" />
            Get tickets
          </Button>
          <a
            href="#tiers"
            class="inline-flex items-center justify-center text-sm text-muted-foreground hover:text-foreground transition-colors sm:px-2"
          >
            See price tiers
          </a>
        </div>
      </div>
    </section>

    <div class="max-w-3xl mx-auto px-4 py-10 space-y-12">
      <!-- About -->
      <section>
        <h2 class="text-lg font-semibold mb-3">About the night</h2>
        <div class="prose-sm text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            David Calzado y La Charanga Habanera — one of the defining bands of contemporary
            Cuban timba — is bringing the floor to {{ VENUE_NAME }} for a single Munich date.
            Expect the original lineup, the original sound, and a room built for dancing.
          </p>
          <p>
            Doors at 19:00. Show starts shortly after. La Rumba is a 450-capacity dance club —
            once tickets sell out, the door is closed.
          </p>
        </div>
      </section>

      <!-- Price tiers -->
      <section id="tiers" class="scroll-mt-6">
        <h2 class="text-lg font-semibold mb-3">Tickets</h2>
        <p class="text-xs text-muted-foreground mb-4">
          Live pricing is on TicketTailor — these tiers move as the date approaches.
        </p>
        <div class="rounded-lg border bg-card divide-y">
          <div
            v-for="tier in priceTiers"
            :key="tier.label"
            class="flex items-center justify-between px-4 py-3"
          >
            <div class="flex flex-col">
              <span
                class="text-sm font-medium"
                :class="tier.soldOut ? 'text-muted-foreground line-through' : 'text-foreground'"
              >
                {{ tier.label }}
              </span>
              <span v-if="tier.note" class="text-xs text-muted-foreground">{{ tier.note }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="text-sm font-semibold"
                :class="tier.soldOut ? 'text-muted-foreground line-through' : 'text-foreground'"
              >
                {{ tier.price }}
              </span>
              <span
                v-if="tier.soldOut"
                class="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
              >
                Sold out
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="default"
          size="lg"
          class="w-full mt-4"
          :disabled="!festival.ticketUrl"
          @click="openTickets"
        >
          <Ticket class="size-5 mr-2" />
          Buy on TicketTailor
        </Button>
      </section>

      <!-- Who's going (placeholder — PR 2 replaces this with <AttendeeRoster />) -->
      <section>
        <div class="flex items-center gap-2 mb-3">
          <Users class="size-5 text-muted-foreground" />
          <h2 class="text-lg font-semibold">Verified attendees</h2>
        </div>
        <div class="rounded-lg border border-dashed bg-card/40 p-5 text-center space-y-3">
          <p class="text-sm text-muted-foreground">
            The roster of verified ticket holders shows up here as people connect.
          </p>
          <NuxtLink
            to="/charanga/claim"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Connect after buying your ticket to claim your spot
            <ArrowRight class="size-4" />
          </NuxtLink>
        </div>
      </section>

      <!-- Venue -->
      <section>
        <h2 class="text-lg font-semibold mb-3">Venue</h2>
        <div class="rounded-lg border bg-card p-4 space-y-1">
          <p class="text-sm font-medium">{{ VENUE_NAME }}</p>
          <p class="text-sm text-muted-foreground">{{ VENUE_CITY }}, Germany</p>
          <p class="text-xs text-muted-foreground mt-2">Capacity 450 · dance floor venue</p>
        </div>
      </section>

      <!-- Footer / secondary actions -->
      <section class="border-t pt-6 text-center">
        <p class="text-sm text-muted-foreground">
          Already bought? →
          <NuxtLink
            to="/charanga/claim"
            class="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            /charanga/claim
          </NuxtLink>
        </p>
      </section>
    </div>
  </div>
</template>
