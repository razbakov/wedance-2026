<script setup lang="ts">
/**
 * /business/network/<handle>/contacts — the page's contacts (RAZ-412, redesigned
 * in RAZ-949 as layout A, "segment sidebar"): everyone who gave the page their
 * email — website sign-ups and imported lists (HubSpot, wedance.vip subscribers).
 * A rail on the left counts and filters by whether the page may email them,
 * where they came from and what they do on WeDance; on a phone it hides behind
 * a Filters button. Each contact shows its WeDance activity around the page's
 * events. Search, note, unsubscribe / resubscribe, delete, CSV of what's shown.
 * Data: businessSite.contactsOverview. Nothing here sends email (RAZ-960).
 */
import { Download, Search, Trash2, Globe, StickyNote, Check, X, SlidersHorizontal, MailCheck, MailX, Users, CalendarCheck, Repeat, Moon, Sparkles, Heart } from 'lucide-vue-next'
import { ACTIVITY_FILTERS, contactSegments, emailBlock, type ActivityFilter, type ContactSourceKey } from '#shared/utils/contactSegments'
import { contactsCsv, emptyFilter, filterContacts, isFiltered, sourceDetail, toggle, type ContactFilter } from '~/lib/contactFilters'

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
// Counted here so a note, unsubscribe or delete shows at once; past the 2000-row
// cap the server's counts (everyone) are the right ones.
const segs = computed(() => (data.value?.truncated ? data.value.segments : contactSegments(all.value)))

const f = reactive<ContactFilter>(emptyFilter())
const railOpen = ref(false)
const shown = computed(() => filterContacts(all.value, f))
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
const filterCount = computed(() => f.sources.length + f.activity.length + (f.email !== 'any' ? 1 : 0))

const detail = (r: Row) => [r.locale?.toUpperCase(), sourceDetail(r.source), r.source?.promo_code ? `code ${r.source.promo_code}` : ''].filter(Boolean).join(' · ')

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
  a.href = URL.createObjectURL(new Blob([contactsCsv(shown.value)], { type: 'text/csv' }))
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
        description="Everyone who gave you their email: sign-ups on your website and the lists you imported. Only people who signed up themselves can be emailed."
        :back="{ to: `/business/network/${username}`, label: 'The profile' }"
      >
        <Button variant="outline-pill" size="pill-sm" as-child>
          <NuxtLink :to="`/business/network/${username}/website`"><Globe /> Website</NuxtLink>
        </Button>
        <Button variant="outline-pill" size="pill-sm" :disabled="!shown.length" @click="csv"><Download /> CSV<template v-if="isFiltered(f)"> · {{ shown.length }}</template></Button>
      </AdminPageHeader>
      <p v-if="segs.total" class="mt-2 text-sm">
        <b>{{ segs.total }}</b> contacts · <b>{{ segs.canEmail }}</b> can be emailed<template v-if="data.followers.notContacts"> · {{ data.followers.notContacts }} more follow you without being a contact</template>
      </p>
      <p v-if="data.truncated" class="mt-1 text-xs text-muted-foreground">The counts cover everyone; the list shows the newest 2000.</p>
      <AdminState v-if="error" kind="error" :message="error" class="mt-4" />

      <AdminState v-if="!segs.total" kind="empty" message="No contacts yet. People who sign up on your website, and lists you import, show up here." class="mt-6" />

      <div v-else class="mt-5 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-6">
        <Button type="button" variant="outline" size="sm" class="mb-3 lg:hidden" :aria-expanded="railOpen" aria-controls="contacts-filters" @click="railOpen = !railOpen">
          <SlidersHorizontal /> Filters<template v-if="filterCount"> · {{ filterCount }}</template>
        </Button>
        <aside id="contacts-filters" class="mb-4 content-start gap-5 rounded-2xl border bg-card p-4 text-sm shadow-wd-card lg:sticky lg:top-6 lg:mb-0 lg:grid lg:self-start" :class="railOpen ? 'grid' : 'hidden'" aria-label="Filter contacts">
          <section>
            <h2 class="mb-1 text-eyebrow font-black uppercase tracking-widest text-muted-foreground">Email</h2>
            <button v-for="e in (['can', 'cant'] as const)" :key="e" type="button" class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-accent" :class="f.email === e ? 'bg-primary/8 font-bold text-wd-red-800' : ''" :aria-pressed="f.email === e" @click="setEmail(e)">
              <span class="inline-flex items-center gap-2"><component :is="e === 'can' ? MailCheck : MailX" class="size-4" aria-hidden="true" /> {{ e === 'can' ? 'Can email' : 'Can’t email' }}</span>
              <span class="tabular-nums">{{ e === 'can' ? segs.canEmail : segs.cantEmail }}</span>
            </button>
            <p class="mt-1 px-2 text-xs text-muted-foreground">{{ segs.blocked.not_opted_in }} never asked for your emails · {{ segs.blocked.unsubscribed }} unsubscribed</p>
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
            <div class="relative flex-1">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input v-model="f.q" placeholder="Search name, email, note, source…" class="pl-9" aria-label="Search contacts" />
            </div>
            <span class="text-sm text-muted-foreground tabular-nums" aria-live="polite">{{ shown.length }}</span>
          </div>
          <ul class="divide-y rounded-2xl border bg-card shadow-wd-card">
            <li v-for="r in visible" :key="r.id" class="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
              <div class="min-w-0">
                <ContactsPersonRow :contact="r" :detail="detail(r)" :hide-note="editing === r.id" />
                <div v-if="editing === r.id" class="mt-2 grid gap-2 sm:pl-13">
                  <Textarea v-model="note" :rows="2" aria-label="Note" />
                  <div class="flex gap-2"><Button type="button" size="sm" variant="cta" @click="saveNote(r)"><Check /> Save note</Button><Button type="button" size="sm" variant="ghost" @click="editing = null">Cancel</Button></div>
                </div>
              </div>
              <div class="flex flex-wrap items-start gap-1 pl-13 sm:pl-0">
                <Button type="button" size="sm" variant="ghost" @click="editing = r.id; note = r.note ?? ''"><StickyNote /> Note</Button>
                <Button v-if="r.status === 'subscribed'" type="button" size="sm" variant="ghost" @click="setStatus(r, 'unsubscribed')">Unsubscribe</Button>
                <Button v-else type="button" size="sm" variant="ghost" @click="setStatus(r, 'subscribed')">Resubscribe</Button>
                <Button v-if="confirmRemove !== r.id" type="button" size="icon" variant="ghost" aria-label="Delete contact" @click="confirmRemove = r.id"><Trash2 /></Button>
                <template v-else>
                  <Button type="button" size="sm" variant="destructive" @click="remove(r)">Delete</Button>
                  <Button type="button" size="sm" variant="ghost" @click="confirmRemove = null">Keep</Button>
                </template>
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
