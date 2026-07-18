<script setup lang="ts">
/**
 * A full, standalone, SEO-first listing of one role (artists / organisers /
 * venues) for a city — the "See all" target from /cities/[city]. SSR-rendered
 * with a data-driven <title>, canonical URL, and BreadcrumbList + ItemList
 * JSON-LD so each city×role page is independently indexable.
 */
import { ArrowLeft, MapPin } from 'lucide-vue-next'

const props = defineProps<{ role: 'artists' | 'organisers' | 'venues' }>()

const route = useRoute()
const slug = route.params.city as string
const { dir, cityName, accent, stylePhrase } = useCityDirectory(slug)

const people = computed(() => {
  const d = dir.value
  if (!d) return []
  return props.role === 'artists' ? d.artists : props.role === 'organisers' ? d.organizers : d.venues
})

const roleLabel = computed(() =>
  props.role === 'artists' ? 'Artists' : props.role === 'organisers' ? 'Organisers' : 'Venues',
)

const heading = computed(() => {
  if (props.role === 'artists') return { kicker: 'Every artist & teacher', accentWord: 'artists' }
  if (props.role === 'organisers') return { kicker: 'Who runs the floor', accentWord: 'organisers' }
  return { kicker: 'Where you dance', accentWord: 'venues' }
})

const title = computed(() => {
  if (props.role === 'artists') return `${stylePhrase.value} Artists & Teachers in ${cityName.value} — WeDance`
  if (props.role === 'organisers') return `Dance Organisers & Promoters in ${cityName.value} — WeDance`
  return `Dance Venues in ${cityName.value} — WeDance`
})
const description = computed(() => {
  if (props.role === 'artists') return `Every ${stylePhrase.value.toLowerCase()} artist, teacher and DJ in ${cityName.value} — browse the local dance scene on WeDance.`
  if (props.role === 'organisers') return `The organisers and promoters running social dance events in ${cityName.value}. Find who to dance with on WeDance.`
  return `Social dance venues and floors in ${cityName.value} — where to dance, on WeDance.`
})

const photo = (p: any) =>
  p.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || '?')}&size=160&background=ec4899&color=fff&bold=true&rounded=true`

// Absolute origin for canonical + JSON-LD (correct in SSR and any env).
const origin = useRequestURL().origin
const canonical = computed(() => `${origin}/cities/${slug}/${props.role}`)

const jsonld = computed(() => JSON.stringify([
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'WeDance', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Cities', item: `${origin}/cities` },
      { '@type': 'ListItem', position: 3, name: cityName.value, item: `${origin}/cities/${slug}` },
      { '@type': 'ListItem', position: 4, name: roleLabel.value, item: canonical.value },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${roleLabel.value} in ${cityName.value}`,
    numberOfItems: people.value.length,
    itemListElement: people.value.slice(0, 100).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      url: `${origin}/@${p.username}`,
    })),
  },
]))

useHead(() => ({
  title: title.value,
  meta: [{ name: 'description', content: description.value }],
  link: [
    { rel: 'canonical', href: canonical.value },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
  script: [{ type: 'application/ld+json', innerHTML: jsonld.value }],
}))
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section class="max-w-4xl mx-auto px-4 pt-8 pb-4">
      <!-- Breadcrumb back to the city hub -->
      <nav class="text-xs mb-4" style="color:#9a5614; font-family: system-ui, sans-serif;" aria-label="Breadcrumb">
        <NuxtLink to="/cities" class="hover:underline">Cities</NuxtLink>
        <span class="mx-1.5">/</span>
        <NuxtLink :to="`/cities/${slug}`" class="hover:underline">{{ cityName }}</NuxtLink>
        <span class="mx-1.5">/</span>
        <span style="color:#5b3a1d;">{{ roleLabel }}</span>
      </nav>

      <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">{{ heading.kicker }}</div>
      <h1 class="mt-2 text-4xl sm:text-5xl leading-[1.02] tracking-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
        {{ roleLabel }} in
        <em class="italic" :style="{ color: accent }">{{ cityName }}</em>
      </h1>
      <p class="mt-2 text-sm italic" style="color:#5b3a1d;">
        {{ people.length }} {{ heading.accentWord }} in {{ cityName }}.
        <NuxtLink :to="`/cities/${slug}`" class="not-italic font-bold hover:underline" :style="{ color: accent, fontFamily: 'system-ui, sans-serif' }">
          ← Back to this week
        </NuxtLink>
      </p>
    </section>

    <section class="max-w-4xl mx-auto px-4 pb-16">
      <div v-if="people.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <NuxtLink
          v-for="p in people"
          :key="p.username || p.name || ''"
          :to="`/@${p.username}`"
          class="group block rounded-2xl bg-white border p-4 text-center transition-all hover:-translate-y-1"
          :style="{ borderColor: accent + '33', boxShadow: '0 1px 0 ' + accent + '14' }"
        >
          <img
            :src="photo(p)"
            :alt="p.name || ''"
            loading="lazy"
            class="w-20 h-20 mx-auto rounded-full object-cover shadow-sm"
          >
          <div class="mt-3 text-sm font-bold leading-tight truncate" style="color:#3b1f0d;">
            {{ p.name }}
          </div>
          <div v-if="p.styles?.length" class="mt-1 text-[11px] italic truncate" style="color:#9a5614;">
            {{ p.styles.slice(0, 3).join(' · ') }}
          </div>
        </NuxtLink>
      </div>

      <div
        v-else
        class="rounded-2xl border-2 border-dashed p-10 text-center"
        style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);"
      >
        <MapPin class="w-6 h-6 mx-auto mb-2" style="color:#9a5614;" />
        <p class="text-sm font-bold" style="color:#3b1f0d;">No {{ roleLabel.toLowerCase() }} listed in {{ cityName }} yet.</p>
        <NuxtLink
          to="/for-events"
          class="inline-flex items-center gap-2 mt-4 rounded-full px-5 py-2.5 text-white text-xs font-bold uppercase tracking-wider"
          style="background:linear-gradient(135deg,#dc2626,#f97316);"
        >
          List yours
        </NuxtLink>
      </div>

      <!-- Local groups (WhatsApp / Telegram / …) live under Organisers — a
           community that runs a chat is an organiser without a profile yet. -->
      <ClientOnly v-if="role === 'organisers'">
        <CommunityGroupsSection :city-slug="slug" :city-name="cityName" />
      </ClientOnly>
    </section>

    <SiteFooter />
  </div>
</template>
