<script setup lang="ts">
/**
 * Admin layout — persistent sidebar + centralized is_admin gate for every
 * /admin/* page. Pages just render their content into the slot; nav, gating,
 * and the sign-in affordance all live here. The server adminProcedure is the
 * real security boundary; this gate is UX.
 */
import {
  LayoutDashboard, Video, Gift, Users, UtensilsCrossed,
  Loader2, ShieldAlert, ArrowLeft,
} from 'lucide-vue-next'

const route = useRoute()
const { $trpc } = useNuxtApp()

const state = ref<'checking' | 'ok' | 'denied'>('checking')
const showSignIn = ref(false)
const pendingVideos = ref<number | null>(null)

async function check() {
  try {
    const me = await $trpc.auth.me.query()
    state.value = me?.isAdmin ? 'ok' : 'denied'
    if (state.value === 'ok') loadBadges()
  } catch {
    state.value = 'denied'
  }
}
async function loadBadges() {
  try {
    const rows = await $trpc.cityVideo.pendingList.query({})
    pendingVideos.value = rows.length
  } catch {
    pendingVideos.value = null
  }
}

onMounted(check)
watch(showSignIn, (open) => { if (!open) check() })

const nav = computed(() => [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, badge: null as number | null },
  { to: '/admin/videos', label: 'Videos', icon: Video, exact: false, badge: pendingVideos.value || null },
  { to: '/admin/giveaways', label: 'Giveaways', icon: Gift, exact: false, badge: null },
  { to: '/admin/community-groups', label: 'Community', icon: Users, exact: false, badge: null },
  { to: '/admin/festivals', label: 'Festivals', icon: UtensilsCrossed, exact: false, badge: null },
])

const isActive = (item: { to: string; exact: boolean }) =>
  item.exact ? route.path === item.to : route.path.startsWith(item.to)
</script>

<template>
  <div class="min-h-screen md:flex" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- Sidebar (desktop) / top bar (mobile) -->
    <aside
      class="md:w-60 md:min-h-screen md:border-r border-b md:border-b-0 shrink-0 md:sticky md:top-0 md:h-screen flex md:flex-col"
      style="border-color:#3b1f0d22; background:rgba(255,255,255,0.55);"
    >
      <div class="px-4 py-4 md:py-6 flex md:block items-center justify-between w-full">
        <NuxtLink to="/" class="inline-flex items-center gap-2">
          <Brand />
        </NuxtLink>
        <div class="hidden md:block mt-6 text-[10px] uppercase tracking-[0.3em]" style="color:#9a5614;">Admin</div>
      </div>

      <nav class="flex md:flex-col gap-1 px-2 md:px-3 pb-3 md:pb-0 overflow-x-auto md:overflow-visible">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors"
          :style="isActive(item)
            ? { background: '#dc26261a', color: '#dc2626', fontWeight: 700 }
            : { color: '#5b3a1d' }"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          <span class="italic">{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 text-white"
            style="background:#dc2626; font-family: system-ui, sans-serif;"
          >{{ item.badge }}</span>
        </NuxtLink>
      </nav>

      <NuxtLink
        to="/"
        class="hidden md:flex items-center gap-1.5 mt-auto mx-3 mb-4 text-xs italic hover:underline"
        style="color:#9a5614;"
      >
        <ArrowLeft class="w-3.5 h-3.5" /> Back to site
      </NuxtLink>
    </aside>

    <!-- Content -->
    <main class="flex-1 min-w-0">
      <div class="max-w-4xl mx-auto px-4 py-8">
        <div v-if="state === 'checking'" class="flex items-center gap-2 py-24 justify-center" style="color:#9a5614;">
          <Loader2 class="w-5 h-5 animate-spin" />
          <span class="text-sm italic">Checking access…</span>
        </div>

        <div
          v-else-if="state === 'denied'"
          class="max-w-md mx-auto mt-16 rounded-2xl border-2 border-dashed p-10 text-center"
          style="border-color:#3b1f0d33; background:rgba(255,255,255,0.6);"
        >
          <ShieldAlert class="w-7 h-7 mx-auto mb-3" style="color:#dc2626;" />
          <p class="text-base font-bold" style="color:#3b1f0d;">Admin access required</p>
          <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Sign in with an admin account to view this page.
          </p>
          <button
            type="button"
            class="inline-flex items-center gap-2 mt-5 rounded-full px-5 py-2.5 text-white text-xs font-bold uppercase tracking-wider"
            style="background:linear-gradient(135deg,#dc2626,#f97316);"
            @click="showSignIn = true"
          >
            Sign in
          </button>
          <SignUpModal v-model:open="showSignIn" action="signin" />
        </div>

        <slot v-else />
      </div>
    </main>
  </div>
</template>
