<script setup lang="ts">
/**
 * Share my weekend (#527) — /w/<code>. The parties a dancer is going to this
 * week. Friends tap "I'm in" (signed out: a first name, saved against this
 * browser) and the sharer is emailed. A guest is then asked for an email
 * (optional): the magic link comes back to ?confirm=<event>&guest=<token>,
 * signed in, and their guest joins become their account's (on their plan). The sharer — or anyone opening the
 * link with ?story=1, which is what the ChatGPT plugin hands out — gets the
 * Instagram story: made on a canvas here, shared through the phone's share
 * sheet, with the link copied for the link sticker.
 */
import { ArrowRight, Check, Copy, Download, Instagram, Loader2, Share2, Shuffle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { sizedImage, IMG } from '#shared/utils/image'
import { eventLocalDate, eventLocalTime } from '#shared/utils/eventTime'
import { joinersLine } from '#shared/utils/weekendShare'
import { isUuid } from '#shared/utils/eventSlug'
import { RsvpEmailSchema } from '#shared/validation'
import { drawWeekendStory } from '~/lib/weekendStory'
import { STORY_LINE_MAX, cleanStoryLine, pickStoryLine } from '#shared/utils/storyLines'

definePageMeta({ layout: false })

const route = useRoute()
const code = String(route.params.code || '').toLowerCase()
const { $trpc } = useNuxtApp()
const { isSignedIn, requestMagicLink } = useAuth()
const router = useRouter()
const { track, trackOnce } = useTrack()

type Plan = NonNullable<Awaited<ReturnType<typeof $trpc.weekend.get.query>>>

const GUEST_KEY = 'wd-rsvp-guest'
const NAME_KEY = 'wd-guest-name'
function guestToken(): string | undefined {
  if (!import.meta.client) return undefined
  try {
    let t = localStorage.getItem(GUEST_KEY)
    if (!t) { t = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, t) }
    return t
  } catch { return undefined }
}

// tRPC only runs in the browser here (like the event page): load on mount.
const plan = ref<Plan | null>(null)
const pending = ref(true)
async function refresh() {
  try {
    plan.value = await $trpc.weekend.get.query({ code, guestToken: guestToken() })
  } catch (e) {
    console.warn('[weekend] load failed', (e as Error)?.message ?? e)
    plan.value = null
  } finally {
    pending.value = false
  }
}

onMounted(async () => {
  await refresh()
  await confirmFromLink()
  if (plan.value) {
    trackOnce(`weekend:${code}`, 'weekend_plan_viewed', {
      own: plan.value.isOwner, parties: plan.value.events.length, friends: plan.value.friends, story: wantsStory.value,
    })
  }
})

const wantsStory = computed(() => route.query.story === '1')
const showStory = computed(() => !!plan.value && (plan.value.isOwner || wantsStory.value))
const upcoming = computed(() => plan.value?.events.filter(e => !e.ended) ?? [])

function day(e: Plan['events'][number]) {
  const tz = e.timezone || 'Europe/Berlin'
  const d = eventLocalDate(e.startDate, tz)
  const today = eventLocalDate(new Date(), tz)
  const tomorrow = eventLocalDate(new Date(Date.now() + 86400_000), tz)
  if (d === today) return 'Tonight'
  if (d === tomorrow) return 'Tomorrow'
  return new Date(e.startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: tz })
}

// --- I'm in -----------------------------------------------------------------
const busy = ref<string | null>(null)
const askingName = ref<string | null>(null)
const showSignIn = ref(false)
const confirmedNote = ref(false)

/** The guest's joins become their account's: one signed-in join with the guest token folds them all. */
async function foldGuest(eventId: string, token: string | undefined) {
  plan.value = await $trpc.weekend.join.mutate({ code, eventId, guestToken: token })
  confirmedNote.value = true
}

// Back from the magic link (?confirm=<event>&guest=<token>, signed in by /auth/verify).
// The token comes in the link: the email may open in another browser than the tap.
async function confirmFromLink() {
  const eventId = String(route.query.confirm || '')
  const token = String(route.query.guest || '')
  if (!isSignedIn.value || !isUuid(eventId) || !plan.value || plan.value.isOwner) return
  try {
    await foldGuest(eventId, isUuid(token) ? token : guestToken())
  } catch (e: any) {
    error.value = e?.message || 'Could not confirm — tap “I’m in” again.'
  }
  router.replace({ query: {} })
}

