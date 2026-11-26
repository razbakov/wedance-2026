<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
/**
 * /artists — the artist directory, backed by real migrated profiles
 * (entity.listArtists). The tRPC client is client-only, so we fetch on mount.
 * Each card links to the unified /@<handle> profile.
 */
import { displayDanceStyle, sortDanceStyles } from '#shared/dance-styles'
import {
  ARTIST_EVENT_TYPES, ARTIST_EVENT_TYPE_LABELS, artistAreaChoices,
  artistMatchesSearch, artistTravelsTo, normalizeArtistEventType,
} from '#shared/utils/artistSearch'
import { citySlug } from '#shared/utils/citySearch'
import { Bookmark, ChevronDown, Heart, MapPin, Search } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Field } from '~/components/ui/field'
import { Input } from '~/components/ui/input'
import { WD } from '~/lib/brand'
import { readableOn } from '~/lib/contrast'
import { initialOf } from '#shared/utils/initials'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Artists',
  meta: [
    { name: 'description', content: 'The teachers, DJs, and performers of the Cuban dance scene — every festival, every city.' },
  ],
})

type Artist = {
  username: string
  name: string
  photo: string | null
  city: string | null
  citySlug: string | null
  styles: string[]
  languages: string[]
  bio: string | null
  eventTypes: string[]
  serviceAreas: { city: string; citySlug: string }[]
}

const langLabel: Record<string, string> = { en: 'EN', es: 'ES', de: 'DE', fr: 'FR', pt: 'PT', it: 'IT', ru: 'RU', hu: 'HU', sl: 'SL' }

const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()
const artists = ref<Artist[]>([])
const loading = ref(true)
const followedUsernames = ref(new Set<string>())
const shortlistedUsernames = ref(new Set<string>())
const shortlistBusy = ref('')
const shortlistError = ref('')
const showShortlistSignIn = ref(false)

onMounted(async () => {
  try {
    artists.value = (await $trpc.entity.listArtists.query()) as Artist[]
  }
  catch { /* leave empty */ }
  finally { loading.value = false }

  if (isSignedIn.value) {
    try {
      const usernames = await $trpc.follow.myFollows.query()
      followedUsernames.value = new Set(usernames)
    } catch {}
    try {
      const mine = await $trpc.shortlist.mine.query()
      shortlistedUsernames.value = new Set(mine.map(a => a.username))
    } catch {}
  }
})

async function toggleShortlist(artist: Artist) {
  if (!isSignedIn.value) { showShortlistSignIn.value = true; return }
  if (shortlistBusy.value) return
  shortlistBusy.value = artist.username
  shortlistError.value = ''
  try {
    const result = await $trpc.shortlist.toggle.mutate({ username: artist.username, surface: 'artists' })
    const next = new Set(shortlistedUsernames.value)
    if (result.shortlisted) next.add(artist.username)
    else next.delete(artist.username)
    shortlistedUsernames.value = next
    useTrack().track(result.shortlisted ? 'shortlist_add' : 'shortlist_remove', { profile: artist.username, surface: 'artists' })
  } catch {
    shortlistError.value = "Couldn't update your shortlist — please try again."
  } finally {
    shortlistBusy.value = ''
  }
}

const route = useRoute()
const router = useRouter()
function queryValue(key: string) {
  const v = route.query[key]
  return String(Array.isArray(v) ? v[0] ?? '' : v ?? '')
}

const searchQuery = ref(queryValue('q'))
const selectedStyle = ref(queryValue('style'))
const selectedEvent = ref(normalizeArtistEventType(queryValue('event')) ?? '')
const selectedCity = ref(queryValue('city') || queryValue('area'))

const allStyles = computed(() => {
  const s = new Set<string>()
  artists.value.forEach(a => (a.styles || []).forEach(st => s.add(st)))
  // Most popular first (taxonomy), aliases de-duplicated.
  return sortDanceStyles(Array.from(s))
})

const allAreas = computed(() => artistAreaChoices(artists.value))

watch(allAreas, (areas) => {
  if (!selectedCity.value) return
  const want = citySlug(selectedCity.value)
  const hit = areas.find(area => citySlug(area) === want || area.toLowerCase() === selectedCity.value.toLowerCase())
  if (hit && hit !== selectedCity.value) selectedCity.value = hit
})

const filtered = computed(() => artists.value.filter(a => artistMatchesSearch(a, {
  query: searchQuery.value,
  style: selectedStyle.value,
  eventType: selectedEvent.value,
  serviceArea: selectedCity.value,
})))

const eventPhrase: Record<string, string> = { wedding: 'weddings', birthday: 'birthdays', corporate: 'corporate events' }
const filtersSet = computed(() => [searchQuery.value.trim(), selectedCity.value, selectedStyle.value, selectedEvent.value].filter(Boolean).length)

function clearFilters() {
  searchQuery.value = ''
  selectedCity.value = ''
  selectedStyle.value = ''
  selectedEvent.value = ''
}

