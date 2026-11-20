<script setup lang="ts">
import type { Workshop, PlanEntry, DanceRole, Teacher } from '~/types/festival'
import { Share2, Gift, Copy, Check, Loader2, ArrowRight } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { festivalPath } from '#shared/utils/eventSlug'
import { eventNoun, shareMode, shareText, withReferral } from '~/lib/shareInvite'

// "Bring friends" (RAZ-1001): the same "Post it as a story" card as My plan's
// week (WeekendStory), made for this one event — a /w/<code> link where friends
// tap "I'm in" and the sharer is emailed. Signed out, or when the event can't
// get a story (past, not a real event row), it falls back to one link and one
// button. A picked workshop plan goes as its own link under the story.
// The referral discount rides on the plain link only when this event has one.
const props = defineProps<{
  open: boolean
  workshops: Workshop[]
  teachers: Teacher[]
  plan: Map<string, PlanEntry>
  planIds: Set<string>
  festivalName: string
  festivalSlug: string
  /** The event's type (class, party, festival…) — names it in the copy. */
  eventType?: string | null
  /** The `events` row behind the page: the story link is made for it. */
  eventId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const copied = ref(false)

const { $trpc } = useNuxtApp()
const { dancerName, dancerId, username, role, isSignedIn } = useAuth()
const { buildShareUrl } = useSharePlan()

const planned = computed(() => {
  return props.workshops
    .filter((w) => props.planIds.has(w.id))
    .sort((a, b) => {
      const dayOrder = ['Thursday', 'Friday', 'Saturday', 'Sunday']
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
      if (dayDiff !== 0) return dayDiff
      return a.time.localeCompare(b.time)
    })
})

const mode = computed(() => shareMode(props.workshops.length, planned.value.length))
const noun = computed(() => eventNoun(props.eventType))

// The referral discount, asked once per open (null = no program / not signed in).
const referralCode = computed(() => username.value || dancerId.value || '')
const discountPercent = ref(0)
watch(() => props.open, async (open) => {
  if (!open || !referralCode.value || discountPercent.value) return
  try {
    const r = await $trpc.referral.validate.query({ festivalSlug: props.festivalSlug, referralCode: referralCode.value })
    discountPercent.value = r?.discountPercent ?? 0
  } catch { /* no discount */ }
}, { immediate: true })

// The story: weekend.share for this one event (the same link comes back within a few days).
type Story = NonNullable<Awaited<ReturnType<typeof $trpc.weekend.get.query>>>
const story = ref<Story | null>(null)
const storyState = ref<'idle' | 'loading' | 'none'>('idle')
watch(() => props.open, async (open) => {
  if (!open || story.value || storyState.value === 'loading' || !isSignedIn.value || !props.eventId) return
  storyState.value = 'loading'
  try {
    const r = await $trpc.weekend.share.mutate({ eventIds: [props.eventId], surface: 'event' })
    story.value = await $trpc.weekend.get.query({ code: r.code })
    storyState.value = story.value ? 'idle' : 'none'
  } catch {
    storyState.value = 'none'
  }
}, { immediate: true })

const link = computed(() => {
  const base = import.meta.client ? window.location.origin : ''
  let url = `${base}${festivalPath(props.festivalSlug)}`
  if (mode.value === 'plan') {
    const name = dancerName.value || 'A dancer'
    const danceRole = (role.value === 'lead' || role.value === 'follow') ? role.value : 'follow'
    url = buildShareUrl(props.festivalSlug, name, danceRole as DanceRole, props.plan, dancerId.value)
  }
  return withReferral(url, referralCode.value, discountPercent.value)
})

const groupedByDay = computed(() => {
  const map = new Map<string, Workshop[]>()
  for (const w of planned.value) {
    const list = map.get(w.day) || []
    list.push(w)
    map.set(w.day, list)
  }
  return map
})

const lookingCount = computed(() => {
  let count = 0
  for (const entry of props.plan.values()) {
    if (entry.partnerStatus === 'looking') count++
  }
  return count
})

function entryFor(workshopId: string): PlanEntry | undefined {
  return props.plan.get(workshopId)
}

const roleLabel: Record<DanceRole, string> = { lead: 'Lead', follow: 'Follow' }

// plan_shared (C4) — the share intent. `object` says what went out: the
// workshop plan (festival) or just the event's link (event).
function trackShare(method: 'copy' | 'native') {
  useTrack().track('plan_shared', {
    object: mode.value === 'plan' ? 'festival' : 'event',
    method,
    festival: props.festivalSlug,
    workshops: planned.value.length,
    referral: discountPercent.value > 0,
    surface: 'share-modal',
  })
}

async function copyLink() {
  trackShare('copy')
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // the link stays selectable in the field
  }
}