// Signed in from the sheet: this browser's guest joins become theirs, then show them as theirs.
watch(isSignedIn, async (v) => {
  if (!v) return
  const mine = plan.value?.events.find(e => e.joinedByMe && !e.ended)
  if (mine && !plan.value?.isOwner) {
    try { await foldGuest(mine.id, guestToken()); return } catch { /* fall through */ }
  }
  refresh()
})
const guestName = ref('')
const error = ref('')
onMounted(() => { try { guestName.value = localStorage.getItem(NAME_KEY) || '' } catch {} })

async function join(eventId: string) {
  error.value = ''
  if (!isSignedIn.value && !guestName.value.trim()) { askingName.value = eventId; return }
  busy.value = eventId
  try {
    plan.value = await $trpc.weekend.join.mutate({
      code, eventId, guestToken: guestToken(), name: isSignedIn.value ? undefined : guestName.value.trim(),
    })
    if (!isSignedIn.value) {
      try { localStorage.setItem(NAME_KEY, guestName.value.trim()) } catch {}
      if (!reminderDone.value) { reminderFor.value = eventId; reminderSent.value = false; resetReminder() }
    }
    askingName.value = null
    track('weekend_joined', { signed_in: isSignedIn.value, surface: 'weekend-page' })
  } catch (e: any) {
    error.value = e?.message || 'Could not save that — try again.'
  } finally {
    busy.value = null
  }
}

// --- After a guest's "I'm in": an email, optional — a reminder and an account ----
const reminderFor = ref<string | null>(null)
const reminderSent = ref(false)
const sendingReminder = ref(false)
/** Sent or skipped once on this share: don't ask again on the next party. */
const reminderDone = ref(false)
const reminderForm = reactive({ email: '' })
const {
  errors: reminderErrors, validate: validateReminder, fieldAttrs: reminderAttrs, reset: resetReminder,
} = useFormValidation(RsvpEmailSchema, reminderForm)

async function sendReminder() {
  const result = validateReminder()
  if (!result.success || !reminderFor.value) return
  sendingReminder.value = true
  error.value = ''
  try {
    const token = guestToken()
    await requestMagicLink({
      name: guestName.value.trim() || undefined,
      email: result.data.email,
      redirect: `/w/${code}?confirm=${reminderFor.value}${token ? `&guest=${token}` : ''}`,
    })
    reminderSent.value = true
    reminderDone.value = true
    track('weekend_reminder_requested', { surface: 'weekend-page' })
  } catch {
    error.value = 'Couldn’t send the link. Please try again.'
  } finally {
    sendingReminder.value = false
  }
}

function skipReminder() {
  reminderFor.value = null
  reminderDone.value = true
}

async function leave(eventId: string) {
  busy.value = eventId
  try {
    plan.value = await $trpc.weekend.leave.mutate({ code, eventId, guestToken: guestToken() })
  } finally {
    busy.value = null
  }
}

// --- The story ----------------------------------------------------------------
const storyBlob = ref<Blob | null>(null)
const storyUrl = ref('')
const making = ref(false)
const copied = ref(false)
const canShareFiles = ref(false)
const storyParties = computed(() => (upcoming.value.length ? upcoming.value : plan.value?.events) ?? [])

// The line under the headline: one of ours for the first party's style, shuffled or rewritten by the sharer.
const storyLine = ref('')
const lineIsOwn = ref(false)
function shuffleLine() {
  storyLine.value = pickStoryLine(storyParties.value, storyLine.value)
  lineIsOwn.value = false
}
/** A change while a story is being drawn: draw again once it's done. */
let redraw = false

