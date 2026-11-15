<script setup lang="ts">
import { sizedImage, IMG } from '#shared/utils/image'
/**
 * SiteTabBar — the phone bottom tab bar plus its "Me" sheet. Used by
 * SiteHeader (dancing: Explore · Cities · My plan · Me), the Business
 * layout (Home · Events · Network · Me) and the Admin layout (Home · Claims ·
 * Users · Me, the other admin sections in the Me sheet — app/lib/admin-nav.ts).
 * The Me sheet is identical on every side except its section links and its
 * mode-switch row (see useAccountNav).
 *
 * Sets `html.has-tabbar`, which reserves `--wd-tabbar-h` at the bottom of the
 * page (tailwind.css) so content and fixed buttons stay above the bar.
 */
import { Compass, MapPin, CalendarDays, User, Home, UserSquare, LogOut, Globe, Contact } from 'lucide-vue-next'
import type { NavMode } from '~/composables/useAccountNav'
import { ADMIN_NAV, adminNavActive, type AdminBadges } from '~/lib/admin-nav'

const props = withDefaults(
  defineProps<{ mode: NavMode, planCount?: number, adminBadges?: AdminBadges }>(),
  { planCount: 0, adminBadges: () => ({}) },
)

const route = useRoute()
const {
  appearsSignedIn, displayName, displayUsername, initial, photo, profileTo,
  accountLinks, switchLinks, handleSignOut,
} = useAccountNav(props.mode)
const meOpen = ref(false)
const showSignIn = ref(false)
const showSignOutConfirm = ref(false)

function under(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}
const EXPLORE_ROOTS = ['/festivals', '/artists', '/find-your-dance']
// Business pages with no room in the tab bar: in the Me sheet instead (RAZ-412).
const adminCount = (badge?: keyof AdminBadges) => (badge && props.adminBadges[badge]) || 0
// Sections with no room in the tab bar, listed at the top of the Me sheet.
const sectionLinks = computed(() => {
  if (props.mode === 'business') {
    return [
      { to: '/business/website', label: 'Website', icon: Globe, badge: 0, active: under('/business/website') },
      { to: '/business/contacts', label: 'Contacts', icon: Contact, badge: 0, active: under('/business/contacts') },
    ]
  }
  if (props.mode === 'admin') {
    return ADMIN_NAV.filter(i => !i.tab).map(i => ({
      to: i.to, label: i.label, icon: i.icon, badge: adminCount(i.badge), active: adminNavActive(i, route.path),
    }))
  }
  return []
})
// The Me tab carries a dot while a section in its sheet waits on something (pending videos).
const meDot = computed(() => sectionLinks.value.some(l => l.badge > 0))

const tabs = computed(() => props.mode === 'dance'
  ? [
      { to: '/festivals', label: 'Explore', icon: Compass, active: route.path === '/' || EXPLORE_ROOTS.some(under) },
      { to: '/cities', label: 'Cities', icon: MapPin, active: under('/cities') },
      { to: '/my-plan', label: 'My plan', icon: CalendarDays, active: under('/my-plan') || under('/my-year'), badge: props.planCount },
    ]
  : props.mode === 'admin'
    ? ADMIN_NAV.filter(i => i.tab).map(i => ({
        to: i.to, label: i.short ?? i.label, icon: i.icon, active: adminNavActive(i, route.path), badge: adminCount(i.badge),
      }))
  : [
      { to: '/business', label: 'Home', icon: Home, active: route.path === '/business' },
      { to: '/business/events', label: 'Events', icon: CalendarDays, active: under('/business/events') },
      { to: '/business/network', label: 'Network', icon: UserSquare, active: ['/business/network', '/business/claim', '/business/new'].some(under) },
    ])

const meActive = computed(() => appearsSignedIn.value && (meOpen.value
  || (props.mode === 'dance' && (under('/settings') || (!!displayUsername.value && under(`/u/${displayUsername.value}`))))
  // On Admin the sheet holds most sections: light the tab when one of them is open.
  || (props.mode === 'admin' && sectionLinks.value.some(l => l.active))))

watch(() => route.fullPath, () => { meOpen.value = false })
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') meOpen.value = false
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

useHead({ htmlAttrs: { class: 'has-tabbar' } })

function onMeTab() {
  if (!appearsSignedIn.value) {
    showSignIn.value = true
    return
  }
  meOpen.value = !meOpen.value
}
function askSignOut() {
  meOpen.value = false
  showSignOutConfirm.value = true
}
</script>

