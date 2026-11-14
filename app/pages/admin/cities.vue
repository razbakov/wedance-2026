<script setup lang="ts">
/**
 * /admin/cities — every city's own WeDance accounts at once (city channels, migration 0067):
 * which business page runs the city (e.g. @wedancemunich), who its admins are, its Instagram,
 * its official channels, its local groups (listed / waiting / dead links) and the last weekly
 * post. Admins set the page and add city admins here; the city's tools live on the page
 * (/business/network/<handle>/city). Group counts link to Admin → Community groups, filtered to
 * the city — that's where "Check links" runs and its result shows (RAZ-862).
 */
import { RotateCcw, Plus, Instagram, Send, MessageCircle, ArrowRight, Link2, UserPlus, Sparkles } from 'lucide-vue-next'
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
    return r.page ? `@${r.page.username} now runs ${citySlug}.` : `${citySlug} has no page now.`
  })

// No page yet: create "WeDance <City>" (@wedance<city>, an organizer page you own) and link it.
const createPage = (citySlug: string) =>
  run(`create-${citySlug}`, async () => {
    const r = await $trpc.cityChannels.createCityPage.mutate({ citySlug })
    return `Created @${r.page.username} (${r.page.name}) and made it ${citySlug}’s page. You own it: add the city admins below.`
  })

// A new city (one without groups yet): create its page, or link a page that already exists.
const newCity = reactive({ slug: '', page: '' })
const newSlug = computed(() => newCity.slug.trim().toLowerCase())
const addCity = (mode: 'create' | 'link') => run(mode === 'create' ? 'new-create' : 'new', async () => {
  const slug = newSlug.value
  if (!slug) throw new Error('Add the city slug first, e.g. munich.')
  if (mode === 'create') {
    const r = await $trpc.cityChannels.createCityPage.mutate({ citySlug: slug })
    newCity.slug = ''
    return `Created @${r.page.username} and added ${slug}. You own it: add the city admins below.`
  }
  if (!newCity.page.trim()) throw new Error('Type the @handle of the page that already exists.')
  await $trpc.cityChannels.setCityPage.mutate({ citySlug: slug, username: newCity.page.trim() })
  Object.assign(newCity, { slug: '', page: '' })
  return `Added ${slug}.`
})

// City admins.
const adminInput = reactive<Record<string, { who: string; role: 'editor' | 'owner' }>>({})
const adminFor = (slug: string) => (adminInput[slug] ??= { who: '', role: 'editor' })
const addAdmin = (slug: string) => run(`admin-${slug}`, async () => {
  const a = adminFor(slug)
  const r = await $trpc.cityChannels.addAdmin.mutate({ citySlug: slug, who: a.who, role: a.role })
  a.who = ''
  return r.already ? `${r.name} is already on the team (${r.role}).` : `${r.name} is now a ${r.role} of ${slug}.`
})

// Admin → Community groups, filtered (the link check and its result live there).
const groupsLink = (city?: string, state?: string) => ({ path: '/admin/community-groups', query: { ...(city ? { city } : {}), ...(state ? { state } : {}) } })

const icon = (p: string) => (p === 'instagram' ? Instagram : p === 'telegram' ? Send : MessageCircle)
const roleOptions = [{ label: 'Editor', value: 'editor' }, { label: 'Owner', value: 'owner' }]
const withPage = computed(() => rows.value.filter(r => r.page))
const withoutPage = computed(() => rows.value.filter(r => !r.page))
</script>

