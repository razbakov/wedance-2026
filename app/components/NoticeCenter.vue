<script setup lang="ts">
/**
 * Header bell + live toasts. Toasts are small and sit at the bottom right.
 * The match itself is the card on /meet. Closing a toast, or letting it age
 * out, leaves the row under the bell until they open it. The bell badge is
 * the only count.
 */
import { Bell, X } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'

const { isSignedIn } = useAuth()
const {
  notices, unacted, openToasts, bellOpen, refresh, dismissToast, act, toggleBell,
} = useNotices()

const root = ref<HTMLElement | null>(null)
const mounted = ref(false)
let poll: ReturnType<typeof setInterval> | undefined

function onDocClick(e: MouseEvent) {
  if (!bellOpen.value) return
  const el = root.value
  if (el && !el.contains(e.target as Node)) bellOpen.value = false
}

watch(isSignedIn, (signed) => { if (signed && mounted.value) refresh() })
onMounted(() => {
  mounted.value = true
  if (isSignedIn.value) refresh()
  document.addEventListener('click', onDocClick)
  poll = setInterval(() => { if (isSignedIn.value) refresh() }, 15000)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  if (poll) clearInterval(poll)
})

function open(id: string, via: 'toast' | 'bell') {
  act(id, via)
}
</script>

<template>
  <!-- Static on phones so the panel anchors to the header bar (SiteHeader's
       relative row) and spans the screen; the bell isn't the rightmost icon
       there, so a bell-anchored panel ran off the left edge. -->
  <div v-if="mounted && isSignedIn" ref="root" class="sm:relative">
    <button
      type="button"
      class="relative inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-expanded="bellOpen"
      aria-haspopup="dialog"
      :aria-label="unacted.length ? `Notifications, ${unacted.length} new` : 'Notifications'"
      data-testid="notice-bell"
      @click.stop="toggleBell"
    >
      <Bell class="size-5" aria-hidden="true" />
      <span
        v-if="unacted.length"
        class="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground"
        data-testid="notice-bell-count"
      >{{ unacted.length }}</span>
    </button>

    <div
      v-if="bellOpen"
      class="absolute inset-x-4 top-full z-50 mt-1 rounded-2xl sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 border bg-card p-2 shadow-wd-card"
      style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
      role="dialog"
      aria-label="Notifications"
      data-testid="notice-history"
    >
      <p class="px-2 py-1 text-xs font-bold uppercase tracking-widest text-secondary">Notifications</p>
      <p v-if="!notices.length" class="px-2 py-4 text-sm text-muted-foreground">Nothing yet.</p>
      <ul v-else class="max-h-80 overflow-y-auto">
        <li v-for="n in notices" :key="n.id">
          <NuxtLink
            :to="n.href"
            class="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted"
            :class="unacted.some(u => u.id === n.id) ? 'bg-primary/5' : ''"
            data-testid="notice-history-item"
            @click="open(n.id, 'bell')"
          >
            <img v-if="n.photo" :src="sizedImage(n.photo, IMG.avatar)" alt="" class="size-10 shrink-0 rounded-full object-cover">
            <span class="min-w-0">
              <span class="block font-bold text-foreground">{{ n.title }}</span>
              <span class="mt-0.5 block text-xs text-muted-foreground">{{ n.action }}</span>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="mounted"
      class="pointer-events-none fixed bottom-24 right-4 z-[70] flex w-72 flex-col items-stretch gap-2 sm:bottom-6"
      data-testid="notice-toasts"
      data-position="bottom-right"
      aria-live="polite"
    >
      <article
        v-for="n in openToasts"
        :key="n.id"
        class="pointer-events-auto rounded-2xl border bg-card p-3 shadow-wd-card"
        style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
        role="status"
        data-testid="notice-toast"
      >
        <div class="flex items-start gap-2">
          <img v-if="n.photo" :src="sizedImage(n.photo, IMG.avatar)" alt="" class="size-8 shrink-0 rounded-full object-cover">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold leading-snug">{{ n.title }}</p>
            <NuxtLink
              :to="n.href"
              class="mt-1 inline-flex text-xs font-bold text-primary hover:underline"
              data-testid="notice-toast-action"
              @click="open(n.id, 'toast')"
            >{{ n.action }}</NuxtLink>
          </div>
          <button
            type="button"
            class="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Dismiss notification"
            data-testid="notice-toast-dismiss"
            @click="dismissToast(n.id)"
          >
            <X class="size-4" aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
  </Teleport>
</template>
