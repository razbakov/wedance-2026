<script setup lang="ts">
/**
 * Sketch (RAZ-970): help a city admin (e.g. @wedancemunich) make posts about dance & culture —
 * occasions like the silent days (Tanzverbot), Halloween, Fasching, New Year's Eve — without
 * researching and writing them from scratch, and ask the city's organisers what they plan.
 *
 * Today /business/network/<handle>/city has Weekly post · Channels · Local groups. The weekly
 * post is written only from the week's events: it doesn't know Wed 18 Nov is a silent day, there
 * is no post that isn't a list of events, and no way to reach the city's organisers.
 *
 * Four directions, clickable, mock data only — nothing is posted, nothing hits the DB.
 */
import {
  ArrowLeft, CalendarDays, Instagram, Send, Sparkles, Moon, PartyPopper, Ghost, Sun,
  Check, X, Mail, MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, Clock, BookOpen, Inbox,
} from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — City occasions sketches' })

type Variant = 'A' | 'B' | 'C' | 'D'
const VARIANTS: { id: Variant, name: string, idea: string, good: string, cost: string }[] = [
  {
    id: 'A',
    name: 'Occasions tab',
    idea: 'A fourth tab next to Weekly post: the city’s upcoming occasions as a list, each with its post deadline and a ready draft.',
    good: 'One clear home. Easy to build next to the existing tabs. Works the same on a phone.',
    cost: 'The admin has to remember to open it. The weekly post still doesn’t know about silent days.',
  },
  {
    id: 'B',
    name: 'Inside the weekly post',
    idea: 'No new place. The week the admin is already posting shows its occasions: a banner, a warning on events that fall on a silent day, and the explainer post one tap away.',
    good: 'Zero new navigation: it shows up exactly when the admin is posting anyway. Fixes the weekly post saying nothing about Tanzverbot.',
    cost: 'Only sees one week ahead — too late for Halloween or New Year’s Eve, where organisers need weeks of notice.',
  },
  {
    id: 'C',
    name: 'Year planner',
    idea: 'A “Plan” tab with the next 12 months: every occasion as a chip on its month, coloured by what’s done. Click to open the draft or ask organisers.',
    good: 'The real planning view: lead times, gaps and the whole season at a glance. Same place to plan the city’s own posts later.',
    cost: 'Biggest build. A month grid is cramped on a phone (it falls back to a list). Planning screens tend to be opened once and forgotten.',
  },
  {
    id: 'D',
    name: 'To-do feed',
    idea: 'The city page opens on “What to do now”: dated prompts — post the Tanzverbot explainer today, ask organisers about New Year’s Eve by 1 Dec — each with one button.',
    good: 'Proactive and phone-first: the admin never has to plan, WeDance tells them what’s next and when. Asking organisers is a first-class step.',
    cost: 'No overview of the year. Needs a deadline rule per occasion. Feels nagging if too many prompts pile up.',
  },
]

const variant = ref<Variant>('A')
const device = ref<'desktop' | 'mobile'>('desktop')
const drafts = ref<'ready' | 'none'>('ready')
const isMobile = computed(() => device.value === 'mobile')
const current = computed(() => VARIANTS.find(v => v.id === variant.value)!)

