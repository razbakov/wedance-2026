<script setup lang="ts">
/**
 * /business/network/<handle>/contacts-variants — layout options for the
 * Contacts page (RAZ-949, needs 1 + 2): see the segments (source, can / can't
 * email) and what each contact does on WeDance. Real data of the page
 * (businessSite.contactsOverview), read-only: nothing here writes, sends or
 * deletes. The picked layout replaces contacts.vue; sending, the opt-in ask,
 * bulk actions and the audience view follow on it.
 */
import { Search, X, SlidersHorizontal, Monitor, Smartphone, MailCheck, MailX, Users, CalendarCheck, Repeat, Moon, Sparkles, Heart, ArrowDownWideNarrow, Info } from 'lucide-vue-next'
import {
  ACTIVITY_FILTERS, ACTIVITY_FILTER_LABEL, EMAIL_BLOCK_LABEL, SOURCE_LABEL, contactSegments,
  type ActivityFilter, type ContactSourceKey,
} from '#shared/utils/contactSegments'
import { byEngagement, emptyFilter, filterContacts, isFiltered, toggle, type ContactFilter } from '~/lib/contactFilters'

definePageMeta({ layout: 'business' })
const route = useRoute()
const { $trpc } = useNuxtApp()
const username = computed(() => String(route.params.username))

type Overview = Awaited<ReturnType<typeof $trpc.businessSite.contactsOverview.query>>
const data = ref<Overview | null>(null)
const error = ref<string | null>(null)
onMounted(async () => {
  try { data.value = await $trpc.businessSite.contactsOverview.query({ username: username.value }) }
  catch (e: any) { error.value = e?.message || 'Couldn’t load the contacts.' }
})
useHead(() => ({ title: `Contacts layouts · ${data.value?.profile.name ?? ''} | Business | WeDance`, meta: [{ name: 'robots', content: 'noindex' }] }))

type Variant = 'A' | 'B' | 'C' | 'D' | 'E'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  { id: 'A', name: 'Segment sidebar', idea: 'A CRM-style rail on the left: sources, can / can’t email and WeDance activity, each with its count. The list fills the rest.', good: 'Every segment and its count visible at once; scales to many sources and, later, your own tags.', cost: 'Takes width on desktop; on a phone the rail hides behind a Filters button.' },
  { id: 'B', name: 'Chips over the list', idea: 'Today’s page plus three rows of chips (source · email · activity) and an activity line on every contact.', good: 'Smallest change, one screen, nothing new to learn.', cost: 'Chips get crowded as sources and tags grow; the totals don’t tell you what to do.' },
  { id: 'C', name: 'Overview first', idea: 'Opens on what you have: who you can email and why not, where people came from, and WeDance tiles (going next, regulars, haven’t come…). A tile opens its list.', good: 'Answers “what can I do with them?” before the list; the email split is impossible to miss.', cost: 'One more step to reach a person; the overview needs space and real activity data to be useful.' },
  { id: 'D', name: 'People cards', idea: 'Faces first: a card per person, most engaged on top, with what they do on WeDance in words. One “Show” menu filters.', good: 'You recognise your regulars; feels like a community, not a mailing list.', cost: 'Hard to scan 400 emails; contacts without an account look empty.' },
  { id: 'E', name: 'Recommended: C’s overview + B’s list', idea: 'A compact strip on top (can / can’t email, going next, regulars, haven’t come, new) that filters, the source chips under it, and the list with an activity line.', good: 'The email decision and the people worth a message are on one screen, and it stays a fast list.', cost: 'Two ways to filter (strip + chips) to keep consistent; slightly busier than B.' },
]
const variant = ref<Variant>('E')
const device = ref<'desktop' | 'mobile'>('desktop')
const isMobile = computed(() => device.value === 'mobile')
const dataset = ref<'real' | 'empty'>('real')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// Shared, reset per variant / device / dataset so each starts clean.
const f = reactive<ContactFilter>(emptyFilter())
const sort = ref<'newest' | 'engaged'>('newest')
const railOpen = ref(false)
const cTile = ref<string | null>(null)
watch([variant, device, dataset], () => {
  Object.assign(f, emptyFilter())
  sort.value = variant.value === 'D' ? 'engaged' : 'newest'
  railOpen.value = false
  cTile.value = null
})