watch([searchQuery, selectedStyle, selectedEvent, selectedCity], () => {
  const next: Record<string, string | string[]> = { ...route.query }
  const set = (key: string, value: string) => {
    if (value) next[key] = value
    else delete next[key]
  }
  set('q', searchQuery.value.trim())
  set('city', selectedCity.value)
  delete next.area
  set('style', selectedStyle.value)
  set('event', selectedEvent.value)
  const same = ['q', 'city', 'style', 'event', 'area'].every(key => String(route.query[key] ?? '') === String(next[key] ?? ''))
  if (!same) router.replace({ query: next })
})

useTrackSearch('artists', () => ({ query: searchQuery.value, filters: { city: selectedCity.value, style: selectedStyle.value, event: selectedEvent.value } }), () => filtered.value.length)

const accents = [WD.red600, WD.cyan600, WD.green600, WD.purple500, WD.amber500, WD.pink500, WD.violet600]
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main>

    <!-- HERO -->
    <section class="max-w-4xl mx-auto px-4 pt-10 pb-6 text-center">
      <h1 class="text-4xl sm:text-5xl leading-[0.98] text-foreground">
        Who moves <em class="italic text-primary">the floor.</em>
      </h1>
      <p class="mt-3 text-base leading-relaxed max-w-xl mx-auto text-muted-foreground">
        Teachers, DJs, and performers — for classes, weddings, birthdays and corporate events.
      </p>
    </section>

    <!-- TOOLBAR -->
    <section class="sticky top-0 z-30 bg-background border-b border-wd-brown-900/[8.2%]">
      <div class="max-w-5xl mx-auto px-4 py-2.5">
        <div class="flex flex-wrap items-center gap-3">
          <Field id="artist-search" label="Search artists by name" hide-label class="relative flex-1 min-w-[180px] max-w-xs">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary" aria-hidden="true" />
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name"
              class="h-9 rounded-full pl-9 pr-3 bg-white"
            />
          </Field>

          <!-- Native selects styled as filter pills (filled when active) — Field supplies the label. -->
          <Field v-if="allAreas.length" v-slot="{ id }" label="Filter by service area" hide-label class="relative">
            <select
              :id="id"
              v-model="selectedCity"
              class="h-9 pl-3 pr-8 rounded-full text-xs font-bold appearance-none cursor-pointer outline-none font-sans"
              :style="selectedCity
                ? { background: 'var(--wd-brown-900)', color: 'var(--wd-cream)' }
                : { background: 'white', color: 'var(--wd-brown-700)', border: '1px solid color-mix(in srgb, var(--wd-brown-900) 20%, transparent)' }"
            >
              <option value="">
                All areas
              </option>
              <option v-for="city in allAreas" :key="city" :value="city">
                {{ city }}
              </option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" :style="{ color: selectedCity ? WD.cream : WD.brown700 }" aria-hidden="true" />
          </Field>

          <Field v-if="allStyles.length" v-slot="{ id }" label="Filter by dance style" hide-label class="relative">
            <select
              :id="id"
              v-model="selectedStyle"
              class="h-9 pl-3 pr-8 rounded-full text-xs font-bold appearance-none cursor-pointer outline-none font-sans"
              :style="selectedStyle
                ? { background: readableOn(accents[allStyles.indexOf(selectedStyle) % accents.length]!), color: 'white' }
                : { background: 'white', color: 'var(--wd-brown-700)', border: '1px solid color-mix(in srgb, var(--wd-brown-900) 20%, transparent)' }"
            >
              <option value="">
                All styles
              </option>
              <option v-for="style in allStyles" :key="style" :value="style">
                {{ displayDanceStyle(style) }}
              </option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" :style="{ color: selectedStyle ? 'white' : WD.brown700 }" aria-hidden="true" />
          </Field>

          <Field v-slot="{ id }" label="Filter by event type" hide-label class="relative">
            <select
              :id="id"
              v-model="selectedEvent"
              class="h-9 pl-3 pr-8 rounded-full text-xs font-bold appearance-none cursor-pointer outline-none font-sans"
              :style="selectedEvent
                ? { background: 'var(--wd-brown-900)', color: 'var(--wd-cream)' }
                : { background: 'white', color: 'var(--wd-brown-700)', border: '1px solid color-mix(in srgb, var(--wd-brown-900) 20%, transparent)' }"
            >
              <option value="">
                All events
              </option>
              <option v-for="type in ARTIST_EVENT_TYPES" :key="type" :value="type">
                {{ ARTIST_EVENT_TYPE_LABELS[type] }}
              </option>
            </select>
            <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" :style="{ color: selectedEvent ? WD.cream : WD.brown700 }" aria-hidden="true" />
          </Field>

          <NuxtLink to="/shortlist" class="text-xs font-bold text-primary font-sans whitespace-nowrap">Your shortlist</NuxtLink>
          <span class="text-xs ml-auto whitespace-nowrap text-secondary font-hand" style="font-size:16px;" aria-live="polite">
            {{ filtered.length }} artist{{ filtered.length === 1 ? '' : 's' }}
          </span>
        </div>
        <p v-if="shortlistError" role="alert" class="mt-2 text-xs font-bold text-destructive font-sans">{{ shortlistError }}</p>
      </div>
    </section>

    <!-- GRID -->
    <section class="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <div v-if="loading" class="text-center py-14 text-secondary font-sans">
        Loading artists…
      </div>

      <div
        v-else-if="!filtered.length"
        class="text-center py-14 rounded-2xl border-2 border-dashed border-input bg-white/50"
      >
        <Search class="w-8 h-8 mx-auto mb-3 text-secondary" />
        <p class="text-sm text-muted-foreground font-sans">
          <template v-if="filtersSet > 1">Nothing matches these filters.</template>
          <template v-else-if="selectedCity && searchQuery">No artists in {{ selectedCity }} match "{{ searchQuery }}"</template>
          <template v-else-if="selectedCity">No artists play in {{ selectedCity }} yet</template>
          <template v-else-if="searchQuery">Nothing matches "{{ searchQuery }}"</template>
          <template v-else-if="selectedStyle">No artists dance {{ displayDanceStyle(selectedStyle) }} yet</template>
          <template v-else-if="selectedEvent">No artists list {{ eventPhrase[selectedEvent] }} yet</template>
          <template v-else>No artists yet.</template>
        </p>
        <Button v-if="filtersSet" type="button" variant="link" class="mt-2 h-auto p-0 text-xs font-bold underline font-sans" @click="clearFilters">
          Clear filters
        </Button>
      </div>

      <div v-else class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="(a, i) in filtered"
          :key="a.username"
          class="group relative aspect-square rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
          :style="{ boxShadow: '0 2px 8px rgba(59,31,18,0.12)' }"
        >
          <NuxtLink
            :to="`/@${a.username}`"
            class="absolute inset-0 z-0"
          >
          <img
            v-if="a.photo"
            :src="sizedImage(a.photo, IMG.card)"
            :alt="a.name"
            class="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          >
          <div
            v-else
            class="absolute inset-0 flex items-center justify-center text-5xl font-bold text-white"
            :style="{ background: accents[i % accents.length] }"
          >
            {{ initialOf(a.name) }}
          </div>

          <!-- Following indicator. The bookmark sits in the corner, so the heart stays clear of it. -->
          <div v-if="followedUsernames.has(a.username)" class="absolute top-2.5 right-12 z-10">
            <Heart class="w-4 h-4 text-white drop-shadow" style="fill:var(--wd-red-600); color:var(--wd-red-600);" />
          </div>

          <!-- Style labels at top -->
          <div v-if="a.styles?.length" class="absolute top-2.5 left-2.5 flex flex-wrap gap-1 z-10">
            <span
              v-for="st in a.styles.slice(0, 3)"
              :key="st"
              class="text-eyebrow font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
              style="background:rgba(59,31,18,0.55); backdrop-filter: blur(4px);"
            >{{ st }}</span>
          </div>

          <!-- Name + city overlay at bottom -->
          <div
            class="absolute inset-x-0 bottom-0 p-3 pt-10 z-10"
            style="background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);"
          >
            <h2 class="text-base font-bold leading-tight truncate text-white font-display">
              {{ a.name }}
            </h2>
            <p v-if="a.city" class="text-xs inline-flex items-center gap-1 mt-0.5 text-white/80 font-sans">
              <MapPin class="w-3 h-3" /> {{ a.city }}
            </p>
            <p v-if="artistTravelsTo(a, selectedCity)" class="text-[11px] mt-0.5 text-white/90 font-sans">
              Travels here
            </p>
            <div v-if="a.languages?.length" class="flex gap-1 mt-1">
              <span v-for="l in a.languages.slice(0, 3)" :key="l" class="text-[9px] font-bold tracking-wide px-1 py-px rounded text-white/90" style="background:rgba(255,255,255,0.2); backdrop-filter: blur(4px);">{{ langLabel[l] || l.toUpperCase() }}</span>
            </div>
          </div>
          </NuxtLink>
          <button
            type="button"
            class="absolute top-2.5 right-2.5 z-20 grid place-items-center w-8 h-8 rounded-full shadow"
            :class="shortlistedUsernames.has(a.username) ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-wd-red-800'"
            :aria-pressed="shortlistedUsernames.has(a.username)"
            :aria-label="shortlistedUsernames.has(a.username) ? `Remove ${a.name} from your shortlist` : `Shortlist ${a.name}`"
            :disabled="shortlistBusy === a.username"
            @click="toggleShortlist(a)"
          >
            <Bookmark class="w-4 h-4" :class="shortlistedUsernames.has(a.username) ? 'fill-current' : ''" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
    </main>

    <SiteFooter />
    <SignUpModal v-model:open="showShortlistSignIn" action="signin" />
  </div>
</template>
