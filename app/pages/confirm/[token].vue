<script setup lang="ts">
/**
 * /confirm/<token> — the page an artist opens from an organizer's link. First:
 * check and approve what the organizer needs (name, photos, video, bio,
 * Instagram), change it, or add more. Then, when nobody owns the page yet:
 * create an account with email and password and the page is theirs.
 *
 * /confirm/@<handle> is the same page for someone who already manages it
 * (from the Business inbox): it needs them signed in.
 */
import { Check, X, ImagePlus, Loader2, Star, Plus, Clock, PartyPopper, Instagram } from 'lucide-vue-next'
import { videoEmbedUrl } from '#shared/utils/video'

definePageMeta({ layout: false })
useHead({ title: 'Check your details | WeDance', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn, register } = useAuth()
const param = computed(() => String(route.params.token))
const key = computed(() => (param.value.startsWith('@') ? { username: param.value.slice(1) } : { token: param.value }))

type Data = Awaited<ReturnType<typeof $trpc.artistInvites.get.query>>
const data = ref<Data | null>(null)
const error = ref<string | null>(null)
const step = ref<'check' | 'account' | 'done'>('check')

// The answer, built up on the page.
const form = reactive({ name: '', bio: '', city: '', styles: [] as string[], instagram: '', website: '', facebook: '', mainPhoto: null as string | null })
// Fields the organizer may have suggested a new value for (shown as "Use theirs / Keep mine").
const FIELDS = [
  { kind: 'name', label: 'Name' }, { kind: 'bio', label: 'About' }, { kind: 'city', label: 'City' }, { kind: 'styles', label: 'Dance styles' },
  { kind: 'instagram', label: 'Instagram' }, { kind: 'website', label: 'Website' }, { kind: 'facebook', label: 'Facebook' },
] as const
type FieldKind = (typeof FIELDS)[number]['kind']
const show = (k: FieldKind, v: string) => (k === 'styles' ? (JSON.parse(v) as string[]).join(', ') : v) || '(empty)'
function setField(k: FieldKind, v: string) {
  if (k === 'styles') form.styles = JSON.parse(v || '[]')
  else (form as any)[k] = v
}
const currentValue = (k: FieldKind) => {
  const p = data.value!.profile as any
  return k === 'styles' ? JSON.stringify(p.styles ?? []) : (p[k] ?? '')
}
const decisions = ref<Record<string, boolean>>({})
const removePhotos = ref<string[]>([])
const addPhotos = ref<string[]>([])
const addVideos = ref<string[]>([])

async function load() {
  error.value = null
  try {
    data.value = await $trpc.artistInvites.get.query(key.value)
    const p = data.value.profile
    Object.assign(form, { name: p.name, bio: p.bio, city: p.city, styles: [...p.styles], instagram: p.instagram, website: p.website, facebook: p.facebook, mainPhoto: p.photo })
    // Approve what the organizer sent by default (the field shows it); the artist turns off what's wrong.
    decisions.value = Object.fromEntries(data.value.pending.map(s => [s.id, true]))
    for (const s of data.value.pending) if (FIELDS.some(f => f.kind === s.kind)) setField(s.kind as FieldKind, s.value)
  } catch (e: any) {
    error.value = e?.message || 'This link doesn’t work.'
  }
}
onMounted(load)
watch(isSignedIn, () => load())

const pendingFields = computed(() => (data.value?.pending ?? [])
  .filter(s => FIELDS.some(f => f.kind === s.kind) && s.value !== currentValue(s.kind as FieldKind))
  .map(s => ({ ...s, label: FIELDS.find(f => f.kind === s.kind)!.label })))
function useTheirs(id: string, theirs: boolean) {
  const s = data.value?.pending.find(x => x.id === id)
  if (!s) return
  decisions.value[id] = theirs
  setField(s.kind as FieldKind, theirs ? s.value : currentValue(s.kind as FieldKind))
}
const pendingPhotos = computed(() => data.value?.pending.filter(s => s.kind === 'photo') ?? [])
const pendingVideos = computed(() => data.value?.pending.filter(s => s.kind === 'video') ?? [])
const currentPhotos = computed(() => (data.value?.profile.photos ?? []).map(p => p.url).filter(u => !removePhotos.value.includes(u)))
const toggleRemove = (url: string) => {
  const i = removePhotos.value.indexOf(url)
  i > -1 ? removePhotos.value.splice(i, 1) : removePhotos.value.push(url)
  if (form.mainPhoto === url) form.mainPhoto = null
}

const uploading = ref(false)
async function upload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? []).filter(f => f.type.startsWith('image/'))
  input.value = ''
  uploading.value = true
  try {
    for (const f of files) {
      const body = new FormData()
      body.append('file', f)
      const res = await fetch('/api/media/image?folder=profiles', { method: 'POST', body })
      if (!res.ok) throw new Error()
      addPhotos.value.push((await res.json()).url)
    }
  } catch {
    error.value = 'A photo didn’t upload. Try again.'
  } finally {
    uploading.value = false
  }
}
const newVideo = ref('')
const videoError = ref<string | null>(null)
function addVideo() {
  const e = videoEmbedUrl(newVideo.value)
  if (!e) { videoError.value = 'Paste a YouTube or Vimeo link.'; return }
  videoError.value = null
  if (!addVideos.value.includes(e)) addVideos.value.push(e)
  newVideo.value = ''
}