const all = computed(() => (dataset.value === 'empty' ? [] : data.value?.contacts ?? []))
const segs = computed(() => (dataset.value === 'empty' ? contactSegments([]) : data.value!.segments))
const shown = computed(() => {
  const l = filterContacts(all.value, f)
  return sort.value === 'engaged' ? [...l].sort(byEngagement) : l
})
const LIMIT = 60
const more = ref(LIMIT)
watch(shown, () => { more.value = LIMIT })
const visible = computed(() => shown.value.slice(0, more.value))

const ACT_ICON: Record<ActivityFilter, any> = { account: Users, follows: Heart, going: CalendarCheck, regular: Repeat, lapsed: Moon, new: Sparkles }
const SHORT: Record<ActivityFilter, string> = { account: 'On WeDance', follows: 'Follow you', going: 'Going next', regular: 'Regulars', lapsed: 'Haven’t come in 3 months', new: 'New this month' }
const toggleSource = (k: ContactSourceKey) => { f.sources = toggle(f.sources, k) }
const toggleAct = (a: ActivityFilter) => { f.activity = toggle(f.activity, a) }
const setEmail = (e: ContactFilter['email']) => { f.email = f.email === e ? 'any' : e }
const clear = () => Object.assign(f, emptyFilter())
const pct = (n: number) => (segs.value.total ? Math.round((n / segs.value.total) * 100) : 0)
const followersOnly = computed(() => (dataset.value === 'empty' ? 0 : data.value?.followers.notContacts ?? 0))

// C: a tile opens its list.
function openTile(key: string) {
  cTile.value = key
  Object.assign(f, emptyFilter())
  if (key === 'can' || key === 'cant') f.email = key
  else if (key.startsWith('src:')) f.sources = [key.slice(4) as ContactSourceKey]
  else if (key !== 'all') f.activity = [key as ActivityFilter]
}
// D: one "Show" menu.
const dShow = ref('all')
watch(dShow, (v) => {
  Object.assign(f, emptyFilter(), { q: f.q })
  if (v === 'can' || v === 'cant') f.email = v
  else if (v.startsWith('src:')) f.sources = [v.slice(4) as ContactSourceKey]
  else if (v !== 'all') f.activity = [v as ActivityFilter]
})
watch([variant, device, dataset], () => { dShow.value = 'all' })

const SRC_COLOR = ['bg-primary', 'bg-wd-amber-500', 'bg-secondary', 'bg-wd-green-700', 'bg-wd-brown-900', 'bg-muted-foreground']
const HEADER = 'Everyone who gave you their email: sign-ups on your website and the lists you imported. Only people who signed up themselves can be emailed.'
</script>

