<script setup lang="ts">
/**
 * An empty "Meet new friends" deck (RAZ-1002): "You want to meet dancers — so
 * do we. Let's make it happen." One next step, picked by the server from what
 * the city has (`plan.meetEmpty`, server/utils/meetEmpty.ts): sign up to a
 * coming night first, get its organisers to post their next one, find who runs
 * nights at its venues, or ask locals — and always: bring a friend. Sharing
 * goes through the phone's share sheet (else the text is copied); nothing is
 * sent from here.
 */
import { ArrowRight, Copy, Send, Sparkles } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { nightWhen } from '~/lib/meetDeck'
import { sizedImage, IMG } from '#shared/utils/image'

const props = defineProps<{ preview?: boolean; city?: string | null }>()
const NuxtLink = resolveComponent('NuxtLink')

type Data = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['plan']['meetEmpty']['query']>>
const { $trpc } = useNuxtApp()
const PREVIEW: Data = {
  stage: 'nights', citySlug: 'munich', organisers: [], venues: [],
  nights: [
    { id: 'p1', name: 'Salsa Friday', path: '', startISO: '2026-11-20T20:00:00Z', timezone: 'Europe/Berlin', venue: 'La Rumba', going: 0 },
    { id: 'p2', name: 'Bachata Sunday', path: '', startISO: '2026-11-22T18:00:00Z', timezone: 'Europe/Berlin', venue: 'Bar Tropical', going: 2 },
  ],
}
const data = ref<Data | null>(props.preview ? PREVIEW : null)
onMounted(async () => {
  if (props.preview) return
  try { data.value = await $trpc.plan.meetEmpty.query() } catch (err) { console.warn('[meet] empty-deck next step failed:', err) }
})

const cityName = computed(() => props.city || 'your city')
const copied = ref<string | null>(null)

/** Phone share sheet, else copy the text; says which happened. */
async function share(key: string, text: string, url: string) {
  const method = await shareOrCopy(text, url)
  if (method === 'copy') { copied.value = key; setTimeout(() => { if (copied.value === key) copied.value = null }, 2500) }
  useTrack().track('meet_empty_shared', { what: key.split(':')[0], stage: data.value?.stage ?? null, method })
}
async function shareOrCopy(text: string, url: string): Promise<'native' | 'copy' | 'none'> {
  try {
    if (navigator.share) { await navigator.share({ text, url }); return 'native' }
  } catch (err) { if ((err as Error)?.name === 'AbortError') return 'none' }
  try { await navigator.clipboard.writeText(`${text} ${url}`); return 'copy' } catch { return 'none' }
}
const origin = () => (import.meta.client ? window.location.origin : 'https://2026.wedance.vip')
const pageUrl = (username: string) => `${origin()}/@${username}`

function inviteOrganiser(p: { username: string; name: string }) {
  share(`organiser:${p.username}`, `Hi ${p.name}! When’s your next night? Post it on WeDance so we can all find it and go together:`, pageUrl(p.username))
}
function askVenue(p: { username: string; name: string }) {
  share(`venue:${p.username}`, `Who runs dance nights at ${p.name}? Tell them to post them on WeDance so we can all go:`, pageUrl(p.username))
}
function inviteFriend() {
  share('friend', 'I want to go dancing and meet new people — come with me? Find a night with me on WeDance:', `${origin()}/meet`)
}
</script>

