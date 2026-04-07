<script setup lang="ts">
const route = useRoute()
const { verifyMagicLink } = useAuth()

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')
const dancerName = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'No verification token found.'
    return
  }

  try {
    const result = await verifyMagicLink(token)
    dancerName.value = result.name
    status.value = 'success'

    // Redirect to festival page after a short delay
    setTimeout(() => {
      navigateTo('/festivals/meneate-viena-2026')
    }, 2000)
  } catch (e: any) {
    status.value = 'error'
    errorMessage.value = e.message || 'Invalid or expired link.'
  }
})
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

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <div class="text-4xl">🎉</div>
        <h1 class="text-xl font-semibold">Welcome, {{ dancerName }}!</h1>
        <p class="text-sm text-muted-foreground">You're signed in. Redirecting to the festival...</p>
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
