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
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="w-full max-w-sm space-y-4 text-center">
      <!-- Loading -->
      <template v-if="status === 'loading'">
        <div class="text-4xl animate-pulse">🔗</div>
        <h1 class="text-xl font-semibold">Verifying your link...</h1>
        <p class="text-sm text-muted-foreground">Just a moment.</p>
      </template>

      <!-- Password reset form -->
      <template v-else-if="status === 'reset-form'">
        <div class="text-4xl">🔒</div>
        <h1 class="text-xl font-semibold">Set a new password</h1>
        <p class="text-sm text-muted-foreground">Enter your new password below.</p>

        <form class="space-y-4 pt-2 text-left" @submit.prevent="handleResetPassword">
          <div class="space-y-1.5">
            <label for="new-password" class="text-sm font-medium">New password</label>
            <div class="relative">
              <input
                id="new-password"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="At least 8 characters"
                autocomplete="new-password"
                required
                class="w-full h-11 rounded-lg px-4 pr-16 text-sm border outline-none"
              >
              <button
                type="button"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="confirm-password" class="text-sm font-medium">Confirm password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Repeat your password"
              autocomplete="new-password"
              required
              class="w-full h-11 rounded-lg px-4 text-sm border outline-none"
            >
          </div>

          <p v-if="resetError" class="text-sm font-bold text-destructive">
            {{ resetError }}
          </p>

          <button
            type="submit"
            :disabled="resetLoading"
            class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60"
          >
            {{ resetLoading ? 'Saving…' : 'Save new password' }}
          </button>
        </form>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="text-4xl">🎉</div>
        <h1 class="text-xl font-semibold">
          {{ isResetMode ? 'Password updated!' : `Welcome, ${dancerName}!` }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ isResetMode ? 'Your password has been changed. Taking you to your plan...' : "You're signed in. Taking you to your plan..." }}
        </p>
      </template>

      <!-- Error -->
      <template v-else>
        <div class="text-4xl">😕</div>
        <h1 class="text-xl font-semibold">Something went wrong</h1>
        <p class="text-sm text-muted-foreground">{{ errorMessage }}</p>
        <div class="pt-4">
          <NuxtLink to="/" class="text-sm underline hover:text-foreground">
            Go to homepage
          </NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>