// ── Mock data ───────────────────────────────────────────────────────────────
type Kind = 'silent' | 'party' | 'season'
type Status = 'todo' | 'draft' | 'posted' | 'asked'
interface Occasion {
  id: string
  name: string
  local?: string
  date: string // display
  month: string // 'Nov 2026'
  kind: Kind
  note: string
  due: string
  dueSoon?: boolean
  post?: 'tanzverbot' | 'nye' | 'fasching' | 'reminder'
  ask?: boolean
  status: Status
}
const OCCASIONS: Occasion[] = [
  { id: 'bub', name: 'Day of Prayer and Repentance', local: 'Buß- und Bettag', date: 'Wed 18 Nov', month: 'Nov 2026', kind: 'silent', note: 'Silent day · no public dancing 02:00–24:00', due: 'Post by Tue 17 Nov', dueSoon: true, post: 'tanzverbot', status: 'draft' },
  { id: 'tot', name: 'Totensonntag', date: 'Sun 22 Nov', month: 'Nov 2026', kind: 'silent', note: 'Silent day · Saturday night ends at 02:00', due: 'Story on Sat 21 Nov', post: 'reminder', status: 'draft' },
  { id: 'xmas', name: 'Christmas Eve', local: 'Heiligabend', date: 'Thu 24 Dec', month: 'Dec 2026', kind: 'silent', note: 'Silent day from 14:00', due: 'Story on Wed 23 Dec', post: 'reminder', status: 'draft' },
  { id: 'nye', name: 'New Year’s Eve', local: 'Silvester', date: 'Thu 31 Dec', month: 'Dec 2026', kind: 'party', note: 'Not a silent day — the biggest party night', due: 'Ask organisers by Tue 1 Dec', ask: true, post: 'nye', status: 'todo' },
  { id: 'fasching', name: 'Fasching', date: 'Thu 4 – Tue 9 Feb', month: 'Feb 2027', kind: 'party', note: 'Costume parties, Weiberfastnacht', due: 'Ask organisers by Thu 14 Jan', ask: true, post: 'fasching', status: 'todo' },
  { id: 'ash', name: 'Ash Wednesday', local: 'Aschermittwoch', date: 'Wed 10 Feb', month: 'Feb 2027', kind: 'silent', note: 'Silent day · Fasching ends at 02:00', due: 'Story on Tue 9 Feb', post: 'reminder', status: 'todo' },
  { id: 'easter', name: 'Easter silent days', local: 'Gründonnerstag – Karsamstag', date: 'Thu 25 – Sat 27 Mar', month: 'Mar 2027', kind: 'silent', note: 'Good Friday & Holy Saturday: all day', due: 'Repost the explainer by Tue 23 Mar', post: 'tanzverbot', status: 'todo' },
  { id: 'open', name: 'Open-air season', date: 'May – Sep', month: 'May 2027', kind: 'season', note: 'Outdoor socials by the Isar', due: 'Ask organisers by Thu 15 Apr', ask: true, status: 'todo' },
  { id: 'wiesn', name: 'Oktoberfest', date: 'Sat 18 Sep – Sun 3 Oct', month: 'Sep 2027', kind: 'season', note: 'The city is full — dancing beyond the Wiesn', due: 'Post by Mon 13 Sep', status: 'todo' },
  { id: 'hall', name: 'Halloween', date: 'Sun 31 Oct', month: 'Oct 2027', kind: 'party', note: 'Costume parties the weekend before', due: 'Ask organisers by Fri 1 Oct', ask: true, status: 'todo' },
]
const MONTHS = ['Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2027', 'May 2027', 'Jun 2027', 'Jul 2027', 'Aug 2027', 'Sep 2027', 'Oct 2027']

const statuses = ref<Record<string, Status>>({})
function resetStatuses() {
  statuses.value = Object.fromEntries(OCCASIONS.map(o => [o.id, drafts.value === 'none' && o.status === 'draft' ? 'todo' : o.status]))
}
resetStatuses()
const status = (o: Occasion) => statuses.value[o.id]

const KIND = {
  silent: { label: 'Silent day', icon: Moon, chip: 'bg-slate-800 text-white' },
  party: { label: 'Party', icon: PartyPopper, chip: 'bg-primary/10 text-wd-red-800' },
  season: { label: 'Season', icon: Sun, chip: 'bg-amber-100 text-amber-900' },
} as const
const STATUS = {
  todo: { label: 'To do', cls: 'bg-muted text-muted-foreground' },
  draft: { label: 'Draft ready', cls: 'bg-sky-100 text-sky-900' },
  posted: { label: 'Posted', cls: 'bg-wd-green-600/15 text-wd-green-700' },
  asked: { label: 'Organisers asked', cls: 'bg-violet-100 text-violet-900' },
} as const