async function makeStory() {
  if (!plan.value) return
  if (making.value) { redraw = true; return }
  if (!storyLine.value && !lineIsOwn.value) storyLine.value = pickStoryLine(storyParties.value)
  making.value = true
  try {
    storyBlob.value = await drawWeekendStory({
      sharerName: plan.value.sharer.name,
      line: cleanStoryLine(storyLine.value),
      parties: storyParties.value,
      link: plan.value.url,
    })
    if (storyUrl.value) URL.revokeObjectURL(storyUrl.value)
    storyUrl.value = URL.createObjectURL(storyBlob.value)
    const file = new File([storyBlob.value], 'wedance-weekend.png', { type: 'image/png' })
    canShareFiles.value = !!navigator.canShare?.({ files: [file] })
  } catch (e) {
    console.warn('[weekend] story failed', e)
  } finally {
    making.value = false
    if (redraw) { redraw = false; makeStory() }
  }
}
watch(showStory, (v) => { if (v && !storyBlob.value) makeStory() })
let lineTimer: ReturnType<typeof setTimeout> | undefined
watch(storyLine, () => {
  if (!storyBlob.value) return
  clearTimeout(lineTimer)
  lineTimer = setTimeout(makeStory, 350)
})
onBeforeUnmount(() => { if (storyUrl.value) URL.revokeObjectURL(storyUrl.value) })

