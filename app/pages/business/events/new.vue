<script setup lang="ts">
/**
 * /business/events/new — create an event for one of my profiles.
 * ?artist=<handle> starts it with that artist in the line-up (from their
 * booking page, /@handle/book).
 *
 * Import ▾ → "From Instagram" (#453): the link of the organiser's post or reel
 * becomes a complete draft (eventImport.fromInstagram, the same procedure as
 * the MCP tool import_from_instagram), then the editor opens on it. The menu
 * is where further sources go.
 */
import type { BusinessEventValues } from '~/components/business/BusinessEventForm.vue'
import { toBusinessEventInput } from '~/lib/businessEvent'
import { Plus, Search, Instagram, Loader2, Download, ChevronDown } from 'lucide-vue-next'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from 'reka-ui'
import { InstagramPostImportSchema } from '#shared/validation'

definePageMeta({ layout: 'business' })
useHead({ title: 'New event | Business | WeDance' })

const { $trpc } = useNuxtApp()
const route = useRoute()
const artist = typeof route.query.artist === 'string' ? route.query.artist.replace(/^@/, '') : ''
// ?type=Festival (from /organizers and the "list your festival" links).
const TYPES = ['Party', 'Workshop', 'Course', 'Festival', 'Weekender', 'Congress', 'Concert', 'Show']
const type = typeof route.query.type === 'string' && TYPES.includes(route.query.type) ? route.query.type : ''
const businessProfile = useBusinessProfile()
const hosts = ref<{ username: string; name: string; type: string; city: string | null }[] | null>(null)
const error = ref<string | null>(null)
const saving = ref(false)

onMounted(async () => {
  try {
    hosts.value = (await $trpc.business.myProfiles.query()).managed
  } catch (e: any) {
    error.value = e?.message || 'Could not load your profiles.'
  }
})

// Default host: the switcher's profile, else the only one, else an organizer.
const initial = computed<Partial<BusinessEventValues>>(() => {
  const list = hosts.value ?? []
  const host = list.find(h => h.username === businessProfile.value) ?? (list.length === 1 ? list[0] : list.find(h => h.type === 'organizer'))
  return { hostUsername: host?.username ?? '', city: host?.city ?? '', ...(artist ? { artists: [artist] } : {}), ...(type ? { type } : {}) }
})

// Import → From Instagram: runs as the default host, or the one picked here.
const instagramOpen = ref(false)
const post = reactive({ url: '', profile: '' })
watch(initial, i => { if (!post.profile) post.profile = i.hostUsername ?? '' }, { immediate: true })
const { errors: postErrors, validate: validatePost, fieldAttrs: postAttrs } = useFormValidation(InstagramPostImportSchema, post)
const importing = ref(false)
const importError = ref<string | null>(null)

async function importPost() {
  const result = validatePost()
  if (!result.success) return
  importing.value = true
  importError.value = null
  try {
    const r = await $trpc.eventImport.fromInstagram.mutate(result.data)
    useTrack().track('event_imported', { event_id: r.id, source: 'instagram', created: r.created, lineup: r.lineup.length, has_cover: r.cover })
    await navigateTo(`/business/events/${r.id}?created=1`)
  } catch (e: any) {
    importError.value = e?.message || 'Could not read that post.'
  } finally {
    importing.value = false
  }
}

async function create(v: BusinessEventValues) {
  saving.value = true
  error.value = null
  try {
    const input = toBusinessEventInput(v)
    const { id } = await $trpc.businessEvents.create.mutate(input)
    const props = { event_id: id, is_festival: !!input.festival, city: input.city || null, style: input.styles?.[0] ?? null }
    useTrack().track('event_created', { ...props, published: !!input.published })
    if (input.published) useTrack().track('event_published', props)
    await navigateTo(`/business/events/${id}?created=1`)
  } catch (e: any) {
    error.value = e?.message || 'Could not create the event.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader eyebrow="Business" title="New event" :back="{ to: '/business/events', label: 'Events' }">
      <DropdownMenuRoot v-if="hosts?.length">
        <DropdownMenuTrigger as-child>
          <Button variant="outline-pill" size="pill-sm"><Download aria-hidden="true" /> Import <ChevronDown aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end" :side-offset="4" class="z-50 min-w-[11rem] rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
            <DropdownMenuItem class="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent [&_svg]:size-4" @select="instagramOpen = true">
              <Instagram aria-hidden="true" /> From Instagram
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </AdminPageHeader>
    <AdminState v-if="error" kind="error" :message="error" />
    <AdminState v-if="!hosts" kind="loading" />
    <div v-else-if="!hosts.length" class="mt-6 rounded-2xl border-2 border-dashed border-input bg-card/60 p-8 text-center">
      <p class="font-display text-lg font-bold">First, a profile</p>
      <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Events are run by a profile: your festival, school, party series or venue. Make one in a minute, then you’re back here. Already on WeDance? Find yours.</p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <Button variant="pill" as-child><NuxtLink :to="{ path: '/business/new', query: { type: 'organizer', next: $route.fullPath } }"><Plus /> Create a profile</NuxtLink></Button>
        <Button variant="outline-pill" as-child><NuxtLink to="/business/claim"><Search /> Find my profile</NuxtLink></Button>
      </div>
    </div>
    <template v-else>
      <AiAppCta surface="business_event_new" title="Rather do it in ChatGPT?" class="mt-6">
        Paste your announcement and ask ChatGPT to put it on WeDance. It sets up the venue, the line-up and the flyer, and shows you the event before anything goes public.
      </AiAppCta>
      <BusinessEventForm class="mt-6" mode="create" :hosts="hosts" :initial="initial" :saving="saving" submit-label="Create event" @submit="create" />
    </template>

    <Dialog v-model:open="instagramOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader class="text-left">
          <DialogTitle class="flex items-center gap-2"><Instagram class="size-5 text-muted-foreground" aria-hidden="true" /> Import from Instagram</DialogTitle>
          <DialogDescription>Paste the link of your post or reel. We fill in the event for you: date and times, price, programme, line-up, venue and the picture. You check it before anything goes public.</DialogDescription>
        </DialogHeader>
        <form v-if="hosts?.length" novalidate class="grid gap-3" @submit.prevent="importPost">
          <div>
            <Input v-model="post.url" type="url" inputmode="url" placeholder="https://www.instagram.com/p/…" aria-label="Instagram post link" :disabled="importing" v-bind="postAttrs('url', 'ig-post-url-error')" />
            <FieldError id="ig-post-url-error" :message="postErrors.url" />
          </div>
          <div v-if="hosts.length > 1">
            <Select v-model="post.profile" :options="hosts.map(h => ({ label: h.name, value: h.username }))" placeholder="Run by" aria-label="Run by" v-bind="postAttrs('profile', 'ig-post-profile-error')" />
            <FieldError id="ig-post-profile-error" :message="postErrors.profile" />
          </div>
          <AdminState v-if="importError" kind="error" :message="importError" />
          <div class="flex items-center justify-end gap-3">
            <p v-if="importing" class="mr-auto text-xs text-muted-foreground" role="status">This takes up to a minute.</p>
            <Button type="submit" variant="pill" :disabled="importing">
              <template v-if="importing"><Loader2 class="animate-spin" aria-hidden="true" /> Reading the post…</template>
              <template v-else>Import</template>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