async function send() {
  if (!navigator.share) return copyLink()
  trackShare('native')
  try {
    await navigator.share({
      title: props.festivalName,
      text: shareText(mode.value, props.festivalName, planned.value.length),
      url: link.value,
    })
  } catch {
    // user cancelled
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg max-h-[85vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Bring friends</DialogTitle>
        <DialogDescription v-if="story || storyState === 'loading'">
          Post {{ festivalName }} as a story. Friends tap the link, say “I’m in”, and we tell you.
        </DialogDescription>
        <DialogDescription v-else-if="mode === 'plan'">
          Send your plan for {{ festivalName }}. Friends see your {{ planned.length }}
          {{ planned.length === 1 ? 'workshop' : 'workshops' }} and where you need a partner.
        </DialogDescription>
        <DialogDescription v-else>
          Send your friends this {{ noun }}, {{ festivalName }}.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2 overflow-y-auto flex-1 -mx-6 px-6">
        <!-- The story, as on My plan → Week -->
        <div v-if="storyState === 'loading'" class="grid place-items-center py-10" data-testid="share-story-loading">
          <Loader2 class="size-5 animate-spin text-muted-foreground" aria-label="Making your story" />
        </div>
        <WeekendStory v-else-if="story" :plan="story" surface="event">
          <NuxtLink
            :to="`/w/${story.code}`"
            class="mt-2 inline-flex items-center gap-1 text-xs font-bold underline text-primary font-sans"
            data-testid="share-story-page"
          >
            See who's joining <ArrowRight class="w-3.5 h-3.5" aria-hidden="true" />
          </NuxtLink>
        </WeekendStory>

        <template v-if="!story && storyState !== 'loading'">
          <p
            v-if="discountPercent > 0"
            class="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs"
            data-testid="share-discount"
          >
            <Gift class="w-4 h-4 text-green-600 shrink-0 mt-px" aria-hidden="true" />
            <span>A friend who buys a ticket through your link gets {{ discountPercent }}% off, and you both get a discount.</span>
          </p>

          <Button class="w-full gap-2" data-testid="share-send" @click="send">
            <Share2 class="w-4 h-4" aria-hidden="true" /> Send to friends
          </Button>
        </template>

        <!-- The plain link — the fallback, or the workshop plan under a story -->
        <div v-if="(!story && storyState !== 'loading') || mode === 'plan'">
          <p v-if="story" class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Or send your workshop plan</p>
          <div class="flex gap-2">
            <input
              :value="link"
              readonly
              aria-label="Link"
              class="flex-1 min-w-0 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
              @focus="($event.target as HTMLInputElement).select()"
            >
            <Button size="sm" variant="outline" class="shrink-0" data-testid="share-copy" @click="copyLink">
              <component :is="copied ? Check : Copy" class="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              {{ copied ? 'Copied' : 'Copy' }}
            </Button>
          </div>
        </div>

        <!-- Plan preview — only when a plan goes out without a story -->
        <div v-if="mode === 'plan' && !story && storyState !== 'loading'" class="rounded-lg border bg-muted/30 p-4">
          <p class="text-xs font-medium text-muted-foreground mb-2">What they'll see:</p>
          <div class="space-y-3">
            <div v-for="[day, dayWorkshops] in groupedByDay" :key="day">
              <p class="text-eyebrow font-semibold text-muted-foreground uppercase tracking-wider mb-1">{{ day }}</p>
              <div class="space-y-1">
                <div
                  v-for="w in dayWorkshops"
                  :key="w.id"
                  class="flex items-center gap-2 text-xs"
                >
                  <span class="text-muted-foreground w-12 shrink-0">{{ w.time }}</span>
                  <span class="font-medium flex-1 truncate">{{ w.title }}</span>
                  <Badge
                    v-if="entryFor(w.id)?.partnerStatus === 'looking'"
                    variant="outline"
                    class="text-tag px-1 py-0 bg-orange-50 text-orange-600 border-orange-200 shrink-0"
                  >
                    Needs partner
                  </Badge>
                  <Badge
                    v-else-if="entryFor(w.id)?.role"
                    variant="secondary"
                    class="text-tag px-1 py-0 shrink-0"
                  >
                    {{ roleLabel[entryFor(w.id)!.role!] }}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <p v-if="lookingCount > 0" class="mt-3 text-eyebrow text-orange-600 font-medium">
            Looking for a partner in {{ lookingCount }} {{ lookingCount === 1 ? 'workshop' : 'workshops' }}
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
