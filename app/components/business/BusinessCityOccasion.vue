<script setup lang="ts">
/**
 * One occasion of the city's plan (RAZ-970): its post — written in the languages the admin
 * picks (silent days: the Tanzverbot explainer; parties: the city's parties on WeDance), the
 * picture, then Instagram feed / story and Telegram, each once — and "Ask organisers": an
 * email to the organisers with events in the city, asking what they plan.
 *
 *   <BusinessCityOccasion city-slug="munich" occasion-key="buss-und-bettag:2026" tab="post" />
 */
import { Image as ImageIcon, Instagram, Send, Copy, Check, RotateCcw, ExternalLink, AlertTriangle, Mail, Moon, PartyPopper, Sun } from 'lucide-vue-next'
import { LANGS, type Lang } from '#shared/utils/cityOccasions'

const props = defineProps<{ citySlug: string; occasionKey: string; tab?: 'post' | 'ask' }>()
const { $trpc } = useNuxtApp()
const { track } = useTrack()

type Post = Awaited<ReturnType<typeof $trpc.cityOccasions.get.query>>
type Organisers = Awaited<ReturnType<typeof $trpc.cityOccasions.organisers.query>>
const post = ref<Post | null>(null)
const loading = ref(true)
const busy = ref<string | null>(null)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const text = ref('')
const tab = ref<'post' | 'ask'>(props.tab ?? 'post')
const input = computed(() => ({ citySlug: props.citySlug, key: props.occasionKey }))

