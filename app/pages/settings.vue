<script setup lang="ts">
/**
 * /settings — the signed-in dancer manages their profile + account.
 *   - Profile: name, city, role, styles, bio, socials, photo URL, privacy.
 *   - Account: change password, delete account.
 * Protected: signed-out users are sent home. 2026 tropical style.
 */
import { Check, ExternalLink, AlertTriangle } from 'lucide-vue-next'

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
  bio: meBio, instagram: meIg, youtube: meYt, website: meSite, profilePublic: mePublic,
  updateProfile, changePassword, deleteAccount,
} = useAuth()

const DANCE_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Timba', 'Semba', 'Afro-Cuban', 'Reggaeton', 'Cha-Cha']

const form = reactive({
  name: '', city: '', photo: '', bio: '',
  instagram: '', youtube: '', website: '',
  danceStyles: [] as string[],
  role: '' as '' | 'lead' | 'follow' | 'both',
  profilePublic: true,
})

const loading = ref(false)
const error = ref('')
const saved = ref(false)

// Change-password sub-form.
const pw = reactive({ current: '', next: '' })
const pwLoading = ref(false)
const pwError = ref('')
const pwSaved = ref(false)

// Account deletion confirmation.
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)
const deleteError = ref('')
const deleteConfirmInput = ref('')

watch([isLoading, isSignedIn], ([loadingNow, signedIn]) => {
  if (!loadingNow && !signedIn) navigateTo('/')
}, { immediate: true })

function hydrate() {
  form.name = dancerName.value ?? ''
  form.city = meCity.value ?? ''
  form.bio = meBio.value ?? ''
  form.instagram = meIg.value ?? ''
  form.youtube = meYt.value ?? ''
  form.website = meSite.value ?? ''
  form.danceStyles = meStyles.value ? [...meStyles.value] : []
  const r = meRole.value
  form.role = (r === 'lead' || r === 'follow' || r === 'both') ? r : ''
  form.profilePublic = mePublic.value !== false
}
onMounted(hydrate)
watch([dancerName, meCity, meStyles, meRole, meBio, meIg, meYt, meSite, mePublic], hydrate)

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
      bio: form.bio.trim(),
      instagram: form.instagram.trim(),
      youtube: form.youtube.trim(),
      website: form.website.trim(),
      profilePublic: form.profilePublic,
    })
    saved.value = true
  } catch (e: unknown) {
    error.value = (e as { message?: string })?.message || 'Could not save. Please try again.'
  } finally {
    loading.value = false
  }
}

async function submitPassword() {
  pwError.value = ''
  pwSaved.value = false
  if (pw.next.length < 8) { pwError.value = 'New password must be at least 8 characters.'; return }
  pwLoading.value = true
  try {
    await changePassword({ currentPassword: pw.current, newPassword: pw.next })
    pwSaved.value = true
    pw.current = ''
    pw.next = ''
  } catch (e: unknown) {
    pwError.value = (e as { message?: string })?.message || 'Could not change password.'
  } finally {
    pwLoading.value = false
  }
}

async function submitDelete() {
  deleteError.value = ''
  if (deleteConfirmInput.value !== dancerName.value) {
    deleteError.value = `Please type "${dancerName.value}" to confirm.`
    return
  }
  deleteLoading.value = true
  try {
    await deleteAccount()
    // On success, deleteAccount() calls signOut() which redirects to home via auth guard
    await navigateTo('/')
  } catch (e: unknown) {
    deleteError.value = (e as { message?: string })?.message || 'Could not delete account. Please try again or contact support.'
    deleteLoading.value = false
  }
}

