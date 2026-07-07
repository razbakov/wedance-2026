<script setup lang="ts">
/**
 * /settings — the signed-in dancer edits their own profile: display name, city,
 * dance styles, role, and photo URL. These are the same fields onboarding
 * collects, changeable over time. Protected: signed-out users are sent home.
 * 2026 tropical style, mirroring the onboarding details step.
 */
import { Check, ExternalLink } from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Settings',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const {
  isSignedIn, isLoading, username,
  dancerName, city: meCity, danceStyles: meStyles, role: meRole,
  updateProfile,
} = useAuth()

const DANCE_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Timba', 'Semba', 'Afro-Cuban', 'Reggaeton', 'Cha-Cha']

const form = reactive({
  name: '',
  city: '',
  photo: '',
  danceStyles: [] as string[],
  role: '' as '' | 'lead' | 'follow' | 'both',
})

const loading = ref(false)
const error = ref('')
const saved = ref(false)

// Redirect signed-out users home (guard like onboarding).
watch([isLoading, isSignedIn], ([loadingNow, signedIn]) => {
  if (!loadingNow && !signedIn) navigateTo('/')
}, { immediate: true })

// Prefill from current profile once loaded.
function hydrate() {
  form.name = dancerName.value ?? ''
  form.city = meCity.value ?? ''
  form.danceStyles = meStyles.value ? [...meStyles.value] : []
  const r = meRole.value
  form.role = (r === 'lead' || r === 'follow' || r === 'both') ? r : ''
}
onMounted(hydrate)
watch([dancerName, meCity, meStyles, meRole], hydrate)

function toggleStyle(style: string) {
  const i = form.danceStyles.indexOf(style)
  if (i >= 0) form.danceStyles.splice(i, 1)
  else form.danceStyles.push(style)
}

async function save() {
  error.value = ''
  saved.value = false
  if (!form.name.trim()) { error.value = 'Name is required.'; return }
  loading.value = true
  try {
    await updateProfile({
      name: form.name.trim(),
      city: form.city.trim(),
      danceStyles: form.danceStyles,
      role: form.role || undefined,
      photo: form.photo.trim(),
    })
    saved.value = true
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not save. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section class="max-w-lg mx-auto px-4 pt-12 pb-16">
      <div class="flex items-baseline justify-between">
        <h1 class="text-4xl" style="color:#3b1f0d;">Your profile</h1>
        <NuxtLink
          v-if="username"
          :to="`/u/${username}`"
          class="inline-flex items-center gap-1 text-xs font-bold"
          style="color:#dc2626; font-family: system-ui, sans-serif;"
        >View public <ExternalLink class="w-3 h-3" /></NuxtLink>
      </div>
      <p class="mt-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        This is what other dancers see. Change it anytime.
      </p>

      <div class="mt-8 space-y-6" style="font-family: system-ui, sans-serif;">
        <!-- Name -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Name</label>
          <input v-model="form.name" type="text" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d;">
        </div>

        <!-- City -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">City</label>
          <input v-model="form.city" type="text" placeholder="e.g. Munich" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d;">
        </div>

        <!-- Role -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Role</label>
          <div class="flex gap-2">
            <button
              v-for="opt in [{v:'lead',l:'Leader'},{v:'follow',l:'Follower'},{v:'both',l:'Both'}]"
              :key="opt.v"
              type="button"
              class="flex-1 h-11 rounded-xl text-sm font-bold transition-all"
              :style="form.role === opt.v
                ? 'background:#dc2626; color:white; box-shadow:0 3px 0 -1px #b91c1c;'
                : 'background:white; color:#5b3a1d; border:1px solid #3b1f0d33;'"
              @click="form.role = (form.role === opt.v ? '' : (opt.v as any))"
            >{{ opt.l }}</button>
          </div>
        </div>

        <!-- Styles -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Dances</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="s in DANCE_STYLES"
              :key="s"
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              :style="form.danceStyles.includes(s)
                ? 'background:#dc2626; color:white;'
                : 'background:#dc262614; color:#dc2626;'"
              @click="toggleStyle(s)"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Photo -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Photo URL <span class="normal-case font-normal" style="color:#9a5614;">(optional)</span></label>
          <input v-model="form.photo" type="url" placeholder="https://…" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" style="background:white; border:1px solid #3b1f0d33; color:#3b1f0d;">
        </div>

        <p v-if="error" class="text-sm font-bold" style="color:#dc2626;">{{ error }}</p>
        <p v-if="saved" class="inline-flex items-center gap-1.5 text-sm font-bold" style="color:#16a34a;">
          <Check class="w-4 h-4" /> Saved
        </p>

        <button
          type="button"
          :disabled="loading"
          class="w-full h-12 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow:0 3px 0 -1px #b91c1c;"
          @click="save"
        >{{ loading ? 'Saving…' : 'Save changes' }}</button>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