async function load() {
  try {
    post.value = await $trpc.cityOccasions.get.query(input.value)
    text.value = post.value.text
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t load this occasion.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function run(key: string, fn: () => Promise<unknown>, done?: string) {
  busy.value = key
  error.value = null
  notice.value = null
  try {
    await fn()
    if (done) notice.value = done
    await load()
  } catch (e: any) {
    error.value = e?.message || 'Something went wrong.'
  } finally {
    busy.value = null
  }
}

const KIND = { silent: { label: 'Silent day', icon: Moon }, party: { label: 'Party', icon: PartyPopper }, season: { label: 'Season', icon: Sun } } as const
const day = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
const fmt = (at: string | Date) => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// ── Post ────────────────────────────────────────────────────────────────────
function toggleLang(l: Lang) {
  if (!post.value) return
  const has = post.value.langs.includes(l)
  if (has && post.value.langs.length === 1) return
  const langs = has ? post.value.langs.filter(x => x !== l) : [...post.value.langs, l]
  run('langs', () => $trpc.cityOccasions.save.mutate({ ...input.value, langs: langs as Lang[] }))
}
function makeFirst(l: Lang) {
  if (!post.value || post.value.langs[0] === l) return
  run('langs', () => $trpc.cityOccasions.save.mutate({ ...input.value, langs: [l, ...post.value!.langs.filter(x => x !== l)] as Lang[] }))
}
function saveText() {
  if (!post.value || text.value === post.value.text) return
  run('text', () => $trpc.cityOccasions.save.mutate({ ...input.value, text: text.value }))
}
const resetText = () => run('text', () => $trpc.cityOccasions.save.mutate({ ...input.value, text: null }))
const draw = () => run('draw', () => $trpc.cityOccasions.drawImage.mutate(input.value))
function postInstagram(to: 'feed' | 'story') {
  run(to, async () => {
    const r = await $trpc.cityOccasions.publishInstagram.mutate({ ...input.value, to })
    track('city_occasion_published', { city: props.citySlug, occasion: post.value?.occasion.id, to: to === 'feed' ? 'instagram_feed' : 'instagram_story' })
    return r
  }, to === 'feed' ? 'Posted to the feed.' : 'Added to the story.')
}
function postTelegram() {
  run('telegram', async () => {
    const r = await $trpc.cityOccasions.publishTelegram.mutate(input.value)
    const failed = r.results.filter(x => !x.ok)
    if (failed.length) throw new Error(failed.map(f => `${f.name}: ${f.error}`).join(' · '))
    track('city_occasion_published', { city: props.citySlug, occasion: post.value?.occasion.id, to: 'telegram' })
  }, 'Posted to Telegram.')
}
const copied = ref(false)
async function copy() {
  try { await navigator.clipboard.writeText(text.value); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch {}
}
const telegramLinks = computed(() => (post.value?.posted.telegram ?? []).filter(t => t.url))

// ── Ask organisers ──────────────────────────────────────────────────────────
const organisers = ref<Organisers | null>(null)
const picked = ref<string[]>([])
const message = ref('')
async function loadOrganisers() {
  try {
    organisers.value = await $trpc.cityOccasions.organisers.query(input.value)
    message.value = organisers.value.message
    picked.value = organisers.value.pages.filter(p => p.reachable && !p.asked).map(p => p.id)
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t load the organisers.'
  }
}
watch(tab, t => { if (t === 'ask' && !organisers.value) loadOrganisers() }, { immediate: true })
function togglePick(id: string) {
  picked.value = picked.value.includes(id) ? picked.value.filter(x => x !== id) : [...picked.value, id]
}
function ask() {
  run('ask', async () => {
    const r = await $trpc.cityOccasions.ask.mutate({ ...input.value, profileIds: picked.value, message: message.value })
    track('city_occasion_asked', { city: props.citySlug, occasion: post.value?.occasion.id, pages: r.pages })
    notice.value = `Asked ${r.pages} organiser${r.pages === 1 ? '' : 's'} (${r.emails} email${r.emails === 1 ? '' : 's'}).`
    await loadOrganisers()
  })
}
</script>

<template>
  <div data-testid="city-occasion">
    <AdminState v-if="loading" kind="loading" />
    <AdminState v-else-if="!post" kind="error" :message="error ?? 'Not found.'" />
    <template v-else>
      <div class="text-xs font-bold text-muted-foreground">
        <component :is="KIND[post.occasion.kind].icon" class="inline size-3.5 -mt-0.5" aria-hidden="true" />
        {{ KIND[post.occasion.kind].label }} · {{ post.occasion.when }} · {{ post.cityName }}
      </div>
      <DialogTitle class="font-display text-xl font-bold">
        {{ post.occasion.post === 'silent' ? `Tanzverbot · ${post.occasion.name}` : post.occasion.name }}
      </DialogTitle>
      <p class="text-sm text-muted-foreground">
        {{ post.occasion.note }}<template v-if="post.occasion.localName"> · {{ post.occasion.localName }}</template>.
        Post by {{ day(post.occasion.postBy) }}<template v-if="post.occasion.askBy">, ask organisers by {{ day(post.occasion.askBy) }}</template>.
      </p>

      <Tabs v-if="post.occasion.askBy" v-model="tab" class="mt-3">
        <TabsList>
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="ask">Ask organisers <span v-if="post.asked" class="ml-1 text-wd-green-700">✓</span></TabsTrigger>
        </TabsList>
      </Tabs>

      <p v-if="error" class="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert"><AlertTriangle class="size-4 mt-0.5 shrink-0" aria-hidden="true" />{{ error }}</p>
      <p v-if="notice" class="mt-3 rounded-xl bg-wd-green-600/10 p-3 text-sm text-wd-green-700" role="status">{{ notice }}</p>

      <!-- Post -->
      <div v-if="tab === 'post'" class="mt-4 grid gap-5">
        <div>
          <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">1 · Languages</h3>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="l in LANGS" :key="l.id" type="button"
              class="rounded-full border px-3 py-1 text-xs font-bold"
              :class="post.langs.includes(l.id) ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'"
              :aria-pressed="post.langs.includes(l.id)"
              :disabled="busy === 'langs'"
              @click="toggleLang(l.id)"
            >{{ l.flag }} {{ l.label }}</button>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">
            First on the picture and in the text: <strong>{{ LANGS.find(l => l.id === post!.langs[0])?.label }}</strong>.
            <template v-for="l in post.langs.slice(1)" :key="l"> <button type="button" class="underline" @click="makeFirst(l)">Make {{ LANGS.find(x => x.id === l)?.label }} first</button></template>
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">2 · Text</h3>
            <div class="flex items-center gap-1">
              <Button v-if="post.textEdited" type="button" variant="ghost" size="sm" class="h-7 text-xs" :disabled="!!busy" @click="resetText"><RotateCcw /> Rewrite</Button>
              <Button type="button" variant="ghost" size="sm" class="h-7 text-xs" @click="copy"><component :is="copied ? Check : Copy" /> {{ copied ? 'Copied' : 'Copy' }}</Button>
            </div>
          </div>
          <Field id="city-occasion-text" label="Post text" hide-label :hint="post.textEdited ? 'Edited by hand: changing languages no longer rewrites it.' : post.occasion.post === 'silent' ? 'Checked against the Bavarian holiday law (BayFTG Art. 3) and muenchen.de. Edit freely.' : `Written from the ${post.events} parties listed on WeDance for these days. Edit freely.`">
            <Textarea v-model="text" rows="12" class="font-mono text-xs" @blur="saveText" />
          </Field>
          <p class="mt-1 text-xs" :class="text.length > 2200 ? 'text-destructive font-bold' : 'text-muted-foreground'">{{ text.length }} characters · Instagram keeps 2,200<template v-if="text.length > 2200"> — drop a language</template>.</p>
        </div>

        <div>
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">3 · Picture</h3>
            <Button type="button" variant="outline-pill" size="pill-sm" :loading="busy === 'draw'" @click="draw"><ImageIcon /> {{ post.image ? 'Redraw' : 'Draw picture' }}</Button>
          </div>
          <p v-if="post.image?.stale" class="mt-2 text-xs text-wd-red-800">The post changed since it was drawn. Redraw before posting.</p>
          <img v-if="post.image" :src="post.image.url" alt="The occasion picture" class="mt-3 w-full max-w-xs rounded-xl border" :class="post.image.stale ? 'opacity-50' : ''">
        </div>

        <div>
          <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">4 · Post</h3>
          <div class="mt-3 grid gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <Instagram class="size-4 text-primary" aria-hidden="true" />
              <template v-if="post.targets.instagram">
                <span class="text-sm font-bold">@{{ post.targets.instagram }}</span>
                <a v-if="post.posted.feed" :href="post.posted.feed.permalink || '#'" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-bold text-wd-green-700">On the feed · {{ fmt(post.posted.feed.at) }} <ExternalLink class="size-3" aria-hidden="true" /></a>
                <Button v-else type="button" variant="pill" size="pill-sm" :loading="busy === 'feed'" :disabled="!post.image || post.image.stale || !!busy" @click="postInstagram('feed')">Post to feed</Button>
                <span v-if="post.posted.story" class="text-xs font-bold text-wd-green-700">In the story · {{ fmt(post.posted.story.at) }}</span>
                <Button v-else type="button" variant="outline-pill" size="pill-sm" :loading="busy === 'story'" :disabled="!post.image || post.image.stale || !!busy" @click="postInstagram('story')">Add to story</Button>
              </template>
              <span v-else class="text-sm text-muted-foreground">
                Not connected.
                <NuxtLink v-if="post.page" :to="`/business/network/${post.page.username}`" class="font-bold underline">Connect Instagram on @{{ post.page.username }}</NuxtLink>
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Send class="size-4 text-primary" aria-hidden="true" />
              <template v-if="post.targets.telegram.length && post.targets.telegramConfigured">
                <span class="text-sm font-bold">{{ post.targets.telegram.map(t => t.name).join(', ') }}</span>
                <Button type="button" variant="pill" size="pill-sm" :loading="busy === 'telegram'" :disabled="!!busy || post.posted.telegram.length === post.targets.telegram.length" @click="postTelegram">
                  {{ post.posted.telegram.length ? (post.posted.telegram.length === post.targets.telegram.length ? 'Posted' : 'Post to the rest') : 'Post to Telegram' }}
                </Button>
                <a v-for="t in telegramLinks" :key="t.chatId" :href="t.url!" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-bold text-wd-green-700">{{ t.chatId }} <ExternalLink class="size-3" aria-hidden="true" /></a>
              </template>
              <span v-else-if="!post.targets.telegramConfigured" class="text-sm text-muted-foreground">The WeDance Telegram bot isn’t set up on this server yet.</span>
              <span v-else class="text-sm text-muted-foreground">No Telegram channel yet: add one under Channels with its @name.</span>
            </div>
            <p v-if="post.publishError" class="text-xs text-destructive">Last error: {{ post.publishError }}</p>
          </div>
        </div>
      </div>

      <!-- Ask organisers -->
      <div v-else class="mt-4 grid gap-4" data-testid="ask-organisers">
        <AdminState v-if="!organisers" kind="loading" />
        <template v-else>
          <p v-if="post.asked" class="rounded-xl bg-violet-100 p-3 text-sm text-violet-900">Asked {{ post.asked.pages }} organiser{{ post.asked.pages === 1 ? '' : 's' }} on {{ fmt(post.asked.at) }}. Their events show up in the post as they add them.</p>
          <div>
            <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Who · organisers with events in {{ post.cityName }}</h3>
            <p v-if="!organisers.pages.length" class="mt-2 text-sm text-muted-foreground">No organiser has had an event in {{ post.cityName }} in the last six months.</p>
            <ul v-else class="mt-2 grid max-h-64 gap-1 overflow-y-auto text-sm">
              <li v-for="p in organisers.pages" :key="p.id">
                <Checkbox :model-value="picked.includes(p.id)" :disabled="!p.reachable || p.asked" @update:model-value="togglePick(p.id)">
                  <span class="font-semibold">{{ p.name }}</span>
                  <span class="text-xs text-muted-foreground"> · {{ p.events }} event{{ p.events === 1 ? '' : 's' }}<template v-if="p.asked"> · asked</template><template v-else-if="!p.reachable"> · no team to email</template></span>
                </Checkbox>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Message</h3>
            <Field id="city-occasion-ask" label="Message" hide-label hint="Sent by email to each page’s owners and editors, with a button to add their event. Their email addresses stay hidden from you.">
              <Textarea v-model="message" rows="5" class="text-sm" />
            </Field>
          </div>
          <div>
            <Button type="button" variant="pill" size="pill-sm" :loading="busy === 'ask'" :disabled="!picked.length || message.trim().length < 10 || !!busy" @click="ask">
              <Mail /> Email {{ picked.length }} organiser{{ picked.length === 1 ? '' : 's' }}
            </Button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