const inputStyle = 'background:white; border:1px solid #3b1f0d33; color:#3b1f0d;'
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section class="max-w-lg mx-auto px-4 pt-12 pb-16" style="font-family: system-ui, sans-serif;">
      <div class="flex items-baseline justify-between">
        <h1 class="text-4xl" style="color:#3b1f0d; font-family:'Playfair Display', serif;">Settings</h1>
        <NuxtLink
          v-if="username"
          :to="`/u/${username}`"
          class="inline-flex items-center gap-1 text-xs font-bold"
          style="color:#dc2626;"
        >View public <ExternalLink class="w-3 h-3" /></NuxtLink>
      </div>

      <!-- PROFILE -->
      <h2 class="mt-8 text-lg font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">Profile</h2>
      <div class="mt-4 space-y-6">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Name</label>
          <input v-model="form.name" type="text" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">City</label>
          <input v-model="form.city" type="text" placeholder="e.g. Munich" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Bio</label>
          <textarea v-model="form.bio" rows="3" maxlength="500" placeholder="A line or two about you and your dancing." class="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none" :style="inputStyle" />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Role</label>
          <div class="flex gap-2">
            <button
              v-for="opt in [{v:'lead',l:'Leader'},{v:'follow',l:'Follower'},{v:'both',l:'Both'}]"
              :key="opt.v"
              type="button"
              class="flex-1 h-11 rounded-xl text-sm font-bold transition-all"
              :style="form.role === opt.v ? 'background:#dc2626; color:white; box-shadow:0 3px 0 -1px #b91c1c;' : 'background:white; color:#5b3a1d; border:1px solid #3b1f0d33;'"
              @click="form.role = (form.role === opt.v ? '' : (opt.v as any))"
            >{{ opt.l }}</button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Dances</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="s in DANCE_STYLES"
              :key="s"
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              :style="form.danceStyles.includes(s) ? 'background:#dc2626; color:white;' : 'background:#dc262614; color:#dc2626;'"
              @click="toggleStyle(s)"
            >{{ s }}</button>
          </div>
        </div>

        <!-- Socials -->
        <div class="grid gap-3">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Instagram <span class="normal-case font-normal">(handle or URL)</span></label>
            <input v-model="form.instagram" type="text" placeholder="@yourhandle" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">YouTube <span class="normal-case font-normal">(handle or URL)</span></label>
            <input v-model="form.youtube" type="text" placeholder="@yourchannel" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Website</label>
            <input v-model="form.website" type="text" placeholder="yoursite.com" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Photo URL <span class="normal-case font-normal">(optional)</span></label>
          <input v-model="form.photo" type="url" placeholder="https://…" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
        </div>

        <!-- Privacy -->
        <label class="flex items-start gap-3 cursor-pointer select-none">
          <input v-model="form.profilePublic" type="checkbox" class="mt-1 w-4 h-4 accent-[#dc2626]">
          <span class="text-sm" style="color:#5b3a1d;">
            <span class="font-bold" style="color:#3b1f0d;">Public profile</span><br>
            When off, your <span class="italic">/u/{{ username }}</span> page is hidden from everyone but you.
          </span>
        </label>

        <p v-if="error" class="text-sm font-bold" style="color:#dc2626;">{{ error }}</p>
        <p v-if="saved" class="inline-flex items-center gap-1.5 text-sm font-bold" style="color:#16a34a;"><Check class="w-4 h-4" /> Saved</p>

        <button
          type="button" :disabled="loading"
          class="w-full h-12 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow:0 3px 0 -1px #b91c1c;"
          @click="save"
        >{{ loading ? 'Saving…' : 'Save changes' }}</button>
      </div>

      <!-- ACCOUNT -->
      <h2 class="mt-12 text-lg font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">Change password</h2>
      <div class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">Current password</label>
          <input v-model="pw.current" type="password" autocomplete="current-password" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#9a5614;">New password</label>
          <input v-model="pw.next" type="password" autocomplete="new-password" placeholder="At least 8 characters" class="w-full h-11 rounded-xl px-3.5 text-sm outline-none" :style="inputStyle">
        </div>
        <p v-if="pwError" class="text-sm font-bold" style="color:#dc2626;">{{ pwError }}</p>
        <p v-if="pwSaved" class="inline-flex items-center gap-1.5 text-sm font-bold" style="color:#16a34a;"><Check class="w-4 h-4" /> Password changed</p>
        <button
          type="button" :disabled="pwLoading || !pw.current || !pw.next"
          class="w-full h-11 rounded-full text-sm font-bold uppercase tracking-wider disabled:opacity-50"
          style="background:white; color:#dc2626; border:1px solid #dc262655;"
          @click="submitPassword"
        >{{ pwLoading ? 'Changing…' : 'Change password' }}</button>
      </div>

      <!-- DANGER ZONE -->
      <h2 class="mt-12 text-lg font-bold" style="color:#dc2626; font-family:'Playfair Display', serif;">Danger Zone</h2>
      <div class="mt-4 p-4 rounded-xl" style="background:#fecaca33; border:1px solid #dc262666;">
        <div class="flex gap-3">
          <AlertTriangle class="w-5 h-5 flex-shrink-0 mt-0.5" style="color:#dc2626;" />
          <div class="flex-1">
            <h3 class="font-bold text-sm mb-2" style="color:#dc2626;">Permanently delete your account</h3>
            <p class="text-xs mb-4" style="color:#7f1d1d;">
              This action cannot be undone. Your profile will be removed, your account deleted, and you will be signed out immediately.
              <br><br>
              <strong>What happens to your data:</strong>
              <br>• Your profile (name, email, photo, bio) is permanently deleted
              <br>• Election votes are permanently deleted
              <br>• Other voting records (video/city battles) are anonymized (votes kept, voter identity removed)
              <br>• Festival signups are anonymized (kept for attendance, emails cleared)
              <br>• Your submitted reviews are deleted
              <br>• Your submitted videos are anonymized (emails cleared)
              <br>• Your recommendations are permanently deleted
              <br>• Hangouts you created and RSVPs are permanently deleted
              <br>• Gigs you posted are anonymized (record kept, your identity removed)
            </p>

            <button
              v-if="!showDeleteConfirm"
              type="button"
              class="w-full h-11 rounded-full text-sm font-bold uppercase tracking-wider"
              style="background:#dc2626; color:white; box-shadow:0 3px 0 -1px #b91c1c;"
              @click="showDeleteConfirm = true"
            >Delete my account</button>

            <div v-else class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider mb-1.5" style="color:#dc2626;">Confirm by typing your name</label>
                <input
                  v-model="deleteConfirmInput"
                  type="text"
                  :placeholder="`Type: ${dancerName}`"
                  class="w-full h-11 rounded-xl px-3.5 text-sm outline-none"
                  :style="inputStyle"
                >
              </div>
              <p v-if="deleteError" class="text-sm font-bold" style="color:#dc2626;">{{ deleteError }}</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="deleteLoading"
                  class="flex-1 h-11 rounded-full text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                  style="background:white; color:#dc2626; border:1px solid #dc262655;"
                  @click="showDeleteConfirm = false; deleteConfirmInput = ''; deleteError = ''"
                >Cancel</button>
                <button
                  type="button"
                  :disabled="deleteLoading || deleteConfirmInput !== dancerName"
                  class="flex-1 h-11 rounded-full text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                  style="background:#dc2626; color:white; box-shadow:0 3px 0 -1px #b91c1c;"
                  @click="submitDelete"
                >{{ deleteLoading ? 'Deleting…' : 'Permanently delete' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
