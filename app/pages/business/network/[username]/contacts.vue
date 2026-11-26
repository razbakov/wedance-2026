<script setup lang="ts">
/**
 * /business/network/<handle>/contacts — the page's contacts (RAZ-412, redesigned
 * in RAZ-949 as layout A, "segment sidebar"): everyone who gave the page their
 * email — website sign-ups and imported lists (HubSpot, wedance.vip subscribers).
 * A rail on the left counts and filters by whether the page may email them,
 * where they came from (segment, and the channel — utm_source or referrer, RAZ-1074) and what they do on WeDance; on a phone it hides behind
 * a Filters button. Each contact shows its WeDance activity around the page's
 * events. Search, note, unsubscribe / resubscribe, delete, CSV of what's shown.
 * An event filter (`?event=<id>&as=<how>`, linked from the event's "Who's coming")
 * narrows the list to the contacts coming to one event and says how many others
 * signed up without being a contact.
 * "Email N" writes to the contacts shown that may be emailed (RAZ-975, BusinessContactMailing).
 * One audience (RAZ-963): the list also holds the page's followers and the people who went /
 * are going to its events without being contacts — each person once, marked Contact /
 * Follower / Event-goer. They show no email or phone, can't be emailed, aren't in the CSV and
 * have no note / unsubscribe / delete; "On WeDance, not a contact" under Came from narrows to the rest.
 * The rail (redesigned 19 Nov 2026): Email · Events (coming to one, going next, regulars, lapsed) ·
 * Came from (top 4, rest behind "more") · Channel (RAZ-1074) · More filters (new, follows, on WeDance), folded.
 * Data: businessSite.contactsOverview.
 */
import { Download, Search, Trash2, Globe, Route, StickyNote, Check, X, SlidersHorizontal, MailCheck, MailX, Users, CalendarCheck, Repeat, Moon, Sparkles, Heart, CalendarDays, Ticket, ChevronDown, Ellipsis } from 'lucide-vue-next'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui'
import { COMING_AS_LABEL, COMING_AS_ORDER, contactSegments, emailBlock, type ActivityFilter, type ComingAs, type ContactSourceKey } from '#shared/utils/contactSegments'
import { comingCounts, contactsCsv, describeFilter, emptyFilter, EVENT_ACTIVITY, filterContacts, isFiltered, OTHER_ACTIVITY, railOptions, sourceDetail, toggle, type ContactFilter } from '~/lib/contactFilters'

definePageMeta({ layout: 'business' })
const route = useRoute()
const { $trpc } = useNuxtApp()
const username = computed(() => String(route.params.username))

type Overview = Awaited<ReturnType<typeof $trpc.businessSite.contactsOverview.query>>
type Row = Overview['contacts'][number]
const data = ref<Overview | null>(null)
const error = ref<string | null>(null)
async function load() {
  try {
    data.value = await $trpc.businessSite.contactsOverview.query({ username: username.value })
    error.value = null
  } catch (e: any) { error.value = e?.message || 'Couldn’t load the contacts.' }
}
onMounted(load)
useHead(() => ({ title: `Contacts · ${data.value?.profile.name ?? ''} | Business | WeDance` }))

const all = computed<Row[]>(() => data.value?.contacts ?? [])
const onlyContacts = (l: Row[]) => l.filter(r => r.isContact)
// Counted here so a note, unsubscribe or delete shows at once; past the 2000-row
// cap the server's counts (everyone) are the right ones.
const segs = computed(() => (data.value?.truncated ? data.value.segments : contactSegments(all.value)))

const f = reactive<ContactFilter>(emptyFilter())
const railOpen = ref(false)

// The event filter lives in the URL, so "Who's coming" can link straight to it.
const router = useRouter()
const q1 = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined
f.event = q1(route.query.event) || null
f.as = (q1(route.query.as) as ComingAs) || null
if (f.event) railOpen.value = true
watch(() => [f.event, f.as] as const, ([event, as]) => {
  if (!event) f.as = null
  const query = { ...route.query, event: event || undefined, as: (event && as) || undefined }
  if (query.event !== q1(route.query.event) || query.as !== q1(route.query.as)) router.replace({ query })
})
const pageEvents = computed(() => data.value?.events ?? [])
const chosenEvent = computed(() => pageEvents.value.find(e => e.id === f.event) ?? null)
const eventCounts = computed(() => (f.event ? comingCounts(all.value, f.event) : { total: 0, by: {} }))
// Of those coming, how many are contacts (the rest are on the list without an email).
const eventContacts = computed(() => (f.event ? comingCounts(onlyContacts(all.value), f.event).total : 0))
const eventLabel = (e: { name: string, startDate: string, timezone: string | null }) =>
  `${new Date(e.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: e.timezone || 'Europe/Berlin' })} · ${e.name}`
