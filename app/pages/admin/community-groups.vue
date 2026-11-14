<script setup lang="ts">
/**
 * /admin/community-groups — every community chat group, the result of the invite-link
 * check, and new groups (RAZ-862). "Check links" lives here, next to the list it changes:
 * dead links get their own state ("Dead links" = hidden from the city page by the check),
 * each card says when its link was last checked, and "Show again" undoes a wrong call.
 * Filters (search, city, platform, style, state) stay in the URL, so Admin → Cities links
 * straight to a city's dead links. `admin` layout provides the sidebar + is_admin gate.
 * Data via communityGroup.listAll / create / checkLinks / review / setVisible.
 */
import { Plus, ExternalLink, RotateCcw, CheckCircle2, Link2, Search, Eye, EyeOff, Check, X } from 'lucide-vue-next'
import type { CityOption } from '#shared/utils/citySearch'
import { titleFromSlug } from '#shared/utils/citySearch'
import { CommunityGroupSchema } from '#shared/validation'
import {
  GROUP_STATES, GROUP_STATE_LABEL, checkedAgo, groupByCity, groupState, isCheckable, lastLinkCheck, linksDue, stateCounts,
  type GroupFilters, type GroupState,
} from '#shared/utils/communityGroupAdmin'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin: Community groups | WeDance' })

const { $trpc } = useNuxtApp()
const route = useRoute()
const router = useRouter()

type Group = {
  id: string
  citySlug: string
  name: string
  platform: 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | 'other'
  inviteUrl: string
  styles: string[]
  source: string | null
  verified: boolean | null
  status: 'visible' | 'hidden' | 'pending' | 'rejected'
  kind: 'community' | 'official'
  linkStatus: 'unknown' | 'ok' | 'dead'
  linkCheckedAt: string | Date | null
  reportCount: number | null
  createdAt: string | Date | null
}

