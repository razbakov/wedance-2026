<script setup lang="ts">
/**
 * The event's line-up. For each artist: how this event names them, which photo
 * the flyer uses (one of theirs, any number uploaded here, or "Name only"),
 * their video (festivals), and a personal link to send them.
 *
 *   <BusinessLineupPicker v-model="form.artists" v-model:photos="form.photos"
 *     v-model:names="form.names" :videos="form.festival?.videos" :event-id="id" />
 *
 * What the organizer adds here shows on this event straight away, and goes to
 * the artist's own page as a suggestion (artistInvites.suggest) until they
 * approve it through the link. `photos`: handle → URL, or null for name only;
 * no entry = their main photo.
 */
import type { PropType } from 'vue'
import { X, ImagePlus, Check, Type, Loader2, Link2, Clock } from 'lucide-vue-next'
import { videoEmbedUrl } from '#shared/utils/video'

const artists = defineModel<string[]>({ default: () => [] })
const photos = defineModel<Record<string, string | null>>('photos', { default: () => ({}) })
const names = defineModel<Record<string, string>>('names', { default: () => ({}) })
const props = defineProps({
  placeholder: { type: String as PropType<string>, default: 'Search artists, or paste their Instagram' },
  /** A festival's videos (handle → embed URL), edited in place; absent for ordinary events. */
  videos: { type: Object as PropType<Record<string, string>>, default: undefined },
  /** The saved event: suggestions and links need it. */
  eventId: { type: String, default: undefined },
})

const { $trpc } = useNuxtApp()
type Person = { username: string; name: string | null; photos: string[] }
const people = ref(new Map<string, Person>())
async function load(handles: string[]) {
  const missing = handles.filter(h => !people.value.has(h))
  if (!missing.length) return
  try {
    const rows = await $trpc.businessEvents.lineupPhotos.query({ handles: missing })
    const next = new Map(people.value)
    for (const r of rows) next.set(r.username, r)
    people.value = next
  } catch { /* rows fall back to @handle, no photos */ }
}
watch(artists, h => { load(h); loadPending() }, { immediate: true })

// What's waiting for each artist to approve.
type Pending = Record<string, { photos: string[]; videos: string[]; name: string | null }>
const pending = ref<Pending>({})
async function loadPending() {
  if (!props.eventId || !artists.value.length) return
  try { pending.value = await $trpc.artistInvites.pending.query({ eventId: props.eventId, handles: artists.value }) } catch { /* chips stay hidden */ }
}
const error = ref<string | null>(null)
async function suggest(h: string, kind: 'photo' | 'video' | 'name', value: string) {
  if (!props.eventId) return
  try {
    await $trpc.artistInvites.suggest.mutate({ eventId: props.eventId, handle: h, kind, value })
    await loadPending()
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t send that to the artist’s page.'
  }
}

// Photos: theirs, then any uploaded here (pending on their page), then this event's own.
const choice = (h: string) => (h in photos.value ? photos.value[h] : (people.value.get(h)?.photos[0] ?? null))
const options = (h: string) => {
  const list = [...(people.value.get(h)?.photos ?? []), ...(pending.value[h]?.photos ?? [])]
  const own = photos.value[h]
  return [...new Set(own ? [...list, own] : list)]
}
const isPending = (h: string, url: string) => !!pending.value[h]?.photos.includes(url)
const pick = (h: string, url: string | null) => (photos.value = { ...photos.value, [h]: url })
function remove(h: string) {
  artists.value = artists.value.filter(a => a !== h)
  const { [h]: _p, ...restP } = photos.value
  photos.value = restP
  const { [h]: _n, ...restN } = names.value
  names.value = restN
  if (props.videos) delete props.videos[h]
}

const uploading = ref<string | null>(null)
async function upload(h: string, e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? []).filter(f => f.type.startsWith('image/'))
  input.value = ''
  if (!files.length) return
  uploading.value = h
  error.value = null
  try {
    for (const file of files) {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/media/image?folder=profiles', { method: 'POST', body })
      if (!res.ok) throw new Error()
      const url = (await res.json()).url as string
      if (!props.eventId) { pick(h, url); continue }
      await suggest(h, 'photo', url)
      if (files.length === 1) pick(h, url)
    }
  } catch {
    error.value = 'A photo didn’t upload. Try again.'
  } finally {
    uploading.value = null
  }
}

// Name: this event uses it now; their page gets it when they approve.
const nameOf = (h: string) => names.value[h] || people.value.get(h)?.name || '@' + h
const profileName = (h: string) => people.value.get(h)?.name || ''
function rename(h: string, value: string) {
  const v = value.trim()
  const next = { ...names.value }
  if (!v || v === profileName(h)) delete next[h]
  else next[h] = v
  names.value = next
  if (v && v !== profileName(h)) void suggest(h, 'name', v)
}

// Video (festivals): shown on the festival's line-up, suggested to their page.
const videoError = ref<Record<string, string | undefined>>({})
function setVideo(h: string, value: string) {
  if (!props.videos) return
  const raw = value.trim()
  if (!raw) { delete props.videos[h]; videoError.value[h] = undefined; return }
  const embed = videoEmbedUrl(raw)
  if (!embed) { videoError.value[h] = 'Paste a YouTube or Vimeo link.'; return }
  videoError.value[h] = undefined
  if (props.videos[h] === embed) return
  props.videos[h] = embed
  void suggest(h, 'video', embed)
}

