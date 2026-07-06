// Auth composable — email + password + session-based authentication.
// Magic-link methods (requestMagicLink/verifyMagicLink) are retained but
// dormant: the primary sign-in UX is email+password, but the pages
// app/pages/auth/verify.vue and app/pages/charanga/claim.vue still call them.
const _isSignedIn = ref(false)
const _dancerId = ref<string | null>(null)
const _dancerName = ref<string | null>(null)
const _isAdmin = ref(false)
const _isLoading = ref(true)
// Profile fields used for personalization + the onboarding guard. Populated by
// init()'s me query; null/[] until then. `justRegistered` marks a brand-new
// signup this session so my-plan can show the first-run hint after onboarding.
const _city = ref<string | null>(null)
const _danceStyles = ref<string[]>([])
const _role = ref<string | null>(null)
const _intent = ref<string | null>(null)
const _onboardedAt = ref<string | null>(null)
const _justRegistered = ref(false)

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
        _city.value = me.city ?? null
        _danceStyles.value = me.danceStyles ?? []
        _role.value = me.role ?? null
        _intent.value = me.intent ?? null
        _onboardedAt.value = me.onboardedAt ?? null
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

  async function login(data: { email: string; password: string }) {
    const result = await $trpc.auth.login.mutate({
      email: data.email,
      password: data.password,
    })
    setSession(result)
    return result
  }

  async function register(data: {
    name: string
    email: string
    password: string
    danceStyles?: string[]
    role?: 'lead' | 'follow' | 'both'
    city?: string
  }) {
    const result = await $trpc.auth.register.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
      danceStyles: data.danceStyles ?? [],
      role: data.role,
      city: data.city,
    })
    setSession(result)
    // Mark this session as a fresh signup so the caller can route to
    // /onboarding and my-plan can show the first-run hint.
    _justRegistered.value = true
    return result
  }

  // Re-pull the profile after a mutation that changes it (e.g. onboarding).
  async function refreshMe() {
    try {
      const me = await $trpc.auth.me.query()
      if (me) {
        _city.value = me.city ?? null
        _danceStyles.value = me.danceStyles ?? []
        _role.value = me.role ?? null
        _intent.value = me.intent ?? null
        _onboardedAt.value = me.onboardedAt ?? null
      }
    } catch {
      // best-effort refresh; leave existing state on failure
    }
  }

  async function completeOnboarding(data: {
    intent: string
    city?: string
    danceStyles?: string[]
    role?: 'lead' | 'follow' | 'both'
  }) {
    await $trpc.auth.completeOnboarding.mutate({
      intent: data.intent,
      city: data.city,
      danceStyles: data.danceStyles,
      role: data.role,
    })
    await refreshMe()
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
    _city.value = null
    _danceStyles.value = []
    _role.value = null
    _intent.value = null
    _onboardedAt.value = null
    _justRegistered.value = false
  }

  return {
    isSignedIn: readonly(_isSignedIn),
    dancerId: readonly(_dancerId),
    dancerName: readonly(_dancerName),
    isAdmin: readonly(_isAdmin),
    isLoading: readonly(_isLoading),
    city: readonly(_city),
    danceStyles: readonly(_danceStyles),
    role: readonly(_role),
    intent: readonly(_intent),
    onboardedAt: readonly(_onboardedAt),
    justRegistered: readonly(_justRegistered),
    init,
    login,
    register,
    completeOnboarding,
    refreshMe,
    requestMagicLink,
    verifyMagicLink,
    signOut,
  }
}
