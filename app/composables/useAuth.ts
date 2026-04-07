// Auth composable — magic link + session-based authentication
const _isSignedIn = ref(false)
const _dancerId = ref<string | null>(null)
const _dancerName = ref<string | null>(null)
const _isAdmin = ref(false)
const _isLoading = ref(true)

export function useAuth() {
  const { $trpc, $setAuthToken } = useNuxtApp()

  async function init() {
    const sessionCookie = useCookie('wedance-session')
    if (!sessionCookie.value) {
      _isLoading.value = false
      return
    }

    try {
      const me = await $trpc.auth.me.query()
      if (me) {
        _isSignedIn.value = true
        _dancerId.value = me.id
        _dancerName.value = me.name
        _isAdmin.value = me.isAdmin
      } else {
        // Invalid/expired session
        signOut()
      }
    } catch {
      signOut()
    } finally {
      _isLoading.value = false
    }
  }

  async function requestMagicLink(data: {
    name?: string
    email: string
    danceStyles?: string[]
    role?: 'lead' | 'follow' | 'both'
    city?: string
  }) {
    return await $trpc.auth.requestMagicLink.mutate({
      name: data.name,
      email: data.email,
      danceStyles: data.danceStyles ?? [],
      role: data.role,
      city: data.city,
    })
  }

  async function verifyMagicLink(token: string) {
    const result = await $trpc.auth.verifyMagicLink.mutate({ token })
    setSession(result)
    return result
  }

  function setSession(data: {
    sessionToken: string
    dancerId: string
    name: string
    isAdmin: boolean
  }) {
    $setAuthToken(data.sessionToken)
    _isSignedIn.value = true
    _dancerId.value = data.dancerId
    _dancerName.value = data.name
    _isAdmin.value = data.isAdmin
  }

  function signOut() {
    $setAuthToken(null)
    _isSignedIn.value = false
    _dancerId.value = null
    _dancerName.value = null
    _isAdmin.value = false
  }

  return {
    isSignedIn: readonly(_isSignedIn),
    dancerId: readonly(_dancerId),
    dancerName: readonly(_dancerName),
    isAdmin: readonly(_isAdmin),
    isLoading: readonly(_isLoading),
    init,
    requestMagicLink,
    verifyMagicLink,
    signOut,
  }
}
