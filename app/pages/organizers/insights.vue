<script setup lang="ts">
/**
 * /organizers/insights — the organizer's dashboard for their festival(s).
 * Today it shows the style & level mix of the attendees (P726); the other
 * promised insights (workshop demand, geography, post-festival signal) slot in
 * here as they are built. Access: the organizer whose festival submission the
 * team onboarded, or an admin (see server/trpc/routers/festivalInsights.ts).
 */
import { BarChart3, Loader2 } from 'lucide-vue-next'
import type { StyleLevelMix as Mix } from '#shared/utils/styleLevelMix'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Organizer insights',
  meta: [{ name: 'robots', content: 'noindex' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const { $trpc } = useNuxtApp()
const { isSignedIn, isLoading } = useAuth()
const route = useRoute()
const router = useRouter()

type MyFestival = { slug: string; name: string; startDate: string | null }

const festivals = ref<MyFestival[]>([])
const selected = ref<string>('')
const mix = ref<(Mix & { festival: { slug: string; name: string } }) | null>(null)
const loadingList = ref(true)
const loadingMix = ref(false)
const error = ref('')

async function loadFestivals() {
  loadingList.value = true
  error.value = ''
  try {
    festivals.value = await $trpc.festivalInsights.myFestivals.query()
    const wanted = route.query.festival as string | undefined
    selected.value = festivals.value.find(f => f.slug === wanted)?.slug ?? festivals.value[0]?.slug ?? ''
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not load your festivals.'
  } finally {
    loadingList.value = false
  }
}

async function loadMix(slug: string) {
  if (!slug) return
  loadingMix.value = true
  error.value = ''
  mix.value = null
  try {
    mix.value = await $trpc.festivalInsights.styleLevelMix.query({ festivalSlug: slug })
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not load insights.'
  } finally {
    loadingMix.value = false
  }
}

watch(selected, (slug) => {
  router.replace({ query: slug ? { festival: slug } : {} })
  loadMix(slug)
})

watch([isLoading, isSignedIn], ([loadingNow, signedIn]) => {
  if (loadingNow) return
  if (signedIn) loadFestivals()
  else loadingList.value = false
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <main class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">The dashboard</div>
      <h1 class="mt-2 text-4xl leading-tight">
        Your <em class="italic" style="color:#dc2626;">insights.</em>
      </h1>
      <p class="mt-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        Who is actually coming — so you can plan a program that fits them.
      </p>

      <div v-if="isLoading || loadingList" class="mt-10 flex items-center gap-2 text-sm" style="font-family: system-ui, sans-serif;">
        <Loader2 class="w-4 h-4 animate-spin" /> Loading…
      </div>

      <div v-else-if="!isSignedIn" class="mt-10 rounded-2xl bg-white border p-6" style="border-color:#3b1f0d22; font-family: system-ui, sans-serif;">
        <p class="text-sm">Sign in with the account you used to list your festival to see its insights.</p>
      </div>

      <div v-else-if="!festivals.length && !error" class="mt-10 rounded-2xl bg-white border p-6" style="border-color:#3b1f0d22; font-family: system-ui, sans-serif;">
        <BarChart3 class="w-6 h-6" style="color:#f59e0b;" />
        <p class="mt-2 text-sm">
          No festivals on your account yet. Insights open once the team has onboarded the festival you listed.
        </p>
        <NuxtLink to="/organizers/create" class="mt-4 inline-block text-sm font-bold underline" style="color:#dc2626;">
          List your festival →
        </NuxtLink>
      </div>

      <template v-else>
        <div v-if="festivals.length > 1" class="mt-8" style="font-family: system-ui, sans-serif;">
          <label for="insights-festival" class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Festival</label>
          <select
            id="insights-festival"
            v-model="selected"
            class="h-11 w-full sm:w-auto rounded-xl px-3.5 text-sm bg-white"
            style="border:1px solid #3b1f0d33; color:#3b1f0d;"
          >
            <option v-for="f in festivals" :key="f.slug" :value="f.slug">{{ f.name }}</option>
          </select>
        </div>

        <p v-if="error" role="alert" class="mt-8 text-sm rounded-xl p-3" style="background:#dc262614; color:#b91c1c; font-family: system-ui, sans-serif;">
          {{ error }}
        </p>

        <section v-if="mix || loadingMix" class="mt-8">
          <h2 class="text-2xl">
            Style &amp; level mix<span v-if="mix" style="color:#5b3a1d;"> · {{ mix.festival.name }}</span>
          </h2>
          <div v-if="loadingMix" class="mt-4 flex items-center gap-2 text-sm" style="font-family: system-ui, sans-serif;">
            <Loader2 class="w-4 h-4 animate-spin" /> Loading…
          </div>
          <StyleLevelMix v-else-if="mix" :mix="mix" class="mt-4" />
        </section>
      </template>
    </main>

    <SiteFooter />
  </div>
</template>
