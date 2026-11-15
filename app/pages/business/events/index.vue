<script setup lang="ts">
/**
 * /business/events — events run by the profiles I manage (sidebar switcher filters).
 * Tabs: Upcoming and Past (published), Drafts (not published yet, any date),
 * Archived (Restore brings one back as a draft). Each row says what it still needs.
 * Upcoming and Past also list events run by others that my pages take part in
 * (at my venue, my organizer page, my artist in the line-up), with my role.
 * Upcoming: tick events (or "Select today's") and cancel them at once (RAZ-948):
 * they stay listed as "Cancelled" and everyone who signed up is emailed.
 */
import { Plus, ExternalLink, ArchiveRestore } from 'lucide-vue-next'
import { eventLocalDate, eventLocalTime, eventLocalWeekday } from '#shared/utils/eventTime'
import { eventPath } from '#shared/utils/eventSlug'

definePageMeta({ layout: 'business' })
useHead({ title: 'Events | Business | WeDance' })

const { $trpc } = useNuxtApp()
const businessProfile = useBusinessProfile()
type Lists = Awaited<ReturnType<typeof $trpc.businessEvents.list.query>>
const data = ref<Lists | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
type Tab = 'upcoming' | 'drafts' | 'past' | 'archived'
const TABS: { key: Tab; label: string }[] = [{ key: 'upcoming', label: 'Upcoming' }, { key: 'drafts', label: 'Drafts' }, { key: 'past', label: 'Past' }, { key: 'archived', label: 'Archived' }]
const tab = ref<Tab>('upcoming')
const restoring = ref<string | null>(null)
async function restore(e: { id: string; name: string | null }) {
  restoring.value = e.id
  try {
    await $trpc.businessEvents.restore.mutate({ id: e.id })
    await load()
    tab.value = 'drafts'
  } catch (err: any) { error.value = err?.message || 'Could not restore it.' } finally { restoring.value = null }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await $trpc.businessEvents.list.query(businessProfile.value ? { profile: businessProfile.value } : undefined)
  } catch (e: any) {
    error.value = e?.message || 'Could not load events.'
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(businessProfile, load)

const rows = computed(() => data.value?.[tab.value] ?? [])

// Cancel several at once (the Tanzverbot case: three parties tonight).
const selected = ref<string[]>([])
watch([tab, businessProfile], () => { selected.value = [] })
const canCancel = (e: any) => tab.value === 'upcoming' && e.canEdit && e.published && !e.cancelledAt
const isToday = (e: any) => eventLocalDate(e.startDate, tz(e)) === eventLocalDate(new Date(), tz(e))
const todays = computed(() => rows.value.filter((e: any) => canCancel(e) && isToday(e)).map((e: any) => e.id as string))
function toggle(id: string, on: boolean) {
  selected.value = on ? [...new Set([...selected.value, id])] : selected.value.filter(x => x !== id)
}
const cancelNotice = ref<string | null>(null)
async function onCancelled(r: { notified: number; count: number }) {
  selected.value = []
  await load()
  cancelNotice.value = `${r.count} ${r.count === 1 ? 'event' : 'events'} cancelled.${r.notified ? ` We’re emailing the ${r.notified} ${r.notified === 1 ? 'person' : 'people'} who signed up.` : ''}`
}
const tz = (e: { timezone: string | null }) => e.timezone || 'Europe/Berlin'
function when(e: any) {
  const d = eventLocalDate(e.startDate, tz(e))
  return `${eventLocalWeekday(e.startDate, tz(e)).slice(0, 3)} ${Number(d.slice(8))}.${Number(d.slice(5, 7))}.${d.slice(0, 4)}`
}
</script>

<template>
  <div>
    <AdminPageHeader eyebrow="Business" title="Events" description="Events your profiles run. Times are local to each event’s city.">
      <Button variant="pill" size="pill-sm" as-child>
        <NuxtLink to="/business/events/new"><Plus /> New event</NuxtLink>
      </Button>
    </AdminPageHeader>

    <div class="mt-6 flex flex-wrap gap-1" role="tablist" aria-label="Which events">
      <Button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="tab === t.key"
        size="sm"
        :variant="tab === t.key ? 'soft' : 'ghost'"
        @click="tab = t.key"
      >
        {{ t.label }}<span v-if="data" class="ml-1 text-muted-foreground">{{ data[t.key].length }}</span>
      </Button>
    </div>

    <div v-if="tab === 'upcoming' && (todays.length || selected.length)" class="mt-4 flex flex-wrap items-start gap-3 rounded-2xl border bg-card p-4" data-testid="cancel-bar">
      <p class="min-w-0 flex-1 text-sm text-muted-foreground">
        <template v-if="selected.length">{{ selected.length }} selected.</template>
        <template v-else>Something came up? Tick the events to cancel, or pick today’s.</template>
      </p>
      <Button v-if="todays.length && selected.length !== todays.length" type="button" variant="outline-pill" size="pill-sm" @click="selected = [...todays]">Select today’s ({{ todays.length }})</Button>
      <Button v-if="selected.length" type="button" variant="ghost" size="sm" @click="selected = []">Clear</Button>
      <BusinessCancelEvents v-if="selected.length" :key="selected.join(',')" :ids="selected" id-prefix="list-cancel" :label="`Cancel ${selected.length} selected`" class="basis-full" @cancelled="onCancelled" />
    </div>
    <p v-if="cancelNotice" role="status" class="mt-4 rounded-xl bg-success/10 px-3 py-2 text-sm font-bold text-wd-green-700">{{ cancelNotice }}</p>

    <AdminState v-if="error" kind="error" :message="error" />
    <AdminState v-if="loading" kind="loading" />
    <AdminState
      v-else-if="!rows.length"
      kind="empty"
      :message="{ upcoming: 'No upcoming events.', drafts: 'No drafts.', past: 'No past events yet.', archived: 'Nothing archived.' }[tab]"
      :hint="tab === 'upcoming' ? 'Add your next party, class or festival with “New event”.' : tab === 'drafts' ? 'Events you haven’t published yet show here.' : undefined"
    />

    <div v-else class="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
      <div v-for="e in rows" :key="e.id" class="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <Checkbox v-if="canCancel(e)" :model-value="selected.includes(e.id)" :aria-label="`Select ${e.name} to cancel`" @update:model-value="(on: boolean) => toggle(e.id, on)" />
        <div class="w-24 shrink-0">
          <p class="text-xs font-bold uppercase tracking-wider text-secondary">{{ when(e) }}</p>
          <p class="text-sm font-bold">{{ eventLocalTime(e.startDate, tz(e)) }}</p>
        </div>
        <NuxtLink :to="e.to" class="flex-1 min-w-0 group">
          <p class="truncate text-sm font-bold group-hover:underline" :class="e.cancelledAt && 'line-through text-muted-foreground'">{{ e.name }}</p>
          <p class="truncate text-xs text-muted-foreground">
            {{ e.host?.name || e.by }}<template v-if="e.venueName && e.venueName !== e.by"> · {{ e.venueName }}</template><template v-if="e.city"> · {{ e.city }}</template>
          </p>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <AdminStatus v-if="e.cancelledAt" tone="danger" :title="e.cancelReason || undefined">Cancelled</AdminStatus>
            <AdminStatus v-if="e.role === 'lineup'" tone="info">You’re in the line-up</AdminStatus>
            <AdminStatus v-else-if="e.role === 'coorganizer'" tone="info">You co-organise it</AdminStatus>
            <AdminStatus v-else-if="e.role === 'venue'" tone="info">At your venue</AdminStatus>
            <AdminStatus v-else-if="e.role === 'organizer'" tone="info">You organize it</AdminStatus>
            <AdminStatus v-if="e.role !== 'host'" tone="neutral">{{ e.canEdit ? 'From wedance.vip · you can edit it' : 'Run by someone else' }}</AdminStatus>
            <AdminStatus v-else-if="tab === 'archived'" tone="neutral">Archived</AdminStatus>
            <AdminStatus v-else-if="!e.published" tone="warning">Draft</AdminStatus>
            <AdminStatus v-else-if="e.missing.length" tone="warning" :title="e.missing.join(', ')">{{ e.missing.length }} to add</AdminStatus>
            <AdminStatus v-else tone="success">Ready</AdminStatus>
            <AdminStatus v-if="e.seriesId">Weekly</AdminStatus>
          </div>
        </NuxtLink>
        <Button v-if="tab === 'archived'" type="button" variant="outline-pill" size="pill-sm" :loading="restoring === e.id" @click="restore(e)"><ArchiveRestore /> Restore</Button>
        <Button v-else-if="e.published" variant="ghost" size="icon-sm" as-child>
          <NuxtLink :to="eventPath(e)" target="_blank" :aria-label="`Open ${e.name} as dancers see it`"><ExternalLink /></NuxtLink>
        </Button>
      </div>
    </div>
  </div>
</template>