const segment = computed(() => describeFilter(f, chosenEvent.value ? eventLabel(chosenEvent.value) : null))
const filterData = computed(() => ({ ...f, sources: [...f.sources], channels: [...f.channels], activity: [...f.activity] }))
const setAs = (a: ComingAs) => { f.as = f.as === a ? null : a }
const shown = computed(() => filterContacts(all.value, f))
const LIMIT = 60
const more = ref(LIMIT)
watch(shown, () => { more.value = LIMIT })
const visible = computed(() => shown.value.slice(0, more.value))

const ACT_ICON: Record<ActivityFilter, any> = { account: Users, follows: Heart, came: Ticket, going: CalendarCheck, regular: Repeat, lapsed: Moon, new: Sparkles }
const SHORT: Record<ActivityFilter, string> = { account: 'On WeDance', follows: 'Follow you', came: 'Came or coming', going: 'Going next', regular: 'Regulars', lapsed: 'Haven’t come in 3 months', new: 'New this month' }
const toggleSource = (k: ContactSourceKey) => { f.sources = toggle(f.sources, k) }
const toggleChannel = (k: string) => { f.channels = toggle(f.channels, k) }
const toggleCity = (k: string) => { f.cities = toggle(f.cities, k) }
const toggleAct = (a: ActivityFilter) => { f.activity = toggle(f.activity, a) }
const setEmail = (e: ContactFilter['email']) => { f.email = f.email === e ? 'any' : e }
// The rail, kept short: top sources up front, the rest behind "more"; event activity together;
// the rarely used filters folded away. Empty options are hidden unless picked.
const sourceRail = computed(() => railOptions(segs.value.sources, f.sources, 4))
const moreSources = ref(false)
const actOptions = (keys: readonly ActivityFilter[]) => railOptions(keys.map(key => ({ key, count: segs.value.activity[key] })), f.activity, keys.length).shown
const eventAct = computed(() => actOptions(EVENT_ACTIVITY))
const otherAct = computed(() => actOptions(OTHER_ACTIVITY))
const moreFilters = ref(OTHER_ACTIVITY.some(a => f.activity.includes(a)))
const cantEmailWhy = computed(() => [`${segs.value.blocked.not_opted_in} never asked for your emails`, segs.value.blocked.event_only ? `${segs.value.blocked.event_only} only for their event` : '', `${segs.value.blocked.unsubscribed} unsubscribed`, segs.value.blocked.bounced ? `${segs.value.blocked.bounced} bounced` : '', segs.value.blocked.not_a_contact ? `${segs.value.blocked.not_a_contact} not contacts (no email)` : ''].filter(Boolean).join(' · '))
// The CSV and "Email N" only ever get contacts.
const shownContacts = computed(() => onlyContacts(shown.value))
const clear = () => Object.assign(f, emptyFilter())
const filterCount = computed(() => f.sources.length + f.channels.length + f.cities.length + f.activity.length + (f.email !== 'any' ? 1 : 0) + (f.who !== 'any' ? 1 : 0) + (f.event ? 1 : 0))
// Cities typed on a site sign-up, most common first. The account city of someone who isn't a contact is not this.
const cityOptions = computed(() => {
  const counts = new Map<string, number>()
  for (const r of all.value) {
    const city = r.isContact ? r.city?.trim() : ''
    if (!city) continue
    counts.set(city, (counts.get(city) ?? 0) + 1)
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
})
const cityRail = computed(() => {
  const rail = railOptions(cityOptions.value, f.cities, 6)
  return [...rail.shown, ...rail.more]
})

const detail = (r: Row) => [r.city, r.locale?.toUpperCase(), sourceDetail(r.source), r.source?.promo_code ? `code ${r.source.promo_code}` : ''].filter(Boolean).join(' · ')

const editing = ref<string | null>(null)
const note = ref('')
async function saveNote(r: Row) {
  try { await $trpc.businessSite.updateContact.mutate({ username: username.value, id: r.id, note: note.value }); r.note = note.value; editing.value = null } catch (e: any) { error.value = e?.message || 'Couldn’t save the note.' }
}
async function setStatus(r: Row, status: 'subscribed' | 'unsubscribed') {
  try {
    await $trpc.businessSite.updateContact.mutate({ username: username.value, id: r.id, status })
    r.status = status
    r.emailBlock = emailBlock(r)
  } catch (e: any) { error.value = e?.message || 'Couldn’t change it.' }
}
const confirmRemove = ref<string | null>(null)
async function remove(r: Row) {
  try {
    await $trpc.businessSite.removeContact.mutate({ username: username.value, id: r.id })
    data.value!.contacts = data.value!.contacts.filter(x => x.id !== r.id)
    confirmRemove.value = null
  } catch (e: any) { error.value = e?.message || 'Couldn’t delete it.' }
}

function csv() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([contactsCsv(shownContacts.value)], { type: 'text/csv' }))
  a.download = `${username.value}-contacts.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <div>
    <AdminState v-if="!data && !error" kind="loading" />
    <AdminState v-else-if="!data" kind="error" :message="error!" />
    <template v-else>
      <AdminPageHeader
        eyebrow="Contacts"
        :title="data.profile.name"
        description="Everyone connected to your page, each once: contacts who gave you their email (website sign-ups, dancers who shared it at your event’s poll, the lists you imported), plus dancers who follow you or went to your events. Only contacts who signed up themselves can be emailed: filter the list, then “Email” writes to them."
        :back="{ to: `/business/network/${username}`, label: 'The profile' }"
      >
        <BusinessContactMailing :username="username" :contacts="shownContacts" :segment="segment" :filter="filterData" :event-id="f.event" />
        <Button variant="outline-pill" size="pill-sm" as-child>
          <NuxtLink :to="`/business/network/${username}/website`"><Globe /> Website</NuxtLink>
        </Button>
        <Button variant="outline-pill" size="pill-sm" :disabled="!shownContacts.length" @click="csv"><Download /> CSV<template v-if="isFiltered(f)"> · {{ shownContacts.length }}</template></Button>
      </AdminPageHeader>
      <p v-if="segs.total" class="mt-2 text-sm">
        <b>{{ segs.total }}</b> people · <b>{{ segs.contacts }}</b> contacts · <b>{{ segs.canEmail }}</b> can be emailed<template v-if="segs.others"> · {{ segs.others }} follow you or came to your events without being a contact</template>
      </p>
      <p v-if="data.truncated" class="mt-1 text-xs text-muted-foreground">The counts cover everyone; the list shows the newest 2000.</p>
      <AdminState v-if="error" kind="error" :message="error" class="mt-4" />

      <div v-if="f.event" class="mt-4 rounded-2xl border bg-card p-4 text-sm shadow-wd-card" data-contacts-event>
        <p class="font-bold">
          <CalendarDays class="mr-1 inline size-4" aria-hidden="true" />
          <template v-if="chosenEvent">{{ eventLabel(chosenEvent) }} · {{ chosenEvent.coming }} coming · {{ eventContacts }} in your contacts</template>
          <template v-else>Nobody has signed up for this event yet, or it was more than 30 days ago.</template>
        </p>
        <p v-if="chosenEvent && chosenEvent.coming > eventContacts" class="mt-1 text-muted-foreground">
          The other {{ chosenEvent.coming - eventContacts }} haven’t shared their contact with you<template v-if="eventCounts.total > eventContacts">: the {{ eventCounts.total - eventContacts }} on WeDance are in the list without an email</template>. Dancers can tick “Let {{ data.profile.name }} keep in touch” when they answer the event’s poll.
        </p>
        <Button type="button" variant="link" size="sm" class="h-auto p-0" @click="f.event = null"><X /> Show all contacts</Button>
      </div>

      <AdminState v-if="!segs.total" kind="empty" message="Nobody yet. People who sign up on your website, lists you import, your followers and the dancers going to your events show up here." class="mt-6" />

      <div v-else class="mt-5 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-6">
        <Button type="button" variant="outline" size="sm" class="mb-3 lg:hidden" :aria-expanded="railOpen" aria-controls="contacts-filters" @click="railOpen = !railOpen">
          <SlidersHorizontal /> Filters<template v-if="filterCount"> · {{ filterCount }}</template>
        </Button>
        <aside id="contacts-filters" class="mb-4 content-start gap-4 rounded-2xl border bg-card p-4 text-sm shadow-wd-card lg:sticky lg:top-6 lg:mb-0 lg:grid lg:self-start" :class="railOpen ? 'grid' : 'hidden'" aria-label="Filter contacts" data-contacts-rail>
          <section>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Email</h2>
            <div class="grid grid-cols-2 gap-1">
              <button v-for="e in (['can', 'cant'] as const)" :key="e" type="button" class="flex flex-col items-start rounded-lg border px-2 py-1.5 text-left hover:bg-accent" :class="f.email === e ? 'bg-primary/8 font-bold text-wd-red-800 border-primary/40' : ''" :aria-pressed="f.email === e" :title="e === 'cant' ? cantEmailWhy : 'Signed up for your emails themselves'" data-contacts-email @click="setEmail(e)">
                <span class="inline-flex items-center gap-1 text-xs"><component :is="e === 'can' ? MailCheck : MailX" class="size-3.5" aria-hidden="true" /> {{ e === 'can' ? 'Can email' : 'Can’t email' }}</span>
                <span class="text-base font-bold tabular-nums">{{ e === 'can' ? segs.canEmail : segs.cantEmail }}</span>
              </button>
            </div>
          </section>
          <section v-if="pageEvents.length || eventAct.length" data-contacts-events>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Events</h2>
            <label for="contacts-event" class="sr-only">Coming to</label>
            <select v-if="pageEvents.length" id="contacts-event" v-model="f.event" class="mb-1 w-full rounded-lg border bg-background px-2 py-1.5 text-sm" data-contacts-event-select>
              <option :value="null">Coming to any event</option>
              <option v-for="e in pageEvents" :key="e.id" :value="e.id">{{ eventLabel(e) }} ({{ e.coming }})</option>
            </select>
            <div v-if="f.event" class="mb-1 border-l-2 pl-2">
              <button v-for="a in COMING_AS_ORDER.filter(a => eventCounts.by[a])" :key="a" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" :class="f.as === a ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.as === a" @click="setAs(a)">
                <span>{{ COMING_AS_LABEL[a] }}</span><span class="tabular-nums">{{ eventCounts.by[a] }}</span>
              </button>
            </div>
            <button v-for="a in eventAct" :key="a.key" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" :class="f.activity.includes(a.key) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.activity.includes(a.key)" @click="toggleAct(a.key)">
              <span class="inline-flex items-center gap-2"><component :is="ACT_ICON[a.key]" class="size-4" aria-hidden="true" /> {{ SHORT[a.key] }}</span><span class="tabular-nums">{{ a.count }}</span>
            </button>
          </section>
          <section data-contacts-sources>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Came from</h2>
            <button v-for="s in [...sourceRail.shown, ...(moreSources ? sourceRail.more : [])]" :key="s.key" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" :class="f.sources.includes(s.key) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.sources.includes(s.key)" @click="toggleSource(s.key)">
              <span class="truncate">{{ s.label }}</span><span class="tabular-nums">{{ s.count }}</span>
            </button>
            <button v-if="sourceRail.more.length" type="button" class="mt-0.5 inline-flex items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" :aria-expanded="moreSources" @click="moreSources = !moreSources">
              <ChevronDown class="size-3.5 transition-transform" :class="moreSources ? 'rotate-180' : ''" aria-hidden="true" />{{ moreSources ? 'Fewer' : `${sourceRail.more.length} more` }}
            </button>
          </section>
          <section v-if="segs.channels?.some(c => c.key !== 'unknown')" data-contacts-channels>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Channel</h2>
            <button v-for="c in segs.channels" :key="c.key" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" :class="f.channels.includes(c.key) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.channels.includes(c.key)" data-contacts-channel @click="toggleChannel(c.key)">
              <span class="inline-flex min-w-0 items-center gap-2"><Route class="size-4 shrink-0" aria-hidden="true" /> <span class="truncate">{{ c.label }}</span></span><span class="tabular-nums">{{ c.count }}</span>
            </button>
            <p class="mt-1 px-2 text-xs text-muted-foreground">The link or site that brought them. Tag the links you share (utm_source) to see more here.</p>
          </section>
          <section v-if="cityRail.length" data-contacts-cities>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">City</h2>
            <button v-for="c in cityRail" :key="c.key" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" :class="f.cities.includes(c.key) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.cities.includes(c.key)" data-contacts-city @click="toggleCity(c.key)">
              <span class="truncate">{{ c.key }}</span><span class="tabular-nums">{{ c.count }}</span>
            </button>
          </section>
          <section v-if="otherAct.length" data-contacts-more>
            <button type="button" class="flex w-full items-center justify-between mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground hover:text-foreground" :aria-expanded="moreFilters" @click="moreFilters = !moreFilters">
              <span>More filters</span><ChevronDown class="size-3.5 transition-transform" :class="moreFilters ? 'rotate-180' : ''" aria-hidden="true" />
            </button>
            <template v-if="moreFilters">
              <button v-for="a in otherAct" :key="a.key" type="button" class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-accent" :class="f.activity.includes(a.key) ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.activity.includes(a.key)" @click="toggleAct(a.key)">
                <span class="inline-flex items-center gap-2"><component :is="ACT_ICON[a.key]" class="size-4" aria-hidden="true" /> {{ SHORT[a.key] }}</span><span class="tabular-nums">{{ a.count }}</span>
              </button>
            </template>
          </section>
          <Button v-if="isFiltered(f)" type="button" variant="ghost" size="sm" @click="clear"><X /> Clear filters</Button>
        </aside>

        <div class="min-w-0">
          <div class="mb-3 flex items-center gap-2">
            <div class="relative flex-1">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input v-model="f.q" placeholder="Search name, email, city, note, source…" class="pl-9" aria-label="Search people" />
            </div>
            <span class="text-sm text-muted-foreground tabular-nums" aria-live="polite">{{ shown.length }}</span>
          </div>
          <ul class="divide-y rounded-2xl border bg-card shadow-wd-card">
            <li v-for="r in visible" :key="r.id" class="grid grid-cols-[1fr_auto] gap-2 p-4" :data-contact-city="r.isContact && r.city ? r.city : undefined">
              <div class="min-w-0">
                <ContactsPersonRow :contact="r" :detail="detail(r)" :hide-note="editing === r.id" />
                <div v-if="editing === r.id" class="mt-2 grid gap-2 sm:pl-13">
                  <Textarea v-model="note" :rows="2" aria-label="Note" />
                  <div class="flex gap-2"><Button type="button" size="sm" variant="cta" @click="saveNote(r)"><Check /> Save note</Button><Button type="button" size="sm" variant="ghost" @click="editing = null">Cancel</Button></div>
                </div>
              </div>
              <div v-if="r.isContact" class="flex items-start gap-1" data-contacts-row-actions>
                <template v-if="confirmRemove === r.id">
                  <Button type="button" size="sm" variant="destructive" @click="remove(r)">Delete</Button>
                  <Button type="button" size="sm" variant="ghost" @click="confirmRemove = null">Keep</Button>
                </template>
                <DropdownMenuRoot v-else>
                  <DropdownMenuTrigger as-child>
                    <Button type="button" variant="ghost" size="icon" class="text-muted-foreground" :aria-label="`Actions for ${r.name || r.account?.name || r.email}`" data-contacts-row-menu><Ellipsis /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent align="end" :side-offset="4" class="z-50 min-w-[10rem] rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
                      <DropdownMenuItem class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent [&_svg]:size-4" @select="editing = r.id; note = r.note ?? ''"><StickyNote /> Note</DropdownMenuItem>
                      <DropdownMenuItem v-if="r.status === 'subscribed'" class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent [&_svg]:size-4" @select="setStatus(r, 'unsubscribed')"><MailX /> Unsubscribe</DropdownMenuItem>
                      <DropdownMenuItem v-else class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent [&_svg]:size-4" @select="setStatus(r, 'subscribed')"><MailCheck /> Resubscribe</DropdownMenuItem>
                      <DropdownMenuItem class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent [&_svg]:size-4 text-destructive data-[highlighted]:text-destructive" @select="confirmRemove = r.id"><Trash2 /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenuRoot>
              </div>
            </li>
            <li v-if="!shown.length" class="p-4 text-sm text-muted-foreground">Nobody matches. <button v-if="isFiltered(f)" type="button" class="underline underline-offset-2" @click="clear">Clear filters</button></li>
          </ul>
          <div v-if="shown.length > more" class="mt-3 text-center">
            <Button type="button" variant="outline-pill" size="pill-sm" @click="more += LIMIT">Show more ({{ shown.length - more }})</Button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
