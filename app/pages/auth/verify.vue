<script setup lang="ts">
const route = useRoute()
const { verifyMagicLink, resetPassword } = useAuth()

const isResetMode = computed(() => route.query.mode === 'reset')

const status = ref<'loading' | 'reset-form' | 'success' | 'error'>('loading')
const errorMessage = ref('')
const dancerName = ref('')

// Password reset form state
const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const resetLoading = ref(false)
const resetError = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'No verification token found.'
    return
  }

  if (isResetMode.value) {
    // Password reset: show the form instead of auto-logging in.
    status.value = 'reset-form'
    return
  }

  // Plain magic-link login: verify and redirect.
  try {
    const result = await verifyMagicLink(token)
    dancerName.value = result.name
    status.value = 'success'

    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/my-plan'
    setTimeout(() => {
      navigateTo(redirect)
    }, 2000)
  } catch (e: any) {
    status.value = 'error'
    errorMessage.value = e.message || 'Invalid or expired link.'
  }
})

async function handleResetPassword() {
  resetError.value = ''

  if (!newPassword.value) {
    resetError.value = 'Password is required.'
    return
  }
  if (newPassword.value.length < 8) {
    resetError.value = 'Password must be at least 8 characters.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    resetError.value = 'Passwords do not match.'
    return
  }

  const token = route.query.token as string
  resetLoading.value = true
  try {
    const result = await resetPassword(token, newPassword.value)
    dancerName.value = result.name
    status.value = 'success'

    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/my-plan'
    setTimeout(() => {
      navigateTo(redirect)
    }, 2000)
  } catch (e: any) {
    resetError.value = e.message || 'Invalid or expired link. Please request a new one.'
  } finally {
    resetLoading.value = false
  }
}

const inputClass = 'w-full h-11 rounded-full px-4 text-sm outline-none transition-all'
const inputStyle = 'background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif;'
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center px-4"
    style="background:#fbf5ea;"
  >
    <div class="w-full max-w-sm">
      <!-- Accent bar -->
      <div class="h-1.5 rounded-t-2xl" style="background:#dc2626;" />
      <div
        class="rounded-b-2xl px-6 pb-6 pt-5 space-y-4"
        style="background:white; box-shadow: 0 4px 24px rgba(59,31,13,0.08);"
      >
        <!-- Loading -->
        <template v-if="status === 'loading'">
          <div class="text-center space-y-3">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
              Verifying
            </div>
            <h1 class="text-2xl leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              Checking your link…
            </h1>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              Just a moment.
            </p>
          </div>
        </template>

        <!-- Password reset form -->
        <template v-else-if="status === 'reset-form'">
          <div class="space-y-1">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
              Account recovery
            </div>
            <h1 class="text-2xl leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              Set a new password
            </h1>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              Enter your new password below.
            </p>
          </div>

          <form class="space-y-4 pt-2" @submit.prevent="handleResetPassword">
            <div class="space-y-1.5">
              <label for="new-password" class="text-sm font-bold" style="color:#3b1f0d;">New password</label>
              <div class="relative">
                <input
                  id="new-password"
                  v-model="newPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="At least 8 characters"
                  autocomplete="new-password"
                  required
                  :class="inputClass + ' pr-16'"
                  :style="inputStyle"
                >
                <button
                  type="button"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider"
                  style="color:#9a5614; font-family: system-ui, sans-serif;"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="confirm-password" class="text-sm font-bold" style="color:#3b1f0d;">Confirm password</label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Repeat your password"
                autocomplete="new-password"
                required
                :class="inputClass"
                :style="inputStyle"
              >
            </div>

            <p v-if="resetError" class="text-sm font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">
              {{ resetError }}
            </p>

            <button
              type="submit"
              :disabled="resetLoading"
              class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
              style="background:#dc2626; box-shadow: 0 3px 0 -1px #b91c1c; font-family: system-ui, sans-serif;"
            >
              {{ resetLoading ? 'Saving…' : 'Save new password' }}
            </button>
          </form>
        </template>

        <!-- Success -->
        <template v-else-if="status === 'success'">
          <div class="text-center space-y-3">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
              {{ isResetMode ? 'Password updated' : 'Welcome' }}
            </div>
            <h1 class="text-2xl leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              {{ isResetMode ? 'You\'re all set!' : `Welcome, ${dancerName}!` }}
            </h1>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              {{ isResetMode ? 'Your password has been changed. Taking you to your plan…' : "You're signed in. Taking you to your plan…" }}
            </p>
          </div>
        </template>

        <!-- Error -->
        <template v-else>
          <div class="text-center space-y-3">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
              Something went wrong
            </div>
            <h1 class="text-2xl leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              Link expired or invalid
            </h1>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ errorMessage }}</p>
            <div class="pt-2">
              <NuxtLink
                to="/"
                class="text-sm font-bold underline"
                style="color:#dc2626; font-family: system-ui, sans-serif;"
              >
                Go to homepage
              </NuxtLink>
            </div>
          </div>
        </template>
      </div>

      <!-- Brand footer -->
      <div class="text-center pt-4">
        <NuxtLink to="/" class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
          <span style="color:#dc2626;">We</span>Dance
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