const items = ref<Group[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const busy = ref<string | null>(null)

async function load() {
  error.value = null
  try {
    items.value = (await $trpc.communityGroup.listAll.query({})) as Group[]
  } catch (e: any) {
    error.value = e?.message || 'Failed to load community groups.'
  } finally {
    loading.value = false
  }
}

// City names for the slugs (the same list <CityCombobox> uses).
const cityOptions = useCityOptions()
onMounted(() => { load(); cityOptions.load() })
const nameOf = (slug: string) => cityOptions.options.value.find(o => o.slug === slug)?.name ?? titleFromSlug(slug)

async function run(key: string, fn: () => Promise<string | void>) {
  busy.value = key
  error.value = null
  notice.value = null
  try { const msg = await fn(); if (msg) notice.value = msg; await load() }
  catch (e: any) { error.value = e?.message || 'That didn’t work.' }
  finally { busy.value = null }
}

// ── Filters (in the URL) ────────────────────────────────────────────────────
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const filters = reactive<Required<GroupFilters>>({
  q: str(route.query.q),
  city: str(route.query.city),
  platform: str(route.query.platform),
  style: str(route.query.style),
  state: (GROUP_STATES as readonly string[]).includes(str(route.query.state)) ? str(route.query.state) as GroupState : '',
})
watch(filters, (f) => {
  const query = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
  router.replace({ query })
})

// City filter: the city combobox, limited to cities that have groups.
const cityCounts = computed(() => {
  const m = new Map<string, number>()
  for (const g of items.value) m.set(g.citySlug, (m.get(g.citySlug) ?? 0) + 1)
  return m
})
const groupCities = computed<CityOption[]>(() => [...cityCounts.value.entries()].map(([slug, n]) => {
  const known = cityOptions.options.value.find(o => o.slug === slug)
  return { ...(known ?? { name: titleFromSlug(slug), slug, country: null, altNames: [] }), communities: n } as CityOption
}))
const cityText = ref(filters.city ? nameOf(filters.city) : '')
watch(() => cityOptions.options.value, () => { if (filters.city) cityText.value = nameOf(filters.city) })
watch(cityText, (v) => { if (!v) filters.city = '' })
function onCityPick(c: CityOption) { filters.city = c.slug }

const allStyles = computed(() => [...new Set(items.value.flatMap(g => g.styles ?? []))])
const platformFilterOptions = [
  { label: 'All platforms', value: '' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Other', value: 'other' },
]
const counts = computed(() => stateCounts(items.value, filters))
const sections = computed(() => groupByCity(items.value, filters, nameOf))
const shownCount = computed(() => sections.value.reduce((n, s) => n + s.groups.length, 0))
const anyFilter = computed(() => Object.values(filters).some(Boolean))
function clearFilters() {
  Object.assign(filters, { q: '', city: '', platform: '', style: '', state: '' })
  cityText.value = ''
}

// ── Link check ──────────────────────────────────────────────────────────────
const scope = computed(() => (filters.city ? items.value.filter(g => g.citySlug === filters.city) : items.value))
const lastCheck = computed(() => lastLinkCheck(scope.value))
const due = computed(() => linksDue(scope.value))
const checkLinks = () => run('check', async () => {
  const r = await $trpc.communityGroup.checkLinks.mutate({ citySlug: filters.city || undefined, limit: 40 })
  if (r.skipped) return 'The invite pages looked unusual, so nothing changed. Try again later.'
  if (!r.checked) return 'Every link was checked in the last day.'
  if (r.dead) filters.state = 'dead'
  return `Checked ${r.checked} links: ${r.ok} working, ${r.dead} dead${r.unknown ? `, ${r.unknown} unclear` : ''}.${r.dead ? ' Showing the dead ones.' : ''}`
})

const review = (g: Group, approve: boolean) => run(g.id, async () => {
  await $trpc.communityGroup.review.mutate({ id: g.id, approve, verified: approve ? true : undefined })
  return approve ? `“${g.name}” is listed.` : `“${g.name}” was declined.`
})
const setVisible = (g: Group, visible: boolean) => run(g.id, async () => {
  await $trpc.communityGroup.setVisible.mutate({ id: g.id, visible })
  return visible ? `“${g.name}” is back on the city page.` : `“${g.name}” is hidden.`
})

function linkLine(g: Group): string {
  if (!isCheckable(g)) return 'Link not checked (only WhatsApp and Telegram are)'
  if (!g.linkCheckedAt) return 'Link not checked yet'
  const what = g.linkStatus === 'dead' ? 'Link dead' : g.linkStatus === 'ok' ? 'Link working' : 'Link unclear'
  return `${what} · checked ${checkedAgo(g.linkCheckedAt)}`
}

// ── New group ───────────────────────────────────────────────────────────────
const showForm = ref(false)
const saving = ref(false)
const form = reactive({
  citySlug: '', name: '', platform: 'whatsapp' as Group['platform'], inviteUrl: '', styles: [] as string[], source: '', verified: false,
})
const formCity = ref('')
watch(formCity, (v) => { if (!v) form.citySlug = '' })
const { errors, validate, reset: resetValidation, fieldAttrs } = useFormValidation(CommunityGroupSchema, form)
function resetForm() {
  Object.assign(form, { citySlug: '', name: '', platform: 'whatsapp', inviteUrl: '', styles: [], source: '', verified: false })
  formCity.value = ''
  resetValidation()
}

async function submit() {
  error.value = null
  const result = validate()
  if (!result.success) return
  saving.value = true
  try {
    await $trpc.communityGroup.create.mutate(result.data)
    notice.value = `Added “${result.data.name}”.`
    resetForm()
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e?.message || 'Could not create group.'
  } finally {
    saving.value = false
  }
}

const platformTone: Record<Group['platform'], 'success' | 'info' | 'neutral' | 'warning'> = { whatsapp: 'success', telegram: 'info', facebook: 'neutral', instagram: 'neutral', other: 'warning' }
const platformLabel: Record<Group['platform'], string> = { whatsapp: 'WhatsApp', telegram: 'Telegram', facebook: 'Facebook', instagram: 'Instagram', other: 'Other' }
const platformOptions = platformFilterOptions.slice(1)
const stateTone: Record<GroupState, 'success' | 'danger' | 'warning' | 'neutral'> = { listed: 'success', dead: 'danger', pending: 'warning', hidden: 'neutral', rejected: 'neutral' }
const stateLabel: Record<GroupState, string> = { listed: 'listed', dead: 'dead link · hidden', pending: 'waiting', hidden: 'hidden', rejected: 'declined' }
</script>

<template>
  <div>
    <AdminPageHeader title="Community groups" description="WhatsApp / Telegram groups shown on city pages. A dead invite link hides the group until it works again or you show it again.">
      <Button variant="ghost" size="sm" class="text-secondary" :disabled="loading" @click="load">
        <RotateCcw /> Refresh
      </Button>
      <Button variant="outline-pill" size="pill-sm" :loading="busy === 'check'" data-testid="check-links" @click="checkLinks">
        <Link2 /> Check links{{ filters.city ? ` in ${nameOf(filters.city)}` : '' }}
      </Button>
      <Button variant="pill" size="pill-sm" :aria-expanded="showForm" @click="showForm = !showForm">
        <Plus /> New
      </Button>
    </AdminPageHeader>

    <AdminState v-if="error" kind="error" :message="error" />
    <p v-if="notice" class="mt-4 rounded-xl bg-wd-green-600/10 p-3 text-sm text-wd-green-700" role="status" data-testid="groups-notice">{{ notice }}</p>

    <form v-if="showForm" class="mt-6 rounded-2xl border bg-card p-5 shadow-wd-card" novalidate @submit.prevent="submit">
      <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary mb-4">New group</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <Field id="group-citySlug" label="City" :error="errors.citySlug">
          <CityCombobox v-model="formCity" placeholder="e.g. Munich" v-bind="fieldAttrs('citySlug', 'group-citySlug-error')" @select="c => (form.citySlug = c.slug)" />
        </Field>
        <Field id="group-name" label="Group name" :error="errors.name">
          <Input v-model="form.name" placeholder="e.g. Salsa Munich" v-bind="fieldAttrs('name', 'group-name-error')" />
        </Field>
        <Field id="group-platform" label="Platform">
          <Select v-model="form.platform" :options="platformOptions" />
        </Field>
        <Field id="group-inviteUrl" label="Invite URL" :error="errors.inviteUrl">
          <Input v-model="form.inviteUrl" type="url" placeholder="https://…" v-bind="fieldAttrs('inviteUrl', 'group-inviteUrl-error')" />
        </Field>
        <Field id="group-styles" label="Styles" optional class="sm:col-span-2">
          <DanceStylePicker v-model="form.styles" :popular-count="6" />
        </Field>
        <Field id="group-source" label="Source" optional :error="errors.source">
          <Input v-model="form.source" v-bind="fieldAttrs('source', 'group-source-error')" />
        </Field>
        <Checkbox v-model="form.verified" class="sm:col-span-2">Verified</Checkbox>
      </div>
      <div class="mt-4 flex gap-2">
        <Button type="submit" variant="pill" :loading="saving">Create</Button>
        <Button type="button" variant="outline-pill" @click="showForm = false; resetForm()">Cancel</Button>
      </div>
    </form>

    <AdminState v-if="loading" kind="loading" />
    <AdminState v-else-if="!items.length" kind="empty" message="No community groups yet." />

    <template v-else>
      <section class="mt-6 rounded-2xl border bg-card p-4" aria-label="Filter groups">
        <div class="grid gap-3 sm:grid-cols-[1fr_14rem_11rem]">
          <Field id="groups-q" label="Search" hide-label>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input v-model="filters.q" type="search" placeholder="Group name, link, source" class="pl-10" />
            </div>
          </Field>
          <Field id="groups-city" label="City" hide-label>
            <CityCombobox v-model="cityText" :options="groupCities" placeholder="All cities" @select="onCityPick" />
          </Field>
          <Field id="groups-platform" label="Platform" hide-label>
            <Select v-model="filters.platform" :options="platformFilterOptions" />
          </Field>
        </div>
        <DanceStyleFilter v-if="allStyles.length" v-model="filters.style" :styles="allStyles" :lead="6" class="mt-3" />
        <div class="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by state">
          <ToggleChip :pressed="!filters.state" @click="filters.state = ''">All ({{ counts.all }})</ToggleChip>
          <ToggleChip
            v-for="s in GROUP_STATES" :key="s"
            :pressed="filters.state === s"
            :data-testid="`state-${s}`"
            @click="filters.state = filters.state === s ? '' : s"
          >
            {{ GROUP_STATE_LABEL[s] }} ({{ counts[s] }})
          </ToggleChip>
          <Button v-if="anyFilter" variant="ghost" size="sm" class="ml-auto h-8 text-xs" @click="clearFilters"><X /> Clear filters</Button>
        </div>
        <p class="mt-3 text-xs text-muted-foreground" data-testid="link-check-summary">
          <template v-if="lastCheck">Links last checked {{ checkedAgo(lastCheck) }}.</template>
          <template v-else>Links never checked.</template>
          {{ due ? `${due} WhatsApp / Telegram link${due === 1 ? '' : 's'} due for a check (40 per click).` : 'Every link was checked in the last day.' }}
        </p>
      </section>

      <p v-if="!shownCount" class="mt-6 text-sm text-muted-foreground">No groups match these filters.</p>

      <section v-for="sec in sections" :key="sec.citySlug" class="mt-6" :data-testid="`groups-${sec.citySlug}`">
        <h2 class="flex items-baseline gap-2 font-display text-lg font-bold text-foreground">
          {{ sec.cityName }}
          <span class="text-sm font-normal text-muted-foreground">{{ sec.groups.length }}</span>
        </h2>
        <ul class="mt-2 grid gap-2">
          <li v-for="grp in sec.groups" :key="grp.id" class="rounded-2xl border bg-card p-4" :data-state="groupState(grp)">
            <div class="flex flex-wrap items-center gap-2">
              <AdminStatus :tone="platformTone[grp.platform] || 'warning'">{{ platformLabel[grp.platform] ?? grp.platform }}</AdminStatus>
              <AdminStatus :tone="stateTone[groupState(grp)]">{{ stateLabel[groupState(grp)] }}</AdminStatus>
              <AdminStatus v-if="grp.status === 'pending' && grp.linkStatus === 'dead'" tone="danger">dead link</AdminStatus>
              <AdminStatus v-if="grp.kind === 'official'" tone="accent">official</AdminStatus>
              <AdminStatus v-if="grp.reportCount" tone="warning">{{ grp.reportCount }} report{{ grp.reportCount === 1 ? '' : 's' }}</AdminStatus>
              <span class="ml-auto flex flex-wrap gap-1">
                <template v-if="grp.status === 'pending'">
                  <Button type="button" variant="pill" size="pill-sm" :disabled="busy === grp.id" @click="review(grp, true)"><Check /> Approve</Button>
                  <Button type="button" variant="outline-pill" size="pill-sm" :disabled="busy === grp.id" @click="review(grp, false)"><X /> Decline</Button>
                </template>
                <Button v-else-if="grp.status === 'hidden' || grp.status === 'rejected' || grp.linkStatus === 'dead'" type="button" variant="ghost" size="sm" class="h-7 text-xs" :disabled="busy === grp.id" @click="setVisible(grp, true)"><Eye /> Show again</Button>
                <Button v-else type="button" variant="ghost" size="sm" class="h-7 text-xs" :disabled="busy === grp.id" @click="setVisible(grp, false)"><EyeOff /> Hide</Button>
              </span>
            </div>
            <h3 class="mt-1.5 flex items-center gap-1.5 font-display text-base font-bold leading-tight text-foreground">
              {{ grp.name }}
              <CheckCircle2 v-if="grp.verified" class="size-3.5 text-success" aria-label="Verified" />
            </h3>
            <DanceStyleChips v-if="grp.styles?.length" :styles="grp.styles" :max="4" class="mt-1" />
            <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <a :href="grp.inviteUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-bold text-wd-cyan-700 hover:underline">Invite link <ExternalLink class="size-3" aria-hidden="true" /></a>
              <span :class="grp.linkStatus === 'dead' ? 'text-destructive' : 'text-muted-foreground'">{{ linkLine(grp) }}</span>
              <span v-if="grp.source" class="text-muted-foreground">from {{ grp.source }}</span>
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
