<script setup lang="ts">
/**
 * /business/network — "Network". Today: the pages I manage and my claim
 * requests. Planned: the artists, venues and organizers I work with (people
 * I book, venues I play at), so this page grows into my business network.
 */
import { ArrowRight, Search, Plus } from 'lucide-vue-next'

definePageMeta({ layout: 'business' })
useHead({ title: 'Network | Business | WeDance' })

const { $trpc } = useNuxtApp()
type Data = Awaited<ReturnType<typeof $trpc.business.myProfiles.query>>
const data = ref<Data | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await $trpc.business.myProfiles.query()
  } catch (e: any) {
    error.value = e?.message || 'Could not load your network.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const typeLabel: Record<string, string> = { artist: 'Artist', venue: 'Venue', organizer: 'Organizer' }
</script>

<template>
  <div>
    <AdminPageHeader eyebrow="Business" title="Network" description="Your pages on WeDance: the start of your dance business network.">
      <Button variant="outline-pill" size="pill-sm" as-child>
        <NuxtLink to="/business/claim"><Search /> Find my page</NuxtLink>
      </Button>
      <Button variant="pill" size="pill-sm" as-child>
        <NuxtLink to="/business/new"><Plus /> Create</NuxtLink>
      </Button>
    </AdminPageHeader>

    <AdminState v-if="error" kind="error" :message="error" />
    <AdminState v-if="loading" kind="loading" />

    <template v-else-if="data">
      <AdminState
        v-if="!data.managed.length && !data.claims.length"
        kind="empty"
        message="Your network starts with your own page."
        hint="It may already be here: WeDance lists thousands of artists, venues and organizers. Find yours and claim it, or create a new one."
      />

      <section v-if="data.managed.length" class="mt-6">
        <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Your pages</h2>
        <div class="mt-3 grid gap-3">
          <NuxtLink
            v-for="p in data.managed"
            :key="p.username"
            :to="`/business/network/${p.username}`"
            class="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-wd-card transition-colors hover:bg-accent/40"
          >
            <img v-if="p.photo" :src="p.photo" :alt="p.name" class="size-12 rounded-xl object-cover bg-muted">
            <div v-else class="size-12 rounded-xl bg-muted" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold leading-tight truncate">{{ p.name }}</h3>
                <AdminStatus>{{ typeLabel[p.type] || p.type }}</AdminStatus>
              </div>
              <p class="mt-0.5 text-sm text-muted-foreground truncate">@{{ p.username }}<template v-if="p.city"> · {{ p.city }}</template></p>
            </div>
            <ArrowRight class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </NuxtLink>
        </div>
      </section>

      <section v-if="data.claims.length" class="mt-8">
        <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Your requests</h2>
        <div class="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
          <div v-for="c in data.claims" :key="c.id" class="flex items-center gap-3 rounded-2xl border bg-card p-4">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold truncate">{{ c.name }}</p>
              <p class="text-xs text-muted-foreground">@{{ c.username }}</p>
            </div>
            <AdminStatus v-if="c.status === 'pending'" tone="warning">{{ c.kind === 'join' ? 'Waiting for the owners' : 'Waiting for WeDance' }}</AdminStatus>
            <AdminStatus v-else tone="danger">Not approved</AdminStatus>
          </div>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">WeDance reviews claims by hand; join requests go to the page’s owners.</p>
      </section>
    </template>
  </div>
</template>
