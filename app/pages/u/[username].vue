<script setup lang="ts">
/**
 * /u/<username> — public dancer profile.
 *
 * Identity card built from the onboarding fields (name, city, styles, role) +
 * optional photo. This is the shareable face of a dancer and the thing the
 * "friends going" social proof on my-year links to. 2026 tropical style.
 */
import { MapPin, Pencil, ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { username: myUsername } = useAuth()

const username = computed(() => String(route.params.username))

const { data: profile, error } = await useAsyncData(
  () => `profile-${username.value}`,
  () => $trpc.profile.getByUsername.query({ username: username.value }),
)

const notFound = computed(() => !!error.value || !profile.value)
const isMe = computed(() => !!myUsername.value && myUsername.value === username.value)

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

    <!-- Not found -->
    <section v-if="notFound" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl" style="color:#3b1f0d;">No dancer here</h1>
      <p class="mt-4 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        We couldn't find a dancer at <span class="font-bold">@{{ username }}</span>.
      </p>
      <NuxtLink to="/cities" class="inline-flex items-center gap-2 mt-6 text-sm font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">
        <ArrowLeft class="w-4 h-4" /> Browse cities
      </NuxtLink>
    </section>

    <!-- Profile -->
    <section v-else class="max-w-xl mx-auto px-4 pt-12 pb-16">
      <div
        class="rounded-2xl overflow-hidden bg-white border"
        style="border-color:#dc262633; box-shadow: 0 1px 0 #dc262622, 0 10px 28px rgba(59,31,18,0.06);"
      >
        <div class="h-2" style="background:linear-gradient(135deg, #dc2626, #f97316);" />
        <div class="p-6 sm:p-8">
          <div class="flex items-start gap-5">
            <!-- Avatar: photo, else initials -->
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
              v-if="isMe"
              to="/settings"
              class="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style="background:#dc262614; color:#dc2626; font-family: system-ui, sans-serif;"
            >
              <Pencil class="w-3 h-3" /> Edit
            </NuxtLink>
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
          <p v-else class="mt-6 text-sm italic" style="color:#9a5614;">No dances listed yet.</p>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
