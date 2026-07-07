<script setup lang="ts">
/**
 * /u/<username> — public dancer profile.
 *
 * Identity (name, avatar, city, styles, role) + bio + social links + the
 * dancer's approved competition videos (their activity). Honors privacy: a
 * private profile 404s for everyone but its owner, who sees a "private" banner.
 * 2026 tropical style.
 */
import { MapPin, Pencil, ArrowLeft, Instagram, Youtube, Globe, Play, EyeOff } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()

const username = computed(() => String(route.params.username))

// The tRPC client is client-only (relative URL, no SSR base) — the whole app
// fetches on mount, so we do too rather than via SSR useAsyncData.
type ProfileData = Awaited<ReturnType<typeof $trpc.profile.getByUsername.query>>
const profile = ref<ProfileData | null>(null)
const pending = ref(true)
const failed = ref(false)

async function load() {
  pending.value = true
  failed.value = false
  try {
    profile.value = await $trpc.profile.getByUsername.query({ username: username.value })
  } catch {
    profile.value = null
    failed.value = true
  } finally {
    pending.value = false
  }
}
onMounted(load)

const notFound = computed(() => !pending.value && (failed.value || !profile.value))

const roleLabel: Record<string, string> = {
  lead: 'Leader',
  follow: 'Follower',
  both: 'Lead & Follow',
}

const initials = computed(() => {
  const n = (profile.value?.name || '').trim()
  if (!n) return '?'
  return n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
})

// Normalize a social value (full URL or bare handle) into a link.
function normalizeUrl(v: string | null | undefined, base: string): string | null {
  if (!v) return null
  const s = v.trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return base + s.replace(/^@/, '')
}
const igUrl = computed(() => normalizeUrl(profile.value?.instagram, 'https://instagram.com/'))
const ytUrl = computed(() => normalizeUrl(profile.value?.youtube, 'https://youtube.com/@'))
const siteUrl = computed(() => normalizeUrl(profile.value?.website, 'https://'))

useHead(() => ({
  title: profile.value ? `${profile.value.name} — WeDance` : 'WeDance — Dancer',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
}))
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- Loading -->
    <section v-if="pending" class="max-w-xl mx-auto px-4 py-24 text-center">
      <div class="inline-block w-8 h-8 rounded-full border-2 animate-spin" style="border-color:#dc262633; border-top-color:#dc2626;" />
    </section>

    <!-- Not found -->
    <section v-else-if="notFound" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl" style="color:#3b1f0d;">No dancer here</h1>
      <p class="mt-4 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        We couldn't find a dancer at <span class="font-bold">@{{ username }}</span>.
      </p>
      <NuxtLink to="/cities" class="inline-flex items-center gap-2 mt-6 text-sm font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">
        <ArrowLeft class="w-4 h-4" /> Browse cities
      </NuxtLink>
    </section>

    <section v-else class="max-w-xl mx-auto px-4 pt-12 pb-16">
      <!-- Owner-only private banner -->
      <div
        v-if="profile && !profile.isPublic && profile.isOwner"
        class="mb-4 rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
        style="background:#9a561414; color:#9a5614; font-family: system-ui, sans-serif;"
      >
        <EyeOff class="w-4 h-4 shrink-0" />
        <span>Your profile is <b>private</b> — only you can see this. Make it public in <NuxtLink to="/settings" class="underline font-bold">Settings</NuxtLink>.</span>
      </div>

      <div
        class="rounded-2xl overflow-hidden bg-white border"
        style="border-color:#dc262633; box-shadow: 0 1px 0 #dc262622, 0 10px 28px rgba(59,31,18,0.06);"
      >
        <div class="h-2" style="background:linear-gradient(135deg, #dc2626, #f97316);" />
        <div class="p-6 sm:p-8">
          <div class="flex items-start gap-5">
            <div class="shrink-0">
              <img
                v-if="profile?.photo"
                :src="profile.photo"
                :alt="profile?.name"
                class="w-20 h-20 rounded-full object-cover"
                style="border:2px solid #dc262633;"
              >
              <div
                v-else
                class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style="background:linear-gradient(135deg, #dc2626, #f97316);"
              >{{ initials }}</div>
            </div>

            <div class="min-w-0 flex-1">
              <h1 class="text-3xl leading-tight" style="color:#3b1f0d;">{{ profile?.name }}</h1>
              <div class="text-sm mt-0.5" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">@{{ profile?.username }}</div>
              <div v-if="profile?.city" class="flex items-center gap-1 mt-2 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                <MapPin class="w-3 h-3" style="color:#9a5614;" /> {{ profile.city }}
              </div>
              <div v-if="profile?.role" class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                {{ roleLabel[profile.role] || profile.role }}
              </div>
            </div>

            <NuxtLink
              v-if="profile?.isOwner"
              to="/settings"
              class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style="background:#dc262614; color:#dc2626; font-family: system-ui, sans-serif;"
            >
              <Pencil class="w-3 h-3" /> Edit
            </NuxtLink>
          </div>

          <!-- Bio -->
          <p v-if="profile?.bio" class="mt-5 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ profile.bio }}</p>

          <!-- Social links -->
          <div v-if="igUrl || ytUrl || siteUrl" class="mt-4 flex items-center gap-2">
            <a v-if="igUrl" :href="igUrl" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-9 h-9 rounded-full" style="background:#dc262614; color:#dc2626;" aria-label="Instagram"><Instagram class="w-4 h-4" /></a>
            <a v-if="ytUrl" :href="ytUrl" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-9 h-9 rounded-full" style="background:#dc262614; color:#dc2626;" aria-label="YouTube"><Youtube class="w-4 h-4" /></a>
            <a v-if="siteUrl" :href="siteUrl" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-9 h-9 rounded-full" style="background:#dc262614; color:#dc2626;" aria-label="Website"><Globe class="w-4 h-4" /></a>
          </div>

          <!-- Styles -->
          <div v-if="profile?.danceStyles?.length" class="mt-6">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style="color:#9a5614; font-family: system-ui, sans-serif;">Dances</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="s in profile.danceStyles"
                :key="s"
                class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                style="background:#dc262618; color:#dc2626;"
              >{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Videos (activity) -->
      <div v-if="profile?.videos?.length" class="mt-6">
        <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style="color:#9a5614; font-family: system-ui, sans-serif;">Videos</div>
        <div class="grid grid-cols-2 gap-3">
          <a
            v-for="v in profile.videos"
            :key="v.id"
            :href="v.videoUrl"
            target="_blank"
            rel="noopener"
            class="group block rounded-xl overflow-hidden bg-white border"
            style="border-color:#dc262633;"
          >
            <div class="relative aspect-video bg-black/5">
              <img v-if="v.thumbnailUrl" :src="v.thumbnailUrl" :alt="v.title" class="w-full h-full object-cover">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-white" style="background:rgba(220,38,38,0.85);"><Play class="w-4 h-4" /></div>
              </div>
            </div>
            <div class="p-2.5">
              <div class="text-xs font-bold truncate" style="color:#3b1f0d; font-family: system-ui, sans-serif;">{{ v.title }}</div>
              <div v-if="v.danceStyle" class="text-[10px] mt-0.5" style="color:#9a5614; font-family: system-ui, sans-serif;">{{ v.danceStyle }} · {{ v.citySlug }}</div>
            </div>
          </a>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