// The Tanzverbot explainer, the one real draft (facts checked against BayFTG Art. 3 + muenchen.de).
type Lang = 'en' | 'es' | 'ru' | 'de'
const LANGS: { id: Lang, label: string }[] = [
  { id: 'en', label: 'English' }, { id: 'es', label: 'Español' }, { id: 'ru', label: 'Русский' }, { id: 'de', label: 'Deutsch' },
]
const TANZVERBOT: Record<Lang, { slides: string[], caption: string }> = {
  en: {
    slides: [
      'TANZVERBOT 🤫 Why Munich’s dance floors go quiet on some days',
      'On 9 “silent days” a year, Bavarian law says public events must keep a serious mood. In practice: no public dance parties. Bars can open — the dance floor stays closed.',
      'Usually 02:00–24:00. Good Friday & Holy Saturday: all day. Christmas Eve: from 14:00.',
      'Coming up: Wed 18 Nov · Sun 22 Nov · Thu 24 Dec from 14:00',
      'The night before is fine until 02:00. Private parties are not affected. New Year’s Eve is not a silent day.',
    ],
    caption: 'New to Munich and wondering why there’s no salsa party on Wednesday? 🤔 Meet the Tanzverbot — Bavaria’s “silent days”. Next ones: 18 & 22 November. Save this post 💃🕺 #wedancemunich #tanzverbot',
  },
  es: {
    slides: [
      'TANZVERBOT 🤫 Por qué en Múnich no se baila algunos días',
      'En 9 “días de silencio” al año, la ley de Baviera pide eventos de carácter serio. En la práctica: no hay fiestas de baile públicas.',
      'Normalmente de 02:00 a 24:00. Viernes y Sábado Santo: todo el día. Nochebuena: desde las 14:00.',
      'Próximas fechas: miér 18 nov · dom 22 nov · jue 24 dic desde las 14:00',
      'La noche anterior se baila hasta las 02:00. Las fiestas privadas no están afectadas. Nochevieja no es día de silencio.',
    ],
    caption: '¿Recién llegado a Múnich y no hay fiesta de salsa el miércoles? 🤔 Es el Tanzverbot. Los próximos: 18 y 22 de noviembre 💃🕺 #wedancemunich #tanzverbot',
  },
  ru: {
    slides: [
      'TANZVERBOT 🤫 Почему в Мюнхене в некоторые дни не танцуют',
      'В 9 «тихих дней» в году закон Баварии требует серьёзного характера мероприятий. На практике: никаких публичных танцевальных вечеринок.',
      'Обычно с 02:00 до 24:00. Страстная пятница и суббота — весь день. Сочельник — с 14:00.',
      'Ближайшие даты: ср 18 ноября · вс 22 ноября · чт 24 декабря с 14:00',
      'Накануне танцевать можно до 02:00. Частные вечеринки запрет не касается. Новый год — не «тихий день».',
    ],
    caption: 'Недавно в Мюнхене и в среду нет сальсы? 🤔 Это Tanzverbot. Ближайшие: 18 и 22 ноября 💃🕺 #wedancemunich #tanzverbot',
  },
  de: {
    slides: [
      'TANZVERBOT 🤫 Warum Münchens Tanzflächen an manchen Tagen still sind',
      'An 9 „stillen Tagen“ müssen öffentliche Veranstaltungen in Bayern einen ernsten Charakter wahren. Heißt: keine öffentlichen Tanzpartys.',
      'Meist 02:00–24:00. Karfreitag & Karsamstag: ganztags. Heiligabend: ab 14:00.',
      'Die nächsten: Mi 18.11. · So 22.11. · Do 24.12. ab 14:00',
      'In der Nacht davor bis 02:00. Private Feiern sind nicht betroffen. Silvester ist kein stiller Tag.',
    ],
    caption: 'Neu in München und keine Salsa-Party am Mittwoch? 🤔 Das ist das Tanzverbot. Die nächsten: 18. und 22. November 💃🕺 #wedancemunich #tanzverbot',
  },
}
const SLIDE_BG = ['bg-slate-900 text-white', 'bg-card', 'bg-card', 'bg-primary text-primary-foreground', 'bg-card']

// ── Shared overlays: the draft editor and "Ask organisers" ───────────────────
const editorFor = ref<Occasion | null>(null)
const askFor = ref<Occasion | null>(null)
const lang = ref<Lang>('en')
const postLangs = ref<Lang[]>(['en', 'es', 'ru'])
const writing = ref(false)
const written = ref<Record<string, boolean>>({})
const posted = ref<Record<string, string[]>>({})
const askSent = ref<Record<string, boolean>>({})
const askChannels = ref<('email' | 'inbox')[]>(['email', 'inbox'])
const ORGANISERS = [
  { name: 'Salsa Club München', events: 'NYE party · Thu 31 Dec' },
  { name: 'Bachata Sensual Munich', events: '4 events in Dec' },
  { name: 'Timba Munich', events: '2 events in Dec' },
  { name: 'Kizomba Lovers', events: '3 events in Dec' },
  { name: 'Tango Tanzhaus', events: 'weekly milonga' },
]
const picked = ref<string[]>(ORGANISERS.map(o => o.name))

function openEditor(o: Occasion) {
  editorFor.value = o
  askFor.value = null
  lang.value = 'en'
}
const hasDraft = computed(() => !!editorFor.value && (written.value[editorFor.value.id] || status(editorFor.value) !== 'todo'))
function write() {
  if (!editorFor.value) return
  writing.value = true
  const id = editorFor.value.id
  setTimeout(() => { writing.value = false; written.value[id] = true; if (statuses.value[id] === 'todo') statuses.value[id] = 'draft' }, 900)
}
function publish(where: string) {
  const o = editorFor.value
  if (!o) return
  posted.value[o.id] = [...(posted.value[o.id] ?? []), where]
  statuses.value[o.id] = 'posted'
}
const isPosted = (where: string) => !!editorFor.value && (posted.value[editorFor.value.id] ?? []).includes(where)
function sendAsk() {
  if (!askFor.value) return
  askSent.value[askFor.value.id] = true
  if (statuses.value[askFor.value.id] === 'todo') statuses.value[askFor.value.id] = 'asked'
}
const askMessage = computed(() => askFor.value
  ? `Hi! ${askFor.value.name} is coming (${askFor.value.date}). Are you planning something? Add it on WeDance or just reply here — we’ll put it in @wedancemunich’s ${askFor.value.name} post.`
  : '')
const draftKind = computed(() => editorFor.value?.post ?? 'tanzverbot')
const reminderText = computed(() => editorFor.value
  ? `Tomorrow (${editorFor.value.date}) is a silent day in Bavaria 🤫 Tonight you can dance until 02:00 — here’s where →`
  : '')

