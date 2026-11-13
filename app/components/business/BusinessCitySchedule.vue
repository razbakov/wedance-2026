<script setup lang="ts">
/**
 * The city's weekly post (city channels, migration 0066) — replaces the weekly schedule
 * that arrived as a Telegram DM and was copied into @wedancemunich by hand.
 *
 * Pick the week's events (nights out are picked; weekly classes are not), adjust the
 * text if needed, draw the picture, then post: Instagram feed / story through the city
 * page's connection (#501), Telegram through the WeDance bot. Each place once a week.
 *
 *   <BusinessCitySchedule city-slug="munich" />
 */
import { ChevronLeft, ChevronRight, Image as ImageIcon, Instagram, Send, Copy, Check, RotateCcw, ExternalLink, AlertTriangle } from 'lucide-vue-next'
import { eventLocalTime } from '#shared/utils/eventTime'
import { shiftWeek } from '#shared/utils/citySchedule'

const props = defineProps<{ citySlug: string }>()
const { $trpc } = useNuxtApp()
const { track } = useTrack()

type Week = Awaited<ReturnType<typeof $trpc.citySchedule.get.query>>
const week = ref<Week | null>(null)
const weekStart = ref<string | undefined>(undefined)
const loading = ref(true)
const busy = ref<string | null>(null)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const text = ref('')
const showClasses = ref(false)

