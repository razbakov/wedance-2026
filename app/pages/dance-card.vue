<script setup lang="ts">
/**
 * /dance-card — "Your dance card" (RAZ-1005): the dancer's own card in Meet new
 * friends, exactly as others see it in their deck (`MeetDeckCard`), prepared in
 * place. "Add a photo" / "Make it public" lead here (after signing up to a
 * night, on /meet) instead of the long Settings form.
 *
 * Tap the photo → pick one → it is uploaded and saved at once (no Save
 * button to forget). Name, city and dances save with "Save my card". The public
 * switch is one tap. `?back=/events/…` returns to where the dancer came from.
 */
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Lock } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { meetVisibility } from '#shared/utils/meetFriends'
import { MyDanceCardSchema } from '#shared/validation'
import { myMeetCard } from '~/lib/meetDeck'
import type { DiscoverMe } from '~~/server/utils/myPlanFeeds'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Your dance card', meta: [{ name: 'robots', content: 'noindex' }] })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn, isLoading, dancerName, city, danceStyles, photo, profilePublic, updateProfile } = useAuth()

watch([isLoading, isSignedIn], ([loadingNow, signedIn]) => {
  if (!loadingNow && !signedIn) navigateTo('/meet')
}, { immediate: true })

/** Only a path on this site — never `//other.host`. */
const back = computed(() => {
  const b = typeof route.query.back === 'string' ? route.query.back : ''
  return b.startsWith('/') && !b.startsWith('//') ? b : null
})

const form = reactive({ name: '', city: '', danceStyles: [] as string[] })
const cardForm = reactive(useFormValidation(MyDanceCardSchema, form))
function hydrate() {
  form.name = dancerName.value ?? ''
  form.city = city.value ?? ''
  form.danceStyles = danceStyles.value ? [...danceStyles.value] : []
}
onMounted(hydrate)
watch([dancerName, city, danceStyles], hydrate)

// My next night out — the chip others see on my card.
const me = ref<DiscoverMe | null>(null)
onMounted(async () => {
  try { me.value = (await $trpc.plan.discover.query()).me } catch { /* the card shows a placeholder */ }
})

const card = computed(() => myMeetCard({
  name: form.name, city: form.city, photo: photo.value ?? '', danceStyles: form.danceStyles,
  nextNight: me.value?.nextNight ?? null,
}))
const visibility = computed(() => meetVisibility({
  profilePublic: profilePublic.value, photo: photo.value,
  nextNight: me.value?.nextNight ?? null, festivalsShown: me.value?.festivalsShown,
}))
const nightsLink = computed(() => me.value?.citySlug ? `/cities/${me.value.citySlug}` : '/my-plan#socials')

// --- Photo: upload and save in one go ---
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const photoError = ref('')
let controller: AbortController | null = null
onBeforeUnmount(() => controller?.abort())

async function onPhotoPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  photoError.value = ''
  if (!file.type.startsWith('image/')) { photoError.value = 'That isn’t a picture. Pick a photo.'; return }
  if (file.size > 10 * 1024 * 1024) { photoError.value = 'That photo is over 10 MB. Pick a smaller one.'; return }
  controller?.abort()
  const current = new AbortController()
  controller = current
  uploading.value = true
  const hadPhoto = !!photo.value
  try {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/media/image?folder=avatars', { method: 'POST', body, signal: current.signal })
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.statusMessage || 'Upload failed.')
    const { url } = await res.json()
    if (current.signal.aborted) return
    await updateProfile({ photo: url })
    useTrack().track('dance_card_photo_added', { replaced: hadPhoto, surface: back.value ? 'back_link' : 'direct' })
  } catch (err) {
    if (current.signal.aborted) return
    photoError.value = (err as Error).message || 'Could not save the photo. Please try again.'
  } finally {
    if (controller === current) { controller = null; uploading.value = false }
  }
}

// --- Public: one tap ---
const publishing = ref(false)
async function makePublic() {
  publishing.value = true
  try { await updateProfile({ profilePublic: true }) } finally { publishing.value = false }
}