// B: week switcher over the weekly post.
const WEEKS = [
  {
    label: '16 – 22 Nov', occasions: ['bub', 'tot'],
    events: [
      { day: 'Tue 17', time: '20:00', name: 'Salsa Tuesday', venue: 'Bar Buena Vista' },
      { day: 'Wed 18', time: '21:00', name: 'Bachata Wednesday', venue: 'Tanzhaus', clash: true },
      { day: 'Fri 20', time: '21:00', name: 'Timba Night', venue: 'Rhythm Club' },
      { day: 'Sat 21', time: '22:00', name: 'Kizomba Saturday', venue: 'Studio K', note: 'ends 02:00 — Sunday is a silent day' },
      { day: 'Sun 22', time: '19:00', name: 'Sunday Milonga', venue: 'Tango Tanzhaus', clash: true },
    ],
  },
  {
    label: '21 – 27 Dec', occasions: ['xmas'],
    events: [
      { day: 'Wed 23', time: '21:00', name: 'Pre-Xmas Salsa', venue: 'Bar Buena Vista' },
      { day: 'Sat 26', time: '22:00', name: 'Boxing Day Bachata', venue: 'Rhythm Club' },
    ],
  },
  {
    label: '28 Dec – 3 Jan', occasions: ['nye'],
    events: [
      { day: 'Thu 31', time: '21:00', name: 'NYE Salsa Gala', venue: 'Salsa Club München' },
    ],
  },
]
const weekIdx = ref(0)
const week = computed(() => WEEKS[weekIdx.value])
const weekOccasions = computed(() => week.value.occasions.map(id => OCCASIONS.find(o => o.id === id)!))
const addLine = ref(false)

// D: feed of prompts, by deadline.
const FEED = computed(() => {
  const list = [
    { id: 'f1', occ: 'bub', when: 'Today', urgent: true, title: 'Post “What is Tanzverbot?”', why: 'Wed 18 Nov is a silent day. People new to Munich won’t know why their Wednesday party is off.', action: 'post' as const },
    { id: 'f2', occ: 'tot', when: 'Sat 21 Nov', title: 'Story: “Tonight until 02:00”', why: 'Sunday 22 Nov is Totensonntag.', action: 'post' as const },
    { id: 'f3', occ: 'nye', when: 'By Tue 1 Dec', title: 'Ask organisers about New Year’s Eve', why: '5 organisers have events in Munich in December. Their answers go in the NYE post.', action: 'ask' as const },
    { id: 'f4', occ: 'xmas', when: 'Wed 23 Dec', title: 'Story: Christmas Eve from 14:00', why: 'Silent day from 14:00 on Thu 24 Dec.', action: 'post' as const },
    { id: 'f5', occ: 'fasching', when: 'By Thu 14 Jan', title: 'Ask organisers about Fasching', why: 'Costume parties 4 – 9 Feb.', action: 'ask' as const },
  ]
  return list.map(f => ({ ...f, o: OCCASIONS.find(o => o.id === f.occ)! }))
})
const feedOpen = computed(() => FEED.value.filter(f => !['posted', 'asked'].includes(status(f.o))))
const feedDone = computed(() => FEED.value.filter(f => ['posted', 'asked'].includes(status(f.o))))
const showLater = ref(false)

// C: month the admin clicked on a phone.
const openMonth = ref<string>('Nov 2026')

watch([variant, device, drafts], () => {
  editorFor.value = null
  askFor.value = null
  written.value = {}
  posted.value = {}
  askSent.value = {}
  weekIdx.value = 0
  addLine.value = false
  showLater.value = false
  openMonth.value = 'Nov 2026'
  resetStatuses()
})

