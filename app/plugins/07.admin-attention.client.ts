/** Keeps useAdminAttention fresh for admins on every side of the site (see the composable). */
export default defineNuxtPlugin({
  name: 'admin-attention',
  dependsOn: ['auth'],
  setup(nuxtApp) {
    const { isAdmin } = useAuth()
    const { refresh } = useAdminAttention()
    const router = useRouter()

    // After hydration, like the plan plugin: the server renders no counts.
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
      refresh(true)
      watch(isAdmin, () => refresh(true))
      router.afterEach(() => refresh())
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refresh()
      })
    })
  },
})