<template>
  <Teleport to="body">
    <!-- "Me" sheet -->
    <div
      v-if="meOpen && appearsSignedIn"
      class="sm:hidden fixed inset-0 z-[44] bg-black/30 flex items-end"
      @click.self="meOpen = false"
    >
      <div class="w-full max-h-[90dvh] overflow-y-auto bg-card rounded-t-3xl pt-3 px-5 shadow-2xl pb-[calc(1rem+var(--wd-tabbar-h,0px))]">
        <div class="mx-auto w-10 h-1 rounded-full bg-border mb-4" />
        <NuxtLink :to="profileTo" class="flex items-center gap-3 mb-3">
          <img v-if="photo" :src="sizedImage(photo, IMG.avatar)" alt="" class="w-11 h-11 rounded-full object-cover">
          <span v-else class="w-11 h-11 rounded-full bg-primary/15 text-primary grid place-items-center font-bold">{{ initial }}</span>
          <span>
            <span class="block font-display font-bold text-lg leading-tight">{{ displayName }}</span>
            <span v-if="displayUsername" class="block text-xs text-muted-foreground">@{{ displayUsername }}</span>
          </span>
        </NuxtLink>
        <NuxtLink
          v-for="l in sectionLinks"
          :key="l.to"
          :to="l.to"
          :aria-current="l.active ? 'page' : undefined"
          class="flex items-center gap-3 py-3 border-b border-border/60"
          :class="l.active ? 'text-primary font-bold' : ''"
        >
          <component :is="l.icon" class="w-5 h-5" :class="l.active ? 'text-primary' : 'text-muted-foreground'" />{{ l.label }}
          <span
            v-if="l.badge"
            class="ml-auto bg-primary text-primary-foreground text-[11px] font-bold min-w-5 h-5 rounded-full grid place-items-center px-1.5"
          >{{ l.badge }}</span>
        </NuxtLink>
        <NuxtLink
          v-for="l in accountLinks"
          :key="l.label"
          :to="l.to"
          class="flex items-center gap-3 py-3 border-b border-border/60"
        ><component :is="l.icon" class="w-5 h-5 text-muted-foreground" />{{ l.label }}</NuxtLink>
        <NuxtLink v-for="l in switchLinks" :key="l.to" :to="l.to" class="flex items-center gap-3 py-3 border-b border-border/60">
          <component :is="l.icon" class="w-5 h-5 text-primary" />
          <span>{{ l.label }}<span class="block text-xs text-muted-foreground">{{ l.hint }}</span></span>
        </NuxtLink>
        <button type="button" class="w-full flex items-center gap-3 py-3 text-muted-foreground text-left" @click="askSignOut">
          <LogOut class="w-5 h-5" />Sign out
        </button>
      </div>
    </div>

    <!-- Bottom tab bar -->
    <nav
      class="sm:hidden fixed bottom-0 inset-x-0 z-[45] border-t border-border bg-card/95 backdrop-blur grid grid-cols-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      aria-label="Tabs"
    >
      <NuxtLink
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="relative flex flex-col items-center gap-0.5 text-[11px] font-semibold"
        :class="t.active ? 'text-primary' : 'text-muted-foreground'"
      >
        <component :is="t.icon" class="w-6 h-6" :stroke-width="t.active ? 2.4 : 1.8" />{{ t.label }}
        <span
          v-if="'badge' in t && t.badge && appearsSignedIn"
          class="absolute top-0 left-1/2 ml-2 bg-primary text-primary-foreground text-[10px] font-bold min-w-4 h-4 rounded-full grid place-items-center px-1"
        >{{ t.badge }}</span>
      </NuxtLink>
      <button
        type="button"
        class="flex flex-col items-center gap-0.5 text-[11px] font-semibold"
        :class="meActive ? 'text-primary' : 'text-muted-foreground'"
        @click="onMeTab"
      >
        <span class="relative">
          <User class="w-6 h-6" :stroke-width="meActive ? 2.4 : 1.8" />
          <span v-if="meDot && appearsSignedIn" class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" aria-hidden="true" />
        </span>{{ appearsSignedIn ? 'Me' : 'Sign in' }}
      </button>
    </nav>
  </Teleport>

  <SignUpModal v-model:open="showSignIn" action="signin" />
  <SignOutConfirmDialog v-model:open="showSignOutConfirm" @confirm="handleSignOut" />
</template>