<template>
  <div>
    <!-- Control bar: not part of any variant -->
    <div class="sticky top-0 z-30 -mx-4 mb-6 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-eyebrow font-black uppercase tracking-widest text-secondary">Contacts layouts</span>
        <div class="flex gap-1" role="tablist" aria-label="Variant">
          <Button v-for="v in VARIANTS" :key="v.id" type="button" size="sm" :variant="variant === v.id ? 'pill' : 'outline'" role="tab" :aria-selected="variant === v.id" @click="variant = v.id">{{ v.id }}</Button>
        </div>
        <div class="flex gap-1" aria-label="Device">
          <Button type="button" size="icon-sm" :variant="device === 'desktop' ? 'soft' : 'ghost'" aria-label="Desktop" :aria-pressed="device === 'desktop'" @click="device = 'desktop'"><Monitor /></Button>
          <Button type="button" size="icon-sm" :variant="device === 'mobile' ? 'soft' : 'ghost'" aria-label="Phone" :aria-pressed="device === 'mobile'" @click="device = 'mobile'"><Smartphone /></Button>
        </div>
        <div class="flex gap-1" aria-label="Data">
          <Button type="button" size="sm" :variant="dataset === 'real' ? 'soft' : 'ghost'" @click="dataset = 'real'">@{{ username }}</Button>
          <Button type="button" size="sm" :variant="dataset === 'empty' ? 'soft' : 'ghost'" @click="dataset = 'empty'">Empty page</Button>
        </div>
        <NuxtLink :to="`/business/network/${username}/contacts`" class="ml-auto text-sm text-wd-red-800 underline underline-offset-2">Today’s page</NuxtLink>
      </div>
      <p class="mt-2 text-sm"><b>{{ current.id }} · {{ current.name }}.</b> {{ current.idea }}</p>
      <p class="mt-0.5 text-sm text-muted-foreground"><b class="text-wd-green-700">Good:</b> {{ current.good }} <b class="text-wd-red-800">Cost:</b> {{ current.cost }}</p>
    </div>

    <AdminState v-if="!data && !error" kind="loading" />
    <AdminState v-else-if="!data" kind="error" :message="error!" />

    <div v-else :class="isMobile ? 'mx-auto w-[390px] max-w-full overflow-y-auto rounded-[2rem] border-8 border-foreground/80 bg-background p-4 shadow-wd-card' : ''" :style="isMobile ? 'height: min(760px, calc(100vh - 12rem))' : ''">
      <!-- Shared header (fixed text) -->
      <p class="text-eyebrow font-black uppercase tracking-widest text-secondary">Contacts</p>
      <h1 class="font-display text-3xl">{{ data.profile.name }}</h1>
      <p class="mt-1 max-w-2xl text-sm text-muted-foreground">{{ HEADER }}</p>
      <p class="mt-1 text-sm"><b>{{ segs.total }}</b> contacts · <b>{{ segs.canEmail }}</b> can be emailed<template v-if="followersOnly"> · {{ followersOnly }} more follow you without being a contact</template></p>

      <AdminState v-if="!segs.total" kind="empty" class="mt-6" message="No contacts yet. People who sign up on your website, and lists you import, show up here." />

      <!-- ───────────── A · Segment sidebar ───────────── -->
      <div v-else-if="variant === 'A'" class="mt-5" :class="isMobile ? '' : 'grid grid-cols-[15rem_1fr] gap-6'">
        <Button v-if="isMobile" type="button" variant="outline" size="sm" class="mb-3" @click="railOpen = !railOpen"><SlidersHorizontal /> Filters<template v-if="isFiltered(f)"> · on</template></Button>
        <aside v-if="!isMobile || railOpen" class="grid content-start gap-5 rounded-2xl border bg-card p-4 text-sm shadow-wd-card" :class="isMobile ? 'mb-4' : 'sticky top-40 self-start'">
          <section>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Email</h2>
            <button v-for="e in (['can', 'cant'] as const)" :key="e" type="button" class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-accent" :class="f.email === e ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.email === e" @click="setEmail(e)">
              <span class="inline-flex items-center gap-2"><component :is="e === 'can' ? MailCheck : MailX" class="size-4" aria-hidden="true" /> {{ e === 'can' ? 'Can email' : 'Can’t email' }}</span>
              <span class="tabular-nums">{{ e === 'can' ? segs.canEmail : segs.cantEmail }}</span>
            </button>
            <p class="mt-1 px-2 text-xs text-muted-foreground">{{ segs.blocked.not_opted_in }} never asked · {{ segs.blocked.unsubscribed }} unsubscribed</p>
          </section>
          <section>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Came from</h2>
            <button v-for="s in segs.sources" :key="s.key" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent" :class="f.sources.includes(s.key) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.sources.includes(s.key)" @click="toggleSource(s.key)">
              <span>{{ s.label }}</span><span class="tabular-nums">{{ s.count }}</span>
            </button>
          </section>
          <section>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">On WeDance</h2>
            <button v-for="a in ACTIVITY_FILTERS" :key="a" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent" :class="f.activity.includes(a) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.activity.includes(a)" @click="toggleAct(a)">
              <span class="inline-flex items-center gap-2"><component :is="ACT_ICON[a]" class="size-4" aria-hidden="true" /> {{ SHORT[a] }}</span><span class="tabular-nums">{{ segs.activity[a] }}</span>
            </button>
          </section>
          <Button v-if="isFiltered(f)" type="button" variant="ghost" size="sm" @click="clear"><X /> Clear filters</Button>
        </aside>
        <div class="min-w-0">
          <div class="mb-3 flex items-center gap-2">
            <div class="relative flex-1"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input v-model="f.q" placeholder="Search name, email, note…" class="pl-9" aria-label="Search contacts" /></div>
            <span class="text-sm text-muted-foreground tabular-nums">{{ shown.length }}</span>
          </div>
          <ul class="divide-y rounded-2xl border bg-card shadow-wd-card">
            <li v-for="c in visible" :key="c.id" class="p-4"><ContactsPersonRow :contact="c" /></li>
            <li v-if="!shown.length" class="p-4 text-sm text-muted-foreground">Nobody in this segment.</li>
          </ul>
        </div>
      </div>

      <!-- ───────────── B · Chips over the list ───────────── -->
      <div v-else-if="variant === 'B'" class="mt-5">
        <div class="grid gap-2">
          <div class="relative max-w-sm"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input v-model="f.q" placeholder="Search name, email, note…" class="pl-9" aria-label="Search contacts" /></div>
          <div class="flex gap-1.5" :class="isMobile ? 'overflow-x-auto pb-1' : 'flex-wrap'">
            <Button v-for="s in segs.sources" :key="s.key" type="button" size="sm" class="shrink-0 rounded-full" :variant="f.sources.includes(s.key) ? 'soft' : 'outline'" :aria-pressed="f.sources.includes(s.key)" @click="toggleSource(s.key)">{{ s.label }} · {{ s.count }}</Button>
          </div>
          <div class="flex gap-1.5" :class="isMobile ? 'overflow-x-auto pb-1' : 'flex-wrap'">
            <Button type="button" size="sm" class="shrink-0 rounded-full" :variant="f.email === 'can' ? 'soft' : 'outline'" :aria-pressed="f.email === 'can'" @click="setEmail('can')"><MailCheck /> Can email · {{ segs.canEmail }}</Button>
            <Button type="button" size="sm" class="shrink-0 rounded-full" :variant="f.email === 'cant' ? 'soft' : 'outline'" :aria-pressed="f.email === 'cant'" @click="setEmail('cant')"><MailX /> Can’t email · {{ segs.cantEmail }}</Button>
            <span class="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden="true" />
            <Button v-for="a in ACTIVITY_FILTERS" :key="a" type="button" size="sm" class="shrink-0 rounded-full" :variant="f.activity.includes(a) ? 'soft' : 'outline'" :aria-pressed="f.activity.includes(a)" @click="toggleAct(a)"><component :is="ACT_ICON[a]" /> {{ SHORT[a] }} · {{ segs.activity[a] }}</Button>
          </div>
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{{ shown.length }} shown</span>
            <button v-if="isFiltered(f)" type="button" class="underline underline-offset-2" @click="clear">clear</button>
            <button type="button" class="ml-auto inline-flex items-center gap-1 underline-offset-2 hover:underline" @click="sort = sort === 'newest' ? 'engaged' : 'newest'"><ArrowDownWideNarrow class="size-4" aria-hidden="true" /> {{ sort === 'newest' ? 'Newest first' : 'Most engaged first' }}</button>
          </div>
        </div>
        <ul class="mt-3 divide-y rounded-2xl border bg-card shadow-wd-card">
          <li v-for="c in visible" :key="c.id" class="p-4"><ContactsPersonRow :contact="c" /></li>
          <li v-if="!shown.length" class="p-4 text-sm text-muted-foreground">No contact matches.</li>
        </ul>
      </div>

      <!-- ───────────── C · Overview first ───────────── -->
      <div v-else-if="variant === 'C'" class="mt-5">
        <template v-if="!cTile">
          <div class="grid gap-3" :class="isMobile ? '' : 'grid-cols-2'">
            <button type="button" class="rounded-2xl border bg-card p-4 text-left shadow-wd-card hover:border-primary/40" @click="openTile('can')">
              <p class="flex items-center gap-2 text-sm font-bold text-wd-green-700"><MailCheck class="size-4" aria-hidden="true" /> You can email</p>
              <p class="font-display text-4xl tabular-nums">{{ segs.canEmail }}</p>
              <p class="text-sm text-muted-foreground">They signed up for your news themselves.</p>
            </button>
            <button type="button" class="rounded-2xl border bg-card p-4 text-left shadow-wd-card hover:border-primary/40" @click="openTile('cant')">
              <p class="flex items-center gap-2 text-sm font-bold text-muted-foreground"><MailX class="size-4" aria-hidden="true" /> You can’t email (yet)</p>
              <p class="font-display text-4xl tabular-nums">{{ segs.cantEmail }}</p>
              <p class="text-sm text-muted-foreground">{{ segs.blocked.not_opted_in }} never asked for your emails (imported) · {{ segs.blocked.unsubscribed }} unsubscribed.</p>
            </button>
          </div>
          <section class="mt-4 rounded-2xl border bg-card p-4 shadow-wd-card">
            <h2 class="text-sm font-bold">Where they came from</h2>
            <div class="mt-2 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span v-for="(s, i) in segs.sources" :key="s.key" :class="SRC_COLOR[i % SRC_COLOR.length]" :style="{ width: `${pct(s.count)}%` }" />
            </div>
            <ul class="mt-3 grid gap-1 text-sm" :class="isMobile ? '' : 'grid-cols-2'">
              <li v-for="(s, i) in segs.sources" :key="s.key">
                <button type="button" class="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" @click="openTile(`src:${s.key}`)">
                  <span class="size-2.5 shrink-0 rounded-full" :class="SRC_COLOR[i % SRC_COLOR.length]" aria-hidden="true" />
                  <span class="flex-1">{{ s.label }}</span>
                  <span v-if="s.selfOptIn" class="text-xs text-wd-green-700">opted in</span>
                  <span class="tabular-nums font-bold">{{ s.count }}</span>
                </button>
              </li>
            </ul>
          </section>
          <h2 class="mt-5 text-sm font-bold">On WeDance</h2>
          <div class="mt-2 grid gap-3" :class="isMobile ? 'grid-cols-2' : 'grid-cols-3'">
            <button v-for="a in ACTIVITY_FILTERS" :key="a" type="button" class="rounded-2xl border bg-card p-3 text-left shadow-wd-card hover:border-primary/40 disabled:opacity-50" :disabled="!segs.activity[a]" @click="openTile(a)">
              <component :is="ACT_ICON[a]" class="size-5 text-wd-red-800" aria-hidden="true" />
              <p class="mt-1 font-display text-2xl tabular-nums">{{ segs.activity[a] }}</p>
              <p class="text-sm">{{ SHORT[a] }}</p>
            </button>
          </div>
          <Button type="button" variant="outline-pill" size="pill-sm" class="mt-5" @click="openTile('all')">See all {{ segs.total }} contacts</Button>
        </template>
        <template v-else>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" @click="cTile = null; clear()">← Overview</Button>
            <span class="text-sm font-bold">{{ cTile === 'all' ? 'Everyone' : cTile === 'can' ? 'Can email' : cTile === 'cant' ? 'Can’t email' : cTile.startsWith('src:') ? SOURCE_LABEL[cTile.slice(4) as ContactSourceKey] : SHORT[cTile as ActivityFilter] }} · {{ shown.length }}</span>
            <div class="relative ml-auto w-full max-w-xs"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input v-model="f.q" placeholder="Search…" class="pl-9" aria-label="Search contacts" /></div>
          </div>
          <ul class="mt-3 divide-y rounded-2xl border bg-card shadow-wd-card">
            <li v-for="c in visible" :key="c.id" class="p-4"><ContactsPersonRow :contact="c" /></li>
            <li v-if="!shown.length" class="p-4 text-sm text-muted-foreground">Nobody here.</li>
          </ul>
        </template>
      </div>

      <!-- ───────────── D · People cards ───────────── -->
      <div v-else-if="variant === 'D'" class="mt-5">
        <div class="flex flex-wrap items-center gap-2">
          <label class="text-sm font-bold" for="d-show">Show</label>
          <select id="d-show" v-model="dShow" class="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="all">Everyone · {{ segs.total }}</option>
            <optgroup label="On WeDance">
              <option v-for="a in ACTIVITY_FILTERS" :key="a" :value="a">{{ ACTIVITY_FILTER_LABEL[a] }} · {{ segs.activity[a] }}</option>
            </optgroup>
            <optgroup label="Email">
              <option value="can">Can email · {{ segs.canEmail }}</option>
              <option value="cant">Can’t email · {{ segs.cantEmail }}</option>
            </optgroup>
            <optgroup label="Came from">
              <option v-for="s in segs.sources" :key="s.key" :value="`src:${s.key}`">{{ s.label }} · {{ s.count }}</option>
            </optgroup>
          </select>
          <div class="relative flex-1" :class="isMobile ? 'basis-full' : 'max-w-xs'"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input v-model="f.q" placeholder="Search…" class="pl-9" aria-label="Search contacts" /></div>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">{{ shown.length }} people · most engaged first</p>
        <ul class="mt-3 grid gap-3" :class="isMobile ? 'grid-cols-1' : 'grid-cols-3'">
          <li v-for="c in visible" :key="c.id" class="rounded-2xl border bg-card p-4 shadow-wd-card"><ContactsPersonRow :contact="c" stacked /></li>
        </ul>
        <p v-if="!shown.length" class="mt-3 text-sm text-muted-foreground">Nobody here.</p>
      </div>

      <!-- ───────────── E · Recommended ───────────── -->
      <div v-else class="mt-5">
        <div class="grid gap-2" :class="isMobile ? 'grid-cols-2' : 'grid-cols-6'">
          <button type="button" class="rounded-xl border p-3 text-left hover:border-primary/40" :class="f.email === 'can' ? 'border-primary bg-primary/8' : 'bg-card'" :aria-pressed="f.email === 'can'" @click="setEmail('can')">
            <p class="flex items-center gap-1.5 text-xs font-bold text-wd-green-700"><MailCheck class="size-3.5" aria-hidden="true" /> Can email</p>
            <p class="font-display text-2xl tabular-nums">{{ segs.canEmail }}</p>
          </button>
          <button type="button" class="rounded-xl border p-3 text-left hover:border-primary/40" :class="f.email === 'cant' ? 'border-primary bg-primary/8' : 'bg-card'" :aria-pressed="f.email === 'cant'" :title="`${segs.blocked.not_opted_in} never asked · ${segs.blocked.unsubscribed} unsubscribed`" @click="setEmail('cant')">
            <p class="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><MailX class="size-3.5" aria-hidden="true" /> Can’t email</p>
            <p class="font-display text-2xl tabular-nums">{{ segs.cantEmail }}</p>
          </button>
          <button v-for="a in (['going', 'regular', 'lapsed', 'new'] as const)" :key="a" type="button" class="rounded-xl border p-3 text-left hover:border-primary/40" :class="f.activity.includes(a) ? 'border-primary bg-primary/8' : 'bg-card'" :aria-pressed="f.activity.includes(a)" @click="toggleAct(a)">
            <p class="flex items-center gap-1.5 text-xs font-bold"><component :is="ACT_ICON[a]" class="size-3.5 text-wd-red-800" aria-hidden="true" /> {{ SHORT[a] }}</p>
            <p class="font-display text-2xl tabular-nums">{{ segs.activity[a] }}</p>
          </button>
        </div>
        <p v-if="segs.blocked.not_opted_in" class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><Info class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {{ segs.blocked.not_opted_in }} imported contacts never asked for your emails. You’ll be able to ask them once; whoever says yes becomes mailable.</p>
        <div class="mt-3 flex gap-1.5" :class="isMobile ? 'overflow-x-auto pb-1' : 'flex-wrap'">
          <Button v-for="s in segs.sources" :key="s.key" type="button" size="sm" class="shrink-0 rounded-full" :variant="f.sources.includes(s.key) ? 'soft' : 'outline'" :aria-pressed="f.sources.includes(s.key)" @click="toggleSource(s.key)">{{ s.label }} · {{ s.count }}</Button>
          <Button type="button" size="sm" class="shrink-0 rounded-full" :variant="f.activity.includes('follows') ? 'soft' : 'outline'" :aria-pressed="f.activity.includes('follows')" @click="toggleAct('follows')"><Heart /> Follow you · {{ segs.activity.follows }}</Button>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <div class="relative flex-1" :class="isMobile ? 'basis-full' : 'max-w-sm'"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input v-model="f.q" placeholder="Search name, email, note…" class="pl-9" aria-label="Search contacts" /></div>
          <span class="text-sm text-muted-foreground">{{ shown.length }} shown</span>
          <button v-if="isFiltered(f)" type="button" class="text-sm text-muted-foreground underline underline-offset-2" @click="clear">clear</button>
          <button type="button" class="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline" @click="sort = sort === 'newest' ? 'engaged' : 'newest'"><ArrowDownWideNarrow class="size-4" aria-hidden="true" /> {{ sort === 'newest' ? 'Newest first' : 'Most engaged first' }}</button>
        </div>
        <ul class="mt-3 divide-y rounded-2xl border bg-card shadow-wd-card">
          <li v-for="c in visible" :key="c.id" class="p-4"><ContactsPersonRow :contact="c" /></li>
          <li v-if="!shown.length" class="p-4 text-sm text-muted-foreground">No contact matches.</li>
        </ul>
      </div>

      <div v-if="segs.total && shown.length > more && (variant !== 'C' || cTile)" class="mt-3 text-center">
        <Button type="button" variant="outline-pill" size="pill-sm" @click="more += LIMIT">Show more ({{ shown.length - more }})</Button>
      </div>
      <p class="mt-6 text-xs text-muted-foreground">Layout options only: nothing on this page writes, sends or deletes. Emails: {{ EMAIL_BLOCK_LABEL.not_opted_in.toLowerCase() }} = imported lists and wedance.vip subscribers, until we decide who may be emailed.</p>
    </div>
  </div>
</template>