const saving = ref(false)
async function save() {
  if (!form.name.trim()) { error.value = 'Add your name.'; return }
  saving.value = true
  error.value = null
  try {
    await $trpc.artistInvites.respond.mutate({
      ...key.value,
      decisions: Object.entries(decisions.value).map(([id, approve]) => ({ id, approve })),
      name: form.name.trim(),
      bio: form.bio,
      city: form.city,
      styles: form.styles,
      instagram: form.instagram,
      website: form.website,
      facebook: form.facebook,
      addPhotos: addPhotos.value,
      addVideos: addVideos.value,
      removePhotos: removePhotos.value,
      mainPhoto: form.mainPhoto,
    })
    // Nobody owns the page yet → offer it to them; else done.
    step.value = data.value && !data.value.managed && 'token' in key.value ? 'account' : 'done'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t save. Try again.'
  } finally {
    saving.value = false
  }
}

// Step two: own the page (sign up, or with the account they're signed in with).
const account = reactive({ email: '', password: '' })
const accountError = ref<string | null>(null)
const claiming = ref(false)
async function claim() {
  if (!('token' in key.value)) return
  claiming.value = true
  accountError.value = null
  try {
    if (!isSignedIn.value) {
      if (!/^\S+@\S+\.\S+$/.test(account.email)) throw new Error('Add your email.')
      if (account.password.length < 8) throw new Error('The password needs at least 8 characters.')
      await register({ name: form.name.trim(), email: account.email, password: account.password })
    }
    await $trpc.artistInvites.claim.mutate({ token: param.value })
    step.value = 'done'
  } catch (e: any) {
    accountError.value = e?.message || 'Couldn’t create the account.'
  } finally {
    claiming.value = false
  }
}
const showSignIn = ref(false)
const fmtDate = (d: string | Date | null, tz?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz || 'Europe/Berlin' }) : ''
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main class="mx-auto max-w-2xl px-4 py-10 font-sans">
      <AdminState v-if="!data && !error" kind="loading" />
      <AdminState v-else-if="!data" kind="error" :message="error!" />

      <template v-else>
        <!-- Done -->
        <section v-if="step === 'done'" class="rounded-2xl border bg-card p-6 text-center shadow-wd-card">
          <PartyPopper class="mx-auto size-8 text-primary" aria-hidden="true" />
          <h1 class="mt-2 font-display text-2xl font-bold">Thank you, {{ form.name }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">Your page is up to date{{ data.event ? ` and ${data.event.host || 'the organizer'} can use it for ${data.event.name}` : '' }}.</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="pill" as-child><NuxtLink :to="`/@${data.profile.username}`">See your page</NuxtLink></Button>
            <Button v-if="isSignedIn" variant="outline-pill" as-child><NuxtLink :to="`/business/profiles/${data.profile.username}`">Manage it in Business</NuxtLink></Button>
          </div>
        </section>

        <!-- Make it yours -->
        <section v-else-if="step === 'account'" class="rounded-2xl border bg-card p-6 shadow-wd-card">
          <p class="flex items-center gap-1.5 text-sm font-bold text-wd-green-700"><Check class="size-4" aria-hidden="true" /> Saved. Thank you!</p>
          <h1 class="mt-2 font-display text-2xl font-bold">Make this page yours</h1>
          <p class="mt-1 text-sm text-muted-foreground">Nobody manages your WeDance page yet. Take it over to keep it up to date, get booked, and see where you’re playing and teaching.</p>
          <form class="mt-5 grid gap-3" novalidate @submit.prevent="claim">
            <template v-if="!isSignedIn">
              <Field id="acc-email" label="Email"><Input v-model="account.email" type="email" autocomplete="email" /></Field>
              <Field id="acc-password" label="Password" hint="At least 8 characters."><Input v-model="account.password" type="password" autocomplete="new-password" /></Field>
            </template>
            <p v-else class="text-sm">You’re signed in: it becomes part of your account.</p>
            <p v-if="accountError" class="text-sm text-destructive" role="alert">{{ accountError }}</p>
            <div class="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="pill" :loading="claiming">{{ isSignedIn ? 'Make it mine' : 'Create my account' }}</Button>
              <button v-if="!isSignedIn" type="button" class="text-xs font-bold text-secondary hover:underline" @click="showSignIn = true">I already have an account</button>
              <button type="button" class="text-xs text-muted-foreground hover:underline" @click="step = 'done'">Not now</button>
            </div>
          </form>
          <SignUpModal v-model:open="showSignIn" action="signin" />
        </section>

        <!-- Check the details -->
        <template v-else>
          <p class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">WeDance</p>
          <h1 class="mt-1 font-display text-3xl font-bold">
            {{ data.event ? `${data.event.host || 'An organizer'} added you to ${data.event.name}` : 'Your page on WeDance' }}
          </h1>
          <p v-if="data.event" class="mt-1 text-sm text-muted-foreground">{{ fmtDate(data.event.startDate, data.event.timezone) }} · Check what they need for the flyer and the event page. Change anything that’s wrong.</p>

          <div v-if="!data.canAnswer" class="mt-6 rounded-2xl bg-secondary/10 p-4 text-sm">
            <p class="font-bold">This page has an owner.</p>
            <p class="text-muted-foreground">Sign in with the account that manages @{{ data.profile.username }} to approve the changes.</p>
            <Button variant="pill" size="pill-sm" class="mt-3" @click="showSignIn = true">Sign in</Button>
            <SignUpModal v-model:open="showSignIn" action="signin" />
          </div>

          <form v-else class="mt-6 grid gap-4" novalidate @submit.prevent="save">
            <!-- Name -->
            <section class="rounded-2xl border bg-card p-4">
              <Field id="c-name" label="Your name as it should appear">
                <Input v-model="form.name" />
              </Field>
              <Field id="c-city" label="City" optional class="mt-3"><CityCombobox v-model="form.city" placeholder="e.g. Vienna" /></Field>
              <Field label="Dance styles" class="mt-3"><DanceStylePicker v-model="form.styles" /></Field>
            </section>

            <!-- What the organizer changed, field by field -->
            <section v-if="pendingFields.length" class="rounded-2xl border-2 border-secondary/30 bg-card p-4">
              <p class="flex items-center gap-1.5 text-sm font-bold"><Clock class="size-4 text-muted-foreground" aria-hidden="true" /> Changes from {{ data.event?.host || 'the organizer' }}</p>
              <ul class="mt-2 grid gap-3">
                <li v-for="s in pendingFields" :key="s.id" class="text-sm">
                  <p class="font-bold">{{ s.label }}</p>
                  <p class="text-xs"><span class="text-muted-foreground">Theirs:</span> {{ show(s.kind as any, s.value) }}</p>
                  <p class="text-xs"><span class="text-muted-foreground">Yours now:</span> {{ show(s.kind as any, currentValue(s.kind as any)) }}</p>
                  <div class="mt-1 flex gap-2">
                    <Button type="button" size="sm" :variant="decisions[s.id] ? 'soft' : 'ghost'" @click="useTheirs(s.id, true)">Use theirs</Button>
                    <Button type="button" size="sm" :variant="decisions[s.id] ? 'ghost' : 'soft'" @click="useTheirs(s.id, false)">Keep mine</Button>
                  </div>
                </li>
              </ul>
            </section>

            <!-- Photos -->
            <section class="rounded-2xl border bg-card p-4">
              <p class="text-sm font-bold">Photos</p>
              <p class="text-xs text-muted-foreground">Organizers pick from these for flyers. Tap the star for your main photo.</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <div v-for="url in [...currentPhotos, ...addPhotos]" :key="url" class="relative">
                  <img :src="url" alt="Your photo" class="h-32 w-24 rounded-xl border object-cover">
                  <button type="button" class="absolute left-1 top-1 rounded-full bg-card/90 p-1" :aria-label="form.mainPhoto === url ? 'Main photo' : 'Make this the main photo'" :aria-pressed="form.mainPhoto === url" @click="form.mainPhoto = url">
                    <Star class="size-3.5" :class="form.mainPhoto === url ? 'fill-current text-wd-amber-600' : ''" />
                  </button>
                  <button type="button" class="absolute right-1 top-1 rounded-full bg-card/90 p-1" aria-label="Remove this photo" @click="addPhotos.includes(url) ? addPhotos.splice(addPhotos.indexOf(url), 1) : toggleRemove(url)"><X class="size-3.5" /></button>
                </div>
                <label class="flex h-32 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-input text-center text-xs text-muted-foreground has-[:focus-visible]:shadow-wd-focus">
                  <Loader2 v-if="uploading" class="size-5 animate-spin" aria-hidden="true" /><ImagePlus v-else class="size-5" aria-hidden="true" /> Add photos
                  <input type="file" accept="image/*" multiple class="sr-only" @change="upload">
                </label>
              </div>
              <template v-if="pendingPhotos.length">
                <p class="mt-4 flex items-center gap-1.5 text-sm font-bold"><Clock class="size-4 text-muted-foreground" aria-hidden="true" /> Added by {{ data.event?.host || 'an organizer' }}</p>
                <div class="mt-2 flex flex-wrap gap-3">
                  <label v-for="s in pendingPhotos" :key="s.id" class="relative cursor-pointer">
                    <img :src="s.value" alt="Photo the organizer added" class="h-32 w-24 rounded-xl border-2 object-cover" :class="decisions[s.id] ? 'border-primary' : 'border-transparent opacity-50'">
                    <span class="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-card/90 py-0.5 text-[11px] font-bold">
                      <Checkbox v-model="decisions[s.id]" /> {{ decisions[s.id] ? 'Keep' : 'Don’t use' }}
                    </span>
                  </label>
                </div>
              </template>
            </section>

            <!-- Videos -->
            <section class="rounded-2xl border bg-card p-4">
              <p class="text-sm font-bold">Videos <span class="font-normal text-muted-foreground">(optional)</span></p>
              <ul class="mt-2 grid gap-1 text-sm">
                <li v-for="v in data.profile.videos" :key="v.url" class="truncate text-muted-foreground">{{ v.url }}</li>
                <li v-for="v in addVideos" :key="v" class="flex items-center gap-2"><span class="truncate">{{ v }}</span><button type="button" aria-label="Remove video" @click="addVideos.splice(addVideos.indexOf(v), 1)"><X class="size-3.5" /></button></li>
                <li v-for="s in pendingVideos" :key="s.id">
                  <label class="flex items-center gap-2"><Checkbox v-model="decisions[s.id]" /> <span class="truncate">{{ s.value }}</span> <span class="shrink-0 text-xs text-muted-foreground">· added by the organizer</span></label>
                </li>
              </ul>
              <div class="mt-2 flex gap-2">
                <Input v-model="newVideo" placeholder="YouTube or Vimeo link" aria-label="Add a video link" class="flex-1" @keydown.enter.prevent="addVideo" />
                <Button type="button" variant="ghost" size="sm" @click="addVideo"><Plus /> Add</Button>
              </div>
              <p v-if="videoError" class="mt-1 text-xs text-destructive" role="alert">{{ videoError }}</p>
            </section>

            <!-- About -->
            <section class="rounded-2xl border bg-card p-4">
              <Field id="c-bio" label="About you" optional hint="A few lines: what you teach or play, where you’re from.">
                <Textarea v-model="form.bio" :rows="4" />
              </Field>
              <Field id="c-ig" label="Instagram" optional class="mt-3">
                <div class="relative">
                  <Instagram class="absolute left-3.5 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
                  <Input v-model="form.instagram" class="pl-10" placeholder="instagram.com/yourname" />
                </div>
              </Field>
              <Field id="c-web" label="Website" optional class="mt-3"><Input v-model="form.website" placeholder="https://…" /></Field>
              <Field id="c-fb" label="Facebook" optional class="mt-3"><Input v-model="form.facebook" placeholder="facebook.com/…" /></Field>
            </section>

            <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
            <div>
              <Button type="submit" variant="pill" :loading="saving"><Check /> Looks good, save</Button>
            </div>
          </form>
        </template>
      </template>
    </main>
  </div>
</template>