<template>
  <div>
    <AdminPageHeader title="Cities" description="Each city’s own WeDance page, its admins, channels and local groups.">
      <Button variant="ghost" size="sm" class="text-secondary" :disabled="loading" @click="load"><RotateCcw /> Refresh</Button>
      <Button as-child variant="outline-pill" size="pill-sm"><NuxtLink :to="groupsLink()"><Link2 /> Groups &amp; link check</NuxtLink></Button>
    </AdminPageHeader>

    <AdminState v-if="error" kind="error" :message="error" />
    <p v-if="notice" class="mt-4 rounded-xl bg-wd-green-600/10 p-3 text-sm text-wd-green-700" role="status">{{ notice }}</p>

    <section class="mt-6 rounded-2xl border bg-card p-4">
      <p class="text-sm text-muted-foreground">
        A city page is the city’s own WeDance account, like Instagram @wedancemunich: an organizer page called
        “WeDance &lt;City&gt;”. Its team are the city’s admins (weekly post, official channels, local groups).
        No page yet? <strong class="text-foreground">Create</strong> makes it for you, with you as owner.
      </p>
      <form class="mt-3 flex flex-wrap items-end gap-3" novalidate @submit.prevent="addCity('create')">
        <Field id="new-city-slug" label="City slug" class="w-40"><Input v-model="newCity.slug" placeholder="munich" /></Field>
        <Button type="submit" variant="pill" size="pill-sm" :disabled="!newSlug" :loading="busy === 'new-create'">
          <Sparkles /> Create {{ newSlug ? `@${cityPageHandle(newSlug)}` : 'its page' }}
        </Button>
        <span class="text-sm text-muted-foreground">or link an existing page:</span>
        <Field id="new-city-page" label="Existing page" hide-label class="w-44">
          <Input v-model="newCity.page" placeholder="@its_handle" />
        </Field>
        <Button type="button" variant="outline-pill" size="pill-sm" :disabled="!newSlug || !newCity.page.trim()" :loading="busy === 'new'" @click="addCity('link')"><Plus /> Link</Button>
      </form>
    </section>

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
              <form class="mt-2 flex flex-wrap items-center gap-2" novalidate @submit.prevent="addAdmin(c.citySlug)">
                <Field :id="`admin-${c.citySlug}`" label="Add admin" hide-label class="min-w-[12rem] flex-1">
                  <Input v-model="adminFor(c.citySlug).who" placeholder="email or @handle" size="sm" />
                </Field>
                <Field :id="`admin-role-${c.citySlug}`" label="Role" hide-label class="w-28">
                  <Select v-model="adminFor(c.citySlug).role" :options="roleOptions" size="sm" />
                </Field>
                <Button type="submit" variant="outline-pill" size="pill-sm" :loading="busy === `admin-${c.citySlug}`" :disabled="!adminFor(c.citySlug).who.trim()"><UserPlus /> Add</Button>
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
          <div class="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <Field :id="`page-${c.citySlug}`" label="Change page" hide-label class="w-56">
              <Input v-model="pageInput[c.citySlug]" placeholder="@another_page" size="sm" />
            </Field>
            <Button type="button" variant="ghost" size="sm" :disabled="!pageInput[c.citySlug]?.trim()" :loading="busy === `page-${c.citySlug}`" @click="setPage(c.citySlug, pageInput[c.citySlug]!)">Change page</Button>
            <Button type="button" variant="ghost" size="sm" class="text-destructive" :disabled="busy === `page-${c.citySlug}`" @click="setPage(c.citySlug, null)">Unset</Button>
          </div>
        </article>
      </div>

      <h2 v-if="withoutPage.length" class="mt-10 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Cities with groups but no WeDance page ({{ withoutPage.length }})</h2>
      <ul class="mt-3 grid gap-2">
        <li v-for="c in withoutPage" :key="c.citySlug" class="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
          <span class="font-bold">{{ c.cityName }}</span>
          <NuxtLink :to="groupsLink(c.citySlug)" class="text-sm text-muted-foreground hover:underline">{{ c.groups.visible }} listed<span v-if="c.groups.pending"> · {{ c.groups.pending }} waiting</span><span v-if="c.groups.dead"> · {{ c.groups.dead }} dead</span></NuxtLink>
          <span class="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" variant="pill" size="pill-sm" :loading="busy === `create-${c.citySlug}`" :data-testid="`create-page-${c.citySlug}`" @click="createPage(c.citySlug)">
              <Sparkles /> Create @{{ cityPageHandle(c.citySlug) }}
            </Button>
            <span class="text-xs text-muted-foreground">or link an existing one</span>
            <Field :id="`page-${c.citySlug}`" label="Existing page" hide-label class="w-40"><Input v-model="pageInput[c.citySlug]" placeholder="@its_handle" size="sm" /></Field>
            <Button type="button" variant="ghost" size="sm" :disabled="!pageInput[c.citySlug]?.trim()" :loading="busy === `page-${c.citySlug}`" @click="setPage(c.citySlug, pageInput[c.citySlug]!)">Link</Button>
          </span>
        </li>
      </ul>
    </template>
  </div>
</template>