async function load() {
  error.value = null
  try {
    week.value = await $trpc.citySchedule.get.query({ citySlug: props.citySlug, weekStart: weekStart.value })
    weekStart.value = week.value.weekStart
    text.value = week.value.text
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t load the week.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

function go(weeks: number) {
  if (!weekStart.value) return
  weekStart.value = shiftWeek(weekStart.value, weeks)
  notice.value = null
  loading.value = true
  load()
}

async function run(key: string, fn: () => Promise<unknown>, done?: string) {
  busy.value = key
  error.value = null
  notice.value = null
  try {
    await fn()
    if (done) notice.value = done
    await load()
  } catch (e: any) {
    error.value = e?.message || 'That didn’t work.'
  } finally {
    busy.value = null
  }
}

const base = () => ({ citySlug: props.citySlug, weekStart: week.value!.weekStart })

// Picks: save at once (the text follows unless it was edited by hand).
function toggle(id: string, on: boolean) {
  if (!week.value) return
  const ids = new Set(week.value.events.filter(e => e.picked).map(e => e.id))
  if (on) ids.add(id); else ids.delete(id)
  run('picks', () => $trpc.citySchedule.save.mutate({ ...base(), eventIds: [...ids] }))
}

// Text: saved a moment after typing stops.
let textTimer: ReturnType<typeof setTimeout> | null = null
const textDirty = computed(() => !!week.value && text.value !== week.value.text)
watch(text, () => {
  if (!week.value || !textDirty.value) return
  if (textTimer) clearTimeout(textTimer)
  textTimer = setTimeout(saveText, 900)
})
async function saveText() {
  if (!week.value || !textDirty.value) return
  await run('text', () => $trpc.citySchedule.save.mutate({ ...base(), text: text.value }))
}
const resetText = () => run('text', () => $trpc.citySchedule.save.mutate({ ...base(), text: null }), 'Back to the text written from the events.')

const draw = () => run('draw', () => $trpc.citySchedule.drawImage.mutate(base()), 'Picture drawn.')

async function postInstagram(to: 'feed' | 'story') {
  if (!week.value) return
  if (!confirm(to === 'feed' ? `Post this week to @${week.value.targets.instagram}’s feed now?` : `Add this week to @${week.value.targets.instagram}’s story now?`)) return
  await saveText()
  await run(to, async () => {
    await $trpc.citySchedule.publishInstagram.mutate({ ...base(), to })
    track('city_schedule_published', { city: props.citySlug, to: to === 'feed' ? 'instagram_feed' : 'instagram_story' })
  }, to === 'feed' ? 'Posted to the Instagram feed.' : 'Added to the Instagram story.')
}

async function postTelegram() {
  if (!week.value) return
  const names = week.value.targets.telegram.map(t => t.name).join(', ')
  if (!confirm(`Post this week to ${names} on Telegram now?`)) return
  await saveText()
  await run('telegram', async () => {
    const r = await $trpc.citySchedule.publishTelegram.mutate(base())
    track('city_schedule_published', { city: props.citySlug, to: 'telegram' })
    const failed = r.results.filter(x => !x.ok)
    if (failed.length) throw new Error(failed.map(f => `${f.name}: ${f.error}`).join(' · '))
  }, 'Posted to Telegram.')
}

const copied = ref(false)
async function copy() {
  await saveText()
  await navigator.clipboard.writeText(text.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

type Ev = Week['events'][number]
const byDay = (list: Ev[]) => {
  const out: { day: string; items: Ev[] }[] = []
  for (const e of list) {
    const day = new Date(e.startDate as any).toLocaleDateString('en-GB', { timeZone: e.timezone || 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'short' })
    const g = out.find(x => x.day === day) ?? (out.push({ day, items: [] }), out[out.length - 1]!)
    g.items.push(e)
  }
  return out
}
const nights = computed(() => byDay((week.value?.events ?? []).filter(e => !e.course || e.picked)))
const classes = computed(() => (week.value?.events ?? []).filter(e => e.course && !e.picked))
const pickedCount = computed(() => week.value?.events.filter(e => e.picked).length ?? 0)
const time = (e: Ev) => eventLocalTime(e.startDate as any, e.timezone || 'Europe/Berlin')
const posted = computed(() => week.value?.posted)
const telegramLinks = computed(() => (posted.value?.telegram ?? []).filter((t: { url: string | null }) => !!t.url))
const fmt = (d: string | Date) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <section class="rounded-2xl border bg-card p-5 shadow-wd-card">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-display text-lg font-bold text-foreground">Weekly post</h2>
        <p class="text-sm text-muted-foreground">This week’s nights out in {{ week?.cityName ?? 'the city' }}, for Instagram and Telegram.</p>
      </div>
      <div class="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous week" :disabled="loading" @click="go(-1)"><ChevronLeft /></Button>
        <span class="min-w-[7.5rem] text-center text-sm font-bold tabular-nums">{{ week?.weekLabel ?? '…' }}</span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Next week" :disabled="loading" @click="go(1)"><ChevronRight /></Button>
      </div>
    </div>

    <AdminState v-if="loading" kind="loading" />
    <template v-else-if="week">
      <p v-if="error" class="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert"><AlertTriangle class="size-4 mt-0.5 shrink-0" aria-hidden="true" />{{ error }}</p>
      <p v-if="notice" class="mt-4 rounded-xl bg-wd-green-600/10 p-3 text-sm text-wd-green-700" role="status">{{ notice }}</p>

      <div class="mt-5 grid gap-6 lg:grid-cols-2">
        <!-- 1. Events -->
        <div>
          <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">1 · Events <span class="normal-case tracking-normal font-normal">({{ pickedCount }} picked)</span></h3>
          <p v-if="!week.events.length" class="mt-3 text-sm text-muted-foreground">No events listed in {{ week.cityName }} this week.</p>
          <div v-for="g in nights" :key="g.day" class="mt-3">
            <div class="text-xs font-bold text-foreground">{{ g.day }}</div>
            <ul class="mt-1 grid gap-1">
              <li v-for="e in g.items" :key="e.id">
                <Checkbox :model-value="e.picked" :disabled="busy === 'picks'" @update:model-value="toggle(e.id, !!$event)">
                  <span class="tabular-nums text-muted-foreground">{{ time(e) }}</span>
                  <span class="ml-1 text-foreground">{{ e.name }}</span>
                  <span v-if="e.venueName" class="text-muted-foreground"> · {{ e.venueName }}</span>
                </Checkbox>
              </li>
            </ul>
          </div>
          <div v-if="classes.length" class="mt-4">
            <Button type="button" variant="link" class="h-auto p-0 text-xs font-bold" @click="showClasses = !showClasses">
              {{ showClasses ? 'Hide' : 'Show' }} {{ classes.length }} weekly classes
            </Button>
            <div v-if="showClasses">
              <div v-for="g in byDay(classes)" :key="g.day" class="mt-3">
                <div class="text-xs font-bold text-foreground">{{ g.day }}</div>
                <ul class="mt-1 grid gap-1">
                  <li v-for="e in g.items" :key="e.id">
                    <Checkbox :model-value="false" :disabled="busy === 'picks'" @update:model-value="toggle(e.id, !!$event)">
                      <span class="tabular-nums text-muted-foreground">{{ time(e) }}</span>
                      <span class="ml-1">{{ e.name }}</span>
                    </Checkbox>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-6 content-start">
          <!-- 2. Text -->
          <div>
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">2 · Text</h3>
              <div class="flex items-center gap-1">
                <Button v-if="week.textEdited" type="button" variant="ghost" size="sm" class="h-7 text-xs" :disabled="!!busy" @click="resetText"><RotateCcw /> Rewrite from events</Button>
                <Button type="button" variant="ghost" size="sm" class="h-7 text-xs" @click="copy"><component :is="copied ? Check : Copy" /> {{ copied ? 'Copied' : 'Copy' }}</Button>
              </div>
            </div>
            <Field id="city-schedule-text" label="Post text" hide-label :hint="week.textEdited ? 'Edited by hand: picking events no longer changes it.' : 'Written from the picked events. Edit freely.'">
              <Textarea v-model="text" rows="12" class="font-mono text-xs" @blur="saveText" />
            </Field>
            <p class="mt-1 text-xs text-muted-foreground">{{ text.length }} characters · Instagram keeps 2,200.</p>
          </div>

          <!-- 3. Picture -->
          <div>
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">3 · Picture</h3>
              <Button type="button" variant="outline-pill" size="pill-sm" :loading="busy === 'draw'" :disabled="!pickedCount" @click="draw">
                <ImageIcon /> {{ week.image ? 'Redraw' : 'Draw picture' }}
              </Button>
            </div>
            <p v-if="week.image?.stale" class="mt-2 text-xs text-wd-red-800">The events changed since it was drawn. Redraw before posting.</p>
            <img v-if="week.image" :src="week.image.url" alt="The weekly schedule picture" class="mt-3 w-full max-w-xs rounded-xl border" :class="week.image.stale ? 'opacity-50' : ''">
          </div>

          <!-- 4. Post -->
          <div>
            <h3 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">4 · Post</h3>
            <div class="mt-3 grid gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <Instagram class="size-4 text-primary" aria-hidden="true" />
                <template v-if="week.targets.instagram">
                  <span class="text-sm font-bold">@{{ week.targets.instagram }}</span>
                  <a v-if="posted?.feed" :href="posted.feed.permalink || '#'" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-bold text-wd-green-700">On the feed · {{ fmt(posted.feed.at) }} <ExternalLink class="size-3" aria-hidden="true" /></a>
                  <Button v-else type="button" variant="pill" size="pill-sm" :loading="busy === 'feed'" :disabled="!week.image || week.image.stale || !!busy" @click="postInstagram('feed')">Post to feed</Button>
                  <span v-if="posted?.story" class="text-xs font-bold text-wd-green-700">In the story · {{ fmt(posted.story.at) }}</span>
                  <Button v-else type="button" variant="outline-pill" size="pill-sm" :loading="busy === 'story'" :disabled="!week.image || week.image.stale || !!busy" @click="postInstagram('story')">Add to story</Button>
                </template>
                <span v-else class="text-sm text-muted-foreground">
                  Not connected.
                  <NuxtLink v-if="week.page" :to="`/business/network/${week.page.username}`" class="font-bold underline">Connect Instagram on @{{ week.page.username }}</NuxtLink>
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Send class="size-4 text-primary" aria-hidden="true" />
                <template v-if="week.targets.telegram.length && week.targets.telegramConfigured">
                  <span class="text-sm font-bold">{{ week.targets.telegram.map(t => t.name).join(', ') }}</span>
                  <Button type="button" variant="pill" size="pill-sm" :loading="busy === 'telegram'" :disabled="!pickedCount || !!busy || posted?.telegram.length === week.targets.telegram.length" @click="postTelegram">
                    {{ posted?.telegram.length ? (posted.telegram.length === week.targets.telegram.length ? 'Posted' : 'Post to the rest') : 'Post to Telegram' }}
                  </Button>
                  <a v-for="t in telegramLinks" :key="t.chatId" :href="t.url!" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs font-bold text-wd-green-700">{{ t.chatId }} <ExternalLink class="size-3" aria-hidden="true" /></a>
                </template>
                <span v-else-if="!week.targets.telegramConfigured" class="text-sm text-muted-foreground">The WeDance Telegram bot isn’t set up on this server yet.</span>
                <span v-else class="text-sm text-muted-foreground">No Telegram channel yet: add one under Channels with its @name.</span>
              </div>
              <p v-if="week.targets.telegram.length && !week.image" class="text-xs text-muted-foreground">Telegram gets the text alone until the picture is drawn.</p>
              <p v-if="week.publishError" class="text-xs text-destructive">Last error: {{ week.publishError }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
