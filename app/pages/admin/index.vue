<script setup lang="ts">
/**
 * /admin — the admin hub. Wrapped by the `admin` layout (sidebar + is_admin
 * gate). Cards link to each area; the video card shows the live pending count.
 */
import { Video, UtensilsCrossed, Gift, Users, ArrowRight } from 'lucide-vue-next'
import { WD } from '~/lib/brand'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin | WeDance' })

const { $trpc } = useNuxtApp()

const pendingVideos = ref<number | null>(null)
onMounted(async () => {
  try {
    const rows = await $trpc.cityVideo.pendingList.query({})
    pendingVideos.value = rows.length
  } catch {
    pendingVideos.value = null
  }
})

const sections = computed(() => [
  { to: '/admin/videos', icon: Video, title: 'Video moderation', blurb: 'Approve or reject city-competition submissions.', badge: pendingVideos.value ? `${pendingVideos.value} pending` : null, accent: WD.red600 },
  { to: '/admin/giveaways', icon: Gift, title: 'Giveaways', blurb: 'Create and manage sponsor giveaways per city.', badge: null, accent: WD.purple500 },
  { to: '/admin/community-groups', icon: Users, title: 'Community groups', blurb: 'WhatsApp / Telegram groups shown on city pages.', badge: null, accent: WD.cyan600 },
  { to: '/admin/festivals', icon: UtensilsCrossed, title: 'Festival dinners', blurb: 'Assign dinner groups and reveal restaurants.', badge: null, accent: WD.green600 },
])
</script>

<template>
  <div>
    <div class="text-xs uppercase tracking-[0.3em]" style="color:var(--wd-amber-600);">Admin</div>
    <h1 class="mt-2 text-3xl sm:text-4xl leading-tight" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">
      Control <em class="italic" style="color:var(--wd-red-600);">room</em>
    </h1>

    <div class="mt-8 grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="group block rounded-2xl bg-white border p-5 transition-all hover:-translate-y-1"
        :style="{ borderColor: s.accent + '33', boxShadow: '0 1px 0 ' + s.accent + '14' }"
      >
        <div class="flex items-start gap-4">
          <div class="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" :style="{ background: s.accent + '18', color: s.accent }">
            <component :is="s.icon" class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold leading-tight" style="color:var(--wd-brown-900);">{{ s.title }}</h2>
              <span v-if="s.badge" class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" :style="{ background: s.accent, color: '#fff' }">{{ s.badge }}</span>
            </div>
            <p class="mt-1 text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">{{ s.blurb }}</p>
          </div>
          <ArrowRight class="w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-1" :style="{ color: s.accent }" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
