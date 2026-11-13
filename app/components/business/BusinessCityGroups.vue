<script setup lang="ts">
/**
 * The city's local groups for its admins (city channels, migration 0067): groups dancers
 * shared, waiting for review (approve / decline), and the listed ones — with the result
 * of the last invite-link check. "Check links" visits WhatsApp / Telegram invite pages;
 * a dead link is hidden from the city page until it comes back or is shown again.
 *
 *   <BusinessCityGroups city-slug="munich" />
 */
import { Check, X, ExternalLink, Link2, Eye, EyeOff, BadgeCheck } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string }>()
const { $trpc } = useNuxtApp()

type Pending = Awaited<ReturnType<typeof $trpc.communityGroup.pending.query>>
type Listed = Awaited<ReturnType<typeof $trpc.communityGroup.forCity.query>>
const pending = ref<Pending>([])
const listed = ref<Listed>([])
const loading = ref(true)
const busy = ref<string | null>(null)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const filter = ref<'all' | 'dead' | 'hidden'>('all')

async function load() {
  try {
    const [p, l] = await Promise.all([
      $trpc.communityGroup.pending.query({ citySlug: props.citySlug }),
      $trpc.communityGroup.forCity.query({ citySlug: props.citySlug }),
    ])
    pending.value = p
    listed.value = l
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t load the groups.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function run(key: string, fn: () => Promise<unknown>) {
  busy.value = key
  error.value = null
  notice.value = null
  try { await fn(); await load() }
  catch (e: any) { error.value = e?.message || 'That didn’t work.' }
  finally { busy.value = null }
}

const review = (id: string, approve: boolean) => run(id, () => $trpc.communityGroup.review.mutate({ id, approve, verified: approve ? true : undefined }))
const setVisible = (id: string, visible: boolean) => run(id, () => $trpc.communityGroup.setVisible.mutate({ id, visible }))
const checkLinks = () => run('check', async () => {
  const r = await $trpc.communityGroup.checkLinks.mutate({ citySlug: props.citySlug, limit: 40 })
  notice.value = r.skipped
    ? 'The invite pages looked unusual, so nothing was changed. Try again later.'
    : r.checked ? `Checked ${r.checked}: ${r.ok} working, ${r.dead} dead${r.unknown ? `, ${r.unknown} couldn’t tell` : ''}.` : 'Every link was checked in the last day.'
})

const shown = computed(() => listed.value.filter(g => filter.value === 'all' || (filter.value === 'dead' ? g.linkStatus === 'dead' : g.status === 'hidden')))
const deadCount = computed(() => listed.value.filter(g => g.linkStatus === 'dead').length)
const hiddenCount = computed(() => listed.value.filter(g => g.status === 'hidden').length)
const label: Record<string, string> = { whatsapp: 'WhatsApp', telegram: 'Telegram', facebook: 'Facebook', instagram: 'Instagram', other: 'Group' }
const filterOptions = computed(() => [
  { label: `All (${listed.value.length})`, value: 'all' },
  { label: `Dead links (${deadCount.value})`, value: 'dead' },
  { label: `Hidden (${hiddenCount.value})`, value: 'hidden' },
])
</script>

<template>
  <section class="rounded-2xl border bg-card p-5 shadow-wd-card">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-display text-lg font-bold text-foreground">Local groups</h2>
        <p class="text-sm text-muted-foreground">Groups dancers share for this city. Approve the real ones; they show on the city page with the sharer’s name.</p>
      </div>
      <Button type="button" variant="outline-pill" size="pill-sm" :loading="busy === 'check'" @click="checkLinks"><Link2 /> Check links</Button>
    </div>

    <p v-if="error" class="mt-4 text-sm text-destructive" role="alert">{{ error }}</p>
    <p v-if="notice" class="mt-4 text-sm text-wd-green-700" role="status">{{ notice }}</p>
    <AdminState v-if="loading" kind="loading" />

    <template v-else>
      <h3 class="mt-5 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Waiting for review ({{ pending.length }})</h3>
      <p v-if="!pending.length" class="mt-2 text-sm text-muted-foreground">Nothing waiting.</p>
      <ul class="mt-2 grid gap-2">
        <li v-for="g in pending" :key="g.id" class="rounded-xl border p-3">
          <div class="flex flex-wrap items-center gap-2">
            <AdminStatus tone="info">{{ label[g.platform] ?? g.platform }}</AdminStatus>
            <span class="text-sm font-bold">{{ g.name }}</span>
            <AdminStatus v-if="g.linkStatus === 'dead'" tone="danger">dead link</AdminStatus>
            <span class="ml-auto flex gap-1">
              <Button type="button" variant="pill" size="pill-sm" :disabled="busy === g.id" @click="review(g.id, true)"><Check /> Approve</Button>
              <Button type="button" variant="outline-pill" size="pill-sm" :disabled="busy === g.id" @click="review(g.id, false)"><X /> Decline</Button>
            </span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            <span v-if="g.styles?.length">{{ g.styles.join(', ') }} · </span>
            <span v-if="g.description">{{ g.description }} · </span>
            shared by {{ g.submittedBy ?? 'someone' }}
          </p>
          <a :href="g.inviteUrl" target="_blank" rel="noopener" class="mt-1 inline-flex items-center gap-1 text-xs font-bold text-wd-cyan-700 hover:underline">Open the invite <ExternalLink class="size-3" aria-hidden="true" /></a>
        </li>
      </ul>

      <div class="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Listed</h3>
        <Field id="city-groups-filter" label="Show" hide-label class="w-48">
          <Select v-model="filter" :options="filterOptions" size="sm" />
        </Field>
      </div>
      <p v-if="!shown.length" class="mt-2 text-sm text-muted-foreground">No groups here.</p>
      <ul class="mt-2 grid gap-1">
        <li v-for="g in shown" :key="g.id" class="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
          <span class="text-xs text-muted-foreground w-16">{{ label[g.platform] ?? g.platform }}</span>
          <a :href="g.inviteUrl" target="_blank" rel="noopener" class="text-sm font-bold hover:underline">{{ g.name }}</a>
          <BadgeCheck v-if="g.verified" class="size-3.5 text-success" aria-label="Verified" />
          <AdminStatus v-if="g.linkStatus === 'dead'" tone="danger">dead link</AdminStatus>
          <AdminStatus v-else-if="g.linkStatus === 'ok'" tone="success">link ok</AdminStatus>
          <AdminStatus v-if="g.status === 'hidden'" tone="warning">hidden{{ g.reportCount ? ` · ${g.reportCount} reports` : '' }}</AdminStatus>
          <span v-if="g.submittedBy" class="text-xs text-muted-foreground">by {{ g.submittedBy }}</span>
          <span class="ml-auto">
            <Button v-if="g.status === 'hidden' || g.linkStatus === 'dead'" type="button" variant="ghost" size="sm" class="h-7 text-xs" :disabled="busy === g.id" @click="setVisible(g.id, true)"><Eye /> Show again</Button>
            <Button v-else type="button" variant="ghost" size="sm" class="h-7 text-xs" :disabled="busy === g.id" @click="setVisible(g.id, false)"><EyeOff /> Hide</Button>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>