<template>
  <div class="rounded-2xl p-6 sm:p-8 text-center border-2 border-dashed border-input bg-white/50 font-sans" data-testid="meet-empty">
    <Sparkles class="w-9 h-9 mx-auto mb-2 text-secondary" aria-hidden="true" />
    <p class="text-lg font-display text-foreground">You want to meet dancers — so do we.</p>
    <p class="mt-1 text-sm text-muted-foreground">Nobody’s here yet. Let’s change that together.</p>

    <!-- Nights coming up: be the first -->
    <div v-if="data?.stage === 'nights'" class="mt-5 text-left" data-testid="meet-empty-nights">
      <p class="text-sm font-bold text-foreground text-center">Be the first at a night out — everyone who joins meets you here.</p>
      <ul class="mt-3 space-y-2">
        <li v-for="n in data.nights" :key="n.id">
          <component
            :is="preview ? 'div' : NuxtLink"
            :to="preview ? undefined : n.path"
            class="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 hover:border-foreground"
          >
            <span class="min-w-0">
              <span class="block font-bold text-foreground truncate">{{ n.name }}</span>
              <span class="block text-xs text-muted-foreground">{{ nightWhen(n.startISO, n.timezone) }}<template v-if="n.venue"> · {{ n.venue }}</template><template v-if="n.going"> · {{ n.going }} going</template></span>
            </span>
            <ArrowRight class="size-4 shrink-0 text-primary" aria-hidden="true" />
          </component>
        </li>
      </ul>
    </div>

    <!-- No nights posted: get the organisers to post the next one -->
    <div v-else-if="data?.stage === 'organisers'" class="mt-5 text-left" data-testid="meet-empty-organisers">
      <p class="text-sm font-bold text-foreground text-center">No nights posted in {{ cityName }} for the next two weeks. These organisers run them — ask for the next one:</p>
      <ul class="mt-3 space-y-2">
        <li v-for="p in data.organisers" :key="p.username" class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <NuxtLink :to="`/@${p.username}`" class="flex min-w-0 flex-1 items-center gap-3">
            <img v-if="p.photo" :src="sizedImage(p.photo, IMG.avatar)" alt="" class="size-9 rounded-full object-cover shrink-0">
            <span class="min-w-0 font-bold text-foreground truncate">{{ p.name }}</span>
          </NuxtLink>
          <Button type="button" variant="outline" size="pill-sm" @click="inviteOrganiser(p)">
            <component :is="copied === `organiser:${p.username}` ? Copy : Send" aria-hidden="true" /> {{ copied === `organiser:${p.username}` ? 'Copied' : 'Ask' }}
          </Button>
        </li>
      </ul>
    </div>

    <!-- Only venues: find who runs nights there -->
    <div v-else-if="data?.stage === 'venues'" class="mt-5 text-left" data-testid="meet-empty-venues">
      <p class="text-sm font-bold text-foreground text-center">People dance at these places in {{ cityName }}. Know who runs the nights? Send them this:</p>
      <ul class="mt-3 space-y-2">
        <li v-for="p in data.venues" :key="p.username" class="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <NuxtLink :to="`/@${p.username}`" class="flex min-w-0 flex-1 items-center gap-3">
            <img v-if="p.photo" :src="sizedImage(p.photo, IMG.avatar)" alt="" class="size-9 rounded-full object-cover shrink-0">
            <span class="min-w-0 font-bold text-foreground truncate">{{ p.name }}</span>
          </NuxtLink>
          <Button type="button" variant="outline" size="pill-sm" @click="askVenue(p)">
            <component :is="copied === `venue:${p.username}` ? Copy : Send" aria-hidden="true" /> {{ copied === `venue:${p.username}` ? 'Copied' : 'Send' }}
          </Button>
        </li>
      </ul>
    </div>

    <!-- Nothing listed yet -->
    <div v-else-if="data?.stage === 'nothing'" class="mt-5" data-testid="meet-empty-nothing">
      <p class="text-sm font-bold text-foreground">WeDance is new in {{ cityName }}. Where do people dance?</p>
      <Button as-child variant="cta" size="pill-sm" class="mt-3">
        <NuxtLink :to="`/cities/${data.citySlug}#ask-locals`">Ask locals <ArrowRight aria-hidden="true" /></NuxtLink>
      </Button>
    </div>

    <!-- No city -->
    <div v-else-if="data?.stage === 'no-city'" class="mt-5" data-testid="meet-empty-no-city">
      <p class="text-sm font-bold text-foreground">Where do you dance? Add your city and we’ll show you its nights.</p>
      <Button as-child variant="cta" size="pill-sm" class="mt-3">
        <NuxtLink to="/settings">Add my city <ArrowRight aria-hidden="true" /></NuxtLink>
      </Button>
    </div>

    <!-- Always: bring a friend -->
    <div class="mt-6 border-t border-border pt-4">
      <p class="text-sm text-muted-foreground">Going out is easier with a friend.</p>
      <Button type="button" variant="link" class="h-auto p-0 mt-1 font-bold" data-testid="meet-empty-friend" @click="inviteFriend">
        {{ copied === 'friend' ? 'Link copied' : 'Invite a friend' }} <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  </div>
</template>
