<script setup lang="ts">
/**
 * /admin/cities — every city's own WeDance accounts at once (city channels, migration 0067):
 * which business page runs the city (e.g. @wedancemunich), who its admins are, its Instagram,
 * its official channels, its local groups (listed / waiting / dead links) and the last weekly
 * post. Admins set the page and add city admins here; the city's tools live on the page
 * (/business/network/<handle>/city). Group counts link to Admin → Community groups, filtered to
 * the city — that's where "Check links" runs and its result shows (RAZ-862).
 */
import { RotateCcw, Plus, Instagram, Send, MessageCircle, ArrowRight, Link2, UserPlus, Sparkles, Search, Pencil } from 'lucide-vue-next'
import type { CityOption } from '#shared/utils/citySearch'
import { cityPageHandle } from '#shared/utils/communityGroups'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin: Cities | WeDance' })

const { $trpc } = useNuxtApp()
type Row = Awaited<ReturnType<typeof $trpc.cityChannels.overview.query>>[number]
const rows = ref<Row[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const busy = ref<string | null>(null)

async function load() {
  error.value = null
  try { rows.value = await $trpc.cityChannels.overview.query() }
  catch (e: any) { error.value = e?.message || 'Couldn’t load the cities.' }
  finally { loading.value = false }
}
onMounted(load)

async function run(key: string, fn: () => Promise<string | void>) {
  busy.value = key
  error.value = null
  notice.value = null
  try { const msg = await fn(); if (msg) notice.value = msg; await load() }
  catch (e: any) { error.value = e?.message || 'That didn’t work.' }
  finally { busy.value = null }
}

// Set / change a city's page.
const pageInput = reactive<Record<string, string>>({})
const setPage = (citySlug: string, username: string | null) =>
  run(`page-${citySlug}`, async () => {
    const r = await $trpc.cityChannels.setCityPage.mutate({ citySlug, username })
    openForm.value = null
    return r.page ? `@${r.page.username} now runs ${citySlug}.` : `${citySlug} has no page now.`
  })

// No page yet: create "WeDance <City>" (@wedance<city>, an organizer page you own) and link it.
const createPage = (citySlug: string) =>
  run(`create-${citySlug}`, async () => {
    const r = await $trpc.cityChannels.createCityPage.mutate({ citySlug })
    return `Created @${r.page.username} (${r.page.name}) and made it ${citySlug}’s page. You own it: add the city admins below.`
  })

// A new city (one without groups yet): pick it with <CityCombobox>, then create its page — or,
// behind "link a page that exists", link one by its @handle.
const newCity = reactive({ name: '', slug: '', page: '' })
const newCityText = ref('')
const linkExisting = ref(false)
watch(newCityText, (v) => { if (!v || v !== newCity.name) Object.assign(newCity, { name: '', slug: '' }) })
function onNewCity(c: CityOption) { Object.assign(newCity, { name: c.name, slug: c.slug }) }
const newSlug = computed(() => newCity.slug)
const addCity = (mode: 'create' | 'link') => run(mode === 'create' ? 'new-create' : 'new', async () => {
  const slug = newSlug.value
  if (!slug) throw new Error('Pick the city first.')
  const name = newCity.name
  if (mode === 'create') {
    const r = await $trpc.cityChannels.createCityPage.mutate({ citySlug: slug })
    newCityText.value = ''
    return `Created @${r.page.username} and added ${name}. You own it: add the city admins below.`
  }
  if (!newCity.page.trim()) throw new Error('Type the @handle of the page that already exists.')
  await $trpc.cityChannels.setCityPage.mutate({ citySlug: slug, username: newCity.page.trim() })
  newCityText.value = ''
  newCity.page = ''
  linkExisting.value = false
  return `Added ${name}.`
})

// One small form open at a time (change a page, link a page, add an admin), so each row
// shows one action until you ask for more.
const openForm = ref<string | null>(null)
const toggleForm = (key: string) => { openForm.value = openForm.value === key ? null : key }

// City admins.
const adminInput = reactive<Record<string, { who: string; role: 'editor' | 'owner' }>>({})
const adminFor = (slug: string) => (adminInput[slug] ??= { who: '', role: 'editor' })
const addAdmin = (slug: string) => run(`admin-${slug}`, async () => {
  const a = adminFor(slug)
  const r = await $trpc.cityChannels.addAdmin.mutate({ citySlug: slug, who: a.who, role: a.role })
  a.who = ''
  openForm.value = null
  return r.already ? `${r.name} is already on the team (${r.role}).` : `${r.name} is now a ${r.role} of ${slug}.`
})

// Admin → Community groups, filtered (the link check and its result live there).
const groupsLink = (city?: string, state?: string) => ({ path: '/admin/community-groups', query: { ...(city ? { city } : {}), ...(state ? { state } : {}) } })

const icon = (p: string) => (p === 'instagram' ? Instagram : p === 'telegram' ? Send : MessageCircle)
const roleOptions = [{ label: 'Editor', value: 'editor' }, { label: 'Owner', value: 'owner' }]
// Search: city name, slug or the page's @handle.
const q = ref('')
const matches = (r: Row) => {
  const needle = q.value.trim().toLowerCase().replace(/^@/, '')
  return !needle || [r.cityName, r.citySlug, r.page?.username ?? ''].some(x => x.toLowerCase().includes(needle))
}
const shown = computed(() => rows.value.filter(matches))
const withPage = computed(() => shown.value.filter(r => r.page))
const withoutPage = computed(() => shown.value.filter(r => !r.page))
</script>

<template>
  <div>
    <AdminPageHeader title="Cities" description="Each city’s own WeDance page, its admins, channels and local groups.">
      <Button variant="ghost" size="sm" class="text-secondary" :disabled="loading" @click="load"><RotateCcw /> Refresh</Button>
      <Button as-child variant="outline-pill" size="pill-sm"><NuxtLink :to="groupsLink()"><Link2 /> Groups &amp; link check</NuxtLink></Button>
    </AdminPageHeader>

    <AdminState v-if="error" kind="error" :message="error" />
    <p v-if="notice" class="mt-4 rounded-xl bg-wd-green-600/10 p-3 text-sm text-wd-green-700" role="status">{{ notice }}</p>

    <section class="mt-6 rounded-2xl border bg-card p-4" aria-labelledby="add-city-title">
      <h2 id="add-city-title" class="font-display text-base font-bold text-foreground">Add a city</h2>
      <p class="mt-1 max-w-prose text-sm text-muted-foreground">
        A city page is the city’s own WeDance account, like Instagram @wedancemunich: an organizer page called
        “WeDance &lt;City&gt;”. Its team are the city’s admins (weekly post, official channels, local groups).
      </p>
      <form class="mt-4 grid gap-3 sm:grid-cols-[minmax(0,18rem)_auto] sm:items-end sm:justify-start" novalidate @submit.prevent="addCity('create')">
        <Field id="new-city" label="City">
          <CityCombobox v-model="newCityText" placeholder="Search a city" @select="onNewCity" />
        </Field>
        <Button type="submit" variant="pill" size="pill-sm" class="justify-self-start" :disabled="!newSlug" :loading="busy === 'new-create'" data-testid="new-city-create">
          <Sparkles /> {{ newSlug ? `Create @${cityPageHandle(newSlug)}` : 'Create its page' }}
        </Button>
      </form>
      <button v-if="!linkExisting" type="button" class="mt-3 text-sm font-bold text-wd-red-800 hover:underline" @click="linkExisting = true">
        The city has a page already? Link it
      </button>
      <form v-else class="mt-3 flex flex-wrap items-end gap-2" novalidate @submit.prevent="addCity('link')">
        <Field id="new-city-page" label="Its page" class="w-56">
          <Input v-model="newCity.page" placeholder="@its_handle" size="sm" />
        </Field>
        <Button type="submit" variant="outline-pill" size="pill-sm" :disabled="!newSlug || !newCity.page.trim()" :loading="busy === 'new'"><Plus /> Link</Button>
        <Button type="button" variant="ghost" size="sm" @click="linkExisting = false; newCity.page = ''">Cancel</Button>
        <p v-if="!newSlug" class="basis-full text-xs text-muted-foreground">Pick the city above first.</p>
      </form>
    </section>

    <div v-if="!loading && rows.length" class="mt-6">
      <Field id="cities-q" label="Search cities" hide-label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input v-model="q" type="search" placeholder="City or @page" class="pl-10" data-testid="cities-search" />
        </div>
      </Field>
      <p v-if="q && !shown.length" class="mt-3 text-sm text-muted-foreground">No city matches “{{ q }}”.</p>
    </div>

    <AdminState v-if="loading" kind="loading" />
    <template v-else>
      <div class="mt-6 grid gap-3">
        <article v-for="c in withPage" :key="c.citySlug" class="rounded-2xl border bg-card p-4" :data-testid="`city-${c.citySlug}`">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="font-display text-lg font-bold text-foreground">{{ c.cityName }}</h2>
            <AdminStatus tone="neutral">{{ c.citySlug }}</AdminStatus>
            <NuxtLink :to="`/business/network/${c.page!.username}/city`" class="ml-auto inline-flex items-center gap-1 text-sm font-bold text-wd-red-800 hover:underline">
              @{{ c.page!.username }} tools <ArrowRight class="size-3.5" aria-hidden="true" />
            </NuxtLink>
          </div>

          <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt class="text-muted-foreground">Admins</dt>
            <dd>
              <span v-if="!c.team.length" class="text-wd-red-800">nobody yet</span>
              <span v-for="m in c.team" :key="m.dancerId" class="mr-2 inline-flex items-center gap-1">{{ m.name }} <AdminStatus :tone="m.role === 'owner' ? 'accent' : 'neutral'">{{ m.role }}</AdminStatus></span>
              <button v-if="openForm !== `admin-${c.citySlug}`" type="button" class="inline-flex items-center gap-1 text-sm font-bold text-wd-red-800 hover:underline" @click="toggleForm(`admin-${c.citySlug}`)"><UserPlus class="size-3.5" aria-hidden="true" /> Add admin</button>
              <form v-else class="mt-2 flex flex-wrap items-center gap-2" novalidate @submit.prevent="addAdmin(c.citySlug)">
                <Field :id="`admin-${c.citySlug}`" label="Add admin" hide-label class="min-w-[12rem] flex-1">
                  <Input v-model="adminFor(c.citySlug).who" placeholder="email or @handle" size="sm" />
                </Field>
                <Field :id="`admin-role-${c.citySlug}`" label="Role" hide-label class="w-28">
                  <Select v-model="adminFor(c.citySlug).role" :options="roleOptions" size="sm" />
                </Field>
                <Button type="submit" variant="outline-pill" size="pill-sm" :loading="busy === `admin-${c.citySlug}`" :disabled="!adminFor(c.citySlug).who.trim()"><UserPlus /> Add</Button>
                <Button type="button" variant="ghost" size="sm" @click="openForm = null">Cancel</Button>
              </form>
            </dd>
            <dt class="text-muted-foreground">Instagram</dt>
            <dd>
              <span v-if="c.instagram">@{{ c.instagram.username }}<span v-if="c.instagram.lastError" class="text-destructive"> · {{ c.instagram.lastError }}</span></span>
              <span v-else class="text-muted-foreground">not connected</span>
            </dd>
            <dt class="text-muted-foreground">Channels</dt>
            <dd>
              <span v-if="!c.channels.length" class="text-muted-foreground">none</span>
              <a v-for="ch in c.channels" :key="ch.id" :href="ch.inviteUrl" target="_blank" rel="noopener" class="mr-3 inline-flex items-center gap-1 hover:underline">
                <component :is="icon(ch.platform)" class="size-3.5 text-primary" aria-hidden="true" />{{ ch.name }}<span v-if="ch.platform === 'telegram' && !ch.telegramChatId" class="text-xs text-muted-foreground">(no bot)</span>
              </a>
            </dd>
            <dt class="text-muted-foreground">Local groups</dt>
            <dd>
              <NuxtLink :to="groupsLink(c.citySlug)" class="hover:underline">{{ c.groups.visible }} listed</NuxtLink>
              <NuxtLink v-if="c.groups.pending" :to="groupsLink(c.citySlug, 'pending')" class="ml-1 font-bold text-wd-red-800 hover:underline">· {{ c.groups.pending }} waiting</NuxtLink>
              <NuxtLink v-if="c.groups.dead" :to="groupsLink(c.citySlug, 'dead')" class="ml-1 text-muted-foreground hover:underline">· {{ c.groups.dead }} dead links</NuxtLink>
              <NuxtLink v-if="c.groups.hidden" :to="groupsLink(c.citySlug, 'hidden')" class="ml-1 text-muted-foreground hover:underline">· {{ c.groups.hidden }} hidden</NuxtLink>
            </dd>
            <dt class="text-muted-foreground">Last weekly post</dt>
            <dd>
              <span v-if="!c.lastSchedule" class="text-muted-foreground">never</span>
              <span v-else>week of {{ c.lastSchedule.weekStart }} · {{ [c.lastSchedule.instagram && 'Instagram', c.lastSchedule.telegram && 'Telegram'].filter(Boolean).join(' + ') || 'drafted, not posted' }}</span>
            </dd>
          </dl>
          <div class="mt-3 border-t pt-3">
            <button v-if="openForm !== `page-${c.citySlug}`" type="button" class="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:underline" @click="toggleForm(`page-${c.citySlug}`)">
              <Pencil class="size-3" aria-hidden="true" /> Change page
            </button>
            <form v-else class="flex flex-wrap items-center gap-2" novalidate @submit.prevent="setPage(c.citySlug, pageInput[c.citySlug]!)">
              <Field :id="`page-${c.citySlug}`" label="Another page" hide-label class="w-56">
                <Input v-model="pageInput[c.citySlug]" placeholder="@another_page" size="sm" />
              </Field>
              <Button type="submit" variant="outline-pill" size="pill-sm" :disabled="!pageInput[c.citySlug]?.trim()" :loading="busy === `page-${c.citySlug}`">Save</Button>
              <Button type="button" variant="ghost" size="sm" @click="openForm = null">Cancel</Button>
              <Button type="button" variant="ghost" size="sm" class="ml-auto text-destructive" :disabled="busy === `page-${c.citySlug}`" @click="setPage(c.citySlug, null)">Unset page</Button>
            </form>
          </div>
        </article>
      </div>

      <template v-if="withoutPage.length">
        <h2 class="mt-10 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Cities with groups but no WeDance page ({{ withoutPage.length }})</h2>
        <ul class="mt-3 divide-y overflow-hidden rounded-2xl border bg-card">
          <li v-for="c in withoutPage" :key="c.citySlug" class="group px-4 py-3 hover:bg-muted/40" :data-testid="`no-page-${c.citySlug}`">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span class="min-w-0">
                <span class="block font-bold text-foreground">{{ c.cityName }}</span>
                <NuxtLink :to="groupsLink(c.citySlug)" class="text-xs text-muted-foreground hover:underline">{{ c.groups.visible }} listed<span v-if="c.groups.pending"> · {{ c.groups.pending }} waiting</span><span v-if="c.groups.dead"> · {{ c.groups.dead }} dead</span></NuxtLink>
              </span>
              <!-- Row actions show on hover / keyboard focus (always on touch screens), so 27 rows aren't 54 buttons. -->
              <span class="ml-auto flex items-center gap-1 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100" :class="openForm === `link-${c.citySlug}` && '[@media(hover:hover)]:opacity-100'">
                <Button type="button" variant="ghost" size="sm" class="text-muted-foreground" :aria-expanded="openForm === `link-${c.citySlug}`" @click="toggleForm(`link-${c.citySlug}`)"><Link2 /> Link a page</Button>
                <Button type="button" variant="outline-pill" size="pill-sm" :loading="busy === `create-${c.citySlug}`" :data-testid="`create-page-${c.citySlug}`" :title="`Create @${cityPageHandle(c.citySlug)}`" @click="createPage(c.citySlug)">
                  <Sparkles /> Create page
                </Button>
              </span>
            </div>
            <form v-if="openForm === `link-${c.citySlug}`" class="mt-2 flex flex-wrap items-center gap-2" novalidate @submit.prevent="setPage(c.citySlug, pageInput[c.citySlug]!)">
              <Field :id="`page-${c.citySlug}`" label="Existing page" hide-label class="w-56"><Input v-model="pageInput[c.citySlug]" placeholder="@its_handle" size="sm" /></Field>
              <Button type="submit" variant="outline-pill" size="pill-sm" :disabled="!pageInput[c.citySlug]?.trim()" :loading="busy === `page-${c.citySlug}`">Link</Button>
              <Button type="button" variant="ghost" size="sm" @click="openForm = null">Cancel</Button>
            </form>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>