async function copyLink(silent = false) {
  if (!plan.value) return
  try {
    await navigator.clipboard.writeText(plan.value.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
    if (!silent) track('weekend_story_shared', { method: 'copy', parties: plan.value.events.length, own_line: lineIsOwn.value })
  } catch { /* no clipboard */ }
}

async function shareStory() {
  if (!storyBlob.value || !plan.value) return
  // The link goes on the clipboard first: Instagram's link sticker pastes it.
  await copyLink(true)
  const file = new File([storyBlob.value], 'wedance-weekend.png', { type: 'image/png' })
  try {
    await navigator.share({ files: [file] })
    track('weekend_story_shared', { method: 'native', parties: plan.value.events.length, own_line: lineIsOwn.value })
  } catch { /* cancelled */ }
}

function downloadStory() {
  if (!storyUrl.value || !plan.value) return
  const a = document.createElement('a')
  a.href = storyUrl.value
  a.download = 'wedance-weekend.png'
  a.click()
  copyLink(true)
  track('weekend_story_shared', { method: 'download', parties: plan.value.events.length, own_line: lineIsOwn.value })
}

useHead(() => ({
  title: plan.value ? `${plan.value.sharer.name}’s weekend — come dance · WeDance` : 'Weekend plan · WeDance',
  meta: [
    { name: 'robots', content: 'noindex' },
    { property: 'og:title', content: 'Come dance with me this weekend' },
    { property: 'og:description', content: 'See where I’m dancing and tap “I’m in” — on WeDance.' },
  ],
}))
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main class="max-w-xl mx-auto px-4 pt-8 pb-20">
      <div v-if="pending" class="py-20 flex justify-center text-muted-foreground">
        <Loader2 class="size-6 animate-spin" aria-label="Loading" />
      </div>

      <div v-else-if="!plan" class="py-20 text-center" data-testid="weekend-missing">
        <h1 class="text-3xl font-display">This weekend plan doesn’t exist.</h1>
        <p class="mt-2 text-muted-foreground font-sans">The link may be cut off. Ask your friend to send it again.</p>
        <NuxtLink to="/cities" class="mt-6 inline-flex items-center gap-1 text-sm font-bold underline text-primary font-sans">Find a party near you <ArrowRight class="size-4" /></NuxtLink>
      </div>

      <template v-else>
        <!-- Who -->
        <header class="flex items-center gap-4" data-testid="weekend-header">
          <img
            v-if="plan.sharer.photo"
            :src="sizedImage(plan.sharer.photo, IMG.avatar)"
            :alt="plan.sharer.name"
            class="size-16 rounded-full object-cover border-2 border-primary"
          >
          <div v-else class="size-16 rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold">{{ plan.sharer.name.charAt(0) }}</div>
          <div>
            <div class="text-xs uppercase tracking-[0.3em] text-secondary font-sans">{{ plan.isOwner ? 'Your weekend' : `${plan.sharer.name}’s weekend` }}</div>
            <h1 class="text-3xl leading-tight">Come dance <em class="italic text-primary">with {{ plan.isOwner ? 'you' : 'me' }}.</em></h1>
          </div>
        </header>

        <!-- The story (sharer, or ?story=1 from ChatGPT) -->
        <section v-if="showStory" class="mt-8 rounded-2xl border bg-card p-4" data-testid="weekend-story">
          <div class="flex items-start gap-4">
            <div class="w-28 shrink-0 aspect-[9/16] rounded-xl overflow-hidden bg-muted grid place-items-center">
              <img v-if="storyUrl" :src="storyUrl" alt="Your Instagram story" class="w-full h-full object-cover" data-testid="weekend-story-preview">
              <Loader2 v-else class="size-5 animate-spin text-muted-foreground" aria-label="Making your story" />
            </div>
            <div class="min-w-0 font-sans">
              <h2 class="text-lg font-bold font-display">Post it as a story</h2>
              <ol class="mt-1 text-sm text-muted-foreground list-decimal pl-4 space-y-0.5">
                <li>Share the picture to your Instagram story.</li>
                <li>Add a <b>Link</b> sticker and paste — the link is already copied.</li>
                <li>We email you when a friend taps “I’m in”.</li>
              </ol>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button v-if="canShareFiles" size="sm" :disabled="!storyBlob" data-testid="weekend-share-story" @click="shareStory">
                  <Instagram class="size-4" /> Share to story
                </Button>
                <Button size="sm" :variant="canShareFiles ? 'outline' : 'default'" :disabled="!storyBlob" data-testid="weekend-download-story" @click="downloadStory">
                  <Download class="size-4" /> Save picture
                </Button>
                <Button size="sm" variant="outline" data-testid="weekend-copy-link" @click="copyLink()">
                  <Check v-if="copied" class="size-4" /><Copy v-else class="size-4" /> {{ copied ? 'Link copied' : 'Copy link' }}
                </Button>
              </div>
            </div>
          </div>
          <div class="mt-4 font-sans" data-testid="weekend-line">
            <label for="weekend-line" class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your line</label>
            <div class="mt-1 flex gap-2">
              <input
                id="weekend-line"
                v-model="storyLine"
                type="text"
                :maxlength="STORY_LINE_MAX"
                :placeholder="storyParties[0]?.venueName ? `Who’s coming to ${storyParties[0].venueName}?` : `Who’s coming?`"
                class="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-background"
                data-testid="weekend-line-input"
                @input="lineIsOwn = true"
              >
              <Button type="button" size="sm" variant="outline" title="Another line" data-testid="weekend-line-shuffle" @click="shuffleLine">
                <Shuffle class="size-4" /> Another
              </Button>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">Write your own — a question gets the most replies.</p>
          </div>
          <p v-if="plan.isOwner" class="mt-3 text-sm font-sans" data-testid="weekend-friends">
            <template v-if="plan.friends">🎉 <b>{{ plan.friends }} friend{{ plan.friends === 1 ? '' : 's' }}</b> joined so far.</template>
            <template v-else>No one has joined yet — post the story and see who comes.</template>
          </p>
        </section>

        <!-- The parties -->
        <section class="mt-8 space-y-3" data-testid="weekend-parties">
          <p v-if="!plan.events.length" class="text-muted-foreground font-sans">These parties aren’t on WeDance any more.</p>
          <article
            v-for="e in plan.events"
            :key="e.id"
            class="rounded-2xl border bg-card overflow-hidden"
            :class="e.ended ? 'opacity-60' : ''"
            data-testid="weekend-party"
          >
            <div class="flex gap-3 p-3">
              <img v-if="e.cover" :src="sizedImage(e.cover, IMG.card)" alt="" class="size-20 rounded-xl object-cover shrink-0">
              <div class="min-w-0 flex-1 font-sans">
                <div class="text-xs font-bold uppercase tracking-wider text-primary">{{ day(e) }} · {{ eventLocalTime(e.startDate, e.timezone || undefined) }}</div>
                <NuxtLink :to="e.path" class="block mt-0.5 font-bold leading-snug hover:underline font-display text-lg">{{ e.name }}</NuxtLink>
                <div class="text-sm text-muted-foreground truncate">{{ [e.venueName, e.styles[0], e.price].filter(Boolean).join(' · ') }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3 px-3 pb-3 font-sans">
              <div class="flex -space-x-2" aria-hidden="true">
                <template v-for="(c, i) in e.coming.slice(0, 5)" :key="i">
                  <img v-if="c.photo" :src="sizedImage(c.photo, IMG.avatar)" alt="" class="size-7 rounded-full border-2 border-card object-cover">
                  <span v-else class="size-7 rounded-full border-2 border-card bg-secondary/20 text-xs font-bold grid place-items-center">{{ c.name.charAt(0) }}</span>
                </template>
              </div>
              <p class="text-sm text-muted-foreground flex-1 min-w-0" data-testid="weekend-coming">
                <template v-if="e.coming.length">{{ plan.sharer.name }} + {{ joinersLine(e.coming.map(c => c.name)) }}</template>
                <template v-else>{{ plan.isOwner ? 'You’re going' : `${plan.sharer.name} is going` }}</template>
              </p>
              <template v-if="!plan.isOwner && !e.ended">
                <Button
                  v-if="e.joinedByMe"
                  size="sm"
                  variant="outline"
                  :disabled="busy === e.id"
                  data-testid="weekend-joined"
                  title="Tap to take it back"
                  @click="leave(e.id)"
                >
                  <Check class="size-4" /> You’re in
                </Button>
                <Button v-else size="sm" :disabled="busy === e.id" data-testid="weekend-join" @click="join(e.id)">
                  <Loader2 v-if="busy === e.id" class="size-4 animate-spin" /> I’m in
                </Button>
              </template>
            </div>
            <form
              v-if="askingName === e.id"
              class="flex gap-2 px-3 pb-3 font-sans"
              novalidate
              data-testid="weekend-name-form"
              @submit.prevent="join(e.id)"
            >
              <label class="sr-only" :for="`name-${e.id}`">Your first name</label>
              <input
                :id="`name-${e.id}`"
                v-model="guestName"
                type="text"
                autocomplete="given-name"
                maxlength="40"
                placeholder="Your first name"
                class="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-background"
                data-testid="weekend-name"
              >
              <Button type="submit" size="sm" :disabled="!guestName.trim() || busy === e.id">Join</Button>
            </form>
            <div
              v-if="reminderFor === e.id && e.joinedByMe && !isSignedIn"
              class="mx-3 mb-3 rounded-xl bg-muted/60 p-3 font-sans"
              data-testid="weekend-reminder"
            >
              <template v-if="reminderSent">
                <p class="text-sm font-bold">Check your email 📬</p>
                <p class="text-sm text-muted-foreground">Tap the link to confirm — it brings you back here, with the party on your plan.</p>
              </template>
              <form v-else novalidate @submit.prevent="sendReminder">
                <p class="text-sm font-bold">You’re in! Want a reminder?</p>
                <p class="text-sm text-muted-foreground">We’ll send a link to confirm — no password. You’ll see who else is coming, and the party lands in your plan.</p>
                <div class="mt-2 flex gap-2">
                  <label class="sr-only" for="weekend-email">Email</label>
                  <input
                    id="weekend-email"
                    v-model="reminderForm.email"
                    type="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    class="flex-1 min-w-0 rounded-lg border px-3 py-2 text-sm bg-background"
                    data-testid="weekend-email"
                    v-bind="reminderAttrs('email', 'weekend-email-error')"
                  >
                  <Button type="submit" size="sm" :disabled="sendingReminder">
                    <Loader2 v-if="sendingReminder" class="size-4 animate-spin" /> Send
                  </Button>
                </div>
                <FieldError id="weekend-email-error" :message="reminderErrors.email" />
                <button type="button" class="mt-1 text-xs text-muted-foreground underline" data-testid="weekend-reminder-skip" @click="skipReminder">No thanks</button>
              </form>
            </div>
          </article>
          <p v-if="askingName" class="text-xs text-muted-foreground font-sans">
            So {{ plan.sharer.name }} knows who’s coming. <button type="button" class="underline" @click="showSignIn = true">Sign in</button> to keep it in your plan.
          </p>
          <p v-if="confirmedNote" role="status" class="text-sm font-sans" data-testid="weekend-confirmed">✅ Confirmed — it’s in your plan now, and {{ plan.sharer.name }} sees it’s you.</p>
          <p v-if="error" role="alert" class="text-sm text-destructive font-sans">{{ error }}</p>
        </section>

        <!-- Your own -->
        <section v-if="!plan.isOwner" class="mt-10 rounded-2xl bg-wd-brown-900 p-5 text-center font-sans" style="color: var(--wd-cream)">
          <p class="font-display text-xl">Planning your own weekend?</p>
          <p class="mt-1 text-sm opacity-80">Pick your parties and get a story like this for your friends.</p>
          <NuxtLink to="/my-plan" class="mt-3 inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground">
            <Share2 class="size-4" /> Plan my weekend
          </NuxtLink>
        </section>
      </template>
    </main>
    <SignUpModal v-model:open="showSignIn" action="signin" />
  </div>
</template>
