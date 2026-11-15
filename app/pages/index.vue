<script setup lang="ts">
/**
 * Homepage. Visitors get the landing (MyPlanLanding — the same page as
 * /my-plan signed out): WeDance in ChatGPT, Meet new friends + your dance card,
 * My plan, Tell your story. Signed-in dancers go straight to their plan.
 * The previous homepage (the journey, how it works, the founder's letter) is
 * /about.
 */
definePageMeta({ layout: false })

useSeoMeta({
  title: 'WeDance — Ask where to dance. Meet dancers. Plan your nights.',
  description: 'Find salsa, bachata, kizomba and more near you — ask in ChatGPT, meet dancers going where you go, and keep every party, course and festival on one plan.',
})

const { isSignedIn } = useAuth()
// Signed in → My plan (client-side: the session is only known after hydration).
watch(isSignedIn, (signedIn) => {
  if (signedIn && import.meta.client) navigateTo('/my-plan', { replace: true })
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-background">
    <SiteHeader />
    <main>
      <MyPlanLanding surface="home" />
    </main>
    <SiteFooter />
  </div>
</template>
