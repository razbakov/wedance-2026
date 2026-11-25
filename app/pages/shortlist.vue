<script setup lang="ts">
/**
 * /shortlist — a private booking list of artists (RAZ-1085).
 * Follow is a different action: it does not add anyone here, and shortlisting
 * does not follow them. The artist is not told.
 */
import {
  SHORTLIST_FILTERS,
  shortlistBoard,
  type ShortlistOccasion,
} from '#shared/utils/artistShortlist'

definePageMeta({ layout: false })

useHead({
  title: 'Your shortlist — WeDance',
  meta: [{ name: 'description', content: 'A private list of artists you might book for a wedding, a birthday or a corporate event.' }],
})

type Row = {
  username: string
  name: string
  photo: string | null
  city: string | null
  styles: string[]
  occasion: ShortlistOccasion | null
  note: string | null
  createdAt: string | Date
}

const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()
const appearsSignedIn = useAppearsSignedIn()
const hydrated = useHydrated()

const rows = ref<Row[]>([])
const loading = ref(true)
const filter = ref<ShortlistOccasion | 'all'>('all')
const error = ref('')
const busy = ref('')
const notices = ref<Record<string, string>>({})
const showSignIn = ref(false)

const filtered = computed(() => shortlistBoard(rows.value, filter.value))
const filterLabel = computed(() => SHORTLIST_FILTERS.find(f => f.id === filter.value)?.label ?? 'All')

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await $trpc.shortlist.mine.query() as Row[]
  } catch {
    error.value = "Couldn't load your shortlist — please try again."
  } finally {
    loading.value = false
  }
}

watch(isSignedIn, (signedIn) => {
  if (signedIn) load()
  else {
    rows.value = []
    loading.value = false
  }
}, { immediate: true })

async function save(artist: Row, payload: { occasion: ShortlistOccasion | null; note: string }) {
  busy.value = artist.username
  error.value = ''
  notices.value = { ...notices.value, [artist.username]: '' }
  try {
    const saved = await $trpc.shortlist.save.mutate({
      username: artist.username,
      occasion: payload.occasion,
      note: payload.note,
    })
    rows.value = rows.value.map(row => row.username === artist.username
      ? { ...row, occasion: saved.occasion, note: saved.note }
      : row)
    notices.value = { ...notices.value, [artist.username]: 'Saved' }
  } catch (e: any) {
    error.value = e?.message || "Couldn't save that — please try again."
  } finally {
    busy.value = ''
  }
}

async function remove(artist: Row) {
  busy.value = artist.username
  error.value = ''
  try {
    await $trpc.shortlist.toggle.mutate({ username: artist.username, surface: 'shortlist' })
    rows.value = rows.value.filter(row => row.username !== artist.username)
    useTrack().track('shortlist_remove', { profile: artist.username, surface: 'shortlist' })
  } catch {
    error.value = "Couldn't remove them — please try again."
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />
    <main class="max-w-5xl mx-auto px-4 pt-10 pb-16">
      <h1 class="text-4xl sm:text-5xl leading-[0.98]">Your <em class="italic text-primary">shortlist.</em></h1>
      <p class="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground font-sans">
        Artists you might book for a wedding, a birthday or a corporate event. Only you can see this.
        Follow still only shows you their events, and they are not told.
      </p>
      <NuxtLink to="/artists" class="mt-3 inline-block text-xs font-bold text-primary font-sans">Browse artists</NuxtLink>

      <p v-if="!hydrated || (appearsSignedIn && loading)" class="mt-10 text-sm text-muted-foreground font-sans">Loading your shortlist…</p>

      <section v-else-if="!appearsSignedIn" class="mt-10 rounded-2xl border bg-card p-6 font-sans">
        <h2 class="font-display text-2xl text-foreground">Sign in to keep a shortlist</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The list stays on your account. Shortlisting an artist does not follow them, and they are not told.
        </p>
        <Button type="button" variant="pill" size="pill-sm" class="mt-4" @click="showSignIn = true">Sign in</Button>
      </section>

      <template v-else>
        <p v-if="error" role="alert" class="mt-6 text-sm font-bold text-destructive font-sans">{{ error }}</p>

        <section v-if="!rows.length && !error" class="mt-10 rounded-2xl border-2 border-dashed border-input bg-white/50 p-8 text-center font-sans">
          <h2 class="font-display text-2xl text-foreground">Your shortlist is empty</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            Open an artist and tap Shortlist. That saves them here so you can compare them and book later.
            Follow does not add anyone to this list.
          </p>
          <Button as-child variant="cta" class="mt-5">
            <NuxtLink to="/artists">Browse artists</NuxtLink>
          </Button>
        </section>

        <template v-else-if="rows.length">
          <div class="mt-8 flex items-center gap-2 overflow-x-auto" role="group" aria-label="Filter by occasion">
            <button
              v-for="item in SHORTLIST_FILTERS"
              :key="item.id"
              type="button"
              class="h-8 shrink-0 px-3 rounded-full text-xs font-bold font-sans"
              :aria-pressed="filter === item.id"
              :class="filter === item.id ? 'bg-wd-brown-900 text-wd-cream' : 'bg-white text-foreground border border-input'"
              @click="filter = item.id"
            >
              {{ item.label }}
            </button>
            <span class="ml-auto shrink-0 text-xs text-secondary font-hand" style="font-size:16px;" aria-live="polite">
              {{ filtered.length }} artist{{ filtered.length === 1 ? '' : 's' }}
            </span>
          </div>

          <p v-if="!filtered.length" class="mt-8 text-sm text-muted-foreground font-sans">
            Nothing tagged {{ filterLabel }} yet.
          </p>
          <div v-else class="mt-4 grid gap-4 md:grid-cols-2">
            <ShortlistCard
              v-for="artist in filtered"
              :key="artist.username"
              :artist="artist"
              :busy="busy === artist.username"
              :notice="notices[artist.username] || ''"
              @save="save(artist, $event)"
              @remove="remove(artist)"
            />
          </div>
        </template>
      </template>
    </main>
    <SiteFooter />
    <SignUpModal v-model:open="showSignIn" action="signin" />
  </div>
</template>
