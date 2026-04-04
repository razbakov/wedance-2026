<script setup lang="ts">
const { showBanner, accept, reject } = useCookieConsent()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showBanner"
      role="dialog"
      aria-label="Cookie consent"
      class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-3 shadow-lg sm:px-6"
    >
      <div class="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <p class="text-sm text-gray-600">
          We use anonymous analytics cookies to improve this schedule.
          <NuxtLink to="/privacy" class="underline hover:text-gray-900">
            Learn more
          </NuxtLink>
        </p>
        <div class="flex shrink-0 gap-2">
          <button
            class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            @click="reject"
          >
            Reject
          </button>
          <button
            class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            @click="accept"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