// --- Name, city, dances ---
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
watch(() => [form.name, form.city, form.danceStyles.join()], () => { saved.value = false })
async function save() {
  saveError.value = ''
  const result = cardForm.validate()
  if (!result.success) return
  saving.value = true
  try {
    await updateProfile(result.data)
    saved.value = true
  } catch (e) {
    saveError.value = (e as { message?: string })?.message || 'Could not save. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-display">
    <SiteHeader />

    <main class="max-w-md mx-auto px-4 pt-8 pb-16 font-sans">
      <NuxtLink :to="back ?? '/meet'" class="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline" data-testid="dance-card-back">
        <ArrowLeft class="size-4" aria-hidden="true" /> {{ back ? 'Back' : 'Meet new friends' }}
      </NuxtLink>

      <h1 class="mt-4 text-4xl leading-tight font-display text-foreground">Your dance card</h1>
      <p class="mt-1 text-sm text-muted-foreground">This is how dancers going out near you see you in Meet new friends.</p>

      <p
        class="mt-4 text-sm font-bold"
        :class="visibility.shown ? 'text-wd-green-700' : 'text-muted-foreground'"
        role="status"
        data-testid="dance-card-status"
      >
        {{ visibility.text }}
      </p>

      <!-- The card, as the deck shows it -->
      <div
        class="mt-4 relative rounded-3xl bg-white border overflow-hidden"
        style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent); box-shadow:0 12px 32px rgba(0,0,0,0.14);"
        data-testid="dance-card"
      >
        <MeetDeckCard :card="card" preview>
          <template #photo>
            <button
              type="button"
              class="group relative block w-full h-64 bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              :aria-label="photo ? 'Change your photo' : 'Add your photo'"
              :disabled="uploading"
              data-testid="dance-card-photo"
              @click="fileInput?.click()"
            >
              <img v-if="photo" :src="sizedImage(photo, IMG.card)" :alt="form.name" class="w-full h-full object-cover">
              <span
                v-else
                class="absolute inset-0 flex flex-col items-center justify-center gap-2 border-b-2 border-dashed px-6 text-center"
                style="background:color-mix(in srgb, var(--wd-red-600) 6%, white); border-color:color-mix(in srgb, var(--wd-red-600) 30%, transparent);"
              >
                <span class="size-14 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                  <Camera class="size-7" aria-hidden="true" />
                </span>
                <span class="text-base font-bold text-foreground">Add your photo</span>
                <span class="text-xs text-muted-foreground">Your face, clearly — so they recognise you on the floor.</span>
              </span>
              <span
                v-if="photo && !uploading"
                class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-bold text-white group-hover:bg-black/75"
              >
                <Camera class="size-3.5" aria-hidden="true" /> Change
              </span>
              <span v-if="uploading" class="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-sm font-bold text-foreground">
                <Loader2 class="size-5 animate-spin" aria-hidden="true" /> Saving your photo…
              </span>
            </button>
          </template>
        </MeetDeckCard>
      </div>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" tabindex="-1" aria-hidden="true" data-testid="dance-card-file" @change="onPhotoPicked">
      <p v-if="photoError" role="alert" class="mt-2 text-xs font-bold text-primary">{{ photoError }}</p>

      <!-- What still keeps them out of the deck -->
      <div v-if="profilePublic === false" class="mt-4 rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3" data-testid="dance-card-private">
        <Lock class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p class="flex-1 text-sm text-muted-foreground">Your profile is private, so nobody sees your card.</p>
        <Button variant="outline" size="pill-sm" :loading="publishing" data-testid="dance-card-make-public" @click="makePublic">Make it public</Button>
      </div>
      <p v-else-if="!me?.nextNight && photo" class="mt-4 text-sm text-muted-foreground">
        Your card shows up once you’re going to a night out.
        <NuxtLink :to="nightsLink" class="font-bold text-primary hover:underline whitespace-nowrap">Find a night <ArrowRight class="inline size-3.5" aria-hidden="true" /></NuxtLink>
      </p>

      <!-- Name, city, dances -->
      <form class="mt-8 grid gap-4" novalidate data-testid="dance-card-form" @submit.prevent="save">
        <Field id="dance-card-name" label="Name" :error="cardForm.errors.name">
          <Input v-model="form.name" autocomplete="name" v-bind="cardForm.fieldAttrs('name', 'dance-card-name-error')" />
        </Field>
        <Field id="dance-card-city" label="City" optional>
          <CityCombobox v-model="form.city" placeholder="e.g. Munich" />
        </Field>
        <div class="flex flex-col gap-1.5">
          <label for="dance-card-dances" class="text-sm font-bold text-foreground leading-snug">Dances <span class="font-normal text-muted-foreground">(optional)</span></label>
          <DanceStylePicker id="dance-card-dances" v-model="form.danceStyles" label="Dances" />
        </div>
        <p v-if="saveError" role="alert" class="text-sm font-bold text-primary">{{ saveError }}</p>
        <div class="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="outline" size="pill-sm" :loading="saving" data-testid="dance-card-save">Save my card</Button>
          <span v-if="saved" role="status" class="inline-flex items-center gap-1.5 text-sm font-bold text-wd-green-600"><Check class="size-4" aria-hidden="true" /> Saved</span>
        </div>
      </form>

      <div class="mt-10 flex flex-wrap items-center gap-3">
        <Button as-child variant="cta" size="pill-sm">
          <NuxtLink to="/meet" data-testid="dance-card-meet">Meet who’s going <ArrowRight aria-hidden="true" /></NuxtLink>
        </Button>
        <NuxtLink to="/settings" class="text-sm text-muted-foreground hover:underline">All profile settings</NuxtLink>
      </div>
    </main>
  </div>
</template>