// The personal link for an artist: copy, then send it to them.
const copied = ref<string | null>(null)
const linking = ref<string | null>(null)
async function copyLink(h: string) {
  if (!props.eventId) return
  linking.value = h
  error.value = null
  try {
    const { url } = await $trpc.artistInvites.link.mutate({ eventId: props.eventId, handle: h })
    await navigator.clipboard.writeText(url)
    copied.value = h
    setTimeout(() => { if (copied.value === h) copied.value = null }, 2500)
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t copy the link.'
  } finally {
    linking.value = null
  }
}
const waiting = (h: string) => {
  const p = pending.value[h]
  if (!p) return ''
  return [p.name && `name “${p.name}”`, p.photos.length && `${p.photos.length} photo${p.photos.length > 1 ? 's' : ''}`, p.videos.length && 'video']
    .filter(Boolean).join(', ')
}
</script>

<template>
  <div>
    <BusinessProfilePicker v-model="artists" type="artist" multiple hide-selected :placeholder="placeholder" />
    <p v-if="error" class="mt-1 text-xs font-bold text-destructive" role="alert">{{ error }}</p>

    <ul v-if="artists.length" class="mt-3 grid gap-3">
      <li v-for="h in artists" :key="h" class="rounded-2xl border bg-card p-3">
        <div class="flex flex-wrap items-center gap-3">
          <img v-if="choice(h)" :src="choice(h)!" alt="" class="size-9 rounded-full object-cover">
          <span v-else class="flex size-9 items-center justify-center rounded-full bg-muted"><Type class="size-4 text-muted-foreground" aria-hidden="true" /></span>
          <div class="min-w-[12rem] flex-1">
            <Input
              :model-value="nameOf(h)"
              class="h-9 text-sm font-bold"
              :aria-label="`Name of @${h} on this event`"
              @change="(e: Event) => rename(h, (e.target as HTMLInputElement).value)"
            />
            <p class="mt-0.5 truncate text-xs text-muted-foreground">@{{ h }}</p>
          </div>
          <Button v-if="eventId" type="button" variant="outline-pill" size="pill-sm" :loading="linking === h" @click="copyLink(h)">
            <Check v-if="copied === h" /><Link2 v-else /> {{ copied === h ? 'Link copied' : 'Copy confirmation link' }}
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Remove ${nameOf(h)}`" @click="remove(h)"><X /></Button>
        </div>

        <p v-if="waiting(h)" class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-xs">
          <Clock class="size-3.5" aria-hidden="true" /> Waiting for them to approve on their page: {{ waiting(h) }}
        </p>

        <div class="mt-3 flex flex-wrap gap-2" role="group" :aria-label="`Picture of ${nameOf(h)} on the flyer`">
          <button
            v-for="(url, i) in options(h)"
            :key="url"
            type="button"
            class="relative overflow-hidden rounded-xl border-2 focus-visible:shadow-wd-focus"
            :class="choice(h) === url ? 'border-primary' : 'border-transparent'"
            :aria-pressed="choice(h) === url"
            @click="pick(h, url)"
          >
            <img :src="url" :alt="`${nameOf(h)}, photo ${i + 1}${isPending(h, url) ? ' (waiting for approval)' : ''}`" class="h-24 w-[4.5rem] object-cover">
            <Check v-if="choice(h) === url" class="absolute right-1 top-1 size-4 rounded-full bg-primary p-0.5 text-primary-foreground" aria-hidden="true" />
            <Clock v-if="isPending(h, url)" class="absolute bottom-1 left-1 size-4 rounded-full bg-card p-0.5 text-wd-amber-800" aria-hidden="true" />
          </button>
          <label class="flex h-24 w-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-center text-[11px] text-muted-foreground hover:border-primary/50 has-[:focus-visible]:shadow-wd-focus">
            <Loader2 v-if="uploading === h" class="size-4 animate-spin" aria-hidden="true" />
            <ImagePlus v-else class="size-4" aria-hidden="true" />
            {{ uploading === h ? 'Uploading' : 'Add photos' }}
            <input type="file" accept="image/*" multiple class="sr-only" :disabled="uploading === h" @change="upload(h, $event)">
          </label>
          <button
            type="button"
            class="flex h-24 w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border-2 text-center text-[11px] focus-visible:shadow-wd-focus"
            :class="choice(h) === null ? 'border-primary bg-primary/5 font-bold text-wd-red-800' : 'border-input text-muted-foreground'"
            :aria-pressed="choice(h) === null"
            @click="pick(h, null)"
          >
            <Type class="size-4" aria-hidden="true" /> Name only
          </button>
        </div>
        <p v-if="!options(h).length && people.has(h)" class="mt-1.5 text-xs text-muted-foreground">No photos on their page yet. Add some, or keep the name only.</p>

        <Field v-if="videos" :id="`video-${h}`" label="Video" optional class="mt-3" :error="videoError[h]" hint="A YouTube or Vimeo link, shown on their card in the line-up.">
          <Input :model-value="videos[h] ?? ''" placeholder="https://youtu.be/…" @change="(e: Event) => setVideo(h, (e.target as HTMLInputElement).value)" />
        </Field>
      </li>
    </ul>
    <p v-if="artists.length && !eventId" class="mt-2 text-xs text-muted-foreground">Save the event to send artists their confirmation links.</p>
  </div>
</template>