const cityTabs = computed(() => {
  const base = ['Weekly post', 'Channels', 'Local groups']
  if (variant.value === 'A') return ['Weekly post', 'Occasions', 'Channels', 'Local groups']
  if (variant.value === 'C') return ['Weekly post', 'Plan', 'Channels', 'Local groups']
  return base
})
const activeTab = computed(() => variant.value === 'A' ? 'Occasions' : variant.value === 'C' ? 'Plan' : 'Weekly post')
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground">
    <!-- Sketch controls (not part of any prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">City occasions sketch</span>
        <div class="flex rounded-full border border-border p-0.5 bg-background">
          <button
            v-for="v in VARIANTS" :key="v.id" type="button"
            class="px-3 h-8 rounded-full text-sm font-bold transition-colors"
            :class="variant === v.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'"
            @click="variant = v.id"
          >{{ v.id }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button"
            class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="device = d"
          >{{ d }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="s in (['ready', 'none'] as const)" :key="s" type="button"
            class="px-3 h-7 rounded-full font-semibold"
            :class="drafts === s ? 'bg-foreground text-background' : 'text-muted-foreground'"
            @click="drafts = s"
          >{{ s === 'ready' ? 'Drafts written' : 'Nothing written yet' }}</button>
        </div>
      </div>
      <div class="max-w-6xl mx-auto px-4 pb-3 text-xs leading-relaxed">
        <span class="font-bold">{{ current.id }} · {{ current.name }}.</span>
        <span class="text-muted-foreground"> {{ current.idea }}</span>
        <span class="text-wd-green-700"> Good: {{ current.good }}</span>
        <span class="text-wd-red-800"> Cost: {{ current.cost }}</span>
      </div>
    </div>

    <div class="py-6 px-4">
      <div
        class="relative mx-auto bg-background overflow-hidden"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-5xl rounded-2xl border border-border shadow-sm'"
        :style="isMobile ? { height: 'min(760px, calc(100vh - 180px))' } : { minHeight: '640px' }"
      >
        <div class="h-full overflow-y-auto" :class="isMobile ? 'p-4' : 'p-8'">
          <!-- Mock city admin header (as on /business/network/wedancemunich/city) -->
          <span class="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><ArrowLeft class="size-3.5" /> @wedancemunich</span>
          <h1 class="mt-3 font-display text-2xl font-bold">Munich</h1>
          <p class="text-sm text-muted-foreground">You run WeDance’s own channels for Munich.</p>

          <!-- D: to-do feed above the tabs -->
          <section v-if="variant === 'D'" class="mt-5" data-testid="todo-feed">
            <h2 class="flex items-center gap-2 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary"><Inbox class="size-4" /> What to do now</h2>
            <ul class="mt-3 grid gap-3">
              <li v-for="f in (showLater ? feedOpen : feedOpen.slice(0, 3))" :key="f.id" class="rounded-2xl border p-4" :class="f.urgent ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'">
                <div class="flex items-start gap-3" :class="isMobile ? 'flex-col' : ''">
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 text-xs">
                      <span class="font-bold" :class="f.urgent ? 'text-wd-red-800' : 'text-muted-foreground'"><Clock class="inline size-3.5 -mt-0.5" /> {{ f.when }}</span>
                      <span class="rounded-full px-2 py-0.5 font-bold" :class="KIND[f.o.kind].chip">{{ KIND[f.o.kind].label }} · {{ f.o.date }}</span>
                    </div>
                    <div class="mt-1 font-bold">{{ f.title }}</div>
                    <p class="text-sm text-muted-foreground">{{ f.why }}</p>
                  </div>
                  <div class="flex gap-2 shrink-0">
                    <Button v-if="f.action === 'post'" type="button" variant="pill" size="pill-sm" @click="openEditor(f.o)">{{ status(f.o) === 'draft' ? 'Review & post' : 'Write it' }}</Button>
                    <Button v-else type="button" variant="pill" size="pill-sm" @click="askFor = f.o; editorFor = null">Ask organisers</Button>
                    <Button type="button" variant="ghost" size="pill-sm" @click="statuses[f.o.id] = 'posted'">Skip</Button>
                  </div>
                </div>
              </li>
            </ul>
            <Button v-if="feedOpen.length > 3" type="button" variant="link" class="mt-2 h-auto p-0 text-xs font-bold" @click="showLater = !showLater">{{ showLater ? 'Show less' : `${feedOpen.length - 3} more later` }}</Button>
            <p v-if="feedDone.length" class="mt-2 text-xs text-muted-foreground"><Check class="inline size-3.5" /> Done: {{ feedDone.map(f => f.title).join(' · ') }}</p>
          </section>

          <!-- City tabs (mock) -->
          <div class="mt-5 inline-flex flex-wrap rounded-lg bg-muted p-1 text-sm">
            <span v-for="t in cityTabs" :key="t" class="rounded-md px-3 py-1.5 font-semibold" :class="t === activeTab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'">
              {{ t }}<span v-if="(t === 'Occasions' || t === 'Plan')" class="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">1</span>
            </span>
          </div>

          <!-- A: Occasions tab -->
          <section v-if="variant === 'A'" class="mt-5" data-testid="occasions-list">
            <p class="text-sm text-muted-foreground">Dates worth a post in Munich. Each comes with a draft we researched — check it, pick languages, post.</p>
            <template v-for="m in MONTHS" :key="m">
              <div v-if="OCCASIONS.some(o => o.month === m)" class="mt-5">
                <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">{{ m }}</h3>
                <ul class="mt-2 grid gap-2">
                  <li v-for="o in OCCASIONS.filter(x => x.month === m)" :key="o.id">
                    <button type="button" class="w-full text-left rounded-xl border border-border bg-card p-3 hover:border-primary/40 flex gap-3" :class="isMobile ? 'flex-col' : 'items-center'" @click="o.ask && status(o) === 'todo' ? (askFor = o) : openEditor(o)">
                      <span class="w-28 shrink-0 text-sm font-bold tabular-nums">{{ o.date }}</span>
                      <span class="flex-1 min-w-0">
                        <span class="font-bold">{{ o.name }}</span><span v-if="o.local" class="text-muted-foreground"> · {{ o.local }}</span>
                        <span class="block text-xs text-muted-foreground">{{ o.note }}</span>
                      </span>
                      <span class="flex flex-wrap items-center gap-2 text-xs">
                        <span class="rounded-full px-2 py-0.5 font-bold" :class="KIND[o.kind].chip">{{ KIND[o.kind].label }}</span>
                        <span :class="o.dueSoon ? 'font-bold text-wd-red-800' : 'text-muted-foreground'">{{ o.due }}</span>
                        <span class="rounded-full px-2 py-0.5 font-bold" :class="STATUS[status(o)].cls">{{ STATUS[status(o)].label }}</span>
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </template>
          </section>

          <!-- B: inside the weekly post -->
          <section v-if="variant === 'B'" class="mt-5" data-testid="weekly-post">
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-bold">Weekly post</h2>
              <div class="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous week" :disabled="weekIdx === 0" @click="weekIdx--; addLine = false"><ChevronLeft /></Button>
                <span class="min-w-[7.5rem] text-center text-sm font-bold">{{ week.label }}</span>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Next week" :disabled="weekIdx === WEEKS.length - 1" @click="weekIdx++; addLine = false"><ChevronRight /></Button>
              </div>
            </div>
            <div v-for="o in weekOccasions" :key="o.id" class="mt-3 rounded-2xl p-4" :class="o.kind === 'silent' ? 'bg-slate-900 text-white' : 'bg-primary/8 text-foreground'">
              <div class="flex items-start gap-3" :class="isMobile ? 'flex-col' : ''">
                <component :is="KIND[o.kind].icon" class="size-5 shrink-0" />
                <div class="flex-1">
                  <div class="font-bold">{{ o.date }} · {{ o.name }}<span v-if="o.local" class="opacity-70"> ({{ o.local }})</span></div>
                  <p class="text-sm opacity-80">{{ o.note }}</p>
                </div>
                <div class="flex flex-wrap gap-2 shrink-0">
                  <Button v-if="o.kind === 'silent'" type="button" size="pill-sm" :variant="addLine ? 'soft' : 'outline-pill'" @click="addLine = !addLine">{{ addLine ? 'Line added ✓' : 'Add a line to this post' }}</Button>
                  <Button v-if="o.ask" type="button" variant="outline-pill" size="pill-sm" @click="askFor = o">Ask organisers</Button>
                  <Button type="button" variant="pill" size="pill-sm" @click="openEditor(o)">{{ o.post === 'tanzverbot' ? 'Explainer post' : 'Story' }}</Button>
                </div>
              </div>
            </div>
            <div class="mt-4 grid gap-6" :class="isMobile ? '' : 'grid-cols-2'">
              <div>
                <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">1 · Events</h3>
                <ul class="mt-2 grid gap-1 text-sm">
                  <li v-for="e in week.events" :key="e.name" class="flex flex-wrap items-baseline gap-1">
                    <Check class="size-3.5 text-wd-green-700" />
                    <span class="font-bold w-14">{{ e.day }}</span><span class="tabular-nums text-muted-foreground">{{ e.time }}</span>
                    <span>{{ e.name }}</span><span class="text-muted-foreground">· {{ e.venue }}</span>
                    <span v-if="e.clash" class="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-900"><AlertTriangle class="size-3" /> on a silent day — dancing allowed?</span>
                    <span v-if="e.note" class="ml-1 text-xs text-muted-foreground">({{ e.note }})</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">2 · Text</h3>
                <pre class="mt-2 whitespace-pre-wrap rounded-xl border bg-card p-3 font-mono text-xs">💃 Dancing in Munich · {{ week.label }}
<template v-if="addLine">
🤫 {{ weekOccasions.filter(o => o.kind === 'silent').map(o => o.date).join(' & ') }}: silent days in Bavaria — no public dancing (02:00–24:00). What’s that? → see our Tanzverbot post
</template>
<template v-for="e in week.events" :key="e.name">
{{ e.day }} {{ e.time }} {{ e.name }} @ {{ e.venue }}</template></pre>
              </div>
            </div>
          </section>

          <!-- C: year planner -->
          <section v-if="variant === 'C'" class="mt-5" data-testid="year-plan">
            <p class="text-sm text-muted-foreground">The next 12 months in Munich. Click an occasion to open its post or ask organisers.</p>
            <div class="mt-3 flex flex-wrap gap-3 text-xs">
              <span v-for="(s, k) in STATUS" :key="k" class="rounded-full px-2 py-0.5 font-bold" :class="s.cls">{{ s.label }}</span>
            </div>
            <div v-if="!isMobile" class="mt-4 grid grid-cols-4 gap-3">
              <div v-for="m in MONTHS" :key="m" class="min-h-[7rem] rounded-xl border border-border bg-card p-2">
                <div class="text-xs font-bold text-muted-foreground">{{ m }}</div>
                <div class="mt-1 grid gap-1">
                  <button
                    v-for="o in OCCASIONS.filter(x => x.month === m)" :key="o.id" type="button"
                    class="flex items-center gap-1 rounded-lg px-2 py-1 text-left text-xs font-bold" :class="STATUS[status(o)].cls"
                    @click="o.ask && status(o) === 'todo' ? (askFor = o) : openEditor(o)"
                  >
                    <component :is="KIND[o.kind].icon" class="size-3 shrink-0" /> <span class="truncate">{{ o.name }}</span>
                  </button>
                  <span v-if="!OCCASIONS.some(x => x.month === m)" class="text-[11px] text-muted-foreground">Nothing yet · + Add your own</span>
                </div>
              </div>
            </div>
            <div v-else class="mt-4 grid gap-2">
              <div v-for="m in MONTHS.filter(mm => OCCASIONS.some(o => o.month === mm))" :key="m" class="rounded-xl border border-border bg-card">
                <button type="button" class="flex w-full items-center justify-between p-3 text-sm font-bold" @click="openMonth = openMonth === m ? '' : m">
                  {{ m }} <span class="text-xs text-muted-foreground">{{ OCCASIONS.filter(o => o.month === m).length }}</span>
                </button>
                <div v-if="openMonth === m" class="grid gap-1 px-3 pb-3">
                  <button v-for="o in OCCASIONS.filter(x => x.month === m)" :key="o.id" type="button" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold" :class="STATUS[status(o)].cls" @click="o.ask && status(o) === 'todo' ? (askFor = o) : openEditor(o)">
                    <component :is="KIND[o.kind].icon" class="size-3.5 shrink-0" /> {{ o.date }} · {{ o.name }}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- D: the existing weekly post under the feed (collapsed mock) -->
          <section v-if="variant === 'D'" class="mt-4 rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">
            Weekly post for 16 – 22 Nov · 5 events picked (today’s tool, unchanged)
          </section>
        </div>

        <!-- Draft editor (shared by all variants) -->
        <div v-if="editorFor" class="absolute inset-0 z-20 flex bg-black/40" :class="isMobile ? 'items-end' : 'justify-end'" @click.self="editorFor = null">
          <div class="bg-background overflow-y-auto p-5" :class="isMobile ? 'max-h-[88%] w-full rounded-t-3xl' : 'h-full w-[560px] border-l'" data-testid="draft-editor">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-xs font-bold text-muted-foreground">{{ editorFor.date }} · {{ KIND[editorFor.kind].label }}</div>
                <h2 class="font-display text-xl font-bold">{{ draftKind === 'tanzverbot' ? 'What is Tanzverbot?' : draftKind === 'reminder' ? `Story: ${editorFor.name}` : editorFor.name }}</h2>
                <p class="text-xs text-muted-foreground">{{ editorFor.due }}</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" @click="editorFor = null"><X /></Button>
            </div>

            <div v-if="!hasDraft" class="mt-6 rounded-2xl border-2 border-dashed border-input p-6 text-center">
              <Sparkles class="mx-auto size-6 text-primary" />
              <p class="mt-2 text-sm">WeDance researches {{ editorFor.name }} for Munich (law, dates, what’s still allowed) and writes a carousel + caption in your languages, with sources.</p>
              <Button type="button" variant="pill" size="pill-sm" class="mt-3" :loading="writing" @click="write">Write the post</Button>
            </div>

            <template v-else>
              <div class="mt-4 flex flex-wrap items-center gap-1">
                <button
                  v-for="l in LANGS" :key="l.id" type="button"
                  class="rounded-full border px-3 py-1 text-xs font-bold"
                  :class="lang === l.id ? 'border-foreground bg-foreground text-background' : 'border-border'"
                  @click="lang = l.id"
                >{{ l.label }}</button>
              </div>
              <label class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" :checked="postLangs.includes(lang)" @change="postLangs = postLangs.includes(lang) ? postLangs.filter(x => x !== lang) : [...postLangs, lang]">
                Post in {{ LANGS.find(l => l.id === lang)!.label }} ({{ postLangs.length }} chosen — first one on the slides, the rest as comments)
              </label>

              <template v-if="draftKind === 'reminder'">
                <div class="mt-4 mx-auto w-48 aspect-[9/16] rounded-2xl bg-slate-900 p-4 text-white text-sm font-bold flex items-center">{{ reminderText }}</div>
              </template>
              <template v-else-if="draftKind === 'tanzverbot'">
                <div class="mt-4 flex gap-2 overflow-x-auto pb-2">
                  <div v-for="(s, i) in TANZVERBOT[lang].slides" :key="i" class="aspect-[4/5] w-40 shrink-0 rounded-xl border p-3 text-xs font-bold leading-snug" :class="SLIDE_BG[i]">
                    <div class="mb-1 text-[10px] opacity-60">{{ i + 1 }}/5</div>{{ s }}
                  </div>
                </div>
                <textarea class="mt-3 w-full rounded-xl border bg-card p-3 text-sm" rows="4" :value="TANZVERBOT[lang].caption" />
              </template>
              <template v-else>
                <p class="mt-4 rounded-xl bg-muted p-3 text-sm">Draft for {{ editorFor.name }}: the parties organisers told us about, with times and links. <span v-if="!askSent[editorFor.id]">Ask organisers first to fill it.</span></p>
                <Button v-if="editorFor.ask" type="button" variant="outline-pill" size="pill-sm" class="mt-2" @click="askFor = editorFor; editorFor = null">Ask organisers</Button>
              </template>

              <div class="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                <BookOpen class="inline size-3.5 -mt-0.5" /> Checked against: Bavarian holiday law (BayFTG Art. 3) · muenchen.de “Stille Tage”. Dance classes aren’t covered by either — the post says “ask your school”.
              </div>

              <div class="mt-4 grid gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <Instagram class="size-4 text-primary" /> <span class="text-sm font-bold">@wedancemunich</span>
                  <span v-if="isPosted('feed')" class="text-xs font-bold text-wd-green-700">On the feed ✓</span>
                  <Button v-else type="button" variant="pill" size="pill-sm" @click="publish('feed')">Post to feed</Button>
                  <span v-if="isPosted('story')" class="text-xs font-bold text-wd-green-700">In the story ✓</span>
                  <Button v-else type="button" variant="outline-pill" size="pill-sm" @click="publish('story')">Add to story</Button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Send class="size-4 text-primary" /> <span class="text-sm font-bold">WeDance Munich · Salsa Munich (RU)</span>
                  <span v-if="isPosted('telegram')" class="text-xs font-bold text-wd-green-700">Posted ✓</span>
                  <Button v-else type="button" variant="outline-pill" size="pill-sm" @click="publish('telegram')">Post to Telegram</Button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Ask organisers (shared) -->
        <div v-if="askFor" class="absolute inset-0 z-30 flex bg-black/40" :class="isMobile ? 'items-end' : 'items-center justify-center'" @click.self="askFor = null">
          <div class="bg-background overflow-y-auto p-5" :class="isMobile ? 'max-h-[88%] w-full rounded-t-3xl' : 'w-[520px] rounded-2xl'" data-testid="ask-organisers">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="text-xs font-bold text-muted-foreground">{{ askFor.date }}</div>
                <h2 class="font-display text-xl font-bold">Ask organisers about {{ askFor.name }}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" @click="askFor = null"><X /></Button>
            </div>
            <template v-if="!askSent[askFor.id]">
              <h3 class="mt-4 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Who · organisers with events in Munich</h3>
              <ul class="mt-2 grid gap-1 text-sm">
                <li v-for="o in ORGANISERS" :key="o.name">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" :checked="picked.includes(o.name)" @change="picked = picked.includes(o.name) ? picked.filter(x => x !== o.name) : [...picked, o.name]">
                    <span class="font-semibold">{{ o.name }}</span><span class="text-xs text-muted-foreground">{{ o.events }}</span>
                  </label>
                </li>
              </ul>
              <h3 class="mt-4 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">How</h3>
              <div class="mt-2 flex flex-wrap gap-2 text-sm">
                <label class="flex items-center gap-1"><input type="checkbox" :checked="askChannels.includes('email')" @change="askChannels = askChannels.includes('email') ? askChannels.filter(c => c !== 'email') : [...askChannels, 'email']"> <Mail class="size-4" /> Email</label>
                <label class="flex items-center gap-1"><input type="checkbox" :checked="askChannels.includes('inbox')" @change="askChannels = askChannels.includes('inbox') ? askChannels.filter(c => c !== 'inbox') : [...askChannels, 'inbox']"> <MessageCircle class="size-4" /> WeDance inbox</label>
              </div>
              <h3 class="mt-4 text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Message</h3>
              <textarea class="mt-2 w-full rounded-xl border bg-card p-3 text-sm" rows="4" :value="askMessage" />
              <p class="text-xs text-muted-foreground">Their answer adds the event on WeDance, so it lands in the weekly post and the {{ askFor.name }} post by itself.</p>
              <Button type="button" variant="pill" size="pill-sm" class="mt-3" :disabled="!picked.length || !askChannels.length" @click="sendAsk">Send to {{ picked.length }} organisers</Button>
            </template>
            <div v-else class="mt-4 rounded-xl bg-wd-green-600/10 p-4 text-sm text-wd-green-700" role="status">
              <Check class="inline size-4" /> Sent to {{ picked.length }} organisers. You’ll see their answers here; the {{ askFor.name }} post fills itself as they add events.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
