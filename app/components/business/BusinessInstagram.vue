<script setup lang="ts">
/**
 * Connect Instagram (#501): the page's Instagram professional account, through
 * WeDance's official Meta app. Connected, the event content plan can publish
 * its posts there — one click per post, never on its own. Owners connect and
 * disconnect; editors see which account it is.
 *
 *   <BusinessInstagram :username="loaded.username" />
 *
 * Meta's redirect lands back here with ?instagram=connected|<reason>.
 */
import { Instagram, Check, AlertTriangle } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'

const props = defineProps({ username: { type: String, required: true } })

const { $trpc } = useNuxtApp()
const { track } = useTrack()
const route = useRoute()
type Status = Awaited<ReturnType<typeof $trpc.instagram.status.query>>
const status = ref<Status | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Instagram connected. Your content plan can post there now.' },
  cancelled: { ok: false, text: 'Instagram wasn’t connected: the window was closed or access wasn’t given.' },
  no_account: { ok: false, text: 'No Instagram account came back. In the Meta window, pick your Instagram professional (Business or Creator) account and allow access.' },
  several_accounts: { ok: false, text: 'You gave access to several Instagram accounts and none matches this page’s Instagram link. Connect again and pick only this page’s account, or fix the link below.' },
  taken: { ok: false, text: 'That Instagram account is already connected to another WeDance page. Disconnect it there first.' },
  not_owner: { ok: false, text: 'Only the page’s owners can connect Instagram.' },
  expired: { ok: false, text: 'That took too long. Try connecting again.' },
  failed: { ok: false, text: 'Instagram didn’t connect. Try again in a moment.' },
}
const result = computed(() => RESULT[String(route.query.instagram ?? '')] ?? null)

async function load() {
  try {
    status.value = await $trpc.instagram.status.query({ username: props.username })
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t load Instagram.'
  }
}
onMounted(load)

async function connect() {
  busy.value = true
  error.value = null
  try {
    const { url } = await $trpc.instagram.connectUrl.mutate({ username: props.username })
    track('instagram_connect_started', { profile: props.username, reconnect: !!status.value?.connection })
    window.location.href = url
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t start connecting.'
    busy.value = false
  }
}

async function disconnect() {
  if (!confirm('Disconnect Instagram? WeDance stops being able to post for this page.')) return
  busy.value = true
  try {
    await $trpc.instagram.disconnect.mutate({ username: props.username })
    await load()
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t disconnect.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border bg-card p-5 shadow-wd-card">
    <h2 class="flex items-center gap-1.5 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary"><Instagram class="size-4" aria-hidden="true" /> Instagram</h2>
    <p v-if="result" class="mt-3 flex items-start gap-1.5 text-sm" :class="result.ok ? 'text-wd-green-700' : 'text-wd-amber-600'" role="status">
      <Check v-if="result.ok" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <AlertTriangle v-else class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {{ result.text }}
    </p>
    <AdminState v-if="error" kind="error" :message="error" class="mt-3" />
    <AdminState v-if="!status && !error" kind="loading" class="mt-3" />

    <template v-else-if="status?.connection">
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <img v-if="status.connection.picture" :src="sizedImage(status.connection.picture, IMG.avatar)" alt="" class="size-10 rounded-full border object-cover">
        <div class="min-w-0 flex-1">
          <p class="font-bold">@{{ status.connection.username }}</p>
          <p class="text-xs text-muted-foreground">Connected. Your event content plans can post here, one post at a time when you click.</p>
        </div>
        <template v-if="status.canManage">
          <Button type="button" variant="outline-pill" size="pill-sm" :loading="busy" @click="connect">Reconnect</Button>
          <Button type="button" variant="ghost" size="sm" :disabled="busy" @click="disconnect">Disconnect</Button>
        </template>
      </div>
      <p v-if="status.connection.lastError" class="mt-3 flex items-start gap-1.5 text-sm text-wd-amber-600">
        <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Instagram stopped accepting posts: {{ status.connection.lastError }} Reconnect to fix it.
      </p>
    </template>

    <template v-else-if="status">
      <p class="mt-1 text-sm text-muted-foreground">
        Post your flyers and their captions straight from your event’s content plan. You need an Instagram professional account (Business or Creator). Meta asks you to log in and pick the account; WeDance never sees your password.
      </p>
      <p v-if="!status.configured" class="mt-3 text-sm text-muted-foreground">Coming soon.</p>
      <Button v-else-if="status.canManage" type="button" variant="pill" class="mt-4" :loading="busy" @click="connect"><Instagram /> Connect Instagram</Button>
      <p v-else class="mt-3 text-sm text-muted-foreground">Ask an owner of this page to connect it.</p>
    </template>
  </section>
</template>
